# Shared hero scene (local integration)

Source owner: this worktree, `public/hero-system/source/`. Extracted from the reviewed homepage prototype on 2026-09-17; original file fingerprints and upstream location are in `upstream.json`. Upstream prototype and its server were not edited by the municipality task.

## Boundary

`mountHeroStage({root, stage, scene, state, quality, motion, layout})` returns `update({state?, quality?, motion?})`, `resize()`, idempotent `dispose()`, `triggerGust()`, `simulateLoss()` and a `moonDescription` getter. `update` also accepts sunStyle and moonPhase.

- `root`: an independent `.solar-page` wrapper; `stage`: its `.hero`; `scene`: its existing `.scene` markup. No global lookup chooses a rendering target.
- `state`: normalized output of `sceneState(date, location, weather)`; keys are phase, cloud, rain, wind, direction, sunX, sunY, daylight and season.
- `quality`: auto / low / high / static; `motion`: boolean, combined with the user's reduced-motion preference and the existing pause control.
- `layout`: panels='3d', foreground='branch', foregroundOverlay boolean. Homepage foreground overlay is enabled; municipality composes into the same main canvas. Preview-only actor/debugWetFilm options are optional.
- Host owns navigation, text, buttons, location selection, weather fetching, consent and data readings. `municipality.js` is the small Höchberg host adapter, using the existing shared weather request.
- `instances.js` defines the homepage and municipality profiles. The homepage consumer now imports this same source through its build aliases (HERO_SYSTEM_SOURCE). Independently verified on port 4180: shared root marker, one main canvas, one foreground overlay, ready scene and no captured JavaScript errors.

## Rendering/performance behavior

Preserves upstream panel geometry/materials/camera, cooperative tree construction, async shader preparation, minimal tree textures, first-paint-delayed renderer import, 30fps drawing cap, DPR limits and automatic quality downgrade. No panel photograph is loaded in the 3D path. Neutral existing sky is visible while the canvas prepares/fades in. The moon texture is loaded on first night use. Animation stops offscreen, while the document is hidden, during scrolling, and when paused/reduced-motion. Each instance owns its listeners, observers, GPU resources and disposal. Host first-view HTML and local fonts remain available before JS; critical fonts are preloaded.

`node scripts/hero-system/build.mjs` builds the shared modules and municipality entry. It uses the homepage's installed locked dependencies read-only; this is a local preview build, not a production pipeline. Both consuming builds should import this source, not copy it. A future production package needs a normal dependency installation and an appropriate asset route. The moon URL is already configurable through `assets.moonTextureUrl`; each host profile supplies its existing asset path.

## Verification

`node --test scripts/hero-system/*.test.mjs`: source-option/shell guards plus bit-for-bit tree geometry comparison. The shell guard failed against the old image-panel integration before its replacement.

Browser integration test: `http://localhost:4196/hero-system/qa.html`. It mounts two instances and checks isolated state changes, distinct foreground ownership, no daytime photo/moon requests, pause without continuous rendering, WebGL-loss fallback, cleanup before/after async boot, and remount. All 14 final browser assertions passed, including static quality and homepage demo controls.

Mobile 390×844: no horizontal page overflow; measured scene ~29–30fps and ~0.8–1.0ms CPU/frame on this desktop host. Not a real phone/GPU benchmark, not a comparable speedup measurement. Existing page cards, story details and header/footer remain host-owned.

Local-only; no merge, push or deployment.

Additional rendered check: scrolling the municipal hero fully offscreen left renderCount at 654 across successive observations and data-moving=false. Pause likewise held renderCount at 649 until resumed.

Shared source location is referenced by the homepage build: keep this worktree while the local design session continues. Before eventual teardown, move the common source to its accepted permanent location and update both consumers; never delete a source directory still used by another active preview.
