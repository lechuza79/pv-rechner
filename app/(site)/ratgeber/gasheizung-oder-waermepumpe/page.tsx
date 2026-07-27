import { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "../../../../components/Breadcrumb";
import ProConLists from "../../../../components/ProConLists";
import Faq from "../../../../components/Faq";
import { gasheizungWaermepumpeFaq } from "../../../../lib/faq";
import { v } from "../../../../lib/theme";
import { pageMetadata } from "../../../../lib/seo";
import ArticleMeta from "../../../../components/ArticleMeta";
import GruengasWidget from "../../../../components/charts/GruengasWidget";
import { greengasMusterVariants, PV_COVERAGE } from "../../../../lib/greengas-muster";
import { DataSourceNote } from "../../../../components/PoweredBy";
import { DATA_SOURCES } from "../../../../lib/data-sources";
import { bioTreppeStufenText, gmodgStandSatz, GMODG_RECHTSSTAND } from "../../../../lib/greengas-config";

// Zahlen kommen live aus denselben Modellen wie der Wärmepumpen-Rechner
// (calcHeatPump + Grüngas-Preispfad). ISR hält sie frisch ohne Rebuild.
export const revalidate = 3600;

// Datierter Sachstand des Gesetzgebungsverfahrens — bewusst als Stichtag, kein
// rollierender „aktuelles Jahr"-Wert (CLAUDE.md-Regel). Stufen und Verfahrensstand
// kommen aus lib/greengas-config (eine Quelle für Artikel, FAQ und Rechner).
const GESETZ_STAND = GMODG_RECHTSSTAND.stand;

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

// EIN Grüngas-Widget (components/charts/GruengasWidget) — hier DIREKT gerendert
// (folgt dem Seiten-Theme, wie die Landkarte auf der Startseite), dasselbe Bauteil
// ist unter /embed/gruengas-heizkosten einbettbar. onsite: keine Powered-by/
// In-Widget-Quelle (die Seite kreditiert; Quelle steht unter dem Widget). In der
// Kurzantwort nur die Balken (view=bars), unten das ganze Widget (view=full).
export default function GasheizungWaermepumpePage() {
  const faqItems = gasheizungWaermepumpeFaq();
  const variants = greengasMusterVariants();
  const pvPct = Math.round(PV_COVERAGE * 100);

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
          die macht eine neue Gasheizung Jahr für Jahr teurer.
        </p>

        <ArticleMeta
          headline="Gasheizung oder Wärmepumpe: Was rechnet sich noch?"
          description="Gasheizung vs. Wärmepumpe über 20 Jahre — auch im unsanierten Altbau."
          path="/ratgeber/gasheizung-oder-waermepumpe"
          published="2026-07-25"
          modified="2026-07-26"
        />

        {/* ── Kurzantwort: Text + Balken-Ansicht des Widgets (mobil darunter,
             Desktop daneben) ── */}
        <div style={S.hero}>
          <span style={S.label}>Die Kurzantwort</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "flex-start", marginTop: 4 }}>
            <div style={{ flex: "1 1 240px", minWidth: 0 }}>
              <strong style={S.strong}>Die Wärmepumpe ist die günstigste Variante — und zwar deutlich.</strong> Eine neue
              Gasheizung ist in der Anschaffung billiger, wird im Betrieb aber zur Kostenfalle:
              Durch die gesetzliche Beimischung von teurem Biomethan und steigende Netzentgelte
              verdoppeln sich die Gaskosten bis 2040 laut IW-Report nahezu. Die Wärmepumpe bleibt dagegen günstig
              — und das gilt selbst im unsanierten Altbau, wo viele sie für unmöglich halten.
            </div>
            <div style={{ flex: "1 1 260px", minWidth: 0, borderLeft: `1px solid ${v("--color-border")}`, paddingLeft: 20 }}>
              <GruengasWidget variants={variants} pvCoveragePct={pvPct} view="bars" onsite branding={false} />
            </div>
          </div>
        </div>
        <p style={{ ...S.small, marginBottom: 0 }}>
          Stand {GESETZ_STAND} · Muster-Einfamilienhaus, live gerechnet · unverbindliche Näherungswerte, ohne Gewähr.
        </p>

        {/* ── Das Gesetz ── */}
        <h2 style={S.h2}>Das neue Heizungsgesetz: Gasheizung wieder erlaubt</h2>
        <p style={S.p}>
          Mit dem <strong style={S.strong}>Gebäudemodernisierungsgesetz (GModG)</strong> fällt die
          umstrittene 65-Prozent-Erneuerbaren-Pflicht. {gmodgStandSatz()} Eine neue
          Gas- oder Ölheizung darf damit wieder grundsätzlich eingebaut werden. Das klingt nach
          Entwarnung — doch das Gesetz verschiebt die Kosten nur: vom günstigen Einbau in den
          teuren Betrieb. Denn ab 2029 muss jede neue Gasheizung teures Grüngas beimischen. Die
          Rechnung über 20 Jahre zeigt, was das bedeutet:
        </p>

        {/* ── Das ganze Kombi-Widget (Graph + Ersparnis + Kosten) ── */}
        <GruengasWidget variants={variants} pvCoveragePct={pvPct} view="full" onsite branding={false} />
        <div style={{ margin: "8px 0 16px", fontSize: v("--font-size-caption"), color: v("--color-text-muted") }}>
          <DataSourceNote source={DATA_SOURCES.iw} />
        </div>

        {/* ── Grüngas-Pflicht: Details ── */}
        <h2 style={S.h2}>Warum die neue Gasheizung zur Kostenfalle wird</h2>
        <p style={S.p}>
          Wer ab 2029 eine neue Gasheizung betreibt, muss einen wachsenden Anteil
          klimafreundlicher Brennstoffe beimischen — die <strong style={S.strong}>Bio-Treppe</strong>.
          Das Gesetz nennt vier Stufen: {bioTreppeStufenText("Prozent")}. Anrechenbar sind neben
          Biomethan auch Bioöl, biogenes Flüssiggas sowie Wasserstoff und daraus hergestellte
          Derivate. Beim leitungsgebundenen Gas führt das in der Praxis zu Biomethan, und das
          kostet rund doppelt so viel wie Erdgas. Dazu steigen die Gasnetzentgelte,
          weil immer weniger Haushalte am Gasnetz hängen und dessen Fixkosten sich auf weniger
          Schultern verteilen. Die Beimischpflicht trifft dabei <strong style={S.strong}>neu
          eingebaute</strong> Gasheizungen ab 2029 — wer bereits eine Gasheizung hat, genießt
          Bestandsschutz. Wer jetzt aber neu entscheidet, sollte mit diesen Kosten rechnen.
        </p>
        <p style={S.p}>
          Über 2040 hinaus schreibt die Bio-Treppe nichts fort — eine 100-Prozent-Stufe steht
          nicht im Gesetz. Dass Heizungsbrennstoffe ab 2045 vollständig klimaneutral sein sollen,
          ergibt sich aus einer eigenen Ankündigung des Gesetzes (§ 42a GModG): Die Quote für die
          Brennstoff-Anbieter soll bis zum {GMODG_RECHTSSTAND.quoteGesetzBis} in einem gesonderten
          Gesetz festgelegt werden. Solange das aussteht, ist alles, was für 2045 gerechnet wird,
          eine Annahme — und keine Folge des heutigen Gesetzes.
        </p>
        <div style={S.card}>
          <span style={S.accent}>Das Ergebnis:</span> Der Gaspreis je Kilowattstunde steigt laut
          Institut der deutschen Wirtschaft von rund 11 Cent (2026) auf etwa 20 Cent (2040) —
          fast eine Verdopplung. Den vom IW für 2045 gerechneten Wert von rund 24 Cent trägt
          dessen Annahme einer dann vollständig klimaneutralen Versorgung. Wie stark das aufs Jahr
          durchschlägt, hängt vom Verbrauch ab (im Chart oben der Muster-Altbau). Der CO₂-Preis
          ist dabei nur ein kleiner Teil; den Löwenanteil macht das teure Grüngas aus.
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
          Preispfade nach dem{" "}
          <a href={DATA_SOURCES.iw.url} target="_blank" rel="noopener noreferrer" style={S.link}>
            IW-Report 36/2026 „Mehrkostenrisiken durch das Gebäudemodernisierungsgesetz"
          </a>{" "}
          (Institut der deutschen Wirtschaft), einem arbeitgebernahen Institut. Beschlossen ist
          die Beimischpflicht mit ihren vier Stufen bis 2040; die Kostenhöhe und die Fortschreibung
          bis 2045 sind Annahmen des Reports — ein plausibler Korridor, keine punktgenaue
          Prognose. Die Heizkosten-Grafik gibt es auch als{" "}
          <Link href="/energie-widgets#gruengas-heizkosten" style={S.link}>Widget zum Einbetten</Link>.
        </p>
      </div>
    </div>
  );
}
