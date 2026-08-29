"use client";

import { useState } from "react";
import { v, space, pad } from "../../lib/theme";
import { IconCheck, IconClose, IconLinkedIn } from "../Icons";
import { Pill, type PillTon } from "./Pill";
import { PlatzModal, type PlatzWahl } from "./PlatzModal";
import type { KalenderPlatz, KalenderWoche } from "../../lib/social-kalender";

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
// DIE ZUSTÄNDE SIND NICHT ERFUNDEN, sondern kommen aus der Rechnung: gesendet
// aus dem Versandprotokoll, geplant aus den Zuweisungen, bereit aus der
// Warteschlange, verstrichen aus beidem. Diese Komponente ordnet zu und färbt;
// entschieden wird woanders.

const WERKTAGE = ["Mo", "Di", "Mi", "Do", "Fr"] as const;

/**
 * Wie ein Platz als Pille aussieht.
 *
 * Das Häkchen und das Kreuz stehen NUR dort, wo die Frage „ging es raus"
 * beantwortet ist: gesendet oder verstrichen. Ein geplanter Platz in der Zukunft
 * bekommt keins — er hat die Frage noch nicht, und ein Kreuz an einem Tag, der
 * noch kommt, läse sich als Fehlschlag.
 */
function platzPille(p: KalenderPlatz): { ton: PillTon; icon: React.ReactNode; text: string } | null {
  const linkedin = <IconLinkedIn size={11} />;
  switch (p.zustand) {
    case "gesendet":
      return {
        ton: "gesendet",
        icon: (
          <>
            {linkedin}
            <IconCheck size={11} />
          </>
        ),
        text: p.titel,
      };
    case "verstrichen":
      return {
        ton: "gescheitert",
        icon: (
          <>
            {linkedin}
            <IconClose size={11} />
          </>
        ),
        text: p.zuweisung.titel ?? "geplant",
      };
    case "geplant":
      return { ton: "geplant", icon: linkedin, text: p.zuweisung.titel ?? "geplant" };
    case "bereit":
      return { ton: "ruhig", icon: linkedin, text: p.post.titel };
    case "leer":
      return { ton: "leise", icon: linkedin, text: "offen" };
    default:
      return null;
  }
}

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

function tagInWoche(montagIso: string, index: number): string {
  const d = new Date(`${montagIso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + index);
  return d.toISOString().slice(0, 10);
}

export function Wochenplan({
  wochen,
  heuteIso,
  wahl,
}: {
  wochen: KalenderWoche[];
  heuteIso: string;
  wahl: PlatzWahl;
}) {
  const [offenerTag, setOffenerTag] = useState<string | null>(null);
  const [ueber, setUeber] = useState<string | null>(null);
  let letzterMonat = "";

  const belegteTage = new Set(
    wochen.flatMap((w) => w.plaetze.filter((p) => p.zustand === "geplant" || p.zustand === "verstrichen").map((p) => p.iso)),
  );

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: space.xs, marginBottom: space.xs }}>
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
                  const artikel = w.artikel.filter((a) => a.iso === iso);
                  const heute = iso === heuteIso;
                  const pille = platz ? platzPille(platz) : null;
                  // Vergangenes lässt sich nicht mehr planen — ein Platz in der
                  // Vergangenheit ist eine Tatsache, keine Absicht.
                  const planbar = iso >= heuteIso;
                  const angefasst = ueber === iso;

                  return (
                    <div
                      key={iso}
                      onMouseEnter={() => setUeber(iso)}
                      onMouseLeave={() => setUeber((u) => (u === iso ? null : u))}
                      onClick={planbar ? () => setOffenerTag(iso) : undefined}
                      role={planbar ? "button" : undefined}
                      tabIndex={planbar ? 0 : undefined}
                      onKeyDown={
                        planbar
                          ? (e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setOffenerTag(iso);
                              }
                            }
                          : undefined
                      }
                      style={{
                        minHeight: 80,
                        borderRadius: v("--radius-sm"),
                        border: `1px solid ${heute ? v("--color-accent") : v("--color-border-muted")}`,
                        borderStyle: platz ? "solid" : "dashed",
                        padding: pad("xs", "sm"),
                        background: angefasst && planbar ? v("--color-bg-muted") : "transparent",
                        cursor: planbar ? "pointer" : "default",
                        opacity: !platz && !artikel.length ? 0.55 : 1,
                        position: "relative",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "baseline",
                          gap: space.xs,
                        }}
                      >
                        {/* Heute: die Zahl im blauen Kreis. Das Wort „heute"
                            daneben wäre dieselbe Aussage ein zweites Mal, und
                            in einer Zelle dieser Größe kostet das eine Zeile. */}
                        <span
                          style={
                            heute
                              ? {
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  width: 22,
                                  height: 22,
                                  borderRadius: 999,
                                  background: v("--color-accent"),
                                  color: v("--color-text-on-accent"),
                                  fontSize: v("--font-size-caption"),
                                  fontWeight: 700,
                                }
                              : { fontSize: v("--font-size-caption"), color: v("--color-text-muted") }
                          }
                          aria-current={heute ? "date" : undefined}
                        >
                          {tagZahl(iso)}
                        </span>
                        {/* Der Hinweis erscheint erst beim Überfahren: Ein „+"
                            an jedem freien Tag wäre eine Reihe von Knöpfen, die
                            nur Fläche kostet. */}
                        {!heute && angefasst && planbar && (
                          <span style={{ fontSize: v("--font-size-caption"), color: v("--color-accent") }}>
                            {platz && platz.zustand === "geplant" ? "ändern" : "belegen"}
                          </span>
                        )}
                      </div>

                      {pille && (
                        <div style={{ marginTop: space.xxs, display: "flex" }}>
                          <Pill ton={pille.ton} icon={pille.icon} titel={pille.text}>
                            {pille.text}
                          </Pill>
                        </div>
                      )}

                      {/* Ratgeber-Ereignisse. Erschienen und überarbeitet sind
                          zwei verschiedene Tatsachen und werden auch so
                          beschriftet — ein neuer Ratgeber ist ein anderer
                          Anlass als ein überarbeiteter. */}
                      {artikel.map((a) => (
                        <div key={`${a.slug}-${a.anlass}`} style={{ marginTop: space.xxs, display: "flex" }}>
                          <Pill
                            ton="leise"
                            titel={`${a.anlass === "live" ? "Ratgeber erschienen" : "Ratgeber überarbeitet"}: ${a.titel}`}
                          >
                            {a.anlass === "live" ? "neu" : "überarbeitet"}: {a.titel}
                          </Pill>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <PlatzModal
        datum={offenerTag}
        offen={!!offenerTag}
        onClose={() => setOffenerTag(null)}
        wahl={wahl}
        belegt={!!offenerTag && belegteTage.has(offenerTag)}
      />
    </div>
  );
}
