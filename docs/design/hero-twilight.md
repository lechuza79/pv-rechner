# Sky exposure and weather layers

Accepted for release by the operator, 2026-09-25. Branch: codex/sky-twilight.

The sky's diffuse illumination is separate from direct sun and foreground
lighting. `solar-light.js` contains an artistic exposure curve driven by local
solar elevation, not fixed hours or a claim to measured luminance. Twilight
and night blend continuously; the foreground retains its separate exposure.
Reference reviews: Höchberg, 25 September 07:20 and 24 September 19:24/19:40.
Photographs guide relative sky/foreground appearance, not absolute luminance.

The weather adapter forwards optional low/mid/high cloud fractions. Missing
layers remain null and use an explicitly visual total-cloud fallback. Zero
means clear and must not become missing. Cloud layers are an illustration, not
reconstructed observed cloud shapes. Only weather codes 45/48 enable fog.
A weak depth transition behind the panels remains independent of actual fog.

Homepage/simulation retain their existing host bundle, navigation and inputs,
but import sceneState, validateWeather and mountHeroStage from the shared scene
build. `scripts/hero-system/link-homepage.mjs` replaces only AST-delimited old
scene functions and fails on ambiguous input. Run the shared build after any
legacy homepage reimport. No package source is modified.

Checks: solar-light.test.mjs, hero-contract.test.mjs, hero-contrast.test.mjs,
lib/__tests__/szene-wetter.test.ts; local rendered reference times with explicit
weather fixtures. The production build passed on 2026-09-25. Full route checks are part of the
release verification.

Horizon colour now uses a transparent-to-warm gradient confined to the lower
sky. Its intensity is attenuated by low cloud, total cloud and explicit fog;
high cloud does not automatically produce red skies. This remains an artistic
approximation, not a prediction of observed sunset colour. The weather
attenuation test was verified by removing the multiplier (fails) and restoring
it (passes).

Rendered checks completed against the shared scene on the local server:
19:24 at 1440px, 19:40 at 390px, fog at 1440px and night at 390px. No horizontal
overflow in those fixtures. The warm band was moved above the panel edge after
image inspection. These isolated scene checks do not certify the full page's
asynchronous data flow; that check still timed out in this environment.

Shared header fixes in the same release: search uses regional contrast sampling,
a borderless input and grouped mobile controls. Entry animations use backwards
fill so their completed opacity animation no longer traps button backdrop blur.
