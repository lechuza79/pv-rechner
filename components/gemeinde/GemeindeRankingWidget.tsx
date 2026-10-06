"use client";

import {useEffect, useLayoutEffect, useRef, useState, type CSSProperties} from 'react';
import {createPortal} from 'react-dom';
import {ExportableWidgetFrame} from '../dashboard/ExportableWidgetFrame';
import {ExportOnly, ExportIgnore} from '../WidgetExport';
import {WIDGETS} from '../../lib/widget-registry';
import styles from './GemeindeRankingWidget.module.css';
import {useWidgetPresentation} from '../dashboard/WidgetPresentationContext';

export type RankingPodiumData = {
  place: string; category: string; title: string; unit: string; scope: string; stand: string;
  rows: {id: string; name: string; rank: number; value: number; formatted: string; href?: string; own: boolean}[];
  headingVariants?: {title: string; unit: string}[];
  shareParams?: Record<string, string>;
  missing?: string | null; animate?: boolean; onReveal?: () => void;
};

/** Pure visual: selection and rank calculations stay with the data adapter. */
export function RankingPodiumWidget({data}: {data: RankingPodiumData}) {
  const animate=useWidgetPresentation().autoplay??data.animate;
  const visualRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = visualRef.current;
    if (!node || !data.rows.some(row => row.own && row.rank <= 3)) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let pointerX = 0, pointerY = 0;
    const update = () => {
      frame = 0;
      const box = node.getBoundingClientRect();
      const offset = reduced.matches ? 0 : Math.max(-10, Math.min(10, (window.innerHeight / 2 - box.top - box.height / 2) * .055));
      node.style.setProperty('--badge-x', `${reduced.matches ? 0 : pointerX}px`);
      node.style.setProperty('--badge-offset', `${offset + (reduced.matches ? 0 : pointerY)}px`);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const move = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      const box = node.getBoundingClientRect();
      pointerX = ((event.clientX - box.left) / box.width - .5) * 12;
      pointerY = ((event.clientY - box.top) / box.height - .5) * 8;
      schedule();
    };
    const leave = () => { pointerX = 0; pointerY = 0; schedule(); };
    update();
    node.addEventListener('pointermove', move);
    node.addEventListener('pointerleave', leave);
    window.addEventListener('scroll', schedule, { passive: true, capture: true });
    window.addEventListener('resize', schedule);
    reduced.addEventListener('change', schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule, true);
      node.removeEventListener('pointermove', move);
      node.removeEventListener('pointerleave', leave);
      window.removeEventListener('resize', schedule);
      reduced.removeEventListener('change', schedule);
    };
  }, [data.category, data.scope]);
  // Reserve the tallest real heading at the current width before painting.
  // Both the podium and the adjacent category panel then retain their geometry.
  useLayoutEffect(() => {
    const widget = visualRef.current?.closest<HTMLElement>('.sc-widget');
    const header = widget?.querySelector<HTMLElement>('.sc-widget-head');
    if (!widget || !header || !data.headingVariants?.length) return;
    let lastWidth = -1;
    const measure = () => {
      const width = header.getBoundingClientRect().width;
      if (!width || width === lastWidth) return;
      lastWidth = width;
      let height = 0;
      for (const variant of data.headingVariants ?? []) {
        const probe = header.cloneNode(true) as HTMLElement;
        probe.setAttribute('aria-hidden', 'true');
        probe.inert = true;
        probe.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
        Object.assign(probe.style, {position:'absolute',visibility:'hidden',pointerEvents:'none',width:`${width}px`,height:'auto',minHeight:'0',top:'0'});
        const title = variant.title.charAt(0).toLocaleUpperCase('de-DE') + variant.title.slice(1);
        const split = title.indexOf(' je ');
        const heading = probe.querySelector('h4')!;
        const eyebrow = heading.querySelector('.sc-widget-eyebrow')?.cloneNode(true);
        const help = heading.querySelector('.sc-widget-title-help')?.cloneNode(true);
        heading.replaceChildren();
        if (eyebrow) heading.append(eyebrow);
        heading.append(split < 0 ? title : title.slice(0, split));
        if (help) heading.append('\u00a0', help);
        const subtitle = split < 0 ? (variant.unit === 'Anlagen' ? '' : variant.unit) : title.slice(split + 1);
        if (subtitle) {
          const line = document.createElement('span');
          line.className = 'sc-widget-subtitle';
          line.textContent = subtitle;
          heading.append(line);
        }
        widget.append(probe);
        height = Math.max(height, probe.getBoundingClientRect().height);
        probe.remove();
      }
      widget.style.setProperty('--ranking-heading-height', `${Math.ceil(height)}px`);
      // Shorter titles give the plot more height rather than leaving an empty heading slot.
      widget.style.setProperty('--ranking-plot-height', `${160 + Math.max(0, Math.ceil(height) - header.getBoundingClientRect().height)}px`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(header);
    let disposed = false;
    document.fonts.ready.then(() => { if (!disposed) { lastWidth = -1; measure(); } });
    return () => { disposed = true; observer.disconnect(); };
  }, [data.headingVariants]);
  const title = data.title.charAt(0).toLocaleUpperCase("de-DE") + data.title.slice(1);
  const qualifierAt = title.indexOf(" je ");
  const heading = qualifierAt < 0 ? title : title.slice(0, qualifierAt);
  const subtitle = qualifierAt < 0 ? (data.unit === "Anlagen" ? null : data.unit) : title.slice(qualifierAt + 1);
  const theme = `${data.category} ${title}`;
  const motif = /wind/i.test(theme) ? '/brand/wind-ranking-mono.svg' : /speicher|storage|battery/i.test(theme) ? '/brand/rank-battery.webp' : /balkon|balcony/i.test(theme) ? '/brand/rank-balcony-modern.webp' : /freifl/i.test(theme) ? '/brand/pv-modules-mono-contained.svg' : '/brand/pv-modules-mono-contained.svg';
  const rows = data.rows.slice(0,3);
  const podium = rows.length === 3 ? [rows[1], rows[0], rows[2]] : rows;
  const growthOrder = [...rows.filter(row=>!row.own).sort((a,b)=>b.rank-a.rank), ...rows.filter(row=>row.own)];
  const [elapsed,setElapsed] = useState(animate ? 0 : Infinity);
  useEffect(()=>{
    if(data.missing)return;
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
    if(!animate||reduced.matches){setElapsed(Infinity);data.onReveal?.();return;}
    setElapsed(0);
    let frame=0; const start=performance.now();
    const duration=rows.length*850+400+rows.length*930;
    const finish=()=>{cancelAnimationFrame(frame);setElapsed(Infinity);data.onReveal?.();};
    const stop=()=>{if(reduced.matches)finish();};
    const tick=(now:number)=>{if(reduced.matches){finish();return;}const time=now-start;setElapsed(time);if(time<duration)frame=requestAnimationFrame(tick);else data.onReveal?.();};
    reduced.addEventListener('change',stop);
    frame=requestAnimationFrame(tick);return()=>{cancelAnimationFrame(frame);reduced.removeEventListener('change',stop)};
  },[data.category,data.scope,animate]);
  const displayValue=(row:RankingPodiumData['rows'][number])=>{
    const final=data.unit === "Anlagen / 1.000 Einwohner" ? row.value.toLocaleString("de-DE",{minimumFractionDigits:1,maximumFractionDigits:1}) : row.formatted;
    const progress=Math.min(1,Math.max(0,(elapsed-growthOrder.indexOf(row)*850)/850));
    const numeric=Number(final.replaceAll('.','').replace(',','.'));
    const decimals=final.includes(',')?final.split(',')[1].length:0;
    return {final,live:progress===1?final:(numeric*(1-Math.pow(1-progress,3))).toLocaleString("de-DE",{minimumFractionDigits:decimals,maximumFractionDigits:decimals})};
  };
  const max = Math.max(0, ...rows.map(row => row.value));
  return <ExportableWidgetFrame widget={WIDGETS.gemeindeRanking} place={data.place} shareParams={data.shareParams}
    stand={data.stand} filename={`ranking-${data.place}-${data.category}`} kind="bar-comparison"
    imageFormats={[{label:"Querformat · 16:9",width:960,height:540},{label:"Quadrat · 1:1",width:720,height:720},{label:"Hochformat · 4:5",width:720,height:900}]}
    title={heading} eyebrow="Die Top 3" subtitle={subtitle} help={/speicherquote/i.test(data.category) ? 'Angemeldete private Batteriespeicher je 100 private Dachanlagen. Die Bestände werden getrennt gezählt; dies ist nicht der Anteil der Dächer mit Speicher. Werte über 100 sind möglich.' : /je Einwohner/i.test(data.title) ? 'Installierter Bestand geteilt durch die Einwohnerzahl der angezeigten Vergleichsgruppe. Leistung und Speicherkapazität sind keine Messung der Stromerzeugung.' : 'In Betrieb gemeldete Anlagen laut Marktstammdatenregister. Verglichen wird die angezeigte Kategorie innerhalb der gewählten Vergleichsgruppe.'} helpExportNote={false} exportNote={null} className={styles.widget} data-story-scheme="light">
    <div data-podium-visual ref={visualRef} className={styles.visual} data-animate={animate || undefined} key={`${data.category}-${data.scope}`}>
      <div data-widget-artwork className={styles.artwork} aria-hidden="true"><div className={styles.splash}/><img className={styles.backdrop} src={motif} alt=""/></div>
      <ExportOnly><p className={styles.scope}>{data.scope}</p></ExportOnly>
      {data.missing || !rows.length ? <p data-export-ready="false">{data.missing ?? 'Für diese Auswahl liegt keine Rangliste vor.'}</p> :
        <div className={styles.podium} key={`${data.category}-${data.scope}`}>
          {podium.map(row => <div key={row.id} className={styles.contender} data-own={row.own} style={{"--bar-fraction":max > 0 ? row.value / max : 0,"--grow-delay":`${growthOrder.indexOf(row)*850}ms`,"--reveal-delay":`${rows.length*850+400+growthOrder.indexOf(row)*930}ms`} as CSSProperties}>
            <div className={styles.label}>{row.href ? <a href={row.href}>{row.name}</a> : <span>{row.name}</span>}<strong><ExportIgnore>{displayValue(row).live}</ExportIgnore><ExportOnly display="inline">{displayValue(row).final}</ExportOnly></strong></div>
            <div className={styles.bar} data-ranking-celebration-origin={row.own && row.rank <= 3 ? true : undefined} style={{'--bar-fraction': max > 0 ? row.value / max : 0, '--bar-height': `${max > 0 ? 160 * row.value / max : 0}px`} as CSSProperties}>
              {row.own && row.rank <= 3 && <img className={styles.badge} src={`/atlas-design-preview/rank-badges/rank-${row.rank}.svg`} alt={`Platz ${row.rank}`} width={96} height={96}/>}
            </div>
            <span className={styles.rank}>{row.rank}</span>
          </div>)}
        </div>}
    </div>
  </ExportableWidgetFrame>;
}

/** Bridge only: legacy page filters publish their already computed selection. */
export default function GemeindeRankingWidget() {
  const [selection, setSelection] = useState<(RankingPodiumData & {host: HTMLElement}) | null>(null);
  useEffect(() => {
    const receive = (event: Event) => {
      const update = event as CustomEvent<RankingPodiumData & {host: HTMLElement}>;
      update.preventDefault();
      update.detail.host.classList.add(styles.host);
      setSelection(update.detail);
    };
    const status = (event: Event) => {
      event.preventDefault();
      const message = (event as CustomEvent<string>).detail;
      // Retain the current podium while the next category loads.
      if (message.includes('geladen')) return;
      setSelection(current => current ? {...current, rows: [], missing: message} : null);
    };
    window.addEventListener('municipality-ranking-widget', receive);
    window.addEventListener('municipality-ranking-status', status);
    return () => {
      window.removeEventListener('municipality-ranking-widget', receive);
      window.removeEventListener('municipality-ranking-status', status);
    };
  }, []);
  return selection ? createPortal(<RankingPodiumWidget key={`${selection.category}-${selection.scope}-${selection.missing ?? "ready"}`} data={selection}/>, selection.host) : null;
}
