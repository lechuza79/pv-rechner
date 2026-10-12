# Atomstrom hero integration — local, 4 October 2026

Source checkout: `/Users/eule/Documents/Codex/solar-microcharts-recovery`.

## Props (preferred, no iframe required)

- Default export from `components/energy/NuclearShareWidget.tsx`:
  `{ ytd: StrommixYtd | null, variant?: 'full' | 'teaser' }`.
  Default remains `full`. Teaser renders “Anteil Atomstrom {ytd.year}”, nuclear plus remainder, without category cards or action toolbar. Pass the unchanged `getStrommixYtd(asOf)` result. Denominator remains domestic generation plus calculated nuclear imports; other electricity imports are excluded. Explanation remains in shared help.
- Default export from `components/energy/NuclearDailyWidget.tsx`:
  `{ data: NuclearImportResponse | null, variant?: 'teaser' | 'full' }`.
  Default `teaser`. Pass `getNuclearImport().result` unchanged. It uses `data.data`, never `avg_gw`. Full variant uses the identical calculation and bar renderer, with a taller plot and source note.
- Host uses the existing `WidgetPresentation` / theme provider (`theme: 'dark'` for hero, `'light'` for the detailed section). No page-specific chart CSS needed. Intended widths: 270–330 px and wider.

## Local URLs

- `/embed/strommix-anteil?variant=teaser&theme=dark&onsite=1`
- `/embed/atomstrom-tage?variant=teaser&theme=dark`
- `/embed/atomstrom-tage?variant=full&theme=light`

## Calculation and limits

`lib/nuclear-daily.ts` groups raw timestamps into Europe/Berlin calendar days, including 23/25-hour clock-change days. Seven calendar days end at the newest actual timestamp. Empty days remain null (a dash, no bar); incomplete days use hatching and a coverage label. Means are duration-weighted over observed intervals only, never across missing intervals. Cadence is inferred from the shortest observed interval up to one hour; isolated points cannot establish full coverage. Duplicate timestamps do not inflate coverage. Newest actual day is highlighted and its own mean is shown above the bars. Historical data retains its actual date, never a “today” label.

Coverage describes temporal coverage only. The existing upstream calculation can omit unavailable neighbour-country mixes; the widget does not claim complete country coverage. Data is a calculated allocation, not measured electricity provenance.

## Shared dependencies changed in this task

`ShareDonut`: optional `showLegend` (default true).
`CategoryBarChart`: optional `missing` and `partialLabel`, plus highlighted data attribute and optional short `axisLabel` for vertical bars. Existing annual labels remain the default.
`WidgetFrame` now loads its own dashboard styles and semantic tokens, so direct teaser usage does not depend on an export wrapper having been loaded first.
New `NuclearDailyWidget.module.css` sets compact geometry and uses shared bar rendering.
The donut uses existing `public/illustrations/energy/mix-nuclear.webp`.

Tests: `lib/__tests__/nuclear-daily.test.ts` covers daily-vs-period means, missing/incomplete days, DST, true zero, invalid input and duplicates. No Atom page, site navigation or renewables-vs-nuclear race changes.


## Energy variant — 4 October 2026

`NuclearDailyWidget` now accepts `metric="energy"`, required `asOf` (ISO timestamp),
and optional `intervalMinutes` (default 15; actual source interval length).
Keep `variant="teaser"` for the hero, or `"full"` for details. Existing calls retain
the power / GW default. There is no separate `NuclearDailyPreview` in this checkout.

Host integration:

```tsx
<NuclearDailyWidget
  data={chartResult}
  metric="energy"
  asOf={asOf}
  variant="teaser"
/>
```

Supply the prepared 216-hour, uncompressed interval-start dataset. `asOf` anchors
seven consecutive completed Europe/Berlin calendar days; the current day is excluded.
Do not derive `asOf` from the latest sample, since stale data must remain visibly
incomplete. The sum appears only when all seven days have complete temporal coverage.
Partial bars show observed energy only, explicitly hatched; missing days remain empty.
DST integrates actual 23/25-hour days. Duplicate timestamps cannot inflate coverage.
Source cadence is explicit, so missing alternating intervals cannot masquerade as
complete lower-resolution data. Country completeness remains a separate source limit.

The local embed accepts `metric=energy` for visual checking. Its existing 168-hour
feed is intentionally unchanged and can lack the start of the first completed day;
it must then withhold the total. The Atom-page host supplies the broader `chartResult`.
No edit to `lib/nuclear-import.ts` or the Atom-page data adapter in this task.

Validation: 11 daily-aggregation tests, including six energy cases (complete sum,
single and systematic gaps, both DST changes, zeros/duplicates/missing dates,
stale data anchored to asOf); TypeScript check.

## Atomsection preview contract — 6 October 2026

`AtomHeroPreviews` is the approved three-tile composition for this section only.
The host supplies the unchanged detail datasets (`ytd`, `nuclear`, `trade`), an
explicit time anchor (`asOf`), successful retrieval times (`updatedAt.share/daily`),
and actual detail section anchors (`targets.share/daily/trade`). No polling or
source request belongs to this component. Unknown retrieval time remains unknown.

All tiles have identical geometry per breakpoint, title, period, one primary
metric, noninteractive chart and update footer. The complete tile is a link.
No menu, help, export, legend, hover or playback inside the link; detail charts
retain all these features. Missing values and partial-day markings are preserved.

- Share: current-year nuclear share from the existing calculation; same donut,
  nuclear versus remainder, no category cards. Its denominator remains unchanged.
- Daily: final completed calendar day in GWh plus seven completed days as bars;
  same `nuclearDailyEnergy` calculation and explicit partial/missing indication.
- Trade: current-year absolute net difference with import/export direction;
  same radial bars, zero ring, sign colors and scale; no day labels, share or gross totals.

Preview: `/widget-galerie/atom-preview`. This verification page intentionally shows
unknown update times where its data adapter has no successful retrieval metadata;
never substitute page render time or the last measurement.
No other chart receives a hero variant automatically.
