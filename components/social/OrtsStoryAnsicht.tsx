"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { v, space, pad } from "../../lib/theme";
import { useChartExport } from "../../lib/useChartExport";
import { IconCopy, IconDownload, IconShare } from "../Icons";
import InfoTooltip from "../InfoTooltip";
import { SocialKarte } from "./SocialKarte";
// NUR DER TYP: Ein Wert-Import aus der Story-Rechnung zöge die Vergütungsreihe,
// die Stundensimulation und ein halbes Dutzend Konfigurationen in das Bündel
// jeder Ortsseite.
import type { OrtsBeitrag } from "../../lib/orts-posts";
import { templateVon } from "../../lib/social-posts";

/**
 * WIE EINE ORTSGESCHICHTE AUF EINER SEITE AUSSIEHT — an EINER Stelle.
 *
 * Zwei Oberflächen zeigen dasselbe: die Gemeindeseite (dort steht die Reihe
 * wirklich) und das Design-Werkzeug der Redaktion (dort wird sie beurteilt).
 * Als der Umschalter „Feed / Auf der Seite" dazukam, wäre die zweite Fassung
 * entstanden — und zwei Wochen später hätte das Werkzeug etwas anderes gezeigt
 * als die Seite, ausgerechnet das Werkzeug, mit dem man die Seite abnimmt.
 *
 * Die Aufteilung folgt dem, was der Nutzer sieht: ein TEASER in der Reihe, und
 * dahinter die KARTE im Fenster.
 */

