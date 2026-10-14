# Widget contributions: one implementation, complete delivery

Binding contribution workflow for every session changing a chart, widget, story visual,
hero preview, dashboard placement or export. Read this before implementation, together
with the relevant sections of [visuals](visuals.md). The general coordination, permission
and release rules remain in [CLAUDE.md](../../CLAUDE.md).

## Ownership and delivery boundary

The contributing session owns its change from existing implementation through registry,
host integration, focused verification and a reviewable commit. It must not deliver a
page-only graphic and leave another session to make it a widget later.

- **Widget-local work:** the contributor completes it independently within the approved
  scope. Routine fixes do not need an extra architecture-session approval.
- **Shared contract work:** identify affected consumers and coordinate overlapping edits
  before changing a common frame, control, data boundary or layout resolver. The platform
  session owns that shared decision, not every padding adjustment in individual charts.
- **Product decisions:** new appearance, changed behavior or additional variants follow
  the existing user-acceptance rule. Migration alone never authorizes redesign.
- **Release owner:** one session integrates an agreed, finite set of ready commits and
  completes its required checks and deployment. Other sessions continue separate work;
  unrelated new requests go into the next package. Do not keep expanding a release.

Use the existing session inventory and Git history before work. Send messages only with
user authorization. A written handoff is usable without a live conversation with the
platform session. Never copy uncommitted files from a foreign worktree.

## Start with a small change contract

Record these points in the task/PR before editing; no separate specification is needed:

1. Exact widget and requested change; existing parent renderer and an accepted reference
   URL or source revision. For a new visual, search the existing page/story implementations.
2. Change class: shared behavior, named presentation, data configuration or host placement.
3. Allowed variants/hosts, and the existing siblings that must retain their behavior.
4. Preserved interactions: selection, playback/replay, tooltips, navigation, ranking order,
   winner highlight/confetti/pointer where present, sharing and downloads.
5. Concrete end condition and the smallest matching checks, including one relevant
   unaffected consumer when the edited component is shared.

For example, moving a cost-race explanation to the right in its wide presentation does
not authorize changing narrow buttons. Adding a Strommix preview must reuse its parent
data and drawing, explicitly declare omitted details, and leave the full chart intact.

## Integration map — extend these owners, never a parallel system

Paths below are relative to the repository root. Check current exports and neighboring
implementations before using them; a historic migration report is not a current API.

| Concern | Existing owner | Contributor's obligation |
| --- | --- | --- |
| Identity, sources, actions, supported presentations | `lib/widget-registry.ts`, `lib/widget-presentation-contract.ts` | Register only real capabilities; declare included/omitted content and sizing constraints. A data filter is not a new visual identity. |
| Gallery and derived inventory | `lib/widget-gallery.ts`, `lib/widget-inventory.ts` | Make each supported view discoverable. Hidden entries and unchanged inventory counts do not prove migration completeness. |
| Shared render and host adapters | `components/dashboard/WidgetPresentation.tsx`, `components/dashboard/WidgetRenderer.server.tsx` | Onsite, dashboard and standalone embed resolve the same renderer. Keep compatible old URLs/imports as thin adapters. |
| Dashboard preparation and data | `components/dashboard/WidgetDashboard.server.tsx`, `lib/widget-data.server.ts`, `lib/widget-data-services.ts` | Reuse shared preparation/loading; matching selections share data. Preserve the last valid value during refresh. Missing/error is not zero. |
| Layout allocation | `lib/widget-dashboard.ts`, `lib/widget-composition.ts`, `lib/widget-presentation-contract.ts` | Declare minima centrally; hosts arrange registered items, not custom widget heights. |
| Frames, controls, theme and exports | `components/dashboard/ExportableWidgetFrame.tsx`, `components/dashboard/WidgetSetting.tsx`, `lib/widget-settings.ts`, `lib/useChartExport.ts` | Use existing components/tokens and state serialization. No private menu, download service or global CSS fix for one instance. |
| Story and hero projections | `components/dashboard/MunicipalWidgetVisual.tsx`, `lib/story-widget-selection.ts` | Reuse the visual owner; preserve dated story snapshots. Reduced detail and disabled controls are explicit options, not a second implementation. |
| Video capability | `lib/video-export-config.ts`, `lib/video-export-entitlement.ts` | Use the common render/request/delivery path. A generated local MP4 does not prove queued rendering or email delivery. |

The chart and building-block catalogs remain existing consumers; update their mappings
where the change requires it. See [configuration rules](../widget-configuration-rules.md),
[preview data](../widget-preview-data.md) and [partner embeds](../partner-widgets.md)
for the relevant boundary. Do not add another handwritten list of all widgets.

## Preserve layout and semantics

