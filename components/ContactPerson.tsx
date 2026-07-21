import { v } from "../lib/theme";

/**
 * „Hier antwortet ein Mensch" — Porträt plus Zusage, an jeder Kontakt-Stelle
 * gleich. Ein Baustein statt zweimal dieselbe Zeile, damit Bild, Größe und
 * Formulierung nicht auseinanderlaufen.
 *
 * Kein `next/image`: Das Projekt liefert bisher überhaupt keine Rasterbilder im
 * Layout aus (das Logo ist Inline-SVG). Für EIN 56-px-Avatar den Bild-Optimierer
 * samt Laufzeit-Route einzuschalten wäre mehr Apparat als Nutzen — die Datei ist
 * mit 7 KB bereits in Zielgröße und -format vorbereitet (168 px = 3× für Retina).
 *
 * Alternativtext bewusst leer: direkt daneben steht der Name als Text, ein
 * gesprochenes „Porträt von Sebastian Schäder" wäre nur die Wiederholung davon.
 *
 * Der Freisteller hat einen transparenten Rand. Deshalb liegt unter dem Bild
 * eine dezente Füllung aus dem Theme — sonst franst die runde Kante auf hellem
 * wie dunklem Grund aus.
 */
export default function ContactPerson({
  note,
  children,
}: {
  /** Kurze Zusage unter dem Namen. */
  note?: string;
  /** Alternativ zur Zusage: was unter dem Namen stehen soll, z. B. ein Link. */
  children?: React.ReactNode;
}) {
  return (
    <span style={S.row}>
      <img src="/sebastian-schaeder.webp" width={56} height={56} alt="" style={S.avatar} />
      <span style={S.text}>
        <strong style={S.name}>Sebastian Schäder</strong>
        {note}
        {children}
      </span>
    </span>
  );
}

const S: Record<string, React.CSSProperties> = {
  row: { display: "flex", alignItems: "center", gap: 12 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: "50%",
    background: v("--color-bg-muted"),
    objectFit: "cover",
    flexShrink: 0,
  },
  text: { display: "block", fontSize: 13, lineHeight: 1.5, color: v("--color-text-muted") },
  name: { display: "block", fontWeight: 700, color: v("--color-text-primary") },
};
