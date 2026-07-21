import { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "../../../components/Breadcrumb";
import GlossaryTerm from "../../../components/GlossaryTerm";
import ProConLists from "../../../components/ProConLists";
import { IconArrowUp } from "../../../components/Icons";
import Faq from "../../../components/Faq";
import { pvSpeicherFaq } from "../../../lib/faq";
import { v } from "../../../lib/theme";
import { fetchMarketPrices, formatPriceDate } from "../../../lib/prices-server";
import { type PriceConfig } from "../../../lib/prices-config";
import { DEFAULT_FEED_IN } from "../../../lib/feedin-config";
import {
  calc,
  calcEigenverbrauch,
  calcWeightedFeedIn,
  estimateCost,
  batteryReplaceCost,
  marginalPaybackYears,
  BATTERY_LIFETIME_YEARS,
} from "../../../lib/calc";
import { simulatePvYear } from "../../../lib/pv-sim";
import { PERSONEN, NUTZUNG, SCENARIOS, SPEICHER, YEARS, NO_PLZ_DEFAULT_YIELD } from "../../../lib/constants";
import { pageMetadata } from "../../../lib/seo";
import Chart from "../photovoltaik-rechner/_components/Chart";

// Figures on this page come live from the same models the calculator uses
// (prices from Supabase market_prices with config fallback). ISR keeps them
// fresh without a rebuild — same pattern as /datenstand.
export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const year = new Date().getFullYear();
  return pageMetadata({
    path: "/lohnt-sich-pv-mit-speicher",
    title: `Lohnt sich PV mit Speicher? Ehrliche Rechnung ${year}`,
    description:
      "Wann sich ein Batteriespeicher zur Photovoltaikanlage rechnet — und wann nicht. Mit transparenter Beispielrechnung auf Basis aktueller Marktpreise, ohne Verkaufsprosa und ohne Anmeldung.",
    ogImageTitle: "Lohnt sich PV mit Speicher?",
    ogImageSubtitle: "Ehrliche Beispielrechnung statt Verkaufsprosa.",
  });
}

