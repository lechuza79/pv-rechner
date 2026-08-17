import { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "../../../components/Breadcrumb";
import ObfuscatedEmail from "../../../components/ObfuscatedEmail";
import { v } from "../../../lib/theme";
import { supabase } from "../../../lib/supabase-server";
import { DEFAULT_PRICES, type PriceConfig } from "../../../lib/prices-config";
import { feedInRatesFor, type FeedInRates } from "../../../lib/feedin-config";
import { FEEDIN_HISTORY_META, FEEDIN_HISTORY_YEARS, FEEDIN_HISTORY_VALUES } from "../../../lib/feedin-history";
import {
  MARKTWERT_SOLAR_HISTORIE, MARKTWERT_NIVEAU_CT, MARKTWERT_VALID_FROM,
  MARKTWERT_REVIEW_BY, MARKTWERT_QUELLE, DIREKTVERMARKTUNG,
} from "../../../lib/marktwert-config";
import { CO2_PRICE, co2PriceForCalendarYear } from "../../../lib/co2-config";
import { DEFAULT_HEATPUMP_CONFIG as HP } from "../../../lib/heatpump-config";
import { GREEN_GAS_CONFIG as GG, bioTreppeStufenText, gmodgStandSatz, GMODG_RECHTSSTAND } from "../../../lib/greengas-config";
import { DEFAULT_AIRCON_CONFIG as AC, AC_REAL_FACTOR } from "../../../lib/aircon-config";
import { acHeatSpecKwhPerM2 } from "../../../lib/aircon";
import { verbrauchSpecKwh } from "../../../lib/heatpump-core";
import { preboundAnteil } from "../../../lib/heat-consumption";
import { DEFAULT_BALKON_CONFIG as BK } from "../../../lib/balkon-config";
import { referenceYearKwh } from "../../../lib/solar-year";
import { YEAR, YEARS, DEGRAD, PERSONEN, NUTZUNG, CONSUMPTION_MONTHLY, SCENARIOS, FUEL } from "../../../lib/constants";
import { WP_ANNUAL_KWH, EA_KWH_PER_KM, EA_DEFAULT_KM, KLIMA_KWH_PER_M2, KLIMA_DEFAULT_M2 } from "../../../lib/consumption";
import { pageMetadata } from "../../../lib/seo";
import { DATA_SOURCES, sourceLabel } from "../../../lib/data-sources";

// ISR: re-render hourly so live market prices / feed-in rates stay current
// without a deploy. The page reads from the same Supabase tables + config
// modules the calculator uses, so the displayed values can never drift from
// what is actually computed.
export const revalidate = 3600;

export const metadata: Metadata = pageMetadata({
  path: "/datenstand",
  // Titel und OG-Untertitel versprachen bis zum Audit am 17.08.2026 weiterhin
  // "Alle Annahmen & Werte" bzw. "Jeder Wert … offengelegt" — die Fassung, die
  // in Suchergebnissen und geteilten Links steht. Der Fließtext war da schon
  // korrigiert; genau so überlebt eine zurückgenommene Zusage an der Stelle, die
  // niemand mitliest.
  title: "Datenstand – Womit wir rechnen, mit Stand und Quelle",
  description: "Womit Solar Check rechnet: Preise, Einspeisevergütung, CO₂-Preis, Wärmepumpen-Annahmen — jede Größe mit Stand und Quelle. Transparent statt Blackbox.",
  ogImageTitle: "Datenstand",
  ogImageSubtitle: "Jede Größe mit Stand und Quelle.",
});

const S = {
  page: {
    background: v("--color-bg"),
    fontFamily: v("--font-text"),
    color: v("--color-text-primary"),
    minHeight: "100vh",
    padding: "0 16px 20px",
  },
  wrap: { maxWidth: v("--content-max-width"), margin: "0 auto", paddingTop: "var(--content-lede-top)" },
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
    lineHeight: 1.2,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: v("--font-size-lead"),
    color: v("--color-text-muted"),
    marginBottom: 28,
    lineHeight: 1.6,
  },
  section: { marginTop: 30 },
  h2row: { display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 4 },
  h2: {
    fontSize: v("--font-size-h2"),
    fontWeight: 700,
    color: v("--color-text-primary"),
  },
  stand: {
    fontSize: v("--font-size-caption"),
    fontWeight: 700,
    color: v("--color-accent"),
    fontFamily: v("--font-mono"),
    // KEIN nowrap: Der längste Stand ist "Modell (HTW Berlin · BDEW)" und misst
    // 230 px. In einer Flex-Zeile, die nicht umbrechen darf, schob er das
    // Dokument auf schmalen Schirmen auf 518 px auf — die Seite scrollte
    // seitlich. Gefunden im Audit am 17.08.2026; der Fehler ist älter, fällt
    // aber jetzt stärker ins Gewicht, weil die Vertrauens-Leiste von jeder
    // Seite hierher führt.
    textAlign: "right" as const,
  },
  intro: { fontSize: v("--font-size-small"), color: v("--color-text-muted"), lineHeight: 1.6, marginBottom: 12 },
  card: {
    background: v("--color-bg"),
    borderRadius: v("--radius-md"),
    border: `1px solid ${v("--color-border")}`,
    overflow: "hidden" as const,
  },
  row: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 14,
    padding: "11px 14px",
    borderTop: `1px solid ${v("--color-border")}`,
    fontSize: v("--font-size-body"),
  },
  rowFirst: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 14,
    padding: "11px 14px",
    fontSize: v("--font-size-body"),
  },
  rowLabel: { color: v("--color-text-muted"), lineHeight: 1.4 },
  rowValue: {
    fontFamily: v("--font-mono"),
    fontSize: v("--font-size-small"),
    color: v("--color-text-primary"),
    fontWeight: 600,
    textAlign: "right" as const,
    flexShrink: 0,
    maxWidth: "62%",
  },
  source: {
    fontSize: v("--font-size-caption"),
    color: v("--color-text-faint"),
    marginTop: 8,
    lineHeight: 1.5,
  },
  caveat: {
    fontSize: v("--font-size-caption"),
    color: v("--color-text-muted"),
    background: v("--color-bg-accent"),
    borderRadius: v("--radius-md"),
    padding: "10px 12px",
    marginTop: 8,
    lineHeight: 1.6,
  },
  note: {
    fontSize: v("--font-size-small"),
    color: v("--color-text-muted"),
    lineHeight: 1.65,
    background: v("--color-bg-accent"),
    borderRadius: v("--radius-md"),
    padding: "12px 14px",
    marginTop: 28,
  },
  link: { color: v("--color-accent"), textDecoration: "none", fontWeight: 600 },
  // Steht anstelle der Wertetabelle. Bewusst dieselbe Kartenform wie eine echte
  // Tabelle, nur ohne Raster: Der Block soll als Teil der Aufstellung lesbar
  // sein, nicht als Fehlermeldung oder als Lücke.
  aufAnfrage: {
    background: v("--color-bg-muted"),
    borderRadius: v("--radius-md"),
    border: `1px solid ${v("--color-border")}`,
    padding: "14px 16px",
  },
  aufAnfrageText: {
    fontSize: v("--font-size-small"),
    color: v("--color-text-secondary"),
    lineHeight: 1.6,
    margin: 0,
  },
  a: { color: v("--color-accent"), textDecoration: "none" },
};

