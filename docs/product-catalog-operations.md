# Server-side product catalogues

GitHub Actions `product-catalogs.yml` owns imports. WP: 06:43 UTC daily. BKW: 00:43, 06:43, 12:43, 18:43 UTC. These are scheduler windows, not guaranteed start times. No desktop or model invocation is required.

Apply `sql/2026-10-product-catalogs.sql` once using the existing service-role `exec_sql` migration mechanism. It adds the private status/snapshot table and one service-only atomic replacement function. Seed both imports before deploying the BKW reader. The existing WP table remains the consumer source; BKW uses the snapshot payload. A failed transaction leaves the previous complete catalogue intact. Empty, duplicate, invalid-price and stale WP inputs are rejected before replacement.

Secrets: existing SUPABASE_URL and SUPABASE_SERVICE_KEY, plus AWIN_FEED_LIST_URL (never log its value). Manual `workflow_dispatch` imports both catalogues; failed imports retry once. The health check independently reads stored success dates every three hours, including missed/disabled schedules, and uses the existing incident escalation/recovery path. WP import overdue: 36 h; BKW: 18 h; WP source data: max 72 h. Bad status fails the import; successful reruns clear the corresponding incidents through normal monitoring.

Awin `Last Imported` is the feed revision, not our fetch date or a guarantee that merchant prices changed. Offsetless dates are conservatively interpreted as UTC+02:00 (up to two hours earlier than UTC). Solakon publishes current offers but no separate feed revision: source_at stays NULL; only the genuine fetch time is reported. Never fabricate a merchant update time.

Commands: `npm run wp:katalog`, `npm run bkw:katalog`. Check `product_catalogs` timestamps/counts and nonempty WP table after writes. Never truncate manually. On source failure keep the stored snapshot; stale snapshots are retained for diagnosis but not presented as fresh prices. No daily commit or deployment is involved.

Cutover: verify a successful cloud run and public catalogue response, then pause the desktop automation `w-rmepumpenpreise-aktualisieren`. Rollback application reads independently; never resume a second writer while the server importer is active.
