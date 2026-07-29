# Lehren: Vercel-Build-Skip und Kostenoptimierung

Wortlaut aus CLAUDE.md, Stand 29.07.2026. Die aktive Konfiguration und die Regeln
stehen weiterhin in CLAUDE.md unter „Deployment & Betrieb"; hier liegen die
vollständige Begründung des Ignored Build Step und die Kostenzahlen.

### Vercel-Kostenoptimierungen (Stand Apr 2026)

Gesamt-Org hat vier Projekte (`pv-rechner`, `life-is-a-binge`, `growth-assistant`, `portfolios-katharina`). Der pv-rechner-Anteil an den Vercel-Kosten ist ~$8,50/Monat (~20% der Org-Kosten), davon ~$8,50 Build Minutes. Aktive Fixes:

1. **Build-Cache reaktiviert** — `prebuild` räumt `.next/` nur lokal auf (siehe oben). Spart ~40–60% Build-Zeit auf Vercel.
2. **Ignored Build Step** im Vercel Dashboard (Settings → Build and Deployment):
   ```sh
   bash -c 'if [ "$VERCEL_ENV" = "preview" ]; then exit 0; fi; if git rev-parse HEAD^ >/dev/null 2>&1; then git diff --quiet HEAD^ HEAD -- ":!*.md" ":!.claude/"; else exit 1; fi'
   ```
   Zwei Regeln, Exit 0 = Build überspringen:
   - **Vorschau-Deployments werden komplett übersprungen** (seit 27.07.2026). Es gibt kein
     Staging: entwickelt wird lokal, dann direkt auf `main`. Jeder Zweig-Push baute vorher
     eine Vorschau, die **zuverlässig scheiterte** — die Preview-Umgebung hat zwar
     `NEXT_PUBLIC_SUPABASE_*`, aber **keinen `SUPABASE_SERVICE_KEY`**, und `/solar-atlas`
     stirbt beim Vorrendern an „Supabase not configured". Ergebnis waren Build-Minuten für
     nie angesehene Builds plus eine Fehlermail pro Push. Bei ~11 parallelen Worktrees ist
     das dauerhaft. Wer Vorschauen doch braucht: Service-Key in die Preview-Umgebung legen
     UND diese Zeile entfernen — beides, sonst scheitert es weiter.
   - Commits, die nur `*.md` oder `.claude/` ändern, werden übersprungen (~10 % der Commits).

   **Die Bedingung ist bewusst positiv formuliert** (`= "preview"`, nicht `!= "production"`):
   Wäre `VERCEL_ENV` je leer, würde die Negativform **jeden** Build überspringen — auch
   Production. So herum gilt im Zweifel die alte Regel und die Live-Seite deployt weiter.
   Verifiziert am 27.07.2026 mit einem Wegwerf-Zweig: Vorschau → `CANCELED` (kein Build,
   keine Mail), `main` im selben Zeitraum → `READY`.
3. **Middleware-Matcher** auf `/dashboard`, `/admin`, `/api/calculations`, `/auth/callback` beschränkt — öffentliche Seiten werden statisch ausgeliefert und umgehen Edge Middleware Invocations.
4. **CDN-Cache-Header** auf `/api/weather` (s-maxage=900) und `/api/pvgis` (s-maxage=2592000) — die meisten Requests kommen aus dem Vercel-Edge-Cache statt Functions aufzurufen.

**Wichtig bei Kostenanalyse:** Im Vercel Usage-Dashboard immer nach Projekt filtern (`projectId`-URL-Parameter), sonst siehst du die Org-Gesamtzahlen und fixst das falsche Projekt.
