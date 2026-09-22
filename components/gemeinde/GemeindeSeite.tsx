import { HERO_SZENE_INNER_HTML } from "./hero-szene";
import SharedSiteHeader from "../SharedSiteHeader";
import { anlagenZahlTeile, fmtPvLeistung } from "../../lib/atlas-format";
import { formatStoryDate } from "../../lib/story-format";
import { DATA_SOURCES } from "../../lib/data-sources";
import type { GemeindePaket } from "../../lib/gemeinde-paket";
import GemeindeSzene from "./GemeindeSzene";
import GemeindeSkripte from "./GemeindeSkripte";
import { ranglistenDaten } from "./rangliste-daten";

/**
 * The new municipality page (approved design, 09/2026), server-rendered.
 *
 * Markup and class names follow the approved prototype's FINAL rendered DOM
 * (after its scripts ran), so the design's stylesheets apply unchanged. Every
 * text and number comes from the town's package — nothing Höchberg-shaped is
 * left — and stands in the HTML, not only after a script ran (SEO lesson of
 * the homepage release, 20.09.2026).
 */

export type Ortsangaben = {
  name: string;
  ags: string;
  plz: string | null;
  lat: number | null;
  lon: number | null;
  /** Breadcrumb parents, outermost first. */
  pfad: { name: string; href: string }[];
  liveUrl: string;
  landName: string;
  /** Prefix of district town pages, for the ranking's links. */
  kreisBase: string;
};

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://solar-check.io";

const pfeil = (
  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="m9 6 6 6-6 6" />
  </svg>
);

/** Numbers of the intro, exactly as the prototype derived them. */
export function bestandsZahlen(p: GemeindePaket) {
  const coverage = p.register?.coverage ?? [];
  const solarCount = coverage
    .filter((r) => ["gebaeude", "steckersolar", "freiflaeche", "sonstige"].includes(r.topic))
    .reduce((n, r) => n + r.count, 0);
  const mix = (p.charts?.charts.find((c) => c.template === "anteilsdonut")?.story?.values ?? []) as { value: number }[];
  const solarKwp = mix.reduce((n, r) => n + r.value, 0);
  const batteryCount = p.register?.storage.find((r) => r.unit === "Einheiten")?.value ?? null;
  return { solarCount, solarKwp: mix.length ? solarKwp : null, batteryCount };
}

