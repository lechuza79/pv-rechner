# Der Seiten-Wächter meldet Änderungen, die keine sind (Messung 04.09.2026)

**Kurz:** Neunzehn Förderseiten werden vom Seiten-Wächter an drei oder mehr Tagen
der Woche als „geändert" gemeldet. Am Vortag wurden vierzehn davon an ihrer
Amtsquelle gelesen — **dreizehn waren zellgleich**. Das ist kein Einzelfall und
keine Laune der Städte, sondern ein Fehler unseres Abdrucks. Er kostet jeden Tag
eine Lesesitzung und stellt über die 14-Tage-Nachprüffrist Förderbeträge in
Frage, die sich nie bewegt haben.

**Nicht behoben.** Diese Datei hält die Messung fest, damit der nächste Lauf
nicht bei null anfängt — und damit niemand auf Verdacht eine Fassung 5 baut.

---

## Was gemessen ist

**Der Zeitraum ist bewusst der NACH Fassung 4** (sortierte Token, 26.08.2026).
Über einen längeren Zeitraum gerechnet mischt sich der Zustand davor darunter und
lässt die Reparatur wirksamer aussehen, als sie war.

Änderungsmeldungen je Programm, 28.08. bis 03.09.2026 (sieben Tage):

| Tage | Programm |
|---|---|
| 7 | Memmingen, Weinheim, Feucht |
| 6 | Zweibrücken |
| 5 | Senden, Karlsruhe, Weyhe, Vilshofen, Lohfelden, Beratzhausen |
| 4 | Bergstraße, Limburgerhof |
| 3 | Helmstedt, Rodgau, Ludwigshafen, Mayen-Koblenz, Gernsheim, Asbach, Wietzen |

40 Programme insgesamt geflaggt, **19 davon an drei oder mehr Tagen**.

**Fassung 4 hat ihre eigenen Anlassfälle nicht behoben.** Der Kommentar in
`lib/funding-fingerprint.ts` nennt Lohfelden, Memmingen, Feucht, Weinheim und
Karlsruhe namentlich als die Seiten, die „nachts anders sortieren". Alle fünf
stehen in der Tabelle oben, drei davon mit voller Trefferzahl. Die Sortierung war
richtig und nötig — sie hat nur eine andere Ursache behoben als die hier.

## Was NICHT die Ursache ist

- **Kein Wettlauf innerhalb eines Tages.** Fünf Abrufe im Abstand von je einer
  Sekunde, über 16 der 19 Seiten: **stabil**. Einzige Ausnahme Beratzhausen, und
  dort geht es um ein einziges Token (`tzhaus`, ein zerbrochenes Wort).
- **Kein Wechsel des Abrufwegs.** Der Abdruck aus unserer Produktion und der
  hier lokal errechnete stimmen überein.
- **Nicht die verwürfelten Kontaktadressen.** Die sind seit Fassung 3 heraus,
  und die Seiten wären dann innerhalb eines Tages instabil (sind sie nicht).

## Was belegt ist

**Drei der neunzehn drucken das TAGESDATUM in die Seite.** Am 04.09.2026 im
Rohtext gefunden:

- Memmingen: `Stand: 04.09.2026 - 00:00`
- Feucht und Helmstedt: dasselbe Muster.

Für diese drei ist die Sache erklärt: Der Tag wechselt, die Token `04` und `09`
wechseln mit, der Abdruck ist ein anderer. **Sechzehn bleiben unerklärt.**

**Ein starker Verdacht für den Rest, an zwei Seiten im Wortlaut gesehen:** Die
Amtsseiten tragen in ihrer HÜLLE die Nachrichten der Gemeinde.

- Linsengericht, unter dem Fördertext: „Die Sozialverwaltung ist vom 31.08. bis
  30.09.2026 nicht erreichbar." · „Die Kita-Verwaltung ist am Montag, dem
  14.09.2026 geschlossen."
- Ludwigshafen, ganz oben: „Die Abteilung Standesamt/Einbürgerung … ist am
  Donnerstag, 3. September 2026, … ganztägig geschlossen."
- Limburgerhof liefert **891 KB** für eine Förderseite; der weit überwiegende
  Teil ist ein Nachrichtenarchiv bis zurück ins Jahr 2020.

Solche Meldungen wechseln, ohne dass sich am Förderprogramm etwas ändert — und
sie enthalten Ziffern und lange Wörter, überleben unsere Verdichtung also
vollständig.

**Der naheliegende Griff greift nur zur Hälfte.** Der Screener hat mit
`sichtbarerText` längst eine Funktion, die Navigation, Kopf- und Fußbereich
wegwirft. Auf die 19 Seiten angewandt: Bei Limburgerhof, Asbach, Karlsruhe und
Bergstraße fallen 66 bis 73 % der Token weg, bei Senden, Weyhe und Wietzen
**null Prozent** — die drei benutzen die dafür nötigen HTML-Bereiche gar nicht.
Ein Umbau darauf würde also einen Teil beheben und einen Teil nicht, und welchen
lässt sich an einem einzigen Tag nicht sagen.

## Warum hier trotzdem nichts gebaut wurde

Eine Fassung 5 macht **für jede der 110 Seiten** den alten Abdruck unvergleichbar
— einen Tag lang gibt es keinen Vergleich. Diesen Preis für eine Vermutung zu
zahlen, deren Wirkung sich erst am Folgetag zeigt, ist genau der Handgriff, den
Regel 5 des Wächter-Gates verbietet („wirkt zu hoch/zu niedrig ist kein Grund").
Und ein Filter, der die Hälfte der Fälle erwischt, sieht danach aus wie eine
Lösung und ist keine.

## Was der nächste Lauf braucht

**Die Ursache lässt sich an einem Tag nicht sehen — man braucht die Token von
gestern.** Heute wird nur der Hash gespeichert, und aus zwei verschiedenen Hashes
folgt nichts als „verschieden". Genau deshalb steht in CLAUDE.md, der Wächter
wisse nie, WAS sich geändert hat.

Der kleinste Schritt, der die Frage beantwortet, ist deshalb nicht ein neuer
Filter, sondern ein **Gedächtnis für einen Tag**: die Token-Menge je Seite
aufheben und beim nächsten Abruf die Differenz benennen. Dann steht am Tag darauf
in einer Zeile, was sich bewegt hat — eine Datumszeile, ein Nachrichtenteaser,
ein Betrag —, und der Filter wird gegen einen Befund gebaut statt gegen eine
Vermutung.

Zwei Randbedingungen dafür, die man nicht übersehen darf:

- **Nicht ins öffentliche Repo.** Eine Token-Menge ist der Inhalt fremder Seiten
  in zerlegter Form. Die Datenbank ist der richtige Ort (RLS an, ohne Policy).
- **Die Abruf-Route gibt bewusst keinen Inhalt zurück**, nur den Abdruck — das ist
  eine Urheberrechts- und Missbrauchsentscheidung, keine Bequemlichkeit. Wer die
  Differenz dort berechnen lässt, statt Token herauszureichen, hält sie ein.

## Was das heute kostet

Am 03.09.2026 wurden fünfzehn Programme an ihrer Amtsquelle gelesen, um den
Arbeitsvorrat zu leeren; **eines** hatte sich inhaltlich bewegt, und das nicht
einmal in dem, was gemeldet worden war. Am 04.09. standen dieselben Seiten wieder
im Vorrat. Solange das so bleibt, ist der Vorrat kein Arbeitsplan, sondern eine
Liste, die man irgendwann nicht mehr liest — und dann geht die echte Änderung
darin unter.