- Separate **data selection**, **presentation**, **host** and **output format**. Changing
  theme or width must not change metric, period, cohort, highlight or snapshot.
- Use actual container dimensions. Card height includes title, controls, labels and
  explanations; only the remaining plot area belongs to the drawing. Circular plots
  keep their shape, not a mandatory square outer card. Content-sized views grow naturally.
- Opt into allocated height only when the renderer consumes it. Use the shared resolver
  for nested groups and narrow stacking. No clipping, internal plot scrolling, scaled
  typography or host-specific pixel offsets to force a fit.
- Expose configuration only on the approved configuration/admin surfaces. Public
  interaction such as choosing an existing comparison is separate from dashboard setup.
- Preserve category colors, units, denominators, freshness and source licenses. Use the
  existing help/footer surfaces onsite; exported files retain selection, date and sources.
- Keep each instance independent. Changing one widget must not change its neighbor;
  shared controls affect only their declared group. Export/share reproduce that selection.

## Focused acceptance — complete the boundary, not every test again

Choose from existing suites rather than inventing another audit runner:

- Registry/inventory/geometry: `lib/__tests__/widget-registry.test.ts`,
  `lib/__tests__/widget-inventory.test.ts`, `lib/__tests__/widget-family-contracts.test.ts`,
  `lib/__tests__/widget-presentation-contract.test.ts`.
- Shared consumers and retained stories: `lib/__tests__/shared-widget-architecture.test.ts`,
  `lib/__tests__/widget-migration-coverage.test.tsx`,
  `lib/__tests__/widget-story-presentations.test.tsx`.
- Actual layout/actions/downloads: `e2e/widget-allocated-layout.spec.ts`,
  `e2e/widget-modal-layout.spec.ts`, `e2e/widget-export.spec.ts`; use the existing
  feature-specific suite where it covers the changed interaction more directly.

For each affected supported host/presentation, record **passed**, **failed**, or
**not applicable with reason**. Never treat untested as passed:

- [ ] Registered identity, configuration round-trip and renderer connection.
- [ ] Real page integration and standalone embed; dashboard/story/hero where supported
      and affected. Test the actual host, not only a gallery card.
- [ ] Narrow and wide container: readable names/values, no overlap or unwanted scroll,
      correct plot height. Select widths from the changed contract; use long labels.
- [ ] Changed interaction reaches its result; relevant existing interaction remains.
- [ ] Loading, empty/error and stale data remain truthful; no duplicate data path.
- [ ] Supported affected share/export path preserves selection, source and appearance.
      Open the actual file. For delivery changes, verify request through receipt, or
      explicitly leave delivery unverified. Do not render every video for a CSS-only fix.
- [ ] Unaffected sibling checked if a shared owner changed; no unauthorized redesign.

A new widget checks all its advertised capabilities. A local change checks its affected
boundaries. Add a durable regression test for a recurring fault at its responsible layer;
do not write tests that merely repeat CSS literals. Existing hooks and required CI remain
mandatory. Use the shared CI build and existing results for the same revision; no extra
full local build/test cycle or repeated browser tour without a concrete failure/change.

## Compact handoff (task/PR body)

```text
Change: widget / purpose / change class
Reference: accepted URL or revision; preserved variants and interactions
Ownership: branch + commit; shared files and affected consumers
Integration: registry / renderer / data / hosts / compatible old entry points
Checks: exact revision, commands or CI link; browser URLs + widths + interactions
Exports: actual file checked; request/queue/delivery status if applicable
Exceptions: unsupported capabilities with reason; remaining blockers (or none)
Release: local | checked | committed | merged | deployed | live-verified
```

The release owner reviews this evidence and integration conflicts; they do not redo the
contributor's whole implementation or identical tests. A failed/missing acceptance item
returns to the contributor with a concrete defect. Required CI or an affected shared
contract can still require a new check after integration. Follow the main release rule
for user acceptance, exact-stand protection, deployment verification and stopping.

## A finite version instead of an endless migration

For each release, choose its members from the actual registry, page imports and existing
story variants. Check for unregistered new visuals, especially on actively developed
pages such as Strommix; the gallery alone cannot discover what was never registered.
Each contributor brings their missing widgets into the shared basis as part of that
package. Do not require every possible future widget before releasing a working subset.

Keep the package membership, owner and evidence in its PR; product backlog stays in the
existing roadmap. Historic completion reports are dated evidence, not a live completeness
claim. “Ready for integration” requires the above handoff; “live” requires the real
deployment and affected live-function check. A guideline alone cannot guarantee flawless
adherence: the existing automated contracts and concrete acceptance evidence enforce the
parts they cover, while unsupported/new boundaries must be explicitly reviewed.
