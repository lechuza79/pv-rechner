import { HERO_SZENE_INNER_HTML } from "./hero-szene";
import SharedSiteHeader from "../SharedSiteHeader";
import { anlagenZahlTeile, fmtPvLeistung } from "../../lib/atlas-format";
import { formatStoryDate } from "../../lib/story-format";
import { IMPORT_TAGE, naechsterImport } from "../../lib/mastr-import-plan";
import { DATA_SOURCES } from "../../lib/data-sources";
import { jsonLdHtml, breadcrumbJsonLd, atlasDatasetJsonLd } from "../../lib/json-ld";
import type { GemeindePaket } from "../../lib/gemeinde-paket";
import GemeindeSzene from "./GemeindeSzene";
import GemeindeSkripte from "./GemeindeSkripte";
import GemeindeRahmen from "./GemeindeRahmen";
import { ranglistenDaten, kopfPlatzierung } from "./rangliste-daten";
import GemeindeKopfKacheln, { type KopfRang } from "./GemeindeKopfKacheln";
import GemeindeBeispiele from "./GemeindeBeispiele";
import GemeindeAboKnopf from "./GemeindeAboKnopf";
import GemeindeAboDialog from "./GemeindeAboDialog";
import SiteFuss from "../SiteFuss";
import PersonBox from "../PersonBox";
import GemeindeFoerderung from "./GemeindeFoerderung";
import { getFundingPrograms } from "../../lib/funding-data";
import { fundingStandLabel, fundingZaehlt, matchFundingForAgs, technikenVon } from "../../lib/funding-programs";

/**
 * The new municipality page (approved design, 09/2026), server-rendered.
 *
 * Markup and class names follow the approved prototype's FINAL rendered DOM
 * (after its scripts ran), so the design's stylesheets apply unchanged. Every
 * text and number comes from the town's package — nothing Höchberg-shaped is
 * left — and stands in the HTML, not only after a script ran (SEO lesson of
 * the homepage release, 20.09.2026).
 */

/** Long German date, as the approved design writes the sources' dates. */
const datumLang = (iso: string) =>
  new Intl.DateTimeFormat("de-DE", { dateStyle: "long", timeZone: "UTC" }).format(new Date(iso));

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

