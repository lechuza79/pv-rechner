import { v, space, pad, type TokenName } from "../../lib/theme";

// Eine Pille: Symbol, Text, ein Ton.
//
// Eigener Baustein statt fünfmal derselbe Kasten im Kalender. Die Töne sind
// SEMANTISCH benannt, nicht farbig — „gesendet" statt „grün": Wer später eine
// sechste Verwendung baut, wählt eine Bedeutung und nicht eine Farbe, und die
// Zuordnung bleibt an einer Stelle.

export type PillTon = "gesendet" | "geplant" | "gescheitert" | "ruhig" | "leise" | "ratgeber";

const TON: Record<PillTon, { rand: TokenName; text: TokenName; flaeche?: TokenName }> = {
  gesendet: { rand: "--color-positive-text", text: "--color-positive-text" },
  geplant: { rand: "--color-accent", text: "--color-accent", flaeche: "--color-accent-dim" },
  gescheitert: { rand: "--color-negative", text: "--color-negative" },
  ruhig: { rand: "--color-border", text: "--color-text-secondary" },
  leise: { rand: "--color-border-muted", text: "--color-text-muted" },
  ratgeber: { rand: "--color-positive-text", text: "--color-positive-text" },
};

export function Pill({
  ton,
  icon,
  children,
  titel,
  href,
}: {
  ton: PillTon;
  icon?: React.ReactNode;
  children: React.ReactNode;
  /** Vollständiger Text beim Überfahren — die Pille selbst kappt. */
  titel?: string;
  /** Macht die Pille zum Link. Ohne href bleibt sie Text. */
  href?: string;
}) {
  const t = TON[ton];
  const Aussen = (href ? "a" : "span") as "a" | "span";
  return (
    <Aussen
      {...(href ? { href, target: "_blank", rel: "noreferrer" } : {})}
      title={titel}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: space.xxs,
        maxWidth: "100%",
        padding: pad("xxs", "xs"),
        borderRadius: 999,
        border: `1px solid ${v(t.rand)}`,
        background: t.flaeche ? v(t.flaeche) : "transparent",
        color: v(t.text),
        fontSize: v("--font-size-caption"),
        lineHeight: 1.25,
        textDecoration: "none",
      }}
    >
      {icon}
      {/* Der Text kappt, die Pille bleibt einzeilig. Eine Pille, die umbricht,
          ist keine mehr — und in einer Kalenderzelle schiebt sie alles darunter
          weg. Der volle Text hängt am Überfahren. */}
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{children}</span>
    </Aussen>
  );
}
