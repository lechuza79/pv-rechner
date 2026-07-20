import { Metadata } from "next";
import Link from "next/link";
import { IconArrowRight } from "../../../components/Icons";
import GlossaryTerm from "../../../components/GlossaryTerm";
import Faq from "../../../components/Faq";
import { pvOhneEinspeisungFaq } from "../../../lib/faq";
import { v, iconSizes } from "../../../lib/theme";
import { fetchMarketPrices, formatPriceDate } from "../../../lib/prices-server";
import { type PriceConfig } from "../../../lib/prices-config";
import { DEFAULT_FEED_IN } from "../../../lib/feedin-config";
import {
  calc,
  calcEigenverbrauch,
  calcWeightedFeedIn,
  estimateCost,
  batteryReplaceCost,
} from "../../../lib/calc";
import { simulatePvYear } from "../../../lib/pv-sim";
import { PERSONEN, NUTZUNG, SCENARIOS, SPEICHER, YEARS, FEED_IN_YEARS } from "../../../lib/constants";
import { pageMetadata } from "../../../lib/seo";
import Chart from "../photovoltaik-rechner/_components/Chart";

// Figures on this page come live from the same models the calculator uses
// (prices from Supabase market_prices with config fallback). ISR keeps them
// fresh without a rebuild — same pattern as /lohnt-sich-pv-mit-speicher.
export const revalidate = 3600;

// Dated statement of a PENDING legislative process (EEG reform draft), not a
// rolling "current year" value — deliberately hardcoded (see CLAUDE.md rule).
// The EEG guardian updates it together with the reform notes in rechner.tsx
// and lib/faq.ts when the legal situation changes.
const REFORM_STAND = "Juli 2026";

export async function generateMetadata(): Promise<Metadata> {
  const year = new Date().getFullYear();
  return pageMetadata({
    path: "/lohnt-sich-pv-ohne-einspeiseverguetung",
    title: `Lohnt sich PV ohne Einspeisevergütung? Ehrliche Rechnung ${year}`,
    description:
      "Die Einspeisevergütung für Neuanlagen soll ab 2027 fallen — lohnt sich Photovoltaik dann noch? Ja, wenn der Eigenverbrauch stimmt. Mit Beispielrechnung bei Vergütung null, live gerechnet, ohne Anmeldung.",
    ogImageTitle: "Lohnt sich PV ohne Einspeisevergütung?",
    ogImageSubtitle: "Die ehrliche Rechnung zur EEG-Reform 2027.",
  });
}

