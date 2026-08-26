# Aufteilungs-Vorschlag: was bleibt in CLAUDE.md, was wird bereichsgebunden

Stand 24.08.2026. **Vorschlag, noch nicht umgesetzt.** Zum Zerlegen durch adversariale Prüfer gedacht.

## Ausgangslage

- `CLAUDE.md`: 965 Zeilen, ~212.000 Zeichen, ~53.000 Token. Anthropics dokumentierte Zielgröße:
  **unter 200 Zeilen** — längere Dateien senken nachweislich die Befolgung, nicht nur den Kontext.
- Bereits erledigt: Vorfallserzählungen ausgelagert (−11.700 Zeichen). Ceiling dieser Methode
  gemessen: ~5.000 Token gesamt. Reicht nicht.

## Der Mechanismus

`.claude/rules/*.md` mit `paths:`-Frontmatter. Eine solche Regeldatei wird **nur geladen, wenn Claude
eine Datei liest, die auf das Muster passt.** Kein Erraten von Absichten (anders als bei Skills), kein
Laden beim Start (anders als bei `@`-Importen, die nichts sparen).

Prüfbar über den `InstructionsLoaded`-Hook: Er protokolliert, welche Instruktionsdatei wann geladen
wurde und warum.

## Das Einsortier-Kriterium

Die Frage ist **nicht** „gehört das thematisch zusammen", sondern:

> **Kann diese Regel gebrochen werden, BEVOR ich eine Datei ihres Bereichs anfasse?**

- **Ja** → bleibt global. Die Regel muss wirken, wenn ich noch gar nicht weiß, wo ich landen werde.
- **Nein** → bereichsgebunden. Wer sie brechen will, muss zwangsläufig eine der Dateien öffnen.

Zweite Frage als Gegenprobe: **Wenn diese Regel fehlt und niemand merkt es — was kostet das?**
Bei stillen, teuren Fehlern (falsche Zahl, Rechtsaussage, Prüfdatum) im Zweifel global lassen.

---

## A) Bleibt global (Ziel: ~200 Zeilen)

| Abschnitt | Zeilen | Warum global |
|---|---|---|
| Deine Rolle | 12 | Gilt ab dem ersten Satz einer Sitzung |
| Koordination paralleler Sessions | 25 | Muss **vor** der ersten Datei wirken — das ist der ganze Zweck |
| Projektüberblick | 7 | Kontext für jede Frage |
| Zahlen und Einheiten — BLOCKER | 29 | Schwerster Fehler des Projekts; betrifft jede Oberfläche mit einer Zahl, quer durch alle Bereiche |
| Geteilte Rechen-Basis — BLOCKER | 43 | Die Regel lautet „prüfe, ob es die Größe schon gibt, **bevor** du eine eigene baust". Nach dem Öffnen der Datei ist es zu spät |
| Faktenprüfung — BLOCKER | 31 | Greift bei Recherche und Gespräch, oft ohne dass eine Datei offen ist |
| Legal-Checkliste — BLOCKER | 30 | Checkliste **vor** dem Bau eines Features; ihr Zweck ist, dass man sie kennt, bevor man anfängt |
| Wartungsfreier Code (keine Jahreszahlen) | 18 | Trifft jede Datei, kein Bereich |
| Workflow: Session-Ende, Local-First-Merge, Git nach `git mv`, Hotfix, kein Piecemeal, kein Overengineering | ~45 | Prozess, gilt immer |
| Befehle | 13 | Nachschlagewerk, ständig gebraucht |
| Hinweise | 10 | Kommunikationsregeln |
| Roadmap + Archiv-Index | 38 | Orientierung; Roadmap ließe sich kürzen |

**Dazu je ausgelagertem Bereich eine Zeile:** „Widgets bauen → Regeldatei X". Damit ist die Regel auch
dann sichtbar, wenn die Pfad-Bindung nicht greift — die Rückfallebene gegen genau das Risiko.

Summe grob: **~300 Zeilen** plus Verweise. Über der Zielgröße, aber ein Drittel des heutigen Stands.

---

## B) Wird bereichsgebunden

