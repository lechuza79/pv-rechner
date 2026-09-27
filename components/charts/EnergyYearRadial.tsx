import type {EnergyYear} from '../../lib/story-energy-year';
import {radialPreviewViewBox} from '../../lib/story-radial-viewbox';
import {formatStoryDate} from '../../lib/story-format';
import {energieTeile} from '../../lib/gemeinde-einheiten';

export type EnergyYearMode = 'both' | 'solar' | 'wind';

/**
 * The one drawing of the solar/wind year profile (template "energy-year"):
 * one radial bar per day, solar from the inner ring, wind stacked on top.
 * Monitor and story wrap it with their own controls; both accepted geometries
 * stay explicit layouts and are not merged:
 *  • `monitor`: padded viewBox, scale floor of 20 MWh, figures via the unit
 *    formatter, day tooltips always name wind;
 *  • `story`: tight viewBox, year under the total, GWh with one decimal /
 *    MWh per day, tooltips name wind only where the town has wind.
 * `labelClass`/`totalClass` come from the wrapper's stylesheet (type sizes differ).
 */
export function EnergyYearRadial({data, mode, index, compact, layout, labelClass, totalClass, showWind, onHover, onToggle, ariaLabel}: {
  data: EnergyYear;
  mode: EnergyYearMode;
  /** Selected or hovered day, null for the whole year. */
  index: number | null;
  compact: boolean;
  layout: 'monitor' | 'story';
  labelClass: string;
  totalClass: string;
  /** Whether day tooltips name wind. */
  showWind: boolean;
  onHover: (day: number | null) => void;
  onToggle: (day: number) => void;
  ariaLabel: string;
}) {
  const day = index === null ? null : data.days[index];
  const value = (entry: EnergyYear['days'][number]) => (mode === 'wind' ? 0 : entry.solarMwh) + (mode === 'solar' ? 0 : entry.windMwh);
  const peak = Math.max(...data.days.map(entry => entry.solarMwh + entry.windMwh));
  const maximum = layout === 'monitor' ? Math.max(20, Math.ceil(peak / 20) * 20) : Math.ceil(peak / 20) * 20;
  const total = data.days.reduce((sum, entry) => sum + value(entry), 0);
  const point = (i: number, v: number) => {const angle = i / data.days.length * Math.PI * 2 - Math.PI / 2, r = 82 + v / maximum * 145; return [260 + Math.cos(angle) * r, 260 + Math.sin(angle) * r];};
  // Two decimals: server and browser trigonometry differ in the last digits, which
  // otherwise shows up as a hydration mismatch on every day bar (sub-pixel either way).
  const xy = (p: number[]) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`;
  const segment = (i: number, a: number, b: number) => `M${xy(point(i, a))} L${xy(point(i, b))}`;
  const tooltip = (entry: EnergyYear['days'][number]) => layout === 'monitor'
    ? `${formatStoryDate(entry.date)} · Solar ${energieTeile(entry.solarMwh).value} ${energieTeile(entry.solarMwh).unit} · Wind ${energieTeile(entry.windMwh).value} ${energieTeile(entry.windMwh).unit}`
    : `${formatStoryDate(entry.date)} · Solar ${Math.round(entry.solarMwh)} MWh${showWind ? ` · Wind ${Math.round(entry.windMwh)} MWh` : ''}`;
  const centre = layout === 'monitor'
    ? {value: energieTeile(day ? value(day) : total).value, unit: energieTeile(day ? value(day) : total).unit, sub: day ? formatStoryDate(day.date) : ''}
    : {value: (day ? value(day) : total / 1000).toLocaleString('de-DE', {maximumFractionDigits: day ? 0 : 1}), unit: day ? 'MWh' : 'GWh', sub: day ? formatStoryDate(day.date) : String(data.year)};
  const tick = layout === 'monitor' ? energieTeile(maximum / 2) : {value: String(maximum / 2), unit: 'MWh'};
  const viewBox = compact
    ? radialPreviewViewBox(data.days.map((entry, i) => point(i, entry.solarMwh + entry.windMwh)), 260, 82)
    : layout === 'monitor' ? '-24 -24 568 568' : '0 0 520 520';
  return <svg tabIndex={layout === 'monitor' && !compact ? 0 : undefined} viewBox={viewBox} role="img" aria-label={ariaLabel}>
    {(compact ? [0] : [0, maximum / 2, maximum]).map((v, i) => <circle key={v} cx="260" cy="260" r={82 + v / maximum * 145} fill="none" stroke="var(--atlas-text)" strokeOpacity=".15" strokeDasharray={i % 2 === 0 ? '2 5' : undefined} />)}
    {!compact && Array.from({length: 12}, (_, month) => {const date = new Date(Date.UTC(data.year, month, 1)), i = (date.getTime() - Date.UTC(data.year, 0, 1)) / 86400000; const p = point(i, maximum * 1.14); return <text key={month} x={p[0]} y={p[1] + 4} textAnchor="middle" className={labelClass}>{new Intl.DateTimeFormat('de-DE', {month: 'short', timeZone: 'UTC'}).format(date)}</text>;})}
    {data.days.map((entry, i) => {const solar = mode === 'wind' ? 0 : entry.solarMwh, wind = mode === 'solar' ? 0 : entry.windMwh, active = index === i; return <g key={entry.date} opacity={index === null || active ? 1 : .25}>
      {solar > 0 && <path d={segment(i, 0, solar)} stroke="var(--atlas-action)" strokeWidth={active ? 2 : 1} strokeLinecap="round" />}
      {wind > 0 && <path d={segment(i, solar, solar + wind)} stroke="var(--atlas-text)" strokeWidth={active ? 2 : 1} strokeLinecap="round" />}
      {!compact && <path d={segment(i, 0, maximum)} stroke="transparent" strokeWidth="5" onPointerEnter={() => onHover(i)} onPointerLeave={() => onHover(null)} onClick={() => onToggle(i)}><title>{tooltip(entry)}</title></path>}
    </g>;})}
    <text x="260" y="250" textAnchor="middle" className={totalClass}>{centre.value}</text>
    <text x="260" y="273" textAnchor="middle" className={labelClass}>{centre.unit}</text>
    <text x="260" y="296" textAnchor="middle" className={labelClass}>{centre.sub}</text>
    {!compact && <g transform={`translate(260,${260 - 82 - 145 / 2})`}><rect x="-23" y="-12" width="46" height="35" rx="2" fill="var(--atlas-card)" /><text textAnchor="middle" className={labelClass}><tspan x="0">{tick.value}</tspan><tspan x="0" dy="16">{tick.unit}</tspan></text></g>}
  </svg>;
}
