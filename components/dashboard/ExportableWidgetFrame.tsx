"use client";
import {useCallback, useEffect, useLayoutEffect, useState, type ComponentProps, type ReactNode, type Ref} from 'react';
import {trackWidgetEvent} from "../../lib/analytics";
import {widgetScope, WIDGET_ACTIONS, type WidgetAction} from "../../lib/widget-analytics";
import {captureNodeToBlob} from '../../lib/chart-export';
import {useWidgetPresentation} from './WidgetPresentationContext';
import {widgetActionPresentation} from '../../lib/widget-appearance';
import {WidgetFrame} from './WidgetFrame';
import {ExportIgnore, ExportOnly, SOURCE_EDGE_WIDTH, WidgetExportFooter, WidgetSourceEdge} from '../WidgetExport';
import {ExportNotesProvider} from '../export-notes';
import {useChartExport} from '../../lib/useChartExport';
import {embedPath, widgetForPlace, type WidgetDef} from '../../lib/widget-registry';
import { requestWidgetVideo, type VideoRequestParams } from "../../lib/video-export-client";
import type { VideoMailOptions } from "../WidgetVideoDialog";
import ChartOptionsMenu from '../ChartOptionsMenu';
import Modal from '../Modal';
import SelectField from '../SelectField';
import dialogStyles from '../WidgetVideoDialog.module.css';
import {controlChartAnimation, downloadChartVideo} from '../../lib/chart-animation-export';
import EinbettenDialog from '../EinbettenDialog';
import {WIDGET_MAX_WIDTH_COMPACT} from '../../lib/widget-registry';

const embeddable = (w: WidgetDef) => embedPath(w) !== null;
import {EXPORT_BRIGHTEST_ATTR, EXPORT_CSS_ATTR} from '../../lib/export-markers';
import foundation from '../social/atlas-foundations.module.css';
import './dashboard.css';
import './widget-brand.css';
import {widgetBrandStyle} from '../../lib/widget-brand';
import {WidgetBrandHeader} from './WidgetBrandHeader';
import {chartMetadataLabel} from '../../lib/chart-labels';

