# Municipal page integration handoff — 2026-09-22

## Target and boundaries

Replace the old Atlas municipality page across all approximately 11,000 municipalities. Preserve the reviewed visual design while integrating ordinary Next.js React components with centrally supplied municipal data. This branch is a portable prototype/source package, **not** a finished SSR implementation. No deployment, main merge, production database mutation or nationwide data regeneration was performed.

## Secured source

- Design: `codex/kommunenseite-design`. Previously completed design commit `6e5aaaa2cb97d7ccc1f909cc9f0210979f648c2f` is pushed. The portable-source handoff is a subsequent commit on the same branch.
- Story source: `codex/kommunen-templates-sicherung`, commit `6d707e8bccd3e16b4f3dc1fc7ba17adf50695bab`. The original selection plus targeted validation repairs is committed with the regular hook; the pristine original remains separately archived. See `docs/municipal-source-backup-notes.md` on that branch for the exact nine repaired files.
- Private draft GitHub release: tag `municipal-source-backup-2026-09-22` in `lechuza79/pv-rechner`. This is an authenticated backup artifact, not a published release or deployment. Use the tag with GitHub CLI; draft release URLs may show an `untagged-…` identifier.

```sh
gh release download municipal-source-backup-2026-09-22 --repo lechuza79/pv-rechner --dir municipal-backup
cd municipal-backup
shasum -a 256 -c municipal-handoff-SHA256SUMS
```

Initial snapshot: `municipal-story-source-2026-09-22.tar.gz` (SHA-256 `5936ac640c0190d74f93535537e001c5eee821ed128582d9e3119e465f31534a`), `municipal-source-backup-selection.json`, original `handoff-assets.json` and `handoff-assets.tar.gz`. The source archive contains the 389 selected original working files plus `SOURCE-INVENTORY.json`; it is an **overlay**, not a whole Git repository. Restore over source base revision `7405774ffd4d1a308de85c4fee6d8a02a0b1f451`, in an isolated checkout. That base is also in the pushed design branch history. Each source file has an individual hash. No environment files or raw caches are included.

The expanded portable assets are additionally uploaded as `portable-handoff-assets.json`, `portable-handoff-assets.tar.gz` and `portable-handoff-SHA256SUMS`. The checked-in `handoff-assets.json` is the expanded manifest. `pack-assets.py` reproduces its tarball with deterministic archive metadata. Both the Git branch and the release assets work without the originating computer.

## Source classification

**Product implementation candidates, to integrate into the app:**

- Story source `components/MunicipalStoryPreview.tsx` and its chart/component/CSS dependencies; in this design branch the required closure is under `vendor/story-source/components/`.
- Source `lib/story-pool.ts`, `story-finding-concept.ts`, `story-approved-visual.ts`, `municipal-chart-catalog.ts`, `story-prepared-server.ts`, discovery/calculation/ranking modules and their dependency closure. Preserve their evidence, missing-data and source-edition rules.
- Preview `Monitor*.tsx`, `StorySwipePreview.tsx`, `MunicipalDataPreview.tsx`, accompanying styles, rank comparison helpers and hero lifecycle logic. These are React/interactivity design sources, not already SSR-safe application components.
- Shared navigation/footer/person and hero assets in `public/`; images/fonts referenced by the asset manifest are intentionally included binaries. This is a snapshot of shared components, not a new central design system.
- Offline preparation scripts listed in `DATA-PREPARATION.md`: calculation/input-adapter references for Claude, never request-time page rendering.

**Saved outputs/fixtures, not the central production database:**

- `stories.json`, `charts.json`, `monitor-history.json`, `monitor-periods.json`, `public/atlas-design-preview/*json`.
- Source `lib/story-*-data.json`, `story-discovery-reports.json`, ranking-month and radial JSON; these are bundled examples/dated projections. Do not fan out Höchberg values to other municipalities.

**Working/reference material:**

