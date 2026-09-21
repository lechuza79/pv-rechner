# Local shared feature-card candidate

`feature-card.css` exposes a three-slot layout: `.sc-feature-visual`, `.sc-feature-content`, `.sc-feature-action`, each a direct child of `.sc-feature-card`. Artwork/content align at the top; the secondary action spans both columns with a 24px gap (20px below 600px). Municipality uses this stylesheet directly. Surface tokens match the canonical homepage `SURFACES.md`.

`--sc-profit-fill` and `--sc-profit-ink` style `.sc-profit-amount`. They are local design candidates, not approved global success tokens. `profit-study.html` compares CI lime, the existing positive green and a green outline on identical surfaces. No production theme was changed.

The homepage owner was consulted and deferred extraction during its performance audit; this is ready for later shared adoption, not yet used by the homepage.
