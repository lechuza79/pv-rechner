import {useId} from 'react';
import type {SolarMonth} from '../../lib/story-monthly-solar';
import {radialPreviewViewBox} from '../../lib/story-radial-viewbox';
import {formatStoryDate} from '../../lib/story-format';
import {energieTeile, leistungTeile} from '../../lib/gemeinde-einheiten';

/**
 * The one drawing of the solar month recap (template "radial"): one closed
 * 24-hour line per day, the active day highlighted, the backdrop artwork.
 * Monitor and story keep their own state, controls and wrappers; both accepted
 * geometries stay explicit layouts and are not merged:
 *  • `monitor`: midnight at the bottom, scale and centre via the unit
 *    formatters, the centre follows the shown day (fading in per day), accent
 *    total in the compact tile;
 *  • `story`: midnight at the top, MW / GWh as printed before, the centre is
 *    always the month total, larger backdrop modules in the compact card.
 * Class names come from the wrapper's stylesheet (type sizes and motion differ).
 */
export function MonthlySolarRadial({data, layout, compact, displayDate, frame, playing, focused, onHover, onChoose, classes}: {
  data: SolarMonth;
  layout: 'monitor' | 'story';
  compact: boolean;
  /** Day shown (selected or hovered), null for the month. */
  displayDate: string | null;
  /** Playback frame: days after it are hidden; null when not playing through. */
  frame: number | null;
  playing: boolean;
  focused: boolean;
  onHover: (date: string | null) => void;
  onChoose: (date: string) => void;
  classes: Record<string, string>;
}) {
  const gradientId = useId();
  const hasActive = displayDate !== null;
  const shownDay = hasActive ? (data.days.find(day => day.date === displayDate) ?? data.days[0]) : null;
  const max = Math.max(...data.days.flatMap(day => day.mw), Number.EPSILON);
  const offset = layout === 'monitor' ? Math.PI / 2 : -Math.PI / 2;
  const point = (hour: number, value: number) => {const angle = hour / 24 * Math.PI * 2 + offset, r = 90 + value / max * 150; return [280 + Math.cos(angle) * r, 280 + Math.sin(angle) * r];};
  // Round the geometry itself, not only the stroke join. Keep rounding local
  // to each sample so the hourly profile cannot gain spline overshoots.
  const path = (values: number[]) => {
    const points = values.map((value, i) => point(i + .5, value));
    const coordinate = (p: number[]) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`;
    const corners = points.map((current, i) => {
      const previous = points[(i + points.length - 1) % points.length], next = points[(i + 1) % points.length];
      const toward = (neighbor: number[]) => {const distance = Math.hypot(neighbor[0] - current[0], neighbor[1] - current[1]), fraction = distance === 0 ? 0 : Math.min(2 / distance, .25); return current.map((value, axis) => value + (neighbor[axis] - value) * fraction);};
      return {current, entry: toward(previous), exit: toward(next)};
    });
    return corners.map((corner, i) => `${i ? 'L' : 'M'}${coordinate(corner.entry)} Q${coordinate(corner.current)} ${coordinate(corner.exit)}`).join(' ') + ' Z';
  };
  const chartViewBox = compact ? radialPreviewViewBox(data.days.flatMap(day => day.mw.map((value, i) => point(i + .5, value))), 280, 90) : '0 0 560 560';
  const [viewX, viewY, viewSize] = chartViewBox.split(' ').map(Number);
  // Compact artwork shares the plot center and bleeds to the card, not the SVG viewport.
  const backdropX = compact ? 280 - viewSize : viewX, backdropY = compact ? 280 - viewSize : viewY, backdropSize = compact ? viewSize * 2 : viewSize;
  const storyCompact = layout === 'story' && compact;
  const scaleLabel = (value: number) => layout === 'monitor'
    ? {value: leistungTeile(value).value, unit: leistungTeile(max).unit}
    : {value: value.toLocaleString('de-DE', {maximumSignificantDigits: 2}), unit: 'MW'};
  const ariaLabel = layout === 'monitor'
    ? `Solarleistung in ${data.town ?? 'der Gemeinde'}, ${formatStoryDate(data.month)}. ${data.days.length} Tageslinien, 24 Stunden. Modellierter Monatsertrag ${energieTeile(data.totalMwh).value} ${energieTeile(data.totalMwh).unit}.`
    : `Solarleistung in ${data.town ?? 'Trier'}, ${formatStoryDate(data.month)}. ${data.days.length} Tageslinien, 24 Stunden. Modellierter Monatsertrag ${(data.totalMwh / 1000).toFixed(2)} GWh.`;
  const centre = layout === 'monitor'
    ? (shownDay ? energieTeile(shownDay.mwh) : energieTeile(data.totalMwh))
    : {value: (data.totalMwh / 1000).toLocaleString('de-DE', {maximumFractionDigits: 1}), unit: 'GWh'};
  const centreText = <><text x="280" y="275" textAnchor="middle" className={`${classes.total} ${layout === 'monitor' && compact ? classes.totalAkzent : ''}`}>{centre.value}</text><text x="280" y="300" textAnchor="middle" className={classes.unit}>{centre.unit}</text></>;
  return <svg viewBox={chartViewBox} role={compact ? 'img' : 'group'} aria-label={ariaLabel}>
    <defs>
      <filter id={`${gradientId}-mono`} colorInterpolationFilters="sRGB"><feColorMatrix type="saturate" values="0" /></filter>
      <linearGradient id={`${gradientId}-fade`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="white" /><stop offset="35%" stopColor="white" /><stop offset="100%" stopColor="black" /></linearGradient>
      <mask id={`${gradientId}-backdrop`} maskUnits="userSpaceOnUse" x={backdropX} y={backdropY} width={backdropSize} height={backdropSize}><rect x={backdropX} y={backdropY} width={backdropSize} height={backdropSize} fill={`url(#${gradientId}-fade)`} /></mask>
    </defs>
    <g mask={`url(#${gradientId}-backdrop)`} opacity=".16" pointerEvents="none" aria-hidden="true"><image href="/brand/feed-in-v4-splashes.svg" x={compact ? 280 - viewSize * .8 : viewX - viewSize * .3} y={compact ? 280 - viewSize * .8 : viewY - viewSize * .2} width={viewSize * 1.6} height={viewSize * 1.6} filter={`url(#${gradientId}-mono)`} /><image href="/brand/pv-modules-mono-contained.svg" x={storyCompact ? 280 - viewSize * 1.05 : viewX + viewSize * .06} y={storyCompact ? 280 - viewSize * 1.05 : viewY + viewSize * .06} width={viewSize * (storyCompact ? 2.1 : .88)} height={viewSize * (storyCompact ? 2.1 : .88)} /></g>
    <defs><radialGradient id={gradientId} gradientUnits="userSpaceOnUse" cx="280" cy="280" r="240"><stop offset="37.5%" stopColor={hasActive ? 'var(--atlas-text)' : 'var(--atlas-action)'} stopOpacity={hasActive ? .06 : .12} /><stop offset="100%" stopColor={hasActive ? 'var(--atlas-text)' : 'var(--atlas-action)'} stopOpacity={hasActive ? .3 : .75} /></radialGradient></defs>
    {(compact ? [0] : [0, max / 3, max * 2 / 3, max]).map((value, i) => <g key={i}><circle cx="280" cy="280" r={90 + value / max * 150} fill="none" stroke="var(--atlas-text)" strokeOpacity={i === 0 ? .22 : .1} strokeDasharray={i % 2 === 0 ? '2 6' : undefined} />{!compact && i === 2 && <g transform={`translate(280,${280 - 90 - value / max * 150})`}><rect x="-22" y="-15" width="44" height="40" rx="2" fill="var(--atlas-card)" /><text textAnchor="middle" dominantBaseline="middle" className={classes.scale}><tspan x="0" y="-3">{scaleLabel(value).value}</tspan><tspan x="0" y="15">{scaleLabel(value).unit}</tspan></text></g>}</g>)}
    {!compact && [0, 6, 12, 18].map(hour => {const angle = hour / 24 * Math.PI * 2 + offset; return <text key={hour} x={280 + Math.cos(angle) * 260} y={280 + Math.sin(angle) * 260 + 5} textAnchor="middle" className={classes.hour}>{String(hour).padStart(2, '0')}{hour === 0 ? ' Uhr' : ''}</text>;})}
    {data.days.map((day, index) => {
      const isActive = hasActive && day.date === displayDate, hidden = frame !== null && index > frame;
      return <g key={day.date} opacity={hidden ? 0 : 1} className={classes.dayLine}>
        <path d={path(day.mw)} fill="none" stroke={`url(#${gradientId})`} strokeOpacity={playing && index === frame ? 0 : 1} strokeWidth="1" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
        <path d={path(day.mw)} pathLength="1" className={`${classes.activeLine} ${playing && index === frame ? classes.drawing : ''}`} fill="none" stroke="var(--atlas-action)" strokeOpacity={isActive ? 1 : 0} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
        {!compact && !hidden && !playing && <path d={path(day.mw)} fill="none" stroke="transparent" strokeWidth="10" className={classes.hitLine} onPointerEnter={() => {if (!focused && !playing) onHover(day.date);}} onPointerLeave={() => onHover(null)} onClick={() => onChoose(day.date)}><title>{layout === 'monitor' ? `${formatStoryDate(day.date)}: ${energieTeile(day.mwh).value} ${energieTeile(day.mwh).unit}` : `${formatStoryDate(day.date)}: ${Math.round(day.mwh)} MWh`}</title></path>}
      </g>;
    })}
    {/* Monitor: the centre shows what is drawn — the running day, else the
        month — and fades in per day so it never runs ahead of the line
        (operator, 23.09.2026). The key restarts the fade for each day. */}
    {layout === 'monitor' ? <g key={shownDay?.date ?? 'summe'} className={classes.wertWechsel}>{centreText}</g> : centreText}
  </svg>;
}
