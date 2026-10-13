"use client";

import {useEffect, useLayoutEffect, useRef, useState, type CSSProperties} from 'react';
import {createPortal} from 'react-dom';
import {ExportableWidgetFrame} from '../dashboard/ExportableWidgetFrame';
import {ExportOnly, ExportIgnore} from '../WidgetExport';
import {WIDGETS} from '../../lib/widget-registry';
import {fitPodiumPlot} from '../../lib/widget-plot-fit';
import styles from './GemeindeRankingWidget.module.css';
import Modal from '../Modal';
import ContentTable from '../ContentTable';
import ActionButton from '../ActionButton';
import {chartDataDate} from '../../lib/chart-labels';
import {useWidgetPresentation} from '../dashboard/WidgetPresentationContext';

export type RankingPodiumData = {
  place: string; category: string; title: string; unit: string; scope: string; stand: string;
  rows: {id: string; name: string; rank: number; value: number; formatted: string; listFormatted?:string; change?:number|null; href?: string; own: boolean}[];
  listUnit?:string; listTotal?:number;
  headingVariants?: {title: string; unit: string}[];
  shareParams?: Record<string, string>;
  missing?: string | null; animate?: boolean; revealed?: boolean; onReveal?: () => void;
};

/** Standalone podium: no list, identical in existing story and municipality hosts. */
export function RankingPodiumWidget({data}: {data: RankingPodiumData}) {
  return <RankingWidget data={data}/>;
}

/** Podium with a full-table action; the complete category composition owns selection. */
export function RankingPodiumWithList({data, listHost}: {data: RankingPodiumData; listHost?: HTMLElement | null}) {
  return <RankingWidget data={data} showList listHost={listHost}/>;
}

