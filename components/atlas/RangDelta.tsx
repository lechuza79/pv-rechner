import { v } from "../../lib/theme";
import { IconArrowUp, IconArrowDown } from "../Icons";

/**
 * Wie viele Plätze eine Kommune seit Ende des letzten vollen Jahres gutgemacht
 * oder verloren hat.
 *
 * WARUM NICHT „gegenüber dem Vorjahr": Der Zeitraum reicht vom Jahresende bis
 * heute — im Juli sind das sieben Monate, nicht zwölf. Die Ranglisten-Tabelle
 * des Atlas benennt das seit jeher ehrlich („Veränderung seit Ende 2025"), und
 * diese Anzeige hält sich daran: Sie zeigt nur die Zahl, die Überschrift der
 * Tabelle sagt den Zeitraum.
 *
 * `null` heißt „damals nicht gewertet" und ergibt nichts — eine 0 wäre die
 * Aussage „unverändert", die wir in dem Fall nicht haben.
 */
export default function RangDelta({ plaetze }: { plaetze: number | null }) {
  if (plaetze === null) return null;
  if (plaetze === 0) {
    return (
      <span style={{ ...S.tag, color: v("--color-text-muted"), borderColor: v("--color-border") }}>±0</span>
    );
  }
  const hoch = plaetze > 0;
  const farbe = hoch ? v("--color-positive-text") : v("--color-negative-text");
  const Pfeil = hoch ? IconArrowUp : IconArrowDown;
  return (
    <span
      style={{
        ...S.tag,
        color: farbe,
        borderColor: hoch ? v("--color-positive") : v("--color-negative"),
        background: `color-mix(in srgb, ${hoch ? v("--color-positive") : v("--color-negative")} 10%, transparent)`,
      }}
      title={`${Math.abs(plaetze)} ${Math.abs(plaetze) === 1 ? "Platz" : "Plätze"} ${hoch ? "nach vorn" : "zurück"}`}
    >
      {/* Strich-Pfeil aus der Icon-Bibliothek statt eines Dreiecks: Das Dreieck
          las sich als Fuellzeichen, der Pfeil als Bewegung. */}
      <Pfeil size={9} color={farbe} />
      {Math.abs(plaetze)}
    </span>
  );
}

const S: Record<string, React.CSSProperties> = {
  tag: {
    // Feste Breite: Die Kaesten standen sonst je nach Inhalt ("±0" gegen "▲12")
    // verschieden breit untereinander und die Spalte franste aus.
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 34,
    gap: 2,
    padding: "0 4px",
    borderRadius: 4,
    border: "1px solid transparent",
    fontFamily: v("--font-mono"),
    fontSize: 10,
    fontWeight: 700,
    lineHeight: 1.5,
  },
};
