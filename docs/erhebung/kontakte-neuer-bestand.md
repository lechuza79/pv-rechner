# Kontakte eines neuen Bestands erfassen

Die Maschine steht (19.09.2026 aus der Gemeinde-Erfassung herausgezogen). Ein
neuer Bestand — Fachbetriebe, Versorger, Verbände, Presseverteiler — braucht
keine neue Erfassung, sondern drei Angaben.

## Was schon da ist

`lib/kontakt-suche.ts` entscheidet unabhängig vom Bestand:

- **Zuständigkeit:** Eine Adresse zählt, wenn sie auf der eigenen Website steht
  und die eigene (oder eine belegte gemeinsame) Mail-Domain trägt.
- **Rolle:** Sie zählt nur, wenn der veröffentlichte Textblock sie als **eigene
  Stelle oder Titel** der Person nennt — nie als fünften Punkt einer
  Aufgabenliste, nie aus einer Überschrift, wenn der Block eine andere Einheit
  nennt, und **nie aus dem Namen des Postfachs**.
- **Beleg:** Jeder Fund trägt Seite, Textblock und Fingerabdruck der Seite.
- **Vergleich:** Die bisher bekannten Adressen werden bewertet; ein belegter
  alter Kontakt geht nie verloren, ein bestätigtes allgemeines Postfach bleibt
  als Rückfall.

`scripts/lib/kontakt-lauf.ts` führt den Ablauf: bewerten, gezielt
nachrecherchieren (Budget je Eintrag, ein Abruf je Host alle 1,2 s, zweiter
Anlauf nur bei nicht erreichbarer Seite), Belegseite vor der Verwendung erneut
abrufen, Fortschritt und Fehler je Eintrag festhalten.

## Die drei Angaben für einen neuen Bestand

1. **Rollenwerk** — welche Rollen gesucht werden (je Rolle ein Muster für den
   Text und eines für die Überschrift), welche Titel die Rolle zur eigenen
   machen, welche Umgebung einen Block ausschließt, welche Einheit fremd ist,
   welche Postfachnamen allgemein sind. Vorbild: `KOMMUNEN_ROLLENWERK` in
   `lib/contact-municipal-judge.ts`.
2. **Zuständigkeits-Regeln** — welche Domains eine fremde Stelle sind, welche
   ein eigener Betrieb neben der Organisation, welche Vor- und Nachsilben eine
   Domain um den eigenen Namen legen darf.
3. **Einträge** — je Organisation Kennung, Name, Website, die bisher bekannten
   Adressen, optional ein belegter Verbund und bereits vorhandene Seiten.

Dazu ein Ziel: in welche Spalten die Funde geschrieben werden.

## Reihenfolge, die sich bewährt hat

1. **Messgerät eichen:** drei bis fünf Fälle von Hand lösen, bevor die Muster
   geschrieben werden. Ohne das misst man die eigene Erwartung.
2. **Erst bewerten, was schon gespeichert ist**, dann nachrecherchieren. Die
   Nachrecherche ist der teure Teil und bringt bei Gemeinden 2 % zusätzliche
   Funde — bei einem anderen Bestand kann das anders sein, aber gemessen wird es
   hinterher, nicht vorher geschätzt.
3. **30 zufällige Treffer von Hand gegenlesen.** Jeder Bestand hat eigene
   Fehlerklassen: bei Gemeinden waren es Ratsmitglieder, Hausmeisterdienste und
   städtische Gesellschaften; bei Betrieben werden es andere sein.
4. **Jede gefundene Fehlerklasse wird eine Regel mit Test** — nie eine
   Handkorrektur an einzelnen Zeilen.
5. **Vor jeder Verwendung** die Belegseite noch einmal abrufen.

## Was dabei nie aufgeweicht wird

- Kein Fund ohne Belegseite.
- Der Name des Postfachs ist kein Beleg für eine Rolle; er ordnet nur gleich gut
  belegte Treffer.
- Ein bekannter, bestätigter Kontakt verschwindet nicht, weil ein neuer gefunden
  wurde.
- „Nichts gefunden" und „noch nicht gesucht" bleiben unterscheidbar.
