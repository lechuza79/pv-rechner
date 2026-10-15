// Shared simulation presentation: sample the rendered sky, not a time threshold.
(function () {
function bindHeroContrast(options = {}) {
  const root = options.root || document.querySelector('.homepage-study');
  const scene = options.scene || root?.querySelector('.scene');
  const policy = window.SolarHeroContrast;
  if (!root || !scene || !policy) return false;
  root.setAttribute('data-sc-hero-presentation', '');
  let frame=0, until=0;
  const targets=options.targets || (()=>[...root.querySelectorAll('.site-header,.sc-search-toggle,.hero-copy,.hero-copy h1,.hero-description,.hero-copy .eyebrow,.hs-journey,.hs-location-step h2,.hs-location-explanation,.hs-journey-back,.hero-actions,.hero-actions .secondary-cta,.hs-retro-actions .hs-retro-secondary,.hs-retro-values,.hs-location-step .hs-location-form')]);
  function sync() {
    frame=0;
    const sceneBounds=scene.getBoundingClientRect();
    const bounds={height:sceneBounds.height,top:sceneBounds.top+(options.offsetTop?.() || 0)};
    if (!bounds.height) return;
    const layers=[...scene.querySelectorAll('.sky,.night-layer')].map(node=>{
      const css=getComputedStyle(node);
      return {node,image:css.backgroundImage,opacity:parseFloat(css.opacity),brightness:parseFloat(css.filter.match(/brightness\(([^)]+)\)/)?.[1]||'1'),z:parseInt(css.zIndex)||0};
    }).filter(layer=>layer.opacity>.001 && layer.image!=='none').sort((a,b)=>a.z-b.z);
    for(const node of targets()) {
      if (!node.getClientRects().length || node.dataset.contrastMeasured === 'true') continue;
      // Read where glyphs sit, excluding the large empty gap in the mobile hero.
      let regions=node.matches('.hero-copy')?[...node.querySelectorAll('h1,.hero-description,.eyebrow')].filter(e=>e.getClientRects().length):[node];
      if (!regions.length) continue;
      const samples=regions.flatMap(region=>{
        const rect=region.getBoundingClientRect();
        return [0,.25,.5,.75,1].map(t=>{
          const y=Math.max(0,Math.min(1,(rect.top+(rect.height*t)-bounds.top)/bounds.height));
          let bg=[119,185,219];
          for(const layer of layers) {
            // Night uses a solid base gradient plus a decorative radial glow.
            const image=layer.image.includes('linear-gradient')?layer.image.slice(layer.image.lastIndexOf('linear-gradient')):layer.image;
            const color=policy.sample(image,y);
            if(color) bg=policy.over(bg,color.map((v,i)=>i<3?Math.min(255,Math.max(0,v*layer.brightness)):v),layer.opacity);
          }
          const wash=root.querySelector('.hs-transition-wash');
          if(wash) {
            const box=wash.getBoundingClientRect(),css=getComputedStyle(wash);
            const screenY=rect.top+rect.height*t;
            if(css.display!=='none' && screenY>=box.top && screenY<=box.bottom) {
              const color=policy.sample(css.backgroundImage,(screenY-box.top)/box.height);
              if(color)bg=policy.over(bg,color,parseFloat(css.opacity));
            }
          }
          return bg;
        });
      });
      const result=policy.choose(samples,node.dataset.heroTone);
      if(node.dataset.heroTone!==result.tone)node.dataset.heroTone=result.tone;
      node.dataset.heroContrast=result.ratio.toFixed(2);
    }
    if(performance.now()<until)frame=requestAnimationFrame(sync);
  }
  function schedule(transition=false) {
    if(transition)until=performance.now()+1800;
    if(!frame)frame=requestAnimationFrame(sync);
  }
  const observer=new MutationObserver(()=>schedule(true));
  observer.observe(options.sceneRoot || root,{attributes:true,attributeFilter:['style','data-mode','data-phase','data-weather','data-dark','class']});
  // Result actions are inserted after postcode submission without a route change.
  const contentObserver=new MutationObserver(()=>schedule(true));
  contentObserver.observe(root,{childList:true,subtree:true});
  const resize=new ResizeObserver(()=>schedule());resize.observe(scene);
  const onScroll=()=>schedule();
  addEventListener('scroll',onScroll,{passive:true});addEventListener('resize',onScroll,{passive:true});
  document.fonts?.ready.then(()=>schedule());
  document.addEventListener('sc-hero-content-ready',sync);
  if (!options.sceneRoot) import('/hero-system/contrast-sampler.js').then(({bindSceneContrast})=>{
    const hero=scene.closest('.hero');
    const dispose=bindSceneContrast({hero,scene,
      targets:()=>[...hero.querySelectorAll('.hero-actions .secondary-cta,.hs-retro-actions .hs-retro-secondary')],
      layers:()=>[...hero.children].filter(n=>n.matches('.scene,.hs-transition-wash,.hs-foreground-layer'))});
    addEventListener('pagehide',event=>{if(!event.persisted)dispose();});
  });
  sync();schedule(true);
  addEventListener('pagehide',event=>{if(event.persisted)return;document.removeEventListener('sc-hero-content-ready',sync);observer.disconnect();contentObserver.disconnect();resize.disconnect();cancelAnimationFrame(frame);removeEventListener('scroll',onScroll);removeEventListener('resize',onScroll);});
  return true;
}
window.bindSolarHeroPresentation = bindHeroContrast;
})();
