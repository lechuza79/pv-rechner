# Niedersachsen preparation trial — 2026-10-04

Status: isolated geometry preparation verified; not published or release-ready.

## Reproduction

Worker: `scripts/landscape-municipality-worker.py`; tests:
`scripts/tests/test_landscape_municipality_worker.py`.

Executor: existing Hetzner server, isolated root
`/opt/solar-check-landscape/candidate-tests/ni-v1`.
Inputs reuse the existing national register, prepared municipality inventories,
BKG municipality geometry, Geofabrik Niedersachsen extract and cached official
LGLN terrain/building tiles. No model calls or new paid services in preparation.

Run with the existing server Python environment:

```sh
python scripts/landscape-municipality-worker.py --root "$candidate_root" \
  --municipality "$municipality" --osm-file "$niedersachsen_extract"
```

The worker refuses existing output directories. Both municipalities used identical
code and were processed serially by `solar-check-ni-two-town-test.service`:

| Municipality | Buildings | Wind units | Linked solar footprints | Scene bytes |
| --- | ---: | ---: | ---: | ---: |
| Dötlingen (03458003) | 784 | 24 | 1 | 3,340,835 |
| Wardenburg (03458013) | 1,623 | 12 | 0 | 5,175,960 |

Measured server run: 05:32:41–05:37:03 UTC, 4m22 elapsed, 4m15.679 CPU,
1.7 GB peak memory, no swap. Source tiles were already cached; this does not
measure first-time downloads or predict nationwide preparation time.

A final nonblocking per-root worker lock and initial disk-space guard were added
after the two-town run. Seven helper tests passed on Hetzner again after that
update. No geometry logic was changed after the successful two-town run.

## Verification

- Seven worker helper tests passed.
- Both scene turbine ID sets exactly match their coordinate-selected register
  records, with no duplicates.
- Both terrain arrays match declared grid dimensions: 479×377 and 470×417.
- Existing HeroLandscapeTour loaded both files through preparedLandscapeTour
  in an isolated local wrapper; no scene implementation changes were needed.
- Browser: town views rendered and flights to a wind stop reached arrival in
  both scenes. This is a smoke test, not visual acceptance of every stop or a
  visitor-device performance guarantee.
- Test wrapper must provide data-map-hero-band and data-map-hero-stage ancestors.
- Local preview: http://127.0.0.1:4398/?gemeinde=03458003 and
  http://127.0.0.1:4398/?gemeinde=03458013. Temporary files and screenshots are
  under /private/tmp/ni-stage-check. The wrapper intentionally does not provide
  weather endpoints and displays unavailable data rather than fabricated values.

## Remaining gates

Each municipality has four explicit checks: one solar outline/link gap, two
near-boundary wind assignments, and verification against precise official
municipality boundaries. BKG boundaries are generalized; outputs retain
stageReady=false and cadastralVerification=false.

The worker currently requires an active onshore wind inventory; towns without
wind are not covered by this version. Park naming remains generic. Weather and
catalog integration, sign clearance/visual acceptance and publication are not
part of this preparation trial. The test provides a reusable Niedersachsen
preparation path, not nationwide source coverage or an automatically complete
dataset.
