"use client";

import { v, space, pad } from "../../lib/theme";
import type { FreiBand } from "../../lib/social-kalendertage";

// Die Ereigniszeile unter einer Kalenderwoche: Ferien und Feiertage.
//
// EINE ZEILE, NICHT ZWEI. Der erste Anlauf legte Bänder und Punkte in zwei
// Spuren, weil ein Feiertag mitten in den Ferien sonst unter dem Band
// verschwand. Die Trennung löste das Sichtbarkeitsproblem und erzeugte ein
// größeres: Zwei Zeilen behaupten zwei unabhängige Ereignisse, dabei ist der
// Feiertag IN den Ferien — Mariä Himmelfahrt liegt im August in jedem zweiten
// Bundesland mitten in den Sommerferien. Der Punkt gehört auf das Band, nicht
// daneben.
//
// SIE LIEGT AUF DEMSELBEN RASTER wie die Tageszellen — sieben gleich breite
// Spalten. Nur so steht der Bandanfang wirklich unter dem Tag, an dem der
// Zeitraum beginnt; eine eigene Breitenrechnung wäre eine zweite Wahrheit, die
// beim nächsten Umbau danebenläuft.
//
// DIE ECKEN SAGEN ETWAS: rund dort, wo der Zeitraum wirklich anfängt oder
// aufhört, gerade dort, wo er über den Wochenrand weiterläuft. Ein Band, das an
// beiden Enden rund ist, obwohl die Ferien noch zwei Wochen gehen, behauptet ein
// Ende, das es nicht gibt.

export function FreiBaender({
  baender,
  raster,
  onDetail,
}: {
  baender: FreiBand[];
  /** Dasselbe Raster wie die Tageszellen — sieben gleiche Spalten. */
  raster: React.CSSProperties;
  /** Klick öffnet die Länderliste des Tages. */
  onDetail: (band: FreiBand) => void;
}) {
  if (!baender.length) return null;

  const rund = 999;
  // Strecken zuerst, Punkte danach — beide in dieselbe Rasterzeile. Die
  // Reihenfolge im Baum entscheidet, was oben liegt: Der Punkt gehört auf das
  // Band, weil der Feiertag im Ferienzeitraum liegt und nicht daneben.
  const sortiert = [...baender].sort((a, b) => Number(a.einTag) - Number(b.einTag));

  return (
    <div style={{ ...raster, marginTop: space.xxs, minHeight: 18 }}>
      {sortiert.map((b, i) => (
        <div
          key={`${b.vonIndex}-${b.text}-${i}`}
          style={{
            gridColumn: `${b.vonIndex + 1} / ${b.bisIndex + 2}`,
            gridRow: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: b.einTag ? "center" : "stretch",
            minWidth: 0,
            // Punkte über die Bänder, sonst verschwindet der Feiertag unter den
            // Ferien — genau der Fall, der diese Zeile überhaupt ausgelöst hat.
            zIndex: b.einTag ? 1 : 0,
            pointerEvents: "none",
          }}
        >
          {b.einTag ? (
            // Ein einzelner Tag: ein Punkt. Ein Balken über eine Spalte sähe aus
            // wie ein kurzer Zeitraum, und ein Feiertag ist keiner.
            // DIE TREFFERFLÄCHE IST GRÖSSER ALS DER PUNKT. Neun Pixel sind als
            // Ziel für einen Zeiger zu klein — der Hinweis war da und ging
            // trotzdem nicht auf, weil man den Punkt kaum trifft. Sichtbar
            // bleiben neun Pixel, anfassbar sind zwanzig.
            <button
              type="button"
              title={b.text}
              onClick={() => onDetail(b)}
              aria-label={b.text}
              style={{
                width: 20,
                height: 20,
                padding: 0,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                flex: "0 0 auto",
                pointerEvents: "auto",
              }}
            >
              <span
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: rund,
                  background: v("--color-kalender-frei"),
                  // Der Ring trennt den Punkt vom Band darunter. Ohne ihn geht
                  // ein kräftiges Pink auf blassem Pink optisch unter.
                  boxShadow: `0 0 0 2px ${v("--color-bg")}`,
                }}
              />
            </button>
          ) : (
            <button
              type="button"
              title={b.text}
              onClick={() => onDetail(b)}
              style={{
                width: "100%",
                minWidth: 0,
                textAlign: "left",
                border: "none",
                cursor: "pointer",
                background: v("--color-kalender-frei-dim"),
                color: v("--color-kalender-frei"),
                borderLeft: `3px solid ${v("--color-kalender-frei")}`,
                borderTopLeftRadius: b.echterBeginn ? rund : 0,
                borderBottomLeftRadius: b.echterBeginn ? rund : 0,
                borderTopRightRadius: b.echtesEnde ? rund : 0,
                borderBottomRightRadius: b.echtesEnde ? rund : 0,
                padding: pad("xxs", "sm"),
                fontSize: v("--font-size-caption"),
                lineHeight: 1.25,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                pointerEvents: "auto",
              }}
            >
              {b.text}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
