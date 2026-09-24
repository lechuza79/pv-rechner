// Synchronous head entry: final palette is CSS; font readiness only controls reveal.
// The bounded fallback also leaves the shell usable when a font request fails.
(() => {
  const root = document.documentElement;
  if (!root.hasAttribute('data-sc-shell')) return;
  root.dataset.scFonts = 'pending';
  let timer;
  const reveal = () => { clearTimeout(timer); root.dataset.scFonts = 'ready'; };
  timer = setTimeout(reveal, 1800);
  const load = () => {
    if (!document.fonts) return reveal();
    Promise.all([document.fonts.load('700 32px Montserrat'), document.fonts.load('400 16px DMSans')]).then(reveal, reveal);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load, {once:true});
  else load();
})();
