"use client";

import { createContext, useCallback, useContext, useEffect, useId, useMemo, useState } from "react";
import { EXPORT_CSS_ATTR, EXPORT_IGNORE_ATTR, EXPORT_ONLY_ATTR } from "../lib/chart-export";
import { DataSourceNote, PoweredBy } from "./PoweredBy";
import type { DataSource } from "../lib/data-sources";
import { v } from "../lib/theme";

// Export layer for widgets: everything the website explains INTERACTIVELY has to
// be spelled out in the downloaded/shared image, because a PNG has no hover, no
// tap and no "?" button.
//
// Three rules, one mechanism (the DOM markers consumed by captureNodeToBlob):
//  1. Interactive triggers (switchers, CTAs, "?" buttons) → <ExportIgnore>.
//  2. Everything the image needs but the page doesn't (scale numbers, legend,
//     the help texts behind "?", source, brand) → <ExportOnly>.
//  3. Help texts register THEMSELVES: an <InfoTooltip> inside an
//     <ExportNotesProvider> adds its text to the image footer automatically.
//     Nobody has to remember to copy a tooltip into the export — that was the
//     failure mode this layer exists to prevent.

// ─── 1. Markers ──────────────────────────────────────────────────────────────

/** Hidden on the page, revealed in the exported image. `display` is what the
 * element gets in the image ("block", "flex" — "inline" inside an <svg>). */
export function ExportOnly({
  children,
  display = "block",
  style,
}: {
  children: React.ReactNode;
  display?: string;
  style?: React.CSSProperties;
}) {
  const props = { [EXPORT_ONLY_ATTR]: display, style: { display: "none", ...style } };
  return <div {...props}>{children}</div>;
}

/**
 * Frames its children in the exported image only — a light grey outline with
 * rounded corners around the chart area. On the page the widget card already
 * provides that frame; a second one inside it would just be noise.
 */
