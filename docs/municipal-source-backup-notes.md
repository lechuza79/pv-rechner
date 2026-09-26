# Municipal source backup

Branch: `codex/kommunen-templates-sicherung`.

The original, unmodified selection and SHA-256 fingerprints are in `municipal-source-backup-selection.json`. Its exact original bytes remain in the private GitHub draft release `municipal-source-backup-2026-09-22`, asset `municipal-story-source-2026-09-22.tar.gz` (SHA-256 `5936ac640c0190d74f93535537e001c5eee821ed128582d9e3119e465f31534a`), to overlay on base `7405774ffd4d1a308de85c4fee6d8a02a0b1f451`.

This backup commit additionally corrects the eight pre-existing failing assertions without bypassing the regular hook:

- AnnualEnergyChart, MonthlySolarChart and StoryDiscoveryPool use the existing SelectField component.
- YieldChart takes the reference-label font size from the shared scale.
- The embed route registry includes the existing story-preview route.
- Valuation preparation uses the German calendar day for valuation dates; legacy weather preparation remains disabled.
- Story-set tests locate the intended evidence by stable story identity instead of old array positions and allow the expanded set while retaining evidence/value checks.
- The shared-card test verifies delegation without fixing an obsolete visual palette.

Changed paths relative to the original inventory: `components/social/AnnualEnergyChart.tsx`, `components/social/MonthlySolarChart.tsx`, `components/social/StoryDiscoveryPool.tsx`, `components/social/YieldChart.tsx`, `lib/embed-herkunft-core.ts`, `lib/__tests__/seitenform-eine-quelle.test.ts`, `lib/__tests__/story-city-sets.test.ts`, `scripts/story-prepare.ts`, `scripts/story-unit-value-build.ts`. The original inventory deliberately continues to describe the pristine archive, not these corrections.

No raw caches, environment files, production database changes or deployment are included. SSR and central application integration remain with Claude; see the current handoff on `codex/kommunenseite-design` in `scripts/municipality-preview/HANDOFF.md`.