// ─── Styles (same content-page conventions as /lohnt-sich-pv-mit-speicher) ───
const S = {
  page: {
    background: v("--color-bg"),
    fontFamily: v("--font-text"),
    color: v("--color-text-primary"),
    minHeight: "100vh",
    padding: "20px 16px",
  },
  wrap: { maxWidth: v("--page-max-width"), margin: "0 auto" },
  back: {
    fontSize: 13,
    color: v("--color-text-secondary"),
    textDecoration: "none",
    display: "inline-block",
    marginBottom: 24,
  },
  h1: {
    fontSize: 22,
    fontWeight: 800,
    letterSpacing: "-0.02em",
    color: v("--color-text-primary"),
    lineHeight: 1.25,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: v("--color-text-muted"),
    marginBottom: 24,
    lineHeight: 1.6,
  },
  h2: {
    fontSize: 16,
    fontWeight: 700,
    color: v("--color-text-primary"),
    marginTop: 32,
    marginBottom: 10,
  },
  p: {
    fontSize: 13,
    color: v("--color-text-muted"),
    lineHeight: 1.7,
    marginBottom: 10,
  },
  strong: { fontWeight: 700, color: v("--color-text-primary") },
  card: {
    background: v("--color-bg"),
    borderRadius: v("--radius-md"),
    padding: "14px 16px",
    border: `1px solid ${v("--color-border")}`,
    marginBottom: 12,
    fontSize: 13,
    color: v("--color-text-muted"),
    lineHeight: 1.7,
  },
  hero: {
    background: v("--color-bg-accent"),
    borderRadius: v("--radius-lg"),
    padding: "16px 18px",
    marginBottom: 8,
    fontSize: 13.5,
    color: v("--color-text-primary"),
    lineHeight: 1.7,
  },
  label: {
    fontSize: 11,
    fontWeight: 700,
    color: v("--color-text-secondary"),
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
    marginBottom: 6,
    display: "block",
  },
  accent: { color: v("--color-accent"), fontWeight: 600 },
  positive: { color: v("--color-positive"), fontWeight: 600 },
  muted: { color: v("--color-text-muted") },
  link: { color: v("--color-accent"), textDecoration: "none", fontWeight: 600 },
  ctaButton: {
    display: "inline-block",
    padding: "10px 18px",
    borderRadius: v("--radius-md"),
    fontSize: 13,
    fontWeight: 700,
    background: v("--color-accent"),
    color: v("--color-text-on-accent"),
    textDecoration: "none",
  },
  ctaSecondary: {
    display: "inline-block",
    padding: "10px 18px",
    borderRadius: v("--radius-md"),
    fontSize: 13,
    fontWeight: 700,
    border: `1px solid ${v("--color-border")}`,
    color: v("--color-accent"),
    textDecoration: "none",
  },
  th: {
    textAlign: "left" as const,
    fontSize: 11,
    fontWeight: 700,
    color: v("--color-text-secondary"),
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
    padding: "8px 6px",
    borderBottom: `1px solid ${v("--color-border")}`,
  },
  thNum: {
    textAlign: "right" as const,
    fontSize: 11,
    fontWeight: 700,
    color: v("--color-text-secondary"),
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
    padding: "8px 6px",
    borderBottom: `1px solid ${v("--color-border")}`,
  },
  td: {
    fontSize: 12.5,
    color: v("--color-text-muted"),
    padding: "8px 6px",
    borderBottom: `1px solid ${v("--color-border")}`,
    lineHeight: 1.4,
  },
  tdNum: {
    fontFamily: v("--font-mono"),
    fontSize: 12.5,
    color: v("--color-text-primary"),
    textAlign: "right" as const,
    padding: "8px 6px",
    borderBottom: `1px solid ${v("--color-border")}`,
    whiteSpace: "nowrap" as const,
  },
};

// ─── Example calculation ─────────────────────────────────────────────────────
// One reference household, feed-in ON vs OFF — computed with the EXACT same
// functions the calculator uses (shared calc base, CLAUDE.md). "Feed-in off" is
// literally the calculator's Einspeisung-3-State "Aus" (einspeisung: 0), which
// the deep links reproduce via the share param eia=0.
const EX = {
  kwp: 10,
  ertragKwp: 950, // conservative German average, same default as the calculator without PLZ
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
  /** Three amortization curves (pess./real./opt.) for the <Chart> teaser. */
  scenarios: { id: string; color: string; data: ReturnType<typeof calc> }[];
  /** Deep link that pre-loads this exact config (incl. feed-in state). */
  href: string;
}

// kWh → SPEICHER option index (share-URL param "s").
const SPEICHER_IDX: Record<number, number> = Object.fromEntries(
  SPEICHER.map((o, i) => [o.kwh, i] as const),
);

