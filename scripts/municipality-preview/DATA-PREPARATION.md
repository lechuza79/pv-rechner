# Preparation inputs, rules and checks

Paths below are relative to the restored source repository unless prefixed `preview/` (meaning `scripts/municipality-preview/`). Raw caches are excluded from the handoff. They must be supplied or rebuilt from the official sources in the same checkout; no command should read another worktree. Saved preview outputs are enough to render the prototype. Do not run preparation as part of page requests.

This is a source inspection, not evidence that every script was rerun. Calculations delegated to library functions must be preserved with those libraries and their tests. Historical active-register cohorts are not observed historical stock: filtering today's active units by commissioning date excludes subsequently retired units. Do not label that reconstruction as a contemporary historical inventory.

## Preview adapters

| Script | Inputs → output | Calculation / selection | Guards and limits |
| --- | --- | --- | --- |
| `preview/stories.ts` | Bundled discovery reports, ranking editions, theme → stories.json/base CSS | Höchberg findings → pool → concepts → first distinct approved visual types; independent month/year ranking comparisons | Keeps concept evidence, unknown comparison bases unavailable. Fixed municipal key; not nationwide selection. |
| `preview/prepare-charts.ts` | Local discovery report + matching prepared stories → charts.json | Attach prepared availability then municipal chart catalogue | Uses canonical adapters; missing raw cache stops explicit preparation. |
| `preview/refresh-register.mjs` | Local env, central register tables, local official history → current-register.json | Höchberg coverage, totals, sources and citizen examples from existing adapters | Read-only remote queries; inspect source-edition checks before running. Never run merely to open preview. |
| `preview/prepare-monitor-history.mjs` | current-register.json + same-edition daily solar/storage history → monitor-history.json | 25 month-end cumulative cohorts, additions and segment power/count totals | Exact count reconciliation with current stock, matching storage edition, finite nonnegative values. Fixed Höchberg. |
| `preview/prepare-monitor-periods.cjs` | Höchberg prepared baseline, daily history, valuation units, offline ERA5 archive → monitor-periods.json | 20 monthly profiles backwards from Aug 2026; years 2025/24/23; solarMonth, energyYear, unitMonthValue | Register editions match; monthly/valuation energy tolerance max(.001 MWh, .001%); Aug euro baseline tolerance max(1 euro, .01%); zero wind only; missing inputs reported; August value + annual output required. |
| `preview/rank-overview.ts` | Bundled ranking editions + explicitly supplied local complete ranking-source JSON → ranking overview assets | All categories/scopes/cohorts, own row, complete comparator rows, separate month/year deltas | compareRanks rejects changed cohorts/rules and missing exact periods. Fixed key and retained source filename. |
| `preview/fetch-ranking-data.ts` | Complete central ranking observations; optional newer retained local edition → ranking-discoveries.json | Latest complete edition with prior same-rule month; category/scoped ranking and cohort-safe deltas | Complete arrays required, municipality must exist; preserves newer local edition; failure retains existing output. Read-only DB. |
| `preview/prepareBaseStyles` (stories.ts) | Vendored tokens + embed layout → build/base.css | Extract existing base presentation | No data fetch; ordinary startup uses this only. |

## Original story scripts in source archive

All `scripts/story*.ts`, `.mjs`, `.py` entry points present in the original source checkout are listed below. Disabled legacy scripts are deliberately retained unchanged in the backup. They must not be re-enabled by deleting their initial error.

