# Wächter: Zuständigkeit (Stand 17.09.2026)

**Fachliche Wartung aller Solar-Check-Wächter liegt bei Claude** (Betreiber, 17.09.2026).
Eine dauerhafte Aufteilung zwischen Claude und Codex ist nicht gewünscht; eine spätere
Migration wäre eine eigene, vollständige Umstellung aller Aufträge — nicht ein einzelner.

Zwei Ebenen, nicht verwechseln:

- **Fachliche Wartung** (lesen, urteilen, Katalog ändern, berichten): Claude-Zeitpläne unter
  `~/.claude/scheduled-tasks/`. Versionierte Vorlage des Förderwächters:
  `docs/waechter/foerder-news-waechter-task.md` (die installierte Kopie muss inhaltsgleich sein; die Zeitplan-Verwaltung entfernt nur den letzten Zeilenumbruch).
- **Technische Läufe** (abrufen, versenden, Postfach): GitHub Actions. Sie urteilen nicht und
  bleiben, wo sie sind.

## Claude-Zeitpläne (Solar Check)

| Auftrag | Aufgabe | Rhythmus (lokal) | Letzter Lauf | Nächster Lauf |
|---|---|---|---|---|
| `foerder-news-waechter` | Förderprogramme, Quellen-/Kommunenbestand, Antworten; CO₂, EEG, BEG, GModG | alle 2 h (seit 17.09.2026, vorher 00:30 täglich) | 17.09. 07:22–07:41 UTC (erster Lauf nach Übergabe; Codex bis 06:54 UTC) | alle 2 h zur vollen Stunde |
| `foerder-vollpruefung-quartal` | Vollprüfung Förderdaten | 1.1./4./7./10. 04:23 | 01.07.2026 | 01.10.2026 |
| `solar-check-error-triage-daily` | Fehler + Antwortzeiten | täglich 02:15 | 17.09.2026 | 18.09.2026 |
| `solar-check-preis-waechter` | Preis-Pipeline | Mo 07:15 | 14.09.2026 | 21.09.2026 |
| `solar-check-auto-aenderungen-wochenbericht` | Rechenschaft über Selbständerungen | So 07:15 | 13.09.2026 | 20.09.2026 |
| `solar-atlas-welle-monitor` | Atlas-Index-Wellen | Sa 07:15 | 12.09.2026 | 19.09.2026 |
| `solar-check-projekt-statistik` | Tokens/Zeit erfassen | Mo 07:00 | 14.09.2026 | 21.09.2026 |
| `vercel-kosten-waechter` | Vercel-Ausgaben | Mo 08:00 | 14.09.2026 | 21.09.2026 |
| `co2-prognose-monitor` | CO₂-Prognosen, Strommix-Reihen | 3. des Monats | 03.09.2026 | 03.10.2026 |
| `solar-check-seo-waechter` | Sichtbarkeit | 2. des Monats | 02.09.2026 | 02.10.2026 |
| `solar-check-rechenmodell-council` | Rechenmodelle adversarial | 12. des Monats | 12.09.2026 | 12.10.2026 |
| `solar-check-geraete-config-verify-jaehrlich` | Geräte-Config | quartalsweise 15. | 15.07.2026 | 15.10.2026 |
| `waermepumpe-werte-verify-jaehrlich` | Wärmepumpen-Werte | quartalsweise 20. | (Anlage nach Termin) | 20.10.2026 |
| `solar-check-legal-waechter` | Recht, Lizenzen, Rechtstexte | 15.2./5./8./11. | 15.08.2026 | 15.11.2026 |
| `co2-preis-verify-jaehrlich` | CO₂-Preispfad | 8.12. | — | 08.12.2026 |
| `eeg-verguetung-verify-halbjaehrlich` | EEG-Sätze, Marktwert | 28.1./28.7. | 28.07.2026 | 28.01.2027 |
| `solar-check-freiflaeche-verify` | Zuschlagswerte | 25.1./4./8. | 25.08.2026 | 25.01.2027 |

## Codex-Automationen

| Automation | Stand | Bemerkung |
|---|---|---|
| `f-rderlauf-ergebnis-pr-fen` (Förderwächter-Fortsetzung) | **PAUSED** seit 17.09.2026 ~07:00 UTC | letzter Lauf endete 06:54 UTC (Commit a7965881). Übergabe an Claude. Akten bleiben unter `~/.codex/.chatgpt-projects/…/watcher-maintenance/` als Vorbestand lesbar. |
| `w-rmepumpenpreise-aktualisieren` | ACTIVE, täglich 08:15 | täglicher Händler-Katalogimport (`npm run wp:katalog`) — Wartung liegt noch bei Codex, siehe unten |
| `kommunen-vollst-ndig-pr-fen` | PAUSED | — |
| `reddit-recherche-morgens-und-abends`, `liab-kosten-nachmessen`, `e-auto-datenbestand-…` | — | nicht Solar-Check-Wartung bzw. pausiert |

## GitHub-Läufe (technisch)

| Lauf | Aufgabe | Zeitplan (UTC) | Letzter Lauf |
|---|---|---|---|
| `foerder-watch.yml` | Quellensuche, Beobachtung, Screening | täglich 03:40 | 16.09. 08:54 ok |
| `foerder-anfragen.yml` | **einziger** Behördenversand | Mo–Fr 08:07/11:23/13:41 | 16.09. 17:44 ok |
| `kommunen-ruecklauf.yml` | **einziges** Postfach-Lesen | täglich 06:10 | 16.09. 11:25 ok |
| `health-check.yml` | Verfügbarkeit, Kosten, Sicherheit | alle 3 h | 17.09. 06:38 ok |
| `flows-nightly.yml`, `mastr-refresh.yml`, `story-bucket.yml`, `laender-sync.yml`, `strahlung-sync.yml` | Daten/Tests | siehe Datei | — |

GitHub startet geplante Läufe regelmäßig Stunden zu spät; ein noch nicht gestarteter Lauf ist
kein Ausfall und kein leeres Postfach.

## Offen

- Die Codex-Automation „Wärmepumpenpreise aktualisieren" (täglicher Händler-Katalogimport) zieht erst
  mit ihrem Feature um: Import-Skript und Katalog-Anzeige liegen nur im nicht gemergten Arbeitsstand
  `codex/wp-ergebnis-design` (34 Commits vor `main`, dazu ungesicherte Änderungen; Stand 19.09.2026).
  Auf `main` liest nichts den Katalog, ein GitHub-Lauf auf `main` hätte kein Skript. Beim Merge dieses
  Stands kommt der GitHub-Lauf im selben Zug dazu (täglich, in `GEPLANTE_LAEUFE` des Gesundheitschecks),
  danach wird die Codex-Automation pausiert. Bis dahin läuft sie weiter; sie schreibt nur in eine
  Tabelle, die noch keine Seite anzeigt.