export function ExportBox({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  const css = `border:1px solid ${v("--color-border")};border-radius:${v("--radius-md")};padding:10px 10px 6px;`;
  const props = { [EXPORT_CSS_ATTR]: css };
  return (
    <div {...props} style={style}>
      {children}
    </div>
  );
}

/** SVG variant of {@link ExportOnly} — a <g> instead of a <div>, so scale
 * labels and grid annotations can live inside the chart's own coordinates. */
export function ExportOnlyG({ children }: { children: React.ReactNode }) {
  const props = { [EXPORT_ONLY_ATTR]: "inline", style: { display: "none" } };
  return <g {...props}>{children}</g>;
}

/** Visible on the page, dropped from the exported image (anything clickable). */
export function ExportIgnore({
  children,
  style,
  inline = true,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  inline?: boolean;
}) {
  const props = { [EXPORT_IGNORE_ATTR]: "" };
  return (
    <div {...props} style={{ display: inline ? "inline-flex" : "block", ...style }}>
      {children}
    </div>
  );
}

// ─── 2. Self-registering help texts ──────────────────────────────────────────

export interface ExportNote {
  id: string;
  title?: string;
  text: string;
}

type RegisterFn = (note: ExportNote) => () => void;

const ExportNotesCtx = createContext<RegisterFn | null>(null);
const ExportNotesReadCtx = createContext<ExportNote[]>([]);

/**
 * Collects the help texts rendered inside it. Wrap a widget card in this and
 * every InfoTooltip below reports its content, in mount order, to
 * {@link WidgetExportFooter}.
 */
export function ExportNotesProvider({ children }: { children: React.ReactNode }) {
  const [notes, setNotes] = useState<ExportNote[]>([]);

  const register = useCallback<RegisterFn>((note) => {
    setNotes((prev) => (prev.some((n) => n.id === note.id) ? prev : [...prev, note]));
    return () => setNotes((prev) => prev.filter((n) => n.id !== note.id));
  }, []);

  // Same text shown twice (a tooltip rendered in both the wide and the narrow
  // layout) is one note in the image.
  const deduped = useMemo(() => {
    const seen = new Set<string>();
    return notes.filter((n) => {
      const key = `${n.title ?? ""}|${n.text}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [notes]);

  return (
    <ExportNotesCtx.Provider value={register}>
      <ExportNotesReadCtx.Provider value={deduped}>{children}</ExportNotesReadCtx.Provider>
    </ExportNotesCtx.Provider>
  );
}

export function useExportNotes(): ExportNote[] {
  return useContext(ExportNotesReadCtx);
}

/** Registers one help text for the image footer. No-op outside a provider, so
 * InfoTooltip stays usable on plain pages. */
export function useRegisterExportNote(title: string | undefined, text: string, enabled = true) {
  const register = useContext(ExportNotesCtx);
  const id = useId();
  useEffect(() => {
    if (!register || !enabled || !text) return;
    return register({ id, title, text });
  }, [register, enabled, id, title, text]);
}

/** Flattens a tooltip's children into plain text for the image footer. Handles
 * strings, numbers, arrays and elements whose children are themselves text —
 * which covers every tooltip in this codebase (text with interpolated values). */
export function nodeToText(node: React.ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeToText).join("");
  if (typeof node === "object" && "props" in (node as { props?: unknown })) {
    const el = node as { props?: { children?: React.ReactNode } };
    return nodeToText(el.props?.children);
  }
  return "";
}

// ─── 3. The image-only footer ────────────────────────────────────────────────

export interface ExportLegendEntry {
  color: string;
  label: string;
  /** "line" for line charts, "box" for areas/bars. */
  shape?: "line" | "box";
}

/**
 * The block that turns a screenshot into a self-explaining image: legend, the
 * help texts collected from the "?" buttons, the data source and the brand.
 * Hidden on the page — the page has hover, the image doesn't.
 */
export function WidgetExportFooter({
  legend,
  source,
  branding = true,
  note,
}: {
  legend?: ExportLegendEntry[];
  source: DataSource | DataSource[];
  /** Off only where the brand is already in the frame. */
  branding?: boolean;
  /** Extra line (assumptions, reference year) that only the image needs. */
  note?: string;
}) {
  const notes = useExportNotes();
  return (
    <ExportOnly>
      <div
        style={{
          // Keine Trennlinie: Chart- und Fußnoten-Box gliedern das Bild bereits.
          marginTop: 12,
          fontSize: 10,
          lineHeight: 1.5,
          color: v("--color-text-muted"),
        }}
      >
        {legend && legend.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 8 }}>
            {legend.map((l) => (
              <span key={l.label} style={{ display: "inline-flex", alignItems: "center", gap: 5, color: v("--color-text-secondary"), fontSize: 11 }}>
                <span
                  style={{
                    width: l.shape === "box" ? 9 : 12,
                    height: l.shape === "box" ? 9 : 3,
                    borderRadius: 2,
                    background: l.color,
                    flexShrink: 0,
                  }}
                />
                {l.label}
              </span>
            ))}
          </div>
        )}

        {/* Fußnoten in einer ruhigen grauen Box: im Bild sind das mehrere
            Zeilen Fließtext, die sonst mit der Quellzeile verschwimmen. */}
        {(notes.length > 0 || note) && (
          <div
            style={{
              background: v("--color-bg-muted"),
              borderRadius: v("--radius-md"),
              padding: "9px 11px",
              marginBottom: 8,
            }}
          >
            {notes.map((n) => (
              <div key={n.id} style={{ marginTop: 3 }}>
                {n.title && <strong style={{ color: v("--color-text-secondary"), fontWeight: 700 }}>{n.title}: </strong>}
                {n.text}
              </div>
            ))}
            {note && <div style={{ marginTop: notes.length > 0 ? 6 : 0 }}>{note}</div>}
          </div>
        )}

        {/* Datenquelle links, Marke rechts. Im Bild gibt es keine Knöpfe mehr —
            deshalb trägt die Markenzeile hier die Einladung. */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16 }}>
          <span style={{ flex: 1, minWidth: 0 }}>
            <DataSourceNote source={source} plain label="Datenquelle:" />
          </span>
          {branding && <PoweredBy label="Interaktiv selbst rechnen:" />}
        </div>
      </div>
    </ExportOnly>
  );
}
