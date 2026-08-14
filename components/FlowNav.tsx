"use client";
import { useState } from "react";
import { v } from "../lib/theme";

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
export const FLOW_ADVANCE_ON_SELECT = false;

/** Nach dem Setzen einer Auswahl aufrufen — springt nur in der
 *  Auto-Advance-Variante weiter. */
export function flowSelect(next: () => void) {
  if (FLOW_ADVANCE_ON_SELECT) next();
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
  return (
    <div style={{ display: "flex", gap: 8, marginTop: 4, width: "100%", justifyContent: "space-between" }}>
      {zurueckSichtbar && onZurueck && (
        <button
          type="button"
          onClick={onZurueck}
          style={{
            padding: "10px 20px",
            borderRadius: v("--radius-md"),
            fontSize: 14,
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
              fontSize: 12,
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
        aria-disabled={!weiterAktiv}
        aria-label={weiterAktiv ? undefined : `${weiterLabel} — ${inaktivHinweis}`}
        style={{
          padding: "11px 22px",
          borderRadius: v("--radius-md"),
          fontSize: 14,
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
  );
}
