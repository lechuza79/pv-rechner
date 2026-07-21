import { v, space, pad } from "../../lib/theme";
import { IconArrowRight } from "../Icons";
import GemeindeKontaktButton from "./GemeindeKontaktButton";

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
export default function GemeindeEmbedBox({ name, ags }: { name: string; ags: string }) {
  const galleryHref = `/energie-widgets?ags=${ags}&name=${encodeURIComponent(name)}#gemeinde-solar`;

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
          schreibt. Bewusst nur EIN Kontakt-Einstieg in der Box. */}
      <div style={S.help}>
        <p style={S.helpTitle}>Sie brauchen Hilfe bei der Einrichtung?</p>
        <GemeindeKontaktButton name={name} />
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
  h2: { fontSize: 16, fontWeight: 700, margin: `0 0 ${space.sm}px` },
  sub: {
    fontSize: v("--font-size-small"),
    color: v("--color-text-secondary"),
    lineHeight: 1.6,
    margin: `0 0 ${space.lg}px`,
  },
  // Eigene Fläche statt Trennlinie — aber als Abstufung DERSELBEN Farbfamilie
  // wie die Karte, nicht als eigener Farbton: --color-bg ist die Nachbarstufe
  // von --color-bg-muted, auf dem die Karte liegt. In hell setzt sich der Block
  // dadurch hell ab, in dunkel dunkel; in beiden Token-Sätzen bleibt der
  // Unterschied sichtbar, ohne dass ein blauer Akzent dazwischenfährt.
  help: {
    marginTop: space.xl,
    padding: pad("xl"),
    background: v("--color-bg"),
    borderRadius: v("--radius-md"),
  },
  // Fließtext, keine Überschrift: Größe und Farbe kommen aus der Skala, ohne
  // Fettung. Der Satz leitet den Kontakt-Weg ein, er gliedert nichts.
  helpTitle: {
    fontSize: v("--font-size-body"),
    lineHeight: 1.6,
    color: v("--color-text-secondary"),
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
    fontSize: 14,
    fontWeight: 700,
    padding: pad("lg", "xl"),
    borderRadius: v("--radius-md"),
    textDecoration: "none",
  },
};
