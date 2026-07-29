import { v } from "../../lib/theme";

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
  return (
    <span
      style={{
        ...S.tag,
        color: hoch ? v("--color-positive-text") : v("--color-negative-text"),
        borderColor: hoch ? v("--color-positive") : v("--color-negative"),
        background: `color-mix(in srgb, ${hoch ? v("--color-positive") : v("--color-negative")} 10%, transparent)`,
      }}
      title={`${Math.abs(plaetze)} ${Math.abs(plaetze) === 1 ? "Platz" : "Plätze"} ${hoch ? "nach vorn" : "zurück"}`}
    >
      {hoch ? "▲" : "▼"}
      {Math.abs(plaetze)}
    </span>
  );
}

const S: Record<string, React.CSSProperties> = {
  tag: {
    display: "inline-flex",
    alignItems: "center",
    gap: 1,
    padding: "0 4px",
    borderRadius: 4,
    border: "1px solid transparent",
    fontFamily: v("--font-mono"),
    fontSize: 10,
    fontWeight: 700,
    lineHeight: 1.5,
  },
};
