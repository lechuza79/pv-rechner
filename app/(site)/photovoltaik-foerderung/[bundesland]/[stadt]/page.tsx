import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumb from "../../../../../components/Breadcrumb";
import { IconArrowRight, IconExternal } from "../../../../../components/Icons";
import RelatedLinks from "../../../../../components/RelatedLinks";
import { v, iconSizes, space, pad } from "../../../../../lib/theme";
import { pageMetadata } from "../../../../../lib/seo";
import { jsonLdHtml } from "../../../../../lib/json-ld";
import { cityBySlug, slugify, isCityPublished, publishedCities } from "../../../../../lib/atlas-cities";
import { fundingStandLabel, type FundingProgram } from "../../../../../lib/funding-programs";
import { getFundingPrograms, getFundingProgramById } from "../../../../../lib/funding-data";
import { FundingRates, FundingConditions, FundingStatusBadge, ExampleCards, FUNDING_STATUS_LABEL, FUNDING_STATUS_NOTE } from "../../../../../components/FundingProgramParts";
import FoerderFlow from "../../../../../components/FoerderFlow";
import { buildFundingExamples } from "../../../../../lib/funding-examples";
import { buildFundingFaq } from "../../../../../lib/funding-faq";
import { getRegionAtlasData, type RegionAtlas } from "../../../../../lib/mastr-data";
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
  const f = city.fundingId ? await getFundingProgramById(city.fundingId) : undefined;
  const active = f?.status === "aktiv";
  const year = new Date().getFullYear();
  return pageMetadata({
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
  });
}

const nf = (n: number) => Math.round(n).toLocaleString("de-DE");

// Capacity: show kWp below 1 MWp (so small segments don't collapse to "0 MWp"),
// MWp with one decimal up to 10, no decimals above.
function fmtCapacity(kwp: number): string {
  if (kwp < 1000) return `${nf(kwp)} kWp`;
  const mwp = kwp / 1000;
  return `${mwp.toLocaleString("de-DE", { maximumFractionDigits: mwp < 10 ? 1 : 0 })} MWp`;
}

const SEGMENT_LABEL: Record<string, string> = {
  steckersolar: "Balkonkraftwerke",
  privat_dach: "Private Dächer",
  gewerbe_dach: "Gewerbedächer",
  freiflaeche: "Freiflächen-Parks",
};

