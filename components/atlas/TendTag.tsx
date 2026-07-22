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
  // Textstufe der Semantik, nicht die Markenfarbe: das Neon-Gruen kommt als
  // 11-px-Zahl auf 1,79:1 und ist damit kaum lesbar. Gruen bleibt Gruen, nur
  // dunkel genug zum Lesen (siehe --color-positive-text in lib/theme.ts).
  const color = up ? v("--color-positive-text") : v("--color-negative-text");
  return (
    <span style={{ ...tendStyle, color }}>
      {up ? <IconTrendUp size={11} color={color} /> : <IconTrendDown size={11} color={color} />}
      {pct} %
    </span>
  );
}