// ─── Styles (same content-page conventions as /methodik) ────────────────────
const S = {
  page: {
    background: v("--color-bg"),
    fontFamily: v("--font-text"),
    color: v("--color-text-primary"),
    minHeight: "100vh",
    padding: "20px 16px",
  },
  wrap: { maxWidth: v("--content-max-width"), margin: "0 auto", paddingTop: 60 },
  back: {
    fontSize: v("--font-size-small"),
    color: v("--color-text-secondary"),
    textDecoration: "none",
    display: "inline-block",
    marginBottom: 24,
  },
  h1: {
    fontSize: v("--font-size-h1"),
    fontWeight: 800,
    letterSpacing: "-0.02em",
    color: v("--color-text-primary"),
    lineHeight: 1.25,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: v("--font-size-lead"),
    color: v("--color-text-muted"),
    marginBottom: 24,
    lineHeight: 1.6,
  },
  h2: {
    fontSize: v("--font-size-h2"),
    fontWeight: 700,
    color: v("--color-text-primary"),
    marginTop: 32,
    marginBottom: 10,
  },
  p: {
    fontSize: v("--font-size-body"),
    color: v("--color-text-muted"),
    lineHeight: 1.7,
    marginBottom: 12,
  },
  strong: { fontWeight: 700, color: v("--color-text-primary") },
  card: {
    background: v("--color-bg"),
    borderRadius: v("--radius-md"),
    padding: "14px 16px",
    border: `1px solid ${v("--color-border")}`,
    marginBottom: 12,
    fontSize: v("--font-size-body"),
    color: v("--color-text-muted"),
    lineHeight: 1.7,
  },
  hero: {
    background: v("--color-bg-accent"),
    borderRadius: v("--radius-lg"),
    padding: "16px 18px",
    marginBottom: 8,
    fontSize: v("--font-size-body"),
    color: v("--color-text-primary"),
    lineHeight: 1.7,
  },
  label: {
    fontSize: v("--font-size-caption"),
    fontWeight: 700,
    color: v("--color-text-secondary"),
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
    marginBottom: 6,
    display: "block",
  },
  mono: { fontFamily: v("--font-mono"), fontSize: v("--font-size-small") },
  accent: { color: v("--color-accent"), fontWeight: 600 },
  positive: { color: v("--color-positive"), fontWeight: 600 },
  muted: { color: v("--color-text-muted") },
  link: { color: v("--color-accent"), textDecoration: "none", fontWeight: 600 },
  ctaButton: {
    display: "inline-block",
    padding: "10px 18px",
    borderRadius: v("--radius-md"),
    fontSize: v("--font-size-body"),
    fontWeight: 700,
    background: v("--color-accent"),
    color: v("--color-text-on-accent"),
    textDecoration: "none",
  },
  ctaSecondary: {
    display: "inline-block",
    padding: "10px 18px",
    borderRadius: v("--radius-md"),
    fontSize: v("--font-size-body"),
    fontWeight: 700,
    border: `1px solid ${v("--color-border")}`,
    color: v("--color-accent"),
    textDecoration: "none",
  },
  th: {
    textAlign: "left" as const,
    fontSize: v("--font-size-caption"),
    fontWeight: 700,
    color: v("--color-text-secondary"),
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
    padding: "8px 6px",
    borderBottom: `1px solid ${v("--color-border")}`,
  },
  thNum: {
    textAlign: "right" as const,
    fontSize: v("--font-size-caption"),
    fontWeight: 700,
    color: v("--color-text-secondary"),
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
    padding: "8px 6px",
    borderBottom: `1px solid ${v("--color-border")}`,
  },
  td: {
    fontSize: v("--font-size-body"),
    color: v("--color-text-muted"),
    padding: "10px 6px",
    borderBottom: `1px solid ${v("--color-border")}`,
    lineHeight: 1.4,
  },
  tdNum: {
    fontFamily: v("--font-mono"),
    fontSize: v("--font-size-body"),
    color: v("--color-text-primary"),
    textAlign: "right" as const,
    padding: "10px 6px",
    borderBottom: `1px solid ${v("--color-border")}`,
    whiteSpace: "nowrap" as const,
  },
};

// ─── Example calculation ─────────────────────────────────────────────────────
// One reference household, three storage sizes — computed with the EXACT same
// functions the calculator uses (shared calc base, CLAUDE.md). If a number here
// ever differs from the tool, that's a bug, not a rounding choice.
const EX = {
  kwp: 10,
  ertragKwp: NO_PLZ_DEFAULT_YIELD, // conservative German average, same default as the calculator without PLZ
  personenIdx: 2, // 3–4 Personen → 3.800 kWh/a
  nutzungIdx: 1, // "Teils zuhause" → tagQuote 0.30 (HTW-Standardprofil)
};

interface ExampleRow {
  speicherKwh: number;
  kosten: number;
  ev: number;
  autarkie: number;
  amortisation: number | null;
  gewinn25: number;
  /** ⌀ Ersparnis/Jahr — same formula as the calculator's ResultStats. */
  ersparnisProJahr: number;
  /** Three amortization curves (pess./real./opt.) for the <Chart> teaser —
   *  computed exactly like the calculator (SCENARIOS + calc), so the picture
   *  matches the tool 1:1. */
  scenarios: { id: string; color: string; data: ReturnType<typeof calc> }[];
  /** Deep link that pre-loads this exact config in the calculator. */
  href: string;
}

// kWh → SPEICHER option index (share-URL param "s"). Indices are stable for
// legacy share-URLs (see constants). Only the sizes this page uses are mapped.
const SPEICHER_IDX: Record<number, number> = Object.fromEntries(
  SPEICHER.map((o, i) => [o.kwh, i] as const),
);

