# Source evidence corrections, September 2026

## Operational contract

- Discovery results expire after **30 days**, positive and negative alike. This is an operational rediscovery cadence, not a freshness claim. At 1,000 municipalities per daily batch, 11,274 municipalities need at least 12 runs; a monthly window leaves capacity for slow domains and retries. Oldest due results go first. Changing the start URL or discovery version makes a record due immediately. Persistent failure backoff still applies to the exact failed URL.
- Missing URLs wait 30 days for rediscovery; access blocks, unsupported formats and shells wait seven days for an alternate-path review; transient server/network failures retry the following day. These are explicit operational choices, not empirically estimated recovery probabilities.
- `funding_source_state` holds retry state, not a claim of substantive verification. Deploy its additive schema with `scripts/funding-evidence-setup.ts` before using the new readers. No existing observation dates are migrated or reset.
- Each direct source request through the new reader preserves response bytes, SHA256, requested/final URL, HTTP/type, observation time and readability result in a run artifact. GitHub retains those artifacts for 90 days. An extraction/review is a separate event; old observations are never re-stamped. Unreadable/PDF sources remain work, not a negative grant finding. Automatic PDF extraction is not included in this change. The pre-existing program watcher proxy/archive fallbacks are not covered by these direct-source counters; a proxy fingerprint does not prove that original bytes were captured locally.
- The final report follows all processing steps. It includes actual step outcomes (including skipped/failed), request/readability counts and extraction/review events. Counts use different units explicitly. Reports are archived directly without email.
- `foerder:screen -- --gelesen <one-region> --url <exact-url> --beleg <quote> --ergebnis <result>` reads the exact original again and requires the quote to occur there. It updates only that page; the legacy coverage row is updated only if its normalized URL matches. It does not backfill evidence for historical bulk stamps.

## Price decision prepared for the operator

The original source describes price *ranges*, not independent point observations. The technical fix preserves both bounds, the installed-PV cost scope and the source text in `market_prices.notes` as `PRICE_EVIDENCE`. Existing calculator point values remain unchanged pending product acceptance. A range midpoint would be a new modeling decision, not a parser fix.

Recommendation: label the current point policy honestly as a lower-bound-based estimate and display the source range in the detailed assumptions; decide a typical-price policy only with independent offer data. In the captured source, the mean of the four small-system range midpoints is EUR1,626/kWp versus the existing EUR1,416 lower-bound mean. This is a sensitivity calculation, not a measured market median.

The second storage source explicitly describes equipment purchase costs plus additional installation. Its range is now retained as equipment-only evidence and excluded from the installed-price average. Restoring network access must not silently restore incomparable averaging. The existing first-source installed-price estimate is not changed by this correction.

## Original regression cases

Captured on 15 September2026 in the separate audit archive. `fixtures/funding-audit/pv.html` is the original table extracted without rewriting from taptaphome's solaranlage-kosten page. The other fixtures preserve the complete fetched HTML for Beratzhausen and the redirected Mainzer Stiftung page. Capture metadata and SHA256 values remain in the external audit archive:

`/Users/eule/.codex/.chatgpt-projects/g-p-68cb08f24e0c8191aa1050b084bc0b5e/waechter-audit-2026-09-15/sources/`

No completeness or recall rate follows from these selected regression examples.

## Heat-pump feed verification

Read on15.09.2026: all745 stored devices have `abgerufen_am=2026-09-15T06:20:50.954Z`. The separate active merchant feed lists55,938 total products and `Last Imported=2026-09-15 08:05:49` (provider timezone not declared here). This proves a recent device write cohort and separately a current feed-list date; it does not prove independent accuracy of every price or a market-wide sample. No import was triggered for this check.