| Script | Inputs → output | Rule | Plausibility / failure behavior |
| --- | --- | --- | --- |
| story-source-inputs.mjs | Read-only source tables → story-inputs JSON + manifest | Paginated municipal, funding, housing, old-finding snapshots | HTTP failures stop; records table counts and retrieval time. No transactional cross-table snapshot guarantee. |
| story-stock-input.mjs | Read-only register meta/award stock → valuation-stock.json | Preserve wind and private battery stock, null distinct from zero | Reads edition before/after; rejects concurrent edition change; atomic rename. |
| story-history-local.py | Latest official ZIP → full.json/examples.json | Resolve successor keys; monthly solar cohorts by declared segment | Uses official statuses/dates/power filters; audit counters. No inferred residential usage. |
| story-register-detail.py | Official ZIP → units.sqlite, storage.json, detail-coverage.json | Local unit catalogue with exact dates/status, solar/storage grouping | Retains inactive records separately; no inferred historical status. Local SQLite writes only. |
| story-detail-summaries.py | units.sqlite → cities/*.json, sizes.json | Active positive solar units: size distributions, daily and weekly sums | Same status/power filter; reconciliation delegated to next script. |
| story-register-verify.py | full.json + cities/* → reconciliation.json | Independently compare monthly extraction to daily/weekly unit sums | Count/power assertions; coverage must reconcile. |
| story_region_key.py | ags-nachfolger-daten.json → current_key helper | Follow official successor chain | Cycle guard; never match by municipality name. |
| story-remap-local.py | Local register cache + successor map → repaired cache + backup | Update local keys and regroup totals/coverage | Refuses overwriting repair backup; checks preserved totals. Local cache mutation, not production DB. |
| story-value-units.py | Official ZIP + explicit municipal keys or --all discovery index → per-city value-units | Extract original unit-level valuation fields | Eight-digit keys required; completion marker/counts; source edition retained. |
| story-commercial-cluster-audit.py | Official ZIP → commercial-cluster audit | Count explicit usage/mode clusters and power; no model change | Unknown usage/mode stays unknown; output is diagnostic, not a household inference. |
| story-discovery-run.ts | Same-edition solar/storage/history, regions, funding, housing, optional yield → discovery reports/index/provenance | Canonical discovery + period/storage/energy/housing/funding/ranking/original-pattern candidates | Solar/storage editions must match; no matching municipalities fails; fingerprints and source archive protect replay inputs. |
| story-original-patterns.ts | Regions, solar rows, source date, optional housing → candidate/coverage helper | 13 editorial patterns using peer/annual cohorts | Valid source date; reject invalid months, duplicates, negative/nonfinite rows per city. |
| story-monthly-additions-build.ts | Fixed historical edition + discovery index → refreshed reports/index | Canonical monthly additions from grouped solar rows | Edition equality required; legacy fixed input date. |
| story-zero-growth-refresh.ts | Fixed historical edition + reports → revised reports | Zero-addition claim only after three consecutive positive years | Matching source edition; removes unsupported claim rather than inventing growth. |
| story-ranking-month.ts | Central complete monthly ranking observations + reports → ranking-month-data and cached reports | Canonical current/previous ranking projection | Rejects absent/incomplete observation; records baseline if no previous month. Read-only remote source. |
| story-ranking-repair.ts | Current register stats + affected-key list → corrected ranking fixtures/audit | Rebuild cohorts after key correction; new baseline | Drops broken-cohort change inference; fixed repair date is historical one-off. |
| story-radial-build.ts | Key, discovery report, stock source, monthly/year weather and daily register → radial-city-data.json | solarMonth + energyYear; stock at year cutoff | Valid key, finite wind baseline; delegated weather rules. Legacy filename-selected stock can mismatch editions: app must validate provenance. |
| story-month-value-build.ts | Monthly radial generation + value cells → month-value-data.json | monthlyElectricityValue with explicit stock assumptions | Requires monthly generation; refuses overwriting historical valuation. |
| story-month-feed-in-build.ts | Paired saved valuation + same stock cells → month-feed-in-data.json | Recalculate paired value; retain feed-in portion/breakdown | Same valuation date; euro discrepancy >.01 fails; existing snapshot cannot be overwritten. |
| story-unit-value-build.ts | Unit inventory + weather + explicit old self-consumption assumption → unit-value-data and detailed audit | unitMonthValue per register unit | Requires explicit assumption; refuses existing version; UTC-derived valuation-date guard currently fails source suite. |
| story-prepare.ts | **Disabled legacy entry point**; intended discovery/detail/stock/weather → prepared per-city files | Resumable monthly/year generation + unit value | Initial throw prevents use; body requires explicit stock/date and validates weather. Replace through central current provider integration, not a cross-checkout import. |
| story-monthly-solar-build.ts | **Disabled legacy Trier fixture**; temporary weather + fixed daily edition → monthly-solar-data | solarMonth for Aug 2026 | Initial throw; old temporary path is historical evidence, not portable runnable input. |
| story-energy-year-build.ts | **Disabled legacy Nidda fixture**; fixed stock/detail/weather → energy-year-data | energyYear for 2025 | Initial throw; old fixed city/year and wind baseline check. |
| story-yield-fetch.mjs | **Disabled legacy weather fetcher**; selected keys/coordinates/years → weather cache | Complete historical years, ordered hourly records | Initial throw; old body checks years, unique municipalities, weather coverage. No automatic fallback to this provider. |
| story-prepared-seeds.ts | Discovery/prepared caches + bundled reports → bundled examples | Replace example findings from matching prepared results | Missing prepared cache is skipped; downstream verify required, not proof of complete national coverage. |
| story-prepared-verify.ts | All prepared editions → validation summary | Reconcile monthly sums, annual day count and money totals | Nonnegative finite values, matching edition, 24-hour radial slots, leap years, feed-in ≤ total value; tolerance max(.001, .001%). |
| story-refresh.mjs | Official local archive + source snapshots → orchestration | Input read → history/detail → discovery → unit valuation → preparation | Stops on child failure; completion markers; currently reaches disabled legacy preparation, so not a turnkey current pipeline. |
| story-prepare-resume.mjs | Preparation args + latest-run → resume state | Re-run prepare/seeds/audits after provider window | Exclusive lock; child failures stop; disabled preparation means it must not be launched as-is. |
| story-pool-verify.ts | Discovery reports/index → pool audit | Report → topic pool → concepts without losing evidence | All 13 original-pattern checks, unique observation IDs/count, categories/time aspects, mapped families, title/evidence preservation. |
| story-template-audit.ts | Discovery reports + radial candidates → template audit | Map every observation to approved visual template | Records unmapped/pending/errors; diagnostic report, inspect counts before release. |
| story-copy-audit.ts | Same reports + storyCopy → copy audit | Evaluate rendered copy per concept/template | Records missing mappings/errors; audit output is not an editorial approval. |
| story-content-audit.ts | Discovery + prepared/radial/value fixtures → content audit | Count available content slots/families | Missing prepared files allowed; distinguishes available content, not funding eligibility. |
| story-bucket-bericht.py | Scheduled search run artifacts → human-readable run report | Assess search findings | Empty national search is failure, not silent success; reporting tool, not page data. |

## Integration invariants

- Use matching register editions, weather provenance and valuation assumptions. An old prepared value must not fill a missing new value.
- Preserve units: installed power (kWp/kW), momentary power (MW), energy (MWh/GWh), money and counts are different quantities.
- `solarMonth`, `energyYear`, `unitMonthValue`, `monthlyElectricityValue` are the calculation sources; the page must not recalculate independently. Their full source and tests are in the secured source overlay/base.
- Historical comparisons need the actual reference period and unchanged population/cohort/rules; do not substitute the nearest available month.
- A complete source backup is not proof that all fixtures agree. Source tests and disabled entry points are recorded in HANDOFF.md.
- New central-app adapters must replace the prototype's fixed key, input dates and cache filenames. This handoff deliberately does not implement national expansion.
