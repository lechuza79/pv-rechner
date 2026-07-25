import { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "../../../../components/Breadcrumb";
import ProConLists from "../../../../components/ProConLists";
import Faq from "../../../../components/Faq";
import { gasheizungWaermepumpeFaq } from "../../../../lib/faq";
import { v } from "../../../../lib/theme";
import { calcHeatPump, heatPumpScenarioAdj, type HeatPumpInputs } from "../../../../lib/heatpump";
import { DEFAULT_HEATPUMP_CONFIG } from "../../../../lib/heatpump-config";
import { annualHeatingCostSeries } from "../../../../lib/greengas";
import { PERSONEN, HAUSTYP_WP } from "../../../../lib/constants";
import { pageMetadata } from "../../../../lib/seo";
import GasVsWpChart, { type MusterVariant } from "./_components/GasVsWpChart";

// Zahlen kommen live aus denselben Modellen wie der Wärmepumpen-Rechner
// (calcHeatPump + Grüngas-Preispfad). ISR hält sie frisch ohne Rebuild.
export const revalidate = 3600;

// Datierter Sachstand eines beschlossenen Gesetzes — bewusst als Stichtag, kein
// rollierender „aktuelles Jahr"-Wert (CLAUDE.md-Regel).
const GESETZ_STAND = "Juli 2026";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    path: "/ratgeber/gasheizung-oder-waermepumpe",
    title: "Gasheizung oder Wärmepumpe: Was rechnet sich noch?",
    description:
      "Das neue Heizungsgesetz erlaubt Gasheizungen wieder — aber die Grüngas-Pflicht macht sie ab 2029 zur Kostenfalle. Die ehrliche Rechnung: auch im unsanierten Altbau ist die Wärmepumpe über 20 Jahre klar günstiger. Live gerechnet, ohne Anmeldung.",
    ogImageTitle: "Gasheizung oder Wärmepumpe?",
    ogImageSubtitle: "Warum die neue Gasheizung zur Kostenfalle wird.",
  });
}

// ─── Styles (content-page conventions) ───────────────────────────────────────
const S = {
  page: { background: v("--color-bg"), fontFamily: v("--font-text"), color: v("--color-text-primary"), minHeight: "100vh", padding: "0 16px 20px" },
  wrap: { maxWidth: v("--content-max-width"), margin: "0 auto", paddingTop: "var(--content-lede-top)" },
  h1: { fontSize: v("--font-size-h1"), fontWeight: 800, letterSpacing: "-0.02em", color: v("--color-text-primary"), lineHeight: 1.25, marginBottom: 10 },
  subtitle: { fontSize: v("--font-size-lead"), color: v("--color-text-muted"), marginBottom: 24, lineHeight: 1.6 },
  h2: { fontSize: v("--font-size-h2"), fontWeight: 700, color: v("--color-text-primary"), marginTop: 32, marginBottom: 10 },
  p: { fontSize: v("--font-size-body"), color: v("--color-text-muted"), lineHeight: 1.7, marginBottom: 12 },
  strong: { fontWeight: 700, color: v("--color-text-primary") },
  hero: { background: v("--color-bg-accent"), borderRadius: v("--radius-lg"), padding: "16px 18px", marginBottom: 8, fontSize: v("--font-size-body"), color: v("--color-text-primary"), lineHeight: 1.7 },
  card: { background: v("--color-bg"), borderRadius: v("--radius-md"), padding: "14px 16px", border: `1px solid ${v("--color-border")}`, marginBottom: 12, fontSize: v("--font-size-body"), color: v("--color-text-muted"), lineHeight: 1.7 },
  label: { fontSize: v("--font-size-caption"), fontWeight: 700, color: v("--color-text-secondary"), textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: 6, display: "block" },
  accent: { color: v("--color-accent"), fontWeight: 600 },
  link: { color: v("--color-accent"), textDecoration: "none", fontWeight: 600 },
  ctaButton: { display: "inline-block", padding: "10px 18px", borderRadius: v("--radius-md"), fontSize: v("--font-size-body"), fontWeight: 700, background: v("--color-accent"), color: v("--color-text-on-accent"), textDecoration: "none" },
  small: { fontSize: v("--font-size-small"), color: v("--color-text-muted"), lineHeight: 1.6 },
};

// ─── Live-Rechnung: zwei Muster-EFH (teilsaniert / unsaniert) ─────────────────
// Beide 140 m², freistehend, mit den EXAKT gleichen Funktionen wie der Rechner
// (shared calc base). Unsaniert bewusst mit alten Heizkörpern (hk_alt) → ehrlich
// schlechtere Arbeitszahl, trotzdem klar günstiger als die Gasheizung.
const cfg = DEFAULT_HEATPUMP_CONFIG;
const PV_COVERAGE = 0.3;

