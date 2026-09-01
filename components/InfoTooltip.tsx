"use client";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { v } from "../lib/theme";
import { IconHelpCircle } from "./Icons";
// Bewusst aus den schlanken Modulen, NICHT aus lib/chart-export bzw.
// components/WidgetExport: an denen hängen modern-screenshot, CiteModal und
// ChartActionBar. Ein InfoTooltip steht auf der Startseite und in jedem Rechner
// — er darf die Bild-Maschinerie nicht mit ins Bundle ziehen.
import { EXPORT_IGNORE_ATTR } from "../lib/export-markers";
import { nodeToText, useRegisterExportNote } from "./export-notes";

// A small help-icon trigger that shows an explanatory tooltip on hover (desktop)
// or tap (mobile). Unlike the native `title` attribute — which never fires on
// touch and only appears after a ~1s desktop hover — this works everywhere and
// is keyboard- + screen-reader-accessible (real <button> + aria-describedby).
//
// The tooltip renders into a portal on <body> with fixed positioning, so it
// never gets clipped by overflow:hidden ancestors. Positioning/close logic
// mirrors GlossaryTerm, but the content is arbitrary (not glossary-bound).

// Etwas breiter als frueher (280): Inhalte mit zwei Spalten — Name links, Wert
// rechts, etwa die Groessenklassen — brachen darunter jede Zeile um.
const TOOLTIP_MAX_WIDTH = 340;
const GAP = 8; // px between trigger and tooltip
const EDGE = 8; // min px from viewport edge

interface Props {
  /** Optional bold heading shown above the body text. */
  title?: string;
  /** Tooltip body content. */
  children: React.ReactNode;
  /** Icon size in px. */
  size?: number;
  /** Accessible label for the trigger button. */
  ariaLabel?: string;
  /**
   * Carry this text into the exported image (inside an ExportNotesProvider).
   * On by default: a PNG has no hover, so a help text that stays behind the "?"
   * is simply lost. Turn off only for hints that are meaningless in a still
   * image ("click a year to compare").
   */
  exportNote?: boolean;
  /**
   * Text als Ausloeser statt des „?"-Zeichens.
   *
   * WOFUER: Wo der Begriff selbst schon dasteht — ein Klassenname, ein
   * Fachwort — ist ein zusaetzliches Zeichen daneben Laerm, und es braucht
   * einen Abstand, der die Zeile auseinanderzieht. Dann traegt der Begriff die
   * Erklaerung selbst, gepunktet unterstrichen wie ueberall im Projekt.
   *
   * Der Text bleibt im Bild-Export stehen (er ist Inhalt, kein Bedienelement) —
   * anders als das „?", das dort weggelassen wird, weil man es nicht anklicken
   * kann.
   */
  label?: React.ReactNode;
  /**
   * Beliebiges Element als Ausloeser, OHNE die Textdekoration von `label`.
   *
   * WOFUER: Ein Balken, ein Punkt, eine Pille — etwas, das schon aussieht wie
   * es aussehen soll. `label` gibt dem Ausloeser eine gepunktete Unterstreichung
   * und erbt Schrift und Farbe der Umgebung; das ist fuer einen Satz richtig und
   * fuer einen farbigen Balken falsch.
   *
   * Der Grund fuer den dritten Modus statt einer eigenen Kurzinfo im Kalender:
   * Die Positionierung am Rand, das Schliessen per Escape, der Portal-Ausweg aus
   * abgeschnittenen Elternelementen und die Bedienbarkeit per Tastatur stecken
   * hier drin. Eine zweite Kurzinfo daneben haette das alles noch einmal — und
   * beim naechsten Umbau anders.
   */
  trigger?: React.ReactNode;
}

