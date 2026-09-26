# Historical monthly solar extraction — 10 September 2026

Local-only extraction from `Gesamtdatenexport_20260910_26.1.zip` (3,183,407,128 bytes, official Last-Modified 10 September 2026 01:27:51 UTC). All 65 solar XML files parsed successfully. No production writes.

- 6,476,351 records scanned; 6,315,726 currently active units accepted.
- 160,609 inactive units excluded; 16 records excluded for invalid municipality keys.
- 1,544,346 monthly buckets across 11,012 municipality keys.
- Groups use declared installation type, not inferred private/commercial ownership.
- Count and capacity are stored in `scripts/.cache/bnetza/story-history-2026-09-10/full.json`; example extracts and summary are adjacent. Raw archive is in the local importer cache, not committed.
- Reproduce with `python3 scripts/story-history-local.py` (requires lxml and the cached official ZIP).

## Changed evidence

| Municipality | First recorded active balcony unit | Last month used in comparison | Highest month | Next highest month |
|---|---|---|---|---|
| Fürfeld | November 2022 | May 2026 | May 2025: 29 | July 2024: 15 |
| Feilbingert | December 2022 | May 2026 | May 2025: 27 | July 2024: 15 |
| Höchberg | May 2020 | May 2026 | August 2024: 15 | March/April 2023 and May 2024: 11 |

The former 25-month import boundary excluded July 2024. Under the unchanged rule requiring a 2x lead over the runner-up, Fürfeld and Feilbingert now fail. Do not relax thresholds to preserve the examples. They still have a highest month; that is a weaker descriptive statement, not the formerly claimed isolated peak.

The preview now uses the full local balcony series starting at the first registered active unit. Zero buckets mean no matching active units in the fully scanned source, not proof that no installation ever existed. The current month and three recently completed months remain excluded under the existing registration-lag rule; that rule is not an empirically established completeness guarantee.

## Limits and next design implication

Raw solar dates extend back to January 1900. This is NOT a validated historical start: implausibly early dates require scrutiny before long-term national charts. Historical retirements, later registrations, reclassification and municipal boundary changes are not reconstructed. There is no blanket claim that every municipality has ten years of valid monthly data.

Use the data-derived span for these examples (43, 42 and 73 monthly slots respectively), with an explicit comparison period. Long series may need a compact overview plus an event-focused detail, but selection must inspect the full valid comparison series, never only the visual crop.
