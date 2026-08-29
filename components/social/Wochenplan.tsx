"use client";

import { useState } from "react";
import { v, space, pad } from "../../lib/theme";
import { IconCheck, IconClose, IconLinkedIn } from "../Icons";
import { Pill, type PillTon } from "./Pill";
import { PlatzModal, type PlatzWahl } from "./PlatzModal";
import { deckung, type KalenderPlatz, type KalenderWoche } from "../../lib/social-kalender";
import { ferienJeLand, freiBaender, tagesbefund, type FreiBand } from "../../lib/social-kalendertage";
import { FreiBaender } from "./FreiBaender";
import { FerienModal, type FerienZeile } from "./FerienModal";

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
// SAMSTAG UND SONNTAG SIND DABEI, obwohl dort nie ein Sendeplatz liegt. Sie
// fehlten zuerst, mit der Begründung „am Wochenende wird nicht veröffentlicht" —
// und die stimmt für PLÄTZE, aber der Kalender trägt mehr als die. Gemessen:
// Drei von zehn Ratgeber-Daten liegen auf einem Samstag oder Sonntag, waren also
// unsichtbar. Und der Marker für „heute" verschwand an jedem Wochenende
// vollständig, weil es keine Spalte gab, in die er gehört hätte.
//
// Eine Spalte wegzulassen, weil EINE Sorte Inhalt dort nie steht, wirft jede
// andere Sorte mit weg — und zwar lautlos.
//
// DIE ZUSTÄNDE SIND NICHT ERFUNDEN, sondern kommen aus der Rechnung: gesendet
// aus dem Versandprotokoll, geplant aus den Zuweisungen, bereit aus der
// Warteschlange, verstrichen aus beidem. Diese Komponente ordnet zu und färbt;
// entschieden wird woanders.

const TAGE = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"] as const;
/** Am Wochenende liegt nie ein Sendeplatz — die Spalte tritt zurück. */
const WOCHENENDE = new Set([5, 6]);

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

/**
 * Sieben gleich breite Spalten.
 *
 * `minmax(0, 1fr)` und nicht `1fr`: Eine Spalte mit `1fr` hat als Mindestbreite
 * ihren Inhalt, und eine lange Pille zieht sie dann auf Kosten der Nachbarn
 * breit. Im Bild sah das aus wie ein kaputtes Raster — der Montag doppelt so
 * breit wie der Dienstag, je nachdem, welcher Ratgebertitel dort lag.
 */
const raster = {
  display: "grid",
  gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
  gap: space.xs,
} as const;

