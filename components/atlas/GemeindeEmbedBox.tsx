import { v, space, pad } from "../../lib/theme";
import { IconArrowRight } from "../Icons";
import KontaktTeaser from "../KontaktTeaser";

/**
 * "Diese Zahlen auf Ihrer Website einbinden" — der Outreach-Aufhänger für
 * Kommunen. Bewusst OHNE rohen Code und OHNE Beispiel-Vorschau: Zielgruppe ist
 * die Rathaus-/Pressestelle, kein Entwickler, und die Widgets stehen direkt
 * darüber auf der Seite schon live. Ein zweites Mal dasselbe zu zeigen erklärt
 * nichts — der Kasten sagt stattdessen, was man mit allen Widgets tun kann,
 * und führt in die Galerie (Anpassung + fertiger Code) oder öffnet das
 * Kontaktformular als Modal auf dieser Seite. Bewusst kein Sprung auf /kontakt:
 * wer hier fragt, will die Zahlen der Gemeinde nicht verlieren.
 *
 * Der SEO-Backlink zur Atlas-Seite entsteht weiterhin, sobald die Kommune ein
 * Widget einbettet; der Code dafür liegt in der Galerie statt hier.
 */
export default function GemeindeEmbedBox({ name, ags, pfad }: { name: string; ags: string; pfad?: string | null }) {
  // Der Atlas-Pfad geht mit, damit der Einbett-Code die EIGENE Gemeindeseite
  // verlinkt und nicht die des Beispiels. Die Galerie prueft ihn dort.
  const galleryHref = `/energie-widgets?ags=${ags}&name=${encodeURIComponent(name)}${
    pfad ? `&pfad=${encodeURIComponent(pfad)}` : ""
  }#gemeinde-solar`;

  return (
    <div style={S.card}>
      <h2 style={S.h2}>Sie arbeiten für die Gemeinde {name}?</h2>
      <p style={S.sub}>
        Alle Widgets dieser Seite können Sie auf der Website von {name} einbinden — die
        Kennzahlen zum Anlagenbestand, den Erneuerbaren-Mix, die simulierte Solarleistung des
        heutigen Tages und die Karte. Sie wählen aus, welches Widget es sein soll, passen es an
        Ihr Erscheinungsbild an (hell oder dunkel, Größe) und kopieren die fertige Zeile in Ihr
        Redaktionssystem.
      </p>
      <p style={S.sub}>
        Die Zahlen aktualisieren sich danach von selbst, sobald das Marktstammdatenregister neue
        Daten veröffentlicht. Die Widgets setzen keine Cookies und legen nichts im Browser Ihrer
        Besucher ab.
      </p>

      <div style={S.actions}>
        <a href={galleryHref} style={S.cta}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: space.sm }}>
            Widgets ansehen, anpassen &amp; einbetten <IconArrowRight size={16} />
          </span>
        </a>
      </div>

      {/* Sekundärer Weg, deutlich abgesetzt vom Haupt-Knopf: Wer es nicht
          selbst einbetten will, findet hier ein Gesicht statt eines Formulars.
          Genau hier entscheidet eine Rathaus- oder Pressestelle, ob sie
          schreibt. Bewusst nur EIN Kontakt-Einstieg in der Box. surface="bg":
          die Karte liegt auf --color-bg-muted, der Teaser nimmt die Nachbarstufe. */}
      <div style={{ marginTop: space.xl }}>
        <KontaktTeaser
          surface="bg"
          lead="Sie brauchen Hilfe bei der Einrichtung?"
          // Reiner Anzeigetext. Der Mail-Betreff kommt AUSSCHLIESSLICH aus der
          // Themen-Allowlist — der Gemeindename darf hier stehen, aber niemals
          // in einen Mail-Header.
          modalTitle={`Fragen zum Widget für ${name}`}
          topic="Widget für eine Kommune"
          initialMessage={`Wir möchten die Solar-Zahlen für ${name} auf unserer Website einbinden.\n\n`}
        />
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  card: {
    background: v("--color-bg-muted"),
    borderRadius: v("--radius-lg"),
    padding: pad("xl", "xxl"),
  },
  h2: { fontSize: v("--font-size-lead"), fontWeight: 700, margin: `0 0 ${space.sm}px` },
  sub: {
    fontSize: v("--font-size-small"),
    color: v("--color-text-secondary"),
    lineHeight: 1.6,
    margin: `0 0 ${space.lg}px`,
  },
  actions: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: `${space.md}px ${space.xl}px`,
    marginTop: space.xl,
  },
  cta: {
    display: "inline-block",
    background: v("--color-accent"),
    color: v("--color-text-on-accent"),
    fontSize: v("--font-size-body"),
    fontWeight: 700,
    padding: pad("lg", "xl"),
    borderRadius: v("--radius-md"),
    textDecoration: "none",
  },
};
