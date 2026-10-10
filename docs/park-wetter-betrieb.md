# Prepared park weather on Hetzner

The existing Hetzner host runs `solar-check-park-weather.timer` hourly (minute 12 plus up to 90 seconds jitter). No model calls or new paid infrastructure are involved. The service runs with a dynamic unprivileged user, 1 GB memory ceiling, one CPU quota, and a ten-minute timeout. It keeps the previous database snapshot on failure.

Runtime directory: `/opt/solar-check-park-weather`. The minimal deployment consists of `scripts/park-wind-snapshot.ts`, `scripts/open-data-window.ts`, `lib/park-wind-snapshot.ts`, `lib/icon-d2.ts`, `lib/regular-grid.ts`, `lib/zeit.ts`, and `public/geo/landscape-wind-stops.json`. Node 22 ARM64 and the file-reader/tsx packages are installed there. Unit definitions live in `scripts/systemd/`.

## Credential boundary

`weather.env` is root-owned, mode 0600. It contains the public Supabase URL and anonymous API key plus a separate 256-bit random `PARK_WEATHER_UPLOAD_KEY`. It does NOT contain the service-role key. The upload key authorizes only `upload_park_weather`, which validates and atomically replaces the singleton park snapshot. No arbitrary filename, table, or SQL argument exists. Direct anonymous reads/writes of both new tables are denied. Only the SHA-256 digest of the upload key is stored in the database.

Migration: `sql/2026-10-park-weather.sql`. When applying through the existing `exec_sql` RPC, remove the outer BEGIN/COMMIT because the RPC already runs in a transaction. Provisioning or rotation is an administrator operation: generate 32 random bytes as 64 hex characters, store its SHA-256 digest in `park_weather_upload_key`, and deliver only the new restricted key to the root-readable environment file. Never log either credential. The service picks up its environment at every run.

## Read path and scope

The existing `loadSnapshotFile` cache reads `icon-d2/park-wind.json` from the dedicated `park_weather_snapshot` table; other weather files remain in the existing Storage bucket. `WEATHER_SNAPSHOT_DIR` continues to support local fixtures. Prepared park weather needs neither a postcode snapshot nor a hosted weather API fallback. It rejects missing, stale, or incomplete wind series. This does not replace or schedule the nationwide postcode/solar pipeline.

## Verification on 2026-10-03

50 prepared park destinations, 13 bounded raster areas, four wind-component fields at 80/120 m, 49 hours, 37,539-byte compact snapshot. First computation: approximately 34 seconds, 220 MiB peak RSS, 3.8 CPU seconds. Initial upload and subsequent hardened-service run succeeded. Eight park-reader tests passed. Invalid upload key, direct table reads and administrator SQL calls with the public key all returned permission errors. Local hero API returned ICON-D2 at 100 m with 97 wind and 97 solar samples for the tested Würzburg destination. No website deployment occurred here.

Inspect service status and journal on the host; check both snapshot `generatedAt` and `runInit` for freshness. The timer is enabled; there is no new out-of-band failure notification integration. The reader refuses weather older than twelve hours. For future location changes, deploy the generated stop metadata together with code; the next successful job includes those parks. The current 2 MiB upload ceiling is deliberately scoped to prepared showcases and must be revisited before nationwide expansion.
