// Use the scene's existing reverse transition instead of reloading the sky.
document.addEventListener('click', event => {
  const logo = event.target instanceof Element ? event.target.closest('.site-header a.brand, .site-header a.sc-menu-brand') : null;
  if (!logo || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const back = document.querySelector('.hs-journey-back');
  if (document.querySelector('.homepage-study.hs-simulation-route') && back) {
    event.preventDefault();
    event.stopImmediatePropagation();
    back.click();
  } else if (location.pathname === '/') {
    event.preventDefault();
    window.scrollTo({top:0,behavior:'smooth'});
  }
}, true);

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
  const targets=()=>[...root.querySelectorAll('.site-header,.hero-copy,.hero-copy h1,.hero-description,.hero-copy .eyebrow,.hs-journey,.hs-location-step h2,.hs-location-explanation,.hs-journey-back,.hero-actions,.hero-actions .secondary-cta,.hs-retro-actions .hs-retro-secondary,.hs-retro-values,.hs-location-step .hs-location-form')];
  function sync() {
    frame=0;
    const bounds=scene.getBoundingClientRect();
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
  observer.observe(root,{attributes:true,attributeFilter:['style','data-mode','data-phase','data-weather','data-dark','class']});
  // Result actions are inserted after postcode submission without a route change.
  const contentObserver=new MutationObserver(()=>schedule(true));
  contentObserver.observe(root,{childList:true,subtree:true});
  const resize=new ResizeObserver(()=>schedule());resize.observe(scene);
  const onScroll=()=>schedule();
  addEventListener('scroll',onScroll,{passive:true});addEventListener('resize',onScroll,{passive:true});
  document.fonts?.ready.then(()=>schedule());
  document.addEventListener('sc-hero-content-ready',sync);
  import('/hero-system/contrast-sampler.js').then(({bindSceneContrast})=>{
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

// All entry points submit through the scene's existing postcode validation.
function bindSimulationEntry() {
  const root = document.querySelector('.homepage-study');
  if (!root) return false;
  const dock = document.createElement('aside');
  dock.className = 'sc-location-dock';
  dock.setAttribute('aria-label', 'Standort für die Simulation');
  dock.hidden = true;
  document.body.append(dock);
  let original, postcode = '', framePostcode = '';
  const entry = document.querySelector('.sc-live-entry');
  const frame = document.getElementById('sc-live-rahmen');
  const intersections = new Map();
  const visibility = new IntersectionObserver(entries => {
    entries.forEach(item => intersections.set(item.target, item.isIntersecting));
    updateDock();
  });
  function updateDock() {
    dock.hidden = !root.classList.contains('hs-simulation-route') || root.classList.contains('sc-location-ready') || !original || intersections.get(original) !== false || intersections.get(entry) === true;
  }
  function copyForm(target, suffix) {
    target.replaceChildren();
    const form = document.createElement('form');
    form.className = 'hs-location-form';
    form.innerHTML = `<label for="sc-plz-${suffix}">Postleitzahl</label><div><input id="sc-plz-${suffix}" name="plz" inputmode="numeric" enterkeyhint="go" autocomplete="postal-code" pattern="[0-9]{5}" maxlength="5" required placeholder="PLZ eingeben"><button type="submit" class="hs-location-submit" aria-label="Berechnen">${original.querySelector('[type=submit]')?.innerHTML || '→'}</button></div><p role="status"></p>`;
    const input = form.querySelector('input');
    form.addEventListener('submit', event => {
      event.preventDefault();
      const source = original?.querySelector('input');
      if (!source?.isConnected) return;
      postcode = input.value.trim();
      input.blur();
      source.value = postcode;
      source.dispatchEvent(new Event('input', { bubbles: true }));
      source.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });
    target.append(form);
  }
  function sync() {
    const form = root.querySelector('.hs-location-step .hs-location-form');
    if (form && form !== original) {
      if (original) visibility.unobserve(original);
      original = form;
      visibility.observe(form);
      if (entry) { copyForm(entry.querySelector('[data-sc-location-slot]'), 'live'); visibility.observe(entry); }
      copyForm(dock, 'sticky');
      form.addEventListener('submit', () => { postcode = form.querySelector('input').value.trim(); }, true);
      form.querySelector('input').addEventListener('keydown', () => { postcode = form.querySelector('input').value.trim(); });
    }
    const ready = !!root.querySelector('.hs-retro-hero');
    if (root.classList.contains('sc-location-ready') !== ready) {
      root.classList.toggle('sc-location-ready', ready);

    }
    const message = original?.querySelector('[role=status]')?.textContent || '';
    for (const node of document.querySelectorAll('.sc-location-dock [role=status],.sc-live-entry [role=status]')) if (node.textContent !== message) node.textContent = message;
    if (entry) entry.hidden = ready;
    if (frame) {
      frame.hidden = !ready;
      if (ready && /^\d{5}$/.test(postcode) && framePostcode !== postcode) {
        framePostcode = postcode;
        const params = new URLSearchParams({plz:postcode,onsite:'1',embed:'0',branding:'0',presentation:'site',bg:'#e8ece2',fg:'#153740',muted:'#45645e',accent:'#153740',accentfg:'#e8ece2',highlight:'#cfff20',ink:'#153740'});
        frame.src = '/embed/simulation?' + params;
      }
    }
    updateDock();
  }
  const observer = new MutationObserver(sync);
  observer.observe(root, {childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class']});
  sync();
  addEventListener('pagehide', () => { observer.disconnect(); visibility.disconnect(); dock.remove(); }, {once:true});
  return true;
}
if (!bindSimulationEntry()) {
  const observer = new MutationObserver(() => { if (bindSimulationEntry()) observer.disconnect(); });
  observer.observe(document.body, {childList:true,subtree:true});
}

// One scroll, before the result replaces the input; no second restart on render.
document.addEventListener('sc-simulation-scroll-top', () => {
  if (location.hash) history.replaceState(history.state, '', location.pathname + location.search);
  window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
});
