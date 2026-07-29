# Lehren: Atlas-Ausfall und Performance-Messung, Juli 2026

Wortlaut aus CLAUDE.md, Stand 29.07.2026. Die Regeln daraus (Function-Region `fra1`,
Präfix als Literal, `vercel.json` ohne Kommentare, die drei Mess-Regeln) stehen
weiterhin in CLAUDE.md unter „Deployment & Betrieb"; hier liegen die vollständigen
Vorfallsberichte mit Messwerten.

## Function-Region, Präfix-Literal, vercel.json

| **Function-Region** | **`fra1` (Frankfurt)** — `regions` in `vercel.json` |

**Function-Region `fra1` — BLOCKER, nicht ohne Not ändern.** Vercels Default für neue Projekte ist `iad1` (Washington), Supabase liegt in `eu-central-1`. In dieser Kombination kostet **jeder** DB-Roundtrip ~90 ms Atlantik-Latenz — eine Atlas-Seite macht Dutzende davon. Folge (24.–26.07.2026): Kaltrender einer Gemeindeseite 6,8–8,1 s, direkt am 8-s-Fast-Fail aus `lib/db-timeout.ts` → über 2.300 Timeouts und hunderte 500er quer über den Atlas, **zwei Tage lang unbemerkt**. Nach dem Umzug nach Frankfurt: 0,4–4,0 s. Region und `DB_READ_TIMEOUT_MS` hängen zusammen — wer die Functions aus der EU zieht, muss den Timeout mit anheben. Prüfen lässt es sich am zweiten Segment von `x-vercel-id` (`fra1::fra1::…`), der tägliche Wächter tut das automatisch.

**Atlas-Präfix gehört als Literal in die Abfrage — BLOCKER.** Die ganze Atlas-Hierarchie hängt am AGS-Präfix (2 = Land, 5 = Kreis, 8 = Gemeinde), und `mastr_aggregates_gem` (591.024 Zeilen) hat dafür einen Index. Der greift **nur, wenn der Präfix beim Planen der Abfrage bekannt ist**. Supabase reicht Funktionsargumente als JSON-Nutzlast über einen LATERAL-Join herein — `region_id LIKE p_prefix || '%'` fällt damit auf einen vollständigen Tabellendurchlauf zurück. Deshalb bauen die Zweige, die auf die Rohtabelle gehen, ihre Bedingung mit `format(%L)` in den Abfragetext; die vier heißen Funktionen stehen dafür an **einer** Stelle (`lib/mastr-region-sql.ts`), aus der Setup-Route und `scripts/apply-region-functions.ts` beide lesen. Messung 28.07.2026: 590–650 ms → 67–80 ms je Aufruf, bei **zwei Aufrufen pro Gemeindeseite**.

**Die Falle beim Nachmessen:** `EXPLAIN ANALYZE` mit einem Literal meldet 0,8 ms und einen sauberen Index-Scan — die Bremse ist im Plan gar nicht zu sehen, weil das Literal genau den Fall herstellt, der in Produktion nie eintritt. Belegt hat es erst `pg_stat_statements`. **Wer hier misst, misst den echten Aufrufweg**, nicht die von Hand nachgebaute Abfrage.

**Und die Lehre über die Ursache hinaus: eine einzelne Seitenmessung konnte das prinzipiell nicht finden.** Allein aufgerufen lud die Gemeindeseite in ~1,2 s — grün — und kostete trotzdem jedes Mal zwei volle Tabellendurchläufe. Erst wenn mehrere Seiten gleichzeitig aufgebaut wurden (Suchmaschine, Aufwärmlauf), stauten die sich und rissen die 8-s-Notbremse: 3,2–6,3 s und reihenweise Abbrüche, während der Wächter kurz zuvor noch grün gemeldet hatte. Der Gesundheitscheck misst deshalb jetzt zusätzlich **die teuersten Datenbankabfragen einzeln** (rot ab 400 ms, gesund ~80 ms, `dbProbeVerdict` + `lib/__tests__/health-check-db-probe.test.ts`) — ein Frühindikator, der ohne Last funktioniert. Zwei weitere Messfehler sind dabei mit behoben: die Zufallsgemeinden kamen aus **aufeinanderfolgenden** Zeilen und lagen damit fast immer im selben Landkreis (nur die erste Seite war wirklich kalt, der Rest lief auf warmem Cache), und `x-vercel-cache: STALE` zählte als Kaltaufbau, obwohl das CDN dabei eine fertige Seite ausliefert.

**`vercel.json` verträgt keine Kommentare.** Vercel validiert die Datei strikt gegen ein Schema und bricht den Deploy bei jedem unbekannten Top-Level-Schlüssel ab — auch bei einem reinen `"//kommentar"`. Das scheitert **vor** dem Build, also ohne Build-Log und ohne sichtbaren Fehlergrund (State `ERROR`, leere Logs). Begründungen gehören daher in den Code, den die Einstellung betrifft (hier: `lib/db-timeout.ts`), nicht in die Konfigurationsdatei.

## Performance messen

### Performance messen — BLOCKER

Der Juli-Ausfall ist nicht an einem fehlenden Perf-Fix gescheitert, sondern am **Messen**. Am 21.07. wurde in Production gemessen (Gemeinde kalt 1,8 s) und das zu Recht als Erfolg gemeldet. Dann gingen bis zum 24.07. rund ein Dutzend Atlas-Änderungen live — jede kostete etwas Renderzeit, keine wurde nachgemessen — bis die Summe an den 8-s-Fast-Fail stieß. Drei Regeln, damit das nicht wiederkommt:

1. **Ein Messwert ist kein Zustand.** „Jetzt ist es schnell" gilt bis zur nächsten Änderung. Deshalb misst die Health-Check-Action **nach jedem inhaltlichen Push**, nicht nur nach Perf-Arbeit.
2. **Immer gegen Production messen, nie nur lokal.** Lokal läuft der Server in Deutschland neben der Datenbank — die Atlantik-Latenz der Function-Region ist dort strukturell unsichtbar. Ein lokaler Messwert kann diese ganze Fehlerklasse prinzipiell nicht finden.
3. **Mehrere Stichproben, den langsamsten werten.** Die Kaltrender-Zeiten streuen stark (0,4–5,2 s je nach Gemeindegröße). Eine einzelne Seite kann beruhigend aussehen, während ein Drittel nah an der Notbremse steht — die Notbremse trifft aber die langsamste Seite zuerst, nicht die durchschnittliche.
