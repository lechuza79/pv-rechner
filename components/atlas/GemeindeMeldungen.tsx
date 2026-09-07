"use client";

import { useCallback, useEffect, useState } from "react";
import { v, space } from "../../lib/theme";
import StorySlider from "../StorySlider";
import Modal from "../Modal";
import { IconChevronLeft, IconChevronRight } from "../Icons";
// NUR TYPEN von hier — sie werden beim Übersetzen entfernt. Ein einziger
// Laufzeit-Import aus der Story-Rechnung zöge die Vergütungsreihe, die
// Stundensimulation und ein halbes Dutzend Konfigurationen in das Browser-
// Bündel jeder Ortsseite; genau daran ist diese Komponente beim ersten Versuch
// abgestürzt. Die Beschriftung der Kategorie kommt fertig am Beitrag an.
import type { OrtsBeitrag } from "../../lib/orts-posts";
// Teaser und Karte liegen bei den Redaktions-Bauteilen, weil das
// Design-Werkzeug dieselbe Ansicht zeigt — dort wird sie ja abgenommen. Eine
// zweite Fassung hätte binnen Wochen etwas anderes gezeigt als diese Seite.
import { OrtsTeaser, OrtsStoryKarte } from "../social/OrtsStoryAnsicht";

/**
 * Die Geschichten über diesen Ort — als Teaser-Reihe, aus der sich jede im
 * Fenster öffnen und weitergeben lässt.
 *
 * WAS AUF DER SEITE SCHON STEHT, GEHÖRT NICHT HIERHER. Die erste Fassung
 * speiste sich aus der Ortsmeldungs-Rechnung, die für die Abo-Mail gebaut ist —
 * und stand damit als „124 Anlagen kamen 2025 dazu" direkt über der Kachel „Neu
 * 2025: 124". Drei von fünf Meldungen waren wörtlich das, was zwei Zentimeter
 * tiefer schon stand. Der Feed kommt deshalb aus den festen Familien des
 * Story-Katalogs (lib/orts-stories.ts): Geld, das geflossen ist, ein Stichtag,
 * eine Wirkungsbilanz — Befunde, die die Seite sonst nirgends zeigt.
 *
 * JEDE GESCHICHTE IST EIN BEITRAG DES REDAKTIONSSYSTEMS (06.09.2026). Was hier
 * steht, ist dieselbe Karte, die im Redaktionstisch bearbeitet und als Bild
 * veröffentlicht wird — in der quadratischen Stufe und mit den Farben der
 * Seite. Damit gelten hier die abgenommenen Templates, die Formenlehre und die
 * Quellenpflicht ohne eine einzige eigene Zeile Zeichnung.
 */
export default function GemeindeMeldungen({
  beitraege,
  name,
  liveUrl,
  standIso,
}: {
  /** Fertig gerechnet, stärkste zuerst. Leer ist ein zulässiges Ergebnis. */
  beitraege: OrtsBeitrag[];
  name: string;
  /** Kanonische Adresse dieser Ortsseite. Wandert ins Teilen-Ziel jeder Karte. */
  liveUrl: string;
  /** Datenstand des Anlagenregisters. Steht an jeder Karte, auch im Bild. */
  standIso: string;
}) {
  // `null` heißt zu. Der Index bleibt beim Schließen NICHT stehen: Wer die
  // Reihe erneut öffnet, öffnet die Geschichte, die er angetippt hat.
  const [offen, setOffen] = useState<number | null>(null);

  if (beitraege.length === 0) return null;

  return (
    <div style={S.wrap}>
      <h2 style={S.h2}>Aktuelles aus {name}</h2>
      <p style={S.sub}>Aus den Anlagendaten gerechnet — zum Ansehen und Weitergeben.</p>

      <StorySlider ariaLabel={`Geschichten über ${name}`}>
        {beitraege.map((b, i) => (
          <OrtsTeaser key={b.post.id} beitrag={b} onOeffnen={() => setOffen(i)} />
        ))}
      </StorySlider>

      <StoryFenster
        beitraege={beitraege}
        index={offen}
        onIndex={setOffen}
        name={name}
        liveUrl={liveUrl}
        standIso={standIso}
      />
    </div>
  );
}

/** Das Fenster mit der vollständigen Geschichte — die Nachbarn eine Wischbewegung entfernt. */
function StoryFenster({
  beitraege,
  index,
  onIndex,
  name,
  liveUrl,
  standIso,
}: {
  beitraege: OrtsBeitrag[];
  index: number | null;
  onIndex: (i: number | null) => void;
  name: string;
  liveUrl: string;
  standIso: string;
}) {
  const blaettern = useCallback(
    (richtung: 1 | -1) => {
      if (index === null) return;
      const ziel = index + richtung;
      if (ziel < 0 || ziel >= beitraege.length) return;
      onIndex(ziel);
    },
    [index, beitraege.length, onIndex],
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

  // Wischen auf dem Telefon. Bewusst von Hand statt über die Spur des Sliders:
  // Im Fenster steht genau EINE Geschichte, und eine Spur mit allen darin würde
  // jede Karte gleichzeitig aufbauen — samt Bildaufnahme-Hülle.
  const [start, setStart] = useState<number | null>(null);

  const b = index === null ? null : beitraege[index];

  return (
    <Modal
      open={index !== null}
      onClose={() => onIndex(null)}
      // Der Kopf trägt den ORT, nicht die Schlagzeile: Die steht als Titel auf
      // der Karte darunter — und im Bild, das man mitnimmt. Zweimal dieselbe
      // Zeile untereinander, und beim Blättern springt die obere mit, während
      // der Rahmen stehen bleibt.
      title={`Aktuelles aus ${name}`}
      ariaLabel={b ? b.post.bild?.aussage ?? b.post.titel : `Aktuelles aus ${name}`}
      maxWidth={560}
    >
      {b && (
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
          <OrtsStoryKarte beitrag={b} name={name} liveUrl={liveUrl} standIso={standIso} />

          {beitraege.length > 1 && (
            <div style={S.navZeile}>
              <button
                type="button"
                onClick={() => blaettern(-1)}
                disabled={index === 0}
                aria-label="Vorherige Geschichte"
                style={{ ...S.navKnopf, opacity: index === 0 ? 0.35 : 1 }}
              >
                <IconChevronLeft size={16} />
              </button>
              <span style={S.navZaehler}>
                {index! + 1} von {beitraege.length}
              </span>
              <button
                type="button"
                onClick={() => blaettern(1)}
                disabled={index === beitraege.length - 1}
                aria-label="Nächste Geschichte"
                style={{ ...S.navKnopf, opacity: index === beitraege.length - 1 ? 0.35 : 1 }}
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

const S: Record<string, React.CSSProperties> = {
  wrap: { marginTop: space.xxl },
  h2: { fontSize: v("--font-size-lead"), fontWeight: 700, margin: `0 0 ${space.xs}px` },
  sub: {
    fontSize: v("--font-size-small"),
    color: v("--color-text-secondary"),
    margin: `0 0 ${space.lg}px`,
  },

  // ── Blättern im Fenster ───────────────────────────────────────────────────
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