export default function InfoTooltip({
  title,
  children,
  size = 13,
  ariaLabel = "Mehr Infos",
  exportNote = true,
  label,
  trigger,
}: Props) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number; maxHeight: number }>({
    top: 0,
    left: 0,
    width: TOOLTIP_MAX_WIDTH,
    maxHeight: 0,
  });
  const tooltipId = useId();

  useEffect(() => setMounted(true), []);

  // Hand the help text to the image footer. Text (not nodes) so the dependency
  // is stable across renders.
  useRegisterExportNote(title, nodeToText(children), exportNote);

  // Position the tooltip relative to the trigger, clamped to the viewport on all
  // four edges. Runs as a layout effect so the position is set before paint.
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const t = triggerRef.current.getBoundingClientRect();
    // Fall back if the viewport reports 0 — happens for an embed page loaded
    // outside its iframe; inside a real iframe innerWidth is the iframe size.
    const vw = window.innerWidth || document.documentElement.clientWidth || TOOLTIP_MAX_WIDTH + 2 * EDGE;
    const vh = window.innerHeight || document.documentElement.clientHeight || 600;

    // Width: never wider than the viewport (minus edge margins). Constraining
    // the rendered box to the SAME width used for centering keeps the math and
    // the paint in sync, so it never overhangs on narrow phones.
    const width = Math.min(TOOLTIP_MAX_WIDTH, vw - 2 * EDGE);
    const height = tooltipRef.current?.offsetHeight ?? 80;

    // Vertical: prefer above. Flip below only if it doesn't fit above AND there
    // is more room below. Then clamp the top edge and cap the height so a tall
    // tooltip scrolls internally instead of running off-screen.
    const spaceAbove = t.top - GAP - EDGE;
    const spaceBelow = vh - t.bottom - GAP - EDGE;
    const below = height > spaceAbove && spaceBelow > spaceAbove;
    const maxHeight = Math.max(80, below ? spaceBelow : spaceAbove);
    let top = below ? t.bottom + GAP : t.top - GAP - height;
    top = Math.max(EDGE, Math.min(top, vh - EDGE - Math.min(height, maxHeight)));

    // Center horizontally on the trigger, clamp to viewport.
    let left = t.left + t.width / 2 - width / 2;
    left = Math.max(EDGE, Math.min(left, vw - width - EDGE));

    setPos({ top, left, width, maxHeight });
  }, [open]);

  // Close on outside click, scroll, resize, or Escape.
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || tooltipRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        // A "?" you cannot click is noise in a still image — the text it hides
        // is carried into the export footer instead (see useRegisterExportNote).
        {...(label || trigger ? {} : { [EXPORT_IGNORE_ATTR]: "" })}
        aria-label={ariaLabel}
        aria-describedby={open ? tooltipId : undefined}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(e) => {
          e.preventDefault();
          setOpen((o) => !o);
        }}
        style={
          trigger
            ? {
                // Nackt: Der Ausloeser bringt sein Aussehen selbst mit.
                display: "block",
                width: "100%",
                background: "none",
                border: "none",
                padding: 0,
                margin: 0,
                font: "inherit",
                color: "inherit",
                textAlign: "left",
                cursor: "pointer",
              }
            : label
            ? {
                // Text-Ausloeser: erbt Groesse, Gewicht und Farbe der Stelle, an
                // der er steht — der Satz soll ein Satz bleiben.
                background: "none",
                border: "none",
                padding: 0,
                margin: 0,
                font: "inherit",
                color: "inherit",
                textAlign: "left",
                textDecoration: "underline",
                textDecorationStyle: "dotted",
                textUnderlineOffset: 3,
                cursor: "help",
              }
            : {
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                // Mitten im Fliesstext sitzt das Zeichen sonst auf der Grundlinie
                // und haengt unter der Zeile. `middle` stellt es auf Mittelhoehe.
                verticalAlign: "middle",
                background: "none",
                border: "none",
                padding: 0,
                margin: 0,
                color: v("--color-text-muted"),
                cursor: "help",
                lineHeight: 0,
              }
        }
      >
        {trigger ?? label ?? <IconHelpCircle size={size} />}
      </button>
      {mounted &&
        open &&
        createPortal(
          <span
            ref={tooltipRef}
            id={tooltipId}
            role="tooltip"
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              zIndex: 1000,
              maxWidth: pos.width,
              width: "max-content",
              maxHeight: pos.maxHeight || undefined,
              overflowY: "auto",
              background: v("--color-bg"),
              color: v("--color-text-secondary"),
              border: `1px solid ${v("--color-border")}`,
              borderRadius: v("--radius-md"),
              boxShadow: v("--shadow-md"),
              padding: "10px 12px",
              fontFamily: v("--font-text"),
              // 12,5 px gab es in der Skala nicht — der einzige Wert im
              // Baustein, der zwischen zwei Stufen lag. Fließtext zum Lesen
              // gehört auf die Fußnoten-Stufe, nicht auf die Label-Stufe.
              fontSize: v("--font-size-small"),
              lineHeight: 1.5,
              fontWeight: 400,
              textAlign: "left",
              pointerEvents: "auto",
              animation: "fu .15s ease-out",
            }}
          >
            {title && (
              <span style={{ display: "block", fontWeight: 700, color: v("--color-text-primary"), marginBottom: 3 }}>
                {title}
              </span>
            )}
            {children}
          </span>,
          document.body
        )}
    </>
  );
}
