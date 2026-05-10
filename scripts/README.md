# Scripts

## `mastr-refresh.ts` — MaStR data pipeline

Fetches the latest [open-mastr Zenodo dump](https://zenodo.org/records/6807425)
(aggregated CSV snapshot of the Bundesnetzagentur Marktstammdatenregister,
DL-DE-BY-2.0, ~1.4 GB), aggregates per region × energy type × segment × year,
and upserts into Supabase.

### Phases

| Flag | Phase | Status |
|---|---|---|
| `--inspect` | Download + CSV schema report → `scripts/mastr-schema.json` | implemented |
| `--aggregate` | GROUP BY + write normalized CSV | TODO |
| `--upload` | Upsert into `mastr_regions`, `mastr_aggregates`, `mastr_meta` | TODO |

Default (no flag) = `--inspect` for now.

### Usage

```bash
# Install deps once
npm install

# Phase 1: download + schema inspection (~1.4 GB download, runs once)
npm run mastr:refresh -- --inspect

# Later phases will be additive:
# npm run mastr:refresh -- --aggregate
# npm run mastr:refresh -- --upload
```

Cached downloads land in `scripts/.cache/` (gitignored). Re-runs skip the
download when the file size matches the Zenodo record.

### Requirements

- Node 20+ (native fetch + streaming)
- ~4 GB free disk space under `scripts/.cache/`
- For `--upload`: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` in `.env.local`

### Automation (later)

GitHub Actions workflow will run this quarterly with `--inspect --aggregate --upload`.
Vercel Functions cannot handle the 1.4 GB download (250 MB payload limit,
60 s timeout), so refresh runs off-platform.
