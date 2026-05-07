# Solar Check

Ehrlicher PV-Rentabilitätsrechner ohne Leadfunnel — live unter
[solar-check.io](https://solar-check.io). Drumherum: Live-PV-Simulation
auf Wetterdaten-Basis, Wärmepumpen-Rechner, Strommix-Dashboard und
Embed-Widgets für Drittseiten.

## Setup

```bash
npm install   # installiert Deps und aktiviert .githooks via postinstall
npm run dev   # → http://localhost:3000
```

`.env.local` mit den ENV-Vars unten anlegen, sonst fallen Auth, Supabase
und die Cron-Routen aus.

## ENV-Variablen

| Variable | Wofür |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Projekt-URL (Client + Server) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon-Key (Client) |
| `SUPABASE_SERVICE_KEY` | Supabase Service-Key (server-only) |
| `ADMIN_EMAILS` | Kommagetrennte Admin-Mails (Zugang `/admin/*`) |
| `CRON_SECRET` | Bearer-Token für Vercel-Cron-Routen |
| `NEXT_PUBLIC_BASE_URL` | Kanonische URL für OG-Tags und Sitemap |

`.env.local` ist gitignored und wird vom Pre-commit-Hook geblockt.

## Tech-Stack

Next.js 14 (App Router) · React 18 · TypeScript strict · Supabase
(Auth + Postgres) · Visx (Charts) · Vercel (Hosting + Cron). Bewusst
kein Tailwind, keine Component-Library — Styling läuft über
CSS-Custom-Properties aus `lib/theme.ts`.

## Pre-commit-Hook

`.githooks/pre-commit` ist versioniert und wird via `core.hooksPath`
eingehängt (postinstall-Script). Der Hook blockt:

- jede `.env*`-Datei (auch in Renames / als Inhalt)
- TypeScript-Fehler (`tsc --noEmit`)

`--no-verify` ist nicht erlaubt — schlägt der Hook, ist der Commit
kaputt und gehört repariert, nicht umgangen.

## Deployment

`git push origin main` → Vercel deployt automatisch auf
`solar-check.io`. Preview-Deploys gehen auf
`pv-rechner-alpha.vercel.app`.

## Mehr Kontext

Architektur, Roadmap, Berechnungslogik und Konventionen stehen in
[`CLAUDE.md`](./CLAUDE.md).
