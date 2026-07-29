import { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "../../../components/Breadcrumb";
import ObfuscatedEmail from "../../../components/ObfuscatedEmail";
import { DataSourceNote } from "../../../components/PoweredBy";
import { v, space } from "../../../lib/theme";
import { pageMetadata } from "../../../lib/seo";
import { OWN_WORK_LICENSE } from "../../../lib/license";
import { allWidgets, embedExamplePath, sharePath, type WidgetDef } from "../../../lib/widget-registry";

export const metadata: Metadata = pageMetadata({
  path: "/presse",
  title: "Presse und Redaktionen – Charts von Solar Check nutzen",
  description:
    "Alle Charts zu Strommix, Solarzubau und Wärmekosten gesammelt: Live-Seite, Einbettungscode, Datenquelle. Frei nutzbar unter CC BY 4.0 mit Namensnennung.",
  ogImageTitle: "Presse und Redaktionen",
  ogImageSubtitle: "Alle Charts, frei nutzbar mit Namensnennung.",
});

const S: Record<string, React.CSSProperties> = {
  page: {
    background: v("--color-bg"),
    fontFamily: v("--font-text"),
    color: v("--color-text-primary"),
    minHeight: "100vh",
    padding: "0 16px 20px",
  },
  wrap: { maxWidth: v("--content-max-width"), margin: "0 auto", paddingTop: "var(--content-lede-top)" },
  h1: {
    fontSize: v("--font-size-h1"),
    fontWeight: 800,
    letterSpacing: "-0.02em",
    color: v("--color-text-primary"),
    lineHeight: 1.2,
    marginBottom: space.xxl,
  },
  h2: {
    fontSize: v("--font-size-h2"),
    fontWeight: 700,
    color: v("--color-text-primary"),
    marginTop: space.xxxl,
    marginBottom: space.md,
  },
  p: {
    fontSize: v("--font-size-body"),
    color: v("--color-text-muted"),
    lineHeight: 1.7,
    marginBottom: space.lg,
  },
  lead: {
    fontSize: v("--font-size-lead"),
    color: v("--color-text-secondary"),
    lineHeight: 1.65,
    marginBottom: space.xxl,
  },
  a: { color: v("--color-accent"), textDecoration: "none" },
  karten: { display: "flex", flexDirection: "column", gap: space.lg, marginBottom: space.lg },
  karte: {
    border: `1px solid ${v("--color-border")}`,
    borderRadius: v("--radius-md"),
    padding: `${space.xl}px`,
  },
  karteTitel: {
    fontSize: v("--font-size-h3"),
    fontWeight: 700,
    color: v("--color-text-primary"),
    marginBottom: space.sm,
  },
  karteLinks: {
    display: "flex",
    flexWrap: "wrap",
    gap: space.lg,
    fontSize: v("--font-size-small"),
    fontWeight: 600,
    marginBottom: space.md,
  },
  karteQuelle: {
    fontSize: v("--font-size-caption"),
    color: v("--color-text-muted"),
    lineHeight: 1.6,
  },
};

/**
 * Eine Karte je Eintrag — dieselbe Darstellung für Charts und Werkzeuge, weil
 * sich nur die Überschrift darüber unterscheidet.
 */
function Eintrag({ w }: { w: WidgetDef }) {
  // Bewusst der Beispiel-Pfad: Ortsbezogene Widgets brauchen einen Ort, sonst
  // begrüßt die Presseseite ihre Leser mit „Keine gültige Gemeinde angegeben."
  const embed = embedExamplePath(w);
  return (
    <div style={S.karte}>
      <div style={S.karteTitel}>{w.title}</div>
      <div style={S.karteLinks}>
        <Link href={sharePath(w)} style={S.a}>
          Live-Seite ansehen
        </Link>
        {embed && (
          <Link href={embed} style={S.a}>
            {w.exampleParams ? "Einbettbare Fassung (Beispielort)" : "Einbettbare Fassung"}
          </Link>
        )}
      </div>
      <div style={S.karteQuelle}>
        <DataSourceNote source={w.sources} label="Datenquelle:" />
      </div>
    </div>
  );
}

export default function PressePage() {
  // Das Register unterscheidet Chart und Werkzeug bereits — die Seite hat es
  // bloß nicht gezeigt und alles „Charts" genannt. Ein Förder-Check ist aber
  // kein Chart, das man in einen Artikel legt, sondern etwas zum Ausprobieren.
  const charts = allWidgets().filter((w) => w.kind === "chart");
  const werkzeuge = allWidgets().filter((w) => w.kind === "tool");

  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <Breadcrumb items={[{ label: "Start", href: "/" }, { label: "Presse" }]} jsonLd />

        <h1 style={S.h1}>Presse und Redaktionen</h1>

        <p style={S.lead}>
          Alle Charts und Werkzeuge dieser Seite dürfen in Artikel, Sendungen, Präsentationen und
          Studien übernommen werden — redaktionell wie gewerblich, ohne vorherige Anfrage. Bedingung
          ist die Namensnennung „{OWN_WORK_LICENSE.attributionName}“ mit einem Link auf die Seite,
          von der die Grafik stammt.
        </p>

        <h2 style={S.h2}>Charts im Überblick</h2>
        <p style={S.p}>
          Jeder Eintrag führt zur Live-Seite mit der aktuellen Fassung des Charts. Wo es einen
          Einbettungscode gibt, lässt sich das Chart als iframe übernehmen und bleibt dann von
          selbst aktuell. Die Datenquelle steht jeweils dabei und muss bei einer Übernahme genannt
          werden. Charts, die immer einen Ort zeigen, sind hier mit einem Beispielort verlinkt — im
          Einbettungscode steht dann die eigene Gemeinde oder das eigene Bundesland.
        </p>
        <div style={S.karten}>
          {charts.map((w) => (
            <Eintrag key={w.id} w={w} />
          ))}
        </div>

        <h2 style={S.h2}>Interaktive Werkzeuge</h2>
        <p style={S.p}>
          Diese Einträge zeigen keine Daten, sondern rechnen mit den Zahlen, die eine Leserin selbst
          eingibt. Sie eignen sich als Service neben einem Artikel, nicht als Abbildung darin.
          Lizenz und Namensnennung gelten für sie genauso.
        </p>
        <div style={S.karten}>
          {werkzeuge.map((w) => (
            <Eintrag key={w.id} w={w} />
          ))}
        </div>

        <p style={S.p}>
          Den fertigen Einbettungscode zum Kopieren, dazu Vorschau, Größen und Einstellungen, gibt
          es in der{" "}
          <Link href="/energie-widgets" style={S.a}>
            Widget-Galerie
          </Link>
          .
        </p>

        <h2 style={S.h2}>Charts als Bild</h2>
        <p style={S.p}>
          Wo ein Chart einen Herunterladen-Knopf hat, lässt es sich als Bilddatei speichern. Titel,
          Beschriftung, Datenquelle, Datenstand und der Lizenzcode {OWN_WORK_LICENSE.code} sind in
          dieses Bild fest eingebacken — die Attribution geht also auch dann nicht verloren, wenn
          die Grafik ohne den umgebenden Text weitergereicht wird. Für Print in höherer Auflösung oder in einem anderen Format melde dich einfach.
        </p>

        <h2 style={S.h2}>Lizenz</h2>
        <p style={S.p}>
          Unsere Darstellungen, Berechnungen und Texte stehen unter{" "}
          <a href={OWN_WORK_LICENSE.url} target="_blank" rel="noopener noreferrer" style={S.a}>
            {OWN_WORK_LICENSE.code}
          </a>
          . Die vollständigen Bedingungen, die Form der Namensnennung und der Sonderfall der
          zugrunde liegenden Daten stehen auf der{" "}
          <Link href={OWN_WORK_LICENSE.page} style={S.a}>
            Lizenzseite
          </Link>
          . Sie ist die einzige verbindliche Stelle dazu.
        </p>

        <h2 style={S.h2}>Rückfragen und Sonderauswertungen</h2>
        <p style={S.p}>
          Für Rückfragen zu einer Zahl, für Auswertungen zu einer bestimmten Region oder einem
          bestimmten Zeitraum und für Interviewanfragen:{" "}
          <ObfuscatedEmail user="hey" domain="solar-check.io" style={{ ...S.a, fontWeight: 600 }} />{" "}
          oder über das{" "}
          <Link href="/kontakt" style={S.a}>
            Kontaktformular
          </Link>
          . Wer hier antwortet und wie die Rechner rechnen, steht auf der Seite{" "}
          <Link href="/ueber" style={S.a}>
            Über Solar Check
          </Link>
          ; die Herleitung jeder Größe auf der{" "}
          <Link href="/methodik" style={S.a}>
            Methodik-Seite
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
