# Contact quality reassessment

Contact discovery and suitability remain separate. New rules preserve DOM boundaries around complete addresses without truncating valid domains or split inline addresses. Article publication dates are retained from standard metadata (including JSON-LD); old article references, narrow event mailboxes and nature-conservation roles do not automatically establish current solar responsibility. Sustainability alone is insufficient. Website administration and municipal bulletin work count as communication functions regardless of job title.

Cross-domain municipal attribution requires a matching named authority card on that authority's own contact/imprint page. A matching email suffix or an external article is insufficient. This establishes published attribution, not deliverability or exclusive responsibility. Callers must supply the organization name and domain; missing identity stays unconfirmed.

`contact-reassess.ts` reads an immutable full-run directory, validates every identity and source engine, and writes a separate complete assessment. It accepts an optional cohort snapshot for named municipality attribution, explicitly recorded supplementary page observations, and evidence-backed human review holds. Holds require dataset, organization, mailbox, an observed source URL, a reason and a supporting quote. They prevent a known unresolved conflict from being promoted by a generic rule. Raw findings and prior recipients are never overwritten.

```sh
node --import tsx scripts/contact-reassess.ts --directory=/path/to/run --output=/path/to/new-assessment --as-of=2026-09-15 --cohort=/path/to/snapshot.json --supplemental=/path/to/page-rechecks --reviews=/path/to/reviews.json
```

All options and source revisions are fingerprinted. Summary publication requires full inventory coverage. Dates missing from old observations remain unknown; reassessment cannot reconstruct HTML that was never retained. Only affected sources need to be read again. Failed supplementary reads preserve prior evidence and never establish absence. Automatic prioritization remains subject to review and does not establish response-rate uplift.

The regression suite protects adjacent/split email text, De-Mail and long domain suffixes, multi-role municipal staff, other people's roles, narrow environmental duties, stale sources plus fresh confirmations, event inboxes, named authority attribution, and read-only complete reassessment. Frozen research engine fingerprints include the new assessment-evidence module.
