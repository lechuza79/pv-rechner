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
