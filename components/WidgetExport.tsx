"use client";

import { createContext, useCallback, useContext, useEffect, useId, useMemo, useState } from "react";
import { EXPORT_CSS_ATTR, EXPORT_IGNORE_ATTR, EXPORT_ONLY_ATTR } from "../lib/chart-export";
import { DataSourceNote, PoweredBy } from "./PoweredBy";
import ChartActionBar from "./ChartActionBar";
import CiteModal from "./CiteModal";
import { sourceLabel, type DataSource } from "../lib/data-sources";
import { brandLabel, type WidgetDef } from "../lib/widget-registry";
import type { useChartExport } from "../lib/useChartExport";
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

// ─── 3. The footer on the PAGE ───────────────────────────────────────────────

/**
 * The visible footer every widget shares: one next step on the left, the action
 * bar on the right, the brand below (external only). Built from the registry
 * entry, so a widget cannot quietly grow its own arrangement — which is exactly
 * how the footers drifted apart before (some with CTA, some without, the brand
 * once left, once right, the source once vertical, once a block).
 *
 * The source itself is NOT here: it sits vertically along the card's right edge
 * (widget convention) and, in the image, in {@link WidgetExportFooter}.
 */
export function WidgetFooter({
  widget,
  chartExport,
  onCopyLink,
  onsite = false,
  branding = true,
  share = true,
  showCta = true,
  showEmbed = false,
  showDownload = true,
  narrow = false,
}: {
  widget: WidgetDef;
  chartExport: Pick<
    ReturnType<typeof useChartExport>,
    "downloadPng" | "sharePng" | "shareWhatsApp" | "shareTwitter" | "isExporting" | "canNativeShare"
  >;
  onCopyLink?: () => void;
  /** First-party embed on our own pages: no brand line (the page carries it). */
  onsite?: boolean;
  branding?: boolean;
  /** The embedder opted out of the action bar (share=0). Only the buttons go —
   * the next step and the brand line are not sharing, they are attribution. */
  share?: boolean;
  /** Off where the widget sits on the very page its next step leads to: a
   * button pointing at the page you are already reading is noise, not a step. */
  showCta?: boolean;
  showEmbed?: boolean;
  /** false where nothing capturable exists (map, single KPI). */
  showDownload?: boolean;
  narrow?: boolean;
}) {
  const [citeOpen, setCiteOpen] = useState(false);
  const copy =
    onCopyLink ??
    (() => {
      navigator.clipboard?.writeText(`${widget.shareText}\n${widget.shareUrl}`).catch(() => {});
    });
  const cta = showCta ? widget.cta : undefined;

  return (
    <div {...{ [EXPORT_IGNORE_ATTR]: "" }} style={{ marginTop: 14 }}>
      <div
        style={{
          display: "flex",
          flexDirection: narrow ? "column" : "row",
          // Umbrechen statt abschneiden: in einem schmalen Embed passen der
          // nächste Schritt und die Aktionsleiste nicht nebeneinander, und die
          // Karte schneidet Überstehendes ab (overflow: hidden).
          flexWrap: "wrap",
          alignItems: narrow ? "stretch" : "center",
          justifyContent: cta ? "space-between" : "flex-end",
          gap: 10,
        }}
      >
        {cta && (
          <a
            href={cta.href}
            style={{
              flexShrink: 0,
              textAlign: "center",
              padding: "9px 16px",
              borderRadius: v("--radius-md"),
              background: v("--color-accent"),
              color: v("--color-text-on-accent"),
              fontSize: 13,
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            {cta.label} →
          </a>
        )}
        {share && (
          <div style={{ display: "flex", justifyContent: narrow ? "center" : "flex-end" }}>
            <ChartActionBar
              variant="bar"
              size={28}
              showDownload={showDownload && widget.exportable !== false}
              onDownload={chartExport.downloadPng}
              onShareImage={chartExport.canNativeShare ? chartExport.sharePng : undefined}
              isExporting={chartExport.isExporting}
              canNativeShare={chartExport.canNativeShare}
              onCopyLink={copy}
              onWhatsApp={chartExport.shareWhatsApp}
              onTwitter={chartExport.shareTwitter}
              onCite={() => setCiteOpen(true)}
              onEmbed={
                showEmbed && !onsite
                  ? () => window.open(`/energie-widgets#${widget.id}`, "_blank", "noopener")
                  : undefined
              }
            />
          </div>
        )}
      </div>

      {branding && !onsite && (
        <div style={{ display: "flex", marginTop: 8, fontSize: 10.5, color: v("--color-text-muted") }}>
          <PoweredBy />
        </div>
      )}

      {/* Bleibt gemountet, damit das Fenster sanft aus- statt wegblendet. */}
      <CiteModal widget={widget} open={citeOpen} onClose={() => setCiteOpen(false)} />
    </div>
  );
}

/**
 * The source credit as the convention demands it: vertical along the right edge
 * of the card, never a horizontal block. External embeds show it permanently
 * (licence), on our own pages it fades in on hover — there the page credits.
 */
export function WidgetSourceEdge({
  widget,
  visible = true,
}: {
  widget: WidgetDef;
  visible?: boolean;
}) {
  // Sichtbar: Kurzform Name + Lizenzkürzel — das Lizenzkürzel ist der Teil, den
  // die Lizenz verlangt (dl-de/by-2-0, CC BY 4.0), und darf deshalb nicht in den
  // Tooltip wandern. Klammer-Zusätze („(Fraunhofer ISE)") fliegen raus, sonst
  // wird die schmale Kante mehrspaltig; der volle Text steht im title.
  const label = widget.sources
    .map((s) => `${s.name.replace(/\s*\([^)]*\)/g, "")}${s.license ? `, ${s.license}` : ""}`)
    .join(" · ");
  const full = widget.sources.map(sourceLabel).join(" · ");
  return (
    <div
      {...{ [EXPORT_IGNORE_ATTR]: "" }}
      title={`Quelle: ${full}`}
      style={{
        position: "absolute",
        top: 0,
        bottom: 0,
        right: 4,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        writingMode: "vertical-rl",
        transform: "rotate(180deg)",
        fontSize: 9,
        lineHeight: 1.4,
        letterSpacing: 0.2,
        color: v("--color-text-faint"),
        pointerEvents: "none",
        opacity: visible ? 1 : 0,
        transition: "opacity .18s ease-out",
      }}
    >
      {label}
    </div>
  );
}

// ─── 4. The image-only footer ────────────────────────────────────────────────

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
  widget,
  legend,
  source,
  branding = true,
  note,
  dataAsOf,
}: {
  /** Registry entry — carries sources and decides the brand wording. Pass this
   * rather than `source`; it keeps image, page footer and gallery in sync. */
  widget?: WidgetDef;
  legend?: ExportLegendEntry[];
  /** Only for charts without a registry entry (page-level one-offs). */
  source?: DataSource | DataSource[];
  /** Off only where the brand is already in the frame. */
  branding?: boolean;
  /** Extra line (assumptions, reference year) that only the image needs. */
  note?: string;
  /** Datenstand, wenn er bekannt ist (z. B. „Juli 2026" beim Anlagenregister).
   * Ohne Angabe steht das Abrufdatum im Bild — das ist die ehrlichere Aussage
   * bei Live-Daten, die sich stündlich ändern. */
  dataAsOf?: string;
}) {
  const notes = useExportNotes();
  const sources = widget?.sources ?? source;
  // Abrufdatum, erst nach dem Mounten gesetzt: Server- und Client-Render dürfen
  // nicht auseinanderlaufen, wenn der Tag wechselt.
  const [heute, setHeute] = useState("");
  useEffect(() => {
    setHeute(new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }));
  }, []);
  const stand = dataAsOf ?? heute;
  if (!sources) return null;
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
            <DataSourceNote source={sources} plain label="Datenquelle:" />
            {/* Ohne Datum ist ein weitergereichtes Bild wertlos: Niemand kann
                sehen, ob die Zahlen von heute oder von vorletztem Jahr sind. */}
            {stand && <span> · Stand: {stand}</span>}
          </span>
          {branding && <PoweredBy label={brandLabel(widget?.kind ?? "chart")} />}
        </div>
      </div>
    </ExportOnly>
  );
}