/**
 * A monitor widget that can be shared and downloaded through the shared export
 * pipeline — no second footer, no second image renderer:
 *  • page: an options menu top right (Teilen, Download, Einbetten; ChartOptionsMenu)
 *    or a responsive primary action row — same handlers;
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
const EDGE_GAP = 14;

export function ExportableWidgetFrame({widget, place, stand, exportScope, exportUnit, exportDescription, stateLabel, exportNote, settings, children, className = '', filename, actions = 'menu', einbetten, onVideoRequest, videoParams, videoPeriod, animated = false, restartAction = true, sourceVisible = false, sourcePlacement = 'frame', directActions = false, imageFormats, shareParams, ...frame}: Omit<ComponentProps<typeof WidgetFrame>, 'footer' | 'ref' | 'menu' | 'helpPlacement'> & {
  /** External embeds show attribution; page hosts credit sources centrally. Exports always retain it. */
  sourceVisible?: boolean;
  sourcePlacement?: 'frame' | 'plot';
  directActions?: boolean;
  /** Registry entry: identity, sources, share text. */
  widget: WidgetDef;
  /** Selection needed to reconstruct this widget when following a shared link. */
  shareParams?: Record<string, string>;
  imageFormats?: {label: string; width: number; height: number}[];
  animated?: boolean;
  /** Omit when the chart already owns playback controls. */
  restartAction?: boolean;
  /** Server-backed video request, already bound to this widget and selected period. */
  videoParams?: VideoRequestParams;
  videoPeriod?: string;
  onVideoRequest?: (email: string, options: VideoMailOptions) => Promise<void>;
  /** Null omits a redundant location note when the introduction already names it. */
  exportNote?: string | null;
  /** Place shown (municipality or district) — names title, share text and image note. */
  place: string;
  /** Data date for the source edge. */
  stand: string;
  /** Explicit export context; existing consumers retain their subtitles. */
  exportScope?: string;
  exportUnit?: string;
  exportDescription?: ReactNode;
  /** What the selector currently shows, printed in the image instead of the control. */
  stateLabel?: string;
  filename: string;
  children: ReactNode;
  /** Presentation of the same actions: a compact options menu (monitor charts) or the prominent footer row. */
  actions?: 'menu' | 'bar' | 'primary';
  /** Parameters of the supported embed route; without it, embedding is shown as unavailable. */
  einbetten?: {params: Record<string, string>; height: number};
}) {
  const presentation=useWidgetPresentation();
  const partner = presentation.partner;
  const effectiveActions=widgetActionPresentation(presentation.sharing, actions);
  const [imageOpen, setImageOpen] = useState(false);
  const [imageFormat, setImageFormat] = useState(-1);
  const [imageError, setImageError] = useState('');
  // The monitor lives in an iframe on the municipality page; share the page that hosts it.
  const [liveUrl, setLiveUrl] = useState<string | undefined>();
  const [embedOpen, setEmbedOpen] = useState(false);
  const [videoPaused,setVideoPaused]=useState(false);
  const [videoProgress,setVideoProgress]=useState<number|null>(null);
  useEffect(()=>{
    if(videoProgress===null){setVideoPaused(false);return;}
    const sync=()=>setVideoPaused(document.hidden);
    sync();document.addEventListener('visibilitychange',sync);
    return()=>document.removeEventListener('visibilitychange',sync);
  },[videoProgress!==null]);
  const [videoFile,setVideoFile]=useState<{url:string;filename:string}|null>(null);
  const [videoPreview,setVideoPreview]=useState<string|null>(null);
  const [videoError,setVideoError]=useState<string|null>(null);
  useEffect(()=>()=>{if(videoFile)URL.revokeObjectURL(videoFile.url);},[videoFile]);
  useEffect(()=>()=>{if(videoPreview)URL.revokeObjectURL(videoPreview);},[videoPreview]);
  const closeVideo = async () => {
    setVideoFile(null);setVideoError(null);setVideoPreview(null);
    const node=chartExport.chartRef.current;
    if(node)await controlChartAnimation(node,{mode:'restore'});
  };
  const [detailOpen, setDetailOpen] = useState(false);
  // Include the title because one template can render multiple stock segments.
  const detailId = `${filename}-${frame.title}`;
  useEffect(() => {
    const sync = () => setDetailOpen(new URL(window.location.href).searchParams.get('chart') === detailId);
    sync();
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, [detailId]);
  useEffect(() => {
    window.dispatchEvent(new Event('chart-detail-change'));
  }, [detailOpen]);
  const closeDetail = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('chart');
    window.history.replaceState(null, '', url);
    try {
      if (window.parent !== window && window.parent.location.origin === window.location.origin) {
        const host = new URL(window.parent.location.href);
        host.searchParams.delete('chart');
        window.parent.history.replaceState(null, '', host);
      }
    } catch { /* External embeds cannot change their host URL. */ }
    setDetailOpen(false);
  };
  const copyDetailLink = async () => {
    let url = new URL(window.location.href);
    try {
      if (!partner && window.parent !== window && window.parent.location.origin === window.location.origin) {
        url = new URL(window.parent.location.href);
      }
    } catch { /* External embeds keep their own directly accessible URL. */ }
    if (!partner) url.searchParams.set('chart', detailId);
    for (const [key, value] of Object.entries(shareParams ?? {})) url.searchParams.set(key, value);
    url.hash = '';
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await Promise.race([
          navigator.clipboard.writeText(url.toString()),
          new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error('Clipboard unavailable')), 1200)),
        ]);
        return;
      } catch { /* Embedded browsers may deny the asynchronous Clipboard API. */ }
    }
    {
      // Local phone previews use HTTP, where the Clipboard API is unavailable.
      const field = document.createElement('textarea');
      field.value = url.toString();
      field.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
      document.body.appendChild(field);
      field.select();
      const copied = document.execCommand('copy');
      field.remove();
      if (!copied) throw new Error('Link konnte nicht kopiert werden.');
    }
  };
  useEffect(() => {
    try { const host = new URL(window.top?.location.href ?? window.location.href); host.search = ''; host.hash = 'atlas-data'; setLiveUrl(host.toString()); }
    catch { setLiveUrl(undefined); }
  }, []);
  const def = widgetForPlace(widget, place, liveUrl);
  const contactPage = new URL(liveUrl ?? def.shareUrl, 'https://solar-check.io');
  contactPage.hash = '';
  contactPage.searchParams.set('chart', detailId);
  for (const [key, value] of Object.entries(shareParams ?? {})) contactPage.searchParams.set(key, value);
  const contactHref = `/kontakt?${new URLSearchParams({
    topic: 'Widget einbetten',
    message: `Ich habe eine Frage zum Einbetten dieses Widgets:\n\nWidget: ${frame.title}\nKennung: ${widget.id}\nOrt: ${place}\n${stateLabel ? `Ansicht: ${stateLabel}\n` : ''}Seite: ${contactPage.toString()}\n\nMeine Frage:\n`,
  })}`;
  const designContactHref = `/kontakt?${new URLSearchParams({
    topic: 'Widget im eigenen Design',
    message: `Ich möchte dieses Diagramm als Export mit meinem Logo und meinen Farben anfragen.\n\nWidget: ${frame.title}\nKennung: ${widget.id}\nOrt: ${place}\n${stateLabel ? `Ansicht: ${stateLabel}\n` : ''}Seite: ${contactPage.toString()}\n\nMein gewünschtes Design und Exportformat:\n`,
  })}`;
  const chartExport = useChartExport({
    context: {title: def.title},
    filename,
    shareText: def.shareText,
    shareUrl: def.shareUrl,
    mode: 'node',
    nodeSize: imageFormats?.[imageFormat],
  });
  const [plotRail, setPlotRail] = useState<{top:number;height:number}>();
  useLayoutEffect(() => {
    if (sourcePlacement !== 'plot') return;
    const frameNode = chartExport.chartRef.current;
    const body = frameNode?.querySelector<HTMLElement>('.sc-widget-body');
    const plot = body?.querySelector<HTMLElement>('.sc-category-plot');
    if (!body || !plot) return;
    const omittedHeader = frameNode?.querySelector<HTMLElement>('[data-partner-header-measure]');
    const measure = () => {
      if (partner?.widgetHeight && frameNode) {
        const current = plot.getBoundingClientRect().height;
        const fixed = frameNode.getBoundingClientRect().height - current;
        const available = Math.max(140, partner.widgetHeight - (omittedHeader?.getBoundingClientRect().height ?? 0) - fixed);
        if (Math.abs(current - available) > 0.5) frameNode.style.setProperty('--chart-plot-height', available + 'px');
      }
      const a = body.getBoundingClientRect(), b = plot.getBoundingClientRect();
      const controls = partner ? frameNode?.querySelector<HTMLElement>('.sc-widget-tools') : undefined;
      const top = controls ? controls.getBoundingClientRect().bottom + 8 : b.top;
      setPlotRail({top: top-a.top, height: Math.max(0,b.bottom-10-top)});
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(body); observer.observe(plot); if (frameNode) observer.observe(frameNode); if (omittedHeader) observer.observe(omittedHeader);
    return () => observer.disconnect();
  }, [sourcePlacement, chartExport.chartRef, partner?.widgetHeight, partner?.header]);
  const measure = useCallback((action:WidgetAction) => {
    let path=window.location.pathname;
    try {path=window.top?.location.pathname??path;} catch {/* External embeds retain their own scope. */}
    trackWidgetEvent(widget.id,widgetScope(path),action);
  },[widget.id]);
  useEffect(()=>{
    const node=chartExport.chartRef.current;if(!node)return;
    const observer=new IntersectionObserver(entries=>{
      if(entries.some(entry=>entry.isIntersecting&&entry.intersectionRatio>=.25)){measure('visible');observer.disconnect();}
    },{threshold:.25});
    observer.observe(node);
    return()=>observer.disconnect();
  },[measure,detailOpen,chartExport.chartRef]);
  // Keep text left-aligned; individual plots can use the gutter to center independently.
  const edgeColumns = def.sources.length > 1 ? 2 : 1;
  const exportCss = `position:relative;--chart-export-source-gutter:${SOURCE_EDGE_WIDTH * edgeColumns + EDGE_GAP + 6}px;padding-right:var(--chart-export-source-gutter);box-sizing:border-box;text-align:left;`;
  const loadVideoThumbnail = useCallback(async () => {
    const node = chartExport.chartRef.current;
    if (!node) return null;
    return captureNodeToBlob(node, Math.min(1, 160 / node.getBoundingClientRect().width));
  }, [chartExport.chartRef]);
  const widgetActions = <ChartOptionsMenu help={frame.help} showDownload={def.exportable!==false} presentation={partner || directActions ? "embedded-footer" : effectiveActions === "primary" ? "footer" : "menu"} label={frame.title} onVideoRequest={onVideoRequest ?? (videoParams ? (email, options) => requestWidgetVideo({...videoParams,email,...options}) : undefined)} videoParams={videoParams} videoPeriod={videoPeriod ?? stateLabel} videoPlace={place} loadVideoThumbnail={loadVideoThumbnail} contactHref={contactHref} designContactHref={designContactHref} busy={chartExport.isExporting||videoProgress!==null}
        onRestart={animated&&restartAction?async()=>{
          const node=chartExport.chartRef.current;
          if(node)await controlChartAnimation(node,{mode:'restart'});
        }:undefined}
        onShare={copyDetailLink}
        onForward={async()=>{
          const url = new URL(partner ? window.location.href : contactPage.toString());
          for (const [key, value] of Object.entries(shareParams ?? {})) url.searchParams.set(key, value);
          if(navigator.share) {
            try { await navigator.share({title:frame.title,url:url.toString()}); return; }
            catch(error) { if (!(error instanceof Error && error.name === 'NotAllowedError')) throw error; }
          }
          await copyDetailLink();
          return 'copied' as const;
        }}
        onDownload={async()=>{
          if(chartExport.chartRef.current?.querySelector('[data-export-ready="false"]')) throw new Error('Die Daten sind noch nicht verfügbar. Bitte später erneut versuchen.');
          if(imageFormats?.length){setImageError('');setImageOpen(true);return;}
          const node=chartExport.chartRef.current;
          if(animated&&node)await controlChartAnimation(node,{mode:'pause'});
          try{await chartExport.downloadPng();}
          finally{if(animated&&node)await controlChartAnimation(node,{mode:'restore'});}
        }}
        animation={animated?{
          end:async()=>{
            const node=chartExport.chartRef.current;if(!node)return;
            await controlChartAnimation(node,{mode:'seek',progress:1});
            try{await chartExport.downloadPng();}finally{await controlChartAnimation(node,{mode:'restore'});}
          },
          video:async()=>{
            const node=chartExport.chartRef.current;if(!node)return;
            setVideoFile(null);setVideoError(null);
            setVideoProgress(0);
            try {
              await controlChartAnimation(node,{mode:'pause'});
              setVideoPreview(URL.createObjectURL(await captureNodeToBlob(node,1,undefined,'screen')));
              setVideoFile(await downloadChartVideo(node,filename,setVideoProgress));
              measure("video_complete");
            } catch(error) {
              measure("video_error");
              setVideoError(error instanceof Error?error.message:'Video konnte nicht erstellt werden.');
              throw error;
            } finally {
              setVideoProgress(null);
            }
          },
        }:undefined}
        // Only a supported embed route yields a code; the monitor charts have none yet (registry: embeddable false).
        embed={einbetten && embeddable(def) ? {onEmbed: () => setEmbedOpen(true)} : {unavailable: 'Für dieses Diagramm noch nicht verfügbar.'}} />;
  const content = <ExportNotesProvider>
    <WidgetFrame
      {...frame}
      data-widget-brand={partner?.brand.id}
      data-source-placement={sourcePlacement}
      style={partner ? {...frame.style, ...widgetBrandStyle(partner.brand, partner.widgetHeight)} : frame.style}
      masthead={partner ? partner.header === 'none'
        ? <div data-partner-header-measure="" data-sc-export-ignore="" aria-hidden="true" inert style={{position:"absolute",insetInline:0,top:0,visibility:"hidden",opacity:0,pointerEvents:"none"}}><WidgetBrandHeader brand={partner.brand} mode="full"/></div>
        : <WidgetBrandHeader brand={partner.brand} mode={partner.header}/> : frame.masthead}
      context={frame.context ?? (partner ? `Stand: ${stand}` : undefined)}
      bodyAside={partner || sourcePlacement === 'plot' ? <div data-plot-source-rail style={{position:'absolute',top:plotRail?.top ?? 12,height:plotRail?.height,bottom:plotRail ? undefined : 16,right:6,width:28,pointerEvents:'none'}}><WidgetSourceEdge widget={def} stand={stand} visible={!!partner || sourceVisible} spalten={2} ownCredit={!!partner} minFontSize={partner ? 10 : undefined}/></div> : frame.bodyAside}
      exportSubtitle={<>
        {chartMetadataLabel({scope:exportScope ?? (typeof frame.title === 'string' && place && frame.title.includes(place) ? undefined : place), dataAsOf:stand, unit:exportUnit, period:stateLabel})}
        {(exportDescription ?? frame.exportSubtitle) && <> · {exportDescription ?? frame.exportSubtitle}</>}
      </>}
      data-widget-id={widget.id}
      onClickCapture={event=>{
        const target=event.target instanceof Element?event.target.closest('button,a,[role="button"],[role="menuitem"]'):null;
        if(!target||target.getAttribute('aria-disabled')==='true')return;
        const action=target.getAttribute('data-widget-action') as WidgetAction|null;
        measure(action&&WIDGET_ACTIONS.includes(action)?action:'interact');
      }}
      onChangeCapture={()=>measure('settings')}
      data-chart-detail-open={detailOpen ? true : undefined}
      ref={chartExport.chartRef as unknown as Ref<HTMLElement>}
      className={`${foundation.foundation} sc-dashboard ${className}`}
      {...{[EXPORT_BRIGHTEST_ATTR]: partner ? undefined : '', [EXPORT_CSS_ATTR]: partner || sourcePlacement === 'plot' ? 'position:relative;text-align:left;' : exportCss}}
      settings={settings && <ExportIgnore inline>{settings}</ExportIgnore>}
      helpPlacement={effectiveActions === 'menu' ? 'title' : 'tools'}
      menu={effectiveActions === 'menu' ? widgetActions : undefined}
      footer={<>
        {(videoProgress!==null||videoFile||videoError)&&<ExportIgnore inline={false} style={{position:'absolute',inset:0,zIndex:5,borderRadius:'inherit',overflow:'hidden'}}>
          <div className="sc-video-overlay" data-video-overlay="">
            {videoPreview&&<img className="sc-video-preview" src={videoPreview} alt=""/>}
            <div className="sc-video-message" role="status" aria-live="polite">
              <div className="sc-video-state" key={videoProgress!==null?"progress":videoFile?"complete":"error"}>
              {videoProgress!==null?<>
                <strong>{videoPaused ? "Videoexport pausiert" : "Video wird erstellt"}: {videoProgress} %</strong>
                <progress aria-label="Videoexport" max={100} value={videoProgress}/>
                <p>{videoPaused ? "Geht automatisch weiter, sobald dieser Tab wieder sichtbar ist." : "Im Hintergrund pausiert der Export und läuft bei Ihrer Rückkehr weiter. Bitte die Seite nicht schließen oder neu laden."}</p>
              </>:videoFile?<>
                <strong>Dein Video ist fertig.</strong>
                <a href={videoFile.url} download={videoFile.filename}>MP4 herunterladen</a>
                <p>Falls der Download nicht automatisch gestartet ist.</p>
                <button type="button" onClick={closeVideo}>Schließen</button>
              </>:<>
                <p>{videoError}</p>
                <button type="button" onClick={closeVideo}>Schließen</button>
              </>}
              </div>
            </div>
          </div>
        </ExportIgnore>}
        {effectiveActions === 'primary' && <div className="sc-widget-actions" data-sc-export-ignore={partner ? "" : undefined}>{widgetActions}</div>}
        {/* Laid out (invisible) on the page so it can fit its type to the card height;
            the article is the containing block (container-type). Two sources → two columns. */}
        {!partner && sourcePlacement !== 'plot' && <div style={{position: 'absolute', top: EDGE_INSET, bottom: EDGE_INSET, right: EDGE_GAP, width: SOURCE_EDGE_WIDTH * edgeColumns, pointerEvents: 'none'}}>
          <WidgetSourceEdge widget={def} stand={stand} visible={sourceVisible} spalten={edgeColumns} />
        </div>}
        {einbetten && <div data-sc-export-ignore=""><EinbettenDialog open={embedOpen} onClose={() => setEmbedOpen(false)} titel={def.title} src={`/embed/${def.id}`} params={einbetten.params}
          width={WIDGET_MAX_WIDTH_COMPACT} height={einbetten.height} siteUrl="https://solar-check.io" attribution={{path: def.shareUrl.replace("https://solar-check.io", ""), text: `Datenquelle: ${def.title} — Solar Check`}} /></div>}
        {!partner && <ExportOnly style={{padding: "0 var(--widget-padding) var(--widget-padding)"}}><WidgetExportFooter widget={def} note={exportNote === null ? undefined : exportNote} /></ExportOnly>}
      </>}
    >{children}</WidgetFrame>
  </ExportNotesProvider>;
  const imageDialog = imageFormats && <Modal open={imageOpen} onClose={()=>setImageOpen(false)} title="Bild herunterladen" scheme="light" maxWidth={520}>
    <p style={{margin:'0 0 20px'}}>{frame.title}</p>
    <label style={{display:'grid',gap:8}}>Bildformat
      <SelectField ariaLabel="Bildformat" block value={imageFormat} onChange={event=>setImageFormat(Number(event.target.value))}>
        <option value={-1}>Wie angezeigt</option>
        {imageFormats.map((format,index)=><option key={format.label} value={index}>{format.label}</option>)}
      </SelectField>
    </label>
    {imageError&&<p role="alert">{imageError}</p>}
    <button className={dialogStyles.submit} style={{marginTop:24}} disabled={chartExport.isExporting} onClick={async()=>{
      try {await chartExport.downloadPng();setImageOpen(false);}
      catch {setImageError('Das Bild konnte nicht erstellt werden. Bitte erneut versuchen.');}
    }}>{chartExport.isExporting?'Bild wird erstellt …':'PNG herunterladen'}</button>
  </Modal>;
  return <>{imageDialog}{detailOpen
    ? <Modal open onClose={closeDetail} title={place} ariaLabel={frame.title} maxWidth={880}>{content}</Modal>
    : content}</>;
}
