"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
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
// abgestürzt. Die Beschriftung der Kategorie kommt fertig am Beitrag an.
import type { OrtsBeitrag } from "../../lib/orts-posts";
// Die Karte ist DIESELBE wie im Redaktionstisch und im Feed-Bild — nur in der
// quadratischen Stufe und mit den Farben der Seite. Eine hier gezeichnete
// dritte Fassung war die zweite Wahrheit neben den abgenommenen Templates und
// ist deshalb wieder heraus (05.09.2026).
import { SocialKarte } from "../social/SocialKarte";

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
          <Teaser key={b.post.id} beitrag={b} onOeffnen={() => setOffen(i)} />
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
function Teaser({ beitrag, onOeffnen }: { beitrag: OrtsBeitrag; onOeffnen: () => void }) {
  const story = { titel: beitrag.post.bild?.aussage ?? beitrag.post.titel, label: beitrag.label };
  return (
    <button type="button" onClick={onOeffnen} style={S.teaser}>
      <span style={S.art}>{story.label}</span>
      {/* AUCH DER TEASER TRÄGT EIN BILD, nicht nur die Zahl. Eine Reihe aus
          Zahlen und Zeilen liest sich wie ein Inhaltsverzeichnis; was einen
          Blick anhält, ist die Form. Die kleine Stufe der Bildkarte ist genau
          dafür da — sie lässt weg, statt zu schrumpfen. */}
      <span style={S.teaserTitel}>{story.titel}</span>
      {/* KEINE Zeile unter dem Bild: Die Bildkarte trägt Zahl UND Beschriftung
          schon; ein zweites „seit 2000 geflossen" darunter ist dieselbe Angabe
          zweimal. Was der Teaser darüber hinaus braucht, ist nur der Weg
          hinein. */}
      <span style={S.teaserMehr}>Ansehen</span>
    </button>
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
          <StoryKarte beitrag={b} name={name} liveUrl={liveUrl} standIso={standIso} />

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

/** Die Ausgabebreite der Karte. Der Zoom rechnet gegen sie. */
const KARTEN_AUSGABE = 1080;

/**
 * Die Karte in AUSGABEGRÖSSE, per Transformation auf die Rahmenbreite gebracht.
 *
 * NICHT KLEINER GERECHNET: Mit kleinerem Maßstab gerendert bricht der Text an
 * anderen Stellen um als im ausgelieferten Bild — wer eine so gerechnete Karte
 * beurteilt, beurteilt eine, die es nicht gibt. Dieselbe Entscheidung wie in
 * der Template-Galerie.
 *
 * DIE BREITE WIRD GEMESSEN, nicht angenommen. Ein fester Faktor müsste auf die
 * schmalste Breite ausgelegt sein und ließe die Karte auf dem Schreibtisch
 * kleiner als nötig; auf die breiteste ausgelegt läuft sie auf dem Telefon aus
 * dem Fenster. Genau das war beim ersten Anlauf im Browser zu sehen: Die Karte
 * stand in voller Größe im Dialog, links und rechts abgeschnitten.
 */
function KarteImRahmen({ children }: { children: React.ReactNode }) {
  const rahmen = useRef<HTMLDivElement | null>(null);
  // Startwert ist die Breite, die der Dialog auf dem Schreibtisch hergibt.
  // Vor dem ersten Zeichnen misst der Effekt nach; ohne Startwert stünde die
  // Karte für einen Bildaufbau in voller Größe da.
  const [zoom, setZoom] = useState(496 / KARTEN_AUSGABE);

  useLayoutEffect(() => {
    const el = rahmen.current;
    if (!el) return;
    const messen = () => {
      const breite = el.getBoundingClientRect().width;
      if (breite > 0) setZoom(breite / KARTEN_AUSGABE);
    };
    messen();
    // Der Dialog fährt ein und ändert dabei seine Breite; ohne Beobachter
    // bliebe der Zoom auf dem Wert des ersten Bildaufbaus stehen.
    const beobachter = new ResizeObserver(messen);
    beobachter.observe(el);
    return () => beobachter.disconnect();
  }, []);

  return (
    <div ref={rahmen} style={{ width: "100%", aspectRatio: "1", overflow: "hidden" }}>
      <div
        style={{
          width: KARTEN_AUSGABE,
          height: KARTEN_AUSGABE,
          transform: `scale(${zoom})`,
          transformOrigin: "top left",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function StoryKarte({
  beitrag,
  name,
  liveUrl,
  standIso,
}: {
  beitrag: OrtsBeitrag;
  name: string;
  liveUrl: string;
  standIso: string;
}) {
  const bild = beitrag.post.bild;
  // Die Schlagzeile IST der Titel der Karte — auf der Seite wie im Bild.
  const schlagzeile = bild?.aussage ?? beitrag.post.titel;
  const widget = widgetFuerMeldung(WIDGETS.gemeindeMeldung, name, schlagzeile, liveUrl);

  return (
    <GemeindeWidgetShell
      widget={widget}
      subline={`${name} · ${beitrag.label}`}
      // Die Bildkarte trägt Überschrift und Rahmen selbst — sonst stehen drei
      // ineinander (Fenster, Hüllenkarte, Bildkarte).
      nackt
      filename={`solar-check-${beitrag.storyKennung}`}
      // Die Quellenkante erwartet ein FERTIG FORMATIERTES Datum, nicht das
      // ISO-Feld: Ihr Rückfall ist das heutige Datum in deutscher Schreibweise,
      // und roh durchgereicht stünde neben allen anderen Karten der Seite ein
      // „2026-08-05".
      dataAsOf={standDeutsch(standIso)}
      // Woran die Geschichte hängt, gehört ins Bild — dort gibt es keinen
      // Knopf mehr, der es erklären könnte. Der Bild-Fuß nimmt es auf.
      note={beitrag.grundlage}
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
        {/* DIE QUADRATISCHE STUFE MIT DEN FARBEN DER SEITE.
            Beides zusammen ist der Grund, warum diese Karte hier überhaupt
            stehen kann: Die volle Stufe ist auf ein 4:5-Bild für einen fremden
            Feed gerechnet und bringt ihre eigene Palette mit — auf einer Seite
            mit Tageslicht-Theme ein weißer Block auf dunklem Grund. Die kleine
            Stufe wiederum lässt Ring und Säule weg und machte die Formenwahl
            der Geschichte wirkungslos. */}
        {bild && (
          <KarteImRahmen>
            <SocialKarte bild={bild} skala={1} stufe="quadrat" palette="seite" />
          </KarteImRahmen>
        )}

        {/* Der Beitragstext OHNE Schlagzeile und OHNE Quellenzeile: Die
            Schlagzeile steht im Bild darüber, die Quelle an der Kante der
            Karte. Beides ein zweites Mal wäre dieselbe Angabe zweimal. */}
        <p style={S.text}>
          {beitrag.text}{" "}
          <InfoTooltip title="Woran diese Zahl hängt">{beitrag.grundlage}</InfoTooltip>
        </p>
      </div>
    </GemeindeWidgetShell>
  );
}

/**
 * KEINE EIGENE ZEICHNUNG — und seit dem 06.09.2026 auch keine Lücke mehr.
 *
 * Hier stand kurz eine dritte Fassung der Bildformen, mit den Tokens der Seite
 * gezeichnet, nachdem die Beitrags-Karte an ihrer festen Breite und ihrer
 * eigenen Palette gescheitert war. Sie war die zweite Wahrheit neben den
 * abgenommenen Templates, und der Einheiten-Wächter hat sie prompt beim ersten
 * Lauf erwischt.
 *
 * Gelöst ist es dort, wo die Formenlehre wohnt: Die Karte hat eine
 * quadratische Stufe, die die Farben der Seite erbt. Diese Datei benutzt sie
 * nur (siehe `StoryKarte`).
 */

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
  teaserBild: { display: "block", width: "100%" },
  zahlZeile: { display: "flex", alignItems: "baseline", gap: 5, whiteSpace: "nowrap" },
  // Neutral: Eine Größe ist weder positiv noch negativ. Farbe bleibt Tendenzen.
  zahl: { fontWeight: 700, lineHeight: 1.05, color: v("--color-text-primary") },
  zahlEinheit: {
    fontSize: v("--font-size-small"),
    fontWeight: 600,
    color: v("--color-text-secondary"),
  },
  bildLabel: {
    marginTop: 6,
    fontSize: v("--font-size-micro"),
    color: v("--color-text-muted"),
    lineHeight: 1.3,
  },
  leiste: {
    marginTop: 8,
    width: "100%",
    borderRadius: 4,
    background: v("--color-border-muted"),
    overflow: "hidden",
  },
  leisteVoll: { height: "100%", background: v("--color-accent"), borderRadius: 4 },
  saeulen: { marginTop: 8, display: "flex", alignItems: "flex-end", gap: 8 },
  saeulePaar: { flex: 1, height: "100%", display: "flex", alignItems: "flex-end" },
  saeule: { width: "100%", borderRadius: "4px 4px 0 0" },
  teaserZahl: { display: "flex", alignItems: "baseline", gap: 4, whiteSpace: "nowrap" },
  // Farbe trägt hier nichts: Eine Größe ist weder positiv noch negativ. Der
  // Akzent bleibt den Tendenzen vorbehalten (Betreiber, 05.09.2026).
  teaserZahlWert: {
    fontSize: v("--font-size-display-sm"),
    fontWeight: 700,
    lineHeight: 1.1,
    color: v("--color-text-primary"),
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
  // Die skalierte Karte bringt ihre eigene Breite mit; der Rahmen fängt sie
  // ab, damit sie in der Spalte nicht überläuft.
  bildRahmen: { overflow: "hidden", display: "flex", justifyContent: "center" },
  inhalt: { alignSelf: "stretch", width: "100%", display: "flex", flexDirection: "column", gap: space.sm },
  hauptZeile: { display: "flex", alignItems: "baseline", gap: 6, whiteSpace: "nowrap" },
  hauptWert: {
    fontSize: v("--font-size-display-md"),
    fontWeight: 700,
    lineHeight: 1,
    color: v("--color-text-primary"),
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
