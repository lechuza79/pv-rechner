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

### Autumn-to-winter prototype (local review)

`/hero-system/autumn-study.html` mounts the shared stage with date, wind and pause
controls. `source/seasonal-foliage.js` owns the visual calendar (Europe/Berlin):
colour progresses from mid-September to mid-November; leaf loss from October to
the beginning of December. These are art-direction curves, not local phenology
observations. The spring transition is outside this pass.

`tree-species.js` supplies stylised linden and maple crown settings, heart-shaped
and lobed leaf outlines, neutral vein textures and separate yellow/gold-orange
palettes. These are recognisable approximations, not botanical tree models.
Colour and shedding seeds are independent so autumn-coloured leaves do not all
disappear before the green ones. The colour shader removes the old green tint
from the texture luminance before applying the autumn palette.

`foreground-leaf-fall.js` adds nearby leaves in front of the roof, through the
existing foreground renderer and panel camera. Its off-screen canopy emitter
starts gently during early colouring, shares the scene wind and motion clock,
and clears in winter. The side-entry pool is capped at 9 leaves, 5 on narrow screens; up to 4 more detach from the near branch.
Leaves enter from the upwind side below the middle of the view, never from the
top: the camera looks across a roof, with nearby crowns beside/below it.
The wood and attached foliage share a crown deformation in `prepareTreeWind`;
separate leaf flutter makes a breeze visible without strongly rocking trunks.
`wind-motion.js` owns the shared gust envelope and layered response. A quick
onset and slower decay release leaves in bursts, followed by quiet gaps; the
manual gust uses that same envelope. Leaf flutter saturates while trunk sway
engages mainly above 25–30 km/h. The study now spans 0–90 km/h; normalization no
longer clips at 36 km/h. This is a Beaufort-informed visual approximation, not a
wind measurement or a structural model; storm damage is not simulated.
Validation: `wind-motion.test.mjs` covers calm, signed direction, progressive
response, bounded flutter, quiet intervals and manual-gust leaf release.

Reference: https://wettergefahren.de/warnungen/windwarnskala.html (weak wind moves
thin twigs; small deciduous trees begin swaying around 30–35 km/h).

Timing reference: https://www.lwg.bayern.de/gartenakademie/gartendokumente/gartencast/296156/index.php
describes oak coloration around 20 October and leaf fall in early November,
with local climate/site variation; this supports only the broad autumn window,
not exact dates for the illustrated species. Linden leaf shape and yellow autumn
colour: https://www.lfl.bayern.de/iab/kulturlandschaft/184720/index.php.

`sceneState` carries independent `foliage.color` and `foliage.loss` values. Both
background trees and foreground foliage consume them through `seasonal-leaves.js`.
Stable per-leaf seeds keep crossed leaf cards together and avoid recolouring the
whole crown at once. `falling-leaves.js` samples the actual tree geometry; its
bounded pool (96 leaves, 40 at low quality) follows the stage wind and animation
clock, including gusts and pause. New stage renderers can reuse the calendar and
material adapter; the particle field expects tree geometry and shared world units.

Validation: `node --test scripts/hero-system/seasonal-foliage.test.mjs
scripts/hero-system/falling-leaves.test.mjs` covers annual boundaries, thinning,
wind reversal, pause, winter clearing and the low-quality pool. Build with the
existing shared build command before opening the study. Local only; no release.

`node --test scripts/hero-system/*.test.mjs`: source-option/shell guards plus bit-for-bit tree geometry comparison. The shell guard failed against the old image-panel integration before its replacement.

Browser integration test: `http://localhost:4196/hero-system/qa.html`. It mounts two instances and checks isolated state changes, distinct foreground ownership, no daytime photo/moon requests, pause without continuous rendering, WebGL-loss fallback, cleanup before/after async boot, and remount. All 14 final browser assertions passed, including static quality and homepage demo controls.

Mobile 390×844: no horizontal page overflow; measured scene ~29–30fps and ~0.8–1.0ms CPU/frame on this desktop host. Not a real phone/GPU benchmark, not a comparable speedup measurement. Existing page cards, story details and header/footer remain host-owned.

Local-only; no merge, push or deployment.

Additional rendered check: scrolling the municipal hero fully offscreen left renderCount at 654 across successive observations and data-moving=false. Pause likewise held renderCount at 649 until resumed.

Shared source location is referenced by the homepage build: keep this worktree while the local design session continues. Before eventual teardown, move the common source to its accepted permanent location and update both consumers; never delete a source directory still used by another active preview.

## Spatial leaf motion (local autumn study)

`leaf-physics.js` converts normalized wind back to km/h, then m/s. The previous
screen-speed multiplier is removed. Both layers integrate drag toward a local
air velocity plus independent smooth eddies in three dimensions. Camera depth
and projection determine pixel speed. Release opportunities have random minimum
gaps; no emitter can flush a backlog as a synchronous group.

Calibration assumptions: near scene unit = 8 m (a 0.012-unit leaf is ~10 cm),
tree scene unit = 0.5 m (24-unit trunk ~12 m). These layers were authored with
separate cameras and are not a surveyed common scene. Roof/optical focus retains
its own existing art direction. Local wind exposure (0.55), drag response and
settling speeds are modelling assumptions, not measured species coefficients.
Reference for why weather wind is not local leaf velocity:
https://www.metoffice.gov.uk/blog/2025/what-is-wind-and-how-do-we-measure-it

Near-branch leaves retain their pose, material and blur as they detach, leaving
an actual gap. Background release masks the selected crossed leaf cards in the
crown. Changing the preview season resets detached foliage. Background falling
leaves remain small stylised particles, not a structural branch simulation.
Tests cover SI conversion, 30/60fps consistency, distinct trajectories, source
masking, exact release pose, direction, pause and winter clearing.

## Accepted stage integration — 5 October 2026

The autumn/tree iteration is approved for the shared stage. All runtime behaviour
lives under the shared source, not inside `autumn-study.html`; that page only
supplies date/weather controls. Both homepage and municipality entry points use
the shared stage and scene state. Keep this one implementation when moving to
the new stage; replace the layer calibration assumptions with its world scale.

Validated: all 47 hero-system tests pass; the normal municipality stage loads
the shared bundle at 30fps locally. The static preview server cannot render the
unrelated server-side story widgets (404), so this is scene acceptance rather
than a complete site release check. No public deployment is included.
