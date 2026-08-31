import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumb from "../../../../../components/Breadcrumb";
import GlossaryTerm from "../../../../../components/GlossaryTerm";
import { IconArrowRight, IconExternal } from "../../../../../components/Icons";
import RelatedLinks from "../../../../../components/RelatedLinks";
import { v, iconSizes, space, pad, sectionGap } from "../../../../../lib/theme";
import { pageMetadata } from "../../../../../lib/seo";
import { jsonLdHtml } from "../../../../../lib/json-ld";
import { atlasRobots } from "../../../../../lib/atlas-index";
import { cityBySlug, slugify, isCityPublished, publishedCities, fundingForFrom, cityIndexFreigegeben } from "../../../../../lib/atlas-cities";
import { fundingStandLabel, fundingZaehlt, type FundingProgram } from "../../../../../lib/funding-programs";
import { getFundingPrograms } from "../../../../../lib/funding-data";
import { getFundingHistoryFor } from "../../../../../lib/funding-history";
import FundingHistory from "../../../../../components/FundingHistory";
import { FundingStatusBadge, ExampleCards, FUNDING_STATUS_LABEL, FUNDING_STATUS_NOTE } from "../../../../../components/FundingProgramParts";
import FundingTechnikTabs from "../../../../../components/FundingTechnikTabs";
import StickyCta from "../../../../../components/StickyCta";
import GemeindeAboBox from "../../../../../components/atlas/GemeindeAboBox";
import PvRechnerModal, { PV_RECHNER_HASH } from "../../../../../components/PvRechnerModal";
import FoerderCheckStarter, { FOERDER_CHECK_OEFFNEN } from "../../../../../components/FoerderCheckStarter";
import { buildFundingExamples } from "../../../../../lib/funding-examples";
import { buildFundingFaq } from "../../../../../lib/funding-faq";
import { getRegionAtlasData, type RegionAtlas } from "../../../../../lib/mastr-data";
import { atlasPathForRegionId } from "../../../../../lib/atlas";
import { DATA_SOURCES } from "../../../../../lib/data-sources";

// ISR: read live funding data from Supabase, re-render at most hourly.
export const revalidate = 3600;
// Published = regions with an active OR archived (exhausted/paused/discontinued)
// program. Regions that never had a program — or whose status is "unsicher" —
// still 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return publishedCities().map((c) => ({ bundesland: slugify(c.bundesland), stadt: c.slug }));
}

export async function generateMetadata(props: { params: Promise<{ bundesland: string; stadt: string }> }): Promise<Metadata> {
  const params = await props.params;
  const city = cityBySlug(params.stadt);
  if (!city || slugify(city.bundesland) !== params.bundesland) return {};
  // Auch der Seitentitel muss über die abgeleitete Zuordnung gehen — sonst
  // verspricht die Überschrift „Zuschüsse", während die Seite darunter ein
  // eingestelltes Programm zeigt.
  const f = fundingForFrom(await getFundingPrograms(), city);
  const active = f?.status === "aktiv";
  const year = new Date().getFullYear();
  return {
    ...pageMetadata({
      path: `/photovoltaik-foerderung/${slugify(city.bundesland)}/${city.slug}`,
      title: active || !f
        ? `Photovoltaik-Förderung ${city.name} ${year} – Zuschüsse & Bestand`
        : `Photovoltaik-Förderung ${city.name} ${year} – aktueller Status & Bestand`,
      description: active
        ? `Wie viele Solaranlagen gibt es in ${city.name}? Aktueller Anlagenbestand aus dem Marktstammdatenregister, das ${f!.name} und Beispielrechnungen für deine PV-Anlage.`
        : f
        ? `Lohnt sich Photovoltaik in ${city.name}? Anlagenbestand aus dem Marktstammdatenregister, der Status des ${f.name} (derzeit ${FUNDING_STATUS_LABEL[f.status]}) und ehrliche Beispielrechnungen für deine PV-Anlage.`
        : `Wie viele Solaranlagen gibt es in ${city.name}? Aktueller Anlagenbestand aus dem Marktstammdatenregister und Beispielrechnungen für deine PV-Anlage.`,
      ogImageTitle: `Photovoltaik in ${city.name}`,
      ogImageSubtitle: f ? `Bestand & ${f.name}` : "Anlagenbestand & Beispielrechnungen",
    }),
    // Gebaut, aber noch nicht freigegeben → noindex. Dieselbe eine Frage wie in
    // der Sitemap (cityIndexFreigegeben), damit robots-Angabe und Sitemap nicht
    // Gegenteiliges behaupten können.
    robots: atlasRobots(cityIndexFreigegeben(city)),
  };
}

const nf = (n: number) => Math.round(n).toLocaleString("de-DE");

// Capacity: show kWp below 1 MWp (so small segments don't collapse to "0 MWp"),
// MWp with one decimal up to 10, no decimals above.
function fmtCapacity(kwp: number): string {
  if (kwp < 1000) return `${nf(kwp)} kWp`;
  const mwp = kwp / 1000;
  return `${mwp.toLocaleString("de-DE", { maximumFractionDigits: mwp < 10 ? 1 : 0 })} MWp`;
}

