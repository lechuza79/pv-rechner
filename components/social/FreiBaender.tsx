"use client";

import { v, space, pad } from "../../lib/theme";
import type { FreiBand } from "../../lib/social-kalendertage";

// Die Ferien- und Feiertagsspur unter einer Kalenderwoche.
//
// EINE EIGENE SPUR, nicht ein Eintrag je Tageszelle. Ferien laufen über Tage
// hinweg; als sieben einzelne Kästchen sähe ein zweiwöchiger Zeitraum aus wie
// vierzehn Ereignisse. Das Band zeigt die Strecke, und das ist die Auskunft.
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
//
// ZWEI SPUREN, NICHT EINE — im Bild aufgefallen: Mariä Himmelfahrt fiel auf
// einen Samstag mitten in den Sommerferien, und der Punkt verschwand unter dem
// Band. Ein Feiertag INNERHALB der Ferien ist der Normalfall, nicht der
// Sonderfall; beide in eine Zeile zu legen heißt, den seltener sichtbaren
// systematisch zu verlieren.

export function FreiBaender({
  baender,
  raster,
  onDetail,
}: {
  baender: FreiBand[];
  /** Dasselbe Raster wie die Tageszellen — sieben gleiche Spalten. */
  raster: React.CSSProperties;
  /** Klick auf ein Ferienband öffnet die Länderliste. Feiertage haben keine. */
  onDetail: (band: FreiBand) => void;
}) {
  if (!baender.length) return null;

  const strecken = baender.filter((b) => !b.einTag);
  const punkte = baender.filter((b) => b.einTag);

  const spur = (liste: FreiBand[], key: string) => (
    <div key={key} style={{ ...raster, marginTop: space.xxs }}>
      {liste.map((b, i) => {
        const rund = 999;
        const punkt = b.einTag;
        return (
          <div
            key={`${b.vonIndex}-${b.text}-${i}`}
            style={{
              gridColumn: `${b.vonIndex + 1} / ${b.bisIndex + 2}`,
              gridRow: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: punkt ? "flex-start" : "stretch",
              minWidth: 0,
            }}
          >
            {punkt ? (
              // Ein einzelner Tag: ein Punkt. Ein Balken über eine Spalte sähe
              // aus wie ein kurzer Zeitraum, und ein Feiertag ist keiner.
              <span
                title={b.text}
                onClick={() => onDetail(b)}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: rund,
                  background: v("--color-kalender-frei"),
                  marginLeft: space.xs,
                  flex: "0 0 auto",
                  cursor: "default",
                }}
              />
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
                }}
              >
                {b.text}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <>
      {strecken.length > 0 && spur(strecken, "strecken")}
      {punkte.length > 0 && spur(punkte, "punkte")}
    </>
  );
}
