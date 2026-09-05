"use client";

import { useCallback, useEffect, useState } from "react";
import { v, space, pad } from "../../lib/theme";
import GemeindeWidgetShell from "./GemeindeWidgetShell";
import StorySlider from "../StorySlider";
import Modal from "../Modal";
import { IconChevronLeft, IconChevronRight } from "../Icons";
import { WIDGETS, widgetFuerMeldung } from "../../lib/widget-registry";
import type { Meldung } from "../../lib/gemeinde-meldungen";

/**
 * Was es über diesen Ort gerade zu berichten gibt — als Teaser-Reihe, aus der
 * sich jede Meldung im Fenster öffnen und weitergeben lässt.
 *
 * DIE RECHNUNG STEHT WOANDERS. Überschrift und Text kommen aus derselben
 * Funktion, die die Abo-Mail verschickt (lib/gemeinde-meldungen.ts) — hier wird
 * nichts nachformuliert. Wer eine Formulierung ändern will, ändert sie dort,
 * sonst sagen Seite und Mail über denselben Ort verschiedene Dinge. Das ist im
 * Projekt zwischen Brief und Seite schon einmal passiert.
 *
 * WARUM TEASER UND FENSTER STATT DREI KARTEN NEBENEINANDER: Ausgebreitet sind
 * es drei Textklötze, die den Kennzahlen der Seite die erste Bildschirmhöhe
 * wegnehmen und selbst nichts zeigen. Der Teaser trägt die Schlagzeile — die
 * IST die Nachricht —, das Fenster trägt die vollständige Meldung samt der
 * Karte, die man herunterladen und weitergeben kann.
 *
 * OFFEN UND DER EIGENTLICHE PUNKT: Eine Meldung hat heute nur Überschrift und
 * Fließtext, keine Zahlen als Daten. Deshalb steht im Fenster ein Absatz und
 * kein Diagramm. Der Fund aus dem Story-Suchlauf trägt seine Werte bereits
 * benannt und mit Einheit; sobald die Ortsmeldung dieselbe Struktur hat,
 * zeichnet dieselbe Karte ein Bild statt eines Absatzes — und dieselbe Reihe
 * kann lokale Meldungen und redaktionell freigegebene Funde mischen.
 *
 * KEINE PLATZIERUNG IN DIESER REIHE, obwohl die Meldungs-Rechnung eine kennt:
 * Die Auszeichnung steht als eigene Karte direkt darüber, und zwei Elemente,
 * die dieselbe Frage beantworten, sind genau der Fehler, gegen den jener Block
 * gebaut wurde. Sie kostet zusätzlich rund 1,7 s Rangdaten.
 */
export default function GemeindeMeldungen({
  meldungen,
  name,
  liveUrl,
  standIso,
}: {
  /** Fertig gerechnet, absteigend nach Gewicht. Leer ist ein zulässiges
   *  Ergebnis — dann rendert der Block gar nichts. */
  meldungen: Meldung[];
  name: string;
  /** Kanonische Adresse dieser Ortsseite. Wandert ins Teilen-Ziel jeder Karte. */
  liveUrl: string;
  /** Datenstand des Anlagenregisters. Steht an jeder Karte, auch im Bild. */
  standIso: string;
}) {
  // `null` heißt zu. Der Index bleibt beim Schließen NICHT stehen: Wer die
  // Reihe erneut öffnet, öffnet die Meldung, die er angetippt hat.
  const [offen, setOffen] = useState<number | null>(null);

  if (meldungen.length === 0) return null;

  return (
    <div style={S.wrap}>
      <h2 style={S.h2}>Aktuelles aus {name}</h2>
      <p style={S.sub}>Aus den Anlagendaten gerechnet — zum Ansehen und Weitergeben.</p>

      <StorySlider ariaLabel={`Meldungen aus ${name}`}>
        {meldungen.map((m, i) => (
          <Teaser key={m.schluessel} meldung={m} onOeffnen={() => setOffen(i)} />
        ))}
      </StorySlider>

      <MeldungsFenster
        meldungen={meldungen}
        index={offen}
        onIndex={setOffen}
        name={name}
        liveUrl={liveUrl}
        standIso={standIso}
      />
    </div>
  );
}

