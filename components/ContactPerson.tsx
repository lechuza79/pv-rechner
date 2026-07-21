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
      <img src="/sebastian-schaeder.webp" width={AVATAR_PX} height={AVATAR_PX} alt="" style={S.avatar} />
      <span style={S.text}>
        <strong style={S.name}>Sebastian Schäder</strong>
        {note}
        {children}
      </span>
    </span>
  );
}

/** Anzeigegröße. Die ausgelieferte Datei ist 216 px = 3× davon (Retina). Wer
 *  hier hochzählt, muss public/sebastian-schaeder.webp mitwachsen lassen. */
const AVATAR_PX = 72;

const S: Record<string, React.CSSProperties> = {
  row: { display: "flex", alignItems: "center", gap: 14 },
  avatar: {
    width: AVATAR_PX,
    height: AVATAR_PX,
    borderRadius: "50%",
    // Fläche hinter dem Freisteller: gibt dem transparenten Bild Halt. Bewusst
    // die Basis-Fläche, damit sich der Kreis von getönten Blöcken (etwa dem
    // Hilfe-Block der Kommunen-Box auf --color-bg-accent) abhebt statt darin
    // zu verschwinden — in hell wie dunkel.
    background: v("--color-bg"),
    objectFit: "cover",
    flexShrink: 0,
  },
  text: { display: "block", fontSize: v("--font-size-small"), lineHeight: 1.5, color: v("--color-text-muted") },
  name: {
    display: "block",
    fontSize: v("--font-size-body"),
    fontWeight: 700,
    color: v("--color-text-primary"),
  },
};
