import { v } from "../../lib/theme";
import { IconTrendUp, IconTrendDown } from "../Icons";

const tendStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 3,
  marginTop: 4,
  fontFamily: v("--font-mono"),
  fontSize: 11,
  fontWeight: 600,
};

/**
 * Tendenz je Einwohner gegenüber dem übergeordneten Schnitt: grün über, rot
 * unter, ±0 neutral. `dev` ist der relative Abstand (0,12 = +12 %). Geteilt von
 * der Gemeinde-Detailseite und den Übersichtsseiten (Kreis/Bundesland).
 */
export default function TendTag({ dev }: { dev: number | null }) {
  if (dev === null) return null;
  const pct = Math.round(Math.abs(dev) * 100);
  if (pct === 0) {
    return <span style={{ ...tendStyle, color: v("--color-text-muted") }}>±0 %</span>;
  }
  const up = dev > 0;
  const color = up ? v("--color-positive") : v("--color-negative");
  return (
    <span style={{ ...tendStyle, color }}>
      {up ? <IconTrendUp size={11} color={color} /> : <IconTrendDown size={11} color={color} />}
      {pct} %
    </span>
  );
}
