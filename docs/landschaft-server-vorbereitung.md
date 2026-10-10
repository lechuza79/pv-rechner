# Background landscape preparation

The existing Hetzner server runs public landscape data preparation separately from its existing crawler. The MacBook does not download or process the raw terrain/building data. This is a preparation worker, not a publicly deployed website or a paid AI agent.

## Current pilot

District Kaiserslautern (07335), starting at Landstuhl. Official district and all 50 municipal boundaries select wind units by coordinate. The initial active-register snapshot selects 42 wind units. The independent city Kaiserslautern is excluded. Register municipality and coordinate municipality remain separate; neither establishes municipal revenue or ownership.

Sources: LVermGeo Rheinland-Pfalz district/municipal boundaries, DGM1 terrain and LoD2 buildings; Geofabrik dated Rheinland-Pfalz OSM extract for context and mapped solar outlines; public MaStR technical ground-solar and wind data. Only public technical fields leave the MacBook. No application database credentials are transferred.

## Operation

Preparation root: `/opt/solar-check-landscape`. Service: `solar-check-landscape@07335.service`. Configuration: `jobs/07335.env`. Status: `logs/07335-status.json`. Outputs: `public/geo/landscape-tours/07335/`. The service starts after reboot and retries network failures after 15 minutes. Invalid data stops the job for inspection. Downloads are sequential, cached and hashed; interrupted downloads are never treated as complete. One CPU and 1.8 GB memory protect the existing crawler. Downloads stop before available disk drops below 2 GB; storage is never automatically expanded.

The worker uses the existing shared scene preparer. Terrain covers the entire flight rectangle; buildings are downloaded around destinations. Those building windows must be reviewed in the browser before release. Raw data remains on the server; only prepared public outputs need downloading for preview.

## Gap handling

`data-gaps.json` records missing technical wind fields, solar footprints without complete register capacity, ambiguous solar associations, register ground-solar units without mapped outlines, and pending geometry checks. `wind-field-evidence.json` stores exact-unit public-register checks with coordinates and timestamps. Missing measures are refreshed from the exact register ID; missing values remain missing when the source also lacks them. Manufacturer documents or authority records are required for further enrichment. Model names alone do not justify actual hub heights or dimensions. This queue is research input, not an autonomous AI researcher.

The initial DeWind D-62 unit near Oberarnbach has a documented 91.5 m hub height but no rotor diameter in either our snapshot or the fresh public-register check. It must not receive a silently guessed diameter. Public register geometry establishes physical display membership, not economic benefit.

Runtime weather availability, building coverage and visual correctness, visitor rendering performance, and licenses/attribution are separate release gates. A completed worker does not mean these gates passed.

## Cost boundary

No new server, volume, snapshot, paid AI API or storage subscription is created. Compute uses the existing server. Hetzner incoming traffic is free; outgoing traffic over the package allowance is billable. The remaining allowance was not inspected in the account console. Adding paid model research requires a separate explicit decision about account usage and billing. Server duration alone does not cause model consumption.

## Agent division

Recommended workflow: Astra coordinates source decisions and acceptance; GPT-6.1 Sol handles bounded implementation or verification tasks with the relevant context only. Normal collection and preparation remain deterministic server jobs. Subagents consume the shared Codex allowance. Do not continuously poll or assign models the bulk downloads.

## National register collection (2026-10-02)

The authorized national foundation runs as `solar-check-landscape-national-register.service` on the existing server. `scripts/landscape-national-register.py --root /opt/solar-check-landscape --kind all` collects active Germany-labelled wind (onshore/offshore retained explicitly) and ground-solar technical records. Public filter values are resolved from register metadata and checked on every row. Unknown technical fields remain null. This inventory does not yet supply verified park outlines or economic municipality assignments.

Outputs: `inputs/national-register/{wind,solar}.json`; progress: `logs/national-register-status.json`. Atomic page checkpoints allow same-UTC-day recovery after network errors. Changed totals, duplicate IDs, changed first/last pages or stale checkpoints stop rather than replacing the last complete output. After inspection use `--restart` for a new attempt. There is no transactional snapshot guarantee; the public endpoint excludes current-day updates and exposes no exact source snapshot timestamp. Nine isolated tests cover recovery, validation and output preservation.

The service uses one CPU and at most 600 MB, restarts network failures after 15 minutes, and stops on data inconsistency. It uses no model APIs. National solar-outline extraction/reconciliation and source-backed completion of unresolved technical fields remain separate subsequent work; a complete register download must not be presented as fully verified map data.

A potential enrichment source is UFZ ReGeoLoc V20260203, https://zenodo.org/records/20716459 (published 2026-06-16, register reference 2026-02-03). Access is restricted and commercial derivative-use rights were not available in public metadata. Do not import or request access on the user's behalf without the corresponding authorization. Current public MaStR collection does not depend on it.
