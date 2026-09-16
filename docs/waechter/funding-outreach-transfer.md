# Outreach discovery transferred to funding sources

## Problem and resulting behavior

The previous funding crawler followed one highest-ranked branch, stopped when its score fell, rejected PDFs and foreign hosts, and retained at most six URL candidates. A second topic branch, a linked authority portal or an attached guideline could therefore remain invisible. Source capture alone did not repair this discovery gap.

The new crawler reuses the outreach URL normalization, branch scheduling and content-gap detection. It follows several published branches under the existing nine-request HTML budget and preserves unvisited source leads for a later run. The existing separately bounded sitemap traversal remains. Search-result leads also enter this frontier. Positive URL wording alone no longer admits a new source to `funding_seiten`: the source must actually be read and its text must produce a funding screening signal. This is still a review candidate, not a confirmed program or eligibility decision. Existing catalog entries are not rewritten.

## Original documents and attribution

- Published frames, explicit fragment endpoints, continuation links and embedded PDF viewer destinations are navigation leads. No endpoint is inferred from arbitrary JavaScript.
- PDF bytes are kept unchanged; local `pdftotext` creates a separately hashed extraction. Empty scans and extraction failures remain unresolved. The extraction is not an OCR guess or a substantive review.
- Recognizable loading shells receive a bounded isolated Chromium render. The raw HTTP response and derived DOM have separate hashes; evaluation time does not replace original observation time. HTTP challenges are not bypassed.
- Published language alternatives are grouped using the publisher's explicit alternate links, not guessed language path rewrites.
- Outbound links retain their exact referrer. Even a positive text signal on an external authority or university site is not automatically assigned to the municipality. Such leads are stored separately and shown by `npm run foerder:suche -- --externe`, also included in the nightly reading list. Jurisdiction and current program status still need original-source review.
- One shared source URL is not an independent confirmation for each linked municipality. Counts of URL/municipality associations must not be presented as distinct programs.

## Persistence and deployment

Run `npx tsx --env-file=.env.local scripts/funding-evidence-setup.ts` before the new crawler. It additively creates `funding_discovery_leads` with row-level security. New leads are inserted without overwriting old observations; only actually attempted leads update their search state. Unvisited leads are selected first on the next pass. A partial search stays `unvollstaendig`, including when it has already produced positive sources. Discovery version 6 reopens the prior inventory.

The scheduled workflow installs Poppler and Chromium. Failed source reads retain their retry state. Previously unsupported explicit PDF addresses are eligible after this capability change; a failed extraction receives normal shell backoff rather than silently passing as readable.

The completion report counts pending source associations separately. It does not claim that a successful batch or an empty hit list proves municipal funding completeness.

## Validation

`funding-navigation.test.ts` protects sibling traversal, low-ranked intermediate pages, published navigation and PDFs, decoded HTML links, external attribution boundaries, pending-frontier continuation and declared language equivalences. `funding-document-reader.test.ts` protects original-vs-derived bytes and source URL preservation. The existing source-reader regression protects failed observations and backoff.

A read-only paired comparison uses eight deliberately selected municipalities: Dellstedt, Süderheistedt, Nidda, Mainz, Limburgerhof, Beratzhausen, Höchberg and Leipzig. `scripts/funding-discovery-compare.ts <sample.json>` retains original responses for both algorithms; `FUNDING_BASELINE_FILE` can reuse a frozen earlier baseline without changing its source timestamps. Original responses and evaluation results are kept in the external audit directory. The sample is not representative; old URL candidates and new text-qualified sources are different units, so their ratio is not a coverage percentage.

Two concrete additional relevant originals were inspected as text and rendered first pages: Mainz's municipal balcony-PV guideline in the version titled 17 June 2026, and Limburgerhof's balcony-PV guideline. The older crawler did not retain these PDF source URLs. A university simulator document also produced a text signal and remains an external lead, not a municipal funding source. No new program was added to the public catalog by this implementation.
