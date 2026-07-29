import { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "../../../components/Breadcrumb";
import DataSourceList from "../../../components/DataSourceList";
import ObfuscatedEmail from "../../../components/ObfuscatedEmail";
import { v, space } from "../../../lib/theme";
import { pageMetadata } from "../../../lib/seo";
import { OWN_WORK_LICENSE } from "../../../lib/license";

export const metadata: Metadata = pageMetadata({
  path: "/lizenz",
  title: "Lizenz – Grafiken und Texte von Solar Check nutzen",
  description:
    "Unsere Charts, Berechnungen und Texte stehen unter CC BY 4.0: redaktionell und gewerblich frei nutzbar, Bedingung ist die Namensnennung mit Link. Was für die zugrunde liegenden Daten gilt.",
  ogImageTitle: "Lizenz",
  ogImageSubtitle: "Grafiken und Texte frei nutzen - mit Namensnennung.",
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
  a: { color: v("--color-accent"), textDecoration: "none" },
  kurz: {
    background: v("--color-bg-muted"),
    border: `1px solid ${v("--color-border")}`,
    borderRadius: v("--radius-md"),
    padding: `${space.xl}px ${space.xl}px ${space.md}px`,
    marginBottom: space.xxl,
  },
  kurzLabel: {
    fontSize: v("--font-size-caption"),
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: v("--color-text-muted"),
    marginBottom: space.md,
  },
  liste: { margin: `0 0 ${space.lg}px`, paddingLeft: space.xxl },
  li: {
    fontSize: v("--font-size-body"),
    color: v("--color-text-muted"),
    lineHeight: 1.7,
    marginBottom: space.sm,
  },
  code: {
    display: "block",
    background: v("--color-bg-muted"),
    borderRadius: v("--radius-md"),
    padding: `${space.lg}px ${space.xl}px`,
    fontFamily: v("--font-mono"),
    fontSize: v("--font-size-small"),
    lineHeight: 1.7,
    color: v("--color-text-secondary"),
    wordBreak: "break-word",
    marginBottom: space.lg,
  },
};

export default function LizenzPage() {
  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <Breadcrumb items={[{ label: "Start", href: "/" }, { label: "Lizenz" }]} jsonLd />

        <h1 style={S.h1}>Grafiken und Texte von Solar Check nutzen</h1>

        <div style={S.kurz}>
          <div style={S.kurzLabel}>Kurzfassung</div>
          <p style={S.p}>
            Unsere Darstellungen, Berechnungen und Texte stehen unter{" "}
            <a href={OWN_WORK_LICENSE.url} target="_blank" rel="noopener noreferrer" style={S.a}>
              {OWN_WORK_LICENSE.code}
            </a>
            . Redaktionelle und gewerbliche Nutzung sind ausdrücklich erlaubt, eine Zustimmung
            brauchst du dafür nicht. Die einzige Bedingung ist die Namensnennung „
            {OWN_WORK_LICENSE.attributionName}“ zusammen mit einem Link auf die Seite, von der die
            Grafik stammt. Es gilt keine Weitergabe-unter-gleichen-Bedingungen-Pflicht und kein
            Verbot kommerzieller Nutzung.
          </p>
        </div>

        <h2 style={S.h2}>Was unter dieser Lizenz steht</h2>
        <p style={S.p}>
          {OWN_WORK_LICENSE.name} ({OWN_WORK_LICENSE.code}) gilt für alles, was wir selbst erstellt
          haben:
        </p>
        <ul style={S.liste}>
          <li style={S.li}>die Charts und Grafiken auf dieser Seite, auch als heruntergeladenes Bild,</li>
          <li style={S.li}>die einbettbaren Widgets und ihre Darstellung,</li>
          <li style={S.li}>unsere Auswertungen im Solar-Atlas und in den Datengeschichten,</li>
          <li style={S.li}>die Ratgeber- und Methodiktexte.</li>
        </ul>
        <p style={S.p}>
          Du darfst diese Inhalte kopieren, weitergeben, ausdrucken, in Artikel einbauen und auch
          bearbeiten — etwa zuschneiden oder einen Ausschnitt zeigen. Das gilt für private, für
          redaktionelle und für gewerbliche Zwecke gleichermaßen.
        </p>

        <h2 style={S.h2}>So sieht die Namensnennung aus</h2>
        <p style={S.p}>
          Genannt werden müssen unser Name und die Lizenz, dazu ein Link auf die Seite, von der die
          Grafik stammt. In einem Online-Artikel reicht eine Zeile unter der Abbildung:
        </p>
        <span style={S.code}>
          Grafik: solar-check.io, {OWN_WORK_LICENSE.code} — solar-check.io/photovoltaik-zubau-deutschland
        </span>
        <p style={S.p}>
          In Print, PDF oder Präsentationen genügt dieselbe Zeile ohne gesetzten Link. Wenn du eine
          Grafik verändert hast, schreib das dazu, zum Beispiel „Ausschnitt“ oder „eigene
          Beschriftung ergänzt“. Wo ein Chart einen Zitieren-Knopf hat, liefert er diese Zeile
          fertig zum Kopieren, damit du sie nicht selbst zusammensetzen musst.
        </p>

        <h2 style={S.h2}>Die Daten hinter den Grafiken</h2>
        <p style={S.p}>
          Unsere Lizenz gilt für unsere Darstellung, nicht für die zugrunde liegenden Daten. Die
          Daten stehen jeweils unter der Lizenz ihrer Quelle. Deshalb steht an jedem Chart und in
          jedem heruntergeladenen Bild ein Quellenhinweis — er ist Teil der Bedingungen dieser
          Quellen und darf nicht entfernt oder unkenntlich gemacht werden. Welche Werte wir
          verwenden und wie alt sie sind, steht auf der Seite{" "}
          <Link href="/datenstand" style={S.a}>
            Datenstand
          </Link>
          .
        </p>
        <DataSourceList />
        <p style={S.p}>
          Ein Sonderfall ist der IW-Report zu den Gaspreis-Szenarien: Dessen Zahlen zitieren wir,
          wir können sie aber nicht weiterlizenzieren. Wer die Zahlen selbst verwenden möchte,
          zitiert sie direkt aus dem Report. Unsere Darstellung der Rechnung steht dagegen wie alles
          andere unter {OWN_WORK_LICENSE.code}.
        </p>

        <h2 style={S.h2}>Name und Logo</h2>
        <p style={S.p}>
          Der Name „Solar Check“ beziehungsweise „solar-check.io“ und unser Logo dürfen nicht so
          verwendet werden, dass der Eindruck einer Zusammenarbeit, einer Empfehlung oder einer
          Urheberschaft von solar-check.io entsteht, wenn es diese nicht gibt. Das ergibt sich aus
          dem Marken- und Wettbewerbsrecht und schränkt die Lizenz nicht ein: Die gewerbliche
          Nutzung der Grafiken selbst bleibt ohne Zustimmung erlaubt. Für die Namensnennung nach
          dieser Lizenz gilt diese Einschränkung ohnehin nicht — sie ist gerade erwünscht.
        </p>

        <h2 style={S.h2}>Nutzung ohne Namensnennung</h2>
        <p style={S.p}>
          Die gewerbliche Nutzung ist bereits kostenlos erlaubt, dafür ist keine Sonderlizenz nötig.
          Farben, Schrift und Ecken der Widgets lassen sich ebenfalls kostenlos an dein Design
          anpassen — das stellst du dir in der{" "}
          <Link href="/energie-widgets" style={S.a}>Widget-Galerie</Link> selbst ein.
          Kostenpflichtig ist nur, was über die Lizenz hinausgeht: die Befreiung von der
          Namensnennung (White-Label) und die Nutzung ohne Referenzlink. Wenn du das brauchst,
          schreib uns an{" "}
          <ObfuscatedEmail user="hey" domain="solar-check.io" style={S.a} /> — wir nennen dir die
          Konditionen.
        </p>

        <h2 style={S.h2}>Widgets einbetten</h2>
        <p style={S.p}>
          Für die einbettbaren Widgets gelten zusätzlich technische Regeln zu Betrieb,
          Verfügbarkeit und Haftung. Sie stehen in den{" "}
          <Link href="/widget-nutzungsbedingungen" style={S.a}>
            Widget-Nutzungsbedingungen
          </Link>
          ; die Lizenzfrage beantwortet ausschließlich diese Seite. Eine Übersicht aller Widgets
          samt Einbettungscode findest du in der{" "}
          <Link href="/energie-widgets" style={S.a}>
            Widget-Galerie
          </Link>
          .
        </p>

        <h2 style={S.h2}>Fragen zur Nutzung</h2>
        <p style={S.p}>
          Wenn unklar ist, ob dein Vorhaben von der Lizenz gedeckt ist, frag lieber nach:{" "}
          <ObfuscatedEmail user="hey" domain="solar-check.io" style={S.a} /> oder über das{" "}
          <Link href="/kontakt" style={S.a}>
            Kontaktformular
          </Link>
          . Wer hinter der Seite steht, steht im{" "}
          <Link href="/impressum" style={S.a}>
            Impressum
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
