import { Metadata } from "next";
import Link from "next/link";
import { IconArrowRight } from "../../../components/Icons";
import { v } from "../../../lib/theme";
import { supabase } from "../../../lib/supabase-server";
import { DEFAULT_PRICES, type PriceConfig } from "../../../lib/prices-config";
import { DEFAULT_FEED_IN, type FeedInRates } from "../../../lib/feedin-config";
import { CO2_PRICE, co2PriceForCalendarYear } from "../../../lib/co2-config";
import { DEFAULT_HEATPUMP_CONFIG as HP } from "../../../lib/heatpump-config";
import { DEFAULT_AIRCON_CONFIG as AC } from "../../../lib/aircon-config";
import { DEFAULT_BALKON_CONFIG as BK } from "../../../lib/balkon-config";
import { YEAR, YEARS, DEGRAD, PERSONEN, NUTZUNG, CONSUMPTION_MONTHLY, SCENARIOS } from "../../../lib/constants";
import { WP_ANNUAL_KWH, EA_KWH_PER_KM, EA_DEFAULT_KM, KLIMA_KWH_PER_M2, KLIMA_DEFAULT_M2 } from "../../../lib/consumption";
import { pageMetadata } from "../../../lib/seo";

// ISR: re-render hourly so live market prices / feed-in rates stay current
// without a deploy. The page reads from the same Supabase tables + config
// modules the calculator uses, so the displayed values can never drift from
// what is actually computed.
export const revalidate = 3600;

export const metadata: Metadata = pageMetadata({
  path: "/datenstand",
  title: "Datenstand – Alle Annahmen & Werte im Überblick",
  description: "Jeder Wert, mit dem Solar Check rechnet: Preise, Einspeisevergütung, CO₂-Preis, Wärmepumpen-Annahmen — mit Stand und Quelle. Transparent statt Blackbox.",
  ogImageTitle: "Datenstand",
  ogImageSubtitle: "Jeder Wert mit Stand und Quelle — offengelegt.",
});

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
    lineHeight: 1.2,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: v("--color-text-muted"),
    marginBottom: 28,
    lineHeight: 1.6,
  },
  section: { marginTop: 30 },
  h2row: { display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 4 },
  h2: {
    fontSize: 16,
    fontWeight: 700,
    color: v("--color-text-primary"),
  },
  stand: {
    fontSize: 11,
    fontWeight: 700,
    color: v("--color-accent"),
    fontFamily: v("--font-mono"),
    whiteSpace: "nowrap" as const,
  },
  intro: { fontSize: 12.5, color: v("--color-text-muted"), lineHeight: 1.6, marginBottom: 12 },
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
    fontSize: 13,
  },
  rowFirst: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 14,
    padding: "11px 14px",
    fontSize: 13,
  },
  rowLabel: { color: v("--color-text-muted"), lineHeight: 1.4 },
  rowValue: {
    fontFamily: v("--font-mono"),
    fontSize: 12.5,
    color: v("--color-text-primary"),
    fontWeight: 600,
    textAlign: "right" as const,
    flexShrink: 0,
    maxWidth: "62%",
  },
  source: {
    fontSize: 11,
    color: v("--color-text-faint"),
    marginTop: 8,
    lineHeight: 1.5,
  },
  note: {
    fontSize: 12,
    color: v("--color-text-muted"),
    lineHeight: 1.65,
    background: v("--color-bg-accent"),
    borderRadius: v("--radius-md"),
    padding: "12px 14px",
    marginTop: 28,
  },
  link: { color: v("--color-accent"), textDecoration: "none", fontWeight: 600 },
};

const nf = (n: number) => n.toLocaleString("de-DE");
const monthYear = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("de-DE", { month: "long", year: "numeric" });

// Prices payload = PV/battery/electricity + the live Wärmepumpen-Grundpreis
// (Luft/Wasser), both from the same market_prices row the calculator reads.
type PricesWithWp = PriceConfig & { wpLwwpBase: number; wpLwwpPerKw: number };
const DEFAULT_PRICES_WP: PricesWithWp = {
  ...DEFAULT_PRICES,
  wpLwwpBase: HP.investLwwpBase,
  wpLwwpPerKw: HP.investLwwpPerKw,
};

async function fetchPrices(): Promise<PricesWithWp> {
  if (!supabase) return DEFAULT_PRICES_WP;
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
    if (!data) return DEFAULT_PRICES_WP;
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
      wpLwwpBase: data.wp_lwwp_base != null ? Number(data.wp_lwwp_base) : HP.investLwwpBase,
      wpLwwpPerKw: data.wp_lwwp_per_kw != null ? Number(data.wp_lwwp_per_kw) : HP.investLwwpPerKw,
    };
  } catch {
    return DEFAULT_PRICES_WP;
  }
}