function computeExample(speicherKwh: number, prices: PriceConfig): ExampleRow {
  const baseKwh = PERSONEN[EX.personenIdx].verbrauch;
  const ev = calcEigenverbrauch({
    personenIdx: EX.personenIdx,
    nutzungIdx: EX.nutzungIdx,
    speicherKwh,
    wp: "nein",
    ea: "nein",
    eaKm: 0,
    kwp: EX.kwp,
    ertragKwp: EX.ertragKwp,
  });
  const kosten = estimateCost(EX.kwp, speicherKwh, prices);
  const feedIn = calcWeightedFeedIn(EX.kwp, DEFAULT_FEED_IN.teilUnder10, DEFAULT_FEED_IN.teilOver10);
  const result = calc({
    kwp: EX.kwp,
    kosten,
    strompreis: prices.electricityPrice,
    eigenverbrauch: ev,
    einspeisung: feedIn,
    stromSteigerung: prices.electricityIncrease,
    ertragKwp: EX.ertragKwp,
    monthly: null,
    batteryReplace: speicherKwh > 0 ? batteryReplaceCost(speicherKwh, prices) : 0,
  });
  // Autarky from the hourly year simulation — same source as the calculator's
  // result page (never back-computed from the annual energy balance).
  const sim = simulatePvYear({
    kwp: EX.kwp,
    speicherKwh,
    monthlyYieldPerKwp: null,
    ertragKwp: EX.ertragKwp,
    household: { baseKwh, tagQuote: NUTZUNG[EX.nutzungIdx].tagQuote, wpActive: false, eaActive: false },
  });
  // Three scenario curves for the chart — identical construction to the
  // calculator (rechner.tsx → scenarioData): scenario EV capped at the physical
  // maximum (consumption / yield) so the optimistic curve can't invent savings.
  const jahresertrag = EX.kwp * EX.ertragKwp;
  const scenarios = SCENARIOS.map((s) => ({
    id: s.id,
    color: s.color,
    data: calc({
      kwp: EX.kwp,
      kosten,
      strompreis: prices.electricityPrice,
      eigenverbrauch: Math.min(ev + s.evDelta, 95, (baseKwh / jahresertrag) * 100),
      einspeisung: feedIn,
      stromSteigerung: s.strom,
      ertragKwp: EX.ertragKwp,
      monthly: null,
      batteryReplace: speicherKwh > 0 ? batteryReplaceCost(speicherKwh, prices) : 0,
    }),
  }));
  // Deep-link params reproduce the teaser numbers 1:1 in the calculator. We pass
  // strompreis (st) and Ertrag (er) explicitly to pin the exact figures used
  // here — both the page and the calculator default to the canonical price
  // (prices-config electricityPrice), so st just guarantees a 1:1 match even if
  // the live price later moves.
  const params = new URLSearchParams({
    a: "2", // 10 kWp (ANLAGEN index)
    s: String(SPEICHER_IDX[speicherKwh] ?? 0),
    p: String(EX.personenIdx),
    n: String(EX.nutzungIdx),
    st: String(prices.electricityPrice),
    er: String(EX.ertragKwp),
  });
  return {
    speicherKwh,
    kosten,
    ev,
    autarkie: sim.autarky,
    amortisation: result.be?.i ?? null,
    gewinn25: result.total,
    ersparnisProJahr: Math.round((result.total + kosten) / YEARS),
    scenarios,
    href: `/photovoltaik-rechner?${params.toString()}`,
  };
}

// German percent with one decimal, e.g. 5,1 %.

