# Municipality placement cold starts — 2026-09-16

## Measured cause

The municipality story feed called `vergleichsPlaetze` → `platzierungenFuer`
→ a process-local memo → `computePlacements(await loadAwardStats())`.
The already precomputed award-presence table did not cover this call path.

On September 16, before implementation, a fresh local process loaded 10,742
municipalities in 5,490 ms and computed placements in 1,218 ms. Serialized full
placements occupied 48,845,935 bytes. A second fresh process took 5,054 ms for its
first municipality and 0.015 ms for the next one. These are local function
measurements, not production page-response measurements.

A later alternating comparison under heavy host load (17:27–17:30 CEST) used
three fresh processes per implementation and counted actual fetches:

| Run | Original loader | Snapshot loader | Requests before / after |
| --- | ---: | ---: | ---: |
| 1 | 19,669 ms | 2,579 ms | 23 / 1 |
| 2 | 27,009 ms | 851 ms | 23 / 1 |
| 3 | 22,228 ms | 2,499 ms | 23 / 1 |

These load-sensitive timings are not a production latency promise. The structural
change is removal of the full-country load/calculation from the request path.

## Change and refresh contract

- Keep the existing ranking algorithm, including competition ranks, size classes,
  plausibility filters and spike/thin-stock flags, unchanged.
- Store every municipality's complete placement array, including explicit empty
  arrays for municipalities without eligible placements.
- Stage batches under a new generation. Only publish after the database verifies
  the full row count. Switch one active pointer in the same transaction; readers
  cannot observe mixed or partially written generations.
- Reject older concurrent refreshes. Failed staging leaves the previous complete
  generation active. Clean up older generations only during successful publication.
- The existing `baueAuszeichnungen` data-refresh entry point loads fresh source
  data, bypassing the process memo. Complete preparation precedes page invalidation;
  failure returns HTTP 500 before invalidating page caches.
- Initial installation/backfill must finish before deploying the new reader.
- All three tables use RLS. The read view uses invoker security and is only granted
  to the service role. Publication is not callable by public clients.
- Missing data logs an error and omits the optional story contribution. It never
  starts a country-wide request-time fallback. Health separately checks the active
  generation, source/view/metadata row counts and freshness.

## Verification

- Full live-data `deepStrictEqual`: **10,742 / 10,742** municipality arrays match
  the unchanged algorithm, including every ranking field and array order.
- Real PostgreSQL subtransaction: reject partial publication, switch atomically,
  expose only one generation, reject superseded data; roll back all test mutations.
- 103 focused unit tests pass, including ties, empty municipalities, failed batches,
  refresh with an old memo already populated, and invalidation route coverage.
- Sabotage: restoring the full source load inside the municipality reader makes
  its regression test fail. Restoring the snapshot reader makes it pass.
- Database security audit after installation: `ok: true`, no problems.

Reproduction scripts:

```sh
node --conditions react-server --env-file=.env.local --import tsx scripts/checks/atlas-placement-verify.ts
node --conditions react-server --env-file=.env.local --import tsx scripts/checks/atlas-placement-transaction.ts
```

The first script is read-only; the second rolls back every test mutation.
## Local build and rendered pages

Production build completed successfully on September 16 at approximately 17:41 CEST,
including the full TypeScript check and 219 generated pages. The built server was
started in this task's worktree on port 4196.

Browser checks covered Höchberg, Munich and Flensburg. Both Höchberg comparison
card strings matched the existing production page exactly. The opened comparison
dialog showed rank 13 of 500 and 79.9 batteries per 100 private roofs, unchanged.
Flensburg displayed rank 169 of 625 in its appropriate population class. Munich
rendered its complete story feed without adding an ineligible comparison card.

During the first local browser navigation under heavy host load, existing
slug-resolution/map endpoints logged 8-second database timeouts. These were not
placement-reader errors. Final rendered states were verified; a subsequent serial
check of all three pages returned HTTP 200 in 269/177/61 ms without new log errors.
Those subsequent responses were cached and are not cold-start evidence.

Production rollout results are recorded after deployment.
