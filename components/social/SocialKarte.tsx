import Logo from "../Logo";
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

/**
 * Schriftgrößen je Stufe — ABSOLUT, nicht skaliert.
 *
 * Das ist der eigentliche Mechanismus. Die volle Karte ist 1080 breit und
 * rechnet ihre Größen mit dem Maßstab hoch; eine Teaser-Karte von 240 Pixeln
 * bekäme daraus 13-Pixel-Überschriften und 5-Pixel-Beschriftungen. Die kleine
 * Stufe setzt ihre Größen deshalb selbst und bleibt damit lesbar, statt eine
 * verkleinerte Fassung derselben Anordnung zu sein.
 *
 * Auch das Seitenverhältnis gilt nur oben: Ein Teaser braucht keine 4:5-Fläche,
 * er hört auf, wo sein Inhalt endet.
 */
const GROESSEN = {
  voll: { aussage: 58, untertitel: 30, wert: 96, einheit: 30, label: 30, balken: 30, polster: 72 },
  teaser: { aussage: 17, untertitel: 0, wert: 40, einheit: 14, label: 13, balken: 10, polster: 16 },
} as const;

/**
 * Größenstufen. Der Unterschied ist NICHT der Maßstab.
 *
 * Eine 1080er Karte auf 240 Pixel herunterzurechnen macht die Quellenzeile
 * fünf Pixel groß — lesbar ist sie damit nirgends, sie kostet nur Platz. Eine
 * kleine Fassung lässt deshalb weg, statt zu schrumpfen: In der Teaser-Stufe
 * bleiben die Aussage und die eine Zahl, auf die es ankommt.
 *
 * Die Quellenangabe fällt nur dort weg, wo sie nicht gebraucht wird: Im Teaser
 * ist die Karte Seiteninhalt, und die Seite nennt ihre Quellen ohnehin. Sobald
 * daraus ein Bild wird, das die Seite verlässt, gilt wieder die volle Stufe —
 * dort ist die Nennung Lizenzpflicht.
 */
export type KartenStufe = "voll" | "teaser";

export function SocialKarte({
  bild,
  skala = 1,
  stufe = "voll",
}: {
  bild: PostBild;
  skala?: number;
  stufe?: KartenStufe;
}) {
  const max = Math.max(...bild.serien.map((s) => Math.abs(s.wert)), 1);
  const kennzahl = bild.art === "kennzahl";
  const klein = stufe === "teaser";
  const g = GROESSEN[stufe];
  // In der kleinen Stufe zählen die Größen absolut, oben werden sie mit dem
  // Maßstab hochgerechnet.
  const px = (wert: number) => (klein ? wert : wert * skala);
  // Im Teaser trägt nur die hervorgehobene Zahl; die Vergleichszahl daneben
  // wäre auf dieser Fläche zwei unlesbare Zeilen.
  const serien = klein ? bild.serien.filter((s) => s.hervorgehoben).slice(0, 1) : bild.serien;

  return (
    <div
      data-social-karte
      style={{
        width: BREITE * skala,
        // Der Teaser hört auf, wo sein Inhalt endet — eine erzwungene
        // 4:5-Fläche wäre hier zur Hälfte leer.
        height: klein ? undefined : HOEHE * skala,
        background: v("--color-bg"),
        color: v("--color-text-primary"),
        display: "flex",
        flexDirection: "column",
        padding: klein ? g.polster : `${72 * skala}px ${64 * skala}px`,
        boxSizing: "border-box",
        fontFamily: v("--font-text"),
        overflow: "hidden",
      }}
    >
      {/* Die Aussage, nicht die Achsenbeschriftung. Ein Bild ohne Aussage ist
          im Feed eine Zahlentafel, die niemand entziffert.
          Im Teaser ist es umgekehrt: Dort steht die Aussage als Text unter der
          Karte, und das Bild zeigt nur die Zahlen. Zweimal derselbe Satz auf
          240 Pixeln wäre die Hälfte der Fläche für nichts. */}
      {!klein && (
      <div
        style={{
          fontSize: px(g.aussage),
          lineHeight: 1.2,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          marginBottom: px(klein ? 12 : 20),
        }}
      >
        {bild.aussage}
      </div>
      )}
      {!klein && (
        <div style={{ fontSize: px(g.untertitel), color: v("--color-text-muted"), marginBottom: px(64) }}>
          {bild.gemessen}
        </div>
      )}

      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-evenly" }}>
        {serien.map((s) => {
          const anteil = Math.abs(s.wert) / max;
          return (
            <div key={s.label}>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: klein ? 4 : space.md * skala,
                  marginBottom: px(klein ? 6 : 14),
                  // Zahl und Einheit gehören in eine Zeile: bricht die Einheit
                  // um, liest sie sich so groß wie der Wert.
                  whiteSpace: "nowrap",
                }}
              >
                <span
                  style={{
                    fontSize: klein ? g.wert : (kennzahl ? 190 : 96) * skala,
                    fontWeight: 700,
                    lineHeight: 1,
                    color: s.hervorgehoben ? v("--color-accent") : v("--color-text-primary"),
                  }}
                >
                  {s.wert.toLocaleString("de-DE", { minimumFractionDigits: s.stellen ?? 0, maximumFractionDigits: s.stellen ?? 0 })}
                </span>
                <span style={{ fontSize: klein ? g.einheit : (kennzahl ? 44 : 30) * skala, color: v("--color-text-muted") }}>{s.einheit}</span>
              </div>
              {/* Bei einer einzelnen Kennzahl gibt es nichts zu vergleichen —
                  ein Balken über die volle Breite wäre reine Dekoration. */}
              {!kennzahl && (
                <div
                  style={{
                    height: px(g.balken),
                    width: `${Math.max(anteil * 100, 4)}%`,
                    background: s.hervorgehoben ? v("--color-accent") : v("--color-border"),
                    borderRadius: v("--radius-sm"),
                    marginBottom: px(klein ? 6 : 14),
                  }}
                />
              )}
              <div
                style={{
                  fontSize: klein ? g.label : (kennzahl ? 36 : 30) * skala,
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

      {!klein && (
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
        {/* Die Marke als Logo, nicht als getippter Name: Im geteilten Bild ist
            sie das Einzige, was die Herkunft zeigt — einen Knopf, der darauf
            führt, gibt es hier nicht mehr. Das Logo führt seine Farben als
            Token, folgt also demselben Farbschema wie die Karte. */}
        <div style={{ flexShrink: 0 }}>
          <Logo width={200 * skala} />
        </div>
      </div>
      )}
    </div>
  );
}

export const SOCIAL_KARTE_MASSE = { breite: BREITE, hoehe: HOEHE };
