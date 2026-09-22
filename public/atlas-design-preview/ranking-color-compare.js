// Local visual comparison only; the current palette remains the default.
(()=>{
 const mount=()=>{
  const section=document.querySelector('#atlas-ranking');if(!section)return false;
  if(section.querySelector('.ranking-palette-test'))return true;
  const style=document.createElement('style');style.textContent=`
  .ranking-palette-test{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:24px;font:13px/1.4 'DM Sans',sans-serif}
  .ranking-palette-test button{font:inherit;color:inherit;background:transparent;border:1px solid currentColor;border-radius:999px;padding:7px 12px;cursor:pointer;opacity:.65}
  .ranking-palette-test button[aria-pressed=true]{opacity:1;background:var(--atlas-ink);color:var(--atlas-bg);border-color:var(--atlas-ink)}
  #atlas-ranking[data-palette=cool]{--atlas-bg:#e2e9e5;--atlas-paper:#ebf0ef;--atlas-ink:#173b42;--atlas-muted:#496767;--atlas-line:#173b4226}
  #atlas-ranking[data-palette=cool] .ranking-label{background:#cfdbd5!important}
  #atlas-ranking[data-palette=dark]{--atlas-bg:#08191c;--atlas-paper:#163338;--atlas-ink:#e8eee9;--atlas-muted:#a7bcbb;--atlas-line:#b0c8c325}
  #atlas-ranking[data-palette=dark] .ranking-label{background:#0b2024!important}
  #atlas-ranking[data-palette] .ranking-contender.is-own .ranking-label{background:var(--theme-action)!important;color:var(--theme-action-ink)!important}
  `;if(!document.getElementById('ranking-palette-style')){style.id='ranking-palette-style';document.head.append(style);}
  const nav=document.createElement('nav');nav.className='ranking-palette-test';nav.setAttribute('aria-label','Farbvergleich der Ranking-Sektion');
  const options=[['current','Aktuell'],['cool','Kühler hell · rekonstruiert'],['dark','Früher dunkel']];
  const apply=value=>{section.dataset.palette=value;for(const button of nav.children)button.setAttribute('aria-pressed',String(button.dataset.palette===value));const url=new URL(location.href);url.searchParams.set('rankingpalette',value);history.replaceState(null,'',url);};
  for(const [value,label] of options){const button=document.createElement('button');button.type='button';button.textContent=label;button.dataset.palette=value;button.addEventListener('click',()=>apply(value));nav.append(button);}
  section.prepend(nav);const value=new URLSearchParams(location.search).get('rankingpalette');apply(options.some(o=>o[0]===value)?value:'current');return true;
 };
 mount();const observer=new MutationObserver(mount);observer.observe(document.body,{childList:true,subtree:true});
})();
