# Charts, widgets and dashboards

Status: local municipality preview; not integrated or released.

## Responsibilities

- `components/charts/CategoryBarChart.tsx` plots category values, exposes the same value on hover, focus and tap, and accepts incomplete-period metadata. It does not load municipality data or choose comparisons.
- `components/dashboard/WidgetFrame.tsx` owns the title, context, optional help and content frame. `lib/dashboard/model.ts` maps content roles to column counts.
- `components/dashboard/KpiOverview.tsx` owns the shared comparison selector (year by default) and renders typed KPI definitions. The municipality-specific adapter is `scripts/municipality-preview/monitor-kpis.ts`.
- `components/dashboard/dashboard.css` owns shared layout and appearance tokens. Applications map their palette to the semantic widget tokens. No page-specific dimensions belong in chart code.

## Layout

Three columns on wide containers, two below 850px, one below 540px. Numbers, radial charts, donuts and short category comparisons take one column; compositions and time series take two; maps take the full row. Breakpoints follow container width, including iframe and embedded contexts. Do not shrink all chart text by scaling the complete rendered widget.

## Comparisons and dates

Observations have an end date, an optional start date, a value and an explicit basis. Units belong to the KPI definition. A matching basis includes selection rules and any denominator.

Stock comparisons require the exact corresponding calendar day, or the corresponding month end when cadence is `month-end`. Year-to-date totals require matching start AND end dates in the previous year. A full prior year must not be substituted. A previous-month comparison is not applicable to a year-to-date total.

Missing, incompatible and inapplicable comparisons are distinct states, never zero. A zero reference permits an absolute delta but no percentage. Calendar shifts clamp leap days and month ends. Deltas are neutral by default: growth is not universally beneficial.

Stock sparklines require twelve matching monthly observations with an identical basis. Missing months suppress the sparkline rather than being interpolated. The municipality adapter reconstructs monthly cohorts from the current active register, grouped by commissioning date. These are not archived historical register snapshots: retired units are absent and late registrations can change earlier values. The visible method note must explain this. Both series use the latest complete month; per-resident history holds the population denominator constant.

Data period, data retrieval/version date and story publication date remain separate. The monitor does not invent publication dates.

## Migration boundary

The annual bar chart, current radial widget and KPI overview demonstrate the shared interfaces. Existing editorial chart renderers are still consumed through the preview adapter; its scoped CSS suppresses their editorial header. That compatibility layer is not the final neutral chart API. Stories have not been redesigned or migrated by this change.

The map still uses the existing shared map renderer and its own adapter. Production integration remains separate unfinished work.

Run `node scripts/municipality-preview/prepare-monitor-history.mjs` to regenerate the local month-end series. `STORY_SOURCE_ROOT` selects the source checkout. Preparation rejects invalid values, mismatched register editions and totals that do not reconcile. Year-to-date additions keep their explicitly labeled prior-year comparison when stock comparison switches to prior month.

## Validation

`node --import tsx --test lib/dashboard/model.test.ts` covers reference dates, missing/basis-changed/zero reference data, period matching, month-end boundaries and size roles. Browser checks must additionally cover theme inheritance, one/two/three-column layouts, selector behavior and overflow.

## KPI tiles

Each metric owns one tile. Sparklines show twelve month-end stocks on a zero-based scale, left-aligned with a visible zero baseline. Year-to-date totals derive individual monthly bars from complete, basis-matched cumulative observations. Counts show absolute deltas; power and capacity show percentage deltas. Hover, keyboard focus and tap reveal the other representation. Positive deltas use the shared `--color-positive` token. The shared selector supplies comparison context, rather than repeating it in each tile.

## Shared controls and chart interaction

`WidgetSetting` composes the existing `SelectField` and `InfoTooltip`; it does not create a separate dropdown design. The adapter supplies available period options and applies selection to real data. The annual chart supports trailing 5/10-year ranges; the municipality donut supports current stock and prepared month-end cohorts. Other editorial renderers retain their supplied period until alternative datasets are attached.

Single-field radial and donut widgets retain one grid field at tablet sizes. KPI deltas sit beside the headline number. Category bars share neutral colors; only interaction emphasizes a bar, never the maximum by default. Incomplete years use subtle hatching and explain their status in the value flag on hover/focus/tap. Donut segments and the visual legend share a central selected value. Map pin selection is opt-in so existing consumers retain their outline behavior.

## Unified KPI window (current preview)

The KPI widget now has one 1/6/12-month setting, default 12. It supersedes the earlier independent year/month comparison selector. All plots use monthly bars. Stock deltas compare the final value with the month end immediately before the selected window. New-installation totals sum the selected monthly additions and compare with the equally long preceding window. No mixed year-to-date basis remains. `kpiWindow` rejects incomplete input; 25 month-end observations support both twelve-month windows.

Widget header tools align right and hide redundant visible labels while keeping accessible names. Help stays at the right of the header. Donut values use MWp consistently for all segments and periods, and use two side-by-side monochrome visual tiles. Full dates use `dashboardDate` (e.g. 10. Sept. 2026).

## Donut detail convention

The inset shade sits on the colored ring's inner edge (not inside the center hole). Category illustrations are large, monochrome and use `mix-blend-mode:multiply`, following the requested daily-generation appearance. Keep this treatment when reusing these visuals. The editable date replaces redundant update text. Its shared dropdown is left-aligned below the title; help remains top right. Category tiles retain equal units and prominent values.

### Donut category cards and period navigation
- Category artwork fills the card background in monochrome multiply, behind centered label, value, and unit on separate lines. It is not a separate image above the label.
- Keep the inset shade on the colored ring subtle: 2 SVG units at 16% black.
- Use WidgetSetting with `stepper` for ordered periods: previous on the left, existing select in the middle, next on the right; disable arrows at the boundaries.
- Display the latest available snapshot as “Heute” and historical snapshots as month and year. “Heute” is a selection shortcut, not a claim of a live data refresh; retain the actual source date in the data provenance.

### Reference correction: background illustrations
Use the actual MonthlySolarChart treatment: monochrome, opacity .16, normal compositing, and a downward fade (opaque through 35%, transparent at 100%). Earlier multiply directions were superseded by the explicit reference. Category cards hug the centered label/value/unit plus padding; no fixed height or minimum height.

### Ranking discovery and full lists
- Use brand purple (#562581 with #e8d5ff) for the awareness pulse and the full-ranking action.
- Open full rankings in a native modal dialog with scrollable rows, municipality highlight, a close button, Escape dismissal, and restored focus. Keep comparison provenance explicit; unavailable historical ranks are not zero changes.
- Keep a stable Top 3 podium area across categories. Do not repeat the municipality in an extra card below it when it ranks lower.
- Celebrate a newly discovered podium position using the shared header confetti effect. Respect reduced motion and avoid repeating it when revisiting a known result.

### Ranking column and actions
The discovery column is bounded by the podium's rendered height. Its list scrolls internally and follows the active item; previous/next controls change the active result rather than paging separate chunks. Keep the share and full-ranking actions in a common footer. The full-ranking action is secondary; only its invitation indicator uses purple, and only when the municipality is outside the podium. Plain rank numbers use ink, and the municipality's podium bar becomes yellow when its name is revealed. Show population bounds in the cohort help only. Split a metric's short label from its qualifying subline.