function musterVariant(key: string, label: string, insulationIdx: number, heizsystem: HeatPumpInputs["heizsystem"]): MusterVariant {
  const inputs: HeatPumpInputs = {
    situation: "bestand", wohnflaeche: 140, insulationIdx,
    personen: PERSONEN[2].count, heizsystem, wpType: "lwwp",
    haustypFaktor: HAUSTYP_WP[0].faktor, override: { klimaBonus: true },
  };
  const r = calcHeatPump({ ...inputs, greenGas: true }, cfg, heatPumpScenarioAdj("realistic"));
  const fuelKwh = r.qGes / cfg.gasEfficiency;
  const { series, totals } = annualHeatingCostSeries({
    years: 20, fuelKwh, eWpKwh: r.eWp, wpTarifEurKwh: cfg.wpTarif, stromInflation: cfg.stromInflation, pvCoverage: PV_COVERAGE,
  });
  return {
    key, label,
    sub: `Freistehendes Einfamilienhaus, 140 m² · Arbeitszahl ${r.jaz.toLocaleString("de-DE")} · rund ${Math.round(fuelKwh / 100) / 10} MWh Gas im Jahr`,
    series, totals,
  };
}

export default function GasheizungWaermepumpePage() {
  const variants = [
    musterVariant("teil", "Teilsaniert", 1, "hk_neu"),
    musterVariant("unsan", "Unsaniert", 0, "hk_alt"),
  ];
  const faqItems = gasheizungWaermepumpeFaq();

  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <Breadcrumb
          items={[
            { label: "Start", href: "/" },
            { label: "Ratgeber", href: "/ratgeber" },
            { label: "Gasheizung oder Wärmepumpe?" },
          ]}
          jsonLd
        />

        <h1 style={S.h1}>Gasheizung oder Wärmepumpe: Was rechnet sich noch?</h1>
        <p style={S.subtitle}>
          Das neue Heizungsgesetz erlaubt Gasheizungen wieder — die Anschaffung ist günstig,
          die Entscheidung fühlt sich einfach an. Aber ab 2029 greift die Grüngas-Pflicht, und
          die macht eine neue Gasheizung Jahr für Jahr teurer. Hier ist die ehrliche Rechnung,
          mit denselben Zahlen wie unser Rechner.
        </p>

        {/* ── Kurzantwort ── */}
        <div style={S.hero}>
          <span style={S.label}>Die Kurzantwort</span>
          <strong style={S.strong}>Die Wärmepumpe — und zwar deutlich.</strong> Eine neue
          Gasheizung ist in der Anschaffung billiger, wird im Betrieb aber zur Kostenfalle:
          Durch die gesetzliche Beimischung von teurem Biomethan und steigende Netzentgelte
          verdoppeln sich die Gaskosten bis 2040 nahezu. Die Wärmepumpe bleibt dagegen günstig
          — und das gilt selbst im unsanierten Altbau, wo viele sie für unmöglich halten.
        </div>
        <p style={{ ...S.small, marginBottom: 0 }}>
          Stand {GESETZ_STAND} · Muster-Einfamilienhaus, live gerechnet · unverbindliche Näherungswerte, ohne Gewähr.
        </p>

        {/* ── Das Gesetz ── */}
        <h2 style={S.h2}>Das neue Heizungsgesetz: Gasheizung wieder erlaubt</h2>
        <p style={S.p}>
          Mit dem <strong style={S.strong}>Gebäudemodernisierungsgesetz (GModG)</strong>, im Juli
          2026 beschlossen, fällt die umstrittene 65-Prozent-Erneuerbaren-Pflicht. Eine neue
          Gas- oder Ölheizung darf wieder grundsätzlich eingebaut werden. Das klingt nach
          Entwarnung — doch das Gesetz verschiebt die Kosten nur: vom günstigen Einbau in den
          teuren Betrieb. Denn ab 2029 muss jede neue Gasheizung teures Grüngas beimischen. Die
          Rechnung über 20 Jahre zeigt, was das bedeutet:
        </p>

        {/* ── Chart: prominent direkt nach der Einordnung ── */}
        <GasVsWpChart variants={variants} pvCoveragePct={Math.round(PV_COVERAGE * 100)} />

        {/* ── Grüngas-Pflicht: Details ── */}
        <h2 style={S.h2}>Warum die neue Gasheizung zur Kostenfalle wird</h2>
        <p style={S.p}>
          Wer ab 2029 eine neue Gasheizung betreibt, muss einen wachsenden Anteil
          klimaneutrales Gas beimischen — die <strong style={S.strong}>Bio-Treppe</strong>:
          10 Prozent 2029, 30 Prozent 2035, 60 Prozent 2040 und 100 Prozent ab 2045. Dieses
          Biomethan kostet rund doppelt so viel wie Erdgas. Dazu steigen die Gasnetzentgelte,
          weil immer weniger Haushalte am Gasnetz hängen und dessen Fixkosten sich auf weniger
          Schultern verteilen.
        </p>
        <div style={S.card}>
          <span style={S.accent}>Das Ergebnis:</span> Für einen typischen Haushalt steigen die
          reinen Gaskosten laut Institut der deutschen Wirtschaft von rund 1.080 € (2026) auf
          etwa 1.950 € (2040) — fast eine Verdopplung. Der CO₂-Preis ist dabei nur ein kleiner
          Teil; den Löwenanteil macht das teure Grüngas aus.
        </div>

        {/* ── Altbau ── */}
        <h2 style={S.h2}>Und im unsanierten Altbau?</h2>
        <p style={S.p}>
          „Im Altbau geht keine Wärmepumpe" ist der hartnäckigste Irrtum. Richtig ist nur: Im
          unsanierten Haus arbeitet sie mit höheren Vorlauftemperaturen und damit schlechterer
          Arbeitszahl — sie braucht mehr Strom. Genau das steckt oben im Umschalter „Unsaniert",
          ehrlich eingerechnet samt alter Heizkörper. Trotzdem bleibt sie über 20 Jahre klar
          günstiger, <strong style={S.strong}>gerade weil die Gasheizung so teuer wird</strong>.
          Größere Heizkörper oder eine schrittweise Sanierung verbessern die Arbeitszahl
          zusätzlich — nötig für den Betrieb sind sie nicht.
        </p>

        {/* ── Abwägung ── */}
        <h2 style={S.h2}>Die ehrliche Abwägung</h2>
        <ProConLists
          proTitle="Spricht für die Wärmepumpe"
          proItems={[
            { term: "Niedrige laufende Kosten", desc: "Strom statt teurer werdendem Gas — über 20 Jahre der entscheidende Hebel." },
            { term: "Hohe Förderung", desc: "Die BEG-Förderung deckt oft 50 bis 70 % der Investition." },
            { term: "Unabhängig vom Grüngas-Risiko", desc: "Keine Beimischpflicht, keine Netzentgelt-Umlage des schrumpfenden Gasnetzes." },
            { term: "Mit PV noch günstiger", desc: "Eigener Solarstrom senkt die Heizkosten weiter." },
          ]}
          conTitle="Spricht für die neue Gasheizung"
          conItems={[
            { term: "Günstigere Anschaffung", desc: "Der Einbau kostet weniger — der Vorteil schrumpft aber mit den Betriebskosten." },
            { term: "Vertraute Technik", desc: "Kein Umdenken, kein Heizkörper-Thema — dafür das volle Preisrisiko ab 2029." },
            { term: "Kurzfristig einfach", desc: "Schnell getauscht. Langfristig die teurere Wette." },
          ]}
        />

        {/* ── Anschaffung ── */}
        <h2 style={S.h2}>Und die höhere Anschaffung?</h2>
        <p style={S.p}>
          Stimmt — eine Wärmepumpe kostet im Einbau mehr als eine Gastherme. Aber die
          BEG-Förderung fängt einen großen Teil davon auf, und der laufende Kostenvorteil holt
          den Rest über die Jahre mehrfach herein. Was für dein Haus herauskommt — mit
          Förderung, Amortisation und optionaler PV-Anlage — rechnet unser Wärmepumpen-Rechner
          in einer Minute aus.
        </p>
        <p style={{ marginBottom: 24 }}>
          <Link href="/waermepumpe-rechner" style={S.ctaButton}>Für dein Haus durchrechnen →</Link>
        </p>

        {/* ── FAQ ── */}
        <Faq
          items={faqItems}
          title="Häufige Fragen: Gasheizung oder Wärmepumpe"
          currentPath="/ratgeber/gasheizung-oder-waermepumpe"
        />

        <p style={{ ...S.small, marginTop: 24 }}>
          Preispfade nach dem IW-Report 36/2026 „Mehrkostenrisiken durch das
          Gebäudemodernisierungsgesetz" (Institut der deutschen Wirtschaft). Die Beimischpflicht
          ist beschlossenes Recht; die Kostenhöhe ist ein plausibler Korridor, keine
          punktgenaue Prognose. Die Heizkosten-Grafik gibt es auch als{" "}
          <Link href="/energie-widgets#gruengas-heizkosten" style={S.link}>Widget zum Einbetten</Link>.
        </p>
      </div>
    </div>
  );
}
