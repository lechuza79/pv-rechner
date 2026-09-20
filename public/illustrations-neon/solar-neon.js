/* Reversible adapter for the existing Solar Check illustration component. */
(() => {
 if(window.SolarCheckNeon)return;
 const base=new URL('.',document.currentScript.src), ids=new Set(['house','balcony-modern','heatpump-modern','funding-check','offer-check']);
 const cache=new Map(),pending=new Map();let enabled=new URLSearchParams(location.search).get('neon')!=='0',installed=false;
 const api=window.SolarCheckNeon={
  register(id,svg){cache.set(id,svg);pending.get(id)?.resolve(svg)},
  async setEnabled(value){enabled=Boolean(value);await ready;await Promise.all([...document.querySelectorAll('solar-illustration')].filter(e=>ids.has(e.getAttribute('motif'))).map(e=>e.render()));return enabled},
  get enabled(){return enabled}, get installed(){return installed}
 };
 function load(id){if(cache.has(id))return Promise.resolve(cache.get(id));if(pending.has(id))return pending.get(id).promise;let resolve,reject;let promise=new Promise((a,b)=>{resolve=a;reject=b});pending.set(id,{promise,resolve,reject});let s=document.createElement('script');s.src=new URL('motifs/'+id+'.js',base).href;s.onload=()=>{s.remove();if(!cache.has(id)){pending.delete(id);reject(Error('Missing neon motif: '+id))}};s.onerror=()=>{s.remove();pending.delete(id);reject(Error('Neon motif unavailable: '+id))};document.head.append(s);return promise}
 const ready=new Promise((resolve,reject)=>{let attempts=0;function install(){const current=window.SolarCheckIllustrations;if(!current){if(attempts++>200){reject(Error('Load solar-illustrations.js before solar-neon.js'));return}setTimeout(install,50);return}const originalLoad=current.load.bind(current);current.load=id=>enabled&&ids.has(id)?load(id):originalLoad(id);installed=true;resolve();document.dispatchEvent(new CustomEvent('solar-neon-ready'));if(enabled)document.querySelectorAll('solar-illustration:not([loading=lazy])').forEach(e=>e.render?.())}install()});
})();
