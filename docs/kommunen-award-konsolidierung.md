# Kommunen-Outreach + Award + Thin-Content — Konsolidierung

> Briefing für die **eine** fokussierte Session, die den Award treibt. Stand: 2026-07-24.
> Grund: Award, Thin-Content und Outreach greifen auf **dieselben** Gemeinde-Atlas-Seiten
> zu — parallel bauen = gegenseitiges Überschreiben. Dieses Dokument bündelt, was schon
> existiert, wie die drei Fäden zusammenhängen, und in welcher Reihenfolge gebaut wird.

## Die drei Fäden und ihr gemeinsamer Nenner

1. **Outreach** (fertig gebaut, s.u.): Gemeinden anschreiben, damit sie das Solar-Widget einbetten → Backlinks/Reichweite.
2. **Award** (evaluiert, geparkt): Gemeinden Solar-Awards verleihen → stärkerer Embed-Anreiz (Pressestelle zeigt Badge).
3. **Thin-Content** (Parallel-Session): die Gemeinde-Atlas-Seiten sind dünn/noindex → mehr Substanz.

**Der Nenner:** Award-Ranking + Badge auf der Gemeinde-Atlas-Seite ist *gleichzeitig* die
Substanz gegen Thin-Content **und** der Outreach-Aufhänger. Es ist eine Fläche, nicht drei.

## Was schon gebaut ist (NICHT neu bauen) — Branch `worktree-kommunen-kontakt-db`

- **Kontakt-DB `kommunen_kontakt`** (Supabase, live, RLS nur service_role): 11k Gemeinden über AGS mit `mastr_regions` verknüpft. Spalten: `website` (98 %), `kontakt_url` (71 %), `email`; Outreach-Workflow (`outreach_status`, `channel`, `contacted_at`, `responded_at`, `notes`, `draft_subject/body`); Politik (`gruene_pct/linke_pct/spd_pct`, BTW 2025); **Rang (`dach_perzentil`, `dach_rang_kreis`, `kreis_gemeinden`)**. Befüllt über `scripts/kommunen-kontakt-refresh.ts` (Phasen `--setup/--wikidata/--forms/--probe/--wahl/--rang/--stats`).
- **Die park-immune Award-Kennzahl liegt schon in der DB:** Dach-Leistung pro Kopf, als bundesweites Perzentil + Landkreis-Rang (`--rang`, aus Rollup `mastr_gemeinde_solar`). Das ist das validierte Award-Fundament — der Award muss es nur noch *verwenden*, nicht neu herleiten.
- **Outreach-Cockpit** `/admin/kommunen` (interner Bereich): filtern (Bundesland/Status/hat-Link/Politik-Sortierung), Status pflegen, **Anschreiben-Generator** (Template, park-immuner Rang-Catcher im Betreff, Link auf die Gemeinde-Atlas-Seite). Reine Funktion `lib/kommunen-outreach-draft.ts`.
- **Atlas-URL einer Gemeinde:** `atlasPathForRegionId(regionId)` in `lib/atlas.ts` (nur im Next-Request-Kontext, wegen `unstable_cache`).

## Award-Schema (aus dem Daten-Realitäts-Check, 2026-07-23)

**BLOCKER-Erkenntnis:** Freiflächen-Parks vergiften absolute/pro-Kopf-Rohzahlen (24-Ew-Gemeinde
mit einem Park = absurder „pro-Kopf"-Wert). **Regel: jede Kategorie ehrlich betiteln, was sie
misst.** Merit-Achse Bürger = **Dach-Leistung pro Kopf** (Freiflächen raus). Exklusivität
(~8 % Sieger) ist gewollt.

| Award | Misst | Sieger-Typ | park-immun? |
|---|---|---|---|
| **Balkon-Pionier** | Balkonanlagen pro Kopf | Bürger/Mieter (klein) | ja (sauberste Kategorie) |
| **Balkon-Hauptstadt** | Balkonanlagen absolut | Großstadt | ja |
| **Solardach-Spitzenreiter** | Dach-kWp pro Kopf | Bürger (Eigenheim, ländlich) | ja |
| **Solar-Standort** | Gesamtleistung inkl. Freifläche | Gewerbe/Fläche | — (ehrlich als „Standort" betiteln) |
| **Zubau-Champion** | Zuwachs im Jahr | Wachstum | — |

Sieger je **Landkreis (400) + Bundesland + Deutschland**, exklusiv Platz 1.
**Balkonkraftwerke** (Segment `steckersolar`, 1,42 Mio in 10.667 Gemeinden) = überzeugendste
Kategorie, credible absolut UND pro Kopf.

## Wie der Award Thin-Content löst

Die Gemeinde-Atlas-Seite bekommt einen **Ranking-/Award-Block**: „Solardach-Spitzenreiter im
Landkreis X", „Top 10 % Balkon pro Kopf", Vergleich mit Nachbargemeinden. Das ist echte,
einzigartige Substanz je Seite (SEO: „Solar-Ranking Gemeinde X") — genau was gegen Thin-Content
fehlt. Die Rang-Kennzahlen liegen schon vor (s.o.), es fehlt die **Darstellung** auf der Seite.

## Wie der Award ins Outreach zurückspielt

- **Badge** = einbettbares Award-Widget (Widget-Konvention: PoweredBy, DataSourceNote, cookielos) → der eigentliche Embed-Hebel.
- **Städte-Catcher:** der aktuelle Anschreiben-Catcher ist Dach-pro-Kopf (belohnt ländliche Sieger, Großstädte kriegen neutral). Für Städte braucht es eine absolute/Balkon-Kennzahl als zweiten Catcher — das entsteht mit dem Award ohnehin.

## Empfohlene Baureihenfolge

1. **Outreach-Paket dieser Session mergen** (steht eigenständig, hängt nicht am Award).
2. **Award-Rechenkern** als reine Funktion(en): Sieger je Kategorie × Ebene aus den vorhandenen Rollups (Balkon-Kennzahl fehlt noch als eigene Spalte/Aggregat — analog `--rang`).
3. **Ranking-Block auf der Gemeinde-Atlas-Seite** (löst Thin-Content).
4. **Badge-Widget** (Embed) + Verknüpfung ins Anschreiben (Städte-Catcher).
5. Optional: Award-Übersichtsseiten (Landkreis/Bundesland) als weitere Content-Fläche.

## Koordination

- **Eine** Session besitzt die Atlas-Gemeinde-Seiten (Award + Thin-Content zusammen).
- Diese (Outreach-)Session liefert nur das Daten-/Kennzahl-Fundament (fertig) und *konsumiert* den Award später (Badge im Anschreiben) — sie baut NICHT an den Atlas-Seiten.
- Memory: `project_kommunen_outreach`, `project_atlas_index_wellen`, `project_solar_atlas`.
