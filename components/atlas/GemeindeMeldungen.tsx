"use client";

import { useCallback, useEffect, useState } from "react";
import { v, space, pad } from "../../lib/theme";
import GemeindeWidgetShell from "./GemeindeWidgetShell";
import StorySlider from "../StorySlider";
import Modal from "../Modal";
import InfoTooltip from "../InfoTooltip";
import { IconChevronLeft, IconChevronRight } from "../Icons";
import { WIDGETS, widgetFuerMeldung } from "../../lib/widget-registry";
// NUR TYPEN von hier — sie werden beim Übersetzen entfernt. Ein einziger
// Laufzeit-Import aus der Story-Rechnung zöge die Vergütungsreihe, die
// Stundensimulation und ein halbes Dutzend Konfigurationen in das Browser-
// Bündel jeder Ortsseite; genau daran ist diese Komponente beim ersten Versuch
// abgestürzt. Die Beschriftung der Kategorie kommt fertig an der Geschichte an.
import type { OrtsStory, StoryWert } from "../../lib/orts-stories";

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
 * JEDE GESCHICHTE TRÄGT IHRE ZAHLEN ALS DATEN. Deshalb zeichnet die Karte ihre
 * Hauptzahl groß und die übrigen klein daneben, statt einen Absatz zu setzen —
 * und genau das überlebt als Bild, wenn jemand es weitergibt.
 */
