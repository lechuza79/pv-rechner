(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0, layer, particles = [], started = 0;
  function stop() { cancelAnimationFrame(frame); layer?.remove(); layer = null; particles = []; }
  function play(target) {
    stop();
    const tile = target??document.querySelector('.v3-rank-intro');
    if (!tile) return;
    if (reduced.matches || document.hidden) return;
    const box = tile.getBoundingClientRect();
    layer = document.createElement('canvas');
    layer.setAttribute('aria-hidden','true');
    Object.assign(layer.style,{position:'fixed',inset:'0',width:'100%',height:'100%',pointerEvents:'none',zIndex:100});
    const dpr = Math.min(devicePixelRatio,2);
    layer.width = innerWidth*dpr; layer.height = innerHeight*dpr;
    document.body.append(layer);
    const ctx = layer.getContext('2d'); if(!ctx){stop();return;} ctx.scale(dpr,dpr);
    const quiet = false, fountain = false;
    // Purple pair from design-lab/homepage-experiments.css (.hs-coming).
    const colors = ['#d4ff24', '#e8d5ff', '#e8eee9', '#562581', '#d4ff24', '#e8d5ff', '#e8eee9', '#a7bcbb'];
    const count = quiet ? 16 : fountain ? 76 : 64;
    const scale = innerWidth < 700 ? .76 : 1;
    const duration = quiet ? 1100 : fountain ? 1700 : 1500;
    for (let i=0; i<count; i++) {
      const side = i%2 ? 1 : -1, r=Math.random;
      const angle = fountain ? -side*(.32+r()*.5) : (r()-.5)*2.6;
      const speed = (quiet ? 230+r()*130 : fountain ? 460+r()*160 : 370+r()*290)*scale;
      particles.push({x: fountain ? (side<0?box.left+14:box.right-14) : box.left+box.width/2+(r()-.5)*36,
        y:box.top+8, vx:Math.sin(angle)*speed, vy:-Math.cos(angle)*speed,
        delay:quiet ? r()*35 : fountain ? Math.floor(i/2)*5 : (i<34?0:125)+r()*28,
        w:quiet ? 6+r()*4 : 4+r()*4, h:quiet ? 11+r()*6 : 7+r()*6,
        spin:(r()-.5)*(quiet?7:17), phase:r()*Math.PI*2, color:colors[i%colors.length], circle:i%9===0});
    }
    started=performance.now(); tile.dataset.celebrated='true';
    function draw(now) {
      const elapsed=now-started;
      ctx.clearRect(0,0,innerWidth,innerHeight);
      for (const p of particles) {
        const t=(elapsed-p.delay)/1000;if(t<0)continue;
        const gravity=(quiet?950:1250)*scale;
        const drag=1.9;
        const x=p.x+p.vx*(1-Math.exp(-drag*t))/drag+Math.sin(t*10+p.phase)*t*9;
        const y=p.y+p.vy*t+gravity*t*t*.5;
        const fade=Math.min(1,Math.max(0,(duration-elapsed)/240));
        ctx.save();ctx.translate(x,y);ctx.rotate(p.phase+p.spin*t);
        ctx.scale(.25+.75*Math.abs(Math.cos(t*11+p.phase)),1);
        ctx.globalAlpha=fade;ctx.fillStyle=p.color;
        if(p.circle){ctx.beginPath();ctx.ellipse(0,0,p.w*.55,p.h*.4,0,0,Math.PI*2);ctx.fill();}
        else ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);
        ctx.restore();
      }
      if(elapsed<duration)frame=requestAnimationFrame(draw);
      else stop();
    }
    frame=requestAnimationFrame(draw);
  }
  window.addEventListener('atlas-ranking-celebrate',event=>play(event.detail?.target));
  reduced.addEventListener('change', stop);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  addEventListener('resize',stop);
  function mount() {
    const tile=document.querySelector('.v3-rank-intro');
    if(!tile){setTimeout(mount,100);return;}
    let visible=false,timer=0,celebrated=false;
    const ready=()=>document.documentElement.dataset.atlasBoot==='ready'
      &&document.querySelector('.site-header')?.dataset.navReady==='true'
      &&document.querySelector('.v3-monitor-card')?.dataset.ready==='true'
      &&(document.querySelector('.scene')?.dataset.unifiedReady==='true'||document.querySelector('.solar-page')?.dataset.sceneBoot==='failed');
    const schedule=()=>{if(celebrated)return;if(!visible||document.hidden||reduced.matches||!ready()){clearTimeout(timer);timer=0;return;}if(!timer)timer=setTimeout(()=>{timer=0;if(!visible||document.hidden||!ready())return;celebrated=true;observer.disconnect();loading.disconnect();play(tile);},2200);};
    const observer=new IntersectionObserver(entries=>{visible=entries.some(entry=>entry.isIntersecting&&entry.intersectionRatio>=.75);schedule();},{threshold:.75});
    const loading=new MutationObserver(schedule);
    loading.observe(document.documentElement,{subtree:true,attributes:true,attributeFilter:['data-atlas-boot','data-nav-ready','data-ready','data-unified-ready','data-scene-boot']});
    document.addEventListener('visibilitychange',schedule);reduced.addEventListener('change',schedule);
    addEventListener('pagehide',()=>{clearTimeout(timer);observer.disconnect();loading.disconnect();},{once:true});
    observer.observe(tile);
  }
  mount();
})();
