# CLAUDE.md-Kürzung — Grundlage für die Abnahme

**Stand:** 29.07.2026 · **Branch:** `worktree-agent-ab706b283eb2dbc3b` · nicht auf `main` gemergt.

| | vorher | nachher |
|---|---|---|
| CLAUDE.md | 133.963 Zeichen · 1.283 Zeilen (~35.000 Tokens) | **80.998 Zeichen · 555 Zeilen** (~21.000 Tokens) |
| Reduktion | | **−40 %**, rund 14.000 Tokens je Sitzung |
| Ausgelagert | | 97.478 Zeichen in `docs/roadmap-archiv.md`, `docs/produkt-referenz.md` und `docs/lehren/` (Wortlaut, nichts umformuliert) |

Bei rund einem Dutzend Läufen täglich/wöchentlich spart das grob 150.000–400.000 Tokens pro Woche.

## 1. Was in der alten Datei wie viel Platz brauchte

Zeilenweise klassifiziert, Angaben in Zeichen:

| Kategorie | Zeichen | Anteil |
|---|---|---|
| (a) Regel, die beim Arbeiten befolgt werden muss | 59.656 | 44,5 % |
| (b) Begründung / Vorfallsbericht zu einer Regel | 19.947 | 14,9 % |
| (c) Statusliste / abgehakte Roadmap | 23.684 | 17,7 % |
| (d) Referenz (Dateipfade, Tabellen, Befehle) | 29.746 | 22,2 % |
| (e) Redundanz (dieselbe Aussage mehrfach / veraltet) | 931 | 0,7 % |

Die größten Einzelblöcke waren: Roadmap/Statuslisten 31.111 · Projektstruktur-Dateibaum + Komponententabelle 10.025 · Monitoring 9.076 · Workflow-Konventionen 8.625 · Kernkonzept-Routenbeschreibung 7.896 · Design-System 6.696 · Embed-Widgets 6.710 · Berechnungslogik 5.332 · Geteilte Rechen-Basis 5.067 · Legal-Checkliste 5.045 · GModG-Nachrufe in der Faktenprüfung 4.768.

**Nachher** liegt der Schwerpunkt bei den Regeln: rund 74 % Regeltext, 17 % Referenz, 5 % Begründung, 4 % Status.

## 2. Was gekürzt wurde

**(c) Roadmap — von 31.111 auf 2.367 Zeichen.** Phase 0–3 und die abgeschlossenen Arbeitspakete WP 1–3, 5, 8, 10 sind vollständig nach `docs/roadmap-archiv.md` gewandert (Wortlaut). In CLAUDE.md steht nur noch: ein Satz zum Stand, die **vollständige** Liste der offenen Punkte und die aktuelle Priorität. Begründung: Was abgehakt ist, steht im Code; die Liste war Archiv.

**Vorfallsberichte — auf den Kern gekürzt, Volltext ausgelagert.** Fünf Berichte lagen in einer Länge vor, die sich nicht ohne Substanzverlust zusammenziehen ließ. Sie sind wortgleich nach `docs/lehren/` gewandert; in CLAUDE.md steht jeweils die Regel plus so viel Begründung, dass niemand sie wegoptimiert, plus der Verweis:

| Ausgelagert | Zeichen | In CLAUDE.md geblieben |
|---|---|---|
| `docs/lehren/gmodg-rechtsstand-2026-07.md` | 5.084 | Faktenprüfungs-Regeln 10 + 11 und ein Absatz „Warum diese Regeln so scharf sind" (vier falsche Rechtsaussagen auf fünf Oberflächen) |
| `docs/lehren/waermepumpe-modell-entscheidungen.md` | 11.777 | ganzer neuer Abschnitt „Modellprämissen der Rechner — BLOCKER" mit neun Prämissen als Regelsätze |
| `docs/lehren/monitoring-meldelogik.md` | 9.466 | die vier Meldestufen, die Schleuse in `/api/alert`, Ablage statt Mail, Selbstheilungs-Richtung, Frühindikator |
| `docs/lehren/atlas-performance-2026-07.md` | 5.217 | `fra1`-Regel, Präfix-als-Literal-Regel, `vercel.json`-ohne-Kommentare, die vier Mess-Regeln |
| `docs/lehren/vercel-build-und-kosten.md` | 2.804 | die vier Kostenmaßnahmen inkl. Preview-Abschaltung und der Grund für die positive Bedingung |

