import { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "../../../components/Breadcrumb";
import ProConLists from "../../../components/ProConLists";
import GlossaryTerm from "../../../components/GlossaryTerm";
import Faq from "../../../components/Faq";
import { pvOhneEinspeisungFaq } from "../../../lib/faq";
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
} from "../../../lib/calc";
import { simulatePvYear, simulateExampleDay, EXAMPLE_DAYS } from "../../../lib/pv-sim";
import { PERSONEN, NUTZUNG, SCENARIOS, SPEICHER, YEARS, FEED_IN_YEARS, NO_PLZ_DEFAULT_YIELD } from "../../../lib/constants";
import { pageMetadata } from "../../../lib/seo";
import SpeicherVergleich, { type VergleichColumn, type ColScenario, type ScenarioTabMeta } from "./_components/SpeicherVergleich";
import DayProfileChart, { DAY_C_SUN, DAY_C_DIRECT, DAY_C_BATTERY, DAY_C_GRID, DAY_C_SOC, DayLegendDot } from "../../../components/DayProfileChart";

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
    fontSize: v("--font-size-small"),
    color: v("--color-text-muted"),
    padding: "9px 6px",
    borderBottom: `1px solid ${v("--color-border")}`,
    lineHeight: 1.4,
  },
  tdNum: {
    fontFamily: v("--font-mono"),
    fontSize: v("--font-size-small"),
    color: v("--color-text-primary"),
    textAlign: "right" as const,
    padding: "9px 6px",
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

const eur = (n: number) => `${n.toLocaleString("de-DE")} €`;

// Deep link that opens the calculator on this exact config in "ohne Vergütung"
// mode (eia=0). Includes the scenario (sc) unless it's the default (realistic),
// so the calculator lands on the same Strompreis-Szenario as the active tab.
function deepLink(speicherKwh: number, scenarioId: string, prices: PriceConfig): string {
  const params = new URLSearchParams({
    a: "2", // 10 kWp (ANLAGEN index)
    s: String(SPEICHER_IDX[speicherKwh] ?? 0),
    p: String(EX.personenIdx),
    n: String(EX.nutzungIdx),
    st: String(prices.electricityPrice),
    er: String(EX.ertragKwp),
    eia: "0", // Einspeisung „Aus" — page premise
  });
  if (scenarioId !== "realistic") params.set("sc", scenarioId);
  return `/photovoltaik-rechner?${params.toString()}`;
}

// One comparison column (a storage size) → per-scenario amortisation/gewinn/line
// derived from the already-computed scenario curves, so the tabs switch without
// any recompute on the client.
function toColumn(key: string, title: string, sub: string, row: ExampleRow, prices: PriceConfig): VergleichColumn {
  const byScenario: Record<string, ColScenario> = {};
  for (const s of row.scenarios) {
    byScenario[s.id] = {
      amortisation: s.data.be?.i ?? null,
      gewinn25: s.data.total,
      line: s,
      href: deepLink(row.speicherKwh, s.id, prices),
    };
  }
  return { key, title, sub, kosten: row.kosten, byScenario };
}

export default async function LohntSichPvOhneEinspeisungPage() {
  const prices = await fetchMarketPrices();
  const year = new Date().getFullYear();
  // ONE typical system (10 kWp + 10 kWh) in two feed-in states: today's tariff
  // vs. the planned "no feed-in" case (calculator's 3-state "Aus", einspeisung 0).
  const mitSpEeg = computeExample(10, true, prices);   // mit Einspeisevergütung (heute)
  const mitSpNull = computeExample(10, false, prices); // ohne Einspeisevergütung (geplant)
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

  // Amortisations-Vergleich: alles im „ohne Vergütung"-Modus (einspeisung 0).
  // Oben Strompreis-Szenario-Tabs (SCENARIOS), darunter zwei Spalten ohne↔mit
  // Speicher — der aktive Tab schaltet beide Spalten. Zahlen je Szenario aus den
  // bereits berechneten Kurven; keine Client-Rechnung.
  const ohneSpNull = computeExample(0, false, prices); // ohne Speicher, ohne Vergütung
  // mitSpNull (10 kWh, ohne Vergütung) ist oben schon berechnet.
  const scenarioTabs: ScenarioTabMeta[] = SCENARIOS.map((s) => ({
    id: s.id,
    label: s.label,
    sub: `+${(s.strom * 100).toLocaleString("de-DE")} %/Jahr`,
    explain: s.explain,
  }));
  const vergleichColumns: VergleichColumn[] = [
    toColumn("ohne", "Ohne Speicher", "10 kWp · kein Speicher", ohneSpNull, prices),
    toColumn("mit", "Mit 10 kWh Speicher", "10 kWp · 10 kWh Speicher", mitSpNull, prices),
  ];
  // Realistic-scenario headline figures for the surrounding prose.
  const ohneReal = ohneSpNull.scenarios.find((s) => s.id === "realistic")?.data;
  const mitReal = mitSpNull.scenarios.find((s) => s.id === "realistic")?.data;
  const ohneRealAmort = ohneReal?.be?.i ?? null;
  const mitRealAmort = mitReal?.be?.i ?? null;
  const ohneRealGewinn = ohneReal?.total ?? 0;
  const mitRealGewinn = mitReal?.total ?? 0;

  // Tagesverlauf-Vergleich (geteilte Stundensimulation): derselbe sonnige
  // Beispieltag, nur Speicher 0 vs. 10 kWh. Zeigt, wie der Mittagsüberschuss mit
  // Speicher in den Abend wandert → die selbst genutzte (grüne) Fläche wächst.
  const exDay = EXAMPLE_DAYS.find((d) => d.key === "summer") ?? EXAMPLE_DAYS[0];
  const dayHousehold = {
    baseKwh: PERSONEN[EX.personenIdx].verbrauch,
    tagQuote: NUTZUNG[EX.nutzungIdx].tagQuote,
    wpActive: false,
    eaActive: false,
  };
  const dayOhne = simulateExampleDay(
    { kwp: EX.kwp, speicherKwh: 0, monthlyYieldPerKwp: null, ertragKwp: EX.ertragKwp, household: dayHousehold },
    exDay.month, exDay.dayType,
  );
  const dayMit = simulateExampleDay(
    { kwp: EX.kwp, speicherKwh: 10, monthlyYieldPerKwp: null, ertragKwp: EX.ertragKwp, household: dayHousehold },
    exDay.month, exDay.dayType,
  );
  // Gemeinsame y-Skala über beide Tage, sonst wirkt der Speicher-Tag verzerrt.
  const dayScaleMax = Math.max(
    ...dayOhne.hours.map((h) => Math.max(h.prod, h.cons)),
    ...dayMit.hours.map((h) => Math.max(h.prod, h.cons)),
  );
  // Selbst genutzter Anteil des Tages (direkt + aus Speicher) an der Erzeugung.
  const daySelf = (d: typeof dayOhne) => (d.prod > 0 ? Math.round(((d.prod - d.feedIn) / d.prod) * 100) : 0);
  const selfOhne = daySelf(dayOhne);
  const selfMit = daySelf(dayMit);

  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <Breadcrumb
          items={[
            { label: "Start", href: "/" },
            { label: "Ratgeber", href: "/ratgeber" },
            { label: "Lohnt sich PV ohne Einspeisevergütung?" },
          ]}
          jsonLd
        />

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
        <p style={{ ...S.p, fontSize: v("--font-size-small"), marginBottom: 0 }}>
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
        <h2 style={S.h2}>Beispielrechnung: ohne Vergütung, mit und ohne Speicher</h2>
        <p style={S.p}>
          Ein Beispielhaushalt: 3–4 Personen ({PERSONEN[EX.personenIdx].verbrauch.toLocaleString("de-DE")} kWh
          Jahresverbrauch), teils im Homeoffice, {EX.kwp} <GlossaryTerm id="kwp">kWp</GlossaryTerm>-Anlage,
          konservativer Ertrag von {EX.ertragKwp} kWh pro kWp. Beide Spalten rechnen{" "}
          <strong style={S.strong}>ohne Einspeisevergütung</strong> (Einspeisung auf „Aus"),
          also im geplanten Fall ab 2027. Oben wählst du, wie stark der Strompreis steigt —
          das schaltet beide Spalten gleichzeitig:
        </p>
        <SpeicherVergleich tabs={scenarioTabs} columns={vergleichColumns} />
        <p style={S.p}>
          Im realistischen Szenario (+{(prices.electricityIncrease * 100).toLocaleString("de-DE")} %/Jahr)
          zeigt sich der Speicher-Effekt deutlich:{" "}
          <strong style={S.strong}>ohne Speicher</strong> amortisiert sich die Anlage
          {ohneRealAmort != null ? ` erst in ~${ohneRealAmort} Jahren` : " kaum im Zeitraum"}
          {" "}({eur(ohneRealGewinn)} Gewinn über {YEARS} Jahre), weil der Mittagsüberschuss
          unvergütet ins Netz verpufft. <strong style={S.strong}>Mit 10 kWh Speicher</strong>{" "}
          {mitRealAmort != null ? `sinkt sie auf ~${mitRealAmort} Jahre` : "bleibt sie im Zeitraum"}
          {" "}und der Gewinn steigt auf {eur(mitRealGewinn)} — genau das ist der Kern der
          Debatte: Fällt die Vergütung, wird der Speicher vom Nice-to-have zum tragenden
          Baustein.
        </p>

        <div style={S.card}>
          <span style={S.label}>Annahmen dieser Rechnung</span>
          10 kWp · Strompreis {strompreisCt} ct/kWh · Einspeisung 0 ct/kWh (Vergütung
          weggefallen; heute wären es {feedInCt} ct/kWh Teileinspeisung über{" "}
          {FEED_IN_YEARS} Jahre) · Preisstand {formatPriceDate(prices.validFrom)} · ohne
          Förderung · inkl. Akku-Tausch und 0,5 % Modulalterung pro Jahr · Modell kalibriert
          an HTW-Berlin-Simulationsdaten.
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
          Ohne Vergütung zählt nur noch, wie viel vom eigenen Strom im Haus bleibt. Am
          klarsten sieht man das an einem einzelnen sonnigen Tag ({exDay.label.toLowerCase()})
          bei unserem Beispielhaushalt (3–4 Personen, 10 kWp) — links ohne, rechts mit
          Speicher, sonst gleiche Anlage. Die blaue Linie ist der Speicherstand:
        </p>
        <div style={S.card}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 16 }}>
            <div>
              <div style={{ fontSize: v("--font-size-small"), fontWeight: 700, color: v("--color-text-primary"), marginBottom: 6, textAlign: "center" }}>
                Ohne Speicher
              </div>
              <DayProfileChart hours={dayOhne.hours} scaleMax={dayScaleMax} showLegend={false} />
              <div style={{ fontSize: v("--font-size-small"), color: v("--color-text-secondary"), textAlign: "center", marginTop: 6, lineHeight: 1.5 }}>
                Selbst genutzt: <strong style={{ fontFamily: v("--font-mono") }}>{selfOhne} %</strong> ·{" "}
                <strong style={{ fontFamily: v("--font-mono") }}>{dayOhne.feedIn.toLocaleString("de-DE")}</strong> kWh
                Mittags­überschuss fließen ungenutzt ins Netz, abends kommt Strom zurück.
              </div>
            </div>
            <div>
              <div style={{ fontSize: v("--font-size-small"), fontWeight: 700, color: v("--color-text-primary"), marginBottom: 6, textAlign: "center" }}>
                Mit 10 kWh Speicher
              </div>
              <DayProfileChart hours={dayMit.hours} scaleMax={dayScaleMax} showLegend={false} socMax={10} />
              <div style={{ fontSize: v("--font-size-small"), color: v("--color-text-secondary"), textAlign: "center", marginTop: 6, lineHeight: 1.5 }}>
                Selbst genutzt: <strong style={{ fontFamily: v("--font-mono") }}>{selfMit} %</strong> — mittags
                lädt der Überschuss den Speicher (Linie steigt), abends entlädt er und deckt
                den Verbrauch (Linie fällt), statt Strom aus dem Netz zu ziehen.
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <DayLegendDot color={DAY_C_SUN} label="Erzeugung" />
            <DayLegendDot color={DAY_C_DIRECT} label="direkt genutzt" />
            <DayLegendDot color={DAY_C_BATTERY} label="aus dem Speicher" />
            <DayLegendDot color={DAY_C_GRID} label="aus dem Netz" />
            <DayLegendDot color={DAY_C_SOC} label="Speicherstand" />
          </div>
        </div>
        <p style={S.p}>
          Die grüne und blaue Fläche zusammen ist der selbst genutzte Solarstrom — genau
          das, was ohne Vergütung das Geld verdient. Der Speicher vergrößert sie, indem er
          den Mittagsberg in den Abend schiebt. Dieselbe Logik steckt hinter der Autarkie,
          die unser Rechner ausweist —{" "}
          <Link href={mitSpNull.href} style={S.link}>im Rechner öffnen und selbst variieren</Link>.
        </p>

        <h2 style={S.h2}>Die wichtigsten Hebel — und wo es eng wird</h2>
        <ProConLists
          proTitle="Was den Eigenverbrauch hebt"
          conTitle="Wo es ohne Vergütung eng wird"
          proItems={[
            { term: "Batteriespeicher", desc: <>verschiebt den Mittagsüberschuss in Abend und Nacht — der größte einzelne Hebel. Ob und wann er sich rechnet, steht im <Link href="/lohnt-sich-pv-mit-speicher" style={S.link}>Speicher-Ratgeber</Link>.</> },
            { term: "Wärmepumpe", desc: <>macht Heizen zum Stromverbrauch und nutzt vor allem in der Übergangszeit viel eigenen Solarstrom. Was sie selbst spart, rechnet der <Link href="/waermepumpe-rechner" style={S.link}>Wärmepumpen-Rechner</Link>.</> },
            { term: "E-Auto", desc: <>wer tagsüber oder über den Speicher lädt, holt sich den Solarstrom in den Tank — bei 15.000 km/Jahr sind das rund 2.700 kWh zusätzlicher Verbrauch.</> },
            { term: "Verbrauch in den Tag verschieben", desc: <>Spülmaschine, Waschmaschine, Warmwasser mittags statt abends laufen lassen — kostenlos und sofort wirksam.</> },
          ]}
          conItems={[
            { term: "Volleinspeisung", desc: <>Konzepte, die den gesamten Strom einspeisen (z. B. große Dächer ohne Eigenverbrauch), leben komplett von der Vergütung — ohne sie tragen sie sich nicht.</> },
            { term: "Überdimensionierung", desc: <>„Das Dach voll machen" lohnt ohne Vergütung weniger. Was über den eigenen Verbrauch hinausgeht, bringt nichts mehr ein — die Anlage passend zum Verbrauch auszulegen wird wichtiger. Die <Link href="/pv-bedarf-berechnen" style={S.link}>Empfehlung</Link> rechnet die passende Größe aus.</> },
            { term: "Sehr niedriger Verbrauch", desc: <>Ein 1-Personen-Haushalt mit 1.800 kWh/Jahr kann nur wenig Solarstrom selbst nutzen — hier verlängert sich die Amortisation deutlich. Ein <Link href="/balkonkraftwerk-rechner" style={S.link}>Balkonkraftwerk</Link> passt dann oft besser als eine große Dachanlage.</> },
            { term: "Überteuerte Angebote", desc: <>Die Rechnung oben gilt für Marktpreise. Ohne den Vergütungs-Puffer kippt sie bei deutlich überhöhten Angebotspreisen schneller — Vergleichsangebote werden wichtiger.</> },
          ]}
        />

        {/* ── Ausblick: bidirektionales Laden (V2H) — bewusst NICHT in der ✓-Liste ── */}
        <div style={{ ...S.card, marginTop: 20 }}>
          <span style={S.label}>Ausblick: das E-Auto als Speicher</span>
          Perspektivisch könnte das E-Auto der größte Eigenverbrauchs-Hebel überhaupt
          werden: Als fahrender Großspeicher mit 40–80 kWh fasst es ein Vielfaches eines
          Heimspeichers, und mit bidirektionalem Laden (Vehicle-to-Home) könnte es
          tagsüber Solarstrom aufnehmen und abends das Haus versorgen. Heute ist das aber
          noch keine belastbare Ersparnis-Rechnung: Es hängt an der Verfügbarkeit passender
          Fahrzeuge und Wallboxen und ist regulatorisch wie abrechnungstechnisch ungeklärt —
          unter anderem droht bei der Rückspeisung eine Doppelbelastung mit Netzentgelten
          und Steuern. Wir beobachten das, rechnen es aber erst, wenn die Rahmenbedingungen
          stehen (Stand {REFORM_STAND}).
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

        <p style={{ ...S.p, fontSize: v("--font-size-small") }}>
          Verwandte Seiten: <Link href="/lohnt-sich-pv-mit-speicher" style={S.link}>Lohnt sich PV mit Speicher?</Link> ·{" "}
          <Link href="/methodik" style={S.link}>So rechnen wir</Link> ·{" "}
          <Link href="/datenstand" style={S.link}>Aktuelle Preise &amp; Annahmen</Link> ·{" "}
          <Link href="/photovoltaik-foerderung" style={S.link}>PV-Förderung vor Ort</Link> ·{" "}
          <Link href="/glossar" style={S.link}>Glossar</Link>
        </p>
        <p style={{ ...S.p, fontSize: v("--font-size-small"), marginTop: 16 }}>
          Zuletzt aktualisiert: {new Date().toLocaleDateString("de-DE", { month: "long", year: "numeric" })} —
          die Zahlen auf dieser Seite werden automatisch aus den aktuellen Marktpreisen
          berechnet ({year}). Angaben zur geplanten EEG-Reform: Stand {REFORM_STAND}, ohne
          Gewähr; verbindlich ist die offizielle Gesetzeslage.
        </p>
      </div>
    </div>
  );
}