const nf = (n: number) => n.toLocaleString("de-DE");
/**
 * Gesetzlich festgelegte Vergütungssätze in ct/kWh. Immer zwei Nachkommastellen:
 * die Bundesnetzagentur veröffentlicht "7,70", und nf() würde daraus "7,7"
 * machen — dieselbe Zahl, aber nicht mehr die amtliche Schreibweise, und in
 * einer Spalte, in der die Nachbarzeilen zwei Stellen tragen, liest sich das
 * wie ein anderer Grad an Genauigkeit.
 */
const ctSatz = (n: number) =>
  n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const monthYear = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("de-DE", { month: "long", year: "numeric" });

// Prices payload = PV/battery/electricity aus derselben market_prices-Zeile, die
// der Rechner liest. Die Wärmepumpen-Investition steht NICHT hier: sie kommt aus
// der Config (an echten Angeboten kalibriert, Wächter-gepflegt).
async function fetchPrices(): Promise<PriceConfig> {
  if (!supabase) return DEFAULT_PRICES;
  try {
    const { data } = await supabase
      .from("market_prices")
      .select("*")
      .neq("source", "SCRAPE_ERROR")
      .gt("pv_price_small", 0)
      .lte("valid_from", new Date().toISOString().split("T")[0])
      .order("valid_from", { ascending: false })
      // Tiebreaker on created_at must match /api/prices exactly — otherwise this
      // transparency page can read a different (older) duplicate row than the
      // one the calculator actually uses for the same valid_from.
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (!data) return DEFAULT_PRICES;
    return {
      pvPriceSmall: Number(data.pv_price_small),
      pvPriceLarge: Number(data.pv_price_large),
      pvThresholdKwp: Number(data.pv_threshold_kwp),
      batteryBase: Number(data.battery_base),
      batteryPerKwh: Number(data.battery_per_kwh),
      electricityPrice: data.electricity_price != null ? Number(data.electricity_price) : DEFAULT_PRICES.electricityPrice,
      electricityIncrease: data.electricity_increase != null ? Number(data.electricity_increase) : DEFAULT_PRICES.electricityIncrease,
      validFrom: data.valid_from,
      source: data.source,
    };
  } catch {
    return DEFAULT_PRICES;
  }
}

async function fetchFeedIn(): Promise<FeedInRates> {
  if (!supabase) return feedInRatesFor();
  try {
    const { data } = await supabase
      .from("feed_in_rates")
      .select("*")
      .lte("valid_from", new Date().toISOString().split("T")[0])
      .order("valid_from", { ascending: false })
      .limit(1)
      .single();
    if (!data) return feedInRatesFor();
    return {
      teilUnder10: Number(data.teil_under_10),
      teilOver10: Number(data.teil_over_10),
      vollUnder10: Number(data.voll_under_10),
      vollOver10: Number(data.voll_over_10),
      thresholdKwp: Number(data.threshold_kwp),
      validFrom: data.valid_from,
      source: data.source,
    };
  } catch {
    return feedInRatesFor();
  }
}

type Row = { label: string; value: string };

