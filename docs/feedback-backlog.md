# Feedback-Backlog

Gesammeltes Nutzer-/Reddit-Feedback, das nach und nach eingearbeitet wird.
Status-Legende: ✅ erledigt · 🔄 in Arbeit / offene Entscheidung · ⬜ offen (noch nicht angefasst)

> Stand: 2026-07-05. Punkte 1–6 liegen im Worktree/Branch `worktree-reddit-feedback-karte`
> (noch nicht auf `main` gemergt — warten auf Abnahme).

---

## Karte (MaStR-Anlagenbestand)

### 1. ✅ Erzeugungsart wechseln aktualisiert den Wert nicht (Touch)
**Quelle:** Reddit (Firefox/Android)
**Problem:** Der Werte-Kasten auf der Karte hing an der Maus-Hover-Logik. Auf Touch
gibt es kein Hover → beim Umschalten der Erzeugungsart verschwand der Wert bzw.
blieb beim Abwählen stehen; man musste die Region erneut antippen.
**Lösung:** Werte-Anzeige von Hover auf Auswahl umgestellt. Auf Mobil zeigen die
3 KPIs unter der Karte reaktiv die gewählte Region + den aktiven Filter; auf Desktop
bleibt der Karten-Kasten als Hover-Vorschau. (`components/MastrMap.tsx`,
`components/MastrHeroSection.tsx`)

### 2. ✅ Bundesland-Summen zeigten 0
**Quelle:** Reddit
**Problem:** Nach dem Reinzoomen in ein Bundesland zeigte der Karten-Kasten den
Bundesland-Namen mit Wert 0 — die Karte hatte bereits Landkreis-Daten geladen, in
denen die Bundesland-Kennung nicht existiert.
**Lösung:** Beim Ebenenwechsel wird der Hover-Zustand geleert; der Kasten zeigt nur
Werte für Regionen, die in der aktuellen Ansicht existieren.

### 4. ✅ Kennzahl steht auf Desktop doppelt
**Quelle:** Nutzer
**Problem:** Der (für Mobil gedachte) Karten-Kasten dupliziert auf Desktop den Wert
aus der rechten Spalte.
**Lösung:** Karten-Kasten nur noch bei echtem Hover (Desktop-Affordance) — kein
Duplikat mehr.

### 5. ✅ Mobil: 3 KPIs nebeneinander, Karte kleiner
**Quelle:** Nutzer
**Problem:** Karte war 640px hoch → Zahlen-Panel lag außerhalb des sichtbaren
Bereichs.
**Lösung:** Karte auf Mobil kleiner (440px); die 3 Kennzahlen (Leistung · Anlagen ·
⌀ Größe) als Reihe direkt unter der Karte, Live-Ring darunter. Karte + Zahlen passen
zusammen auf den ersten Screen. (`lib/theme.ts`, `app/(embed)/layout.tsx` CSS)

---

## Wording

### 3. ✅ „Leadfunnel" nicht allgemeinverständlich
**Quelle:** Reddit
**Problem:** „Ohne Leadfunnel" verstehen nicht alle.
**Lösung:** Überall ersetzt durch „ohne Anmeldung, ohne Verkaufsanrufe"; kurze
Tagline „Direktes Ergebnis. Ohne Anmeldung, ohne Verkaufsanrufe." Betroffene
Stellen: Startseite-/Rechner-Untertitel, OG-Vorschaubild, Meta-Descriptions
(mehrere Seiten), Datenschutz-Text. „Leadfunnel" bleibt nur noch als
Dev-Jargon in CLAUDE.md (nicht nutzer-sichtbar).

---

## Flows / Übergaben

### 6. ✅ PLZ aus Live-Simulation wird nicht in den Rechner übernommen
**Quelle:** Nutzer
**Problem:** Nach PLZ-Eingabe in der Live-Simulation musste man sie im vollständigen
Rechner erneut eingeben.
**Lösung:** Der „… vollständig berechnen"-Button hängt die PLZ jetzt an
(`/photovoltaik-rechner?a=<größe>&plz=<plz>`). Der Rechner liest sie aus und ruft
den Standort-Ertrag automatisch ab. Zusätzlich: der Hinweis „PLZ eingeben für
standortgenauen Ertrag" wird unterdrückt, wenn bereits eine gültige PLZ vorliegt
(sonst blinkte er beim Übernehmen kurz fälschlich auf).
(`components/SimulationPanel.tsx`, `app/(site)/photovoltaik-rechner/rechner.tsx`)
</content>