/** Selection and rank calculations stay with the data adapter. */
function RankingWidget({data, showList = false, listHost}: {data: RankingPodiumData; showList?: boolean; listHost?: HTMLElement | null}) {
  const [listOpen, setListOpen] = useState(false);
  const presentation = useWidgetPresentation();
  const animate=!data.revealed && (presentation.autoplay??data.animate);
  const allocated = presentation.layout === 'allocated';
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
  useLayoutEffect(() => {
    const visual = visualRef.current;
    const podium = visual?.querySelector<HTMLElement>(`.${styles.podium}`);
    if (!allocated || !visual || !podium) return;
    const measure = () => fitPodiumPlot(podium);
    const observer = new ResizeObserver(measure);
    observer.observe(podium);
    podium.querySelectorAll(`.${styles.label}`).forEach(label => observer.observe(label));
    measure();
    return () => { observer.disconnect(); visual.style.removeProperty('--ranking-plot-height'); };
  }, [allocated, data.category, data.scope]);
  const title = data.title.charAt(0).toLocaleUpperCase("de-DE") + data.title.slice(1);
  const qualifierAt = title.indexOf(" je ");
  const heading = qualifierAt < 0 ? title : title.slice(0, qualifierAt);
  const subtitle = qualifierAt < 0 ? (data.unit === "Anlagen" ? null : data.unit) : title.slice(qualifierAt + 1);
  const theme = `${data.category} ${title}`;
  const motif = /wind/i.test(theme) ? '/brand/wind-ranking-mono.svg' : /speicher|storage|battery/i.test(theme) ? '/brand/rank-battery.webp' : /balkon|balcony/i.test(theme) ? '/brand/rank-balcony-modern.webp' : /freifl/i.test(theme) ? '/brand/pv-modules-mono-contained.svg' : '/brand/pv-modules-mono-contained.svg';
  const rows = data.rows.slice(0,3);
  const podium = rows.length === 3 ? [rows[1], rows[0], rows[2]] : rows;
  const growthOrder = [...rows.filter(row=>!row.own).sort((a,b)=>b.rank-a.rank), ...rows.filter(row=>row.own)];
  const revealRef = useRef(data.onReveal);
  revealRef.current = data.onReveal;
  useEffect(()=>{
    if(data.missing || !data.rows.length)return;
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
    const finish=()=>revealRef.current?.();
    if(!animate||reduced.matches){finish();return;}
    // Number ticks belong to their small text nodes, not the whole frame/table.
    const timer=setTimeout(finish,Math.min(3,data.rows.length)*850+400+Math.min(3,data.rows.length)*930);
    const stop=()=>{if(reduced.matches){clearTimeout(timer);finish();}};
    reduced.addEventListener('change',stop);
    return()=>{clearTimeout(timer);reduced.removeEventListener('change',stop);};
  },[data.category,data.scope,data.missing,data.rows.length,animate]);
  const displayValue=(row:RankingPodiumData['rows'][number])=>data.unit === "Anlagen / 1.000 Einwohner"
    ? row.value.toLocaleString("de-DE",{minimumFractionDigits:1,maximumFractionDigits:1}) : row.formatted;
  const max = Math.max(0, ...rows.map(row => row.value));
  const listReady = !data.missing && data.rows.length > 0;
  return <ExportableWidgetFrame widget={WIDGETS.gemeindeRanking} place={data.place} shareParams={{...data.shareParams,...(showList ? {list:'on'} : {})}}
    stand={data.stand} exportScope={data.scope} exportUnit={data.unit} filename={`ranking-${data.place}-${data.category}`} kind="bar-comparison"
    imageFormats={[{label:"Querformat · 16:9",width:960,height:540},{label:"Quadrat · 1:1",width:720,height:720},{label:"Hochformat · 4:5",width:720,height:900}]}
    title={heading} eyebrow="Die Top 3" subtitle={subtitle} help={/speicherquote/i.test(data.category) ? 'Angemeldete private Batteriespeicher je 100 private Dachanlagen. Die Bestände werden getrennt gezählt; dies ist nicht der Anteil der Dächer mit Speicher. Werte über 100 sind möglich.' : /je Einwohner/i.test(data.title) ? 'Installierter Bestand geteilt durch die Einwohnerzahl der angezeigten Vergleichsgruppe. Leistung und Speicherkapazität sind keine Messung der Stromerzeugung.' : 'In Betrieb gemeldete Anlagen laut Marktstammdatenregister. Verglichen wird die angezeigte Kategorie innerhalb der gewählten Vergleichsgruppe.'} helpExportNote={false} exportNote={null} className={styles.widget} data-story-scheme="light">
    <div data-podium-visual ref={visualRef} className={styles.visual} data-animate={animate || undefined} key={`${data.category}-${data.scope}`}>
      <div data-widget-artwork className={styles.artwork} aria-hidden="true"><div className={styles.splash}/><img className={styles.backdrop} src={motif} alt=""/></div>
      {data.missing || !rows.length ? <p data-export-ready="false">{data.missing ?? 'Für diese Auswahl liegt keine Rangliste vor.'}</p> :
        <div data-podium-layout className={styles.podium} key={`${data.category}-${data.scope}`}>
          {podium.map(row => <div key={row.id} className={styles.contender} data-own={row.own} style={{"--bar-fraction":max > 0 ? row.value / max : 0,"--grow-delay":`${growthOrder.indexOf(row)*850}ms`,"--reveal-delay":`${rows.length*850+400+growthOrder.indexOf(row)*930}ms`} as CSSProperties}>
            <div data-podium-label className={styles.label}>{row.href ? <a href={row.href}>{row.name}</a> : <span>{row.name}</span>}<strong><ExportIgnore><RankingAnimatedValue key={`${data.category}-${row.id}`} value={displayValue(row)} delay={growthOrder.indexOf(row)*850} animate={Boolean(animate)}/></ExportIgnore><ExportOnly display="inline">{displayValue(row)}</ExportOnly></strong></div>
            <div className={styles.bar} data-ranking-celebration-origin={row.own && row.rank <= 3 ? true : undefined} style={{'--bar-fraction': max > 0 ? row.value / max : 0, '--bar-height': `${max > 0 ? 160 * row.value / max : 0}px`} as CSSProperties}>
              {row.own && row.rank <= 3 && <img className={styles.badge} src={`/atlas-design-preview/rank-badges/rank-${row.rank}.svg`} alt={`Platz ${row.rank}`} width={96} height={96}/>}
            </div>
            <span data-podium-rank className={styles.rank}>{row.rank}</span>
          </div>)}
        </div>}
    </div>
    {showList && (listReady || listHost !== undefined) && <ExportIgnore>
      {listHost === undefined ? <div className={styles.listAction}><ActionButton onClick={() => setListOpen(true)}>Alle {data.rows.length} Orte in dieser Kategorie ansehen</ActionButton></div> : listHost && createPortal(
        <button type="button" className="ranking-open" disabled={!listReady} onClick={() => setListOpen(true)}>{!listReady?'Vollständige Rangliste ansehen':(data.listTotal??data.rows.length)>data.rows.length?'Rangliste ansehen · Top 100 und eigene Position':`Alle ${data.rows.length} Orte in dieser Rangliste ansehen`}</button>, listHost)}
      <Modal open={listOpen} onClose={() => setListOpen(false)} title={heading} intro={`${data.scope} · ${data.rows.length} Orte · Stand ${chartDataDate(data.stand)}`}>
        <ContentTable caption={`${heading} in ${data.scope}`} showCaption={false} compact>
          <thead><tr><th scope="col">Platz</th><th scope="col">Ort</th><th scope="col">{data.listUnit??data.unit}</th>{listHost !== undefined && <th scope="col">Änderung</th>}</tr></thead>
          <tbody>{data.rows.map(row => <tr key={row.id} className={row.own ? styles.ownRow : undefined} aria-current={row.own ? 'location' : undefined}>
            <td>{row.rank}</td><th scope="row" className={styles.placeCell}>{row.href ? <a href={row.href}>{row.name}</a> : row.name}{row.own && <span className={styles.ownLabel}>Eigener Ort</span>}</th><td>{row.listFormatted??row.formatted}</td>{listHost !== undefined && <td aria-label={row.change?`${Math.abs(row.change)} Plätze ${row.change>0?'gestiegen':'gefallen'}`:undefined}>{row.change?`${row.change>0?'+':'−'}${Math.abs(row.change)}`:'–'}</td>}
          </tr>)}</tbody>
        </ContentTable>
        <p className={styles.listSource}>Quelle: <a href="https://www.marktstammdatenregister.de/">Marktstammdatenregister</a>. Gleiche Werte erhalten denselben Rang.</p>
      </Modal>
    </ExportIgnore>}
  </ExportableWidgetFrame>;
}

