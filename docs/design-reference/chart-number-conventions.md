# Chart number typography

User decision, 14 September 2026. Applies to detail charts, social visuals and derived teasers.

- The numeric value is primary: display font, bold, proportional figures, normal letter spacing.
- Magnitude suffixes (`k`, `M`) and units (`%`, `kWp`, `Anlagen`, etc.) are secondary: smaller, lighter real font weight, body font with narrower forms, and muted theme text color. Never include them in the bold number string.
- Use shared `--atlas-number-unit-*` tokens and `StoryNumber`; no per-story typography overrides. Default secondary scale is 0.55em with an 11px readability floor, weight 400, secondary text color. Do not artificially squeeze glyphs.
- Keep suffixes and units close to the value and on its baseline. A leading plus is vertically centered, as established for percentage flags.
- Display large values with k/M and no decimals where requested. Preserve raw precision for calculations and chart geometry.
- Derive teaser typography from the same rules. Do not shrink a complete detail card until its units become unreadable.
- Treat magnitude suffix and physical unit as separate information; do not drop or silently change the unit when abbreviating.

## Chart header and story copy

Default agreed 15 September 2026: detail visuals start with the headline and data date (Stand). Narrative explanation belongs to the story copy outside the chart, not in the chart header. Compact teasers omit this header because their title is already beside/below the visual. Chart labels and a necessary scale key remain inside. Exceptions must be explicitly agreed. For the installation-count chart, the percentage unit is below the donut number, the arc has a rounded end, and the selected installation count uses the theme accent.
