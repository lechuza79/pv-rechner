"use client";
import { useEffect, useState } from "react";
import { v } from "../lib/theme";
import { ModalSticky } from "./Modal";

/**
 * DER Interaktions-Standard für Flow-Schritte (Betreiber-Vorgabe 05.08.2026):
 *
 *   keine Option gewählt → Weiter INAKTIV
 *   Option gewählt       → Option markiert, Weiter wird AKTIV
 *   Klick auf Weiter     → nächster Schritt
 *
 * Ein Klick auf eine Option wählt sie NUR aus — er springt nicht weiter.
 * Kein Schritt startet mit einer Vorauswahl. Position ist Teil der Konvention:
 * Zurück sitzt IMMER links, Weiter IMMER rechts — auch im ersten Schritt ohne
 * Zurück bleibt Weiter rechts (der Platz links bleibt leer).
 *
 * Die Alternative (Klick auf eine Option führt direkt zum nächsten Schritt)
 * ist bewusst als zentraler Schalter angelegt: FLOW_ADVANCE_ON_SELECT auf true
 * stellt ALLE Flows um, die diesen Baustein nutzen — statt dass jede Seite ihr
 * eigenes Verhalten bekommt. Schritte rufen dafür nach dem Setzen der Auswahl
 * flowSelect(next) auf.
 */
/**
 * Wann ein Klick auf eine Option direkt weiterspringt.
 *
 *   "nie"    — Standard: auswählen und Weiter drücken (Betreiber-Vorgabe 05.08.2026)
 *   "immer"  — jeder Klick springt
 *   "mobil"  — nur auf schmalen Bildschirmen (< 768 px, dieselbe Grenze wie das
 *              Burger-Menü im Header)
 *
 * Als Regel statt als Ja/Nein angelegt, damit sich das Verhalten nach einer
 * Messung umlegen lässt, ohne dass irgendein Flow angefasst werden muss: Auf
 * dem Telefon kostet jeder zusätzliche Druck mehr als am Schreibtisch, und ob
 * das den Abbruch senkt oder Fehlauswahlen erhöht, weiß man erst mit Zahlen.
 * Es bleibt EIN Schalter — nie pro Seite entscheiden.
 */
export type FlowAdvanceMode = "nie" | "immer" | "mobil";
export const FLOW_ADVANCE_ON_SELECT: FlowAdvanceMode = "nie";

/** Breite, ab der ein Bildschirm als „schmal" gilt — wie im Header. */
const MOBIL_BIS = 767;

/** Gilt Auto-Weiter im aktuellen Kontext? Wird bei jedem Klick neu gefragt,
 *  damit ein Drehen des Geräts sofort wirkt. */
export function flowAdvanceAktiv(): boolean {
  if (FLOW_ADVANCE_ON_SELECT === "immer") return true;
  if (FLOW_ADVANCE_ON_SELECT === "nie") return false;
  // "mobil": window fehlt beim Rendern auf dem Server — dann nicht springen.
  return typeof window !== "undefined" && window.matchMedia(`(max-width: ${MOBIL_BIS}px)`).matches;
}

/** Nach dem Setzen einer Auswahl aufrufen — springt nur, wenn die Regel es sagt. */
export function flowSelect(next: () => void) {
  if (flowAdvanceAktiv()) next();
}

/**
 * Die eine Schritt-Navigation: Zurück (sekundär) + Weiter (primär, ausgegraut
 * bis eine gültige Auswahl existiert). Nicht pro Seite nachbauen.
 */
