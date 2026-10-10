# Background preparation queue

## Scope

The queue prepares municipality-specific **technical renewable inventories**, not complete new 3D scenes. It uses the cached national public register and BKG VG250 municipality boundaries, assigns coordinate candidates with an independent spatial index, and retains register municipality codes separately. Generalized boundaries remain provisional; a distance below 100 m is explicitly flagged for official boundary verification. Offshore, missing-coordinate and ambiguous-boundary records remain in the separate unassigned output; they are not forced into the register municipality.

Outputs deliberately say `stageReady: false`. Each includes missing technical fields, solar outline/link requirements, source hashes and dates. Terrain/building adapters and browser acceptance remain prerequisites for a new stage. No existing published scene or source scene is overwritten. No AI research or automatic publication is performed.

## Operation on existing Hetzner host

Root: `/opt/solar-check-landscape`.

- `solar-check-landscape-register-refresh.timer`: weekly Monday at 03:30 UTC plus up to five minutes jitter. Uses the existing strict national collector with `--restart`; last complete source outputs survive a failed refresh. No paid API.
- `solar-check-landscape-queue.timer`: processes up to 1,000 municipalities, then waits five minutes. Single-worker file lock and SQLite transaction state prevent duplicate concurrent work. Interrupted work returns to pending; three failed processing attempts quarantine a job. The national collector's existing lock prevents mixed source generations; a failed/incomplete refresh leaves the previous queue intact.
- Worker is isolated from the network and cannot make paid requests. Maximum 1 GB memory and 75% of one CPU. Stops below 2 GiB free; no automatic purchase or disk expansion.
- SQLite queue: `queue/preparation.sqlite`.
- Status: `logs/preparation-queue-status.json`.
- Municipality output: `prepared-inventory/<AGS>/inventory.json`.
- Unassigned records: `prepared-inventory/unassigned.json`.

The worker only re-seeds when source content hashes change. Full inventories are bounded to the current generation rather than accumulating weekly raw copies. Completed inventory jobs have status `needs-geometry`, not `ready`. New geometry adapters must be implemented before these jobs can progress to renderable scenes. Existing pilot preparation workers are unchanged.

## Verification 2026-10-04

Four tests passed on the host: coordinate assignment independent of register municipality; ambiguous/shared boundaries and missing coordinates; restart recovery with no scene-ready claim; failed processing preserving previous output and stopping after three attempts; low-disk guard preserving untouched pending jobs. First actual seed: 10,939 municipality jobs, 6,554 unassigned register records. First batch completed 1,000 jobs in about fifteen seconds including seeding, peak observed memory approximately 391 MiB. Counts refer to the initial 2026-10-02 register snapshot and change after successful refresh.

No model calls occur in either timer. Existing server/storage/traffic tariffs still apply. No push notification integration is added: operational failures are visible in systemd and the queue status; no claim of autonomous model escalation. Code and data preparation here do not authorize website release.
