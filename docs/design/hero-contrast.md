# Scene-derived hero typography

The host reads the computed sky gradients, their opacity and brightness filters
at each text region's vertical position. It composites the visible sky layers
and selects the foreground with the best minimum contrast across the region.
Header, headline, paragraph and actions are independent. No backgrounds, masks,
filters or backing surfaces are added to the scene.

The default dark ink is #122c3b. White handles dark skies; black is a foreground
fallback for midtones where the brand ink is too weak. A previous tone only
survives hysteresis while it remains readable. Foreground changes do not animate
through low-contrast intermediate colors. Mobile buttons and legacy logo/night
CSS must not override the controller's region decision.

New colors in the existing vertical CSS sky gradients are picked up from
getComputedStyle, not from a second hand-maintained palette or a time-of-day
threshold. New rendering techniques (images, differently oriented gradients,
canvas-based skies) must supply equivalent background samples before adoption.

`node --test scripts/hero-system/hero-contrast.test.mjs` checks the production
policy against the existing sky gradients, brightness and position grid, flat
black-to-white range, hysteresis and absence of backing surfaces. The current
51,005 sampled sky colors pass the foreground selection check. This is a math
check of sky colors, not 51,005 rendered screenshots or a whole-scene WCAG audit.

The runtime data-hero-contrast attribute reports the minimum modeled sky contrast
of a region. It is diagnostic, not proof about every rendered pixel: moving
foreground objects, clouds and the sun are not included in this sky model.
Inspect these visually when changing their placement or opacity. A mixed region
may still have a lower minimum than any single-point test; never label the whole
scene universally guaranteed from the color-grid result.

2026-09-19: Local homepage daytime and a production-markup/CSS fixture with
mobile dusk at brightness .5 checked visually. Original transparent look retained.
No real iPhone Safari hardware test in this run. Not released.

Transparent homepage and simulation-result actions are sampled individually at their own positions. Result insertion also schedules a fresh measurement; text, border and directional icons share the selected foreground. The neon primary action keeps its fixed dark-on-neon colors.

## Painted button backgrounds (2026-09-20)

Transparent hero actions now use `public/hero-system/contrast-sampler.js`.
The CSS sky calculation remains an initial fallback, not the final button measurement.
At the end of a requested scene frame, the sampler snapshots visible background
canvases with `createImageBitmap`, downsizes them, and freezes the computed CSS
of the background layers only. A detached SVG/foreignObject composes those layers
including filters, blend modes and the stage gradient. Navigation and text are
never captured. Nothing is uploaded, persisted or overlaid on the visible page.

The measured area is the central text band of each actual button rectangle,
including its translucent fill. Choose the strongest ink from white, brand-dark,
and black (only when brand-dark fails). The 10th–90th luminance percentile excludes
isolated particles/leaf pixels. This is a robust contrast estimate, NOT a claim
that every pixel of a heterogeneous scene meets WCAG. Hysteresis retains a safe
existing color; unsafe old colors are replaced. Failed/incomplete captures retain
the fallback; diagnostics identify the failure instead of reporting success.

Capture runs after initial paint and relevant scene/position changes, debounced
350 ms. A one-second lightweight signature check detects sky/filter/position
changes; settled animation does not repeatedly read pixels. A dedicated request
can wake a paused renderer for one frame. Resize/route changes invalidate pending
captures; disposed hosts release observers/timers. Reduced-motion uses the same
single-frame path, without forcing continuous animation.

### Shared host contract

Homepage and simulation register their existing secondary action selectors.
The shared hero-stage source AND shipped bundle use the same sampler; new municipal
host actions should use `data-sc-contrast` (or existing `secondary-cta`). The host
must keep every painted background inside the scene, foreground layer, transition
wash, or hero pseudo-elements. Adding another background layer requires including
it in `layers()`. New shades using existing layers need no luminance thresholds.
No host may replace a measured button decision with its sky-only fallback.

### Verification scope

Chromium local preview: homepage day and night at 708×793, dusk at 1440×900,
then mobile dusk and rain at 393×852. Captured background was visually compared with the rendered
scene, including trees, panels, foreground branch and gradients. Latest asynchronous
measurements: night 7 ms synchronous preparation / 207 ms total; desktop dusk
30 / 260 ms; mobile dusk 17 / 218 ms; mobile rain 5 / 84 ms. These are individual observations on this
machine, not cross-device guarantees. Earlier synchronous prototype took 295 ms
and was replaced. Nine regression tests pass, including the full flat brightness
range, stale colors, outlier particles, and render lifecycle wiring.
The municipal integration is shared-stage wiring; its actual customer-facing
host is not present in this checkout, so a municipality browser acceptance check
is still required there. Safari/Firefox have not been visually checked.
