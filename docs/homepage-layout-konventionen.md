# Homepage layout conventions

Project-owned styles use semantic roles from `public/homepage-study/homepage.css`.
Do not edit the retired scene package for layout changes.

- Content rail: `--sc-layout-content`, 1120px maximum. Section padding remains
  responsive. Person card stays at 980px; the intentional full-bleed story strip
  stays full-bleed. Text-only paragraphs cap at `--sc-layout-reading`, 680px.
- Hero headline: `--sc-type-hero-size`, desktop max 56px. Section headline:
  `--sc-type-section-size`, 28–40px. Compact section headline: 26–34px.
- Body: 16px / 1.6, including person card copy, attribution and reassurance.
  Button and link labels must remain legible independently of card dimensions.
- Hero actions remain stacked and equal width. The secondary action and trust
  line use stable light surfaces to remain readable over animated foliage.
- Footer column dividers follow the four/two-column grid; no divider before
  the first column of a row.
- Charts reflow internally; do not scale their entire SVG to enlarge a widget.
  See `race-chart-vorlage.md` for shared sizing and the homepage bundle rebuild.

Local validation targets: 393px, 1280px and 1920px. This is browser viewport
validation, not a claim of physical iPhone/Safari testing.
