// Preserve native details semantics and a readable no-script fallback.
for (const details of document.querySelectorAll('.sc-faq details')) {
  const summary = details.querySelector('summary');
  const answer = details.querySelector('.sc-faq-answer');
  let animation;
  let expanded = details.open;
  summary.addEventListener('click', (event) => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !answer.animate) return;
    event.preventDefault();
    const from = details.open ? answer.getBoundingClientRect().height : 0;
    animation?.cancel();
    expanded = !expanded;
    details.open = true;
    details.toggleAttribute('data-closing', !expanded);
    const target = expanded ? answer.scrollHeight : 0;
    animation = answer.animate(
      [{ height: `${from}px`, opacity: from > 0 ? 1 : 0 }, { height: `${target}px`, opacity: expanded ? 1 : 0 }],
      { duration: 260, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'both' },
    );
    animation.onfinish = () => {
      details.open = expanded;
      details.removeAttribute('data-closing');
      animation.cancel();
      animation = undefined;
    };
  });
  details.addEventListener('toggle', () => { if (!animation) expanded = details.open; });
}

// The scene currently mounts the person card asynchronously.
function labelContact() {
  const link = document.querySelector('.hs-person-section .hs-person-message');
  if (!link) return false;
  link.setAttribute('aria-label', 'Kontakt');
  link.title = 'Kontakt';
  const label = document.createElement('span');
  label.textContent = 'Kontakt';
  link.append(label);
  return true;
}
if (!labelContact()) {
  const observer = new MutationObserver(() => { if (labelContact()) observer.disconnect(); });
  observer.observe(document.body, { childList: true, subtree: true });
  addEventListener('pagehide', () => observer.disconnect(), { once: true });
}

// Reuse the trust box's artwork and wording at the foot of the homepage scene.
function mountHeroTrust() {
  const page = document.querySelector('.homepage-study:not(.hs-simulation-route)');
  const hero = page?.querySelector('.hero');
  const items = page?.querySelectorAll('.sc-trust-item');
  if (!hero || !items?.length) return false;
  if (hero.querySelector('.sc-hero-trust')) return true;
  const strip = document.createElement('div');
  strip.className = 'sc-hero-trust';
  const list = document.createElement('ul');
  list.setAttribute('aria-label', 'Unsere Grundlagen');
  const heroLabels = {
    sources: 'Geprüfte Datenquellen',
    updated: 'Regelmäßig aktualisierte Daten',
    access: 'Kostenlos und ohne Anmeldung',
  };
  for (const item of items) {
    const badge = item.querySelector('solar-trust-badge');
    const heading = item.querySelector('h3');
    if (!badge || !heading) continue;
    const entry = document.createElement('li');
    const art = badge.cloneNode(true);
    art.setAttribute('motion', 'off');
    const label = document.createElement('span');
    const sharedLabel = heroLabels[badge.getAttribute('motif')] || heading.textContent;
    heading.textContent = sharedLabel;
    label.textContent = sharedLabel;
    entry.append(art, label);
    list.append(entry);
  }
  strip.append(list);
  hero.append(strip);
  return true;
}
if (!mountHeroTrust()) {
  const trustObserver = new MutationObserver(() => { if (mountHeroTrust()) trustObserver.disconnect(); });
  trustObserver.observe(document.body, { childList: true, subtree: true });
  addEventListener('pagehide', () => trustObserver.disconnect(), { once: true });
}

// Read the actual CSS skies at each content region, including live opacity and
// brightness filters. No clock thresholds, extra backgrounds or scene mutations.
function bindHeroContrast() {
  const root = document.querySelector('.homepage-study');
  const scene = root?.querySelector('.scene');
  const policy = window.SolarHeroContrast;
  if (!root || !scene || !policy) return false;
  let frame=0, until=0;
  const targets=()=>[...root.querySelectorAll('.site-header,.hero-copy,.hero-copy h1,.hero-description,.hero-copy .eyebrow,.hs-journey,.hs-location-step h2,.hs-location-explanation,.hs-journey-back,.hero-actions')];
  function sync() {
    frame=0;
    const bounds=scene.getBoundingClientRect();
    if (!bounds.height) return;
    const layers=[...scene.querySelectorAll('.sky,.night-layer')].map(node=>{
      const css=getComputedStyle(node);
      return {node,image:css.backgroundImage,opacity:parseFloat(css.opacity),brightness:parseFloat(css.filter.match(/brightness\(([^)]+)\)/)?.[1]||'1'),z:parseInt(css.zIndex)||0};
    }).filter(layer=>layer.opacity>.001 && layer.image!=='none').sort((a,b)=>a.z-b.z);
    for(const node of targets()) {
      if (!node.getClientRects().length) continue;
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
  observer.observe(root,{attributes:true,attributeFilter:['style','data-mode','data-phase','data-weather','data-dark','class']});
  const resize=new ResizeObserver(()=>schedule());resize.observe(scene);
  const onScroll=()=>schedule();
  addEventListener('scroll',onScroll,{passive:true});addEventListener('resize',onScroll,{passive:true});
  document.fonts?.ready.then(()=>schedule());
  sync();schedule(true);
  addEventListener('pagehide',event=>{if(event.persisted)return;observer.disconnect();resize.disconnect();cancelAnimationFrame(frame);removeEventListener('scroll',onScroll);removeEventListener('resize',onScroll);});
  return true;
}
if (!bindHeroContrast()) {
  const rootObserver = new MutationObserver(() => { if (bindHeroContrast()) rootObserver.disconnect(); });
  rootObserver.observe(document.body, { childList: true, subtree: true });
  addEventListener('pagehide', () => rootObserver.disconnect(), { once: true });
}

// Open the shared React modal with the existing navigation catalogue.
function bindToolsOverview() {
  const entry = document.querySelector('.hs-all-calculators');
  if (!entry) return false;
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = entry.className;
  trigger.innerHTML = `Weitere Tools ${entry.querySelector('svg')?.outerHTML || ''}`;
  trigger.setAttribute('aria-haspopup', 'dialog');
  entry.replaceWith(trigger);
  let overview;
  trigger.addEventListener('click', async () => {
    trigger.disabled = true;
    try {
      const { mountToolsOverview } = await import('/homepage-study/race-dist/direct-race.js');
      overview ||= mountToolsOverview();
      overview.show();
    } finally { trigger.disabled = false; }
  });
  return true;
}
if (!bindToolsOverview()) {
  const observer = new MutationObserver(() => { if (bindToolsOverview()) observer.disconnect(); });
  observer.observe(document.body, { childList: true, subtree: true });
  addEventListener('pagehide', () => observer.disconnect(), { once: true });
}