const S = {
  // Basis-Schriftgröße für die ganze Seite aus dem Token: Alles darunter erbt
  // sie, statt dass jede Stelle ihre eigene Größe mitbringt.
  page: { background: v("--color-bg"), fontFamily: v("--font-text"), fontSize: "var(--font-size-body)", color: v("--color-text-primary"), minHeight: "100vh", padding: "0 20px 20px" } as React.CSSProperties,
  wrap: { maxWidth: 720, margin: "0 auto" } as React.CSSProperties,
  breadcrumb: { fontSize: "var(--font-size-caption)", color: v("--color-text-secondary"), marginBottom: 6 } as React.CSSProperties,
  h1: { fontSize: "var(--font-size-h1)", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.2, margin: "0 0 8px" } as React.CSSProperties,
  intro: { fontSize: "var(--font-size-body)", lineHeight: 1.6, color: v("--color-text-secondary"), margin: "0 0 22px" } as React.CSSProperties,
  ortszeile: { fontSize: "var(--font-size-small)", color: v("--color-text-muted"), margin: "0 0 14px" } as React.CSSProperties,
  // Stand über der Überschrift — dieselbe Größe und Farbe wie auf der
  // Atlas-Seite zum Ort, damit beide Kopfzeilen als dieselbe Sache lesen.
  stand: {
    fontSize: "var(--font-size-caption)",
    color: v("--color-text-muted"),
    marginBottom: 8,
  } as React.CSSProperties,
  strong: { color: v("--color-text-primary"), fontWeight: 600 } as React.CSSProperties,
  metricsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginBottom: 28 } as React.CSSProperties,
  metric: { background: v("--color-bg-muted"), borderRadius: v("--radius-md"), padding: 14 } as React.CSSProperties,
  metricLabel: { fontSize: "var(--font-size-small)", color: v("--color-text-secondary"), marginBottom: 4 } as React.CSSProperties,
  metricValue: { fontFamily: v("--font-mono"), fontSize: 22, fontWeight: 700 } as React.CSSProperties,
  h2: { fontSize: "var(--font-size-h3)", fontWeight: 700, margin: "0 0 4px" } as React.CSSProperties,
  sub: { fontSize: "var(--font-size-small)", color: v("--color-text-muted"), margin: "0 0 14px" } as React.CSSProperties,
  section: { marginBottom: sectionGap } as React.CSSProperties,
  card: { background: v("--color-bg"), border: `1px solid ${v("--color-border")}`, borderRadius: v("--radius-lg"), padding: pad("lg", "xl") } as React.CSSProperties,
  // Die beiden Wege am Fuß der Förderkarte: selbst nachrechnen (links) oder
  // die eigene Berechtigung klären (rechts).
  /** Bedingungen und Konditionen: je eine eigene Fläche mit Innenabstand.
   *  Als nackte Spalten mit Trennlinie dazwischen klebte der Inhalt links und
   *  rechts an den Kanten. */
  datenBox: {
    background: v("--color-bg"),
    border: `1px solid ${v("--color-border")}`,
    borderRadius: v("--radius-md"),
    padding: pad("lg", "lg"),
  } as React.CSSProperties,
  aktionsBox: {
    background: v("--color-bg"),
    border: `1px solid ${v("--color-border")}`,
    borderRadius: v("--radius-md"),
    padding: pad("lg", "lg"),
    display: "flex",
    flexDirection: "column",
    gap: space.xs,
  } as React.CSSProperties,
  aktionsTitel: { fontSize: "var(--font-size-h3)", fontWeight: 700, color: v("--color-text-primary") } as React.CSSProperties,
  aktionsText: { fontSize: "var(--font-size-body)", lineHeight: 1.5, color: v("--color-text-secondary"), margin: 0, flex: 1 } as React.CSSProperties,
  aktionsLink: { fontSize: "var(--font-size-small)", fontWeight: 600, color: v("--color-accent"), textDecoration: "none", marginTop: space.xs } as React.CSSProperties,
  /** Echte Schaltfläche statt Textlink — das hier ist der Schritt, den die
   *  Seite von jemandem will, und der soll wie einer aussehen. */
  /**
   * Sekundärer Knopf — Rahmen statt Fläche.
   *
   * Wird an zwei Stellen gebraucht, die zusammengehören sollen: der Verweis auf
   * die Amtsseite oben und die Technik-Filter in der Karte. Beide führen NICHT
   * zum Ziel der Seite (durchrechnen), sondern daneben; sie dürfen deshalb nicht
   * so laut sein wie der eine primäre Knopf.
   */
  sekundaerKnopf: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
    padding: pad("sm", "lg"),
    borderRadius: v("--radius-md"),
    border: `1px solid ${v("--color-border")}`,
    background: v("--color-bg"),
    color: v("--color-text-secondary"),
    fontSize: "var(--font-size-small)",
    fontWeight: 700,
    textDecoration: "none",
  } as React.CSSProperties,
  aktionsKnopf: {
    display: "inline-block",
    alignSelf: "flex-start",
    marginTop: space.md,
    padding: pad("sm", "lg"),
    borderRadius: v("--radius-md"),
    fontSize: "var(--font-size-body)",
    fontWeight: 700,
    background: v("--color-accent"),
    color: v("--color-text-on-accent"),
    textDecoration: "none",
  } as React.CSSProperties,
};

