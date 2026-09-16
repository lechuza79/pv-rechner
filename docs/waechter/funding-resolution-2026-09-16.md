# Municipal completion and clarification follow-through

The operator clarified the acceptance criterion on 16 September 2026: a supported negative municipal finding is complete; unresolved leads need a manual check or an actual factual enquiry, not indefinite backlog notes.

## Implemented

- The existing screen command gains `--kommunen`, joining source inventory, reviewed municipal dossiers and actual inquiry receipts. It does not modify public grants or invent completion for earlier page-only reviews.
- Versioned dossiers in `data/funding/municipal-reviews.json` document scope, searches, evidence, each known source, result, recheck date and dated next action. Completed reviews reopen for new/changed sources, expiry or a later substantive reply.
- The existing sender consumes curated municipal questions, including towns without a catalogue programme. Shared limits and no-repeat ledger remain; recipient validation, contact suppression and outreach spacing are checked before sending. Missing delivery receipts are errors, never permission to resend.
- The existing mailbox route recognizes municipal inquiry subjects separately from outreach and reads all enquiry pages. Replies require substantive review and never update grants automatically.
- The existing daily watcher performs and reports municipality-level closure; positive and supported negative findings both count. The separate Codex task remains paused.

## Flensburg: manual check plus factual question

Read the official [solar page](https://www.flensburg.de/Wohnen-Wirtschaft/Verkehr-Mobilit%C3%A4t-Klima/Klimaschutz-Klimaanpassung/Solarenergienutzung/) and its public climate-office contact. The [balcony service page](https://www.flensburg.de/Leben-Soziales/B%C3%BCrgerservice/Zuschuss-f%C3%BCr-steckerfertige-Photovoltaikanlagen-beantragen.php?FID=2306.2280.1&ModID=10) describes the stopped state programme and explicitly identifies the statewide service finder as its origin. This does not prove the absence of any municipal grant.

Independent adversarial review found the [local KlimaBonus offer](https://www.hier-wirken.de/flensburg/klimabonus-fuer-privatpersonen/belohnungsaktionen): regional-currency bonuses for PV and balcony systems. Main reviewer read the same original and confirmed the distinction from a euro investment grant. No unsupported calculator deduction or blanket negative finding was introduced.

A concrete factual question asks the climate office whether a currently applicable municipal grant exists in addition to the regional bonus and requests its guideline. Its send/reply status comes from the existing inquiry ledger; a prepared dossier alone does not claim delivery. Six known source associations remain explicitly open rather than falsely stamped as read.

## Acceptance checks

Regression cases cover evidenced negative completion, empty evidence, unread sources, new/changed sources, expiry, late replies reopening a closed case, pending/uncertain/sent/replied mail states, existing reply routing, contact-template requirements, volume cap, outreach spacing and no-repeat behavior. Mailbox pagination is exercised beyond 1,000 inquiries. The full pre-commit gates and production build must pass before merge.

This change completes the handling rules. It does not claim the entire national source backlog has been reviewed, nor that an authority has already replied.
