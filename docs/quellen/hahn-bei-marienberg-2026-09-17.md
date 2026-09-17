# Hahn bei Marienberg: municipal programme review, 17 September 2026

Scope: private municipal purchase grants for PV, storage, balcony solar and heat
pumps. This is a dated review of known sources and targeted additional searches,
not a claim that every budget, council minute or historical bulletin was read.
Federal/state programmes, advice and tax relief are separate categories.

## Finding

The applicable Verbandsgemeinde programme remains recorded as exhausted for
2026. Its full 22-page guideline, jurisdiction and publication checks are in
[the programme evidence](bad-marienberg-2026.md). The official 16 September
budget notice was read again on 17 September and still excludes further 2026
applications. It does not promise reopening in 2027. Storage units and standalone
balcony eligibility must be clarified before any future calculated reopening.

Targeted searches for Hahn bei Marienberg with PV, storage, balcony solar,
heat-pump and subsidy terms, plus official-site searches, did not establish a
second concrete municipal purchase-grant programme. Hahn am See is a different
municipality and was excluded from this jurisdiction.

## Additional official sources

- [Municipal profile](https://www.bad-marienberg.de/verbandsgemeinde-gemeinden/ortsgemeinden-und-stadt/hahn-b-m/): profile and local statute links. Dynamic contact/club modules are not treated as a complete inventory of municipal activity.
- [Climate overview](https://www.bad-marienberg.de/bauen-gewerbe-umwelt/klimaschutz/): orientation and links to public projects.
- [Project index](https://www.bad-marienberg.de/bauen-gewerbe-umwelt/klimaschutz/gefoerderte-projekte/): all three children reviewed. Verbandsgemeinde school heat pumps, lighting, heat study and climate work; city kindergarten lighting; Hof street lighting. Public bodies are the recipients, not private device applicants. The separate private programme is unaffected.
- [Energy advice](https://www.bad-marienberg.de/bauen-gewerbe-umwelt/klimaschutz/energieberatung/): funded advice, not a device purchase grant.
- [Designated regeneration areas](https://www.bad-marienberg.de/bauen-gewerbe-umwelt/sanierung-lohnt-sich/gebaeudesanierung-in-ausgewiesenen-sanierungsgebieten/): tax-certificate procedure includes Hahn/Hardter Mühle. The separately linked direct modernisation grant is explicitly for the city centre of Bad Marienberg, not Hahn.
- [Three-page tax information sheet](https://www.bad-marienberg.de/bauen-gewerbe-umwelt/sanierung-lohnt-sich/gebaeudesanierung-in-ausgewiesenen-sanierungsgebieten/merkblatt.pdf?cid=2uxs) and [five-page Hahn statute](https://www.bad-marienberg.de/dateien/satzungen-gemeinden/06/06-sanierungsgebiet-ortsmitte-hahn.pdf?cid=qpd): independently read, including the scanned statute pages. Energy renovation is relevant; these documents do not establish a separate device purchase grant. No general tax-law conclusion is drawn.
- [Official district climate portal](https://westerwaldkreis.klimaschutzportal.rlp.de/portal/aktiv-vor-ort/vg-bad-marienberg): its 2023 private-grant announcement concerns the predecessor of the consolidated 2026 programme. The older amount is not a new or currently valid grant.
- [Municipal budget 2026](https://www.bad-marienberg.de/dateien/satzungen-gemeinden/haushaltssatzungen/06-haushalt-2026.pdf?cid=2xrd): reviewers examined the foreword and relevant funding/investment hits, not all 167 pages. The RZN lead refers to playground/community-centre/cycle-path/club infrastructure, not an evidenced private energy-device grant.

## Every known source accounted for

The ledger preserves six exact source keys: accessibility declaration, project
index, Verbandsgemeinde project page, the private programme and two malformed
search links. The first four have source-specific review evidence.

The last two contain literal `{{ item | generateUrl:... }}` expressions for
`ozglebenslage` and `ozgleistung`. The original programme HTML has these in
`data-ng-href`, while the actual `href` is `#`. Each is recorded as `replaced`
with the source HTML as evidence of an extraction artifact. Neither is called a
read destination, a redirect or an absent grant. The original source rows are
not falsely stamped as read.

Three independent reviewers, including an adversarial reviewer, agreed on this
bounded programme-review conclusion. A separate legal review confirmed the final
ledger wording. The next scheduled municipal recheck is 1 December 2026, before
a possible new budget year; new or changed source records reopen the case.

## Operational repair found during this review

The programme work queue read only 1,000 of 1,209 check-history rows and therefore
missed recent successful checks (including Herzberg). It now uses the existing
paginated reader, with stable primary-key ordering, and derives attempts and
change observations from the same complete history. The corrected live queue
has 58 items instead of 66; that difference is a corrected queue, not eight newly
completed source reviews. A counter-test fails with the old unpaged read, and a
later-page failure must fail the entire read rather than report partial success.

The municipal validator also mistook an embedded `https://` inside a stored
source path for its outer scheme. It now checks the scheme only at the start;
non-web schemes remain rejected. Tests reproduce both the valid embedded-URL
source key and the rejected non-web case.
