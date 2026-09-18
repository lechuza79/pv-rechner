# Homepage layout conventions

Project-owned styles use semantic roles from `public/homepage-study/homepage.css`.
Do not edit the retired scene package for layout changes.

- Content rail: `--sc-layout-content`, 1000px maximum. Section padding remains
  responsive. Person card stays at 900px; the intentional full-bleed story strip
  stays full-bleed. Text-only paragraphs cap at `--sc-layout-reading`, 680px.
- Hero headline: `--sc-type-hero-size`, desktop max 48px. Section headline:
  `--sc-type-section-size`, 26–34px. Compact section headline: 24–30px.
- Body: 16px / 1.6, including person card copy, attribution and reassurance.
  Button and link labels must remain legible independently of card dimensions.
- Hero actions remain stacked and equal width. Hero copy aligns with the centered content rail while the scene stays full bleed.
  The secondary action uses a 78% dark fill and light text; blur is decorative,
  not required for contrast (white is the worst-case scene background). The repeated trust
  line is omitted in the hero; the person card retains that reassurance.
- Footer column dividers follow the four/two-column grid; rules are centered in the gaps. The two-column grid uses one continuous
  vertical divider without fragmented horizontal rules.
- FAQ headings are secondary labels. Question rows are at least 92px high;
  disclosure uses chevrons and a reversible height transition, respecting
  reduced motion and native details behavior without JavaScript.
- Charts reflow internally; do not scale their entire SVG to enlarge a widget.
  See `race-chart-vorlage.md` for shared sizing and the homepage bundle rebuild.

Local validation targets: 393px, 1280px and 1920px. This is browser viewport
validation, not a claim of physical iPhone/Safari testing.
