# Responsive sizing: homepage and simulation

Canonical page roles live in `public/homepage-study/homepage.css`. Both routes must consume these roles; do not introduce larger simulation-specific desktop overrides.

| Role | Token | Limit |
| --- | --- | --- |
| Content | `--sc-layout-content` | 1000px |
| Reading text | `--sc-layout-reading` | 680px |
| Standalone widget | `--sc-layout-widget` | 760px |
| Hero form and result | `--sc-layout-form` | 440px |
| Hero heading | `--sc-type-hero-size` | 34–48px |
| Section heading | `--sc-type-section-size` | 26–34px |
| Compact section heading | `--sc-type-section-compact-size` | 24–30px |
| Form/result heading | `--sc-type-form-heading-size` | 20–28px; mobile 20px |
| Card heading | `--sc-type-title-size` | 20px |
| Body | `--sc-type-body-size` | 16px |
| Result number | `--sc-type-metric-size` | 24–36px, container-relative |
| Section spacing | `--sc-space-section` | 72px |

Use the shared page gutter and hero inset. Width caps do not replace mobile gutters. Entry and result must share heading geometry and fixed number slots so loading/counting does not move surrounding content.

## Charts and widgets

- A wider container changes plot geometry, not the size of all its contents.
- Measure the actual container with ResizeObserver. For SVG charts, one viewBox unit must equal one CSS pixel at the rendered width.
- Keep axis type tied to typography tokens and chart height bounded. Never stretch a fixed-width SVG with `height:auto` for responsive application charts.
- Legends wrap independently; reduce tick density if needed rather than shrinking all labels.
- Embedded documents have their own token scope. Pass the approved theme through the existing widget theme interface; do not assume host CSS inherits into an iframe.
- Check narrow mobile, intermediate widths, and desktop. Check both empty/loading and populated states. A type check alone is not visual acceptance.

Applied to the simulation introduction/result, explanation cards, live section, and SimulationPanel daily chart. These rules do not claim that every legacy chart elsewhere has already been migrated.