| Neue Regeldatei | Inhalt (heutige Abschnitte) | Zeilen | Lädt bei |
|---|---|---|---|
| **Widgets und Bild-Export** | Embed-Widgets · Chart-Baukasten · Das geteilte Bild | 87 | Widget-, Chart- und Embed-Dateien |
| **Förderkatalog** | der gesamte Förder-Block aus „Seiten und Flows" | ~55 | Förder-Module, Förder-Seiten, Förder-Läufe |
| **Rechenmodelle** | Berechnungslogik · Modellprämissen | 64 | Rechenkerne und ihre Konfigurationen |
| **Oberflächen-Bausteine** | Modals · Ergebnis-Abschnitte · Flow-Schritte · Ein/Aus-Schalter · Kopfzeile · „Eine Frage, zwei Orte" | ~80 | Komponenten-Ordner |
| **Design-System** | Design-System (Tokens, Abstände, Kopf-Abstand) | 31 | Theme-Datei und Komponenten |
| **Seiten und Routen** | Routen-Schema · Cluster-Regeln · Menü-Markierung · Seitenbeschreibungen | ~50 | Seiten-Ordner, Weiterleitungs-Konfiguration, Navigation |
| **Überwachung und Betrieb** | Monitoring & Meldelogik · Wächter-Gate · Deployment & Betrieb · Performance messen · Vercel-Kosten | ~110 | Gesundheitscheck, Wächter-Runbooks, Workflow-Dateien, Betriebskonfiguration |
| **CI und Testlauf** | Pre-commit · Browser-Tests · Dev-Server-Falle | ~30 | Test-Dateien, Test-Konfiguration, Hook |
| **SEO und Freischaltung** | SEO · Zwei Fragen vor Livegang · Releaseplan · Aktualisierungsstand · „AUTO-generiert" | ~55 | Sitemap, Freischaltungs-Module, Stand-Modul, Ratgeber-Register |
| **Datenquellen und Lizenzen** | Nutzungsvorbehalt · Vertrauens-Leiste | 30 | Quellen-Register, Vertrauens-Modul, robots/Vorbehalt-Datei |
| **Datenbank-Sicherheit** | Datenbank-Sicherheitsgrenze | 11 | Sicherheits-Modul, Einrichtungs-Routen |

Summe: **rund 600 Zeilen**, die heute jede Sitzung mitschleppt.

---

## C) Die Grenzfälle — hier bitte widersprechen

Diese vier sind die eigentliche Entscheidung. Ich habe sie **global** gelassen; jede könnte man
bereichsgebunden argumentieren:

1. **Geteilte Rechen-Basis.** Bereichsgebunden wäre logisch (es geht um Rechenkerne), aber die Regel
   soll verhindern, dass jemand ein **eigenes** Fundament baut — und wer das tut, öffnet die
   vorhandenen Dateien gerade **nicht**. Das ist der Fehler, der real passiert ist (Balkon-Rechner).
2. **Legal-Checkliste.** Gleiche Struktur: „vor dem Merge jedes neuen Features prüfen". Wer eine neue
   Datenquelle einbaut, fasst das Quellen-Register vielleicht erst an, nachdem er den Fehler gemacht hat.
3. **Zahlen und Einheiten.** Betrifft Atlas, Widgets, Rechner, Ratgeber — eine Pfad-Bindung müsste so
   breit sein, dass sie faktisch immer lädt. Dann kann sie auch global stehen.
4. **Zwei Fragen vor jedem Livegang.** Hängt an einer Entscheidung, nicht an einer Datei. Bereichsgebunden
   würde sie genau bei dem verfehlen, der ohne Prüfung freischaltet.

**Gegenargument, das ich selbst sehe:** Wenn vier BLOCKER global bleiben „weil sie vorher greifen
müssen", gilt dieselbe Logik für fast jeden BLOCKER — und dann spart die Aufteilung nichts. Die
Abgrenzung muss schärfer sein als mein Bauchgefühl. Genau dafür der Prüfdurchgang.

---

## D) Vorgehen

1. Regeldateien anlegen, Inhalt **kopiert**, nicht verschoben — Doppelbetrieb.
2. Protokoll-Haken einschalten, eine Woche mitschreiben.
3. Auswerten: Ist jede Regeldatei mindestens einmal geladen worden, wenn ihr Bereich bearbeitet wurde?
   Gab es Sitzungen, in denen jemand einen Bereich anfasste und die Regel **nicht** kam?
4. Erst dann die Kopie aus der Hauptanleitung entfernen — Bereich für Bereich, nicht alle auf einmal.
5. Rückfallebene bleibt dauerhaft: eine Verweiszeile je Bereich in der Hauptanleitung.

**Was der Doppelbetrieb kostet:** eine Woche lang gar keine Ersparnis (die Inhalte stehen doppelt,
geladen wird weiterhin alles). Das ist der Preis dafür, dass aus „hoffentlich greift es" ein
Messergebnis wird.
