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
4. **Die Lücken genauso gegenlesen wie die Treffer — BLOCKER (30.09.2026).**
   Zehn Einträge ohne Kontakt von Hand öffnen und nachsehen, wo die Adresse
   wirklich steht. Eine Abdeckungszahl wird erst gemeldet, wenn diese Probe
   nichts Neues mehr bringt. Bei den Landkreisen wurde dreimal eine Zahl
   gemeldet (169, 178, 182), und jedes Mal fand der Betreiber, dass mehr geht;
   jede der drei Ursachen hätte eine Handprobe der Lücken in Minuten gezeigt:
   Maildomain des Landes (Bayern), Pressestelle drei Ebenen tief (Vorsuche über
   Sitemap und Website-Suche), Postfach nach dem Amt benannt, aber ohne
   Rollentext. Ergebnis danach 214 statt 169 von 294.
5. **Jede gefundene Fehlerklasse wird eine Regel mit Test** — nie eine
   Handkorrektur an einzelnen Zeilen.
5. **Vor jeder Verwendung** die Belegseite noch einmal abrufen.

## Was dabei nie aufgeweicht wird

- Kein Fund ohne Belegseite.
- Der Name des Postfachs ist kein Beleg für eine Rolle; er ordnet nur gleich gut
  belegte Treffer.
- Ein bekannter, bestätigter Kontakt verschwindet nicht, weil ein neuer gefunden
  wurde.
- „Nichts gefunden" und „noch nicht gesucht" bleiben unterscheidbar.

## Bestände, die schon laufen

| Bestand | Skript | Was anders ist als bei den Gemeinden |
|---|---|---|
| Gemeinden | `scripts/contact-municipal-v2.ts` | der Ausgangsfall |
| Fachbetriebe | `scripts/fachbetriebe-kontakte.ts` | Gratis-Postfächer im Impressum zählen, verwandte Domains |
| Versorger | `scripts/versorger-kontakte.ts` | nur Presse, Kundenservice ist fremde Einheit |
| Presse | `scripts/presse-kontakte.ts` | Impressum zuerst, Pflichtangabe nach § 18 MStV |
| Landkreise | `scripts/kreise-kontakte.ts` | siehe unten |

### Landkreise (30.09.2026)

Die Kreise sind ein Sonderfall der Kommunen: dasselbe Rollenwerk
(Klimaschutz/Energie und Presse), dieselben Spalten in der Kontaktliste. Drei
Unterschiede, jeder aus einer Messung:

- **Die Zuständigkeit ist umgedreht.** Für eine Gemeinde ist eine Kreis-Domain
  eine fremde Behörde; für einen Kreis ist sie die eigene, und die Gemeinden
  auf seinem Portal sind die fremden.
- **Eine Landesdomain als Maildomain.** Bayerische Landratsämter schreiben von
  `lra-xx.bayern.de`, ihre Website heißt `landkreis-xx.de`. Die Maschine
  vergleicht registrierbare Domains, sieht also nur `bayern.de`. Zugelassen
  wird `bayern.de` im Bestand, danach eingeengt auf Landratsamts-Hosts — ein
  Ministerium oder Wasserwirtschaftsamt unter derselben Endung ist nie der
  Kreis. Vorher hatte die Hälfte Bayerns keinen Kontakt. **Wer ein Land mit
  gemeinsamer Verwaltungsdomain erschließt (Bayern, Österreich `gv.at`, die
  Schweiz `admin.ch`), braucht dieselbe Einengung** — die Maschine selbst
  unterscheidet Hosts unter einer Landesdomain nicht.
- **Die Gebäudeverwaltung ist keine Klimaschutzstelle.** Hochbau und
  Gebäudemanagement stehen auf den Klimaschutz-Seiten der Kreise (eigene
  Liegenschaften) und wurden als Energie gelesen; das Vorzimmer des Landrats
  als Presse. Beides in 2 von 30 handgelesenen Treffern.

Seitenbudget 30 statt 15: Kreisportale sind groß, mit 15 Seiten blieben
Klimaschutzseiten ungelesen, die in der Linkliste schon standen.

## Auf andere Länder übertragen

Übertragbar ohne Änderung: Ablauf, Belegpflicht, Zwischenspeicher, Nachprüfung
der Belegseite, Tauglichkeit der Postfächer. Je Land neu: das Rollenwerk (es
trägt deutsche Wörter — „Klimaschutzmanager", „Pressestelle"), die
Namensvarianten der Domains und, wo es eine gibt, die Einengung einer
gemeinsamen Verwaltungsdomain. Das Rollenwerk ist die Stelle, an der ein
neues Land Arbeit kostet; alles andere ist Konfiguration.