function tagInWoche(montagIso: string, index: number): string {
  const d = new Date(`${montagIso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + index);
  return d.toISOString().slice(0, 10);
}

/**
 * Wie viele Wochen im Voraus zunächst zu sehen sind.
 *
 * Der Server rechnet WEITER, als hier gezeigt wird — die Rechnung ist rein und
 * kostet nichts, und ein Nachladen je Woche wäre ein Netzweg für etwas, das
 * längst da ist. Sichtbar sind zwei Wochen, weil das die Frage beantwortet, mit
 * der man die Seite aufmacht: Ist die kommende Woche gedeckt.
 */
const VORAUS_ANFANG = 2;

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
  const [ferienTag, setFerienTag] = useState<string | null>(null);
  const [voraus, setVoraus] = useState(VORAUS_ANFANG);
  let letzterMonat = "";

  // Vergangene Wochen bleiben vollständig stehen; nach vorn wird aufgeklappt.
  const vergangen = wochen.filter((w) => w.plaetze.every((p) => p.iso < heuteIso)).length;
  const gezeigteWochen = wochen.slice(0, vergangen + 1 + voraus);
  const nochMehr = gezeigteWochen.length < wochen.length;

  // Die Abdeckung zählt, WAS ZU SEHEN IST. Sie über alle gerechneten Wochen zu
  // zählen hieße, eine Lücke in zwölf Wochen als offenen Punkt zu melden, den
  // niemand sieht — und die Zahl spränge beim Aufklappen ohne erkennbaren Grund.
  const gedeckt = deckung(gezeigteWochen, heuteIso);

  const belegteTage = new Set(
    wochen.flatMap((w) => w.plaetze.filter((p) => p.zustand === "geplant" || p.zustand === "verstrichen").map((p) => p.iso)),
  );

  return (
    <div>
      <div
        style={{
          fontSize: v("--font-size-small"),
          color: v("--color-text-muted"),
          marginBottom: space.sm,
        }}
      >
        {gedeckt.offen > 0
          ? `${gedeckt.belegt} gedeckt, ${gedeckt.offen} offen`
          : `alle ${gedeckt.belegt} gedeckt`}
      </div>

      <div style={{ ...raster, marginBottom: space.xs }}>
        {TAGE.map((t, i) => (
          <div
            key={t}
            style={{
              fontSize: v("--font-size-caption"),
              color: WOCHENENDE.has(i) ? v("--color-text-faint") : v("--color-text-muted"),
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            {t}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: space.xs }}>
        {gezeigteWochen.map((w) => {
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
              {/* DIE KOPFZEILE DER WOCHE: Tagesdaten und Ereignisse in EINER
                  Zeile über den Tagen. Vorher stand die Zahl in der Zelle und
                  das Ereignisband darunter — dann trägt jede Zelle oben eine
                  Zahl, die vom Inhalt wegrückt, und das Band schwebt zwischen
                  zwei Wochen, ohne zu einer zu gehören. Jetzt gehört beides in
                  denselben Streifen, und die Zellen darunter tragen nur noch
                  Inhalt. */}
              {/* DIE WOCHE IST EINE BOX. Vorher trug jede Tageszelle ihren
                  eigenen Rahmen, und die Woche entstand nur dadurch, dass
                  sieben Rahmen nebeneinander lagen — bei fünf Wochen
                  untereinander sind das fünfunddreißig Kanten, die alle gleich
                  laut sind. Jetzt trägt die Woche den Rahmen und die Tage sind
                  Flächen darin: eine Kante je Woche statt sieben. */}
              <div
                style={{
                  border: `1px solid ${v("--color-border-muted")}`,
                  borderRadius: v("--radius-md"),
                  padding: pad("md", "md"),
                  background: v("--color-bg"),
                }}
              >
              <div style={{ ...raster, alignItems: "end", marginBottom: space.xxs }}>
                {TAGE.map((_tag, i) => {
                  const iso = tagInWoche(w.beginnIso, i);
                  const heute = iso === heuteIso;
                  // FETT, WO NICHT GEARBEITET WIRD: Wochenende und Feiertag.
                  // Das ist dieselbe Aussage wie das Ferienband darunter, nur
                  // auf Tagesebene — und sie steht am Datum, weil man beim
                  // Planen auf die Zahl schaut, nicht auf das Band.
                  const b = tagesbefund(iso);
                  const feiertag = !!(b.feiertagUeberall ?? b.feiertagRegional);
                  const frei = WOCHENENDE.has(i) || feiertag;
                  return (
                    <div key={`kopf-${iso}`} style={{ gridColumn: i + 1, gridRow: 1, minWidth: 0 }}>
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
                            : {
                                fontSize: v("--font-size-caption"),
                                fontWeight: frei ? 700 : 400,
                                color: frei ? v("--color-text-secondary") : v("--color-text-muted"),
                                paddingLeft: 2,
                              }
                        }
                        aria-current={heute ? "date" : undefined}
                      >
                        {tagZahl(iso)}
                      </span>
                    </div>
                  );
                })}
              </div>

              <FreiBaender
                baender={freiBaender(w.beginnIso)}
                raster={raster}
                onDetail={(b: FreiBand) => setFerienTag(b.tagIso)}
              />

              <div style={{ ...raster, marginTop: space.xxs }}>
                {TAGE.map((_tag, i) => {
                  const iso = tagInWoche(w.beginnIso, i);
                  const platz = w.plaetze.find((p) => p.iso === iso);
                  const artikel = w.artikel.filter((a) => a.iso === iso);
                  const pille = platz ? platzPille(platz) : null;
                  // Vergangenes lässt sich nicht mehr planen — ein Platz in der
                  // Vergangenheit ist eine Tatsache, keine Absicht. Und am
                  // Wochenende gibt es keinen Platz, den man belegen könnte.
                  const planbar = iso >= heuteIso && !WOCHENENDE.has(i);
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
                        minHeight: 104,
                        borderRadius: v("--radius-sm"),
                        // Ein feiner Rahmen an JEDEM Tag. Er war zwischendurch
                        // weg, weil sieben Rahmen je Woche zu laut waren — aber
                        // ganz ohne verschwimmen die Tage zu einer Fläche, und
                        // man sieht nicht mehr, wohin man klickt. Die Lösung ist
                        // nicht keiner, sondern ein leiserer als der der Woche.
                        border: `1px solid ${v("--color-border-muted")}`,
                        // KEINE zweite Heute-Markierung: Die Zahl in der
                        // Kopfzeile trägt den blauen Kreis und steht über ihrer
                        // Spalte. Ein Ring um die Zelle sagte dasselbe noch
                        // einmal — und an einem Samstag, an dem ohnehin kein
                        // Platz liegt, umrahmt er eine leere Fläche.
                        padding: pad("xs", "sm"),
                        // ALLE Tage weiß. Die getönte Fläche für Tage mit
                        // Sendeplatz füllte den größten Teil der Wochenbox und
                        // ließ die ganze Woche grau wirken — den Unterschied
                        // tragen der Rahmen und die Pille, dafür braucht es
                        // keine zweite Farbe. Getönt wird nur, was man gerade
                        // anfasst.
                        background: angefasst && planbar ? v("--color-bg-accent") : "transparent",
                        cursor: planbar ? "pointer" : "default",
                        opacity: !platz && !artikel.length ? 0.55 : 1,
                        position: "relative",
                      }}
                    >
                      {/* Der Hinweis erscheint erst beim Überfahren: Ein „+"
                          an jedem freien Tag wäre eine Reihe von Knöpfen, die
                          nur Fläche kostet. */}
                      {angefasst && planbar && (
                        <div
                          style={{
                            fontSize: v("--font-size-caption"),
                            color: v("--color-accent"),
                            textAlign: "right",
                          }}
                        >
                          {platz && platz.zustand === "geplant" ? "ändern" : "belegen"}
                        </div>
                      )}

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
            </div>
          );
        })}
      </div>

      {nochMehr && (
        <button
          type="button"
          onClick={() => setVoraus((n) => n + 1)}
          style={{
            marginTop: space.md,
            padding: pad("xs", "lg"),
            borderRadius: v("--radius-sm"),
            border: `1px solid ${v("--color-border")}`,
            background: "transparent",
            color: v("--color-text-secondary"),
            cursor: "pointer",
            fontSize: v("--font-size-small"),
          }}
        >
          Nächste Woche anzeigen
        </button>
      )}

      <FerienModal
        datum={ferienTag}
        offen={!!ferienTag}
        onClose={() => setFerienTag(null)}
        zeilen={(ferienTag ? ferienJeLand(ferienTag) : []) as FerienZeile[]}
      />

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
