import { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "../../../../components/Breadcrumb";
import ProConLists from "../../../../components/ProConLists";
import Faq from "../../../../components/Faq";
import RelatedLinks from "../../../../components/RelatedLinks";
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
    // Ohne diese Angabe erbt die Seite die PV-Keywords aus dem Site-Layout.
    keywords: [
      "Gasheizung oder Wärmepumpe",
      "Grüngas-Pflicht",
      "Bio-Treppe GModG",
      "Gebäudemodernisierungsgesetz Heizung",
      "Wärmepumpe Altbau lohnt sich",
      "Heizkosten Vergleich Gas Wärmepumpe",
      "neues Heizungsgesetz 2026",
    ],
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
          modified="2026-07-27"
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
          Die <strong style={S.strong}>Bio-Treppe</strong> gilt für Heizungen für Gas, Heizöl oder
          Flüssiggas, die{" "}
          <strong style={S.strong}>nach dem Inkrafttreten des Gesetzes eingebaut</strong> werden.
          Maßgeblich ist dabei der tatsächliche Einbau, nicht das Bestell- oder Rechnungsdatum.
          Wer eine solche Heizung betreibt, muss ab 2029 einen wachsenden Anteil klimafreundlicher
          Brennstoffe beimischen. Das Gesetz nennt vier Stufen: {bioTreppeStufenText("Prozent")}.
          Anrechenbar sind neben Biomethan auch Bioheizöl, biogenes Flüssiggas sowie grüner, blauer, orangener oder türkiser Wasserstoff und
          daraus hergestellte Derivate. Beim leitungsgebundenen Gas führt das in der Praxis zu
          Biomethan, und das kostet rund doppelt so viel wie Erdgas. Dazu steigen die
          Gasnetzentgelte, weil immer weniger Haushalte am Gasnetz hängen und dessen Fixkosten
          sich auf weniger Schultern verteilen.
        </p>
        <p style={S.p}>
          <strong style={S.strong}>Und wenn ich neu baue?</strong> Dann gilt dieselbe Treppe — mit
          einer Frist. Der Paragraf mit der Beimischpflicht steht zwar im Kapitel über bestehende
          Gebäude und beschreibt dort den Einbau in ein bestehendes Gebäude; für neu errichtete
          Gebäude verweist das Gesetz aber ausdrücklich auf dieselben Vorgaben, und die
          Gesetzesbegründung sagt es wörtlich: Diese Maßgaben seien „für neu zu errichtende
          Gebäude nach § 10 Absatz 2 Nummer 3 einzuhalten" (Bundestags-Drucksache 21/6278,
          Seite 96). Erfasst sind Gebäude, die{" "}
          <strong style={S.strong}>bis zum {GMODG_RECHTSSTAND.neubauBioTreppeBis}</strong> errichtet
          werden. Diese Grenze steht nicht im Gesetzestext, sondern folgt daraus, dass zum{" "}
          {GMODG_RECHTSSTAND.neubauNullemissionAb} eine strengere Regel an ihre Stelle tritt;
          benannt wird sie in der Gesetzesbegründung (Seite 125). Ob dabei das Datum des
          Bauantrags oder der Fertigstellung zählt, sagt das Gesetz nicht.
        </p>
        <p style={S.p}>
          Danach wird es strenger statt lockerer. Ab dem{" "}
          {GMODG_RECHTSSTAND.neubauNullemissionAb} muss grundsätzlich jeder Neubau ein
          Nullemissionsgebäude sein und darf am Standort keine CO₂-Emissionen aus fossilen
          Brennstoffen mehr verursachen. Und schon ab dem {GMODG_RECHTSSTAND.neubauReferenzAb}{" "}
          wird der Effizienznachweis gegen ein neu gefasstes Vergleichsgebäude geführt: Es rechnet
          mit einem technologieneutralen Wärmeerzeuger, dem das Gesetz einen Primärenergiefaktor
          von 0,75 zuweist (ab 2030: 0,70) — Erdgas trägt dagegen den Faktor 1,1. Ein Neubau mit
          reiner Gasheizung liegt damit rechnerisch über dem Vergleichswert und muss den Abstand
          an anderer Stelle ausgleichen, etwa über besseren Wärmeschutz oder eigene erneuerbare
          Erzeugung. Als Wahl für einen Neubau ist die fossile Heizung damit ein Auslaufmodell:
          Wer ab 2030 baut, darf sie nicht mehr einsetzen; wer vorher baut, nimmt die Bio-Treppe
          mit.
        </p>
        <p style={S.p}>
          <strong style={S.strong}>Und wenn ich schon eine Gasheizung habe?</strong> Von der
          Bio-Treppe wird sie nicht erfasst — die trifft nur neu eingebaute Anlagen. Ganz
          verschont bleiben Bestandsheizungen aber voraussichtlich nicht: Dasselbe Gesetz kündigt
          in § 42a GModG eine <strong style={S.strong}>Grüngas- und Grünheizölquote</strong> an: Ein
          eigenes Gesetz — vorzulegen bis zum {GMODG_RECHTSSTAND.quoteGesetzBis} — soll nicht die
          Heizung, sondern die Anbieter von Gas, Heizöl und Flüssiggas verpflichten, ihre
          Brennstoffe bis 2045 vollständig auf klimaneutrale umzustellen. Das wirkt auf alle, die
          diesen Brennstoff kaufen — auch auf alte Anlagen. Wie hoch die Quote zu Beginn ausfällt,
          steht noch nicht fest: Die Gesetzesbegründung geht von einem Start im Jahr 2028 mit
          zunächst bis zu einem Prozent aus, im Gesetzestext steht diese Zahl nicht. Belastbar
          rechnen lässt sich damit heute noch nicht.
        </p>
        <p style={S.p}>
          Aus derselben Ankündigung stammt die Zahl für 2045. Über 2040 hinaus schreibt die
          Bio-Treppe nämlich nichts fort — eine 100-Prozent-Stufe steht nicht im Gesetz. Dass
          Heizungsbrennstoffe ab 2045 vollständig klimaneutral sein sollen, ist das Ziel hinter
          jener Quote. Solange sie nicht beschlossen ist, ist alles, was für 2045 gerechnet wird,
          eine Annahme — und keine Folge des heutigen Gesetzes.
        </p>
        <div style={S.card}>
          <span style={S.accent}>Das Ergebnis:</span> Der Gaspreis je Kilowattstunde steigt laut
          Institut der deutschen Wirtschaft von rund 11 Cent (2026) auf etwa 20 Cent (2040) —
          fast eine Verdopplung. Den vom IW für 2045 gerechneten Wert von rund 24 Cent trägt
          dessen Annahme einer dann vollständig klimaneutralen Versorgung. Wie stark das aufs Jahr
          durchschlägt, hängt vom Verbrauch ab (im Chart oben der Muster-Altbau).
        </div>
        {/* Aufschlüsselung wörtlich aus dem IW-Report (docs/gmodg/), Kap. 4.1, S. 19:
            „…Anstieg um 871 Euro auf insgesamt 1.952 Euro mit 44 Euro aus den steigenden
            CO₂-Preisen, mit 184 Euro aus den steigenden Netzentgelten und mit 643 Euro aus
            den Mehrkosten der Bio-Treppe. Somit entfallen 74 Prozent der gesamten Mehrkosten
            im Jahr 2040 auf die Beschaffung von Grüngas." Bezugshaushalt ist MFH1
            (10.000 kWh/a, Tabelle 3-1, S. 13) — deshalb hier keine Übertragung auf das
            Muster-EFH der Grafik, sondern nur die Anteile. */}
        <p style={S.p}>
          Bemerkenswert ist, <strong style={S.strong}>woher</strong> dieser Anstieg kommt. Das IW
          schlüsselt ihn für seinen Beispielhaushalt auf: Von den 871 Euro, die eine Gasheizung
          im Jahr 2040 mehr kostet als heute, entfallen 44 Euro auf den CO₂-Preis, 184 Euro auf
          die steigenden Netzentgelte — und 643 Euro auf das beigemischte Grüngas. Rund{" "}
          <strong style={S.strong}>drei Viertel der Mehrkosten</strong> sind also weder Klimaabgabe
          noch Netz, sondern schlicht der teurere Brennstoff. Wer bei der Gasheizung auf sinkende
          CO₂-Preise hofft, hofft damit auf den kleinsten der drei Posten.
        </p>

        {/* ── Altbau ── */}
        <h2 style={S.h2}>Und im unsanierten Altbau?</h2>
        <p style={S.p}>
          „Im Altbau geht keine Wärmepumpe“ ist der hartnäckigste Irrtum. Richtig ist nur: Im
          unsanierten Haus arbeitet sie mit höheren Vorlauftemperaturen und damit schlechterer
          Arbeitszahl — sie braucht mehr Strom. Genau das steckt oben im Umschalter „Unsaniert“,
          ehrlich eingerechnet samt alter Heizkörper. Trotzdem bleibt sie über 20 Jahre klar
          günstiger, <strong style={S.strong}>gerade weil die Gasheizung so teuer wird</strong>.
          Größere Heizkörper oder eine schrittweise Sanierung verbessern die Arbeitszahl
          zusätzlich — nötig für den Betrieb sind sie nicht.
        </p>
        {/* IW-Report (docs/gmodg/), Kap. 4.1, S. 20 + Tabelle 4-1: JAZ 3,0 (teilsaniert) /
            2,2 (unsaniert), Gas-Brennwertkessel 0,95. Wörtlich: „Diese Werte bilden bewusst
            ungünstige Einsatzbedingungen ab und stellen nicht den Durchschnitt einer optimal
            ausgelegten Wärmepumpe dar" und „Der Vergleich ist damit bewusst zugunsten der
            Gasheizung ausgestaltet“. Das sind die Annahmen DES REPORTS, nicht unsere —
            unser Rechner nutzt das ISE-JAZ-Modell (lib/heatpump.ts). Deshalb im Text klar
            dem IW zugeschrieben. */}
        <p style={S.p}>
          Dafür spricht auch, wie das IW selbst gerechnet hat. Es setzt für die Wärmepumpe
          bewusst niedrige Arbeitszahlen an — 3,0 im teilsanierten, 2,2 im unsanierten Gebäude —
          und schreibt dazu, diese Werte bildeten „bewusst ungünstige Einsatzbedingungen“ ab und
          seien nicht der Durchschnitt einer gut ausgelegten Anlage. Der Gasheizung wird
          umgekehrt ein Nutzungsgrad von 95 Prozent zugestanden. Der Vergleich sei damit,
          so der Report wörtlich,{" "}
          <strong style={S.strong}>„bewusst zugunsten der Gasheizung ausgestaltet“</strong>.
          Dass die Wärmepumpe trotzdem deutlich günstiger herauskommt, ist deshalb eher ein
          vorsichtiges als ein geschöntes Ergebnis.
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

        <RelatedLinks
          currentPath="/ratgeber/gasheizung-oder-waermepumpe"
          links={[
            { href: "/ratgeber/waermepumpe-foerderung-2026", label: "Wärmepumpen-Förderung 2026", desc: "Grundförderung, Klima-Bonus, Einkommens-Bonus: wie viel Zuschuss es wirklich gibt." },
            { href: "/klimaanlage-stromkosten", label: "Klimaanlagen-Rechner", desc: "Kühl- und Heizkosten einer Klimaanlage — inklusive Heizen in der Übergangszeit." },
            { href: "/ratgeber/lohnt-sich-pv-mit-speicher", label: "Lohnt sich PV mit Speicher?", desc: "Eigener Solarstrom macht die Wärmepumpe noch günstiger — die ehrliche Rechnung." },
            { href: "/datenstand", label: "Aktuelle Werte & Annahmen" },
            { href: "/glossar", label: "Glossar" },
          ]}
        />

        <p style={{ ...S.small, marginTop: 24 }}>
          Preispfade nach dem{" "}
          <a href={DATA_SOURCES.iw.url} target="_blank" rel="noopener noreferrer" style={S.link}>
            IW-Report 36/2026 „Mehrkostenrisiken durch das Gebäudemodernisierungsgesetz“
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
