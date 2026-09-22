# Portable municipality prototype

This branch is the design/source handoff for replacing the old municipal Atlas page for all municipalities. It is not the integrated production page. Claude owns Next.js integration, server rendering and central data adaptation. Do not deploy this static preview as the replacement.

## Reproduce from this branch

Run from the repository root with Node/npm matching package.json:

```sh
npm ci
node --import tsx scripts/municipality-preview/server.ts --build-only
PORT=4196 node --import tsx scripts/municipality-preview/server.ts
```

Open `/atlas-design-preview/index.html?displayfont=montserrat-bold`. Choose a free port; do not stop somebody else's server. No environment file, database access or raw cache is needed for the initial saved prototype. The live solar-day endpoint still needs network access to its weather service; saved story/monitor snapshots do not. This is a loopback development server with noindex headers and no-store responses, not a production server.

All source resolution is checkout-relative through `paths.cjs`. `vendor/story-source` contains the transitive story sources and explicit preparation imports; `vendor/site-source` contains footer, map and weather-provider dependencies. `vendor/source-manifest.json` records original source hashes. Public assets, shared navigation/footer, person component and the three used illustration motifs are tracked in this checkout. Inline motion image bytes were losslessly externalized into content-addressed local files; drawing geometry was retained. There is no sibling-worktree or shared ChatGPT-directory fallback.

The server builds CSS/client bundles into `build/`. It does **not** regenerate stories or charts on startup. The optional `--prepare` switch reads local raw inputs and overwrites `stories.json`/`charts.json`; use it only with matching inputs. Other preparation commands and their limits are documented in [DATA-PREPARATION.md](DATA-PREPARATION.md). Raw inputs are deliberately excluded from Git and the archive.

```sh
node --test scripts/municipality-preview/header.test.mjs scripts/municipality-preview/rank-comparison.test.mjs scripts/municipality-preview/monitor-periods.test.cjs scripts/municipality-preview/portability.test.cjs
python3 scripts/municipality-preview/pack-assets.py
```

The last command validates every explicitly listed asset and creates a deterministic `build/handoff-assets.tar.gz`; Git already contains the assets. Download locations, source classification and SEO gaps are in [HANDOFF.md](HANDOFF.md). Older `reference/`, `shared/` and the root `source-manifest.json` are historical copies; only the weather route's transitive `reference/` dependencies remain active. The current build input record is generated at `build/story-sources.json`.