/** Isolate the original count-up animation from menus, layout and the full table. */
function RankingAnimatedValue({value,delay,animate}:{value:string;delay:number;animate:boolean}) {
  const [live,setLive]=useState(animate?'0':value);
  useEffect(()=>{
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
    if(!animate||reduced.matches){setLive(value);return;}
    let frame=0;
    const start=performance.now();
    const numeric=Number(value.replaceAll('.','').replace(',','.'));
    const decimals=value.includes(',')?value.split(',')[1].length:0;
    const format=new Intl.NumberFormat('de-DE',{minimumFractionDigits:decimals,maximumFractionDigits:decimals});
    const finish=()=>{cancelAnimationFrame(frame);setLive(value);};
    const tick=(now:number)=>{
      const progress=Math.min(1,Math.max(0,(now-start-delay)/850));
      if(progress===1||reduced.matches){finish();return;}
      setLive(format.format(numeric*(1-Math.pow(1-progress,3))));
      frame=requestAnimationFrame(tick);
    };
    const stop=()=>{if(reduced.matches)finish();};
    frame=requestAnimationFrame(tick);
    reduced.addEventListener('change',stop);
    return()=>{cancelAnimationFrame(frame);reduced.removeEventListener('change',stop);};
  },[value,delay,animate]);
  return <>{live}</>;
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

export {default as RankingWidgetCombination} from "./RankingWidgetCombination";
