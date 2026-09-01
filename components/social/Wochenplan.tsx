"use client";

import { useEffect, useRef, useState } from "react";
import { v, space, pad } from "../../lib/theme";
import { IconCheck, IconClose, IconLinkedIn, IconRefresh } from "../Icons";
import { Pill, type PillTon } from "./Pill";
import { PlatzModal, type PlatzWahl } from "./PlatzModal";
import { deckung, type KalenderPlatz, type KalenderWoche } from "../../lib/social-kalender";
import { ferienJeLand, freiBaender, tagesbefund, type FreiBand } from "../../lib/social-kalendertage";
import { FreiBaender } from "./FreiBaender";
import { FerienModal, type FerienZeile } from "./FerienModal";
import { KalenderNav, type NavMonat } from "./KalenderNav";

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
 * Wie viele Wochen gleichzeitig zu sehen sind.
 *
 * Der Server rechnet ein halbes Jahr in jede Richtung — die Rechnung ist rein
 * und kostet nichts, und ein Nachladen je Woche wäre ein Netzweg für etwas, das
 * längst da ist. Sichtbar ist davon ein Fenster, das man schiebt.
 *
 * VIER als Voreinstellung: Das ist der Blick, mit dem man die Seite aufmacht —
 * die vergangene Woche als Beleg, diese und die nächsten beiden als Arbeit.
 */
const WOCHEN_VOREINSTELLUNG = 4;
const WOCHENZAHLEN = [2, 4, 6, 8];

/**
 * Wie viele vergangene Wochen im Anfangsfenster stehen.
 *
 * EINE. Der Kalender ist ein Planungswerkzeug, kein Archiv — aber ganz ohne
 * Rückblick fehlt der Beleg, dass die Kadenz überhaupt gehalten wurde. Wer
 * weiter zurück will, schiebt.
 */
const RUECKBLICK = 1;