export default function FlowNav({
  weiterAktiv,
  onWeiter,
  onZurueck,
  weiterLabel = "Weiter",
  zurueckSichtbar = true,
  inaktivHinweis = "Bitte erst eine Option wählen.",
  nebenWeiter,
  onInaktivKlick,
}: {
  weiterAktiv: boolean;
  onWeiter: () => void;
  onZurueck?: () => void;
  weiterLabel?: string;
  zurueckSichtbar?: boolean;
  /** Tooltip auf dem ausgegrauten Weiter-Button — sagt, was noch fehlt. */
  inaktivHinweis?: string;
  /** Sekundäre Aktion UNTER dem Weiter-Button, rechtsbündig (z. B. ein Überspringen-Link). */
  nebenWeiter?: React.ReactNode;
  /** Klick auf den INAKTIVEN Weiter-Button — die Seite lässt damit ihre
   *  Optionen pulsieren (Aufmerksamkeit dorthin, wo die Auswahl fehlt).
   *  Der Button selbst pulst bewusst nicht: er trägt schon den Tooltip. */
  onInaktivKlick?: () => void;
}) {
  // Eigene Sprechblase statt title-Attribut: der native Tooltip erscheint
  // verzögert, nach Klicks oft gar nicht und auf Touch nie. Sichtbar bei
  // Hover auf dem inaktiven Button und nach einem Klickversuch (kurz).
  const [hintSichtbar, setHintSichtbar] = useState(false);

  // Meldung an den Flow-Läufer: Dieser Schritt reagiert jetzt auf Klicks.
  //
  // WARUM (18.08.2026): Der Läufer klickte in Seiten, deren HTML zwar dastand,
  // deren React-Handler aber noch fehlten — Knopf sichtbar, anklickbar, ohne
  // Wirkung. Sein Fehlerbild („20 s lang kein aria-pressed=true") WANDERTE
  // dabei zwischen den Rechnern, weil es kein Fehler einer Seite ist, sondern
  // ein Wettrennen: mal verliert es der eine Flow, mal der andere.
  //
  // Auf ein Ladeereignis zu warten löst das nicht — `domcontentloaded` steht vor
  // dem JavaScript, und selbst nach `load` lädt Next.js Teile noch nach. Es gibt
  // kein Browser-Ereignis für „React hat übernommen". Also sagt es die Seite
  // selbst: Dieser Effekt läuft frühestens nach dem Mounten, das Attribut ist
  // damit ein Beweis statt einer Schätzung. Ein Effekt für ein Testmerkmal ist
  // ein kleiner Preis gegenüber einem Browser-Test, dem man nicht glauben kann.
  const [bereit, setBereit] = useState(false);
  useEffect(() => setBereit(true), []);

  return (
    // Steht der Flow in einem Dialog, klebt seine Navigation am unteren Rand,
    // statt bei langen Schritten unter die Falz zu rutschen. Der Flow tut dafür
    // nichts — ModalSticky reicht seinen Inhalt außerhalb eines Dialogs
    // unverändert durch, also gilt für die Flows auf einer Seite alles wie
    // bisher.
    <ModalSticky>
    {/* data-flow-nav / data-flow-next: Erkennungsmerkmale für den Flow-Läufer
        (e2e/flows.spec.ts). Er klickt darüber jeden Weg durch jeden Flow, der
        diesen Baustein nutzt — ohne dass der Flow selbst etwas dafür tun muss.
        Ein Flow ohne diesen Baustein wird vom Läufer NICHT geprüft und muss
        deshalb in e2e/flows.ts als ungeprüft ausgewiesen sein. */}
    <div data-flow-nav data-flow-bereit={bereit ? "1" : undefined} style={{ display: "flex", gap: 8, marginTop: 4, width: "100%", justifyContent: "space-between" }}>
      {zurueckSichtbar && onZurueck && (
        <button
          type="button"
          onClick={onZurueck}
          style={{
            padding: "10px 20px",
            borderRadius: v("--radius-md"),
            fontSize: v("--font-size-body"),
            fontWeight: 600,
            background: "transparent",
            border: `1px solid ${v("--color-border-muted")}`,
            color: v("--color-text-secondary"),
            cursor: "pointer",
          }}
        >
          Zurück
        </button>
      )}
      {/* Rechte Gruppe: Weiter (immer ganz rechts), optionale Sekundär-Aktion darunter. */}
      <span style={{ marginLeft: "auto", display: "inline-flex", flexDirection: "column", alignItems: "flex-end", gap: 8, position: "relative" }}>
        {!weiterAktiv && hintSichtbar && (
          <span
            role="tooltip"
            style={{
              position: "absolute",
              bottom: "100%",
              right: 0,
              marginBottom: 8,
              background: v("--color-text-primary"),
              color: v("--color-bg"),
              fontSize: v("--font-size-small"),
              fontWeight: 600,
              lineHeight: 1.4,
              padding: "6px 10px",
              borderRadius: v("--radius-sm"),
              whiteSpace: "nowrap",
              pointerEvents: "none",
              boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
            }}
          >
            {inaktivHinweis}
          </span>
        )}
      {/* Bewusst aria-disabled statt disabled: ein echtes disabled schluckt in
          manchen Browsern den Hover — der Tooltip ("was fehlt noch?") soll aber
          gerade im inaktiven Zustand erscheinen. Der Klick ist trotzdem wirkungslos.

          WER DAS VERHALTEN PRÜFT, LIEST `aria-disabled` — `disabled` bleibt
          absichtlich false. Das hat schon zweimal zu einem Fehlalarm geführt
          („der Weiter-Knopf ist klickbar, tut aber nichts"): Gesperrt ist er
          sichtbar (Deckkraft 0,55, Zeiger not-allowed) und er nennt beim Klick
          den Grund. Nur das DOM-Attribut sagt das eben nicht.
          Der inaktive Zustand dimmt per OPACITY statt mit einer festen Farbe,
          damit er in allen Theme-Stufen (s0–s6) gleichermassen leichter wirkt. */}
      <button
        type="button"
        onClick={() => {
          if (weiterAktiv) { onWeiter(); return; }
          setHintSichtbar(true);
          window.setTimeout(() => setHintSichtbar(false), 2200);
          onInaktivKlick?.();
        }}
        onMouseEnter={() => { if (!weiterAktiv) setHintSichtbar(true); }}
        onMouseLeave={() => setHintSichtbar(false)}
        data-flow-next
        aria-disabled={!weiterAktiv}
        aria-label={weiterAktiv ? undefined : `${weiterLabel} — ${inaktivHinweis}`}
        style={{
          padding: "11px 22px",
          borderRadius: v("--radius-md"),
          fontSize: v("--font-size-body"),
          fontWeight: 700,
          background: weiterAktiv ? v("--color-accent") : v("--color-bg-muted"),
          color: weiterAktiv ? v("--color-text-on-accent") : v("--color-text-muted"),
          border: weiterAktiv ? "none" : `1px solid ${v("--color-border")}`,
          cursor: weiterAktiv ? "pointer" : "not-allowed",
          opacity: weiterAktiv ? 1 : 0.55,
        }}
      >
        {weiterLabel}
      </button>
      {nebenWeiter}
      </span>
    </div>
    </ModalSticky>
  );
}