async function fetchFeedIn(): Promise<FeedInRates> {
  if (!supabase) return DEFAULT_FEED_IN;
  try {
    const { data } = await supabase
      .from("feed_in_rates")
      .select("*")
      .lte("valid_from", new Date().toISOString().split("T")[0])
      .order("valid_from", { ascending: false })
      .limit(1)
      .single();
    if (!data) return DEFAULT_FEED_IN;
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
    return DEFAULT_FEED_IN;
  }
}

type Row = { label: string; value: string };

function Section({ title, stand, intro, rows, source }: {
  title: string;
  stand: string;
  intro?: string;
  rows: Row[];
  source: string;
}) {
  return (
    <div style={S.section}>
      <div style={S.h2row}>
        <h2 style={S.h2}>{title}</h2>
        <span style={S.stand}>Stand {stand}</span>
      </div>
      {intro && <p style={S.intro}>{intro}</p>}
      <div style={S.card}>
        {rows.map((r, i) => (
          <div key={r.label} style={i === 0 ? S.rowFirst : S.row}>
            <span style={S.rowLabel}>{r.label}</span>
            <span style={S.rowValue}>{r.value}</span>
          </div>
        ))}
      </div>
      <p style={S.source}>Quelle: {source}</p>
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
        <Link href="/" style={S.back}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <IconArrowRight size={12} style={{ transform: "rotate(180deg)" }} /> Zurück zum Rechner
          </span>
        </Link>

        <h1 style={S.h1}>Datenstand</h1>
        <p style={S.subtitle}>
          Wir rechnen mit offengelegten Annahmen statt einer Blackbox. Hier steht jeder
          Wert, der in die Berechnung einfließt — mit Stand und Quelle. Marktdaten
          (Preise, Vergütung) aktualisieren wir laufend; Modell-Annahmen beruhen auf
          wissenschaftlichen Lastprofilen und ändern sich selten.
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
            { label: `Teileinspeisung bis ${nf(feedin.thresholdKwp)} kWp`, value: `${nf(feedin.teilUnder10)} ct/kWh` },
            { label: `Teileinspeisung über ${nf(feedin.thresholdKwp)} kWp`, value: `${nf(feedin.teilOver10)} ct/kWh` },
            { label: `Volleinspeisung bis ${nf(feedin.thresholdKwp)} kWp`, value: `${nf(feedin.vollUnder10)} ct/kWh` },
            { label: `Volleinspeisung über ${nf(feedin.thresholdKwp)} kWp`, value: `${nf(feedin.vollOver10)} ct/kWh` },
          ]}
          source={feedin.source || "Bundesnetzagentur, § 48 EEG"}
        />

        {/* ── CO2-Preis (Heizen, für WP-Vergleich) ── */}
        <Section
          title="CO₂-Preis (Heizen)"
          stand={monthYear(CO2_PRICE.validFrom)}
          intro="Aufschlag auf Gas/Öl im Wärmepumpen-Vergleich. Gesetzlicher Korridor für die nächsten Jahre, danach konservativer Forecast für den EU-Emissionshandel ab 2028."
          rows={co2Rows}
          source={`${CO2_PRICE.source}. Nächste Prüfung bis ${monthYear(CO2_PRICE.reviewBy)}.`}
        />

        {/* ── Wärmepumpe ── */}
        <Section
          title="Wärmepumpe"
          stand={monthYear(HP.validFrom)}
          intro="Annahmen des Wärmepumpen-Rechners: Heizbedarf, Effizienz, Investition und Förderung. Alle Werte im Ergebnis editierbar."
          rows={[
            { label: "Spez. Heizbedarf Bestand (unsaniert–saniert)", value: `${HP.specDemandBestand[2]}–${HP.specDemandBestand[0]} kWh/m²·a` },
            { label: "Spez. Heizbedarf Neubau (KfW 40+–EnEV)", value: `${HP.specDemandNeubau[2]}–${HP.specDemandNeubau[0]} kWh/m²·a` },
            { label: "Warmwasser je Person", value: `${nf(HP.wwPerPerson)} kWh/a` },
            { label: "Investition Luft/Wasser (Basis laufend aktualisiert)", value: `${nf(prices.wpLwwpBase)} € + ${nf(prices.wpLwwpPerKw)} €/kW` },
            { label: "Investition Sole/Wasser", value: `${nf(HP.investSwwpBase)} € + ${nf(HP.investSwwpPerKw)} €/kW` },
            { label: "BEG-Förderung (Grund + Boni)", value: `${nf(HP.begGrundfoerderung * 100)}–${nf(HP.begMaxRate * 100)} %, max. ${nf(HP.begMaxCap)} €` },
            { label: "WP-Stromtarif (§ 14a EnWG)", value: `${(HP.wpTarif * 100).toLocaleString("de-DE", { maximumFractionDigits: 1 })} ct/kWh` },
            { label: "Gas-Referenz", value: `${nf(HP.gasPriceCtPerKwh)} ct/kWh, ${nf(HP.gasCo2PerKwh * 1000)} g CO₂/kWh` },
          ]}
          source={`${HP.source}. Luft/Wasser-Grundpreis laufend aus Marktdaten (taptaphome.com).`}
        />

        {/* ── Klimaanlagen-Rechner ── */}
        <Section
          title="Klimaanlage (Kühlkosten-Rechner)"
          stand={monthYear(AC.validFrom)}
          intro="Annahmen des Klimaanlagen-Rechners: Geräte-Effizienz, Preise, Klima- und Hitzedaten. Kern ist Kühlung; Split-Geräte können zusätzlich in der Übergangszeit heizen (günstiger als Gas). Strompreis und Kühlgradstunden im Ergebnis editierbar."
          rows={[
            { label: "Effizienz Kühlen (SEER): Monoblock / mobile Split / fest installiert", value: AC.devices.map((d) => d.seer.toLocaleString("de-DE")).join(" / ") },
            { label: "Effizienz Heizen (SCOP): mobile Split / fest installiert", value: `${AC.devices[1].scop!.toLocaleString("de-DE")} / ${AC.devices[2].scop!.toLocaleString("de-DE")} (Monoblock heizt nicht)` },
            { label: "Übergangszeit-Heizwärme (Split)", value: `${nf(AC.heatSpecKwhPerM2)} kWh/m²·a je beheizter Fläche (editierbar)` },
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
        />

        {/* ── Balkonkraftwerk-Rechner ── */}
        <Section
          title="Balkonkraftwerk (Steckersolar)"
          stand={monthYear(BK.validFrom)}
          intro="Annahmen des Balkonkraftwerk-Rechners: Set-Preise, Wechselrichter-Grenze und Eigenverbrauch. Der Standort-Ertrag kommt live von PVGIS, der Strompreis ist im Ergebnis editierbar."
          rows={[
            { label: "Set-Preise: 1 Modul / 2 Module / 4 Module", value: BK.sets.map((s) => `~${nf(s.price)} €`).join(" / ") },
            { label: "Modul / Wechselrichter je Set", value: BK.sets.map((s) => `${nf(s.moduleWp)} Wp / ${nf(s.inverterW)} W`).join(" · ") },
            { label: "Wechselrichter-Deckel", value: `${nf(BK.maxFullLoadHours)} Volllaststunden/a → 800 W ≈ ${nf(Math.round(0.8 * BK.maxFullLoadHours))} kWh/a` },
            { label: "Ausrichtungsfaktor (aufgeständert / Geländer / Ost-West / verschattet)", value: BK.orientations.map((o) => nf(o.factor)).join(" / ") },
            { label: "Eigenverbrauch", value: `grundlast-gedeckt, Anteil sinkt mit Anlagengröße (${nf(BK.selfShareMin * 100)}–${nf(BK.selfShareMax * 100)} %)` },
            { label: "Lebensdauer / Degradation", value: `${nf(BK.lifetimeYears)} Jahre · ${nf(BK.degradation * 100)} %/a` },
            { label: "Einspeisung", value: "keine Vergütung — Überschuss fließt unvergütet ins Netz" },
          ]}
          source={`Marktpreise Steckersolar-Sets 2026, Solarpaket I (800-W-Grenze), HTW Berlin Stecker-Solar-Simulator (Eigenverbrauch), PVGIS (Ertrag). Nächste Prüfung bis ${monthYear(BK.reviewBy)}.`}
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

        <p style={S.note}>
          Alle Werte sind Näherungen und im Ergebnis editierbar — passt einer nicht zu deiner
          Situation, kannst du ihn überschreiben. Wie aus diesen Werten die Rendite entsteht,
          erklärt die <Link href="/methodik" style={S.link}>Methodik-Seite</Link>.
        </p>
      </div>
    </div>
  );
}
