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

---

## Kommunale Förderung im Wärmepumpen-Rechner

### 7. ⏳ Erdwärme bekommt 200 € zu wenig angezeigt
**Quelle:** eigener Fund beim Bau des Förderchecks (19.08.2026)
**Problem:** Poing zahlt 800 € für Grundwasser- und Erdwärme-Wärmepumpen und
600 € für Luft/Wasser (Richtlinie Abschnitt 5.2.2, Volltext in
`docs/quellen/Poing_Rationelle-Energienutzung_Foerderrichtlinie_2021-06-24.pdf`).
Der Katalog kennt nur einen pauschalen Satz je Programm (`wpPauschale`), deshalb
rechnen wir den niedrigeren — obwohl der Rechner die Wärmequelle im Frageweg
längst abfragt (Luft/Wasser vs. Sole/Wasser). Wer eine Erdwärmepumpe plant,
bekommt also 200 € weniger angezeigt, als ihm zusteht.
**Fehlerrichtung bewusst so:** lieber eine angenehme Überraschung als eine
eingeplante Zahl, die nicht kommt. Der Unterschied steht als Bedingung im
Detail-Fenster („für Erdwärme oder Grundwasser sind es 200 € mehr").
**Wartet auf:** das Förder-Datenmodell mit Satz je Wärmequelle — übergeben an die
Session, die die Förder-Erfassung umbaut (Stand `friendly-benz-99b7f3`,
19.08.2026), dort als Lücke (a) von dreien geführt. Die anderen beiden:
(b) Bestand/Neubau als Programm-Bedingung statt als Gate im Rechner,
(c) ausdrückliches Feld für „schließt Bundesförderung aus" statt der heutigen
leeren Kombinierbarkeitsliste.
**Sobald das Modell steht:** `fundingAmount` im Wärmepumpen-Zweig auf den Satz je
Quelle umstellen und den Rechner `wpType` durchreichen lassen. Der Stolperfallen-
Test in `lib/__tests__/waermepumpe-kommunalfoerderung.test.ts` meldet sich
ohnehin, sobald das erste prozentuale WP-Programm dazukommt.

---

## Solar-Atlas: Vergleichsgruppen der Gemeindeseite

Aus der Sitzung vom 20./21.08.2026, in der Brief und Gemeindeseite auf eine
gemeinsame Rechnung gestellt wurden. Beide Punkte sind BEKANNT und bewusst
offen gelassen — nicht übersehen.

### 8. ⏳ Kein Verweis auf die vollständige Rangliste

**Wunsch des Betreibers:** Von der Nachbarschafts-Liste auf der Gemeindeseite
auf die ganze Tabelle verlinken statt hundert Zeilen nachzuladen.

**Warum es nicht gebaut ist:** Es gibt keine Ranglisten-Seite, die dasselbe
rechnet wie der Eigentümer-Umschalter der Gemeindeseite.

| Umschalter | rechnet | passende Ranking-Seite |
|---|---|---|
| Privat | privat_dach + steckersolar je Einwohner | nur `dach-privat-pk` (Dächer OHNE Balkone) |
| Gewerbe | gewerbe_dach + freiflaeche je Einwohner | keine |
| Alle | alles je Einwohner | **bewusst keine** |

Der letzte Fall ist der aufschlussreiche: Für „alle Anlagen je Einwohner" gibt
es absichtlich keine Rangliste. Der Grund steht an `solar-gesamt` in
`lib/awards.ts` — „je Einwohner führt Büttel mit 4.205.483 Wp je Kopf (rund 120
Einwohner neben einer Industrieanlage), eine Zahl, die niemand lesen kann".
Deshalb ist diese Liste dort nur ABSOLUT veröffentlicht.

Ein Link würde also auf eine Seite führen, die anders rechnet als die Liste
darüber — genau die Sorte Widerspruch, die diese Sitzung beseitigt hat.

**Zwei Wege, wenn es wieder aufgegriffen wird:**
- klein: das Fenster weiterblättern lassen (die nächsten 100 auf Klick, 15 KB je
  Abruf, eine einzige Rechnung, kein Widerspruch möglich);
- groß: Umschalter und Award-Kategorien auf DIESELBE Einteilung bringen. Dann
  passt der Link überall — es heißt aber, „Privat" projektweit gleich zu
  schneiden und zu entscheiden, ob es „Alle je Einwohner" als Liste geben soll.

### 9. ⏳ „Alle · Leistung je Einwohner" ist bundesweit unlesbar

**Befund (21.08.2026, am laufenden Build gemessen):** In der bundesweiten
Gruppe „Gemeinden und Kleinstädte" führt Neukieritzsch mit 61,6 kWp je
Einwohner — ein Ort mit großem Solarpark auf einer früheren Tagebaufläche.
Melsungen steht dann bei −99 %, und sämtliche Balken sind Haarlinien.

Dieselbe Erscheinung, wegen der es die Award-Rangliste „alle je Einwohner" nicht
gibt (siehe Punkt 8). Die Größenklasse hilft hier nicht: Diese Orte SIND
Gemeinden und Kleinstädte, sie haben nur einen Investorenpark an der Gemarkung.

Unter „Privat" tritt es nicht auf — dort gibt es keine Freiflächen.

**Entscheidung des Betreibers steht aus.** Denkbare Antworten: die
Freiflächen in der Landes-/Bundesansicht aus der Pro-Kopf-Zahl nehmen (weicht
dann von der Kreis-Ansicht ab), diese Kombination dort gar nicht anbieten, oder
so lassen und die Spitze als das lesen, was sie ist.
