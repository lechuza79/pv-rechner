/* Solar Check: dependency-free layered illustrations. Local assets only. */
(() => {
  if (window.SolarCheckIllustrations) return;
  const base = new URL('.', document.currentScript.src);
  const cache = new Map();
  const pending = new Map();
  const allowed = new Set(['house','house-large','house-semi','house-row-middle','house-row-end','battery','balcony-modern','heatpump-modern','roof-flat','roof-gable','roof-hip','roof-shed','funding-check','offer-check','rank-mystery']);
  window.SolarCheckIllustrations = {
    register(id, svg) { cache.set(id, svg); pending.get(id)?.resolve(svg); },
    load(id) {
      if (!allowed.has(id)) return Promise.reject(new Error('Unknown illustration'));
      if (cache.has(id)) return Promise.resolve(cache.get(id));
      if (pending.has(id)) return pending.get(id).promise;
      let resolve, reject;
      const promise = new Promise((a,b) => {resolve=a;reject=b;});
      pending.set(id,{promise,resolve,reject});
      const script=document.createElement('script');
      script.src=new URL(`motifs/${id}.js`,base).href;
      script.onload=()=>{script.remove();if(!cache.has(id)){pending.delete(id);reject(new Error('Missing illustration'));}};
      script.onerror=()=>{script.remove();pending.delete(id);reject(new Error('Illustration unavailable'));};
      document.head.append(script);
      return promise;
    }
  };
  const visible = new Set();
  let frame = 0;
  function updateScroll() {
    frame = 0;
    visible.forEach(el => {
      if (!el.canScroll()) return;
      const box = el.getBoundingClientRect();
      const progress = Math.max(-1,Math.min(1,(innerHeight/2-box.top-box.height/2)/(innerHeight/2+box.height/2)));
      el.move(0,progress*1.8);
    });
  }
  function scheduleScroll() { if (!frame) frame=requestAnimationFrame(updateScroll); }
  addEventListener('scroll',scheduleScroll,{passive:true});
  addEventListener('resize',scheduleScroll,{passive:true});
  class SolarIllustration extends HTMLElement {
    static observedAttributes=['motif','circle','motion','label','reveal','hide-layers'];
    constructor(){
      super();this.attachShadow({mode:'open'});this.token=0;
      this.onMove=e=>{if(!this.canMove())return;const b=this.getBoundingClientRect();this.move((e.clientX-b.left)/b.width*2-1,(e.clientY-b.top)/b.height*2-1);};
      this.onLeave=()=>this.move(0,0);
      this.onPreference=()=>{this.move(0,0);scheduleScroll();if(this.reduced.matches)this.shadowRoot.querySelectorAll('[data-layer]').forEach(el=>el.getAnimations().forEach(a=>a.cancel()));};
    }
    connectedCallback(){
      this.reduced=matchMedia('(prefers-reduced-motion: reduce)');
      this.fine=matchMedia('(hover: hover) and (pointer: fine)');
      this.reduced.addEventListener('change',this.onPreference);
      this.fine.addEventListener('change',this.onPreference);
      this.scrollObserver=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting)visible.add(this);else visible.delete(this);});scheduleScroll();});
      this.scrollObserver.observe(this);
      this.addEventListener('pointermove',this.onMove);this.addEventListener('pointerleave',this.onLeave);
      if(this.getAttribute("loading")==="lazy"){
        // Allow selected illustrations to prepare ahead without eager page-wide loading.
        const requestedMargin=Number(this.getAttribute('loading-margin'));
        const margin=requestedMargin>0?Math.min(requestedMargin,1600):150;
        this.loadObserver=new IntersectionObserver(entries=>{
          if(entries.some(e=>e.isIntersecting)){
            this.loadObserver.disconnect();this.lazyActivated=true;this.render();
          }
        },{rootMargin:`${margin}px 0px`});
        this.loadObserver.observe(this);
      }else this.render();
    }
    disconnectedCallback(){
      this.token++;this.loadObserver?.disconnect();this.observer?.disconnect();this.scrollObserver?.disconnect();visible.delete(this);this.fine?.removeEventListener('change',this.onPreference);this.reduced?.removeEventListener('change',this.onPreference);
      this.removeEventListener('pointermove',this.onMove);this.removeEventListener('pointerleave',this.onLeave);
    }
    attributeChangedCallback(name,old,value){
      if(!this.isConnected||old===value)return;
      if(name==='motif'){if(this.getAttribute('loading')!=='lazy'||this.lazyActivated)this.render();}else this.settings();
    }
    enabled(name){return this.hasAttribute(name)&&this.getAttribute(name)!=='false';}
    canMove(){return this.getAttribute('motion')!=='off'&&!this.reduced.matches&&this.fine.matches;}
    canScroll(){return this.getAttribute('motion')!=='off'&&!this.reduced.matches&&!this.fine.matches;}
    move(x,y){
      this.shadowRoot.querySelectorAll('.move-layer').forEach(el=>{
        const name=el.closest('[data-layer]')?.dataset.layer||'';
        const depth=name.startsWith('row-')?4:Number(el.dataset.depth)||0;
        el.style.transform=`translate(${x*depth*1.35}px,${y*depth*.85}px)`;
      });
    }
    settings(){
      const svg=this.shadowRoot.querySelector('svg');if(!svg)return;
      svg.querySelector('[data-circle]')?.toggleAttribute('hidden',!this.enabled('circle'));
      const hidden=new Set((this.getAttribute('hide-layers')||'').split(',').map(s=>s.trim()).filter(Boolean));
      svg.querySelectorAll('[data-layer]').forEach(el=>el.toggleAttribute('hidden',hidden.has(el.dataset.layer)));
      svg.setAttribute('aria-label',this.getAttribute('label')||svg.querySelector('title')?.textContent.replace(' · Entwurf','')||'Solar Check Illustration');
      this.move(0,0);scheduleScroll();
    }
    replay(){
      if(this.reduced.matches)return;
      this.shadowRoot.querySelectorAll('[data-layer]').forEach((el,i)=>{
        el.getAnimations().forEach(a=>a.cancel());
        el.animate([{opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'translateY(0)'}],{duration:650,delay:Math.min(i*65,450),fill:'backwards',easing:'cubic-bezier(.2,.7,.2,1)'});
      });
    }
    async render(){
      const token=++this.token;this.observer?.disconnect();
      try{
        if(document.querySelector('script[src$="/solar-neon.js"]')&&!window.SolarCheckNeon?.installed)await new Promise(resolve=>document.addEventListener('solar-neon-ready',resolve,{once:true}));
        if(token!==this.token||!this.isConnected)return;
        const svg=await window.SolarCheckIllustrations.load(this.getAttribute('motif')||'house');
        if(token!==this.token||!this.isConnected)return;
        this.shadowRoot.innerHTML=`<style>:host{display:block;width:100%;aspect-ratio:1;contain:layout style}svg{display:block;width:100%;height:auto;overflow:visible}svg [hidden]{display:none!important}.move-layer{transition:transform .22s ease-out;transform-origin:center;transform-box:view-box}[data-circle]{fill:var(--solar-circle,#e2e9df)}@media(prefers-reduced-motion:reduce){.move-layer{transition:none}}</style>${svg}`;
        // Wait on the actual SVG image elements, not a separate preload cache.
        // The preview server may revalidate an image when SVG requests it again.
        this.shadowRoot.querySelector('svg').style.visibility='hidden';
        await Promise.all([...this.shadowRoot.querySelectorAll('image')].map(image=>new Promise((resolve,reject)=>{
          const timer=setTimeout(()=>reject(new Error('Illustration layer timeout')),15000);
          image.addEventListener('load',()=>{clearTimeout(timer);resolve();},{once:true});
          image.addEventListener('error',()=>{clearTimeout(timer);reject(new Error('Illustration layer unavailable'));},{once:true});
        })));
        if(token!==this.token||!this.isConnected)return;
        this.shadowRoot.querySelector('svg').style.visibility='';
        this.settings();
        if(this.enabled('reveal')&&!this.reduced.matches){
          this.observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){this.replay();this.observer.disconnect();}},{threshold:.2});this.observer.observe(this);
        }
        this.dispatchEvent(new CustomEvent('illustration-ready',{bubbles:true}));
      }catch(error){
        if(token!==this.token)return;
        this.shadowRoot.innerHTML='<span role="img" aria-label="Illustration nicht verfügbar"></span>';
        this.dispatchEvent(new CustomEvent('illustration-error',{detail:{motif:this.getAttribute('motif')},bubbles:true}));
      }
    }
  }
  customElements.define('solar-illustration',SolarIllustration);
})();
