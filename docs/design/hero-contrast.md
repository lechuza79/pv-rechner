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
