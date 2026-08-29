import { v, space, pad, type TokenName } from "../../lib/theme";
import InfoTooltip from "../InfoTooltip";
import type { KalenderWoche } from "../../lib/social-kalender";

// Der Redaktionskalender: Wochen als Zeilen, Werktage als Spalten.
//
// KEINE FERTIGE BIBLIOTHEK, und das ist eine Entscheidung mit Begründung. Die
// üblichen Kalender-Pakete lösen die Probleme, die wir NICHT haben — Ziehen und
// Ablegen, Wiederholungsregeln, Zeitzonen, Ganztags- gegen Stundentermine — und
// bringen jeweils ein eigenes Stylesheet und eine eigene Datumsbibliothek mit,
// die man anschließend auf die Farbtoken dieses Projekts umbiegt. Das ist mehr
// Arbeit als ein Raster aus Wochen und Tagen, und es widerspricht der
// Projektregel, keine Bibliothek ohne konkreten Grund einzuführen.
//
// SAMSTAG UND SONNTAG FEHLEN ABSICHTLICH. Es wird an Werktagen veröffentlicht;
// zwei dauerhaft leere Spalten wären ein Fünftel der Fläche für nichts.
//
// Server-Komponente ohne Zustand. Ein Kalender zum Hineinziehen wäre etwas
// anderes — er bräuchte gespeicherte Termine, und die hat dieses Projekt
// bewusst nicht: Ein Datum je Beitrag ist eine Zusage, die niemand einhält,
// sobald eine Woche voll wird.

const WERKTAGE = ["Mo", "Di", "Mi", "Do", "Fr"] as const;

const FARBE: Record<string, { rand: TokenName; text: TokenName }> = {
  gesendet: { rand: "--color-positive-text", text: "--color-positive-text" },
  bereit: { rand: "--color-accent", text: "--color-accent" },
  leer: { rand: "--color-border", text: "--color-text-muted" },
  "vergangen-leer": { rand: "--color-border-muted", text: "--color-text-faint" },
};

function tagZahl(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("de-DE", { day: "numeric", timeZone: "UTC" });
}

function monatVon(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("de-DE", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Der ISO-Tag der Spalte, auch wenn dort kein Platz liegt. */
function tagInWoche(montagIso: string, index: number): string {
  const d = new Date(`${montagIso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + index);
  return d.toISOString().slice(0, 10);
}

export function Wochenplan({ wochen, heuteIso }: { wochen: KalenderWoche[]; heuteIso: string }) {
  let letzterMonat = "";

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: space.xs,
          marginBottom: space.xs,
        }}
      >
        {WERKTAGE.map((t) => (
          <div
            key={t}
            style={{
              fontSize: v("--font-size-caption"),
              color: v("--color-text-muted"),
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            {t}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: space.xs }}>
        {wochen.map((w) => {
          // Der Monatsname steht in der Zeile, in der er WECHSELT — nicht über
          // jeder Woche. Ein Kalender, der zwölfmal „September" sagt, sagt es
          // elfmal zu oft.
          const monat = monatVon(w.beginnIso);
          const zeigeMonat = monat !== letzterMonat;
          letzterMonat = monat;

          return (
            <div key={w.beginnIso}>
              {zeigeMonat && (
                <div
                  style={{
                    fontSize: v("--font-size-caption"),
                    color: v("--color-text-secondary"),
                    fontWeight: 600,
                    margin: `${space.md}px 0 ${space.xs}px`,
                  }}
                >
                  {monat}
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: space.xs }}>
                {WERKTAGE.map((_tag, i) => {
                  const iso = tagInWoche(w.beginnIso, i);
                  const platz = w.plaetze.find((p) => p.iso === iso);
                  const heute = iso === heuteIso;
                  const f = platz ? FARBE[platz.zustand] : null;

                  return (
                    <div
                      key={iso}
                      style={{
                        minHeight: 74,
                        borderRadius: v("--radius-sm"),
                        border: `1px solid ${f ? v(f.rand) : v("--color-border-muted")}`,
                        borderStyle: platz ? "solid" : "dashed",
                        padding: pad("xs", "sm"),
                        background: heute ? v("--color-accent-dim") : "transparent",
                        opacity: !platz || platz.zustand === "vergangen-leer" ? 0.5 : 1,
                      }}
                    >
                      <div
                        style={{
                          fontSize: v("--font-size-caption"),
                          color: heute ? v("--color-accent") : v("--color-text-muted"),
                          fontWeight: heute ? 700 : 400,
                        }}
                      >
                        {tagZahl(iso)}
                      </div>
                      {platz && (
                        <div
                          style={{
                            fontSize: v("--font-size-caption"),
                            color: v(f!.text),
                            marginTop: space.xxs,
                            lineHeight: 1.3,
                          }}
                        >
                          {platz.zustand === "gesendet" && `✓ ${platz.titel}`}
                          {platz.zustand === "bereit" && platz.post.titel}
                          {platz.zustand === "leer" && (
                            <>
                              offen{" "}
                              <InfoTooltip ariaLabel="Warum dieser Platz offen ist" size={12} exportNote={false}>
                                {platz.grund}
                              </InfoTooltip>
                            </>
                          )}
                          {platz.zustand === "vergangen-leer" && "—"}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
