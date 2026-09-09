"use client";

import { useState } from "react";
import { v } from "../../lib/theme";
import {
  ExportBox,
  ExportNotesProvider,
  WidgetExportFooter,
  WidgetFooter,
  WidgetSourceEdge,
  SOURCE_EDGE_WIDTH,
  type ExportLegendEntry,
} from "../WidgetExport";
import { sourceLabel } from "../../lib/data-sources";
import { useChartExport } from "../../lib/useChartExport";
import { WIDGET_MAX_WIDTH_COMPACT, type WidgetDef } from "../../lib/widget-registry";
import EinbettenDialog from "../EinbettenDialog";

/** Basis-Adresse für den Einbett-Code. Der Code landet auf einer FREMDEN
 *  Website; eine relative Adresse zeigte dort ins Leere. */
const SITE_URL = "https://solar-check.io";

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
  nackt = false,
  einbetten,
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
  /**
   * Der Inhalt bringt Überschrift und Rahmen selbst mit.
   *
   * Ohne das stehen drei Rahmen ineinander: das Fenster, die Karte mit ihrer
   * Überschrift, und darin noch einmal die Bildkarte mit ihrer eigenen. Die
   * Hülle liefert dann nur noch, was der Inhalt NICHT hat — die Aktionen, die
   * Quellenkante und den Bild-Fuß.
   */
  nackt?: boolean;
  /**
   * Der fertige Einbett-Code für DIESEN Ort, hinter dem Knopf der Karte.
   *
   * Ohne diese Angabe springt der Knopf in die Widget-Galerie — dort steht der
   * Ort dann in einem Abfrageteil, die Seite ist in Du-Form geschrieben, und
   * die kommunalen Widgets stehen hinter acht Deutschland-Widgets. Gemessen am
   * 05.09.2026: 289 Briefe an Kommunen, vier Veröffentlichungen, null
   * Einbettungen. Wer auf der Ortsseite einbetten will, bekommt den Code dort.
   *
   * `params` trägt den Ort (und was das Widget sonst braucht), `height` die
   * Höhe des Rahmens; alles Übrige kommt aus dem Register.
   */
  einbetten?: { params: Record<string, string>; height: number; width?: number };
  /** Shorten the vertical source label at the bottom, so it ends above a footer
   *  row inside the widget body instead of running to the floor. */
  sourceBottomInset?: number;
  children: React.ReactNode;
}) {
  // On our own pages the credit is quiet until someone looks at the card.
  const [showCredit, setShowCredit] = useState(false);
  const [einbettenOffen, setEinbettenOffen] = useState(false);

  const chartExport = useChartExport({
    context: {
      title: widget.title,
      subtitle: subline,
      source: widget.sources.map((q) => sourceLabel(q)).join(" · "),
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
        {!nackt && (
          <div>
            <div style={S.title}>{widget.title}</div>
            <div style={S.sub}>{subline}</div>
          </div>
        )}

        {/* Body grows, so two cards side by side end at the same height. */}
        <div style={S.body}>
          <div style={S.bodyInner}>
            {nackt ? children : <ExportBox style={S.box}>{children}</ExportBox>}
          </div>
        </div>

        <div style={S.footer}>
          <WidgetFooter
            widget={widget}
            chartExport={chartExport}
            onsite={onsite}
            branding={branding}
            share={share}
            showCta={showCta ?? !onsite}
            showEmbed={showEmbed || !!einbetten}
            onEmbed={einbetten ? () => setEinbettenOffen(true) : undefined}
            narrow
          />
        </div>

        {/* Die Quelle steht senkrecht an der rechten Kante — auf der Seite wie
            im Bild, über die GANZE Kartenhöhe. Vorher spannte sie nur über den
            Inhaltsbereich: In einer Karte mit einer kurzen Kachelreihe reichte
            dessen Höhe nicht für eine Zeile, der Vermerk brach in mehrere
            Spalten um und lief quer über die Kennzahlen. */}
        <div style={{ ...S.sourceLane, bottom: 8 + sourceBottomInset }}>
          <WidgetSourceEdge
            widget={widget}
            visible={!onsite || showCredit}
            stand={dataAsOf}
          />
        </div>

        {/* Image only: legend, the texts behind the "?", brand. */}
        <WidgetExportFooter widget={widget} legend={legend} note={note} branding={branding} />

        {/* Bleibt gemountet, damit das Fenster sanft aus- statt wegblendet —
            und ausdrücklich MIT `data-sc-export-ignore`: Ein geschlossener
            Dialog steht sonst als leerer Kasten im heruntergeladenen Bild. */}
        {einbetten && (
          <div data-sc-export-ignore>
            <EinbettenDialog
              open={einbettenOffen}
              onClose={() => setEinbettenOffen(false)}
              titel={widget.title}
              src={`/embed/${widget.id}`}
              params={einbetten.params}
              width={einbetten.width ?? WIDGET_MAX_WIDTH_COMPACT}
              height={einbetten.height}
              attribution={{
                // Der Textlink zeigt auf die Ortsseite selbst — sie ist die
                // Quelle der Zahlen und zugleich der Rückverweis, um den es
                // geht. `shareUrl` trägt sie bereits (widgetForPlace setzt sie).
                path: widget.shareUrl.replace(SITE_URL, ""),
                text: `Datenquelle: ${widget.title} — Solar Check`,
              }}
              siteUrl={SITE_URL}
            />
          </div>
        )}
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
    // Rechts ist Platz für die Quellen-Kante: 16 Innenabstand + Spurbreite.
    // Damit hat die Inhaltsspalte EINE Breite — Titel, Chart-Kasten und
    // Fußzeile fluchten, statt dass der Kasten schmaler ist als die Zeile
    // darüber.
    padding: `16px ${16 + SOURCE_EDGE_WIDTH}px 16px 16px`,
    // Mindesthöhe, damit der senkrechte Quellenvermerk lesbar hineinpasst. Er
    // schrumpft sich zwar in die vorhandene Höhe, aber bei einer Karte mit nur
    // einer Kachelreihe landete er an der Untergrenze und war immer noch zu
    // lang. Eine so flache Karte sah ohnehin gedrungen aus — die Höhe ist also
    // kein Zugeständnis an die Kante, sondern beides zugleich.
    minHeight: 360,
    overflow: "hidden",
  },
  title: { fontSize: v("--font-size-lead"), fontWeight: 700, margin: "0 0 4px", lineHeight: 1.25 },
  sub: { fontSize: v("--font-size-small"), color: v("--color-text-muted"), margin: "0 0 14px", lineHeight: 1.4 },
  body: { flex: 1, display: "flex" },
  // Spur der senkrechten Quellen-Beschriftung: über die ganze Kartenhöhe, nicht
  // nur über den Inhalt — sonst reicht die Höhe für den Vermerk nicht.
  sourceLane: { position: "absolute", top: 8, right: 2, width: SOURCE_EDGE_WIDTH },
  bodyInner: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center" },
  // Der Kasten füllt den Inhaltsbereich, statt mittig darin zu schweben: Im Bild
  // ist er die einzige sichtbare Fläche, und eine Karte mit Mindesthöhe hätte
  // sonst oben und unten je einen Streifen Nichts um ihn herum.
  box: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" },
  // Ohne Trennlinie: Der Chart-Kasten gliedert die Karte bereits, ein Strich
  // darunter zieht im Bild eine zweite, konkurrierende Kante.
  footer: { marginTop: 14 },
};
