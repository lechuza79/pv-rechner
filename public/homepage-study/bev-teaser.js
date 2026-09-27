// Repo-owned tools extend the scene without modifying its generated bundle.
(() => {
  const template = document.getElementById('sc-bev-teaser');
  if (!template) return;
  function mount() {
    const grid = document.querySelector('#startseite-inhalt .hs-five-tools');
    if (!grid) return false;
    if (grid.querySelector('[data-bev-teaser]')) return true;
    grid.append(template.content.cloneNode(true));
    grid.classList.add('hs-six-tools');
    // Both coming products lead to information pages, using the same link CTA.
    const offer = grid.querySelector('[data-home-waitlist]');
    if (offer) {
      const link = grid.querySelector('[data-bev-teaser] .hs-tool-actions a').cloneNode(true);
      link.href = '/angebot-pruefen';
      offer.replaceWith(link);
    }
    const art = grid.querySelector('[data-bev-teaser] .hs-tool-art');
    const illustration = art.querySelector('solar-illustration');
    const fallback = art.querySelector('img');
    illustration.addEventListener('illustration-ready', () => {
      illustration.classList.add('is-ready');
      fallback.hidden = true;
    }, {once:true});
    return true;
  }
  if (!mount()) {
    const observer = new MutationObserver(() => { if (mount()) observer.disconnect(); });
    observer.observe(document.body, {childList:true, subtree:true});
    addEventListener('pagehide', () => observer.disconnect(), {once:true});
  }
})();