/** Die Ausgabebreite der Karte. Der Zoom rechnet gegen sie. */
export const KARTEN_AUSGABE = 1080;

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
export function KarteImRahmen({ children }: { children: React.ReactNode }) {
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
    <div ref={rahmen} style={{ width: "100%", aspectRatio: "1", overflow: "hidden", borderRadius: v("--radius-md") }}>
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

/**
 * Der Teaser: Kategorie, Schlagzeile, Weg hinein.
 *
 * EIN KNOPF, KEINE KARTE MIT KNOPF DARIN: Eine anklickbare Fläche mit einem
 * zweiten Klickziel darin ist weder bedienbar noch gültiges Markup.
 */
export function OrtsTeaser({ beitrag, onOeffnen }: { beitrag: OrtsBeitrag; onOeffnen: () => void }) {
  const bild = beitrag.post.bild;
  const schlagzeile = bild?.aussage ?? beitrag.post.titel;
  // NUR WO DAS BILD FERTIG IST. Ein Vorschaubild einer Kombination, die
  // niemand durchgesehen hat, wirbt für ein Design, das noch keins ist —
  // dieselbe Grenze, nach der die Übersicht „gestaltet" von „roh" trennt.
  const fertig = bild ? !!templateVon(bild) : false;
  return (
    <button type="button" onClick={onOeffnen} style={S.teaser}>
      {fertig && bild && (
        <span style={S.thumbRahmen} aria-hidden>
          <ThumbKarte bild={bild} />
        </span>
      )}
      <span style={S.teaserText}>
        <span style={S.art}>{beitrag.label}</span>
        <span style={S.teaserTitel}>{schlagzeile}</span>
        {/* KEINE Zeile unter dem Bild: Die Bildkarte trägt Zahl UND Beschriftung
            schon; ein zweites „seit 2000 geflossen" darunter ist dieselbe Angabe
            zweimal. Was der Teaser darüber hinaus braucht, ist nur der Weg
            hinein. */}
        <span style={S.teaserMehr}>Ansehen</span>
      </span>
    </button>
  );
}

/**
 * Kantenlänge des Vorschaubildchens im Teaser.
 *
 * Gegen die echte Teaser-Breite gerechnet, nicht gegriffen: Die Spur gibt
 * einem Teaser 240 bis 320 Pixel. Bei 88 bleiben nach Bildchen, Abstand und
 * Innenmaß 120 bis 200 Pixel für die Schlagzeile — auf der schmalen Seite
 * zwei bis drei Zeilen, und das ist die Grenze, unter der der Text kippt.
 */
const THUMB = 88;
/**
 * Breite, in der die kleine Kartenstufe gezeichnet und dann auf das Quadrat
 * gebracht wird.
 *
 * GEMESSEN, nicht gegriffen: Bei 240 füllt die Karte nur 46 Prozent der
 * Quadrathöhe — ein Strich in einem leeren Kasten. Bei 120 läuft sie mit 108
 * Prozent über. 140 füllt 80 bis 92 Prozent, je nach Form, und läuft in keiner
 * über (an beiden Teaser-Breiten und beiden Formen nachgemessen).
 */
const THUMB_ENTWURF = 140;

/**
 * Das Vorschaubildchen: die KLEINE Kartenstufe, quadratisch beschnitten.
 *
 * NICHT die quadratische Stufe verkleinert — die trägt die Schriftgrößen der
 * vollen Karte, und von 1080 auf 104 Pixel gebracht wäre jede Zeile darin ein
 * grauer Strich. Die kleine Stufe lässt stattdessen weg: keine Schlagzeile
 * (die steht daneben), keine Quellenzeile (die Seite nennt sie), eine Zahl
 * statt zweier.
 *
 * Das Quadrat entsteht durch BESCHNITT, nicht durch Stauchen: Die kleine Stufe
 * hört auf, wo ihr Inhalt endet, und eine erzwungene Höhe verzöge die
 * Balkenlängen — also genau die Aussage.
 */
function ThumbKarte({ bild }: { bild: NonNullable<OrtsBeitrag["post"]["bild"]> }) {
  return (
    <span
      style={{
        display: "block",
        width: THUMB_ENTWURF,
        // Die Breite ist der Maßstab; die Höhe ergibt sich. Damit das Quadrat
        // die zusammengeschobene Karte umschließt statt sie zu verschieben,
        // wird die Fläche nach der Transformation zurückgerechnet.
        transform: `scale(${THUMB / THUMB_ENTWURF})`,
        transformOrigin: "center",
        flex: "0 0 auto",
      }}
    >
      <SocialKarte bild={bild} stufe="teaser" skala={THUMB_ENTWURF / 1080} palette="seite" />
    </span>
  );
}

/** Die vollständige Geschichte: Bildkarte plus die zwei bis drei Sätze darunter. */
export function OrtsStoryKarte({
  beitrag,
  name,
  liveUrl,
  standIso,
  shareable = true,
}: {
  beitrag: OrtsBeitrag;
  name: string;
  liveUrl: string;
  standIso: string;
  shareable?: boolean;
}) {
  const bild = beitrag.post.bild;
  // Die Schlagzeile IST der Titel der Karte — auf der Seite wie im Bild.
  const schlagzeile = bild?.aussage ?? beitrag.post.titel;
  const storyUrl = `${liveUrl.split("#")[0]}#story-${beitrag.storyKennung}`;
  const [feedback, setFeedback] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const chart = useChartExport({ context: { title: schlagzeile }, filename: `solar-check-${name}-${beitrag.storyKennung}`, mode: "node" });
  async function copyLink() {
    try { await navigator.clipboard.writeText(storyUrl); setFeedback("Link kopiert"); }
    catch { setFeedback("Der Link konnte nicht kopiert werden."); }
  }
  async function shareStory() {
    if (!navigator.share) { setShareOpen(!shareOpen); return; }
    try { await navigator.share({ title: schlagzeile, url: storyUrl }); }
    catch (error) { if (!(error instanceof DOMException && error.name === "AbortError")) setShareOpen(true); }
  }
  const actionStyle = { display: "inline-flex", alignItems: "center", gap: space.sm, padding: pad("sm", "md"), fontSize: v("--font-size-body"), color: v("--color-accent"), border: `1px solid ${v("--color-border")}`, borderRadius: v("--radius-sm"), background: "transparent", cursor: "pointer" };
  const showCopy = beitrag.text.trim().length > 0;
  return <article style={{ width: "100%" }}>
    {bild && <>
      <div ref={chart.chartRef}>
        <KarteImRahmen>
          <SocialKarte bild={bild} skala={1} stufe="quadrat" palette="eigene" branding={false} source={false} dataAsOf={standDeutsch(standIso)} />
        </KarteImRahmen>
        <div data-sc-export-only style={{ display: "none", fontSize: v("--font-size-small"), padding: space.md }}>{bild.quelle}</div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: space.sm }}>
        <button type="button" style={actionStyle} disabled={chart.isExporting} onClick={() => chart.downloadPng().catch(() => setFeedback("Das Bild konnte nicht heruntergeladen werden."))}><IconDownload />Bild herunterladen</button>
      </div>
    </>}
    {showCopy && <p style={S.text}>{beitrag.text}</p>}
    <div style={{ marginBlock: space.lg, display: "flex", alignItems: "center", flexWrap: "wrap", gap: space.md }}>
      <InfoTooltip title="Datengrundlage">{beitrag.grundlage}</InfoTooltip>
      <a href="/energie-widgets#gemeinde-solar" style={{ fontSize: v("--font-size-body"), color: v("--color-accent") }}>Passende Widgets →</a>
    </div>
    <footer style={{ borderTop: `1px solid ${v("--color-border")}`, paddingTop: space.md }}>
      {shareable && <div style={{ display: "flex", flexWrap: "wrap", gap: space.sm }}>
        <button type="button" style={{ ...actionStyle, background: v("--color-accent"), color: v("--color-text-on-accent") }} onClick={shareStory}><IconShare />Teilen</button>
        <button type="button" style={actionStyle} onClick={copyLink}><IconCopy />Link kopieren</button>
      </div>}
      {shareOpen && <div style={{ display: "flex", gap: space.md, marginTop: space.md }}>
        <a href={`https://wa.me/?text=${encodeURIComponent(`${schlagzeile}\n${storyUrl}`)}`} target="_blank" rel="noreferrer">WhatsApp</a>
        <a href={`mailto:?subject=${encodeURIComponent(schlagzeile)}&body=${encodeURIComponent(storyUrl)}`}>E-Mail</a>
      </div>}
      {feedback && <p role="status">{feedback}</p>}
      <p style={{ fontSize: v("--font-size-micro"), color: v("--color-text-muted"), lineHeight: 1.5, marginTop: space.md }}>{bild?.quelle}</p>
    </footer>
  </article>;
}