// The approved design's breadcrumb arrow (live-icons.js, ArrowLongRight).
const pfeil = (
  <svg className="sc-live-icon" aria-hidden="true" focusable="false" height="16" viewBox="0 0 28 14" fill="none">
    <path d="M1 7h25m0 0-5-5m5 5-5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
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

/**
 * The hero's rank tile, as the approved design builds it (variant3.js).
 *
 * Die ENTSCHEIDUNG, welche Platzierung das ist, steht in kopfPlatzierung()
 * (rangliste-daten.ts) — dieselbe Quelle, aus der der Ranking-Abschnitt seine
 * Startkategorie nimmt. Vorher entschied jede Seite für sich: Der Kopf zeigte
 * bei Höchberg „Platz 2 · Anzahl der Solaranlagen", der Abschnitt darunter
 * eröffnete mit „Batteriespeicher" — zwei Platzierungen desselben Orts auf
 * einer Seite, ohne dass man sähe, welche gilt.
 */
export function kopfRang(p: GemeindePaket): KopfRang | null {
  const wahl = kopfPlatzierung(p);
  if (!wahl) return null;
  if (wahl.art === "anzahl") {
    const bild =
      wahl.platz === 2
        ? "/atlas-design-preview/rank-badges/roof-2-no-banner.svg"
        : `/gemeinde/rank-badges/roof-${wahl.platz}.png`;
    return { titel: `Platz ${wahl.platz}`, text: "Anzahl der Solaranlagen", bild };
  }
  const r = p.rankings[wahl.index];
  const d = r.distinction as string;
  const platz = /^Platz ([123])$/.exec(d)?.[1];
  const top = /^Top (10|25|50|100)$/.exec(d)?.[1];
  const bild = platz ? `/atlas-design-preview/rank-badges/rank-${platz}.svg` : top ? `/atlas-design-preview/rank-badges/top-${top}.svg` : null;
  return { titel: d, text: r.label.charAt(0).toUpperCase() + r.label.slice(1), bild };
}

export default async function GemeindeSeite({ paket, ort }: { paket: GemeindePaket; ort: Ortsangaben }) {
  // Förderung dieses Orts: alles, was hier gilt — Gemeinde, Landkreis, Land,
  // jede Technik. Die Bundesprogramme bleiben draußen, sie gelten überall und
  // sagen über den Ort nichts; sie stehen als Satz mit Weg zur Übersicht.
  // Vorher stand hier ein Link auf die Landesseite, der bei Quitzdorf einen
  // beendeten Balkon-Zuschuss als „Landesförderung" anbot.
  const foerderProgramme = matchFundingForAgs(await getFundingPrograms(), ort.ags)
    .filter((p) => p.level !== "bund")
    .map((programm) => ({ programm, standLabel: fundingStandLabel(programm), zaehlt: fundingZaehlt(programm) }));
  // Für welche Techniken hier wirklich Geld zu holen ist — nur Programme, die
  // heute zählen. Ein beendeter Zuschuss darf an keiner Beispielrechnung als
  // „Förderung verfügbar" stehen.
  const foerderTechniken = [
    ...new Set(foerderProgramme.filter((p) => p.zaehlt).flatMap((p) => technikenVon(p.programm))),
  ];
  const z = bestandsZahlen(paket);
  const stand = formatStoryDate(paket.registerStand);
  // Der nächste geplante Lauf des Anlagenregisters, gerechnet vom jüngeren aus
  // Datenstand und heute (siehe Kommentar an der Zeile in der Aktionsleiste).
  const naechstesUpdate = naechsterImport(
    IMPORT_TAGE,
    new Date(Math.max(Date.parse(paket.registerStand), Date.now())),
  );
  // The monitor's figures end with the last complete month.
  const letzterMonat = (paket.monitorHistory as { observations?: { end: string }[] } | undefined)?.observations?.[0]?.end;
  const kennzahlenBis = letzterMonat
    ? new Date(letzterMonat + "T12:00:00").toLocaleDateString("de-DE", { month: "long", year: "numeric", timeZone: "Europe/Berlin" })
    : null;
  const quellen = DATA_SOURCES;
  const rangliste = ranglistenDaten(paket, {
    name: ort.name,
    ags: ort.ags,
    landName: ort.landName,
    kreisBase: ort.kreisBase,
    liveUrlAbsolut: `${BASE_URL}${ort.liveUrl}`,
    widgetUrl: `${BASE_URL}/energie-widgets?ags=${ort.ags}&name=${encodeURIComponent(ort.name)}#gemeinde-solar`,
  });

  // Structured data as on the old page: breadcrumb and the town's dataset.
  const breadcrumbLd = breadcrumbJsonLd([...ort.pfad.map((p) => ({ name: p.name, path: p.href })), { name: ort.name }], BASE_URL);
  const batterieKwh = paket.register?.storage.find((r) => r.unit === "kWh")?.value ?? null;
  const datasetLd = atlasDatasetJsonLd({
    name: `Solaranlagen-Bestand ${ort.name}`,
    description: `Anlagenzahl, installierte Leistung und Zubau der Photovoltaik in ${ort.name} aus dem Marktstammdatenregister.`,
    url: `${BASE_URL}${ort.liveUrl}`,
    dateModified: paket.registerStand,
    placeName: ort.name,
    // The nearest real place above the town; for Berlin and Hamburg that is Germany.
    containedInPlace: ort.pfad.length > 1 ? ort.pfad.at(-1)?.name : "Deutschland",
    variables: [
      { name: "Solaranlagen in Betrieb", value: z.solarCount },
      ...(z.solarKwp != null ? [{ name: "Installierte Leistung", value: Math.round(z.solarKwp), unitText: "kWp" }] : []),
      ...(batterieKwh != null ? [{ name: "Batteriespeicher-Kapazität", value: Math.round(batterieKwh), unitText: "kWh" }] : []),
    ],
    baseUrl: BASE_URL,
  });

  return (
    <div id="root">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(datasetLd) }} />
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
          <SharedSiteHeader aktiv="atlas" />
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
          <GemeindeKopfKacheln ags={ort.ags} name={ort.name} rang={kopfRang(paket)} />
          <GemeindeSzene plz={ort.plz} />
        </section>

        <main className="atlas-content">
          {/* Auf dem Schreibtisch eine Reihe, auf schmalen Bildschirmen EIN
              Punkt mit Aufklappliste (Betreiber, 23.09.2026): Vier Marken
              neben Abo-Knopf und zwei Symbolen brachen dort in eine zweite
              Zeile, und die Leiste klebt oben — zwei Zeilen kosten ein
              Zehntel der Bildhöhe auf jeder Seite. Der Kopf zeigt immer den
              Abschnitt, in dem man gerade liest.

              Als aufklappbarer Block, nicht als eigenes Menü: Er ist ohne
              JavaScript bedienbar, und auf dem Schreibtisch löst „display:
              contents" ihn wieder auf, sodass dort genau die Reihe des
              Entwurfs steht. */}
          <nav className="v3-section-nav" aria-label="Auf dieser Seite">
            {/* OFFEN ausgeliefert: Ein zugeklappter Block versteckt seinen
                Inhalt auch dann, wenn seine Box per „display: contents"
                aufgelöst ist — gemessen, die vier Marken standen dann
                untereinander statt in der Reihe. Breit bleibt er offen und
                löst sich auf, schmal klappt ankernav.js ihn zu. Ohne
                JavaScript steht die Liste da, statt zu fehlen. */}
            <details className="v3-nav-menu" open>
              <summary aria-label="Abschnitt wählen">
                <span className="v3-nav-aktiv">Insights</span>
              </summary>
              <div className="v3-nav-links">
                <a href="#atlas-stories">Insights</a>
                <a href="#atlas-ranking">Ranking</a>
                <a href="#atlas-data">Energiemonitor</a>
                <a href="#atlas-foerderung">Förderung</a>
              </div>
            </details>
            <div className="atlas-page-actions">
              {/* Wann die Seite das NÄCHSTE Mal neue Zahlen bekommt — direkt
                  am Abo-Knopf, weil er genau das anbietet: Bescheid bekommen,
                  wenn hier wieder etwas steht (Betreiber, 23.09.2026; zuerst
                  stand hier das letzte Update, das beantwortet die Frage
                  daneben nicht). Termin ist der nächste geplante Lauf des
                  Anlagenregisters — aus derselben Liste, gegen die die
                  Aufsicht einen ausgefallenen Lauf meldet. Gerechnet vom
                  jüngeren der beiden Zeitpunkte: Bleibt ein Lauf aus, wandert
                  der Termin mit, statt einen vergangenen Tag zu versprechen.
                  Sobald die Datengeschichten in eigenem Takt nachwachsen,
                  tritt deren Termin an diese Stelle. */}
              <span className="atlas-page-update">
                Nächstes Update <time dateTime={naechstesUpdate}>{formatStoryDate(naechstesUpdate)}</time>
              </span>
              <GemeindeAboKnopf name={ort.name} />
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

          <section className="atlas-section" id="atlas-stories">
            <div className="atlas-wrap atlas-insights-head">
              <h2>Insights aus {ort.name}</h2>
            </div>
            {paket.stories.length > 0 && (
              <>
                <GemeindeRahmen
                  src={`/embed/gemeinde/${ort.ags}/insights`}
                  durchreichen={["story"]}
                  title={`Geschichten aus ${ort.name}`}
                  nachricht="story-preview-layout"
                  startHoehe={560}
                  vollbild
                />
                {/* The stories' words, in the page for crawlers and screen
                    readers; the frame above is the interactive reader. */}
                <div className="gemeinde-nur-text">
                  <h3>Alle Geschichten aus {ort.name}</h3>
                  {(paket.stories as { id: string; title?: string; teaser?: string }[]).map((st) => (
                    <article key={st.id}>
                      <h3>{st.title}</h3>
                      {st.teaser && <p>{st.teaser}</p>}
                    </article>
                  ))}
                </div>
              </>
            )}
          </section>

          {/* Built by public/gemeinde/rangliste.js (the approved interactive
              ranking). Its content for crawlers and screen readers is the list
              right after it, rendered here on the server. */}
          <section id="atlas-ranking" className="atlas-section atlas-ranking" />
          {paket.rankings.length > 0 && (
            <div className="gemeinde-nur-text">
              <h3>Alle Platzierungen von {ort.name}</h3>
              <ul>
                {paket.rankings.map((r) => (
                  <li key={r.key}>
                    {r.label} · {r.scope}: Platz {r.rank.toLocaleString("de-DE")} von {r.size.toLocaleString("de-DE")}
                  </li>
                ))}
              </ul>
              <p>Ranglistenstand: {formatStoryDate(paket.rangStand)}.</p>
            </div>
          )}

          <GemeindeBeispiele
            name={ort.name}
            plz={ort.plz}
            lat={ort.lat}
            lon={ort.lon}
            foerderung={<GemeindeFoerderung ort={ort.name} programme={foerderProgramme} uebersichtHref="/photovoltaik-foerderung" />}
            foerderTechniken={foerderTechniken}
          />

          <section className="atlas-section atlas-overview" id="atlas-data">
            <div className="atlas-wrap">
              <div className="atlas-summary">
                <div>
                  <p className="atlas-kicker">Energiemonitor</p>
                  <h2>Energiemonitor {ort.name}</h2>
                  <p className="monitor-update">
                    Letztes Update: {formatStoryDate(paket.registerStand)}
                    {kennzahlenBis && <> · Kennzahlen bis Ende {kennzahlenBis}</>}
                  </p>
                  <p>
                    Wie wächst die erneuerbare Energie vor Ort? Wie viel Strom lässt sich erzeugen und speichern? Der Energiemonitor macht die
                    Entwicklung in {ort.name} sichtbar – mit den verfügbaren Daten zu Anlagen, Leistung und Ausbau.
                  </p>
                </div>
              </div>
            </div>
            <div className="atlas-wrap v3-data">
              <div className="v3-permanent-charts">
                <GemeindeRahmen
                  src={`/embed/gemeinde/${ort.ags}/monitor`}
                  title={`Energiedaten für ${ort.name}`}
                  nachricht="municipal-data-layout"
                  startHoehe={1400}
                />
              </div>
            </div>
          </section>

          <section className="atlas-wrap atlas-end" id="atlas-publish">
            <div>
              <p className="atlas-kicker">Für Gemeinde, Presse und Vereine</p>
              <h2>
                {rangliste.genitiv} Entwicklung.
                <br />
                Ein Link für Ihre Website.
              </h2>
              <p>
                Verweisen Sie auf die laufende Ortsübersicht oder übernehmen Sie eine kurze Meldung mit Quellenlink. Ohne Anmeldung, frei
                verwendbar und gern gekürzt.
              </p>
            </div>
            <div>
              <button className="atlas-button" data-ranking-share="">
                Meldung mit Ortslink übernehmen{" "}
                <svg className="sc-live-icon" aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="12" height="12" rx="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              </button>
            </div>
          </section>

          {/* Dieselbe Box wie auf der Startseite — ein Baustein, nicht eine
              zweite Fassung (Betreiber, 23.09.2026). Der Text ist hier ein
              anderer: Auf der Startseite ordnet er das Angebot ein, hier lädt
              er zu dem ein, wozu auf einer Ortsseite jemand etwas zu sagen
              hat. */}
          <PersonBox
            text={
              <>
                Diese Seite rechnet mit den amtlichen Zahlen für {ort.name} — <strong>fehlt etwas oder sieht eine Zahl falsch aus?</strong>{" "}
                Schreiben Sie mir, ich lese jede Nachricht selbst.
              </>
            }
          />

        </main>
      </div>
      <SiteFuss zwischen={
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
            <strong>Standortertrag der Beispielrechnungen:</strong>{" "}
            <a href={quellen.pvgis.url} target="_blank" rel="noopener">{quellen.pvgis.name}</a>.
          </p>
          <p>
            <strong>Kartengeometrien:</strong> {quellen.bkg.name},{" "}
            <a href={quellen.bkg.licenseUrl} target="_blank" rel="noopener">{quellen.bkg.license}</a>, vereinfacht.
          </p>
          <p>
            Der Datenstand steht jeweils bei den Zahlen. Die Rangliste basiert auf dem Atlas-Registerstand vom{" "}
            {datumLang(paket.rangStand)}, die Bestandsdiagramme auf dem Export vom {datumLang(paket.registerStand)}.
            {paket.einwohnerStand && <> Einwohnerstand: {datumLang(paket.einwohnerStand)}.</>}{" "}
            <a href="/datenstand">Mehr zu Datenstand und Quellen</a> · <a href="/methodik">So rechnen wir</a>
          </p>
        </section>
      } />
      {/* The sign-up dialog in the approved design; the section bar's
          subscribe button opens it. */}
      <GemeindeAboDialog name={ort.name} ags={ort.ags} />
      {/* The approved design's neon illustrations (the adapter swaps the
          citizen examples' motifs) and its rank confetti, unchanged. */}
      <script src="/illustrations-motion/solar-illustrations.js" defer />
      <script src="/illustrations-neon/solar-neon.js" defer />
      <script src="/gemeinde/konfetti.js" defer />
      {/* The header is complete in the server HTML; the confetti waits for
          this mark, which the prototype's nav script set after mounting.
          The same line hands the header to the scene's contrast sampler: it
          measures the painted sky behind an element and sets the ink colour,
          which is why the title over a bright noon sky stays readable. The
          approved design marks brand, menu, login and toggle for it; our
          header is React, so the mark is set here instead of in the
          prototype's mount script. Marking is all it takes — the sampler is
          already running (it colours the hero title). */}
      <script
        dangerouslySetInnerHTML={{
          __html:
            'const k=document.querySelector(".site-header");' +
            'if(k){k.setAttribute("data-nav-ready","true");' +
            'const m=()=>k.querySelectorAll(".brand,.sc-nav-toggle,.sc-nav-login,.sc-global-nav").forEach(e=>e.setAttribute("data-sc-contrast",""));' +
            'm();new MutationObserver(m).observe(k,{childList:true,subtree:true});}',
        }}
      />
      <GemeindeSkripte daten={rangliste} />
    </div>
  );
}
