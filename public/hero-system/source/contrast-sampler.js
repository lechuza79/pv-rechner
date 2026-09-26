// Measure the painted background, never the foreground text. One capture serves
// every target; normal animation frames do no readback or DOM cloning.
const controllers = new Map();
const properties = `position inset top right bottom left width height min-width min-height max-width max-height box-sizing display overflow overflow-x overflow-y z-index opacity transform transform-origin filter backdrop-filter mix-blend-mode isolation background background-color background-image background-size background-position background-repeat background-blend-mode border border-radius box-shadow clip-path mask-image mask-size mask-position mask-repeat padding margin object-fit object-position`.split(' ');
function styles(source, target, pseudo) {
  const css = getComputedStyle(source, pseudo);
  for (const key of properties) target.style.setProperty(key, css.getPropertyValue(key));
  target.style.animation = 'none'; target.style.transition = 'none';
  return css;
}
function clonePaint(source, scale, pending) {
  const css = getComputedStyle(source);
  if (css.display === 'none' || css.visibility === 'hidden' || +css.opacity < .002) return null;
  let copy = document.createElement('div');
  if (source instanceof HTMLCanvasElement) {
    if (!source.width || !source.height) return null;
    const rect = source.getBoundingClientRect();
    const width=Math.max(1,Math.ceil(rect.width*scale)),height=Math.max(1,Math.ceil(rect.height*scale));
    copy=document.createElement('img');
    // Snapshot now, transfer asynchronously. Never force a full-size GPU readback.
    const image=copy;
    pending.push(createImageBitmap(source,{resizeWidth:width,resizeHeight:height,resizeQuality:'low'}).then(bitmap=>{
      const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
      canvas.getContext('2d').drawImage(bitmap,0,0);bitmap.close();image.src=canvas.toDataURL();
    }));
  } else if (source instanceof HTMLImageElement) {
    copy = document.createElement('img'); copy.src = source.currentSrc || source.src;
  }
  styles(source, copy);
  for (const side of ['::before', '::after']) {
    const pseudo = getComputedStyle(source, side);
    if (pseudo.content !== 'none' && pseudo.content !== 'normal') {
      const layer = document.createElement('div'); styles(source, layer, side);
      if (side === '::before') copy.append(layer); else copy._after = layer;
    }
  }
  for (const child of source.children) { const painted = clonePaint(child, scale, pending); if (painted) copy.append(painted); }
  if (copy._after) copy.append(copy._after);
  return copy;
}
function brightness(rgb) {return rgb.reduce((sum, c, i) => {const v=c/255; return sum+[.2126,.7152,.0722][i]*(v<=.04045?v/12.92:((v+.055)/1.055)**2.4);},0);}
export function chooseTone(samples, previous) {
  const values=samples.map(brightness).sort((a,b)=>a-b);
  // Ignore isolated particles and single-pixel leaf edges, not broad gradients.
  const low=values[Math.floor((values.length-1)*.1)],high=values[Math.floor((values.length-1)*.9)];
  const median=values[Math.floor((values.length-1)*.5)];
  const ink=brightness([18,44,59]);
  // Worst case over the text band (what the ratio reports) and the typical
  // background (what decides between white and black).
  const worst={dark:(low+.05)/(ink+.05),light:1.05/(high+.05),'strong-dark':(low+.05)/.05};
  const typical={dark:(median+.05)/(ink+.05),light:1.05/(median+.05),'strong-dark':(median+.05)/.05};
  let tone;
  if(worst.dark>=4.5)tone='dark';
  // On a mid-dark sky white and black reach about the same ratio (measured
  // 4.6 against 4.5 at dusk), but black reads far worse there and the headline
  // above is white. So white wins whenever the typical background carries it;
  // a white button stays white down to 4.2 so it does not flicker at the edge.
  else if(typical.light>=(previous==='light'?4.2:4.5))tone='light';
  else tone=typical.light>=typical['strong-dark']?'light':'strong-dark';
  return {tone,ratio:worst[tone],low,high};
}
export function bindSceneContrast({hero,scene,targets,layers}) {
  if(controllers.has(scene))return controllers.get(scene).dispose;
  let timer=0,due=performance.now()+600,busy=false,disposed=false,revision=0,lastKey='',lastCapture=0;
  function invalidate(){revision++;due=performance.now()+350;clearTimeout(timer);timer=setTimeout(()=>scene.dispatchEvent(new Event('sc-contrast-request')),360);}
  const resize=new ResizeObserver(invalidate);resize.observe(hero);

  const onResize=()=>invalidate();addEventListener('resize',onResize,{passive:true});
  document.addEventListener('sc-hero-content-ready',invalidate);
  function key(){
    return [...scene.querySelectorAll('.sky,.night-layer'),...targets()].map(node=>{
      const c=getComputedStyle(node),r=node.getBoundingClientRect();
      return [Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height),Math.round(+c.opacity*20),c.filter.replace(/[0-9]+(?:\.[0-9]+)?/g,v=>String(Math.round(Number(v)*20)/20)),c.backgroundImage].join(':');
    }).join('|');
  }
  const poll=setInterval(()=>{if(document.hidden)return;const next=key();if(next!==lastKey){lastKey=next;invalidate();}},1000);
  async function capture(){
    if(disposed||busy||!due||performance.now()<due||document.hidden)return;
    const active=targets().filter(n=>{const r=n.getBoundingClientRect();return r.width&&r.height&&r.bottom>0&&r.top<innerHeight;});
    if(!active.length)return;
    due=0;busy=true;const version=revision,start=performance.now(),bounds=hero.getBoundingClientRect();
    const scale=Math.min(1,256/bounds.width),width=Math.ceil(bounds.width*scale),height=Math.ceil(bounds.height*scale);
    try {
      const pending=[];
      const copy=document.createElement('div');styles(hero,copy);
      Object.assign(copy.style,{position:'relative',inset:'auto',left:'0',top:'0',width:bounds.width+'px',height:bounds.height+'px',margin:'0',transform:'none'});
      for(const source of layers()){const layer=clonePaint(source,scale,pending);if(layer)copy.append(layer);}
      for(const side of ['::before','::after']){const c=getComputedStyle(hero,side);if(c.content!=='none'&&c.content!=='normal'){const p=document.createElement('div');styles(hero,p,side);copy.append(p);}}
      copy.setAttribute('xmlns','http://www.w3.org/1999/xhtml');
      const freeze=performance.now()-start;
      await Promise.all(pending);
      const xml=new XMLSerializer().serializeToString(copy);
      const image=new Image();
      // Data URL keeps the foreignObject origin-clean; no network or uploads.
      image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${bounds.width} ${bounds.height}"><foreignObject width="100%" height="100%">${xml}</foreignObject></svg>`);
      await image.decode();
      if(disposed||version!==revision){due=performance.now()+350;return;}
      const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
      const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
      for(const target of active){
        const r=target.getBoundingClientRect(),samples=[];
        // Measure the central text band, not the empty rounded-button corners.
        const x=Math.max(0,Math.floor((r.left-bounds.left+r.width*.12)*scale));
        const y=Math.max(0,Math.floor((r.top-bounds.top+r.height*.3)*scale));
        const w=Math.min(width-x,Math.max(1,Math.ceil(r.width*.76*scale))),h=Math.min(height-y,Math.max(1,Math.ceil(r.height*.4*scale)));
        if(w<=0||h<=0)continue;
        const pixels=ctx.getImageData(x,y,w,h).data;
        const fill=getComputedStyle(target).backgroundColor.match(/[\d.]+/g)?.map(Number)||[0,0,0,0];
        const alpha=fill[3]??1;
        for(let i=0;i<pixels.length;i+=4)if(pixels[i+3]>250)samples.push([0,1,2].map(k=>pixels[i+k]*(1-alpha)+fill[k]*alpha));
        if(samples.length<w*h*.9)throw new Error('Incomplete background capture');
        const result=chooseTone(samples,target.dataset.heroTone);
        target.dataset.heroTone=result.tone;target.dataset.heroContrast=result.ratio.toFixed(2);target.dataset.contrastMeasured='true';
        target.style.setProperty('--sc-region-ink',result.tone==='light'?'#fff':result.tone==='strong-dark'?'#000':'#122c3b');
        target.style.setProperty('color','var(--sc-region-ink)','important');
        target.style.setProperty('border-color','currentColor','important');
      }
      if(new URLSearchParams(location.search).has('contrastAudit')) {
        let reference=document.getElementById('sc-contrast-reference');
        if(!reference){reference=document.createElement('img');reference.id='sc-contrast-reference';reference.hidden=true;document.body.append(reference);}
        reference.src=canvas.toDataURL();
      }
      lastCapture++;
      hero.dataset.contrastMeasurement=JSON.stringify({count:lastCapture,freezeMs:Math.round(freeze),totalMs:Math.round(performance.now()-start),width,height});
      delete hero.dataset.contrastError;
    }catch(error){
      hero.dataset.contrastError=String(error);
      for(const target of active){
        delete target.dataset.contrastMeasured;
        target.style.removeProperty('--sc-region-ink');
        target.style.removeProperty('color');target.style.removeProperty('border-color');
      }
    }
    finally{busy=false;}
  }
  function dispose(){disposed=true;clearInterval(poll);resize.disconnect();clearTimeout(timer);removeEventListener('resize',onResize);document.removeEventListener('sc-hero-content-ready',invalidate);controllers.delete(scene);}
  controllers.set(scene,{capture,dispose});invalidate();return dispose;
}
// Called synchronously at the end of a rendered frame, before WebGL clears it.
const service={afterFrame(scene){controllers.get(scene)?.capture();}};
if(typeof window!=='undefined')window.SolarSceneContrast=service;

// Shared-stage host contract: neon primary actions retain their own ink.
export function bindStageButtons(stage,scene){
  return bindSceneContrast({hero:stage,scene,
    targets:()=>[...stage.querySelectorAll('[data-sc-contrast],.secondary-cta,.hs-retro-secondary')],
    layers:()=>[...stage.children].filter(node=>node===scene||node.matches('.hs-foreground-layer,.hs-transition-wash'))});
}