export default async function StadtPage(props: { params: Promise<{ bundesland: string; stadt: string }> }) {
  const params = await props.params;
  const city = cityBySlug(params.stadt);
  // Guard the hierarchy: the Bundesland segment must match the city, otherwise
  // a wrong-Bundesland URL would render a valid page under a bogus parent.
  // Also guard the publish policy: only regions with a live or archived program
  // have a page (no-program / "unsicher" slugs 404).
  if (!city || slugify(city.bundesland) !== params.bundesland || !isCityPublished(city)) notFound();

  let atlas: RegionAtlas | null = null;
  try {
    atlas = await getRegionAtlasData(city.ags);
  } catch {
    atlas = null;
  }

  // Adresse der Atlas-Ortsseite — ABGELEITET, nicht getippt (26.08.2026).
  //
  // Sie setzt sich aus den Slugs der Region und ihrer Eltern zusammen, und die
  // stehen im Melderegister: Der Wetteraukreis heißt dort
  // „landkreis-wetteraukreis", nicht „wetteraukreis". Eine von Hand gebaute
  // Adresse trifft das bei jedem zweiten Kreis nicht — geprüft, indem genau
  // dieser Fehler beim ersten Versuch passiert ist und eine 404 erzeugte, die
  // wie eine gesperrte Seite aussah. Der Kommunen-Brief benutzt dieselbe
  // Ableitung; zwei Wege zu derselben Adresse wären zwei Fehlerquellen.
  let atlasPfad: string | null = null;
  try {
    atlasPfad = await atlasPathForRegionId(city.ags);
  } catch {
    atlasPfad = null;
  }

  const programs = await getFundingPrograms();
  const byId = new Map(programs.map((p) => [p.id, p]));
  const f = fundingForFrom(programs, city);
  const examples = buildFundingExamples(city.yieldKwhKwp, f);
  // Förderung im Rechner vorab scharf schalten — nur wenn sie sich pauschal
  // berechnen lässt UND sie überhaupt noch zählt (Anträge offen + Quellenbeleg
  // frisch, siehe fundingZaehlt). Über den rohen Status zu gehen würde einen
  // Knopf anbieten, der eine Förderung vorbelegt, die der Rechner daneben nicht
  // mehr abzieht.
  const ctaFoe = fundingZaehlt(f) && examples[0]?.foerderComputable ? `&foe=${f!.id}` : "";
  const combinable = (f?.combinableWith ?? [])
    .map((id) => byId.get(id))
    .filter((p): p is FundingProgram => Boolean(p));
  // Der mittlere Fall (10 kWp) steht für die übliche Dachanlage am
  // Einfamilienhaus — dieselbe Rechnung wie in den Beispielkarten weiter unten,
  // damit die Kachel oben und die Karten darunter nicht zwei verschiedene
  // Förderbeträge zeigen.
  const uebliche = examples[1] ?? examples[0];
  const currentYear = new Date().getFullYear();
  const lastFullYear = atlas?.solar.by_year.filter((y) => y.year < currentYear).slice(-1)[0];
  // Tempo statt Topfstand: Wie viele Anlagen sind dieses Jahr schon dazugekommen,
  // verglichen mit dem gesamten Vorjahr?
  //
  // Bewusst NICHT hochgerechnet, wie viel vom Fördertopf verbraucht ist — das
  // wäre eine erfundene Zahl mit vier Unbekannten (wer beantragt überhaupt,
  // welcher Topf-Anteil entfällt auf Solar, der Antrag liegt Monate vor der
  // Inbetriebnahme, Nachtragshaushalte ändern den Topf unterjährig). „Topf zu
  // 60 % verbraucht" könnte in Wahrheit 20 % oder 100 % heißen, und ein
  // „unter Vorbehalt" macht eine falsche Zahl nicht richtig. Die Anlagenzahl
  // dagegen ist gemessen und erzeugt denselben Handlungsdruck.
  const laufendesJahr = atlas?.solar.by_year.find((y) => y.year === currentYear);
  const tempo =
    laufendesJahr && lastFullYear && lastFullYear.count > 0 && laufendesJahr.count > 0
      ? { jetzt: laufendesJahr.count, vorjahr: lastFullYear.count, vorjahrZahl: lastFullYear.year }
      : null;
  // Verlauf des Programms: was wir seit Aufzeichnungsbeginn an Wechseln
  // festgestellt haben. Ohne Programm gibt es nichts zu verfolgen; ohne
  // Datenbank oder vor dem ersten Setup kommt eine leere Liste zurück und der
  // Abschnitt blendet sich aus.
  const historie = f ? await getFundingHistoryFor(f.id) : [];
  // FAQ aus den Förderdaten generiert (kein separater Datensatz).
  const faq = buildFundingFaq(city.name, f, { amortYears: examples[1]?.amort ?? examples[0]?.amort ?? null });
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((i) => ({ "@type": "Question", name: i.q, acceptedAnswer: { "@type": "Answer", text: i.a } })),
  };

  return (
    <div style={S.page}>
      <div style={S.wrap}>
        {/* Kein zusätzlicher Zurück-Pfeil über der Spur: Das Bundesland stand
            damit zweimal übereinander — einmal als Pfeil, einmal als Station.
            Wie im Atlas trägt allein die Spur die Navigation nach oben. */}
        <Breadcrumb
          items={[
            { label: "Förderung", href: "/photovoltaik-foerderung" },
            { label: city.bundesland, href: `/photovoltaik-foerderung/${slugify(city.bundesland)}` },
            { label: city.name },
          ]}
        />
        {/* Das Suchwort gehört in die H1: Die Seite rankt für „photovoltaik
            förderung <ort>", trug aber nur „Photovoltaik in <ort>" — das
            Hauptwort fehlte genau dort, wo Google es am stärksten gewichtet.
            Ohne Förderprogramm bleibt es beim Bestandstitel, sonst verspräche
            die Überschrift etwas, das die Seite nicht hat. */}
        {/* Der Ortsname führt zur Programmseite der Gemeinde (Betreiber-
            Entscheidung 26.08.2026). Sie ist die Quelle jeder Zahl hier und der
            einzige Ort, an dem der Antrag wirklich gestellt wird; als eigener
            Knopf daneben nahm sie dem einen nächsten Schritt den Platz weg.
            Unterstrichen statt farbig: In einer Überschrift dieser Größe wäre
            ein farbiges Wort ein zweiter Blickfang neben der Aussage. */}
        {/* Der Ortsname führt auf unsere Atlas-Seite zum Ort — den Bestand,
            aus dem auch der Block „Photovoltaik in … in Zahlen" weiter unten
            stammt (Betreiber-Entscheidung 26.08.2026). Die Seite ist erreichbar,
            steht aber nicht im Suchindex; der Verweis von hier ist damit ein
            interner Weg zu mehr Zahlen, kein Ausgang. */}
        {/* Stand ÜBER der Überschrift, wie auf der Atlas-Seite zum Ort: Er ordnet
            die Seite zeitlich ein, bevor die erste Zahl kommt.

            Die Angabe kommt aus DERSELBEN Funktion wie die Programmkarte weiter
            unten — eine zweite, kürzere Formulierung wäre die bekannte
            Drift-Falle. Sie nennt bewusst BEIDE Daten: aus welchem Monat die
            Werte stammen UND wann wir sie zuletzt bestätigt haben. Eines von
            beiden allein lässt offen, ob die Beträge von gestern oder von vor
            einem Jahr sind.

            Nur bei genau einem regionalen Programm — mehr kann diese Seite
            per Ableitung nicht tragen, und ein gemeinsames Datum über mehreren
            Ständen behauptete den schnellsten Takt für den langsamsten Wert. */}
        {f && <div style={S.stand}>{fundingStandLabel(f)}</div>}

        {/* Überschrift links, Abo-Block rechts daneben — dieselbe Mechanik wie
            auf der Atlas-Seite zum Ort. Vermerkt wird, dass HIER abonniert
            wurde: Beide Seitengattungen tragen denselben Ortsnamen und sprechen
            verschiedene Leute an (dort der Bestand, hier das Geld).

            Der Ortsschlüssel ist hier FÜNF- oder achtstellig — kreisfreie Städte
            tragen fünf. Die Anmelde-Adresse nimmt beide Formen; die eigentliche
            Prüfung ist, ob es den Ort im Melderegister gibt. */}
        <div className="gemeinde-titelzeile">
        <h1 style={S.h1}>
          {f ? (
            <>
              Photovoltaik-Förderung in{" "}
              {atlasPfad ? (
                <Link
                  href={atlasPfad}
                  title={`Anlagenbestand in ${city.name} im Solar-Atlas`}
                  style={{ color: "inherit", textDecorationColor: v("--color-border-accent"), textUnderlineOffset: 4 }}
                >
                  {city.name}
                </Link>
              ) : (
                city.name
              )}
            </>
          ) : (
            <>Photovoltaik in {city.name}</>
          )}
        </h1>
          <GemeindeAboBox name={city.name} ags={city.ags} quelle="foerderung" />
        </div>
        {/* Ein Ortsname allein ist mehrdeutig — Mühlhausen und Senden gibt es
            mehrfach in Deutschland. Der Kreis darunter sagt, welcher Ort hier
            gemeint ist, bevor die erste Zahl kommt.

            Bewusst ohne Präposition: „im {kreis}" liest sich bei fast allen
            Namen richtig und bei „StädteRegion Aachen" oder „Region Hannover"
            falsch. Eine Zeile, die für 47 von 50 Namen stimmt, ist keine
            Lösung — als Angabe für sich genommen stimmt sie für alle. */}
        {city.kreis && <p style={S.ortszeile}>{city.kreis}</p>}

        {/* Introtext und Amtslink nebeneinander: Die Programmseite der Gemeinde
            ist die Quelle, aus der jede Zahl hier stammt, und der einzige Ort,
            an dem jemand den Antrag wirklich stellt. Sie stand bisher nur als
            kleines Symbol im Kleingedruckten der Karte und nur dann, wenn die
            Mittel begrenzt sind — also ausgerechnet nicht bei den Programmen,
            die problemlos laufen. */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: space.lg, flexWrap: "wrap" }}>
        <p style={{ ...S.intro, flex: "1 1 320px", minWidth: 0 }}>
          {!f
            ? <>Anlagenbestand und Beispielrechnungen für Photovoltaik in {city.name}.</>
            : f.status === "aktiv"
            /* Kein „die Stadt": Von den geförderten Orten sind die meisten
               Gemeinden, vier sind Landkreise und einer ist ein Bundesland —
               für die stimmte der Satz schon vor den Gemeindeseiten nicht. Wer
               fördert, steht ohnehin als Träger in der Karte darunter. */
            ? <>In {city.name} gibt es für neue Solaranlagen einen Zuschuss über das <span style={S.strong}>{f.name}</span> — zusätzlich zur bundesweiten 0 % Mehrwertsteuer. Was sich damit rechnet:</>
            : <>In {city.name} gibt es mit dem <span style={S.strong}>{f.name}</span> ein kommunales Förderprogramm — {FUNDING_STATUS_NOTE[f.status]}. Bundesweit gilt weiterhin die 0 % Mehrwertsteuer auf Kauf und Installation.</>}
        </p>
        </div>

        {/* ── Förderung (oben) ── */}
        {f && (
          <div style={S.section}>
            <div style={{ ...S.card, background: v("--color-bg-muted"), padding: 0, overflow: "hidden" }}>
              {/* Kopf: Programm + Träger + Status, darunter die Herkunftszeile.
                  Der Rahmen bleibt neutral — eine grüne Umrandung um die ganze
                  Karte las sich wie eine Bewertung des Programms, obwohl sie nur
                  den Status wiederholte, der als Abzeichen daneben steht. */}
              <div style={{ padding: pad("lg", "xl"), borderBottom: `1px solid ${v("--color-border")}`, background: v("--color-bg") }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: space.sm }}>
                  <div>
                    <h2 style={{ ...S.h2, fontSize: "var(--font-size-lead)" }}>{f.name}</h2>
                    {/* Träger und Stand in EINER Zeile, gleiche Größe: Es ist
                        eine Angabe — wer es vergibt und mit welchem Datenstand.
                        Der zweite Link zum Programm ist raus, er stand hier und
                        am Fuß der Karte identisch. */}
                    <div style={{ fontSize: "var(--font-size-small)", color: v("--color-text-secondary"), marginTop: 2, lineHeight: 1.6 }}>
                      {f.traeger} — {fundingStandLabel(f)}
                      {/* Der Text bleibt Text — er beschreibt das Programm wie
                          Träger und Stand daneben. Hinaus führt allein das
                          Symbol, wie bei „Kombinierbar mit". */}
                      {f.capped && (
                        <>
                          {" · "}
                          Mittel begrenzt – vor Antrag prüfen{" "}
                          <a
                            href={f.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`${f.name} — Programmseite öffnen`}
                            style={{ display: "inline-flex", verticalAlign: "middle", color: v("--color-accent") }}
                          >
                            <IconExternal size={iconSizes.sm} />
                          </a>
                        </>
                      )}
                    </div>
                    {/* Warnung nur bei echtem Andrang: Steht das laufende Jahr
                        schon bei mindestens drei Vierteln des Vorjahres, ist
                        der Hinweis eine Information — darunter wäre er Lärm,
                        und ein Warnton, der immer angeht, wird weggefiltert. */}
                    {tempo && tempo.jetzt >= tempo.vorjahr * 0.75 && (
                      <div style={{ display: "flex", gap: space.sm, alignItems: "flex-start", marginTop: space.lg, padding: pad("md", "md"), background: v("--color-bg-accent"), border: `1px solid ${v("--color-border-accent")}`, borderRadius: v("--radius-md") }}>
                        <span aria-hidden="true" style={{ fontSize: "var(--font-size-lead)", fontWeight: 800, color: v("--color-accent"), lineHeight: 1.2 }}>!</span>
                        <span style={{ fontSize: "var(--font-size-small)", color: v("--color-text-secondary"), lineHeight: 1.5 }}>
                          In {city.name} {tempo.jetzt === 1 ? "ist dieses Jahr bisher 1 Anlage" : `sind dieses Jahr bisher ${nf(tempo.jetzt)} Anlagen`}{" "}
                          ans Netz gegangen — {tempo.vorjahr === 1 ? "im gesamten Vorjahr war es 1" : `im gesamten Jahr ${tempo.vorjahrZahl} waren es ${nf(tempo.vorjahr)}`}.
                          Wer den Zuschuss noch will, sollte den Antrag nicht aufschieben.
                        </span>
                      </div>
                    )}
                  </div>
                  <FundingStatusBadge status={f.status} />
                </div>
              </div>

              <div style={{ padding: pad("lg", "xl") }}>
                {/* Bedingungen und Konditionen nebeneinander, getrennt durch
                    eine senkrechte Linie. Beide beantworten zusammen die eine
                    Frage „komme ich in Frage, und wie viel ist es dann?".
                    Wer wo hineingehört: die Zielgruppen-Kennzeichen zu den
                    Bedingungen (sie sagen, WER darf), der Höchstbetrag zu den
                    Konditionen (er sagt, WIE VIEL). Die frühere Sammelzeile
                    „Förderfähig: … · max. …" hat beides vermischt und stand
                    über allem, wo es zu nichts gehörte.
                    Auf schmalen Bildschirmen stapeln sie von selbst; die Linie
                    verschwindet dann, weil sie danebenläge. */}
                {/* Fördert das Programm mehrere Techniken und ist wirklich etwas
                    technikgebunden, trennt die Komponente nach Reitern — sonst
                    rendert sie dieselben zwei Spalten wie zuvor. */}
                <FundingTechnikTabs program={f} datenBoxStyle={S.datenBox} knopfStil={S.sekundaerKnopf} />

                {combinable.length > 0 && (
                  <div style={{ marginTop: 44, textAlign: "center" }}>
                    {/* Geschwungene Klammer statt Trennlinie: Eine Linie
                        trennt, hier gehört aber beides zusammen — was
                        darüber steht, lässt sich mit dem kombinieren, was
                        darunter steht. Die Klammer führt die beiden Spalten
                        sichtbar auf einen Punkt. */}
                    <svg viewBox="0 0 400 18" preserveAspectRatio="none" style={{ width: "100%", height: 18, display: "block" }} aria-hidden="true">
                      <path d="M2 1 C2 9, 10 9, 190 9 C198 9, 200 17, 200 17 C200 17, 202 9, 210 9 C390 9, 398 9, 398 1"
                        fill="none" stroke={v("--color-border")} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                    </svg>
                    <div style={{ fontSize: "var(--font-size-caption)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: v("--color-text-muted"), margin: `${space.sm}px 0` }}>
                      Kombinierbar mit
                    </div>
                    {/* Nur das Symbol führt hinaus: Der Name ist hier die
                        Information, nicht der Weg — als Link gesetzt sah die
                        Zeile aus wie eine Navigation zu vier Zielen. */}
                    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: space.lg, rowGap: space.xs }}>
                      {combinable.map((p) => (
                        <span key={p.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "var(--font-size-small)", color: v("--color-text-secondary") }}>
                          {p.name}
                          <a
                            href={p.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`${p.name} — Programmseite öffnen`}
                            style={{ display: "inline-flex", color: v("--color-accent") }}
                          >
                            <IconExternal size={iconSizes.sm} />
                          </a>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Die beiden Wege von hier aus — durchrechnen oder die eigene
                    Berechtigung klären. Beide mit echter Schaltfläche: Als
                    Textlink gesetzt sahen sie aus wie Fußnoten, obwohl sie das
                    sind, was die Seite von jemandem will. */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: space.md, marginTop: 44 }}>
                  <div style={S.aktionsBox}>
                    <div style={S.aktionsTitel}>Solarförderung in {city.name}</div>
                    <p style={S.aktionsText}>
                      Für eine übliche Dachanlage mit {uebliche.kwp} <GlossaryTerm id="kwp">kWp</GlossaryTerm>
                      {uebliche.spKwh > 0 ? <> und {uebliche.spKwh} <GlossaryTerm id="speicherkapazitaet">kWh Speicher</GlossaryTerm></> : null}{" "}
                      {uebliche.foerderung > 0 ? (
                        <>gibt es hier rund <span style={S.strong}>{nf(uebliche.foerderung)} €</span> Zuschuss.</>
                      ) : (
                        <>liegt die Investition bei rund <span style={S.strong}>{nf(uebliche.brutto)} €</span>.</>
                      )}
                    </p>
                    <Link href={`/photovoltaik-rechner?er=${city.yieldKwhKwp}${ctaFoe}`} style={S.aktionsKnopf}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        Eigene Anlage rechnen <IconArrowRight size={iconSizes.sm} />
                      </span>
                    </Link>
                  </div>
                  <div style={S.aktionsBox}>
                    <div style={S.aktionsTitel}>Bekommst du die PV-Förderung?</div>
                    <p style={S.aktionsText}>
                      Vier Fragen zu Gebäude und Anlage — danach steht da, welche Zuschüsse für dich
                      gelten und wann der Antrag raus muss.
                    </p>
                    <FoerderCheckStarter programme={[f, ...combinable]} ortName={city.name} />
                  </div>
                </div>
              </div>
            </div>
            <Link href="/photovoltaik-foerderung" style={{ display: "inline-block", marginTop: 10, fontSize: "var(--font-size-small)", color: v("--color-accent"), textDecoration: "none" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>Alle Förderprogramme im Überblick <IconArrowRight size={iconSizes.xs} /></span>
            </Link>
          </div>
        )}

        {/* Der Förder-Check hat hier keinen eigenen Abschnitt mehr: Er ist kein
            Inhalt zum Lesen, sondern ein Werkzeug, das aus der Förderkarte
            heraus im Fenster startet (components/FoerderCheckStarter.tsx). */}

        {/* ── Verlauf: was sich seit Aufzeichnungsbeginn geändert hat ──
            Steht VOR den Beispielrechnungen: Wer gerade gelesen hat, dass der
            Topf ausgeschöpft ist, soll das wissen, bevor er eine Beispielzahl
            sieht. Blendet sich ohne festgestellten Wechsel komplett aus. */}
        {f && historie.length > 0 && (
          <div style={S.section}>
            <FundingHistory eintraege={historie} programmName={f.name} programmUrl={f.url} />
          </div>
        )}

        {/* ── Beispielrechnungen ── */}
        <div style={S.section}>
          <h2 style={S.h2}>Beispielrechnungen für {city.name}</h2>
          <p style={S.sub}>Typische Anlagen, gerechnet mit {nf(city.yieldKwhKwp)} kWh/kWp{f?.status === "aktiv" && examples.some((e) => e.foerderung > 0) ? " inkl. lokaler Förderung" : ""}</p>
          <ExampleCards examples={examples} />
          {f && f.status !== "aktiv" ? (
            <p style={{ ...S.sub, marginTop: 12, marginBottom: 0 }}>
              Die Förderung über das {f.name} ist {FUNDING_STATUS_NOTE[f.status]} —
              die Beispiele rechnen daher ohne. Aktuellen Status vor einem Antrag direkt beim Programm prüfen.
            </p>
          ) : f && !examples[0]?.foerderComputable ? (
            <p style={{ ...S.sub, marginTop: 12, marginBottom: 0 }}>
              Die Förderung über das {f.name} hängt vom Anlagentyp ab (siehe oben) und ist hier
              nicht pauschal pro Anlage eingerechnet.
            </p>
          ) : null}
        </div>

        {/* Der Rechner-Einstieg stand hier ein zweites Mal — die Förderkarte
            oben führt bereits dorthin, und die Beispielrechnungen dazwischen
            beantworten dieselbe Frage schon mit konkreten Zahlen. */}

        {/* ── FAQ (aus Förderdaten generiert) ── */}
        <div style={S.section}>
          <h2 style={S.h2}>Häufige Fragen zur PV-Förderung in {city.name}</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
            {faq.map((item) => (
              <details key={item.q} style={{ background: v("--color-bg"), border: `1px solid ${v("--color-border")}`, borderRadius: v("--radius-md"), padding: "12px 14px" }}>
                <summary style={{ fontSize: 14, fontWeight: 700, color: v("--color-text-primary"), cursor: "pointer", listStyle: "none" }}>{item.q}</summary>
                <p style={{ fontSize: "var(--font-size-small)", lineHeight: 1.6, color: v("--color-text-secondary"), margin: "8px 0 0" }}>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(faqJsonLd) }} />

        {/* ── Bestand (Trust-Signal, unten) ── */}
        {atlas && atlas.solar.total_count > 0 && (
          <div style={S.section}>
            <h2 style={S.h2}>Photovoltaik in {city.name} in Zahlen</h2>
            <p style={S.sub}>
              Aktueller Anlagenbestand aus dem Marktstammdatenregister
              {/* Der Nenner gehört sichtbar an die Zahl: Diese Seiten stehen
                  neben Kreis- und Landesseiten mit denselben Beschriftungen,
                  und eine Kreiszahl unter einem Ortsnamen wäre der schwerste
                  Fehler, den diese Seite machen kann. */}
              {city.kreis ? <> — nur {city.name}, nicht {city.kreis}</> : null}
            </p>
            {/* Einordnung statt Zahlenreihe: Die Kacheln sagen, wie viel in
                diesem Ort steht, aber nicht, ob das viel ist. Der Atlas des
                Bundeslands beantwortet genau das. Eine eigene Atlas-Seite für
                den Ort gibt es bewusst nicht — die Gemeindeebene ist nicht
                freigeschaltet, und ein Link ins Leere wäre schlimmer als keiner. */}
            <Link href={atlasPfad ?? `/solar-atlas/${params.bundesland}`} style={{ ...S.sekundaerKnopf, marginBottom: space.md }}>
              {atlasPfad ? <>Alle Zahlen zu {city.name} im Solar-Atlas</> : <>Im Solar-Atlas {city.bundesland} vergleichen</>}
              <IconArrowRight size={iconSizes.sm} />
            </Link>
            <div style={S.metricsGrid}>
              <div style={S.metric}>
                <div style={S.metricLabel}>Solaranlagen</div>
                <div style={S.metricValue}>{nf(atlas.solar.total_count)}</div>
              </div>
              <div style={S.metric}>
                <div style={S.metricLabel}>Installiert</div>
                <div style={S.metricValue}>{fmtCapacity(atlas.solar.total_kwp)}</div>
              </div>
              <div style={S.metric}>
                <div style={S.metricLabel}>Batteriespeicher</div>
                <div style={S.metricValue}>{nf(atlas.speicher.count)}</div>
              </div>
              {lastFullYear && (
                <div style={S.metric}>
                  <div style={S.metricLabel}>Neu in {lastFullYear.year}</div>
                  <div style={S.metricValue}>{nf(lastFullYear.count)}</div>
                </div>
              )}
            </div>

            {/* Zubau-Chart und Segment-Aufteilung stehen hier NICHT mehr.
                Dieselben Zahlen zeigt die Atlas-Gemeindeseite ausführlicher —
                heute fällt das nicht auf, weil die Gemeindeebene auf
                „nicht indexieren" steht. Mit der geplanten Freischaltung
                (docs/atlas-index-wellen.md) stünden für denselben Ort zwei
                indexierte Seiten mit demselben Bestand, demselben Chart und
                derselben Aufteilung — bei 11.000 Gemeinden genau die Dopplung,
                die der Index-Plan vermeiden soll.
                Die vier Kennzahlen oben bleiben: Sie sind der Vertrauensanker
                dieser Seite („hier passiert wirklich etwas"), und vier Zahlen
                sind keine konkurrierende Seite. Der Atlas führt die Ausführung. */}
          </div>
        )}

        {/* ── Weiterlesen: verbindet die Förderseiten mit Ratgebern + Tools ── */}
        <RelatedLinks
          links={[
            { href: "/ratgeber/lohnt-sich-pv-mit-speicher", label: "Lohnt sich PV mit Speicher?", desc: "Die ehrliche Rechnung mit aktuellen Marktpreisen — und wann sich ein Speicher wirklich rechnet." },
            { href: "/pv-bedarf-berechnen", label: "Welche Anlage passt zu mir?", desc: "In wenigen Fragen zur passenden Anlagengröße — mit Empfehlung und Begründung." },
            { href: "/pv-simulation", label: "PV-Simulation: Was produziert ein Dach gerade?", desc: "Live-Leistung einer PV-Anlage an deinem Standort, gerechnet aus aktuellen Wetterdaten." },
            { href: "/balkonkraftwerk/rechner", label: "Balkonkraftwerk-Rechner", desc: "Für Miete oder ohne eigenes Dach: was Steckersolar bringt und wann es sich amortisiert." },
            { href: "/ratgeber/waermepumpe-foerderung", label: "Wärmepumpen-Förderung 2026", desc: "Wie viel Zuschuss es für den Heizungstausch gibt — und wer welchen Bonus bekommt." },
          ]}
        />

        {/* ── Disclaimer ── */}
        <div style={{ fontSize: "var(--font-size-caption)", color: v("--color-text-muted"), lineHeight: 1.6, borderTop: `1px solid ${v("--color-border")}`, paddingTop: 12, marginBottom: 32 }}>
          Bestandsdaten: Marktstammdatenregister (Bundesnetzagentur){atlas?.data_as_of ? `, Stand ${atlas.data_as_of}` : ""}, monatlich aktualisiert, Datenlizenz{" "}
          <a
            href="https://www.govdata.de/dl-de/by-2-0"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "inherit", textDecoration: "underline" }}
          >
            dl-de/by-2-0
          </a>{" "}
          (Daten aggregiert).
          {f ? ` Förderdaten redaktionell gepflegt, Stand ${f.stand}.` : ""}
          {" "}Der angegebene Standort-Ertrag (kWh/kWp) stammt von{" "}
          <a href={DATA_SOURCES.pvgis.url} target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "underline" }}>
            PVGIS
          </a>{" "}
          (Europäische Kommission).
          {" "}Alle Angaben sind Näherungswerte ohne Anspruch auf Richtigkeit, Aktualität oder Vollständigkeit und stellen keine
          Rechts-, Steuer- oder Anlageberatung dar. Förderkonditionen ändern sich und Budgets können erschöpft sein — verbindlich
          ist allein die offizielle Quelle des jeweiligen Programms. Beispielrechnungen sind unverbindliche Schätzungen.
        </div>

        {/* Merker fürs Ende: Sobald er in Sicht kommt, fährt die klebende Leiste
            aus — sie darf die Rechtshinweise darunter nie überdecken. */}
        <div id="sc-cta-sentinel" style={{ height: 1 }} aria-hidden />
      </div>
      {/* Der Rechner wohnt in einem Fenster auf dieser Seite: vorbefüllt mit dem
          gemessenen Standort-Ertrag und dem lokalen Programm, damit die Zahl
          sofort zu diesem Ort passt. Der Teilen-Link zeigt trotzdem auf den
          Rechner selbst — sonst landete der Empfänger hier. */}
      <PvRechnerModal
        initialParams={{ er: String(city.yieldKwhKwp), ...(ctaFoe ? { foe: f!.id } : {}) }}
      />
      {f && (
        <StickyCta
          /* Öffnet den Rechner im Fenster statt die Seite zu verlassen —
             derselbe Weg wie im Wärmepumpen-Ratgeber. */
          primaer={{ href: PV_RECHNER_HASH, label: "Anlage durchrechnen" }}
          /* Der Förder-Check statt der Amtsseite: Er ist der zweite Weg, der
             auf DIESER Seite weiterhilft — die Amtsseite führt hinaus und steht
             ohnehin in der Herkunftszeile der Karte. */
          sekundaer={{ ereignis: FOERDER_CHECK_OEFFNEN, label: "Förder-Check starten" }}
        />
      )}
    </div>
  );
}
