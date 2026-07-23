import { v } from "../../lib/theme";

const tagBase: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  marginTop: 4,
  padding: "1px 6px",
  borderRadius: 5,
  border: "1px solid transparent",
  fontFamily: v("--font-mono"),
  fontSize: 11,
  fontWeight: 600,
  lineHeight: 1.4,
};

/**
 * Tendenz je Einwohner gegenüber dem übergeordneten Schnitt: grün über, rot
 * unter, ±0 neutral. `dev` ist der relative Abstand (0,12 = +12 %). Geteilt von
 * der Gemeinde-Detailseite und den Übersichtsseiten (Kreis/Bundesland).
 *
 * Darstellung als Badge: Rahmen in voller Deckung, Fläche mit 10 % derselben
 * Farbe. Vorzeichen +/− statt Trend-Pfeil (der Knick der Pfeil-Icons wirkte
 * unruhig). EINHEITLICHER Ton je Richtung — bewusst KEINE Abstufung nach Stärke:
 * die Prozentzahl steht ja schon dran, ein zusätzlich variabler Farbton liest
 * sich als Unstimmigkeit (−26 % neben −28 % wäre kaum unterscheidbar). Alle
 * Farben kommen aus den semantischen Tokens, die je Theme-Stufe (s0..s6) neu
 * gesetzt sind, damit der Badge auf jedem Hintergrund trägt: Rahmen = voller
 * Grund-Token (--color-positive/--color-negative), Text = der kontrast-getunte
 * *-text-Token (Neon-Grün/Rot wäre als 11-px-Zahl zu kontrastarm), Fläche =
 * 10 % des Grund-Tokens.
 */
const NEUTRAL = {
  border: v("--color-text-muted"),
  text: v("--color-text-muted"),
  fill: `color-mix(in srgb, ${v("--color-text-muted")} 10%, transparent)`,
};
const UP = {
  border: v("--color-positive"),
  text: v("--color-positive-text"),
  fill: `color-mix(in srgb, ${v("--color-positive")} 10%, transparent)`,
};
const DOWN = {
  border: v("--color-negative"),
  text: v("--color-negative-text"),
  fill: `color-mix(in srgb, ${v("--color-negative")} 10%, transparent)`,
};

export default function TendTag({ dev }: { dev: number | null }) {
  if (dev === null) return null;
  const pct = Math.round(Math.abs(dev) * 100);
  const c = pct === 0 ? NEUTRAL : dev > 0 ? UP : DOWN;
  const sign = pct === 0 ? "±" : dev > 0 ? "+" : "−";

  return (
    <span style={{ ...tagBase, color: c.text, borderColor: c.border, background: c.fill }}>
      {sign}
      {pct} %
    </span>
  );
}
