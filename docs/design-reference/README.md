# Local design reference — 11 September 2026

Source confirmed with the Hero session. The full stylesheet cascade is nav → person → footer → dynamic hero → homepage → experiments. Unmodified snapshots and hashes are in sources.json. This is the current local design, not a released or consolidated production theme.

The editorial view and portalled story dialog share atlas-foundations.module.css. Dark is the current homepage default; light retains the Atlas surface, highlight applies the same lime palette. Heading and chart numbers use the supplied Montserrat Bold 700 font; the source requests 600 for buttons but only supplies the 700 file, so buttons use the available real weight. Body remains DM Sans. Secondary actions are monochrome outlines.

Neon illustrations, motion artwork and splashes are available under public/design-assets, without adding decoration to existing charts. Navigation, person and footer references are preserved for integration into the new municipal page; the existing internal admin navigation is not replaced by a consumer navigation. Hero weather behavior is not part of an editorial chart.

For future updates compare the source hashes and update the shared foundation, rather than patching individual stories. No release or main merge.
