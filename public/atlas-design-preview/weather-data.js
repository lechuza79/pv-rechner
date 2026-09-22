// One immediate request shared by the scene and both hero readings.
window.atlasWeather = (() => {
 let pending, started=0;
 return { load() {
  if (Date.now()-started>300000) pending=null;
  if (!pending) { started=Date.now(); pending = fetch('/api/atlas/solar-day?plz=97204', {signal:AbortSignal.timeout(15000)}).then(response => {
   if (!response.ok) throw new Error('Weather unavailable');
   return response.json();
  }).catch(error => { pending = null; throw error; }); }
  return pending;
 }, refresh() { pending=null; return this.load(); } };
})();
window.atlasWeather.load().catch(()=>{});