function computeExample(speicherKwh: number, feedInActive: boolean, prices: PriceConfig): ExampleRow {
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
  // Feed-in OFF = the calculator's 3-state "Aus": einspeisung is simply 0.
  const feedIn = feedInActive
    ? calcWeightedFeedIn(EX.kwp, DEFAULT_FEED_IN.teilUnder10, DEFAULT_FEED_IN.teilOver10)
    : 0;
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
  // Scenario curves identical to the calculator (rechner.tsx → scenarioData):
  // scenario EV capped at the physical maximum (consumption / yield).
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
  // Deep-link params reproduce the teaser numbers 1:1 in the calculator.
  // eia=0 sets the Einspeisung-3-State to "Aus"; st/er are passed explicitly
  // because the calculator's own defaults differ slightly (see Speicher guide).
  const params = new URLSearchParams({
    a: "2", // 10 kWp (ANLAGEN index)
    s: String(SPEICHER_IDX[speicherKwh] ?? 0),
    p: String(EX.personenIdx),
    n: String(EX.nutzungIdx),
    st: String(prices.electricityPrice),
    er: String(EX.ertragKwp),
    eia: feedInActive ? "1" : "0",
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

// One teaser card: title + amortization chart + result-style tiles + deep link.
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

export default async function LohntSichPvOhneEinspeisungPage() {
  const prices = await fetchMarketPrices();
  const year = new Date().getFullYear();
  // Feed-in OFF (the headline scenario) and feed-in ON (today's reference).
  const ohneSpNull = computeExample(0, false, prices);
  const mitSpNull = computeExample(10, false, prices);
  const ohneSpEeg = computeExample(0, true, prices);
  const mitSpEeg = computeExample(10, true, prices);
  const strompreisCt = (prices.electricityPrice * 100).toLocaleString("de-DE", { maximumFractionDigits: 1 });
  const feedInCt = DEFAULT_FEED_IN.teilUnder10.toLocaleString("de-DE");
  const priceRatio = Math.round(prices.electricityPrice * 100 / DEFAULT_FEED_IN.teilUnder10);
  // Year-1 revenue split for the with-storage case (mechanism section): how much
  // of the annual benefit is feed-in revenue vs self-consumption savings?
  const jahresertrag = EX.kwp * EX.ertragKwp;
  const evKwh = Math.round(jahresertrag * mitSpEeg.ev / 100);
  const einspeiseKwh = jahresertrag - evKwh;
  const ersparnis1 = Math.round(evKwh * prices.electricityPrice);
  const erloes1 = Math.round(einspeiseKwh * DEFAULT_FEED_IN.teilUnder10 / 100);
  const erloesAnteil = Math.round((erloes1 / (erloes1 + ersparnis1)) * 100);
  const faqItems = pvOhneEinspeisungFaq(prices);

  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <Link href="/" style={S.back}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <IconArrowRight size={iconSizes.sm} style={{ transform: "rotate(180deg)" }} /> Zur Startseite
          </span>
        </Link>

        <h1 style={S.h1}>Lohnt sich eine PV-Anlage ohne Einspeisevergütung?</h1>
        <p style={S.subtitle}>
          Die Einspeisevergütung für Neuanlagen soll ab 2027 fallen — so sieht es ein
          Reformentwurf vor. Hier ist die ehrliche Rechnung dazu: was die Vergütung heute
          wirklich beiträgt, und ob sich eine Anlage auch mit Vergütung null trägt. Alle
          Zahlen kommen aus demselben Modell wie unser Rechner, mit aktuellen Marktpreisen.
        </p>

        {/* ── Kurzantwort ── */}
        <div style={S.hero}>
          <span style={S.label}>Die Kurzantwort</span>
          <strong style={S.strong}>Ja — wenn der Eigenverbrauch stimmt.</strong> Eine
          PV-Anlage verdient ihr Geld heute vor allem über den selbst verbrauchten Strom:
          Jede selbst genutzte Kilowattstunde spart rund {strompreisCt} ct, die Einspeisung
          bringt nur ca. {feedInCt} ct. Wer mit Speicher, Wärmepumpe oder E-Auto viel vom
          eigenen Strom nutzt, ist von der Vergütung kaum abhängig — die Rechnung unten
          zeigt es mit Vergütung null. Ohne nennenswerten Eigenverbrauch kippt die
          Rechnung dagegen: Reine Einspeise-Konzepte tragen sich ohne Vergütung nicht.
        </div>
        <p style={{ ...S.p, fontSize: 11.5, marginBottom: 0 }}>
          Stand {formatPriceDate(prices.validFrom)} · unverbindliche Näherungswerte, ohne Gewähr.
        </p>

        {/* ── EEG-Reform: Sachstand ── */}
        <h2 style={S.h2}>Was gerade geplant ist — und was nicht</h2>
        <p style={S.p}>
          Auslöser der Debatte ist ein <strong style={S.strong}>Referentenentwurf des
          Bundeswirtschaftsministeriums</strong> zur EEG-Reform 2027. Wichtig vorweg: Das
          ist ein laufendes Gesetzgebungsverfahren — <em>geplant</em>, nicht beschlossen.
          Der Sachstand (Stand: {REFORM_STAND}):
        </p>
        <div style={S.card}>
          <span style={S.accent}>Neuanlagen ab 2027:</span> Die dauerhaft garantierte
          Einspeisevergütung für neue PV-Anlagen bis 25 kWp soll entfallen. Die
          überarbeitete Entwurfsfassung sieht eine Übergangsphase vor: zunächst 36 Monate
          reduzierte Vergütung, danach ein befristeter Bonus für die Direktvermarktung.
          <br />
          <span style={S.accent}>Bestandsschutz:</span> Anlagen, die bis Ende 2026 in
          Betrieb gehen, behalten ihre zugesagte Vergütung für die vollen{" "}
          {FEED_IN_YEARS} Jahre. Die Reform beträfe nach dem Entwurf ausschließlich
          Neuanlagen.
          <br />
          <span style={S.accent}>Verfahrensstand:</span> Zum Stand {REFORM_STAND} war die
          Reform noch nicht final beschlossen — der Weg durch Kabinett, Bundestag und
          Bundesrat stand noch aus. Hintergrund ist die EU-Beihilfegenehmigung des EEG,
          die Ende 2026 ausläuft.
          <br />
          <span style={S.muted}>
            Ohne Gewähr — verbindlich ist allein die offizielle Gesetzeslage. Die aktuell
            geltenden Vergütungssätze stehen auf der{" "}
            <Link href="/datenstand" style={S.link}>Datenstand-Seite</Link>.
          </span>
        </div>

        {/* ── Mechanismus ── */}
        <h2 style={S.h2}>Warum die Vergütung die Rechnung längst nicht mehr trägt</h2>
        <p style={S.p}>
          Selbst verbrauchter Strom spart den vollen Strompreis von rund {strompreisCt}{" "}
          ct/kWh. Eingespeister Strom bringt die{" "}
          <GlossaryTerm id="einspeiseverguetung">Einspeisevergütung</GlossaryTerm> von
          aktuell {feedInCt} ct/kWh — selbst genutzter Strom ist damit rund das{" "}
          {priceRatio}-Fache wert. Wirtschaftlich ist die Entscheidung damit seit Jahren
          gefallen: Das Geld verdient der{" "}
          <GlossaryTerm id="eigenverbrauch">Eigenverbrauch</GlossaryTerm>, nicht die
          Einspeisung.
        </p>
        <p style={S.p}>
          Konkret in unserem Beispielhaushalt mit Speicher: Von den jährlichen Einnahmen
          im ersten Jahr kommen rund {eur(ersparnis1)} aus ersparten Stromkosten und nur
          etwa {eur(erloes1)} aus der Einspeisung — die Vergütung steuert also rund{" "}
          {erloesAnteil} % bei. Fällt sie weg, fehlt dieser Anteil; die Anlage bleibt
          trotzdem rentabel, nur langsamer.
        </p>
        <p style={S.p}>
          Dazu kommt: Die EEG-Vergütung ist <strong style={S.strong}>schon heute auf{" "}
          {FEED_IN_YEARS} Jahre begrenzt</strong>. Unser Modell rechnet sie deshalb ohnehin
          nur {FEED_IN_YEARS} Jahre an, danach null — die Eigenverbrauchs-Ersparnis läuft
          über die gesamten {YEARS} Jahre weiter. Eine Anlage, die sich über den
          Eigenverbrauch trägt, war also nie auf die Vergütung als Dauerstütze gebaut.
        </p>

        {/* ── Beispielrechnung mit Vergütung null ── */}
        <h2 style={S.h2}>Beispielrechnung: 10 kWp mit Vergütung null</h2>
        <p style={S.p}>
          Ein Beispielhaushalt: 3–4 Personen ({PERSONEN[EX.personenIdx].verbrauch.toLocaleString("de-DE")} kWh
          Jahresverbrauch), teils im Homeoffice, {EX.kwp} <GlossaryTerm id="kwp">kWp</GlossaryTerm>-Anlage,
          konservativer Ertrag von {EX.ertragKwp} kWh pro kWp. Die Einspeisevergütung steht
          in dieser Rechnung komplett auf null — im Rechner lässt sich die Einspeisung
          dafür einfach auf „Aus" stellen, genau so sind diese Zahlen gerechnet
          (realistisches Szenario, Strompreis +{(prices.electricityIncrease * 100).toLocaleString("de-DE")} %/Jahr):
        </p>
        <div style={{ ...S.card, padding: "6px 10px", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={S.th}></th>
                <th style={S.thNum}>Ohne Speicher</th>
                <th style={S.thNum}>Mit 10 kWh Speicher</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={S.td}>Investition</td>
                {[ohneSpNull, mitSpNull].map((r) => (
                  <td key={r.speicherKwh} style={S.tdNum}>{eur(r.kosten)}</td>
                ))}
              </tr>
              <tr>
                <td style={S.td}>Eigenverbrauch</td>
                {[ohneSpNull, mitSpNull].map((r) => (
                  <td key={r.speicherKwh} style={S.tdNum}>{r.ev} %</td>
                ))}
              </tr>
              <tr>
                <td style={S.td}>Autarkie</td>
                {[ohneSpNull, mitSpNull].map((r) => (
                  <td key={r.speicherKwh} style={S.tdNum}>{r.autarkie} %</td>
                ))}
              </tr>
              <tr>
                <td style={S.td}>Amortisation (Vergütung null)</td>
                {[ohneSpNull, mitSpNull].map((r) => (
                  <td key={r.speicherKwh} style={S.tdNum}>
                    {r.amortisation != null ? `~${r.amortisation} Jahre` : "—"}
                  </td>
                ))}
              </tr>
              <tr>
                <td style={S.td}>Zum Vergleich: mit heutiger Vergütung</td>
                {[ohneSpEeg, mitSpEeg].map((r) => (
                  <td key={r.speicherKwh} style={{ ...S.tdNum, color: v("--color-text-muted") }}>
                    {r.amortisation != null ? `~${r.amortisation} Jahre` : "—"}
                  </td>
                ))}
              </tr>
              <tr>
                <td style={{ ...S.td, borderBottom: "none" }}>Gewinn nach {YEARS} Jahren (Vergütung null)</td>
                {[ohneSpNull, mitSpNull].map((r) => (
                  <td key={r.speicherKwh} style={{ ...S.tdNum, borderBottom: "none", color: r.gewinn25 >= 0 ? v("--color-positive") : v("--color-negative"), fontWeight: 700 }}>
                    {eur(r.gewinn25)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <p style={S.p}>
          Zwei Dinge fallen auf — und wir sagen beide ehrlich. Erstens:{" "}
          <strong style={S.strong}>Ohne Speicher wird es knapp.</strong> Mit Vergütung null
          und nur {ohneSpNull.ev} % Eigenverbrauch trägt sich die Anlage gerade so
          {ohneSpNull.amortisation != null ? ` (~${ohneSpNull.amortisation} Jahre Amortisation)` : ""} —
          der Überschuss verpufft unvergütet ins Netz. Zweitens:{" "}
          <strong style={S.strong}>Mit Speicher bleibt die Rechnung klar positiv.</strong>{" "}
          Er hebt den Eigenverbrauch auf {mitSpNull.ev} %
          {mitSpNull.amortisation != null ? `, verkürzt die Amortisation auf ~${mitSpNull.amortisation} Jahre` : ""}{" "}
          und lässt über {YEARS} Jahre {eur(mitSpNull.gewinn25)} Gewinn übrig — nur{" "}
          {eur(mitSpEeg.gewinn25 - mitSpNull.gewinn25)} weniger als mit heutiger Vergütung.
          Genau das ist der Kern der Debatte: Fällt die Vergütung, entscheidet der
          Eigenverbrauch — und der Speicher wird vom Nice-to-have zum tragenden Baustein.
        </p>

        {/* ── Zwei Beispiele mit Chart + Kacheln + Deep-Link in den Rechner ── */}
        <p style={{ ...S.p, marginTop: 18 }}>
          Dieselben zwei Fälle als Amortisationskurve, beide mit Vergütung null — die grüne
          Linie ist das realistische Szenario. Ein Klick öffnet die Anlage direkt im
          Rechner mit abgeschalteter Einspeisung, wo du jede Annahme anpassen kannst:
        </p>
        <TeaserCard row={ohneSpNull} title="10 kWp ohne Speicher, Vergütung null" badge="10 kWp · Einspeisung aus" />
        <TeaserCard row={mitSpNull} title="10 kWp mit 10 kWh Speicher, Vergütung null" badge="10 kWp · 10 kWh · Einspeisung aus" />

        <div style={S.card}>
          <span style={S.label}>Annahmen dieser Rechnung</span>
          Strompreis {strompreisCt} ct/kWh · Einspeisevergütung 0 ct/kWh (Vergleichszeile:
          Teileinspeisung {feedInCt} ct/kWh, {FEED_IN_YEARS} Jahre) · Preisstand{" "}
          {formatPriceDate(prices.validFrom)} · ohne Förderung · inkl. Akku-Tausch und
          0,5 % Modulalterung pro Jahr · Modell kalibriert an HTW-Berlin-Simulationsdaten.
          <br />
          <span style={S.muted}>
            Alle Beträge sind unverbindliche Näherungswerte ohne Gewähr — mit deinen echten
            Daten (Standort, Verbrauch, Angebotspreis) weicht das Ergebnis ab. Rechne es mit
            dem <Link href="/photovoltaik-rechner" style={S.link}>PV-Rechner</Link> für
            deinen Fall durch; die Methodik steht offen auf der{" "}
            <Link href="/methodik" style={S.link}>Methodik-Seite</Link>, alle Preisannahmen
            auf der <Link href="/datenstand" style={S.link}>Datenstand-Seite</Link>.
          </span>
        </div>

        {/* ── Was den Eigenverbrauch hebt ── */}
        <h2 style={S.h2}>Was den Eigenverbrauch hebt</h2>
        <p style={S.p}>
          Ohne Vergütung zählt nur noch, wie viel vom eigenen Strom im Haus bleibt. Die
          wirksamen Hebel, grob nach Wirkung sortiert:
        </p>
        <div style={S.card}>
          <span style={S.positive}>Batteriespeicher:</span> verschiebt den Mittagsüberschuss
          in Abend und Nacht — der größte einzelne Hebel. Ob und wann er sich rechnet,
          steht im <Link href="/lohnt-sich-pv-mit-speicher" style={S.link}>Speicher-Ratgeber</Link>.
          <br />
          <span style={S.positive}>Wärmepumpe:</span> macht Heizen zum Stromverbrauch und
          nutzt vor allem in der Übergangszeit viel eigenen Solarstrom. Was sie selbst
          spart, rechnet der <Link href="/waermepumpe-rechner" style={S.link}>Wärmepumpen-Rechner</Link>.
          <br />
          <span style={S.positive}>E-Auto:</span> wer tagsüber oder über den Speicher lädt,
          holt sich den Solarstrom in den Tank — bei 15.000 km/Jahr sind das rund
          2.700 kWh zusätzlicher Verbrauch.
          <br />
          <span style={S.positive}>Verbrauch in den Tag verschieben:</span> Spülmaschine,
          Waschmaschine, Warmwasser mittags statt abends laufen lassen — kostenlos und
          sofort wirksam.
        </div>

        {/* ── Wann es eng wird ── */}
        <h2 style={S.h2}>Wo es ohne Vergütung eng wird</h2>
        <div style={S.card}>
          <span style={S.accent}>Volleinspeisung:</span> Konzepte, die den gesamten Strom
          einspeisen (z. B. große Dächer ohne Eigenverbrauch), leben komplett von der
          Vergütung — ohne sie tragen sie sich nicht.
          <br />
          <span style={S.accent}>Überdimensionierung:</span> „Das Dach voll machen" lohnt
          ohne Vergütung weniger. Was über den eigenen Verbrauch hinausgeht, bringt nichts
          mehr ein — die Anlage passend zum Verbrauch auszulegen wird wichtiger. Die{" "}
          <Link href="/pv-bedarf-berechnen" style={S.link}>Empfehlung</Link> rechnet die
          passende Größe aus.
          <br />
          <span style={S.accent}>Sehr niedriger Verbrauch:</span> Ein 1-Personen-Haushalt
          mit 1.800 kWh/Jahr kann nur wenig Solarstrom selbst nutzen — hier verlängert
          sich die Amortisation deutlich. Ein{" "}
          <Link href="/balkonkraftwerk-rechner" style={S.link}>Balkonkraftwerk</Link> passt
          dann oft besser als eine große Dachanlage.
          <br />
          <span style={S.accent}>Überteuerte Angebote:</span> Die Rechnung oben gilt für
          Marktpreise. Ohne den Vergütungs-Puffer kippt sie bei deutlich überhöhten
          Angebotspreisen schneller — Vergleichsangebote werden wichtiger.
        </div>

        {/* ── CTA ── */}
        <div style={{ ...S.hero, marginTop: 28 }}>
          <span style={S.label}>Für deinen Fall durchrechnen</span>
          <p style={{ ...S.p, color: v("--color-text-primary"), marginBottom: 14 }}>
            Im Rechner kannst du die Einspeisevergütung mit einem Klick abschalten und
            siehst sofort, wie sich deine Anlage ohne Vergütung trägt — ohne Anmeldung,
            ohne Verkaufsanrufe.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href={mitSpNull.href} style={S.ctaButton}>
              Ohne Vergütung rechnen →
            </Link>
            <Link href="/pv-bedarf-berechnen" style={S.ctaSecondary}>
              Was passt zu mir?
            </Link>
          </div>
        </div>

        {/* ── FAQ (visible accordion + FAQPage JSON-LD from the same data) ── */}
        <Faq items={faqItems} title="Häufige Fragen zu PV ohne Einspeisevergütung" currentPath="/lohnt-sich-pv-ohne-einspeiseverguetung" />

        <p style={{ ...S.p, fontSize: 12 }}>
          Verwandte Seiten: <Link href="/lohnt-sich-pv-mit-speicher" style={S.link}>Lohnt sich PV mit Speicher?</Link> ·{" "}
          <Link href="/methodik" style={S.link}>So rechnen wir</Link> ·{" "}
          <Link href="/datenstand" style={S.link}>Aktuelle Preise &amp; Annahmen</Link> ·{" "}
          <Link href="/photovoltaik-foerderung" style={S.link}>PV-Förderung vor Ort</Link> ·{" "}
          <Link href="/glossar" style={S.link}>Glossar</Link>
        </p>
        <p style={{ ...S.p, fontSize: 11.5, marginTop: 16 }}>
          Zuletzt aktualisiert: {new Date().toLocaleDateString("de-DE", { month: "long", year: "numeric" })} —
          die Zahlen auf dieser Seite werden automatisch aus den aktuellen Marktpreisen
          berechnet ({year}). Angaben zur geplanten EEG-Reform: Stand {REFORM_STAND}, ohne
          Gewähr; verbindlich ist die offizielle Gesetzeslage.
        </p>
      </div>
    </div>
  );
}