/**
 * Der Teaser: Schlagzeile und Einordnung, sonst nichts.
 *
 * EIN KNOPF, KEINE KARTE MIT KNOPF DARIN. Eine anklickbare Fläche mit einem
 * zweiten Klickziel darin ist weder bedienbar noch gültiges Markup — dieselbe
 * Regel gilt in der Vertrauens-Leiste im Fuß.
 */
function Teaser({ meldung, onOeffnen }: { meldung: Meldung; onOeffnen: () => void }) {
  return (
    <button type="button" onClick={onOeffnen} style={S.teaser}>
      <span style={S.art}>{einordnung(meldung.art)}</span>
      <span style={S.teaserTitel}>{meldung.titel}</span>
      <span style={S.teaserMehr}>Ansehen</span>
    </button>
  );
}

/**
 * Das Fenster mit der vollständigen Meldung — und den Nachbarn eine Wischbewegung
 * entfernt.
 */
function MeldungsFenster({
  meldungen,
  index,
  onIndex,
  name,
  liveUrl,
  standIso,
}: {
  meldungen: Meldung[];
  index: number | null;
  onIndex: (i: number | null) => void;
  name: string;
  liveUrl: string;
  standIso: string;
}) {
  const blaettern = useCallback(
    (richtung: 1 | -1) => {
      if (index === null) return;
      const nächster = index + richtung;
      if (nächster < 0 || nächster >= meldungen.length) return;
      onIndex(nächster);
    },
    [index, meldungen.length, onIndex],
  );

  // Pfeiltasten blättern, solange das Fenster offen ist. Escape schließt es —
  // das macht der Dialog-Baustein selbst.
  useEffect(() => {
    if (index === null) return;
    const auf = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") blaettern(1);
      if (e.key === "ArrowLeft") blaettern(-1);
    };
    window.addEventListener("keydown", auf);
    return () => window.removeEventListener("keydown", auf);
  }, [index, blaettern]);

  // Wischen auf dem Telefon. Bewusst von Hand statt über die Einrast-Spur des
  // Sliders: Im Fenster steht genau EINE Meldung, und eine Spur mit allen
  // darin würde jede Karte gleichzeitig aufbauen — samt Bildaufnahme-Hülle.
  const [start, setStart] = useState<number | null>(null);

  const m = index === null ? null : meldungen[index];

  return (
    <Modal
      open={index !== null}
      onClose={() => onIndex(null)}
      // Der Kopf trägt den ORT, nicht die Schlagzeile: Die steht als Titel auf
      // der Karte darunter — und im Bild, das man mitnimmt. Zweimal dieselbe
      // Zeile untereinander, und beim Blättern springt die obere mit, während
      // der Rahmen stehen bleibt.
      title={`Aktuelles aus ${name}`}
      ariaLabel={m ? m.titel : `Aktuelles aus ${name}`}
      maxWidth={560}
    >
      {m && (
        <div
          onTouchStart={(e) => setStart(e.touches[0]?.clientX ?? null)}
          onTouchEnd={(e) => {
            if (start === null) return;
            const weg = (e.changedTouches[0]?.clientX ?? start) - start;
            // Schwelle, damit ein Antippen mit zitternder Hand nicht blättert.
            if (Math.abs(weg) > 50) blaettern(weg < 0 ? 1 : -1);
            setStart(null);
          }}
        >
          <MeldungsKarte meldung={m} name={name} liveUrl={liveUrl} standIso={standIso} />

          {meldungen.length > 1 && (
            <div style={S.navZeile}>
              <button
                type="button"
                onClick={() => blaettern(-1)}
                disabled={index === 0}
                aria-label="Vorherige Meldung"
                style={{ ...S.navKnopf, opacity: index === 0 ? 0.35 : 1 }}
              >
                <IconChevronLeft size={16} />
              </button>
              <span style={S.navZaehler}>
                {index! + 1} von {meldungen.length}
              </span>
              <button
                type="button"
                onClick={() => blaettern(1)}
                disabled={index === meldungen.length - 1}
                aria-label="Nächste Meldung"
                style={{ ...S.navKnopf, opacity: index === meldungen.length - 1 ? 0.35 : 1 }}
              >
                <IconChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

function MeldungsKarte({
  meldung,
  name,
  liveUrl,
  standIso,
}: {
  meldung: Meldung;
  name: string;
  liveUrl: string;
  standIso: string;
}) {
  // Die Schlagzeile IST der Titel der Karte — auf der Seite wie im Bild.
  const widget = widgetFuerMeldung(WIDGETS.gemeindeMeldung, name, meldung.titel, liveUrl);

  return (
    <GemeindeWidgetShell
      widget={widget}
      subline={`${name} · ${einordnung(meldung.art)}`}
      filename={`solar-check-${meldung.schluessel}`}
      // Die Quellenkante erwartet ein FERTIG FORMATIERTES Datum, nicht das
      // ISO-Feld: Ihr Rückfall ist das heutige Datum in deutscher Schreibweise,
      // und roh durchgereicht stünde neben allen anderen Karten der Seite ein
      // „2026-08-05".
      dataAsOf={standDeutsch(standIso)}
      // Eigene Seite: Quelle beim Überfahren, keine Markenzeile — die Seite
      // trägt beides. Im heruntergeladenen Bild stehen beide trotzdem.
      onsite
      // Kein zweiter Knopf in den Rechner: Die Seite bietet ihn ohnehin an, und
      // die Karte soll die Nachricht tragen, nicht werben.
      showCta={false}
      // Es gibt (noch) keine Einbett-Route für eine Meldung; der Knopf würde in
      // die Galerie springen statt Code für DIESEN Ort zu liefern.
      showEmbed={false}
    >
      <div style={S.textBox}>
        <p style={S.text}>{meldung.text}</p>
      </div>
    </GemeindeWidgetShell>
  );
}

/** "2026-08-05" → "05.08.2026" — dieselbe Schreibweise, die die Quellenkante
 *  ohne Angabe selbst erzeugt. */
function standDeutsch(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Was die Art der Meldung dem Leser sagt.
 *
 * Nicht der interne Bezeichner: „bewegung" ist eine Kategorie im Code, keine
 * Auskunft. Sie beantwortet die Frage, die vor jeder Nachricht steht — ist das
 * neu, steht das an, oder ist das der Stand der Dinge.
 */
function einordnung(art: Meldung["art"]): string {
  if (art === "bewegung") return "neu in den Daten";
  if (art === "stichtag") return "steht bevor";
  return "Stand der Dinge";
}

const S: Record<string, React.CSSProperties> = {
  wrap: { marginTop: space.xxl },
  h2: { fontSize: v("--font-size-lead"), fontWeight: 700, margin: `0 0 ${space.xs}px` },
  sub: {
    fontSize: v("--font-size-small"),
    color: v("--color-text-secondary"),
    margin: `0 0 ${space.lg}px`,
  },
  teaser: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: space.xs,
    textAlign: "left",
    padding: pad("lg", "lg"),
    background: v("--color-bg"),
    border: `1px solid ${v("--color-border")}`,
    borderRadius: v("--radius-md"),
    cursor: "pointer",
    font: "inherit",
    color: "inherit",
  },
  art: {
    fontSize: v("--font-size-micro"),
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    color: v("--color-text-muted"),
  },
  teaserTitel: {
    fontSize: v("--font-size-body"),
    fontWeight: 700,
    lineHeight: 1.3,
    color: v("--color-text-primary"),
  },
  teaserMehr: {
    marginTop: "auto",
    paddingTop: space.sm,
    fontSize: v("--font-size-small"),
    fontWeight: 600,
    color: v("--color-accent"),
  },
  textBox: { alignSelf: "stretch", width: "100%", height: "100%" },
  text: {
    fontSize: v("--font-size-body"),
    lineHeight: 1.55,
    color: v("--color-text-primary"),
    margin: 0,
  },
  navZeile: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: space.lg,
    marginTop: space.lg,
  },
  navZaehler: { fontSize: v("--font-size-small"), color: v("--color-text-muted") },
  navKnopf: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 32,
    height: 32,
    borderRadius: v("--radius-sm"),
    border: `1px solid ${v("--color-border")}`,
    background: v("--color-bg"),
    color: v("--color-text-primary"),
    cursor: "pointer",
  },
};
