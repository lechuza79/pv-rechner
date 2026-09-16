# Integration audit: existing funding watcher

## Decision

Improve the existing `foerder-news-waechter`; do not add a parallel substantive watcher. Preserve the existing gates, Council/Legal-Judge, authority sender, mailbox reader, operator decision mail, monthly heartbeat and non-funding duties. The additional Codex automation remains paused. The versioned task text is `foerder-news-waechter-task.md`; its installed runtime copy belongs at `~/.claude/scheduled-tasks/foerder-news-waechter/SKILL.md`.

## Verified findings and changes

1. **Contradictory permissions:** the central gate already permitted official-source-backed programme additions, while the old task and verification documents still broadly prohibited activation. The shared procedure now distinguishes new programmes, reactivation and increases to existing deductions. Existing human-decision limits remain; independent counter-review is retained rather than weakened.
2. **Discovery did not imply review:** the old reading command queried one coverage row per municipality. New `foerder:screen -- --quellen` reads every stored municipality/URL association with pagination. Unresolved/unknown outcomes remain pending; changed completed sources reopen. Newly recorded source reviews include an exact timestamp in existing review metadata, avoiding the old date-only ambiguity. `--gelesen` remains tied to the exact original and a visible quote.
3. **Authority mail handoff was incomplete:** the actual sender had been operating while older instructions still claimed drafts only. The combined task uses the existing sender and its existing restrictions; it never starts another sender. Automatic eligibility still covers known programmes after repeated source-access failures, not every unclear discovery.
4. **Acknowledgement wrongly counted as answer:** the mailbox handler previously discarded its own classifier and marked any matched mail as an answer. The handler now reuses that classifier, rejects replies predating the question, preserves only the sender's own text, marks truncation, accepts newer substantive replies and uses a compare-before-write condition. Storage/read failure marks the overall run failed while allowing unrelated outreach processing to finish.
5. **Saved replies had no reader:** `foerder:anfrage -- --antworten` now exposes incoming evidence for the existing daily reviewer. Receiving a reply is not factual resolution. The watcher compares programme/timestamp with prior tagged reports and reads the complete mail thread, then finds/verifies official originals before any grant update. Mail does not set rates, active status or verification dates.
6. **Release proof was circular:** an old instruction attempted to prove new seed deployment through the database-backed API before resync. The shared procedure instead checks the exact ready deployment, syncs through the supported route, records actual individual source checks and then verifies public content, postcode matching, calculations and rendered pages, including cache freshness.
7. **Fetch failure was confused with disproof:** the central self-check now distinguishes an inaccessible source from a source that contradicts a previous change. A single fetch failure does not warrant an unsupported revert or invented programme closure.

## Independent challenge and validation

Two independent audits covered (a) permissions and review/release rules and (b) enquiry, reply and operator-mail code. A second adversarial pass found the one-source-per-municipality queue defect and remaining instruction contradictions; these were corrected. Counter-review explicitly included findings considered confirmed and allowed rejecting exaggerated claims.

New tests exercise acknowledgement-before-real-answer, older/invalid dates, ambiguous/foreign sender matches, mailbox-order independence, repeat scans, quoted text/truncation, read-only operation, storage failures/concurrent changes, multiple sources per municipality, unresolved decisions and same-day source changes. Existing tests cover enquiry limits, no repeat sending, office times, reply classification, proof dates and the operator decision gate.

Read-only production checks on 16 September 2026:

- Full source queue: 16,547 municipality/URL associations; 16,046 pending across 4,773 municipalities. These are source-work counts, **not programmes or a completeness percentage**. Legacy unrecognized outcomes are conservatively pending until reviewed.
- Incoming funding reply query: zero stored replies at inspection. Therefore no retrospective acknowledgement cleanup was inferred or performed, and no production mail end-to-end claim follows from that empty state.
- Existing daily watcher enabled; additional Codex watcher paused. Runtime installation must be verified against the versioned task after merge.

No authority mails were sent during this integration; sender schedules and volumes were not changed. No grant values or eligibility were changed by this task.

## Preserved boundaries and remaining limitations

- The existing sender's no-repeat protection relies on its single scheduled workflow plus the send log. Its table has no unique programme constraint; do not run a second sender or retry a send reservation merely because its delivery receipt is missing.
- Automatic authority enquiries do not cover uncatalogued new findings or arbitrary contradictory reachable pages. Those retain explicit unresolved evidence and the existing operator decision route.
- One latest reply excerpt per programme is retained; the full conversation must be read from the original mailbox. The recorded timestamp is the mail's date, not proof of SMTP receipt time.
- Existing sender checks for global contact suppression and delivery-receipt persistence are separate hardening opportunities identified by the audit; this integration does not claim to have repaired the sender or expanded its authority.
- The local substantive watcher still depends on its existing app/host running. GitHub's discovery, enquiry and mailbox jobs remain separate execution stages. Configuration plus tests do not prove a future scheduled run completed.
