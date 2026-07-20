import { v } from "../../lib/theme";
import { IconArrowRight } from "../Icons";

/**
 * "Diese Zahlen auf Ihrer Website einbinden" — der Outreach-Aufhänger für
 * Kommunen. Bewusst OHNE rohen Code: Zielgruppe ist die Rathaus-/Pressestelle,
 * kein Entwickler. Stattdessen eine Live-Vorschau (die echten Zahlen der
 * Gemeinde) + ein Weg zur Widget-Galerie, wo man das Feld anpasst (hell/dunkel,
 * Größe) und den fertigen Code samt Backlink bekommt — plus Kontakt.
 *
 * Der SEO-Backlink zur Atlas-Seite entsteht weiterhin, sobald die Kommune das
 * Feld einbettet; der Code dafür liegt jetzt in der Galerie statt hier.
 */
export default function GemeindeEmbedBox({ name, ags }: { name: string; ags: string }) {
  const previewSrc = `/embed/gemeinde-solar?ags=${ags}&embed=0`;
  const galleryHref = `/energie-widgets?ags=${ags}&name=${encodeURIComponent(name)}#gemeinde-solar`;

  return (
    <div style={S.card}>
      <h2 style={S.h2}>Sie arbeiten für die Gemeinde {name}?</h2>
      <p style={S.sub}>
        Diese Zahlen lassen sich als kleines Feld auf der Website von {name} einbinden — cookiefrei,
        ohne Browser-Speicher, monatlich automatisch aktuell. So sieht es aus:
      </p>

      <div style={S.previewWrap}>
        <iframe
          src={previewSrc}
          title={`Solaranlagen in ${name} — Vorschau`}
          loading="lazy"
          style={S.preview}
        />
      </div>

      <div style={S.actions}>
        <a href={galleryHref} style={S.cta}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            Ansehen, anpassen &amp; einbetten <IconArrowRight size={16} />
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
  sub: { fontSize: 13, color: v("--color-text-secondary"), lineHeight: 1.6, margin: "0 0 14px" },
  previewWrap: {
    background: v("--color-bg"),
    border: `1px solid ${v("--color-border")}`,
    borderRadius: v("--radius-md"),
    padding: 8,
    maxWidth: 420,
  },
  preview: {
    border: 0,
    display: "block",
    width: "100%",
    height: 250,
    borderRadius: v("--radius-sm"),
  },
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
