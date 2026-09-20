# Scene weather resilience

The homepage and simulation must never interpret unavailable weather as sunshine.

## Data contract

- The scene and public weather/solar endpoints call the same server readers. Production never fetches its own HTTP endpoints to assemble a scene.
- The explicit local `SZENE_DATEN_BASIS` override remains available for review, but is ignored on Vercel. It is not needed in the current preview.
- Snapshot reads share in-flight requests. Good files are cached for ten minutes; failed reads retry after thirty seconds. The last good file survives transient failures, but `modelWeatherAt` only returns values within the file's actual forecast horizon.
- Radar has a four-second request deadline, shares in-flight requests, and falls back to model precipitation. Its original measurement time is retained; existing twenty-minute freshness validation rejects old radar.
- Incomplete weather/scene responses use `no-store`. Complete answers retain the existing five-minute CDN lifetime. Failure of solar power must not discard valid weather.
- The browser applies the selected postcode coordinates before awaiting weather. It retains recent weather only for the same postcode, retries missing weather after thirty seconds, and uses a neutral sky without reporting invented weather measurements.

## Verification (2026-09-20, local only)

Targeted tests cover failed first reads, retry timing, concurrent reads, last-good recovery, production without self-HTTP requests, scene recovery, independent power failure, frontend location/fallback behavior, and the existing weather mapping/model rules. Type checking passed.

With the live-source override removed, Höchberg scene requests returned 98% cloud in 1464 ms on the first request and 31 ms on each of two subsequent requests. This is a local sample, not a production latency guarantee.

The original local timeout cannot be reconstructed from historical request logs. Negative caching and self-HTTP requests were verified in code; neither alone proves the initiating cause. The public weather endpoint responded in about 100 ms during diagnosis. A scripted request to the public scene URL received a platform 429/security response, so this was not a successful production scene verification. After release, check the scene through a normal browser, including postcode change and recovery; do not call the local result deployed.