**(d) Referenz — von 29.746 auf ~13.700 Zeichen.** Die alte Langfassung (Seitenbeschreibungen, Berechnungs-Detailwerte, Ordnerbaum, Komponententabelle, Design-System, SEO) liegt vollständig in `docs/produkt-referenz.md`, damit auch kein Detail verloren ist.
- **Der Ordnerbaum (10.025 Zeichen) ist ersetzt** durch fünf Zeilen „wo liegt was". Er war zusätzlich **teilweise falsch** (er zeigte noch `app/rechner/`, `app/energie/`, `app/simulation/` ohne die Route-Groups `(site)`/`(embed)`, und ihm fehlten die meisten heutigen Module). Ein Baum, der driftet, ist schlechter als `ls`.
- Die Seiten-/Rechnerbeschreibungen (Klima, Balkon, Förderung) sind von Fließtext-Blöcken auf je 2–4 Zeilen gekürzt; alle darin enthaltenen **Regeln** (800-W-Deckel, keine Einspeisevergütung beim Balkon, Kühlgradstunden-Modi, Effizienz-Systematik) sind geblieben.
- Die **Einspeisevergütungs-Sätze** (die konkreten ct/kWh je Halbjahr) sind entfernt und durch einen Verweis auf `lib/feedin-config.ts` / `/datenstand` ersetzt. Alle **Regeln** dazu (20-Jahre-Zahlung, Stichtags-Plan, §-53/§-49-Rechenregel inkl. „10,25 statt 10,24", `note`-Vorbehalt) stehen unverändert drin.
- Die Komponententabelle (10 Zeilen, davon 4 mit veralteten Pfaden) ist entfallen; die Bausteine stehen jetzt in einer Zeile bei „Wo liegt was".

**(e) Redundanz aufgelöst.**
- Der Abschnitt „SEO-Strategie" listete unter „Geplant (Phase 1/2)" Dinge, die längst live sind (Sitemap, JSON-LD, OG-Image, Canonical, die Ratgeber-Seiten). Aus 930 Zeichen wurden 718 mit dem tatsächlichen Stand.
- „Council vor der Abnahme" stand doppelt (Local-First-Merge **und** Faktenprüfung Regel 8). Vollständig bleibt sie in der Faktenprüfung; Local-First verweist dorthin.
- „Split-Heizen nicht im WP-Rechner" stand dreimal (Klima-Beschreibung, WP-Roadmap, Prämissen). Jetzt einmal, in den Modellprämissen.
- „Portal-Kostenseite ist keine Preisquelle" stand in WP 8 und implizit in der Effizienz-Systematik. Jetzt einmal, bei der WP-Investition, mit dem Querverweis auf dieselbe Linie.

**Innerhalb von Regelabschnitten** wurde nur das *Nacherzählen* gekürzt, nie der normative Satz: doppelt erzählte Chronologien, ausgeschriebene Beispielrechnungen und Wiederholungen derselben Lehre in mehreren Absätzen.

## 3. Was bewusst unangetastet blieb

- **Jeder BLOCKER-Abschnitt im Wortlaut:** Zahlen und Einheiten (inkl. Einheitentabelle und der fünf Prüffragen), Geteilte Rechen-Basis (komplette Tabelle inkl. „Typische Falle"-Spalte — das ist die eigentliche Lehre je Zeile), Modals, Farb-Single-Source, Header→Content-Abstand, Abstands-Skala, Faktenprüfung 1–11, Legal-Checkliste 1–10, Wartungsfreier Code, Wächter-Gate, Local-First-Merge inkl. „Woran der Betreiber NICHT abnimmt".
- **Das Eigenverbrauchs-Power-Law mit Quelle** — es ist der Rechenvertrag, auf den die Tabelle „Geteilte Rechen-Basis" verweist.
- **Die Rollen- und Session-Koordinationsregeln** — nur eine Chronologie-Zeile gekürzt.
- **Die Design-Token-Tabelle** — kurz und wird ständig gebraucht.
- **Alle offenen Roadmap-Punkte**, inklusive der Fristen (Öl-Wartungswert 01/2027, Klima-SCOP 10/2026).

## 4. Bewusst *nicht* getan

**Die Zielmarke von 60 KB habe ich nicht erreicht — und halte sie ohne Substanzverlust für nicht erreichbar.** Nach der Kürzung besteht die Datei zu rund drei Vierteln aus Regeltext (~60 KB). Die 60-KB-Marke ließe sich nur einhalten, wenn Referenz **und** Begründung auf null gingen — also genau die Absätze, die verhindern, dass eine Regel beim nächsten Aufräumen als „zu streng" wegoptimiert wird. Ich habe deshalb bei 80,5 KB aufgehört. Wenn die Marke härter ist als die Vollständigkeit, wäre der nächste Schritt, ganze Regelbereiche in geladene Zweitdateien zu verschieben (z. B. Legal-Checkliste und Embed-Konventionen nur bei Bedarf lesen) — das ist eine Produktentscheidung, keine Redaktionsfrage, und gehört dir.

**Keine Regel aus den Memory-Dateien nachgetragen.** Beim Durchgehen ist aufgefallen, dass mehrere gelebte Regeln nur im Memory stehen, nicht in CLAUDE.md: Wächter müssen Werte aus `main` lesen (nie aus Worktree-Kopien) · die Live-DB nie brachial belasten · „Zuletzt geprüft" nur auf tatsächlich Geprüftes stempeln · `OFFEN (bis MM/JJJJ)` in Configs · Worktree-Pfad-Disziplin · klickbare Links statt Shell-Blöcken · ganze Sätze im UI · Emojis in OptionCards behalten. Ich hatte sie zwischenzeitlich eingefügt und wieder entfernt, damit dieser Commit eine reine Kürzung bleibt und im Diff prüfbar ist. **Empfehlung:** in einem eigenen kleinen Commit nachtragen (~1,8 KB).

## 5. Verlust-Kontrolle (maschinell)

Alle 332 fettgesetzten Passagen der alten Datei — dort steht praktisch jede Regel — wurden gegen die neue Datei plus alle Archivdateien geprüft. **Keine ist verschwunden;** die 16 formalen Treffer sind ausschließlich umformulierte Zwischenüberschriften („Warum zentral (Juli 2026):" → „Warum zentral:"), deren Inhalt jeweils vorhanden ist. Zusätzlich wurden 102 charakteristische Bezeichner (Funktionsnamen, Testdateien, Schwellenwerte, Paragrafen) einzeln geprüft — alle vorhanden. Zwei Details habe ich dabei nachträglich zurückgeholt: „diese Werte im Klima-Runbook bewusst nicht pflegen" (echte Wartungsregel) und der Admin-Eintrag im Header.

Ein einziger Satz ist ersatzlos entfallen: der Hinweis, dass `lib/theme-v1.ts` gelöscht wurde — eine Historie zu einer Datei, die es nicht mehr gibt.

## 6. Prüfvorschlag für die Abnahme

1. `git diff main -- CLAUDE.md` durchsehen — jede gelöschte Passage ist entweder Roadmap-Archiv, ausgelagerter Vorfallsbericht, ausgelagerte Referenz oder nachgewiesene Doppelung.
2. Stichprobe: eine beliebige BLOCKER-Regel aus der alten Fassung suchen und in der neuen wiederfinden.
3. Stichprobe: einen der fünf `docs/lehren/`-Berichte öffnen — er enthält den alten Text unverändert.
