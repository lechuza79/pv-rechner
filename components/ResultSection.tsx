"use client";
// Aufklappbarer Ergebnis-Abschnitt — der geteilte Baustein für alles, was im
// Ergebnis eines Rechners einstellbar ist, aber nicht in die Summary-Card oben
// gehört.
//
// Warum es diesen Baustein gibt: Die Summary-Card trägt das Ergebnis und die
// wenigen Kernzahlen. Alles, was mehr als eine Zahl ist — eine Rechtslage, ein
// Preispfad, eine Aufschlüsselung —, drängte sich trotzdem dort hinein oder
// stand als eigene Karte irgendwo darunter, in jedem Rechner anders. Zugeklappt
// zeigt dieser Abschnitt deshalb IMMER seinen gewählten Zustand in einer Zeile
// (`summary`): Ein eingeklappter Block, dem man nicht ansieht, wonach gerade
// gerechnet wird, versteckt eine Annahme — und das ist schlimmer als eine
// überladene Karte.
//
// Bedienung: Kopfzeile ist der Schalter (Button, `aria-expanded`), der Inhalt
// bekommt eine `region` mit Bezug auf die Kopfzeile. Die Einblende-Bewegung
// kommt aus `.sc-acc` (lib/theme.ts) und schaltet sich bei
// `prefers-reduced-motion` selbst ab.
import { ReactNode, useId, useState } from "react";
import { v, iconSizes, space, pad } from "../lib/theme";
import { IconChevronDown } from "./Icons";
import Switch from "./Switch";

export interface ResultSectionProps {
  /** Überschrift des Abschnitts — benennt das Thema, nicht die Aktion. */
  title: string;
  /**
   * Der gewählte Zustand in einer Zeile, immer sichtbar (auch zugeklappt).
   * Kein „Details" o. Ä. — hier steht, wonach gerade gerechnet wird.
   */
  summary: ReactNode;
  /** Offen starten? Default: zu. */
  defaultOpen?: boolean;
  /** Wird beim Auf-/Zuklappen gerufen (z. B. für ein Analytics-Event). */
  onToggle?: (open: boolean) => void;
  /**
   * Schalter in der Kopfzeile: rechnet dieser Posten mit oder nicht?
   * Gesetzt → der Abschnitt trägt einen Ein/Aus-Schalter, mit dem sich die
   * Wirkung auf die Wirtschaftlichkeit sofort ablesen lässt. Die EINGABEN
   * bleiben dabei erhalten — Ausschalten ist eine Was-wäre-wenn-Frage, kein
   * Zurücksetzen. Ohne diesen Prop bleibt der Abschnitt ein reiner Aufklapper
   * (z. B. Dach: das lässt sich nicht „abschalten").
   */
  aktiv?: boolean;
  setAktiv?: (an: boolean) => void;
  /** Beschriftung des Schalters für Screenreader („Wärmepumpe mitrechnen"). */
  aktivLabel?: string;
  children: ReactNode;
}

export default function ResultSection({
  title, summary, defaultOpen = false, onToggle, aktiv, setAktiv, aktivLabel, children,
}: ResultSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  const headId = useId();
  const schaltbar = aktiv !== undefined && setAktiv !== undefined;
  // Ein ausgeschalteter Posten hat keine Details zu zeigen, die etwas bewirken —
  // aufgeklappt zu bleiben würde Einstellbarkeit vortäuschen, die gerade nichts
  // ändert. Die Werte bleiben erhalten, nur die Ansicht klappt zu.
  const inhaltSichtbar = open && (!schaltbar || aktiv);

  return (
    <div style={{
      background: v("--color-bg"),
      borderRadius: v("--radius-md"),
      border: `1px solid ${v("--color-border")}`,
      marginBottom: space.xl,
      overflow: "hidden",
    }}>
      {/* Kopfzeile: der Schalter sitzt NEBEN dem Aufklapper, nicht darin — sonst
          wäre „mitrechnen an/aus" nicht ohne Aufklappen erreichbar, und ein
          Klick auf die Zeile hätte zwei Bedeutungen. */}
      <div style={{ display: "flex", alignItems: "center", padding: pad("lg", "xl"), gap: space.md }}>
        {schaltbar && (
          <Switch
            an={!!aktiv}
            onChange={setAktiv!}
            label={aktivLabel ?? `${title} mitrechnen`}
          />
        )}
        <button
          id={headId}
          onClick={() => { const next = !open; setOpen(next); onToggle?.(next); }}
          /* An `inhaltSichtbar`, nicht an `open`: Ein ausgeschalteter Abschnitt
             zeigt seinen Inhalt nicht, auch wenn er vorher aufgeklappt war.
             Hing die Angabe an `open`, meldete die Kopfzeile weiter „erweitert"
             und `aria-controls` zeigte auf eine ID, die es im DOM nicht gab. */
          aria-expanded={inhaltSichtbar}
          aria-controls={inhaltSichtbar ? panelId : undefined}
          style={{
            display: "flex", alignItems: "center", gap: space.md, flex: 1, minWidth: 0,
            padding: 0, background: "transparent", border: "none", cursor: "pointer", textAlign: "left",
          }}
        >
          <span style={{
            fontSize: v("--font-size-small"), fontWeight: 700, flexShrink: 0,
            color: schaltbar && !aktiv ? v("--color-text-muted") : v("--color-text-primary"),
          }}>
            {title}
          </span>
          <span style={{
            marginLeft: "auto", fontSize: v("--font-size-small"), color: v("--color-text-muted"),
            textAlign: "right", lineHeight: 1.4, minWidth: 0,
          }}>
            {/* Ausgeschaltet steht dort, DASS nicht gerechnet wird — nicht der
                gespeicherte Zustand. Sonst liest sich der Block, als zähle er
                mit. Die Werte selbst sind nicht weg, sie ruhen nur. */}
            {schaltbar && !aktiv ? "rechnet nicht mit" : summary}
          </span>
          <IconChevronDown
            size={iconSizes.md}
            color={v("--color-text-muted")}
            style={{ flexShrink: 0, transition: "transform .2s ease", transform: open ? "rotate(180deg)" : "none" }}
          />
        </button>
      </div>

      {inhaltSichtbar && (
        <div
          id={panelId}
          role="region"
          aria-labelledby={headId}
          className="sc-acc"
          style={{
            padding: pad("lg", "xl"),
            borderTop: `1px dashed ${v("--color-border")}`,
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