export default function GemeindeSeite({ paket, ort }: { paket: GemeindePaket; ort: Ortsangaben }) {
  const z = bestandsZahlen(paket);
  const stand = formatStoryDate(paket.registerStand);
  const quellen = DATA_SOURCES;
  const rangliste = ranglistenDaten(paket, {
    name: ort.name,
    ags: ort.ags,
    landName: ort.landName,
    kreisBase: ort.kreisBase,
    liveUrlAbsolut: `${BASE_URL}${ort.liveUrl}`,
    widgetUrl: `${BASE_URL}/energie-widgets?ags=${ort.ags}&name=${encodeURIComponent(ort.name)}#gemeinde-solar`,
  });

  return (
    <div id="root">
      <div
        className="solar-page"
        data-hero-system=""
        data-mode="day"
        data-weather="sun"
        data-moving="true"
        data-place-name={ort.name}
        data-place-plz={ort.plz ?? undefined}
        data-place-lat={ort.lat ?? undefined}
        data-place-lon={ort.lon ?? undefined}
      >
        <section className="hero" aria-labelledby="hero-title">
          <div className="scene" aria-hidden="true" dangerouslySetInnerHTML={{ __html: HERO_SZENE_INNER_HTML }} />
          <SharedSiteHeader />
          <div className="hero-copy">
            <h1 id="hero-title" data-sc-contrast="">
              {ort.name}.<br />
              <span>Energie von hier.</span>
            </h1>
            <p className="hero-description" data-sc-contrast="">
              Entdecke die Energiewende in {ort.name}: Insights erklären die Entwicklung, das Ranking zeigt den
              Ortsvergleich und der Energiemonitor macht die Zahlen sichtbar.
            </p>
            <a className="v3-scroll-indicator is-visible" href="#atlas-stories" aria-label="Insights entdecken" data-sc-contrast="">
              <span>Entdecken</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <path d="M12 4v16m-6-6 6 6 6-6" />
              </svg>
            </a>
          </div>
          <div className="atlas-hero-local-nav" data-sc-contrast="">
            <nav aria-label="Brotkrümel" className="atlas-breadcrumb">
              {ort.pfad.map((p) => (
                <span key={p.href} style={{ display: "contents" }}>
                  <a href={p.href}>{p.name}</a>
                  {pfeil}
                </span>
              ))}
              <span aria-current="page">{ort.name}</span>
            </nav>
          </div>
        </section>

        <main className="atlas-content">
          <nav className="v3-section-nav" aria-label="Auf dieser Seite">
            <a href="#atlas-stories">Insights</a>
            <a href="#atlas-ranking">Ranking</a>
            <a href="#atlas-data">Energiemonitor</a>
            <div className="atlas-page-actions">
              <button type="button" data-page-copy aria-label="Link zur Seite kopieren" title="Link kopieren" />
              <button type="button" data-page-share aria-label="Seite teilen" title="Seite teilen" />
              <span className="atlas-page-status" role="status" />
            </div>
          </nav>

          <section className="v3-intro atlas-wrap">
            <div className="v3-intro-grid">
              <div>
                <p className="atlas-kicker">Stand {stand}</p>
                <h2>
                  So steht es um Solar
                  <br />
                  in {ort.name}.
                </h2>
              </div>
              <div>
                <p>
                  {anlagenZahlTeile(z.solarCount).value} {z.solarCount === 1 ? "Solaranlage" : "Solaranlagen"}
                  {z.solarKwp != null && <> mit {fmtPvLeistung(z.solarKwp)} Leistung</>}{" "}
                  {z.solarCount === 1 ? "ist" : "sind"} hier in Betrieb.
                  {z.batteryCount != null && z.batteryCount > 0 && (
                    <> Dazu {z.batteryCount === 1 ? "kommt 1 Batteriespeicher" : `kommen ${z.batteryCount.toLocaleString("de-DE")} Batteriespeicher`}.</>
                  )}{" "}
                  Entdecken Sie den Anlagenbestand und die Entwicklung im Ort.
                </p>
              </div>
            </div>
          </section>

          {/* Built by public/gemeinde/rangliste.js (the approved interactive
              ranking). Its content for crawlers and screen readers is the list
              right after it, rendered here on the server. */}
          <section id="atlas-ranking" className="atlas-section atlas-ranking" />
          {paket.rankings.length > 0 && (
            <details className="atlas-wrap gemeinde-rangliste-text">
              <summary>Alle Platzierungen von {ort.name} als Liste</summary>
              <ul>
                {paket.rankings.map((r) => (
                  <li key={r.key}>
                    {r.label} · {r.scope}: Platz {r.rank.toLocaleString("de-DE")} von {r.size.toLocaleString("de-DE")}
                  </li>
                ))}
              </ul>
              <p>Ranglistenstand: {formatStoryDate(paket.rangStand)}.</p>
            </details>
          )}

          <section id="atlas-sources" className="atlas-wrap atlas-sources" aria-labelledby="atlas-sources-title">
            <h2 id="atlas-sources-title">Daten &amp; Quellen</h2>
            <p>
              <strong>Anlagen, Leistung, Speicher und Zubau:</strong>{" "}
              <a href={quellen.mastr.url} target="_blank" rel="noopener">{quellen.mastr.name}</a>.{" "}
              <strong>Einwohner und Ortsvergleiche:</strong>{" "}
              <a href={quellen.destatis.url} target="_blank" rel="noopener">{quellen.destatis.name}</a>. Datenlizenz:{" "}
              <a href={quellen.mastr.licenseUrl} target="_blank" rel="noopener">{quellen.mastr.license}</a>. Für diese Seite
              durch Solar Check zusammengefasst, berechnet und grafisch aufbereitet.
            </p>
            <p>
              <strong>Wetter heute und modellierte Solarleistung:</strong> {quellen.iconD2Archive.name} ·{" "}
              <a href={quellen.iconD2Archive.licenseUrl} target="_blank" rel="noopener">{quellen.iconD2Archive.license}</a>.{" "}
              <strong>Historische Tages- und Jahresverläufe:</strong> {quellen.era5Archive.name} ·{" "}
              <a href={quellen.era5Archive.licenseUrl} target="_blank" rel="noopener">{quellen.era5Archive.license}</a>. Eigene
              Modellrechnung; keine gemessene Stromerzeugung.
            </p>
            <p>
              <strong>Kartengeometrien:</strong> {quellen.bkg.name},{" "}
              <a href={quellen.bkg.licenseUrl} target="_blank" rel="noopener">{quellen.bkg.license}</a>, vereinfacht.
            </p>
            <p>
              Der Datenstand steht jeweils bei den Zahlen. Die Rangliste basiert auf dem Atlas-Registerstand vom{" "}
              {formatStoryDate(paket.rangStand)}, die Bestandsdiagramme auf dem Export vom {stand}.
              {paket.einwohnerStand && <> Einwohnerstand: {formatStoryDate(paket.einwohnerStand)}.</>}{" "}
              <a href="/datenstand">Mehr zu Datenstand und Quellen</a> · <a href="/methodik">So rechnen wir</a>
            </p>
          </section>
        </main>
      </div>
      <GemeindeSzene plz={ort.plz} />
      <GemeindeSkripte daten={rangliste} />
    </div>
  );
}