// One teaser card: title + amortization chart + result-style tiles + deep link.
// Server component (Chart is the only client island), tiles reuse the exact
// ResultStats look/tokens. Tiles wrap on narrow screens (mobile-first).
function TeaserCard({ row, title, badge }: { row: ExampleRow; title: string; badge: string }) {
  const tileWrap = {
    background: v("--color-bg"),
    borderRadius: v("--radius-md"),
    padding: "11px 12px",
    border: `1px solid ${v("--color-border")}`,
  } as const;
  const tileLabel = {
    fontSize: 10.5,
    color: v("--color-text-secondary"),
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
    fontWeight: 600,
  } as const;
  const tileValue = {
    fontSize: 17,
    fontWeight: 800,
    fontFamily: v("--font-mono"),
    marginTop: 4,
    lineHeight: 1.15,
  } as const;
  return (
    <div
      style={{
        background: v("--color-bg"),
        borderRadius: v("--radius-lg"),
        border: `1px solid ${v("--color-border")}`,
        padding: 14,
        marginBottom: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
        <strong style={{ fontSize: 14.5, fontWeight: 700, color: v("--color-text-primary") }}>{title}</strong>
        <span style={{ fontSize: 11, fontWeight: 700, fontFamily: v("--font-mono"), color: v("--color-accent") }}>{badge}</span>
      </div>
      <Chart scenarios={row.scenarios} kosten={row.kosten} highlightId="realistic" />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(96px, 1fr))",
          gap: 8,
          marginTop: 10,
        }}
      >
        <div style={tileWrap}>
          <div style={tileLabel}>Amortisation</div>
          <div style={{ ...tileValue, color: v("--color-accent") }}>
            {row.amortisation != null ? `~${row.amortisation} J` : ">25 J"}
          </div>
        </div>
        <div style={tileWrap}>
          <div style={tileLabel}>Rendite 25 J</div>
          <div style={{ ...tileValue, color: row.gewinn25 >= 0 ? v("--color-positive") : v("--color-negative") }}>
            {row.gewinn25 > 0 ? "+" : ""}
            {row.gewinn25.toLocaleString("de-DE")} €
          </div>
        </div>
        <div style={tileWrap}>
          <div style={tileLabel}>⌀ Ersparnis / Jahr</div>
          <div style={{ ...tileValue, color: v("--color-positive") }}>{row.ersparnisProJahr.toLocaleString("de-DE")} €</div>
        </div>
      </div>
      <Link
        href={row.href}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          marginTop: 12,
          padding: "9px 16px",
          borderRadius: v("--radius-md"),
          fontSize: 13,
          fontWeight: 700,
          background: v("--color-accent"),
          color: v("--color-text-on-accent"),
          textDecoration: "none",
        }}
      >
        Im Rechner öffnen →
      </Link>
    </div>
  );
}

const eur = (n: number) => `${n.toLocaleString("de-DE")} €`;

