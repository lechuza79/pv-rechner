# Automatic delivery and worker wakeup

Direct video export keeps the shared entitlement (operator today, plan permission
later). The server reads the confirmed account address; an address submitted in
the request body is ignored. It attaches one confirmed delivery request to the
existing render job in the same database transaction. No subscription is added.
The existing worker delivers the link and clears the address after delivery.
Cached videos also use this delivery path. Repeated clicks reuse the same job
and delivery. Notification claims prevent concurrent callers from mailing the
same pending request twice; an abandoned claim expires after five minutes.

Both direct requests and public email confirmations call `wakeVideoWorker` after
the queue transaction commits. It dispatches only `video-export.yml` on `main`.
A database lease coalesces dispatches across server instances for 60 seconds;
queue limits, render deduplication and GitHub workflow concurrency still apply.
Unconfirmed public requests never dispatch. The existing schedule is a recovery
path when dispatch is unavailable; an accepted job is never deleted on failure.
Immediate dispatch does not promise instantaneous video encoding: runner startup
and rendering still take time and are shown as waiting/rendering in the modal.

## Deployment

1. Apply the idempotent `VIDEO_EXPORT_SQL` through the existing protected setup
   route before or together with the application release. It adds the delivery
   claim timestamp and protected dispatch lease table and updates the functions.
2. Add `VIDEO_EXPORT_DISPATCH_TOKEN` in Vercel Production. Use a fine-grained
   GitHub token restricted to `lechuza79/pv-rechner`, repository permission
   Actions read/write. No source-write, account-wide or organization token.
   Store it through Vercel's secret field, never in source, logs or chat.
3. Release the application with that environment variable available.
4. Verify a confirmed account request: no mail input, queued job immediately
   dispatches the existing worker, completion offers the file and sends one mail.
   Verify a duplicate request does not render or mail twice.

Focused checks: `video-export*.test.ts`, the video-dialog test in
`e2e/landkreis-vorschau.spec.ts`, and `scripts/video-export-delivery-check.ts`
against a LOCAL Postgres database via `VIDEO_EXPORT_DATABASE_URL`. The database
check creates an isolated schema in a transaction and rolls everything back.
