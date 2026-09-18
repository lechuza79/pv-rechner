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
  for (const item of items) {
    const badge = item.querySelector('solar-trust-badge');
    const heading = item.querySelector('h3');
    if (!badge || !heading) continue;
    const entry = document.createElement('li');
    const art = badge.cloneNode(true);
    art.setAttribute('motion', 'off');
    const label = document.createElement('span');
    label.textContent = heading.textContent;
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

// The scene's legacy dark flag switches only near nightfall. Twilight is
// already dimmed by sky-brightness; use that rendered value for host copy.
function bindHeroContrast() {
  const root = document.querySelector('.homepage-study');
  if (!root) return false;
  function sync() {
    const brightness = Number.parseFloat(root.style.getPropertyValue('--sky-brightness'));
    const light = Number.isFinite(brightness) ? brightness < 0.65 : ['night', 'dusk', 'dawn'].includes(root.dataset.phase || root.dataset.mode);
    const tone = light ? 'light' : 'dark';
    if (root.dataset.copyTone !== tone) root.dataset.copyTone = tone;
  }
  sync();
  const contrastObserver = new MutationObserver(sync);
  contrastObserver.observe(root, { attributes: true, attributeFilter: ['style', 'data-phase', 'data-mode'] });
  addEventListener('pagehide', () => contrastObserver.disconnect(), { once: true });
  return true;
}
if (!bindHeroContrast()) {
  const rootObserver = new MutationObserver(() => { if (bindHeroContrast()) rootObserver.disconnect(); });
  rootObserver.observe(document.body, { childList: true, subtree: true });
  addEventListener('pagehide', () => rootObserver.disconnect(), { once: true });
}