// ─── Was diese Seite zeigt und was nicht ─────────────────────────────────────
//
// Sie belegt weiterhin für jede Größe, WORAUF wir rechnen, WOHER es kommt und
// WIE ALT es ist — das ist die Zusage, auf die zwölf andere Seiten verweisen und
// die die Lizenzbedingungen unserer Datengeber verlangen.
//
// Was sie seit dem 17.08.2026 NICHT mehr tut: die durchkalibrierten
// Modell-Datensätze am Stück ausbreiten (Entscheidung des Betreibers). Diese
// Blöcke tragen `aufAnfrage` und zeigen statt der Wertetabelle, was darin steht
// und wie man sie bekommt. Grund ist nicht Geheimhaltung — die Rechner geben
// jede Zahl aus, sobald man sie benutzt, und einzelne Werte zu zitieren ist
// ausdrücklich erlaubt (siehe /lizenz). Was wegfällt, ist der bequeme
// Gesamtabzug: eine fertige Tabelle, aus der sich die Arbeit von Monaten in
// einem Abruf mitnehmen lässt.
//
// Die Grenze verläuft deshalb NICHT entlang "wichtig/unwichtig", sondern hier:
// Werte, die im Rechner ohnehin offen sitzen und editierbar sind (Preise,
// Vergütungssätze, Marktwert), bleiben stehen — sie zu verbergen kostete
// Vertrauen, ohne irgendetwas zu schützen. Verborgen wird nur, was ausschließlich
// hier als geschlossene Reihe stand.
function Section({ title, stand, intro, rows, source, caveat, aufAnfrage }: {
  title: string;
  stand: string;
  intro?: string;
  rows: Row[];
  source: string;
  /** Statt der Wertetabelle einen Hinweis zeigen. Text beschreibt, was drinsteht. */
  aufAnfrage?: string;
  /** Herkunfts-Vorbehalt, wenn ein Wert (noch) nicht aus der amtlichen Liste stammt. */
  caveat?: string | null;
}) {
  return (
    <div style={S.section}>
      <div style={S.h2row}>
        <h2 style={S.h2}>{title}</h2>
        <span style={S.stand}>Stand {stand}</span>
      </div>
      {intro && <p style={S.intro}>{intro}</p>}
      {aufAnfrage ? (
        <div style={S.aufAnfrage}>
          <p style={S.aufAnfrageText}>
            {/* KEINE Anzahl und KEIN "kann man im Rechner überschreiben" mehr.
                Beides fiel im Audit: Eine Tabellenzeile ist nicht ein Wert (die
                Wärmepumpen-Zeilen tragen über 30 Zahlen in 15 Zeilen), und von
                den genannten Größen ist je Rechner nur eine Handvoll editierbar
                — bei der historischen Vergütungsreihe gibt es gar keinen
                Rechner, der sie ausgibt. Ein Ersatz für weggenommene Tabellen
                darf nicht selbst etwas Falsches versprechen. */}
            {aufAnfrage}. Was davon im Ergebnis überschreibbar ist, steht oben; den
            vollständigen Satz geben wir auf Anfrage heraus —{" "}
            <ObfuscatedEmail user="hey" domain="solar-check.io" style={S.a} />.
          </p>
        </div>
      ) : (
        <div style={S.card}>
          {/* Der Index gehört in den Schlüssel: Zwei Zeilen mit gleicher
              Beschriftung sind hier fachlich möglich (Kühlen/Heizen desselben
              Geräts), und allein der Text als Schlüssel machte daraus einen
              Zustand, den React ausdrücklich nicht unterstützt — mit dem Risiko,
              dass eine Zeile still verschwindet. Auf einer Seite, die belegt,
              welche Werte gelten, fällt genau das niemandem auf. */}
          {rows.map((r, i) => (
            <div key={`${i}-${r.label}`} style={i === 0 ? S.rowFirst : S.row}>
              <span style={S.rowLabel}>{r.label}</span>
              <span style={S.rowValue}>{r.value}</span>
            </div>
          ))}
        </div>
      )}
      <p style={S.source}>Quelle: {source}</p>
      {caveat && <p style={S.caveat}>{caveat}</p>}
    </div>
  );
}

