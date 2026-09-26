"use client";
import {useEffect, useState, type ComponentProps, type ReactNode, type Ref} from 'react';
import {WidgetFrame} from './WidgetFrame';
import {ExportIgnore, ExportOnly, SOURCE_EDGE_WIDTH, WidgetExportFooter, WidgetFooter, WidgetSourceEdge} from '../WidgetExport';
import {ExportNotesProvider} from '../export-notes';
import {useChartExport} from '../../lib/useChartExport';
import {embedPath, widgetForPlace, type WidgetDef} from '../../lib/widget-registry';
import ChartOptionsMenu from '../ChartOptionsMenu';
import EinbettenDialog from '../EinbettenDialog';
import {WIDGET_MAX_WIDTH_COMPACT} from '../../lib/widget-registry';

const embeddable = (w: WidgetDef) => embedPath(w) !== null;
import {EXPORT_BRIGHTEST_ATTR, EXPORT_CSS_ATTR} from '../../lib/export-markers';
import foundation from '../social/atlas-foundations.module.css';
import './dashboard.css';

/**
 * A monitor widget that can be shared and downloaded through the shared export
 * pipeline — no second footer, no second image renderer:
 *  • page: an options menu top right (Teilen, Download, Einbetten; ChartOptionsMenu)
 *    or, with actions="bar", the registry footer row (WidgetFooter) — same handlers;
 *    subject-matter help beside the headline; everything interactive ExportIgnore'd;
 *  • image: the chosen state as text instead of the selector, the texts behind
 *    "?" and the brand line (WidgetExportFooter), the vertical source edge with
 *    licence and data date (WidgetSourceEdge), captured 1:1 (mode "node") on
 *    the default export palette (EXPORT_BRIGHTEST_ATTR → light Atlas scheme).
 * The article stays the grid item; it carries the dashboard and Atlas classes
 * itself so the detached capture keeps its tokens. Pass the host's
 * `data-story-scheme` (dark on the monitors) — the Atlas class alone means light.
 */
/** Source edge lane: clear of the rounded corners (widget radius 16px) and off the card border. */
const EDGE_INSET = 28;
const EDGE_GAP = 6;

export function ExportableWidgetFrame({widget, place, stand, stateLabel, settings, children, className = '', filename, actions = 'menu', einbetten, ...frame}: Omit<ComponentProps<typeof WidgetFrame>, 'footer' | 'ref' | 'menu' | 'helpPlacement'> & {
  /** Registry entry: identity, sources, share text. */
  widget: WidgetDef;
  /** Place shown (municipality or district) — names title, share text and image note. */
  place: string;
  /** Data date for the source edge. */
  stand: string;
  /** What the selector currently shows, printed in the image instead of the control. */
  stateLabel?: string;
  filename: string;
  children: ReactNode;
  /** Presentation of the same actions: a compact options menu (monitor charts) or the prominent footer row. */
  actions?: 'menu' | 'bar';
  /** Parameters of the supported embed route; without it, embedding is shown as unavailable. */
  einbetten?: {params: Record<string, string>; height: number};
}) {
  // The monitor lives in an iframe on the municipality page; share the page that hosts it.
  const [liveUrl, setLiveUrl] = useState<string | undefined>();
  const [embedOpen, setEmbedOpen] = useState(false);
  useEffect(() => {
    try { const host = new URL(window.top?.location.href ?? window.location.href); host.search = ''; host.hash = 'atlas-data'; setLiveUrl(host.toString()); }
    catch { setLiveUrl(undefined); }
  }, []);
  const def = widgetForPlace(widget, place, liveUrl);
  const chartExport = useChartExport({
    context: {title: def.title},
    filename,
    shareText: def.shareText,
    shareUrl: def.shareUrl,
    mode: 'node',
  });
  // Image only: room for the source edge, so it never overlaps chart labels at the card edge.
  const edgeColumns = def.sources.length > 1 ? 2 : 1;
  const exportCss = `position:relative;padding-right:${SOURCE_EDGE_WIDTH * edgeColumns + EDGE_GAP + 6}px;box-sizing:border-box;`;
  return <ExportNotesProvider>
    <WidgetFrame
      {...frame}
      ref={chartExport.chartRef as unknown as Ref<HTMLElement>}
      className={`${foundation.foundation} sc-dashboard ${className}`}
      {...{[EXPORT_BRIGHTEST_ATTR]: '', [EXPORT_CSS_ATTR]: exportCss}}
      settings={settings && <>
        <ExportIgnore inline>{settings}</ExportIgnore>
        {stateLabel && <ExportOnly display="inline-block" style={{fontSize: "var(--atlas-label-size)", color: "var(--atlas-secondary)"}}>{stateLabel}</ExportOnly>}
      </>}
      helpPlacement={actions === 'menu' ? 'title' : 'tools'}
      menu={actions === 'menu' ? <ChartOptionsMenu label={frame.title} busy={chartExport.isExporting}
        onShare={chartExport.canNativeShare ? chartExport.sharePng : () => navigator.clipboard?.writeText(`${def.shareText}\n${def.shareUrl}`).catch(() => {})}
        onDownload={chartExport.downloadPng}
        // Only a supported embed route yields a code; the monitor charts have none yet (registry: embeddable false).
        embed={einbetten && embeddable(def) ? {onEmbed: () => setEmbedOpen(true)} : {unavailable: 'Für dieses Diagramm noch nicht verfügbar.'}} /> : undefined}
      footer={<>
        {actions === 'bar' && <div className="sc-widget-actions"><WidgetFooter widget={def} chartExport={chartExport} onsite showCta={false} /></div>}
        {/* Laid out (invisible) on the page so it can fit its type to the card height;
            the article is the containing block (container-type). Two sources → two columns. */}
        <div style={{position: 'absolute', top: EDGE_INSET, bottom: EDGE_INSET, right: EDGE_GAP, width: SOURCE_EDGE_WIDTH * edgeColumns, pointerEvents: 'none'}}>
          <WidgetSourceEdge widget={def} stand={stand} visible={false} spalten={edgeColumns} />
        </div>
        {einbetten && <div data-sc-export-ignore=""><EinbettenDialog open={embedOpen} onClose={() => setEmbedOpen(false)} titel={def.title} src={`/embed/${def.id}`} params={einbetten.params}
          width={WIDGET_MAX_WIDTH_COMPACT} height={einbetten.height} siteUrl="https://solar-check.io" attribution={{path: def.shareUrl.replace("https://solar-check.io", ""), text: `Datenquelle: ${def.title} — Solar Check`}} /></div>}
        <ExportOnly style={{padding: "0 var(--widget-padding) var(--widget-padding)"}}><WidgetExportFooter widget={def} note={`Ort: ${place}`} /></ExportOnly>
      </>}
    >{children}</WidgetFrame>
  </ExportNotesProvider>;
}
