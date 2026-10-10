'use client';
import { CategoryBarChart } from '../charts/CategoryBarChart';
import { WidgetFrame } from '../dashboard/WidgetFrame';
import { ExportableWidgetFrame } from '../dashboard/ExportableWidgetFrame';
import { IMPORT_COUNTRIES, type NuclearYearSnapshot } from '../../lib/atomstrom-year';
import { WIDGETS } from '../../lib/widget-registry';

/** Calendar-period adapter: shared bars, frames, help and exports, no local renderer. */
export default function NuclearYearWidget({ data, view = 'months', teaser = false }: { data: NuclearYearSnapshot; view?: 'months' | 'countries' | 'generation'; teaser?: boolean }) {
  const format = new Intl.DateTimeFormat('de-DE', { month: 'short', timeZone: 'Europe/Berlin' });
  const rows = view === 'months' ? data.months.map(m => ({ id: m.month, label: format.format(new Date(`${m.month}-15T12:00:00Z`)), value: Math.round(m.nuclearGwh), partial: m.coveredHours < m.expectedHours }))
    : view === 'countries' ? Object.entries(data.countries).map(([code, gwh]) => ({ id: code, label: IMPORT_COUNTRIES[code as keyof typeof IMPORT_COUNTRIES], value: Math.round(gwh), flagSrc: `/flags/${code}.svg`, silhouetteSrc: `/country-outlines/${code}.svg` })).sort((a, b) => b.value - a.value)
    : [{ id: 'renewable', label: 'Erneuerbare', value: Math.round(data.generation.renewable) }, { id: 'fossil', label: 'Fossile', value: Math.round(data.generation.fossil) }, { id: 'other', label: 'Sonstige', value: Math.round(data.generation.other) }];
  const title = view === 'countries' ? `${rows[0]?.label ?? 'Frankreich'} liefert den größten Anteil` : `${view === 'months' ? 'Atomstrom-Import' : 'Deutsche Stromerzeugung'} ${data.year}`;
  const missing = data.expectedHours - data.coveredHours;
  const note = `Auswertbare Zeit: ${data.coveredHours.toLocaleString('de-DE')} von ${data.expectedHours.toLocaleString('de-DE')} Stunden. ${missing > 0 ? `Es fehlen ${missing.toLocaleString('de-DE')} Stunden. Teilmengen werden nicht hochgerechnet.` : 'Vollständiger Zeitraum.'}`;
  const chart = <div className="sc-widget-inset"><CategoryBarChart rows={rows} country={view === 'countries'} partialStyle="solid" unit="GWh" label={title} orientation={view === 'months' ? 'vertical' : 'horizontal'} partialLabel="Teilmenge: Quelldaten fehlen." /></div>;
  if (teaser) return <WidgetFrame title={title} kind="time-series" subtitle="Monatsmengen · GWh">{chart}</WidgetFrame>;
  return <ExportableWidgetFrame widget={WIDGETS.atomstromJahr} place="Deutschland" title={title} kind="time-series" stand={String(data.year)} stateLabel={`${data.year} · erfasste Strommengen in GWh`} filename={`atomstrom-${data.year}-${view}`} shareParams={{year:String(data.year)}} exportNote={note} help={<>{note} Stromfluss aus einem Nachbarland wird mit dessen Kernenergieanteil im selben Zeitintervall gewichtet. Stundenwerte gelten für ihre vier Viertelstunden. Herkunft bedeutet eine rechnerische Zuordnung, keinen Kraftwerksnachweis.</>}>{chart}</ExportableWidgetFrame>;
}
