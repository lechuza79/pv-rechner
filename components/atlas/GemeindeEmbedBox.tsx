import { v } from "../../lib/theme";
import { IconArrowRight } from "../Icons";

/**
 * "Diese Zahlen auf Ihrer Website einbinden" — der Outreach-Aufhänger für
 * Kommunen. Bewusst OHNE rohen Code und OHNE Beispiel-Vorschau: Zielgruppe ist
 * die Rathaus-/Pressestelle, kein Entwickler, und die Widgets stehen direkt
 * darüber auf der Seite schon live. Ein zweites Mal dasselbe zu zeigen erklärt
 * nichts — der Kasten sagt stattdessen, was man mit allen Widgets tun kann,
 * und führt in die Galerie (Anpassung + fertiger Code) oder zum Kontakt.
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
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            Widgets ansehen, anpassen &amp; einbetten <IconArrowRight size={16} />
          </span>
        </a>
        <a href="/kontakt" style={S.contact}>
          Wir richten es Ihnen ein — Kontakt aufnehmen
        </a>
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  card: {
    background: v("--color-bg-muted"),
    borderRadius: v("--radius-lg"),
    padding: "18px 20px",
  },
  h2: { fontSize: 16, fontWeight: 700, margin: "0 0 6px" },
  sub: { fontSize: 13, color: v("--color-text-secondary"), lineHeight: 1.6, margin: "0 0 12px" },
  actions: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px 16px", marginTop: 16 },
  cta: {
    display: "inline-block",
    background: v("--color-accent"),
    color: v("--color-text-on-accent"),
    fontSize: 14,
    fontWeight: 700,
    padding: "10px 16px",
    borderRadius: v("--radius-md"),
    textDecoration: "none",
  },
  contact: { fontSize: 13, color: v("--color-accent"), textDecoration: "none", fontWeight: 600 },
};
