/**
 * Starts the shared hero scene (public/hero-system) on the server-rendered
 * markup and gives it this town's weather — as plain scripts IN THE HTML, so
 * the scene starts while the page is still loading, like on the homepage.
 * (Started from a React effect it waited for the whole page to hydrate.)
 *
 * `window.atlasWeather.load()` is the scene's weather: the same snapshot-
 * backed source the homepage scene uses (/scene-data: DWD ICON-D2), never the
 * free forecast API the prototype called. `tag()` is the energy monitor's day
 * curve — a separate call the scene never waits for. Each is fetched once and
 * shared by everything that asks within five minutes.
 */
function wetterSkript(plz: string | null): string {
  const p = JSON.stringify(plz);
  return `(function(){var plz=${p};function quelle(url){var pending=null,started=0;return function(){if(!plz)return Promise.reject(new Error("Kein Standort"));if(!pending||Date.now()-started>300000){started=Date.now();pending=fetch(url+plz,{signal:AbortSignal.timeout(15000)}).then(function(r){return r.ok?r.json():Promise.reject(new Error("Wetter nicht verfügbar"))}).catch(function(e){pending=null;throw e});}return pending;}}var load=quelle("/scene-data?plz="),tag=quelle("/api/gemeinde/solartag?plz=");window.atlasWeather={load:load,tag:tag,refresh:function(){return load()}};if(plz){load().catch(function(){});}})();`;
}

export default function GemeindeSzene({ plz }: { plz: string | null }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: wetterSkript(plz) }} />
      <script type="module" src="/hero-system/dist/municipality.js" async />
    </>
  );
}