export default function GemeindeMeldungen({
  stories,
  name,
  liveUrl,
  standIso,
}: {
  /** Fertig gerechnet, stärkste zuerst. Leer ist ein zulässiges Ergebnis. */
  stories: OrtsStory[];
  name: string;
  /** Kanonische Adresse dieser Ortsseite. Wandert ins Teilen-Ziel jeder Karte. */
  liveUrl: string;
  /** Datenstand des Anlagenregisters. Steht an jeder Karte, auch im Bild. */
  standIso: string;
}) {
  // `null` heißt zu. Der Index bleibt beim Schließen NICHT stehen: Wer die
  // Reihe erneut öffnet, öffnet die Geschichte, die er angetippt hat.
  const [offen, setOffen] = useState<number | null>(null);

  if (stories.length === 0) return null;

  return (
    <div style={S.wrap}>
      <h2 style={S.h2}>Aktuelles aus {name}</h2>
      <p style={S.sub}>Aus den Anlagendaten gerechnet — zum Ansehen und Weitergeben.</p>

      <StorySlider ariaLabel={`Geschichten über ${name}`}>
        {stories.map((s, i) => (
          <Teaser key={s.kennung} story={s} onOeffnen={() => setOffen(i)} />
        ))}
      </StorySlider>

      <StoryFenster
        stories={stories}
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
 * Der Teaser: Kategorie, Hauptzahl und Schlagzeile.
 *
 * DIE ZAHL STEHT IM TEASER, nicht erst im Fenster — sie ist das, was einen
 * Blick anhält. Eine Teaser-Reihe aus reinen Überschriften liest sich wie ein
 * Inhaltsverzeichnis.
 *
 * EIN KNOPF, KEINE KARTE MIT KNOPF DARIN: Eine anklickbare Fläche mit einem
 * zweiten Klickziel darin ist weder bedienbar noch gültiges Markup.
 */
function Teaser({ story, onOeffnen }: { story: OrtsStory; onOeffnen: () => void }) {
  const haupt = hauptwert(story);
  return (
    <button type="button" onClick={onOeffnen} style={S.teaser}>
      <span style={S.art}>{story.kategorieLabel}</span>
      {haupt && (
        <span style={S.teaserZahl}>
          <span style={S.teaserZahlWert}>{fmtWert(haupt)}</span>
          {haupt.einheit && <span style={S.teaserZahlEinheit}>{haupt.einheit}</span>}
        </span>
      )}
      {/* NICHT die Schlagzeile: Die beginnt mit derselben Zahl, die eine Zeile
          höher schon groß steht — im Teaser stünde sie damit zweimal. Was der
          Wert BEDEUTET, sagt sein Name; die Schlagzeile trägt die Karte im
          Fenster und das Bild, wo sie allein stehen muss. */}
      {haupt && <span style={S.teaserTitel}>{haupt.name}</span>}
      <span style={S.teaserMehr}>Ansehen</span>
    </button>
  );
}

/** Das Fenster mit der vollständigen Geschichte — die Nachbarn eine Wischbewegung entfernt. */
function StoryFenster({
  stories,
  index,
  onIndex,
  name,
  liveUrl,
  standIso,
}: {
  stories: OrtsStory[];
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
      if (ziel < 0 || ziel >= stories.length) return;
      onIndex(ziel);
    },
    [index, stories.length, onIndex],
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

  const s = index === null ? null : stories[index];

  return (
    <Modal
      open={index !== null}
      onClose={() => onIndex(null)}
      // Der Kopf trägt den ORT, nicht die Schlagzeile: Die steht als Titel auf
      // der Karte darunter — und im Bild, das man mitnimmt. Zweimal dieselbe
      // Zeile untereinander, und beim Blättern springt die obere mit, während
      // der Rahmen stehen bleibt.
      title={`Aktuelles aus ${name}`}
      ariaLabel={s ? s.titel : `Aktuelles aus ${name}`}
      maxWidth={560}
    >
      {s && (
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
          <StoryKarte story={s} name={name} liveUrl={liveUrl} standIso={standIso} />

          {stories.length > 1 && (
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
                {index! + 1} von {stories.length}
              </span>
              <button
                type="button"
                onClick={() => blaettern(1)}
                disabled={index === stories.length - 1}
                aria-label="Nächste Geschichte"
                style={{ ...S.navKnopf, opacity: index === stories.length - 1 ? 0.35 : 1 }}
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

function StoryKarte({
  story,
  name,
  liveUrl,
  standIso,
}: {
  story: OrtsStory;
  name: string;
  liveUrl: string;
  standIso: string;
}) {
  // Die Schlagzeile IST der Titel der Karte — auf der Seite wie im Bild.
  const widget = widgetFuerMeldung(WIDGETS.gemeindeMeldung, name, story.titel, liveUrl);
  const haupt = hauptwert(story);
  const neben = story.werte.filter((w) => !w.haupt);

  return (
    <GemeindeWidgetShell
      widget={widget}
      subline={`${name} · ${story.kategorieLabel}`}
      filename={`solar-check-${story.kennung}`}
      // Die Quellenkante erwartet ein FERTIG FORMATIERTES Datum, nicht das
      // ISO-Feld: Ihr Rückfall ist das heutige Datum in deutscher Schreibweise,
      // und roh durchgereicht stünde neben allen anderen Karten der Seite ein
      // „2026-08-05".
      dataAsOf={standDeutsch(standIso)}
      // Woran die Geschichte hängt, gehört ins Bild — dort gibt es keinen
      // Knopf mehr, der es erklären könnte. Der Bild-Fuß nimmt es auf.
      note={story.grundlage}
      // Eigene Seite: Quelle beim Überfahren, keine Markenzeile — die Seite
      // trägt beides. Im heruntergeladenen Bild stehen beide trotzdem.
      onsite
      // Kein zweiter Knopf in den Rechner: Die Seite bietet ihn ohnehin an, und
      // die Karte soll die Geschichte tragen, nicht werben.
      showCta={false}
      // Es gibt (noch) keine Einbett-Route für eine Geschichte; der Knopf würde
      // in die Galerie springen statt Code für DIESEN Ort zu liefern.
      showEmbed={false}
    >
      <div style={S.inhalt}>
        {haupt && (
          <div style={S.hauptZeile}>
            {/* Zahl und Einheit getrennt und in EINER Zeile gehalten: In einer
                schmalen Karte bricht „14,2 Mio €" sonst zwischen beiden um, und
                die Einheit steht allein in der zweiten Zeile so groß wie der
                Wert. */}
            <span style={S.hauptWert}>{fmtWert(haupt)}</span>
            {haupt.einheit && <span style={S.hauptEinheit}>{haupt.einheit}</span>}
          </div>
        )}
        {haupt && <div style={S.hauptName}>{haupt.name}</div>}

        <p style={S.text}>
          {story.text}{" "}
          <InfoTooltip title="Woran diese Zahl hängt">{story.grundlage}</InfoTooltip>
        </p>

        {neben.length > 0 && (
          <div style={S.nebenReihe}>
            {neben.map((w) => (
              <div key={w.name} style={S.neben}>
                <div style={S.nebenWert}>
                  <span>{fmtWert(w)}</span>
                  {w.einheit && <span style={S.nebenEinheit}>{w.einheit}</span>}
                </div>
                {/* Platz für zwei Zeilen: Bricht eine Beschriftung um und die
                    daneben nicht, stünde deren Zahl eine Zeile tiefer als die
                    Nachbarwerte, und die Reihe liest sich nicht mehr als
                    Raster. */}
                <div style={S.nebenName}>{w.name}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </GemeindeWidgetShell>
  );
}

/** Die tragende Zahl, falls es eine gibt. */
function hauptwert(s: OrtsStory): StoryWert | undefined {
  return s.werte.find((w) => w.haupt) ?? s.werte[0];
}

/**
 * Eine Zahl in deutscher Schreibweise, mit so vielen Nachkommastellen wie sie
 * wirklich trägt.
 *
 * Nicht über eine feste Stellenzahl: „14,2 Mio €" braucht eine, „1.240 Anlagen"
 * keine — und eine erzwungene Null hinter dem Komma behauptet eine Genauigkeit,
 * die eine gerundete Anlagenzahl nicht hat.
 */
function fmtWert(w: StoryWert): string {
  const stellen = Number.isInteger(w.wert) ? 0 : 1;
  return w.wert.toLocaleString("de-DE", {
    minimumFractionDigits: stellen,
    maximumFractionDigits: stellen,
  });
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

const S: Record<string, React.CSSProperties> = {
  wrap: { marginTop: space.xxl },
  h2: { fontSize: v("--font-size-lead"), fontWeight: 700, margin: `0 0 ${space.xs}px` },
  sub: {
    fontSize: v("--font-size-small"),
    color: v("--color-text-secondary"),
    margin: `0 0 ${space.lg}px`,
  },

  // ── Teaser ────────────────────────────────────────────────────────────────
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
  teaserZahl: { display: "flex", alignItems: "baseline", gap: 4, whiteSpace: "nowrap" },
  teaserZahlWert: {
    fontSize: v("--font-size-display-sm"),
    fontWeight: 700,
    lineHeight: 1.1,
    color: v("--color-accent"),
  },
  teaserZahlEinheit: {
    fontSize: v("--font-size-small"),
    fontWeight: 600,
    color: v("--color-text-secondary"),
  },
  teaserTitel: {
    fontSize: v("--font-size-small"),
    lineHeight: 1.35,
    color: v("--color-text-primary"),
  },
  teaserMehr: {
    marginTop: "auto",
    paddingTop: space.sm,
    fontSize: v("--font-size-small"),
    fontWeight: 600,
    color: v("--color-accent"),
  },

  // ── Karte im Fenster ──────────────────────────────────────────────────────
  inhalt: { alignSelf: "stretch", width: "100%", display: "flex", flexDirection: "column", gap: space.sm },
  hauptZeile: { display: "flex", alignItems: "baseline", gap: 6, whiteSpace: "nowrap" },
  hauptWert: {
    fontSize: v("--font-size-display-md"),
    fontWeight: 700,
    lineHeight: 1,
    color: v("--color-accent"),
  },
  hauptEinheit: {
    fontSize: v("--font-size-body"),
    fontWeight: 600,
    color: v("--color-text-secondary"),
  },
  hauptName: { fontSize: v("--font-size-small"), color: v("--color-text-muted") },
  text: {
    fontSize: v("--font-size-small"),
    lineHeight: 1.55,
    color: v("--color-text-primary"),
    margin: `${space.sm}px 0 0`,
  },
  nebenReihe: {
    display: "flex",
    flexWrap: "wrap",
    gap: space.lg,
    marginTop: space.sm,
    paddingTop: space.md,
    borderTop: `1px solid ${v("--color-border-muted")}`,
  },
  neben: { minWidth: 92 },
  nebenWert: {
    display: "flex",
    alignItems: "baseline",
    gap: 3,
    whiteSpace: "nowrap",
    fontSize: v("--font-size-lead"),
    fontWeight: 700,
    color: v("--color-text-primary"),
  },
  nebenEinheit: {
    fontSize: v("--font-size-micro"),
    fontWeight: 600,
    color: v("--color-text-secondary"),
  },
  nebenName: {
    fontSize: v("--font-size-micro"),
    color: v("--color-text-muted"),
    lineHeight: 1.3,
    minHeight: "2.6em",
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