- `public/atlas-design-preview/{index.html,atlas.js,variant3.js,ranking.js,…}`: visual/interaction reference requiring React conversion.
- Local preview `server.ts`, build tooling, old `reference/` and `shared/` snapshots, design docs and audit scripts. Some shared JS is still DOM-mounted; port it before production SSR.
- `scripts/.cache/**`, generated `build/**`, raw official export ZIP/XML/SQLite, weather archives, temporary renderings and `node_modules`: excluded. Ninety duplicate `atlas-design-archive` files and three old design mockup images were intentionally omitted from the source backup selection. Complete included/excluded lists are in the inventory.

## SEO and rendering audit

| Requirement | Current state | App integration required |
| --- | --- | --- |
| Server-rendered substantive text | **Not met**. The page shell contains markup, but intro/ranking/citizen examples/sources are assembled by browser scripts. | Server components must render all section text, figures, source dates and links from props. Test response HTML with JS disabled. |
| Stories/monitor without iframe-only content | **Not met**. `/embed/story-preview` returns an empty root populated by the client bundle. Existing React components receive data, but are client mounted. | Compose them in the page tree; split interaction islands from server-rendered content. No iframe as the only accessible/indexable source. |
| Metadata owned by app | **Partly**. Runtime title assignments in the copied hero bundles were removed. The prototype has static sample titles and intentionally noindex; no complete municipal canonical/social/JSON-LD contract. | Next metadata + JSON-LD from municipal props, accurate canonical and cards. Never copy prototype noindex to production. |
| One place-name H1 and meaningful H2 hierarchy | **Not met as a full contract**. Sample hero copy and client-generated sections remain; widget headings can jump levels. | One H1 containing the municipality name, H2 per section, subordinate headings below it. Verify full rendered tree including stories. |
| No fixed municipal names/numbers/dates/URLs | **Not met**. Höchberg, its key, sample savings, dates and share/widget destinations remain in the prototype and snapshots. | Central data props for name/key/slugs, periods, population, ranking, examples, links, share copy and stories. Missing data stays missing. |
| Central number/unit formatting | **Not met**. Local number/date formatters and `toLocaleString` remain in scripts/components. | Use the app's existing formatter; retain visually smaller/muted units through markup, not separate arithmetic. |
| No local source dependencies | **Met for the portable preview build** after vendoring. Raw regeneration requires explicitly supplied checkout-local inputs. | App imports should point to integrated central modules, not vendor duplicates. |

Do not infer production SEO readiness from a successful preview bundle. Recommended integration order: server page and metadata → shared server-rendered section components → data props/central formatters → chart interaction islands → browser visual comparison → no-JS HTML/canonical/heading checks → performance and release checks.

## Calculation and provenance boundaries

The prototype adapters are Höchberg-specific. The underlying story tooling is not universally single-city: discovery/preparation can iterate cities, radial/value builders take municipality keys, and some older fixtures are Nidda/Trier. Several legacy weather entry points intentionally throw immediately; their disabled bodies are reference material, not commands to run.

Use one consistent weather provider/edition and matching register inputs. Do not revive old monetary values when inputs are absent. The preview's optional period builder uses the vendored ERA5 archive reader offline; it never fetches missing weather automatically. Central app adaptation and nationwide preparation belong to Claude, not this handoff task.

## Verification and known failures

- Preview build completed; inherited CSS composition duplicate-property warnings remain.
- All 13 focused header/history/ranking/portability tests passed with independently installed dependencies. Asset hashes, source fingerprints and every story build input were checked inside this checkout.
- Secured story branch: type check and all 3,657 tests pass through the regular commit hook. The initial eight failures were repaired, not bypassed. The remote source archive deliberately preserves the pristine original before repairs; the vendor closure in this design branch also remains that original snapshot. For integration, take canonical repaired story sources from the secured story branch, not the vendor duplicate.
- This work does not establish production load times, SEO or deployed correctness. No fresh nationwide source preparation was run.

## Confirmed completion scope

The user explicitly retained SSR/SEO and central application integration with Claude. Source backup, portability and handoff are complete; the SEO gaps above remain intentional integration work, not a claim of production readiness. No deployment or main merge is authorized by this handoff.