function ZubauChart({ years }: { years: { year: number; count: number }[] }) {
  const currentYear = new Date().getFullYear();
  // Drop the partial current year and anything pre-2014 (sparse).
  const rows = years.filter((y) => y.year >= 2014 && y.year < currentYear);
  if (rows.length < 3) return null;
  const max = Math.max(...rows.map((r) => r.count));
  const peak = rows.reduce((a, b) => (b.count > a.count ? b : a));
  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 150 }}>
        {rows.map((r) => (
          <div key={r.year} title={`${r.year}: ${nf(r.count)} neue Anlagen`} style={{ flex: 1, height: "100%", display: "flex", alignItems: "flex-end" }}>
            <div style={{
              width: "100%",
              height: `${Math.max(2, Math.round((r.count / max) * 100))}%`,
              background: r.year === peak.year ? v("--color-accent") : v("--color-accent-light"),
              borderRadius: "3px 3px 0 0",
            }} />
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
        {rows.map((r) => (
          <div key={r.year} style={{ flex: 1, textAlign: "center", fontSize: 9, color: v("--color-text-muted"), fontFamily: v("--font-mono") }}>
            {r.year % 2 === 0 ? `'${String(r.year).slice(2)}` : ""}
          </div>
        ))}
      </div>
    </div>
  );
}

const S = {
  // Basis-Schriftgröße für die ganze Seite aus dem Token: Alles darunter erbt
  // sie, statt dass jede Stelle ihre eigene Größe mitbringt.
  page: { background: v("--color-bg"), fontFamily: v("--font-text"), fontSize: "var(--font-size-body)", color: v("--color-text-primary"), minHeight: "100vh", padding: "0 16px 20px" } as React.CSSProperties,
  wrap: { maxWidth: 720, margin: "0 auto" } as React.CSSProperties,
  breadcrumb: { fontSize: "var(--font-size-caption)", color: v("--color-text-secondary"), marginBottom: 6 } as React.CSSProperties,
  h1: { fontSize: "var(--font-size-h1)", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.2, margin: "0 0 8px" } as React.CSSProperties,
  intro: { fontSize: "var(--font-size-body)", lineHeight: 1.6, color: v("--color-text-secondary"), margin: "0 0 22px" } as React.CSSProperties,
  strong: { color: v("--color-text-primary"), fontWeight: 600 } as React.CSSProperties,
  metricsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginBottom: 28 } as React.CSSProperties,
  metric: { background: v("--color-bg-muted"), borderRadius: v("--radius-md"), padding: 14 } as React.CSSProperties,
  metricLabel: { fontSize: "var(--font-size-small)", color: v("--color-text-secondary"), marginBottom: 4 } as React.CSSProperties,
  metricValue: { fontFamily: v("--font-mono"), fontSize: 22, fontWeight: 700 } as React.CSSProperties,
  h2: { fontSize: "var(--font-size-h3)", fontWeight: 700, margin: "0 0 4px" } as React.CSSProperties,
  sub: { fontSize: "var(--font-size-small)", color: v("--color-text-muted"), margin: "0 0 14px" } as React.CSSProperties,
  section: { marginBottom: 28 } as React.CSSProperties,
  card: { background: v("--color-bg"), border: `1px solid ${v("--color-border")}`, borderRadius: v("--radius-lg"), padding: pad("lg", "xl") } as React.CSSProperties,
  // Die beiden Wege am Fuß der Förderkarte: selbst nachrechnen (links) oder
  // die eigene Berechtigung klären (rechts).
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

  const programs = await getFundingPrograms();
  const byId = new Map(programs.map((p) => [p.id, p]));
  const f = city.fundingId ? byId.get(city.fundingId) : undefined;
  const examples = buildFundingExamples(city.yieldKwhKwp, f);
  // Förderung im Rechner vorab scharf schalten — nur wenn sie sich pauschal
  // berechnen lässt UND aktuell Anträge angenommen werden.
  const ctaFoe = f && f.status === "aktiv" && examples[0]?.foerderComputable ? `&foe=${f.id}` : "";
  const combinable = (f?.combinableWith ?? [])
    .map((id) => byId.get(id))
    .filter((p): p is FundingProgram => Boolean(p));
  // Der mittlere Fall (10 kWp mit kleinem Speicher) steht für das Einfamilienhaus
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
        <h1 style={S.h1}>
          {f ? <>Photovoltaik-Förderung in {city.name}</> : <>Photovoltaik in {city.name}</>}
        </h1>
        <p style={S.intro}>
          {!f
            ? <>Anlagenbestand und Beispielrechnungen für Photovoltaik in {city.name}.</>
            : f.status === "aktiv"
            ? <>In {city.name} fördert die Stadt neue Solaranlagen über das <span style={S.strong}>{f.name}</span> — zusätzlich zur bundesweiten 0 % Mehrwertsteuer. Was sich damit rechnet:</>
            : <>In {city.name} gibt es mit dem <span style={S.strong}>{f.name}</span> ein kommunales Förderprogramm — {FUNDING_STATUS_NOTE[f.status]}. Bundesweit gilt weiterhin die 0 % Mehrwertsteuer auf Kauf und Installation.</>}
        </p>

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
                    <div style={{ fontSize: "var(--font-size-small)", color: v("--color-text-secondary"), marginTop: 2 }}>
                      {f.traeger} — {fundingStandLabel(f)}
                    </div>
                    {f.capped && (
                      <div style={{ fontSize: "var(--font-size-small)", marginTop: 4 }}>
                        <a href={f.url} target="_blank" rel="noopener noreferrer" style={{ color: v("--color-accent") }}>
                          Mittel begrenzt: vor Antrag prüfen
                        </a>
                      </div>
                    )}
                    {/* Warnung nur bei echtem Andrang: Steht das laufende Jahr
                        schon bei mindestens drei Vierteln des Vorjahres, ist
                        der Hinweis eine Information — darunter wäre er Lärm,
                        und ein Warnton, der immer angeht, wird weggefiltert. */}
                    {tempo && tempo.jetzt >= tempo.vorjahr * 0.75 && (
                      <div style={{ display: "flex", gap: space.sm, alignItems: "flex-start", marginTop: space.md, padding: pad("md", "md"), background: v("--color-bg-accent"), border: `1px solid ${v("--color-border-accent")}`, borderRadius: v("--radius-md") }}>
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
                <div className="foerder-spalten" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: space.xl, alignItems: "stretch" }}>
                  <div style={{ paddingRight: space.lg, borderRight: `1px solid ${v("--color-border")}` }} className="foerder-spalte-links">
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: space.sm }}>
                      {f.eligibility.map((e) => (
                        <span key={e} style={{ fontSize: "var(--font-size-caption)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: v("--color-text-secondary"), background: v("--color-bg"), border: `1px solid ${v("--color-border")}`, borderRadius: 999, padding: "3px 10px" }}>
                          {e === "privat" ? "Privat" : "Gewerblich"}
                        </span>
                      ))}
                    </div>
                    <FundingConditions conditions={f.conditions} />
                  </div>
                  <div>
                    <FundingRates rates={f.rates} bordered label="Konditionen" />
                    {f.maxFoerderung && (
                      <div style={{ fontSize: "var(--font-size-small)", color: v("--color-text-secondary"), marginTop: space.sm }}>
                        Höchstbetrag: <span style={S.strong}>{f.maxFoerderung}</span>
                      </div>
                    )}
                  </div>
                </div>

                {combinable.length > 0 && (
                  <div style={{ marginTop: space.lg, textAlign: "center" }}>
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
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: space.md, marginTop: space.xl }}>
                  <div style={S.aktionsBox}>
                    <div style={S.aktionsTitel}>Was springt dabei heraus?</div>
                    <p style={S.aktionsText}>
                      {city.name} liefert rund {nf(city.yieldKwhKwp)} kWh je kWp. Rechne mit deinen
                      eigenen Werten — die Förderung ist dabei schon eingerechnet.
                    </p>
                    <Link href={`/photovoltaik-rechner?er=${city.yieldKwhKwp}${ctaFoe}`} style={S.aktionsKnopf}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        {ctaFoe ? "Mit Förderung rechnen" : `Für ${city.name} rechnen`} <IconArrowRight size={iconSizes.sm} />
                      </span>
                    </Link>
                  </div>
                  <div style={S.aktionsBox}>
                    <div style={S.aktionsTitel}>Bekommst du die Förderung?</div>
                    <p style={S.aktionsText}>
                      Vier Fragen zu Vorhaben und Gebäude — danach steht da, was für dich gilt und in
                      welcher Reihenfolge du vorgehen musst. Dauert eine Minute.
                    </p>
                    <a href="#foerder-check" style={S.aktionsKnopf}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        Förder-Check starten <IconArrowRight size={iconSizes.sm} />
                      </span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
            <Link href="/photovoltaik-foerderung" style={{ display: "inline-block", marginTop: 10, fontSize: "var(--font-size-small)", color: v("--color-accent"), textDecoration: "none" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>Alle Förderprogramme im Überblick <IconArrowRight size={iconSizes.xs} /></span>
            </Link>
          </div>
        )}

        {/* ── Förder-Check: bin ich berechtigt, und was ist wann zu tun? ──
            Die Schritte kommen aus den erfassten Bedingungen der Programme
            dieses Ortes (lib/funding-flow.ts) — der Block blendet sich von
            selbst aus, solange dort nichts Prüfbares hinterlegt ist. */}
        {/* Ohne eigene Überschrift: Der Einstieg steht in der Karte darüber und
            heißt schon „Bekommst du die Förderung?" — dieselbe Zeile hier ein
            zweites Mal ließ den Check aussehen wie ein zweites Angebot. */}
        {f && (
          <div style={S.section} id="foerder-check">
            <FoerderFlow programme={[f, ...combinable]} ortName={city.name} />
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
            <p style={S.sub}>Aktueller Anlagenbestand aus dem Marktstammdatenregister</p>
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

            {atlas.solar.by_year.length >= 4 && (
              <div style={{ marginBottom: 22 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 2px" }}>Zubau pro Jahr</h3>
                <p style={S.sub}>Neu in Betrieb genommene Solaranlagen</p>
                <ZubauChart years={atlas.solar.by_year} />
              </div>
            )}

            {atlas.solar.by_segment.length > 0 && (
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 12px" }}>Wo der Strom erzeugt wird</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                  {(() => {
                    const maxKwp = Math.max(...atlas.solar.by_segment.map((s) => s.kwp));
                    return atlas.solar.by_segment.map((s) => (
                      <div key={s.segment}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--font-size-small)", marginBottom: 3 }}>
                          <span>{SEGMENT_LABEL[s.segment] ?? s.segment}</span>
                          <span style={{ color: v("--color-text-secondary"), fontFamily: v("--font-mono") }}>{fmtCapacity(s.kwp)} · {nf(s.count)} Anlagen</span>
                        </div>
                        <div style={{ height: 8, background: v("--color-bg-muted"), borderRadius: 4 }}>
                          <div style={{ height: "100%", width: `${Math.max(3, Math.round((s.kwp / maxKwp) * 100))}%`, background: v("--color-accent"), borderRadius: 4 }} />
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Weiterlesen: verbindet die Förderseiten mit Ratgebern + Tools ── */}
        <RelatedLinks
          links={[
            { href: "/ratgeber/lohnt-sich-pv-mit-speicher", label: "Lohnt sich PV mit Speicher?", desc: "Die ehrliche Rechnung mit aktuellen Marktpreisen — und wann sich ein Speicher wirklich rechnet." },
            { href: "/pv-bedarf-berechnen", label: "Welche Anlage passt zu mir?", desc: "In wenigen Fragen zur passenden Anlagengröße — mit Empfehlung und Begründung." },
            { href: "/pv-simulation", label: "PV-Simulation: Was produziert ein Dach gerade?", desc: "Live-Leistung einer PV-Anlage an deinem Standort, gerechnet aus aktuellen Wetterdaten." },
            { href: "/balkonkraftwerk-rechner", label: "Balkonkraftwerk-Rechner", desc: "Für Miete oder ohne eigenes Dach: was Steckersolar bringt und wann es sich amortisiert." },
            { href: "/ratgeber/waermepumpe-foerderung-2026", label: "Wärmepumpen-Förderung 2026", desc: "Wie viel Zuschuss es für den Heizungstausch gibt — und wer welchen Bonus bekommt." },
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

      </div>
    </div>
  );
}
