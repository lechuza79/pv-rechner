import { v, space } from "../../lib/theme";
import type { PostBild } from "../../lib/social-posts";

// Das Bildformat für den Feed. Hochkant (4:5), höchstens drei Serien,
// Beschriftungen direkt an den Balken.
//
// Bewusst NICHT der vorhandene Widget-Export: Der ist für ein eingebettetes
// Chart auf einer Seite gebaut und bringt Legende, Hilfetexte und eine
// senkrechte Quellenkante mit. Im Feed sieht man davon auf einem Telefon
// praktisch nichts — die Aussage muss im Vorschaubild ohne Antippen lesbar
// sein, und dafür bleibt Platz für genau eine Aussage und zwei bis drei Zahlen.
//
// Die Quellenzeile ist Pflicht und steht IM Bild, nicht im Beitragstext: Beim
// Weiterteilen reist der Text nicht mit, das Bild schon. Für das
// Anlagenregister verlangt die Lizenz die Namensnennung, für den
// KfW-Förderreport die Erlaubnis, auf die wir uns stützen.

const BREITE = 1080;
const HOEHE = 1350; // 4:5

export function SocialKarte({ bild, skala = 1 }: { bild: PostBild; skala?: number }) {
  const max = Math.max(...bild.serien.map((s) => Math.abs(s.wert)), 1);
  const kennzahl = bild.art === "kennzahl";

  return (
    <div
      data-social-karte
      style={{
        width: BREITE * skala,
        height: HOEHE * skala,
        background: v("--color-bg"),
        color: v("--color-text-primary"),
        display: "flex",
        flexDirection: "column",
        padding: `${72 * skala}px ${64 * skala}px`,
        boxSizing: "border-box",
        fontFamily: v("--font-text"),
        overflow: "hidden",
      }}
    >
      {/* Die Aussage, nicht die Achsenbeschriftung. Ein Bild ohne Aussage ist
          im Feed eine Zahlentafel, die niemand entziffert. */}
      <div
        style={{
          fontSize: 58 * skala,
          lineHeight: 1.15,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          marginBottom: 20 * skala,
        }}
      >
        {bild.aussage}
      </div>
      <div style={{ fontSize: 30 * skala, color: v("--color-text-muted"), marginBottom: 64 * skala }}>
        {bild.gemessen}
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-evenly" }}>
        {bild.serien.map((s) => {
          const anteil = Math.abs(s.wert) / max;
          return (
            <div key={s.label}>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: space.md * skala,
                  marginBottom: 14 * skala,
                  // Zahl und Einheit gehören in eine Zeile: bricht die Einheit
                  // um, liest sie sich so groß wie der Wert.
                  whiteSpace: "nowrap",
                }}
              >
                <span
                  style={{
                    fontSize: (kennzahl ? 190 : 96) * skala,
                    fontWeight: 700,
                    lineHeight: 1,
                    color: s.hervorgehoben ? v("--color-accent") : v("--color-text-primary"),
                  }}
                >
                  {s.wert.toLocaleString("de-DE", { minimumFractionDigits: s.stellen ?? 0, maximumFractionDigits: s.stellen ?? 0 })}
                </span>
                <span style={{ fontSize: (kennzahl ? 44 : 30) * skala, color: v("--color-text-muted") }}>{s.einheit}</span>
              </div>
              {/* Bei einer einzelnen Kennzahl gibt es nichts zu vergleichen —
                  ein Balken über die volle Breite wäre reine Dekoration. */}
              {!kennzahl && (
                <div
                  style={{
                    height: 30 * skala,
                    width: `${Math.max(anteil * 100, 4)}%`,
                    background: s.hervorgehoben ? v("--color-accent") : v("--color-border"),
                    borderRadius: v("--radius-sm"),
                    marginBottom: 14 * skala,
                  }}
                />
              )}
              <div
                style={{
                  fontSize: (kennzahl ? 36 : 30) * skala,
                  color: v("--color-text-secondary"),
                  lineHeight: 1.35,
                  maxWidth: kennzahl ? "90%" : undefined,
                }}
              >
                {s.label}
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          marginTop: 48 * skala,
          paddingTop: 28 * skala,
          borderTop: `${Math.max(1, 2 * skala)}px solid ${v("--color-border")}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: space.lg * skala,
        }}
      >
        <div style={{ fontSize: 24 * skala, color: v("--color-text-muted"), lineHeight: 1.35, maxWidth: "72%" }}>
          {bild.quelle}
        </div>
        {/* Im Bild lädt die Marke ein, statt sich zu nennen — einen Knopf gibt
            es hier nicht mehr, der ihn ersetzen könnte. */}
        <div style={{ fontSize: 26 * skala, fontWeight: 600, whiteSpace: "nowrap" }}>solar-check.io</div>
      </div>
    </div>
  );
}

export const SOCIAL_KARTE_MASSE = { breite: BREITE, hoehe: HOEHE };