export default async function DatenstandPage() {
  const [prices, feedin] = await Promise.all([fetchPrices(), fetchFeedIn()]);

  const co2Rows: Row[] = Array.from({ length: 5 }, (_, i) => {
    const year = YEAR + i;
    return { label: `${year}`, value: `${nf(co2PriceForCalendarYear(year))} €/t` };
  });

  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <Breadcrumb items={[{ label: "Start", href: "/" }, { label: "Datenstand" }]} jsonLd />

        <h1 style={S.h1}>Datenstand</h1>
        <p style={S.subtitle}>
          Wir rechnen mit offengelegten Annahmen statt einer Blackbox. Hier steht für jede
          Größe, worauf wir rechnen, woher sie stammt und wie alt sie ist. Marktdaten
          (Preise, Vergütung) aktualisieren wir laufend; Modell-Annahmen beruhen auf
          wissenschaftlichen Lastprofilen und ändern sich selten.
        </p>
        <p style={S.subtitle}>
          Die durchkalibrierten Modell-Datensätze breiten wir hier nicht mehr am Stück aus.
          An die Zahlen kommst du trotzdem: Der jeweilige Rechner gibt sie mit dem Ergebnis
          aus, und dort lässt sich jede einzelne überschreiben. Den vollständigen Satz
          bekommst du auf Anfrage.
        </p>

        {/* ── Anschaffung & Strompreis (live aus Marktdaten) ── */}
        <Section
          title="Anschaffung & Strompreis"
          stand={monthYear(prices.validFrom)}
          intro="Richtpreise schlüsselfertiger Anlagen. Werden monatlich aus mehreren Marktquellen abgeglichen; im Ergebnis jederzeit überschreibbar."
          rows={[
            { label: `Anlage bis ${nf(prices.pvThresholdKwp)} kWp`, value: `${nf(prices.pvPriceSmall)} €/kWp` },
            { label: `Anlage über ${nf(prices.pvThresholdKwp)} kWp`, value: `${nf(prices.pvPriceLarge)} €/kWp` },
            { label: "Speicher", value: `${nf(prices.batteryPerKwh)} €/kWh + ${nf(prices.batteryBase)} € Basis` },
            { label: "Haushaltsstrompreis", value: `${(prices.electricityPrice * 100).toLocaleString("de-DE", { maximumFractionDigits: 1 })} ct/kWh` },
            { label: "Angenommene Strompreis­steigerung", value: `${nf(prices.electricityIncrease * 100)} % / Jahr` },
          ]}
          source={prices.source || "Marktabgleich taptaphome.com (vormals solaranlagen-portal.com), Fraunhofer ISE, BNetzA Strompreismonitor"}
        />

        {/* ── Einspeisevergütung (live) ── */}
        <Section
          title="Einspeisevergütung"
          stand={monthYear(feedin.validFrom)}
          intro="Gesetzliche EEG-Sätze für neu in Betrieb genommene Anlagen, gestaffelt nach Anlagengröße und Einspeiseart."
          rows={[
            { label: `Teileinspeisung bis ${nf(feedin.thresholdKwp)} kWp`, value: `${ctSatz(feedin.teilUnder10)} ct/kWh` },
            { label: `Teileinspeisung über ${nf(feedin.thresholdKwp)} kWp`, value: `${ctSatz(feedin.teilOver10)} ct/kWh` },
            { label: `Volleinspeisung bis ${nf(feedin.thresholdKwp)} kWp`, value: `${ctSatz(feedin.vollUnder10)} ct/kWh` },
            { label: `Volleinspeisung über ${nf(feedin.thresholdKwp)} kWp`, value: `${ctSatz(feedin.vollOver10)} ct/kWh` },
          ]}
          source={feedin.source || "Bundesnetzagentur, § 48 EEG"}
          caveat={feedin.note}
        />

        {/* ── Marktwert Solar (Direktvermarktung, Reform-Rechnung) ── */}
        <Section
          title="Marktwert Solar"
          stand={monthYear(MARKTWERT_VALID_FROM)}
          intro="Der erzeugungsgewichtete Börsenpreis für Solarstrom — die Bezugsgröße, wenn der Rechner die geplanten Konditionen ab 2027 abbildet und der Strom direkt vermarktet würde. Nicht zu verwechseln mit dem mittleren Börsenpreis: Solarstrom fällt an, wenn er am wenigsten wert ist."
          rows={[
            ...MARKTWERT_SOLAR_HISTORIE.map((j) => ({
              label: `Jahresmarktwert ${j.jahr}`,
              value: `${ctSatz(j.ctKwh)} ct/kWh`,
            })),
            { label: "Gerechnet wird mit (ohne negative Stunden)", value: `${ctSatz(MARKTWERT_NIVEAU_CT)} ct/kWh` },
            { label: "Gebühr Direktvermarktung", value: `${ctSatz(DIREKTVERMARKTUNG.gebuehrCtKwh)} ct/kWh + ${nf(DIREKTVERMARKTUNG.grundgebuehrProJahr)} €/Jahr` },
          ]}
          source={`${MARKTWERT_QUELLE}. Nächste Prüfung bis ${monthYear(MARKTWERT_REVIEW_BY)}.`}
          caveat="Die amtlichen Jahreswerte sind zusätzlich unabhängig aus Solarerzeugung und Börsenpreis nachgerechnet (Abweichung unter 3 %). Der Erlöspfad über die Laufzeit ist eine ausgewiesene Annahme, keine Prognose."
        />

        {/* ── Historische Einspeisevergütung (Zeitreihe für die Zubau-Story) ──
            BEWUSST NICHT zurückgehalten (Audit 17.08.2026): Dieselbe Reihe steht
            auf /einspeiseverguetung-tabelle vollständig und in besser
            abgreifbarer Form, dazu die BNetzA-Monatsmatrix. Sie hier
            einzuklappen kostete die Offenlegungs-Zusage, ohne irgendetwas zu
            schützen — und täuschte dem Leser eine Zurückhaltung vor, die es gar
            nicht gibt. Zurückgehalten wird nur, wo es auch wirkt: bei den
            kalibrierten Modell-Datensätzen. */}
        <Section
          title="Einspeisevergütung – historische Reihe"
          stand={FEEDIN_HISTORY_META.dataAsOf}
          intro="Jahresanfangs-Sätze für kleine Dachanlagen bei Inbetriebnahme, 2000 bis heute. Grundlage der Datenstory zum Solar-Zubau (photovoltaik-zubau-deutschland). Ab April 2012 sank die Vergütung unterjährig — die Jahreswerte sind Jahresanfangs-Repräsentanten."
          rows={FEEDIN_HISTORY_YEARS.map((y, i) => ({ label: `${y}`, value: `${ctSatz(FEEDIN_HISTORY_VALUES[i])} ct/kWh` }))}
          source={FEEDIN_HISTORY_META.source}
        />

        {/* ── CO2-Preis (Heizen, für WP-Vergleich) ── */}
        <Section
          title="CO₂-Preis (Heizen)"
          stand={monthYear(CO2_PRICE.validFrom)}
          intro="Aufschlag auf Gas/Öl im Wärmepumpen-Vergleich. Für das laufende Jahr gilt der gesetzliche Korridor. Dass er auch im nächsten Jahr gilt, hat die Koalition beschlossen und das Kabinett als Gesetzentwurf auf den Weg gebracht; beschlossen ist das Gesetz noch nicht. Wir rechnen trotzdem damit, weil das die vorsichtigere Annahme ist. Danach ein konservativer Forecast für den EU-Emissionshandel ab 2028."
          rows={co2Rows}
          source={`${CO2_PRICE.source}. Nächste Prüfung bis ${monthYear(CO2_PRICE.reviewBy)}.`}
          aufAnfrage={`Ein €/t-Wert je Kalenderjahr ab ${YEAR}`}
        />

        {/* ── Wärmepumpe ── */}
        <Section
          title="Wärmepumpe"
          stand={monthYear(HP.validFrom)}
          // NICHT "alle Werte editierbar" (Audit 17.08.2026): Das Ergebnis hat
          // sieben Eingabefelder — Heizwärme, Heizlast, JAZ, Gaspreis, fossile
          // Anschaffung, WP-Strompreis, Investition. Förderstaffeln, Wartung,
          // Grundpreise, Betrachtungszeitraum und Teuerung sind es nicht.
          intro="Annahmen des Wärmepumpen-Rechners: Heizbedarf, Effizienz, Investition und Förderung. Heizwärme, Heizlast, Jahresarbeitszahl, Gaspreis, Strompreis und beide Anschaffungskosten sind im Ergebnis editierbar."
          rows={[
            // Spanne immer über die GANZE Skala — sonst fällt eine neue Stufe still
            // aus der öffentlichen Übersicht. Reihenfolge der Beschriftung MUSS der
            // Reihenfolge der Werte folgen (der kleinste Wert ist der beste Fall):
            // „unsaniert–vollsaniert" über „70–220" las sich genau falsch herum.
            { label: "Spez. Heizbedarf Bestand (vollsaniert–unsaniert)", value: `${HP.specDemandBestand[HP.specDemandBestand.length - 1]}–${HP.specDemandBestand[0]} kWh/m²·a Norm-Bedarf; gerechnet wird mit dem erwarteten Verbrauch ${verbrauchSpecKwh("bestand", HP.specDemandBestand.length - 1)}–${verbrauchSpecKwh("bestand", 0)} kWh/m²·a` },
            { label: "Spez. Heizlast Bestand (vollsaniert–unsaniert)", value: `${HP.specHeatLoadBestand[HP.specHeatLoadBestand.length - 1]}–${HP.specHeatLoadBestand[0]} W/m²` },
            { label: "Spez. Heizbedarf Neubau (KfW 40+–EnEV)", value: `${HP.specDemandNeubau[HP.specDemandNeubau.length - 1]}–${HP.specDemandNeubau[0]} kWh/m²·a Norm-Bedarf; gerechnet wird mit ${verbrauchSpecKwh("neubau", HP.specDemandNeubau.length - 1)}–${verbrauchSpecKwh("neubau", 0)} kWh/m²·a` },
            { label: "Bedarf → Verbrauch (Prebound)", value: `Norm-Bedarf wird auf den erwarteten realen Verbrauch umgerechnet: bei ${HP.specDemandBestand[0]} kWh/m²·a rund ${Math.round(preboundAnteil(HP.specDemandBestand[0]) * 100)} % Abschlag, bei ${HP.specDemandNeubau[0]} kWh/m²·a rund ${Math.round(preboundAnteil(HP.specDemandNeubau[0]) * 100)} %. Quelle: Sunikka-Blank/Galvin (2012), Building Research & Information 40(3), 3.400 deutsche Wohnungen. Heizlast und Warmwasser bleiben unkorrigiert` },
            { label: "Warmwasser je Person", value: `${nf(HP.wwPerPerson)} kWh/a` },
            { label: "Investition Luft/Wasser (brutto, inkl. MwSt.)", value: `${nf(HP.investLwwpBase)} € + ${nf(HP.investLwwpPerKw)} €/kW` },
            { label: "Investition Sole/Wasser (brutto, inkl. MwSt.)", value: `${nf(HP.investSwwpBase)} € + ${nf(HP.investSwwpPerKw)} €/kW` },
            { label: "BEG-Förderung (Grund + Boni)", value: `${nf(HP.begGrundfoerderung * 100)}–${nf(HP.begMaxRateLowIncome * 100)} %, max. ${nf(HP.begMaxCap)} €` },
            { label: "WP-Stromtarif (§ 14a EnWG)", value: `${(HP.wpTarif * 100).toLocaleString("de-DE", { maximumFractionDigits: 1 })} ct/kWh` },
            { label: "Gas-Referenz", value: `${nf(HP.gasPriceCtPerKwh)} ct/kWh, ${nf(HP.gasCo2PerKwh * 1000)} g CO₂/kWh, ${nf(FUEL.gas.efficiency * 100)} % Kessel` },
            // Der Öl-Fall ist seit 28.07.2026 ein eigener Rechenweg (anderer Preis,
            // anderer Kessel-Wirkungsgrad, mehr CO₂, keine Grundgebühr) — er fehlte hier.
            { label: "Heizöl-Referenz", value: `${nf(FUEL.oil.price * 100)} ct/kWh, ${nf(FUEL.oil.co2PerKwh * 1000)} g CO₂/kWh, ${nf(FUEL.oil.efficiency * 100)} % Kessel` },
            { label: "Neue fossile Heizung (Anschaffung, im Ergebnis editierbar)", value: `${nf(HP.fossilErsatzInvest)} €` },
            { label: "Grundpreis je Jahr (Gas / Heizöl / WP-Zähler)", value: `${nf(HP.fixCostPerYear.gas)} / ${nf(HP.fixCostPerYear.oil)} / ${nf(HP.wpFixCostPerYear)} €` },
            { label: "Wartung je Jahr (fossil / Wärmepumpe)", value: `${nf(HP.gasMaintenance)} / ${nf(HP.wpMaintenance)} €` },
            { label: "Betrachtungszeitraum · Teuerung Strom/Brennstoff", value: `${HP.years} Jahre · ${nf(HP.stromInflation * 100)} / ${nf(HP.gasInflation * 100)} % pro Jahr` },
          ]}
          source={`${HP.source}. Umrechnung des Norm-Bedarfs auf den erwarteten realen Verbrauch (Prebound-Effekt) nach Sunikka-Blank/Galvin (2012), Building Research & Information 40(3), Auswertung von 3.400 deutschen Wohnungen — im unsanierten Bestand rund ${Math.round(preboundAnteil(HP.specDemandBestand[0]) * 100)} % Abschlag; Heizlast und Warmwasser bleiben unkorrigiert. Investition der Wärmepumpe kalibriert an der Auswertung von 160 realen Luft-Wasser-Angeboten (Verbraucherzentrale Rheinland-Pfalz): Median 34.979 €, Mittelwert 36.279 € bei einer Median-Leistung von 10 kW. Anschaffung der fossilen Alternative: Mittelwert der Fraunhofer-ISE-Kurzstudie „Vergleich Wärmeversorgung“ vom 23.06.2026 (Gaskessel Einfamilienhaus 11.400–20.400 € brutto), bestätigt durch die Beispielrechnung der Verbraucherzentrale Rheinland-Pfalz vom 02.06.2025 (16.000 €). Grundpreise und Wartung ebenfalls aus dieser Beispielrechnung.`}
          aufAnfrage="Heizbedarf und Heizlast je Dämmstufe, Investitions- und Förderstaffeln, Brennstoff- und Betriebskosten"
        />

        {/* ── Grüngas-Pfad (Gas-Referenz im WP-Rechner + Ratgeber) ── */}
        <Section
          title="Grüngas-Pflicht (Bio-Treppe)"
          stand={monthYear(GG.validFrom)}
          intro={`Preispfad einer neu eingebauten Gasheizung unter dem Gebäudemodernisierungsgesetz — die Vergleichsgröße im Wärmepumpen-Rechner. ${gmodgStandSatz()} Gesetzlich stehen genau vier Beimischstufen bis 2040 fest; der Sprung auf ${nf(GG.quoteStops[2045] * 100)} % bis 2045 ist dagegen eine Annahme der zugrunde liegenden Studie. Sie stützt sich auf § 42a GModG, der die Klimaneutralität der Brennstoffe ab 2045 nur ankündigt — geregelt werden soll sie in einem eigenen Quotengesetz bis zum ${GMODG_RECHTSSTAND.quoteGesetzBis}. Dieses Gesetz setzt bei den Brennstoff-Anbietern an und würde damit auch Bestandsheizungen verteuern, die die Bio-Treppe nicht erfasst; solange es keine belastbaren Quoten gibt, rechnen wir es nicht mit. Anrechenbar sind neben Biomethan auch Bioheizöl, biogenes Flüssiggas sowie Wasserstoff und dessen Derivate; für leitungsgebundenes Gas rechnen wir mit Biomethan als Leitpreis.`}
          rows={[
            { label: "Beimischpflicht laut § 43 GModG (vier Stufen, keine weitere)", value: bioTreppeStufenText() },
            { label: "Annahme der Studie für 2045 (nicht im Gesetz)", value: `${nf(GG.quoteStops[2045] * 100)} %` },
            { label: "Erdgas / Biomethan (Beschaffung + Vertrieb, 2026)", value: `${nf(GG.erdgasCt2026)} / ${nf(GG.biomethanCt2026)} ct/kWh netto` },
            { label: "Biomethan 2045 (niedrig – mittel – hoch)", value: `${nf(GG.biomethanCt2045.low)} – ${nf(GG.biomethanCt2045.base)} – ${nf(GG.biomethanCt2045.high)} ct/kWh netto` },
            { label: "Gasnetzentgelt 2026 → 2045 (mittel)", value: `${nf(GG.netzCt2026)} → ${nf(GG.netzCt2045.base)} ct/kWh netto` },
            { label: "CO₂-Preis 2026 → 2045 (mittel)", value: `${nf(GG.co2EurT2026.base)} → ${nf(GG.co2EurT2045.base)} €/t, nur auf den fossilen Anteil` },
          ]}
          source={`${GG.source}. Das IW ist ein arbeitgebernahes Institut; die Preispfade sind ein plausibler Korridor, keine punktgenaue Prognose. Nächste Prüfung bis ${monthYear(GG.reviewBy)}.`}
        />

        {/* ── Klimaanlagen-Rechner ── */}
        <Section
          title="Klimaanlage (Kühlkosten-Rechner)"
          stand={monthYear(AC.validFrom)}
          intro={`Annahmen des Klimaanlagen-Rechners: Geräte-Effizienz, Preise, Klima- und Hitzedaten. Kern ist Kühlung; Split-Geräte können zusätzlich in der Übergangszeit heizen (günstiger als Gas). Strompreis und Kühlgradstunden im Ergebnis editierbar. Offen ausgewiesen: Der Abschlag vom Laborwert auf den Realbetrieb (${((1 - AC_REAL_FACTOR) * 100).toLocaleString("de-DE")} %) ist am Kühlen gemessen; für die Heizrichtung nennt die Messstudie keinen eigenen Wert, deshalb übertragen wir ihn. Das rechnet die Ersparnis gegenüber Gas eher zu niedrig als zu hoch — wir prüfen es bis Oktober 2026 nach.`}
          rows={[
            { label: "Effizienz Kühlen im Realbetrieb: Monoblock / mobile Split / fest installiert", value: AC.devices.map((d) => d.seer.toLocaleString("de-DE")).join(" / ") },
            { label: "…davon Typenschild Kühlen (EU-Label)", value: AC.devices.map((d) => `${d.labelMetric} ${d.labelValue.toLocaleString("de-DE")}`).join(" / ") },
            { label: "…davon Abschlag Labor → Realbetrieb", value: `${((1 - AC_REAL_FACTOR) * 100).toLocaleString("de-DE")} % (einheitlich für alle Gerätetypen)` },
            { label: "…davon Korrektur nachströmende Warmluft (nur Monoblock)", value: `${((1 - AC.devices[0].structuralFactor) * 100).toLocaleString("de-DE")} % (Effekt liegt außerhalb der Einkanal-Prüfnorm)` },
            { label: "Effizienz Heizen im Realbetrieb: mobile Split / fest installiert", value: `${AC.devices[1].scop!.toLocaleString("de-DE")} / ${AC.devices[2].scop!.toLocaleString("de-DE")} (Monoblock heizt nicht)` },
            { label: "…davon Typenschild Heizen (EU-Label)", value: `SCOP ${AC.devices[1].labelScop!.toLocaleString("de-DE")} / ${AC.devices[2].labelScop!.toLocaleString("de-DE")}` },
            { label: "…wie der Heiz-Wert zustande kommt", value: `Derselbe Abschlag Labor → Realbetrieb wie beim Kühlen (${((1 - AC_REAL_FACTOR) * 100).toLocaleString("de-DE")} %), damit Heizen und Kühlen im selben Gerät gleich streng gerechnet sind. Gemessen ist dieser Abschlag am Kühlen; für die Heizrichtung nennt die Messstudie den Wert nicht getrennt, deshalb übertragen wir ihn. Das ist bewusst die vorsichtige Wahl — die Ersparnis gegenüber Gas kann dadurch eher zu niedrig als zu hoch stehen. Wir prüfen es bis Oktober 2026 nach.` },
            { label: "Übergangszeit-Heizwärme (Split)", value: `${AC.heatStandards.map((s) => `${s.label} ${nf(acHeatSpecKwhPerM2(s.id))}`).join(" · ")} — kWh/m²·a je beheizter Fläche, also ${nf(AC.heatTransitionShare * 100)} % des erwarteten Jahres-Heizwärmeverbrauchs je Gebäudestandard (im Ergebnis editierbar)` },
            { label: "Anschaffung Monoblock / mobile Split", value: `~${nf(AC.devices[0].pricePerUnit!)} € / ~${nf(AC.devices[1].pricePerUnit!)} € je Gerät·Raum` },
            { label: "Anschaffung fest installierte Split", value: `${nf(AC.devices[2].priceBase!)} € + ${nf(AC.devices[2].pricePerRoom!)} €/Raum (Innengerät inkl. Montage Fachbetrieb)` },
            { label: "Kühlgradstunden Ø Deutschland", value: `${nf(AC.cdhNational)} K·h/a (Schwelle ${nf(AC.coolBaseTemp)} °C)` },
            { label: "Standort-Modi", value: `Ø ${nf(AC.avgYears)} Sommer · letzter Sommer · Projektion (CMIP6, ${AC.climateModel})` },
            { label: "Sonnen-/Lage-Faktor", value: `${AC.exposureOptions.map((o) => nf(o.factor)).join(" / ")} (sehr sonnig / normal / schattig)` },
            { label: "Dimensionierung", value: `${nf(AC.sizingWPerM2)} W/m² Kühlleistung` },
            { label: "Strommix CO₂", value: `${nf(AC.gridCo2PerKwh * 1000)} g/kWh` },
            { label: "Hitzewelle (Vorhersage)", value: `≥ ${nf(AC.heatwaveMinDays)} Tage ≥ ${nf(AC.heatwaveThreshold)} °C` },
          ]}
          source={`${AC.source}. Nächste Prüfung bis ${monthYear(AC.reviewBy)}.`}
          aufAnfrage="Effizienzwerte je Gerätetyp für Kühlen und Heizen, Anschaffungspreise, Kühlgradstunden, Sonnen- und Lagefaktoren"
        />

        {/* ── Balkonkraftwerk-Rechner ── */}
        <Section
          title="Balkonkraftwerk (Steckersolar)"
          stand={monthYear(BK.validFrom)}
          // Die beiden Rechtsaussagen stehen hier im Intro, nicht in den Zeilen:
          // Der Block ist eingeklappt, und beide tragen einen Vorbehalt, der sie
          // erst richtig macht (verbindlich vs. freiwillig). Die Zahl ohne ihren
          // Vorbehalt stehen zu lassen ist genau das Muster, vor dem CLAUDE.md
          // beim Balkon-Recht warnt — im Audit am 17.08.2026 aufgefallen.
          intro={`Annahmen des Balkonkraftwerk-Rechners. Ertrag, Eigenverbrauch und Speicher-Nutzen werden stündlich über ein Jahr simuliert — sie sind Ergebnis, nicht Annahme. Der Standort-Ertrag kommt live von PVGIS, der Strompreis ist im Ergebnis editierbar. Rechtlich verbindlich ist allein die Grenze aus § 8 Abs. 5a EEG: 2.000 Wp Module und 800 VA Wechselrichter. Die Schuko-Grenze von ${nf(BK.schukoMaxWp)} Wp stammt dagegen aus der VDE-Vornorm DIN VDE V 0126-95 — eine freiwillige Produktnorm für Hersteller, die nur für Geräte ohne Speicher gilt.`}
          rows={[
            { label: "Set-Preise: 1 Modul / 2 Module / 4 Module", value: BK.sets.map((s) => `~${nf(s.price)} €`).join(" / ") },
            { label: "Modul / Wechselrichter je Set", value: BK.sets.map((s) => `${nf(s.moduleWp)} Wp / ${nf(s.inverterW)} W`).join(" · ") },
            { label: "Gesetzliche Grenze", value: "2.000 Wp Module / 800 VA Wechselrichter (§ 8 Abs. 5a EEG) — das ist die einzige verbindliche Grenze" },
            { label: "Schuko-Grenze der VDE-Vornorm", value: `${nf(BK.schukoMaxWp)} Wp (= 800 W + 20 %), DIN VDE V 0126-95 seit 01.12.2025 — freiwillige Vornorm, Produktnorm für Hersteller, gilt nur für Geräte ohne Speicher. Darüber: spezielle Einspeisesteckdose durch Elektrofachkraft, ~${nf(BK.energySocketCostMin)}–${nf(BK.energySocketCostMax)} €` },
            { label: "Speicher-Größen & Aufpreis", value: BK.storage.filter((s) => s.kwh > 0).map((s) => `~${nf(s.kwh)} kWh: +${nf(s.price)} €`).join(" · ") },
            { label: "Speicher: Wirkungsgrad / Lebensdauer", value: `${nf(BK.storageRoundtrip * 100)} % Lade-/Entlade-Wirkungsgrad im Jahresmittel · ${nf(BK.storageLifeYears)} Jahre` },
            { label: "…woher der Wirkungsgrad kommt", value: "Kein Datenblattwert, sondern der Wert, den die HTW Berlin für Speicher dieser Größe ansetzt (Laden 91,7 % × Entladen 92 % × Batterie 97,8 %). Zur Einordnung: Gemessene Geräte erreichen bei voller Leistung 80–90 %, in der Grundlast — dem üblichen Fall — nur noch 72–80 %, weil die Elektronik dauerhaft mitläuft. Der angesetzte Wert ist eher die Ober- als die Untergrenze." },
            { label: "Speicher-Empfehlung nur bei Amortisation unter", value: `${nf(BK.storageRecommendMaxPayback)} Jahren — sonst empfehlen wir bewusst ohne` },
            { label: "Berechnung", value: "Stunden-Simulation über 12 Monate: PVGIS-Monatsertrag × Tagesverlauf, am Wechselrichter (800 W) gekappt, gegen das Haushalts-Lastprofil gerechnet, Speicher Stunde für Stunde geladen/entladen" },
            { label: "Haushalts-Lastprofil", value: "BDEW H0 / VDI 4655 — dieselbe Grundlage wie PV-Rechner und Live-Simulation" },
            { label: "Ertrag je Ausrichtung (Anteil am optimal aufgeständerten)", value: BK.orientations.map((o) => `${o.id === "sued_flach" ? "aufgeständert" : o.id === "sued_gelaender" ? "Süd senkrecht" : o.id === "ost_west" ? "Ost/West" : "Nord"} ${nf(Math.round(referenceYearKwh(o.id) / referenceYearKwh("sued_flach") * 100))} %`).join(" · ") + " — gemessen, nicht geschätzt (eigene PVGIS-Stundenreihe je Ausrichtung)" },
            { label: "Tag-Anteil am Verbrauch (selten / teils / oft zuhause)", value: BK.presence.map((p) => `${nf(p.tagQuote * 100)} %`).join(" / ") },
            { label: "Lebensdauer / Degradation", value: `${nf(BK.lifetimeYears)} Jahre · ${nf(BK.degradation * 100)} %/a` },
            { label: "Strompreisanstieg", value: `${nf(prices.electricityIncrease * 100)} % / Jahr (systemweit wie PV-Rechner)` },
            { label: "Einspeisung", value: "keine Vergütung — Überschuss fließt unvergütet ins Netz" },
          ]}
          source={`Marktpreise Steckersolar-Sets 2026 (ADAC, Stiftung Warentest, Verbraucherzentrale); Speicher-Größen/-Preise an getesteten Geräten (Anker Solarbank 2 Pro ~1,6 kWh, Anker Solarbank 3 Pro ~2,7 kWh; Quervergleich Growatt Noah 2000, Zendure SolarFlow 800 Pro — heise Bestenliste, Stiftung Warentest). § 8 Abs. 5a EEG (2.000 Wp / 800 VA), DIN VDE V 0126-95 + DKE-Normauslegung vom 17.12.2025 (Schuko-Grenze der Vornorm), PVGIS (Stundenreihen je Ausrichtung). Nächste Prüfung bis ${monthYear(BK.reviewBy)}; die VDE-Vornorm wird spätestens Ende 2028 überprüft.`}
          aufAnfrage="Set- und Speicherpreise, Wirkungsgrade, Ertragsanteile je Ausrichtung, Lebensdauer und Degradation"
        />

        {/* ── Eigenverbrauch & Verbrauch (Modell-Annahmen) ── */}
        <Section
          title="Eigenverbrauch & Verbrauch"
          stand="Modell (HTW Berlin · BDEW)"
          intro="Diese Werte beruhen auf wissenschaftlichen Lastprofilen, nicht auf tagesaktuellen Marktdaten — daher ein Modellstand statt eines Datums."
          rows={[
            { label: "Eigenverbrauchs-Modell", value: "Power-Law, HTW Berlin" },
            { label: "Grundverbrauch 1 / 2 / 3–4 / 5+ Personen", value: PERSONEN.map((p) => nf(p.verbrauch)).join(" / ") + " kWh/a" },
            { label: "Tag-Anteil je Nutzungsprofil", value: NUTZUNG.map((n) => `${nf(n.tagQuote * 100)}`).join(" / ") + " %" },
            { label: "Saisonaler Verbrauchsfaktor", value: `${nf(Math.min(...CONSUMPTION_MONTHLY))}–${nf(Math.max(...CONSUMPTION_MONTHLY))} (BDEW H0)` },
            { label: "Mehrverbrauch Wärmepumpe (Standard-Gebäude)", value: `~${nf(WP_ANNUAL_KWH)} kWh/a · im Rechner aus Wohnfläche, Dämmung & Heizsystem berechnet` },
            { label: "Mehrverbrauch E-Auto", value: `${EA_KWH_PER_KM.toLocaleString("de-DE")} kWh/km (Default ${nf(EA_DEFAULT_KM)} km/a)` },
            { label: "Mehrverbrauch Klimaanlage (Kühlung)", value: `${nf(KLIMA_KWH_PER_M2)} kWh/m²·a (Default ${nf(KLIMA_DEFAULT_M2)} m²)` },
          ]}
          source="HTW Berlin (Quaschning/Weniger, 25.000 Konfigurationen, VDI 4655) · BDEW Standardlastprofil H0"
        />

        {/* ── Wirtschaftlichkeit ── */}
        <Section
          title="Wirtschaftlichkeit"
          stand="Konvention"
          intro="Rahmen der 25-Jahres-Hochrechnung und die drei Szenarien im Amortisations-Chart."
          rows={[
            { label: "Betrachtungszeitraum", value: `${nf(YEARS)} Jahre` },
            { label: "Modul-Degradation", value: `${nf(DEGRAD * 100)} % / Jahr` },
            ...SCENARIOS.map((s) => ({
              label: `Szenario ${s.label}`,
              value: `Strompreis +${nf(s.strom * 100)} %/a · Eigenverbrauch ${s.evDelta >= 0 ? "+" : ""}${nf(s.evDelta)} %`,
            })),
            { label: "Standortertrag", value: "PVGIS (EU JRC), live je Postleitzahl" },
            { label: "PLZ → Koordinaten", value: "WZB plz_geocoord, Apache License 2.0" },
          ]}
          source="Branchenübliche Konventionen · PVGIS (Photovoltaic Geographical Information System, EU JRC) · PLZ-Koordinaten: WZB plz_geocoord (Markus Konrad), Apache License 2.0"
        />

        {/* ── Solar-Atlas & Karte ── */}
        <Section
          title="Solar-Atlas & Karte"
          stand="Amtliche Register"
          intro="Der Bestand an Solaranlagen je Bundesland, Landkreis und Gemeinde stammt aus dem Marktstammdatenregister. Die Umrisse auf der Karte sind amtliche Verwaltungsgebiete, für das Web vereinfacht."
          rows={[
            { label: "Anlagenbestand (Anzahl & Leistung)", value: "Marktstammdatenregister der Bundesnetzagentur, je Gemeinde aggregiert" },
            {
              label: "Speicherkapazität",
              value:
                "Zählt ausschließlich Batteriespeicher — Hausbatterien und gewerbliche Batterien. Pumpspeicherwerke und Speicher anderer Bauart bleiben draußen, weil ein Kraftwerk mit mehreren hundert Megawattstunden neben Hausbatterien von je rund 10 Kilowattstunden jede Vergleichszahl unbrauchbar macht. Steht so ein Speicher in der Gemeinde, weisen wir ihn mit seiner echten Zahl in einer eigenen Zeile unter den Kacheln aus — er fehlt also nicht, er wird nur nicht mit den Batterien verrechnet.",
            },
            {
              label: "Zahl der Speicher",
              value:
                "Die Anzahl unter der Kachel zählt dieselben Anlagen wie die Kapazität, also nur Batterien. Ranglisten sortieren ebenfalls nach Batteriekapazität.",
            },
            { label: "Kartenumrisse Bundesländer & Kreise", value: "BKG, Verwaltungsgebiete 1:2.500.000 (VG2500)" },
            { label: "Kartenumrisse Gemeinden", value: "BKG, Verwaltungsgebiete 1:250.000 (VG250), ~11.000 Gemeinden, je Landkreis nachgeladen" },
          ]}
          source={`${sourceLabel(DATA_SOURCES.mastr)} · ${sourceLabel(DATA_SOURCES.bkg)}`}
        />

        <p style={S.note}>
          Alle Werte sind Näherungen und im Ergebnis editierbar — passt einer nicht zu deiner
          Situation, kannst du ihn überschreiben. Wie aus diesen Werten die Rendite entsteht,
          erklärt die <Link href="/methodik" style={S.link}>Methodik-Seite</Link>.
        </p>
      </div>
    </div>
  );
}