export default async function LohntSichPvMitSpeicherPage() {
  const prices = await fetchMarketPrices();
  const year = new Date().getFullYear();
  const rows = [0, 5, 10].map((sp) => computeExample(sp, prices));
  const [ohne, mit5, mit10] = rows;
  const strompreisCt = (prices.electricityPrice * 100).toLocaleString("de-DE", { maximumFractionDigits: 1 });
  const feedInCt = DEFAULT_FEED_IN.teilUnder10.toLocaleString("de-DE");
  // Marginal view: does the storage SURCHARGE pay for itself within its lifetime?
  const speicherAufpreis = mit10.kosten - ohne.kosten;
  const aufpreisPayback = Math.round(
    marginalPaybackYears(speicherAufpreis, mit10.gewinn25 - ohne.gewinn25),
  );
  const faqItems = pvSpeicherFaq(prices);

  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <Breadcrumb
          items={[
            { label: "Start", href: "/" },
            { label: "Ratgeber", href: "/ratgeber" },
            { label: "Lohnt sich PV mit Speicher?" },
          ]}
          jsonLd
        />

        <h1 style={S.h1}>Lohnt sich eine PV-Anlage mit Speicher?</h1>
        <p style={S.subtitle}>
          Der ehrliche Realitätscheck: wann sich ein Batteriespeicher rechnet, wann nicht —
          und was die Werbeversprechen gern weglassen. Alle Zahlen kommen aus demselben
          Modell wie unser Rechner, mit aktuellen Marktpreisen.
        </p>

        {/* ── Kurzantwort ── */}
        <div style={S.hero}>
          <span style={S.label}>Die Kurzantwort</span>
          <strong style={S.strong}>Meistens ja — inzwischen.</strong> Bei den aktuellen
          Speicherpreisen verdient ein passend dimensionierter Speicher seinen Aufpreis in
          typischen Haushalten innerhalb seiner Lebensdauer zurück und erhöht den Gesamtgewinn
          der Anlage deutlich. Das war vor einigen Jahren anders: Die Antwort ist mit den
          Preisen gekippt, nicht die Physik. Es bleiben aber klare Fälle, in denen sich ein
          Speicher <em>nicht</em> rechnet — sie stehen weiter unten.
        </div>
        <p style={{ ...S.p, fontSize: v("--font-size-small"), marginBottom: 0 }}>
          Stand {formatPriceDate(prices.validFrom)} · unverbindliche Näherungswerte, ohne Gewähr.
        </p>

        {/* ── Warum der Speicher die Rechnung verändert ── */}
        <h2 style={S.h2}>Warum ein Speicher die Rechnung verändert</h2>
        <p style={S.p}>
          Eine PV-Anlage produziert am meisten Strom mittags — verbraucht wird aber vor allem
          morgens und abends. Ohne Speicher fließt der Überschuss ins Netz, und dafür gibt es
          nur die <GlossaryTerm id="einspeiseverguetung">Einspeisevergütung</GlossaryTerm> von
          aktuell {feedInCt} ct/kWh. Selbst verbrauchter Strom spart dagegen den vollen
          Strompreis von rund {strompreisCt} ct/kWh.
        </p>
        <p style={S.p}>
          Genau diese Lücke ist das Geschäftsmodell des Speichers: Er verschiebt den
          Mittagsüberschuss in den Abend und die Nacht. Jede so verschobene Kilowattstunde
          ist rund das Vierfache wert. Der{" "}
          <GlossaryTerm id="eigenverbrauch">Eigenverbrauch</GlossaryTerm> — der Anteil des
          Solarstroms, den du selbst nutzt — steigt dadurch typisch von 15–30 % auf 40–60 %.
        </p>
        <p style={S.p}>
          Ob sich das <em>rechnet</em>, entscheidet der Preis pro Kilowattstunde{" "}
          <GlossaryTerm id="speicherkapazitaet">Speicherkapazität</GlossaryTerm>. Und der ist
          in den letzten Jahren stark gefallen — deshalb fällt die Antwort heute anders aus
          als in älteren Ratgebern.
        </p>

        {/* ── Eigenverbrauch vs. Autarkie ── */}
        <h2 style={S.h2}>Eigenverbrauch und Autarkie — nicht verwechseln</h2>
        <p style={S.p}>
          Zwei Prozentzahlen, die oft durcheinandergehen — und mit denen sich hervorragend
          schönrechnen lässt:
        </p>
        <div style={S.card}>
          <span style={S.accent}>Eigenverbrauch</span> — wie viel deines <em>erzeugten</em>{" "}
          Solarstroms nutzt du selbst? Das ist die Größe, die Geld verdient.
          <br />
          <span style={S.accent}>Autarkie</span> — wie viel deines <em>Verbrauchs</em> deckst
          du aus eigener Sonne? Das ist die gefühlte Unabhängigkeit vom Netz.
        </div>
        <p style={S.p}>
          Die oft beworbenen „70–80 % Unabhängigkeit" beziehen sich auf die{" "}
          <GlossaryTerm id="autarkie">Autarkie</GlossaryTerm> — nicht auf den Eigenverbrauch,
          und sie sind kein Renditeversprechen. Wichtig zu wissen: Die Autarkie sättigt bei
          rund 90 %. Ein Hausspeicher überbrückt gut einen Tag, aber keinen dunklen Winter —
          im Dezember liefert selbst eine große Anlage nur einen Bruchteil ihres
          Sommerertrags. Volle Netzunabhängigkeit ist mit einem Heimspeicher praktisch nicht
          erreichbar, und die letzten Prozentpunkte sind die teuersten.
        </p>

        {/* ── Beispielrechnung ── */}
        <h2 style={S.h2}>Beispielrechnung: 10 kWp mit und ohne Speicher</h2>
        <p style={S.p}>
          Ein Beispielhaushalt: 3–4 Personen ({PERSONEN[EX.personenIdx].verbrauch.toLocaleString("de-DE")} kWh
          Jahresverbrauch), teils im Homeoffice, {EX.kwp} <GlossaryTerm id="kwp">kWp</GlossaryTerm>-Anlage,
          konservativer Ertrag von {EX.ertragKwp} kWh pro kWp (deutscher Durchschnitt ohne
          Standortdaten). Gerechnet mit unserem Modell im realistischen Szenario
          (Strompreis +{(prices.electricityIncrease * 100).toLocaleString("de-DE")} %/Jahr):
        </p>
        <div style={{ ...S.card, padding: "6px 10px", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={S.th}></th>
                <th style={S.thNum}>Ohne Speicher</th>
                <th style={S.thNum}>5 kWh</th>
                <th style={S.thNum}>10 kWh</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={S.td}>Investition</td>
                {rows.map((r) => (
                  <td key={r.speicherKwh} style={S.tdNum}>{eur(r.kosten)}</td>
                ))}
              </tr>
              <tr>
                <td style={S.td}>Eigenverbrauch</td>
                {rows.map((r) => (
                  <td key={r.speicherKwh} style={S.tdNum}>{r.ev} %</td>
                ))}
              </tr>
              <tr>
                <td style={S.td}>Autarkie</td>
                {rows.map((r) => (
                  <td key={r.speicherKwh} style={S.tdNum}>{r.autarkie} %</td>
                ))}
              </tr>
              <tr>
                <td style={S.td}>Amortisation</td>
                {rows.map((r) => (
                  <td key={r.speicherKwh} style={S.tdNum}>
                    {r.amortisation != null ? `~${r.amortisation} Jahre` : "—"}
                  </td>
                ))}
              </tr>
              <tr>
                <td style={{ ...S.td, borderBottom: "none" }}>Gewinn nach 25 Jahren</td>
                {rows.map((r, i) => {
                  // Mehrgewinn des Speichers gegenüber "ohne Speicher", in %.
                  const mehrPct = i > 0 && rows[0].gewinn25 > 0
                    ? Math.round(((r.gewinn25 - rows[0].gewinn25) / rows[0].gewinn25) * 100)
                    : 0;
                  return (
                    <td key={r.speicherKwh} style={{ ...S.tdNum, borderBottom: "none", color: v("--color-positive"), fontWeight: 700 }}>
                      {eur(r.gewinn25)}
                      {mehrPct > 0 && (
                        <div style={{ fontSize: v("--font-size-caption"), color: v("--color-positive"), opacity: 0.75, fontWeight: 600, marginTop: 2, display: "inline-flex", alignItems: "center", gap: 2, justifyContent: "flex-end" }}>
                          <IconArrowUp size={9} /> +{mehrPct} %
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
        <p style={S.p}>
          Das Entscheidende ist der <strong style={S.strong}>Blick auf den Aufpreis</strong>:
          Der 10-kWh-Speicher kostet hier {eur(speicherAufpreis)} extra und holt diesen
          Aufpreis über den zusätzlichen Eigenverbrauch in rund {aufpreisPayback} Jahren
          wieder herein — deutlich innerhalb seiner Lebensdauer. Über 25 Jahre wächst der
          Gesamtgewinn von {eur(ohne.gewinn25)} auf {eur(mit10.gewinn25)}. Auffällig auch:
          Der Schritt von 5 auf 10 kWh kostet nur noch {eur(mit10.kosten - mit5.kosten)},
          weil die Installations-Basis nur einmal anfällt.
        </p>

        {/* ── Zwei Beispiele mit Chart + Kacheln + Deep-Link in den Rechner ── */}
        <p style={{ ...S.p, marginTop: 18 }}>
          Dieselben zwei Fälle als Amortisationskurve — die grüne Linie ist das realistische
          Szenario, die blasseren Linien der vorsichtige und der günstige Verlauf. Ein Klick
          öffnet die Anlage direkt im Rechner, wo du jede Annahme anpassen kannst:
        </p>
        <TeaserCard row={ohne} title="10 kWp ohne Speicher" badge="10 kWp · kein Speicher" />
        <TeaserCard row={mit10} title="10 kWp mit 10 kWh Speicher" badge="10 kWp · 10 kWh" />

        <p style={S.p}>
          Ehrlichkeitshalber eingerechnet: ein <strong style={S.strong}>Akku-Tausch nach{" "}
          {BATTERY_LIFETIME_YEARS} Jahren</strong> (zu dann voraussichtlich niedrigeren
          Preisen) und die Modulalterung von 0,5 % pro Jahr. Nicht enthalten: Wartungskosten
          (ca. 150–250 €/Jahr, betreffen alle Varianten gleichermaßen) und regionale
          Förderung, die das Ergebnis weiter verbessern kann.
        </p>
        <div style={S.card}>
          <span style={S.label}>Annahmen dieser Rechnung</span>
          Strompreis {strompreisCt} ct/kWh · Einspeisevergütung {feedInCt} ct/kWh
          (Teileinspeisung, 20 Jahre) · Preisstand {formatPriceDate(prices.validFrom)} ·
          ohne Förderung · Modell kalibriert an HTW-Berlin-Simulationsdaten.
          <br />
          <span style={S.muted}>
            Alle Beträge sind unverbindliche Näherungswerte ohne Gewähr — mit deinen echten
            Daten (Standort, Verbrauch, Angebotspreis) weicht das Ergebnis ab. Rechne es mit
            dem{" "}
            <Link href="/photovoltaik-rechner" style={S.link}>PV-Rechner</Link>{" "}
            für deinen Fall durch; die Methodik steht offen auf der{" "}
            <Link href="/methodik" style={S.link}>Methodik-Seite</Link>, alle Preisannahmen
            auf der <Link href="/datenstand" style={S.link}>Datenstand-Seite</Link>.
          </span>
        </div>

        {/* ── Wann ja / wann nein (zwei Listen nebeneinander) ── */}
        <h2 style={S.h2}>Lohnt sich ein Speicher — für wen?</h2>
        <ProConLists
          proTitle="Wann es sich lohnt"
          conTitle="Wo es eng wird"
          proItems={[
            { term: "Berufstätigen-Haushalt", desc: "Wer tagsüber weg ist, verbraucht abends — genau dann liefert der Speicher." },
            { term: "Neuinstallation", desc: "Speicher gleich mitkaufen ist pro Kilowattstunde günstiger als nachrüsten, die Montage fällt nur einmal an." },
            { term: "E-Auto mit Abendladung", desc: "Wer nach Feierabend lädt, holt sich den Mittagsstrom über den Speicher ins Auto." },
            { term: "Niedrige Einspeisevergütung", desc: "Je kleiner die Vergütung, desto wertvoller jede selbst genutzte Kilowattstunde — die Vergütung sinkt für Neuanlagen weiter." },
          ]}
          conItems={[
            { term: "Alte Bestandsanlage mit hoher Vergütung", desc: "Wer noch über 30 ct/kWh Einspeisevergütung bekommt, verdient mit Einspeisen mehr als mit Selbstverbrauch — Speicher lohnt dort nicht." },
            { term: "Sehr hoher Tagesverbrauch", desc: "Wer ohnehin mittags verbraucht (Homeoffice, Klimaanlage, Pool), nutzt den Strom schon direkt — der Speicher hat weniger zu verschieben." },
            { term: "Deutlich überteuertes Angebot", desc: "Die Rechnung oben gilt für Marktpreise. Liegt der Angebotspreis pro Kilowattstunde weit darüber, kippt sie — Vergleichsangebote einholen." },
            { term: "Überdimensionierung", desc: "Ab einer gewissen Größe ist der Speicher im Sommer ohnehin voll und im Winter leer — die zweite Hälfte eines zu großen Speichers arbeitet kaum." },
          ]}
        />
        <p style={S.p}>
          Ein Sonderfall ist die <strong style={S.strong}>Wärmepumpe</strong>: Sie erhöht
          zwar den Stromverbrauch stark, zieht aber rund 80 % davon zwischen Oktober und
          April — genau dann, wenn die Sonne wenig liefert und der Speicher selten voll
          wird. Der Speicher-Nutzen fällt bei Wärmepumpen-Haushalten deshalb kleiner aus,
          als die reine Verbrauchsmenge vermuten lässt; unser Modell rechnet diese
          Saisonkorrektur explizit ein. Was eine Wärmepumpe selbst spart, zeigt der{" "}
          <Link href="/waermepumpe-rechner" style={S.link}>Wärmepumpen-Rechner</Link>.
        </p>

        {/* ── CTA ── */}
        <div style={{ ...S.hero, marginTop: 28 }}>
          <span style={S.label}>Für deinen Fall durchrechnen</span>
          <p style={{ ...S.p, color: v("--color-text-primary"), marginBottom: 14 }}>
            Vier Fragen, sofort das Ergebnis — ohne Anmeldung, ohne Verkaufsanrufe. Alle
            Annahmen sind im Ergebnis sichtbar und anpassbar.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href="/photovoltaik-rechner" style={S.ctaButton}>
              Anlage mit Speicher rechnen →
            </Link>
            <Link href="/pv-bedarf-berechnen" style={S.ctaSecondary}>
              Was passt zu mir?
            </Link>
          </div>
        </div>

        {/* ── FAQ (visible accordion + FAQPage JSON-LD from the same data) ── */}
        <Faq items={faqItems} title="Häufige Fragen zu PV mit Speicher" currentPath="/lohnt-sich-pv-mit-speicher" />

        <p style={{ ...S.p, fontSize: v("--font-size-small") }}>
          Verwandte Seiten: <Link href="/lohnt-sich-pv-ohne-einspeiseverguetung" style={S.link}>Lohnt sich PV ohne Einspeisevergütung?</Link> ·{" "}
          <Link href="/methodik" style={S.link}>So rechnen wir</Link> ·{" "}
          <Link href="/datenstand" style={S.link}>Aktuelle Preise &amp; Annahmen</Link> ·{" "}
          <Link href="/photovoltaik-foerderung" style={S.link}>PV-Förderung vor Ort</Link> ·{" "}
          <Link href="/balkonkraftwerk-rechner" style={S.link}>Balkonkraftwerk-Rechner</Link> ·{" "}
          <Link href="/glossar" style={S.link}>Glossar</Link>
        </p>
        <p style={{ ...S.p, fontSize: v("--font-size-small"), marginTop: 16 }}>
          Zuletzt aktualisiert: {new Date().toLocaleDateString("de-DE", { month: "long", year: "numeric" })} —
          die Zahlen auf dieser Seite werden automatisch aus den aktuellen Marktpreisen
          berechnet ({year}).
        </p>
      </div>
    </div>
  );
}
