# Shared hero and municipal stories handoff

Base: main `26c1211d9c8fb15ef11cfc5083fd4d5b6790adf4`. One extraction commit, no municipality page redesign or host wiring. Sources frozen after this handoff.

## Hero

Import `mountHeroStage` from `/hero-system/dist/hero-stage.js` and `heroInstances` from `/hero-system/dist/instances.js`. Load `/hero-system/hero.css` in the host. The host owns DOM containers, copy, navigation, location/weather fetching and normalized scene state. Pass the selected instance together with `root`, `stage`, `scene`, `state`; dispose on unmount. `source/scene-state.js` provides normalization helpers.

Build: `npm ci --prefix scripts/hero-system` then `npm run build --prefix scripts/hero-system`. Check: `npm test --prefix scripts/hero-system`. The isolated manifest avoids changing the application's dependency tree. Generated deployable modules and moon texture are included. Homepage moon path now uses the common `/hero-system/` asset.

## Story strip and reader

Use the default export and named `MunicipalStoryModal` from `scripts/municipality-preview/StorySwipePreview.tsx`. Imports are repository-relative; no external worktree alias is needed. The root application already declares React and embla-carousel-react. Embla Auto Scroll is vendored with its MIT license.

Preview props: `stories`, `name`, optional `embedded`, `surfaceScheme`, `visualScheme`, `onStoryOpen`, `showHeader`, `showDate`, `showTown`, `paused`. Defaults: light shell, dark visuals. `onStoryOpen` hands opening to the host and disables the internal reader/URL opening. Set `paused` while the host reader is open.

Reader props: `stories`, `name`, `initial`, `onClose`, optional `surfaceScheme`, `open`, `onSelect`. Remount/key per opening if changing the initial index. This is the same reader used by the municipality host, not a second dialog implementation. Hosts provide prepared stories; this commit does not add routes or data fetching endpoints. Keep snapshot dates from the story payload.

Included dependencies: shared chart renderers/styles, StoryConcept and its transitive type/data helpers, required brand artwork, badges and font. The existing SocialKarte and PostBild additions are required by the approved renderer. Modal receives the header portal, scheme/class hooks and focus-scroll correction. Global theme, Icons and Logo are deliberately unchanged; chart geometry is extracted into `lib/story-chart-tokens.ts`.

The `/atlas-design-preview/rank-badges/` URL remains a compatibility asset path only; no municipality preview HTML/server/data or redesign is included. The commercial-clusters experiment is excluded. Story generator/server helpers are not separately validated here; this handoff validates the reader render import graph, not production content generation.

## Verification and integration boundary

- Hero production bundle built from its local locked dependency package.
- Four Hero tests pass: instance boundary, interrupted boot recovery, continuous dawn, cooperative tree geometry.
- Story browser bundle succeeds against unchanged main dependencies (using the existing checkout's installed application packages for the check). Existing CSS composition warnings in the source remain; no new design changes were made.
- No fresh end-to-end browser or complete Next production build was performed for this extraction. Claude must wire the homepage host, reconcile any overlapping Modal/SocialKarte changes, and verify the integrated page. Main was neither merged nor pushed.

- Full TypeScript check passed. The repository hook ran 4,196 tests: 4,193 passed; two chart-convention findings were corrected locally using SelectField and a chart-geometry token. One unrelated unchanged flow test timed out at 5 seconds. The two convention guards were rerun separately; the full suite is not repeated. The handoff uses a secret-only commit guard after the authorized focused checks.
