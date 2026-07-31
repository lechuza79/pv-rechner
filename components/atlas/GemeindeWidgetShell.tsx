"use client";

import { useState } from "react";
import { v } from "../../lib/theme";
import {
  ExportBox,
  ExportNotesProvider,
  WidgetExportFooter,
  WidgetFooter,
  WidgetSourceEdge,
  type ExportLegendEntry,
} from "../WidgetExport";
import { sourceLabel } from "../../lib/data-sources";
import { useChartExport } from "../../lib/useChartExport";
import { WIDGET_MAX_WIDTH_COMPACT, type WidgetDef } from "../../lib/widget-registry";

// Shared shell for the place-based widgets (municipality and state): renewable
// mix, installed capacity by plant type, simulated solar output, the plain
// figure tiles. One frame, one title, the content, then the shared footer.
//
// Identity comes from the widget registry, resolved to the place at call time
// (widgetForPlace): the title carries the town's name, so the downloaded image
// and the citation do too. Nothing here re-types a label, a licence or a share
// target — the three shared building blocks do that:
//   • WidgetFooter      — next step, actions (incl. "Zitieren"), brand line
//   • WidgetSourceEdge  — source credit, vertical along the right edge
//   • WidgetExportFooter — the image-only footer: legend, note, source, brand
//
// Visibility per state follows the convention: an external embed shows source
// and brand permanently (licence), on our own pages (`onsite`) the source fades
// in on hover and the page carries the brand — but the IMAGE always carries
// both, because it travels without the page.
//
// Uses the site tokens `--color-*`, which the embed layout aliases onto
// `--widget-*` — the same shell works on the page and in the iframe.

export default function GemeindeWidgetShell({
  widget,
  subline,
  filename,
  legend,
  note,
  dataAsOf,
  onsite = false,
  branding = true,
  share = true,
  showCta,
  showEmbed = true,
  sourceBottomInset = 0,
  children,
}: {
  /** Registry entry, already resolved to this place via `widgetForPlace`. */
  widget: WidgetDef;
  subline: string;
  /** File name of the PNG export. */
  filename: string;
  /** Only where the card has no visible legend of its own. */
  legend?: ExportLegendEntry[];
  /** Extra line the image needs (assumptions, reference period). */
  note?: string;
  /** Data vintage, where known — otherwise the image shows the retrieval date. */
  dataAsOf?: string;
  /** First-party embed on one of our own pages: source on hover, no brand line. */
  onsite?: boolean;
  branding?: boolean;
  share?: boolean;
  /**
   * Default: only in an external embed. On our own atlas and state pages these
   * cards sit right below a block that already offers the same next step — a
   * second, heavier button a few hundred pixels lower is noise, not a step.
   * Pass `true` to bring it back where the surrounding page offers nothing.
   */
  showCta?: boolean;
  showEmbed?: boolean;
  /** Shorten the vertical source label at the bottom, so it ends above a footer
   *  row inside the widget body instead of running to the floor. */
  sourceBottomInset?: number;
  children: React.ReactNode;
}) {
  // On our own pages the credit is quiet until someone looks at the card.
  const [showCredit, setShowCredit] = useState(false);

  const chartExport = useChartExport({
    context: {
      title: widget.title,
      subtitle: subline,
      source: widget.sources.map(sourceLabel).join(" · "),
    },
    filename,
    shareText: widget.shareText,
    shareUrl: widget.shareUrl,
    mode: "node",
  });

  return (
    // The collector for the "?" texts wraps the whole card, image footer included.
    <ExportNotesProvider>
      <div
        style={S.frame}
        ref={chartExport.chartRef}
        onMouseEnter={() => setShowCredit(true)}
        onMouseLeave={() => setShowCredit(false)}
        onFocusCapture={() => setShowCredit(true)}
      >
        <div>
          <div style={S.title}>{widget.title}</div>
          <div style={S.sub}>{subline}</div>
        </div>

        {/* Body grows, so two cards side by side end at the same height. The
            source sits slim and vertical along the right edge; the padding
            reserves its lane permanently, so nothing jumps when it fades in. */}
        <div style={S.body}>
          <div style={{ ...S.sourceLane, bottom: sourceBottomInset }}>
            <WidgetSourceEdge widget={widget} visible={!onsite || showCredit} />
          </div>
          <div style={S.bodyInner}>
            <ExportBox style={S.box}>{children}</ExportBox>
          </div>
        </div>

        <div style={S.footer}>
          <div style={S.rule} />
          <WidgetFooter
            widget={widget}
            chartExport={chartExport}
            onsite={onsite}
            branding={branding}
            share={share}
            showCta={showCta ?? !onsite}
            showEmbed={showEmbed}
            narrow
          />
        </div>

        {/* Image only: legend, the texts behind the "?", source and brand. */}
        <WidgetExportFooter
          widget={widget}
          legend={legend}
          note={note}
          dataAsOf={dataAsOf}
          branding={branding}
        />
      </div>
    </ExportNotesProvider>
  );
}

const S: Record<string, React.CSSProperties> = {
  frame: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    height: "100%",
    width: "100%",
    // Cap against over-wide rendering (wide embed iframe / full width on
    // mobile); centred. On the atlas page the columns are narrower anyway.
    maxWidth: WIDGET_MAX_WIDTH_COMPACT,
    marginInline: "auto",
    boxSizing: "border-box",
    background: v("--color-bg"),
    border: `1px solid ${v("--color-border")}`,
    borderRadius: "var(--widget-border-radius, 14px)",
    padding: "16px 18px",
    overflow: "hidden",
  },
  title: { fontSize: 16, fontWeight: 700, margin: "0 0 4px", lineHeight: 1.25 },
  sub: { fontSize: 12, color: v("--color-text-muted"), margin: "0 0 14px", lineHeight: 1.4 },
  body: { flex: 1, position: "relative", display: "flex", paddingRight: 18 },
  // Lane for the vertical source label: the edge positions itself against this
  // box, so shortening it at the bottom needs no second copy of the label.
  sourceLane: { position: "absolute", top: 0, right: 0, width: 14 },
  bodyInner: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center" },
  box: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" },
  footer: { marginTop: 14 },
  rule: { height: 1, background: v("--color-border"), opacity: 0.6 },
};