/** Compact editorial date, independent of the browser timezone. */
export function standDeutsch(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("de-DE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

const S: Record<string, React.CSSProperties> = {
  teaser: {
    flex: 1,
    display: "flex",
    // Bildchen links, Text rechts. Untereinander wäre das Bildchen eine zweite
    // Überschrift über der Überschrift; nebeneinander ist es, was es ist —
    // eine Marke, an der man die Geschichte wiedererkennt.
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.md,
    textAlign: "left",
    padding: pad("lg", "lg"),
    background: v("--color-bg"),
    border: `1px solid ${v("--color-border")}`,
    borderRadius: v("--radius-md"),
    cursor: "pointer",
    font: "inherit",
    color: "inherit",
  },
  teaserText: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: space.xs,
    alignSelf: "stretch",
  },
  thumbRahmen: {
    flex: "0 0 auto",
    // ZENTRIERT, nicht oben angesetzt: Die kleine Kartenstufe hört auf, wo ihr
    // Inhalt endet — im Quadrat gemessen 88 auf 41 Pixel. Oben angeschlagen
    // stünde darunter die halbe Fläche leer, und das sieht nach einem Fehler
    // aus, nicht nach einer Marke.
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: THUMB,
    height: THUMB,
    overflow: "hidden",
    borderRadius: v("--radius-sm"),
    border: `1px solid ${v("--color-border-muted")}`,
    background: v("--color-bg"),
  },
  art: {
    fontSize: v("--font-size-micro"),
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    color: v("--color-text-muted"),
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
  inhalt: { alignSelf: "stretch", width: "100%", display: "flex", flexDirection: "column", gap: space.sm },
  text: {
    fontSize: v("--font-size-body"),
    lineHeight: 1.55,
    color: v("--color-text-primary"),
    margin: `${space.sm}px 0 0`,
  },
};
