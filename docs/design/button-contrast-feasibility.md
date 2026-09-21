# Button background sampling: bounded feasibility check

2026-09-20. Local simulation only. No production change and no shared municipal renderer change.

## Measured

Target: “Und in 20 Jahren?” at 708 × 793 CSS pixels, target area 318.25 × 57 CSS pixels, Höchberg postcode 97204, current daylight scene. Codex in-app browser on the current development machine. This is not a Safari/iPhone performance result.

Each probe ran synchronously immediately after the unified renderer completed its frame. Forty samples, throttled to at most four samples/second. Values below measure the sampling callback, including pixel transfer and summary calculations, not the complete frame time.

| Method | Median | Maximum |
| --- | ---: | ---: |
| Canvas copy of button region into 64 × 12 canvas + getImageData | 64.8 ms | 196 ms |
| Direct WebGL2 readPixels of button region + sparse CPU summary | 46.4 ms | 89.9 ms |

These two synchronous paths are unsuitable for recurring production sampling on this measured machine. A 30 fps scene has only about 33 ms per frame. Small output dimensions did not make the GPU synchronization cheap. This does not establish the speed of an asynchronous GPU implementation, which was not built in this check.

The sampled region contains real nonzero pixels with mean alpha around 0.54. It is the transparent 3D layer (trees, haze and panels), NOT the browser-composited background. CSS skies, clouds, sun effects, blend modes, foreground overlay and bottom wash must all participate in a complete background measurement. Direct GPU RGB is premultiplied; it cannot be treated as opaque final background RGB. Neither probe changed the button's color.

## Consequence

The existing sky-gradient-only policy does not establish actual button contrast. Do not promote its successful palette tests into a whole-scene guarantee, and do not tune a white/dark threshold using this incomplete readback.

Recommended implementation direction: the shared stage must own a complete background-composition path, reuse its visual inputs/layer order for a low-resolution luminance target, and reduce the relevant button regions on the GPU. Read the small result asynchronously, outside the frame's critical path. Validate that the luminance target matches rendered reference crops before enabling foreground selection. If CSS effects remain outside that composition, the implementation is incomplete and must not claim pixel-based whole-scene measurement.

This is a shared-renderer task, not another local CSS override. The complete compositing path and async readback have NOT been implemented or benchmarked here. Multi-viewport and municipal parity are still outstanding. For mixed backgrounds, retain a luminance distribution across the glyph region instead of deciding from a single central pixel or a whole-button mean; this check does not prescribe a threshold.

## Reproduction and cleanup

Diagnostic sources are archived under `scripts/hero-system/experiments/button-pixel-probe-{copy,direct}.js`. In the experiment, a temporary hook invoked `window.__scContrastProbe(canvas)` synchronously at the end of the compiled unified renderer, before returning frame statistics. A query-gated import loaded one probe. Samples were read from the button's `data-pixel-probe` attribute.

The hook, query import and public diagnostic script were removed after measurement. Normal preview performance and the prior color policy are restored. The experiment is deliberately not wired into any production entry point.


## Follow-up: once after render, using the existing DOM export engine

The owner explicitly accepts showing an initial foreground and correcting it after one measurement. This removes the need for per-frame readback. It does not remove the need for a faithful composed background.

Tested existing `modern-screenshot` with a query-gated probe of the same single button and viewport. First attempt: 128.1 ms synchronous canvas freeze, 19,906.5 ms total; the resulting image omitted the 3D canvases because the export engine's canvas-to-image replacement did not retain the snapshot lookup attributes. Rejected before any color change.

Second approach: detached clone with frozen computed styles and explicit image replacements for all five canvases, captured immediately after the stage render. One completed measurement: 3,993 ms synchronous preparation, 6,122.2 ms total. The image included trees, panels, branch, haze and the bottom edge. The sky appearance still differed visibly from the current stage (capture timing versus later weather settling and/or CSS composition requires investigation). No parity claim is made. No color decision was applied from this image.

This full DOM-export path is unsuitable as implemented, even once after load, because of the large blocking work. These are measurements of the prototype, not a lower bound on all possible one-shot implementations. Do not infer that a renderer rewrite is required merely from this failed export approach. An event-driven once-after-settling design remains the accepted UX direction.

Source archived: `scripts/hero-system/experiments/button-one-shot.js`. Temporary runtime hook, query import and public bundle removed; normal preview restored. No shared-stage or municipal rollout.