function begrenze(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/**
 * Wie das Fenster beschriftet wird.
 *
 * Ein Fenster über vier Wochen liegt selten in EINEM Monat. „September 2026" zu
 * schreiben, während die halbe Fläche August zeigt, wäre eine Beschriftung, die
 * etwas anderes sagt als der Inhalt darunter — dieselbe Fehlerklasse, die dieses
 * Projekt bei Zahlen als schwersten Fehler führt. Also die Spanne, und das Jahr
 * nur einmal, wenn beide Enden im selben liegen.
 */
export function fensterTitel(vonIso: string, bisIso: string): string {
  const d = (iso: string) => new Date(`${iso}T12:00:00Z`);
  const monat = (iso: string, lang: boolean) =>
    d(iso).toLocaleDateString("de-DE", { month: lang ? "long" : "short", timeZone: "UTC" });
  const jahr = (iso: string) => d(iso).getUTCFullYear();

  if (monat(vonIso, true) === monat(bisIso, true) && jahr(vonIso) === jahr(bisIso)) {
    return `${monat(vonIso, true)} ${jahr(vonIso)}`;
  }
  if (jahr(vonIso) === jahr(bisIso)) {
    return `${monat(vonIso, false)} – ${monat(bisIso, false)} ${jahr(vonIso)}`;
  }
  return `${monat(vonIso, false)} ${jahr(vonIso)} – ${monat(bisIso, false)} ${jahr(bisIso)}`;
}

function monatsSchluessel(iso: string): string {
  return iso.slice(0, 7);
}

export function Wochenplan({
  wochen,
  heuteIso,
  wahl,
  ueberschrift,
  hilfe,
  hilfeLabel,
}: {
  wochen: KalenderWoche[];
  heuteIso: string;
  wahl: PlatzWahl;
  /** Die Überschrift — sie steht in der Steuerleiste, nicht darüber. */
  ueberschrift: string;
  hilfe?: string;
  hilfeLabel?: string;
}) {
  const [offenerTag, setOffenerTag] = useState<string | null>(null);
  const [ueber, setUeber] = useState<string | null>(null);
  const [ferienTag, setFerienTag] = useState<string | null>(null);
  const [wochenzahl, setWochenzahl] = useState(WOCHEN_VOREINSTELLUNG);

  // Die Woche, in der heute liegt — der Anker für Anfangslage und Rücksprung.
  const heuteWoche = Math.max(
    0,
    wochen.findIndex((w) => w.plaetze.some((p) => p.iso >= heuteIso)),
  );
  const maxVersatz = Math.max(0, wochen.length - wochenzahl);
  const heimVersatz = begrenze(heuteWoche - RUECKBLICK, 0, maxVersatz);

  const [versatz, setVersatz] = useState(heimVersatz);
  // Ein Einzelschritt wird verfolgt (oben eine raus, unten eine rein), ein
  // Sprung nicht — bei vier gleichzeitig fahrenden Zeilen sieht man nichts mehr
  // als Zappeln. Der Merker sagt der CSS-Regel, welcher Fall gerade vorliegt.
  const [sprung, setSprung] = useState(true);
  const gemerkt = useRef(versatz);

  // Wird das Fenster breiter, kann sein Versatz aus dem Bereich laufen.
  useEffect(() => {
    setVersatz((n) => begrenze(n, 0, Math.max(0, wochen.length - wochenzahl)));
  }, [wochenzahl, wochen.length]);

  function schiebe(auf: number, alsSprung: boolean) {
    const ziel = begrenze(auf, 0, maxVersatz);
    setSprung(alsSprung || Math.abs(ziel - gemerkt.current) !== 1);
    gemerkt.current = ziel;
    setVersatz(ziel);
  }

  const gezeigteWochen = wochen.slice(versatz, versatz + wochenzahl);
  // Ein Nachbar über und unter dem Fenster wird MITGERENDERT, aber zugeklappt.
  // Nur so gibt es beim Schritt etwas, das hereinfahren kann — käme die Woche
  // erst mit dem Klick in den Baum, stünde sie sofort in voller Höhe da.
  const vonIndex = Math.max(0, versatz - 1);
  const bisIndex = Math.min(wochen.length, versatz + wochenzahl + 1);

  // Die Abdeckung zählt, WAS ZU SEHEN IST. Sie über alle gerechneten Wochen zu
  // zählen hieße, eine Lücke in einem halben Jahr als offenen Punkt zu melden,
  // den niemand sieht — und die Zahl spränge beim Schieben ohne erkennbaren
  // Grund.
  const gedeckt = deckung(gezeigteWochen, heuteIso);

  const letzterTag = gezeigteWochen.length
    ? tagInWoche(gezeigteWochen[gezeigteWochen.length - 1].beginnIso, 6)
    : heuteIso;
  const titel = gezeigteWochen.length
    ? fensterTitel(gezeigteWochen[0].beginnIso, letzterTag)
    : "";

  // Zu jedem Monat des gerechneten Bereichs die erste Woche, die ihn berührt.
  const monate: NavMonat[] = [];
  wochen.forEach((w, i) => {
    const schluessel = monatsSchluessel(w.beginnIso);
    if (monate.some((m) => m.schluessel === schluessel)) return;
    monate.push({ schluessel, name: monatVon(w.beginnIso), index: i });
  });

  const belegteTage = new Set(
    wochen.flatMap((w) => w.plaetze.filter((p) => p.zustand === "geplant" || p.zustand === "verstrichen").map((p) => p.iso)),
  );

  return (
    <div>
      <KalenderNav
        ueberschrift={ueberschrift}
        hilfe={hilfe}
        hilfeLabel={hilfeLabel}
        hinweis={
          gedeckt.offen > 0
            ? `${gedeckt.belegt} gedeckt, ${gedeckt.offen} offen`
            : `alle ${gedeckt.belegt} gedeckt`
        }
        titel={titel}
        monate={monate}
        aktiverMonat={gezeigteWochen.length ? monatsSchluessel(gezeigteWochen[0].beginnIso) : ""}
        wochenzahl={wochenzahl}
        wochenzahlen={WOCHENZAHLEN}
        amAnfang={versatz === 0}
        amEnde={versatz >= maxVersatz}
        istHeuteFenster={versatz === heimVersatz}
        aufHeute={() => schiebe(heimVersatz, true)}
        onSchritt={(r) => schiebe(versatz + r, false)}
        onMonat={(i) => schiebe(i, true)}
        onWochenzahl={(n) => {
          setSprung(true);
          setWochenzahl(n);
        }}
      />

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
        {wochen.slice(vonIndex, bisIndex).map((w, n) => {
          const index = vonIndex + n;
          const imFenster = index >= versatz && index < versatz + wochenzahl;
          // Der Monatsname steht in der Zeile, in der er WECHSELT — nicht über
          // jeder Woche. Ein Kalender, der zwölfmal „September" sagt, sagt es
          // elfmal zu oft. Gemessen wird gegen die VORHERIGE Woche im Bestand,
          // nicht gegen die vorherige gerenderte: Sonst trägt die erste Woche
          // des Fensters ihren Monat mal und mal nicht, je nachdem, ob über ihr
          // gerade ein zugeklappter Nachbar hängt.
          const vorher = index > 0 ? monatVon(wochen[index - 1].beginnIso) : "";
          const monat = monatVon(w.beginnIso);
          // Die OBERSTE sichtbare Woche trägt ihren Monat immer. Sonst steht
          // ganz oben eine Woche ohne Monatsangabe, sobald man in einen Monat
          // hineinscrollt statt an seinem Anfang zu beginnen — der Trenner
          // hängt am Wechsel, und den hat man dann schon hinter sich.
          const zeigeMonat = index === versatz || monat !== vorher;

          return (
            <div
              key={w.beginnIso}
              className="sc-kalwoche"
              data-zu={imFenster ? undefined : "1"}
              data-sprung={sprung ? "1" : undefined}
              aria-hidden={imFenster ? undefined : true}
            >
            <div>
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
                  // DIE WOCHE IST LEICHT GETÖNT, damit die Tage darin überhaupt
                  // etwas sein können. Zwischendurch war beides weiß — dann gibt
                  // es keine Staffelung mehr, und die Fläche zerfällt in lauter
                  // gleich laute Kästchen.
                  background: v("--color-bg-muted"),
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
                        // DREI STUFEN, und jede sagt etwas:
                        //   grauer Grund  — ein Tag ohne Sendeplatz
                        //   weiße Fläche  — hier wird gesendet
                        //   blaue Kante   — und zwar noch, es liegt vor uns
                        // Vergangene Plätze bleiben weiß, aber ohne die Kante:
                        // Sie sind Protokoll, keine Aufgabe.
                        border: `1px solid ${
                          platz && planbar ? v("--color-accent") : v("--color-border-muted")
                        }`,
                        // KEINE zweite Heute-Markierung: Die Zahl in der
                        // Kopfzeile trägt den blauen Kreis und steht über ihrer
                        // Spalte. Ein Ring um die Zelle sagte dasselbe noch
                        // einmal — und an einem Samstag, an dem ohnehin kein
                        // Platz liegt, umrahmt er eine leere Fläche.
                        padding: pad("xs", "sm"),
                        background: angefasst && planbar
                          ? v("--color-bg-accent")
                          : platz
                            ? v("--color-bg")
                            : "transparent",
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
                      {/* Der TITEL steht nicht in der Pille. In einer Zelle
                          dieser Breite bleibt von ihm ohnehin nur ein
                          abgeschnittener Anfang übrig — das Wort „Ratgeber"
                          sagt, worum es geht, der volle Titel steht im Hinweis,
                          und ein Klick führt zum Artikel. Das Kreisel-Zeichen
                          unterscheidet die Überarbeitung vom Erscheinen. */}
                      {artikel.map((a) => (
                        <div key={`${a.slug}-${a.anlass}`} style={{ marginTop: space.xxs, display: "flex" }}>
                          <Pill
                            ton="ratgeber"
                            href={a.slug}
                            icon={a.anlass === "ueberarbeitet" ? <IconRefresh size={11} /> : undefined}
                            titel={`${a.anlass === "live" ? "Erschienen" : "Überarbeitet"}: ${a.titel}`}
                          >
                            Ratgeber
                          </Pill>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
              </div>
            </div>
            </div>
          );
        })}
      </div>

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
