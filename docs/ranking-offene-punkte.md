# Ranking & Atlas — offene Punkte

Stand: 31.07.2026 · Zweig `worktree-gsc-index-status`, noch nicht auf `main`.

Was hier steht, wartet auf eine **Entscheidung des Betreibers**. Alles, was ein
Fehler ist, wird ohne Rückfrage behoben und taucht hier nur auf, solange es
blockiert ist.

---

## 1. Wie heißen die Größenklassen?

Die Ranglisten vergleichen innerhalb von fünf Größenklassen, damit Großstädte
gegen Großstädte antreten. Die **Schwellen** sind gesetzt und belegt; offen sind
nur die **Namen**.

| Einwohner | amtlich (BBSR) | Vorschlag |
|---|---|---|
| unter 1.000 | Landgemeinde | **Dörfer** |
| 1.000–5.000 | Landgemeinde | **Gemeinden** |
| 5.000–20.000 | Kleinstadt | **Kleinstädte** |
| 20.000–100.000 | Mittelstadt | **Mittelgroße Städte** |
| ab 100.000 | Großstadt | **Großstädte** |

**Herkunft der Schwellen:** 5.000 / 20.000 / 100.000 stammen vom Stadt- und
Gemeindetyp des Bundesinstituts für Bau-, Stadt- und Raumforschung. Der
zusätzliche Schnitt bei 1.000 stammt von der Solarbundesliga (2001–2017
bundesweit) und ist der wichtigste: Ohne ihn lagen beim Zubau **alle 100
Spitzenplätze unter 1.000 Einwohnern**, Median 180.

**Warum nicht die amtlichen Namen:** Beim BBSR entscheidet neben der
Einwohnerzahl auch die zentralörtliche Funktion („Gemeinden mit oberzentraler
Funktion werden bereits ab 9.000 Einwohnern als Mittelstadt eingeordnet"). Die
liegt uns nicht vor. Mit amtlichen Namen würden wir eine Typisierung behaupten,
die wir nicht prüfen können.

**Das eine Risiko:** Unter 1.000 Einwohnern sind **14 von 3.798** Orten amtlich
Städte — darunter Arnis, das mit „kleinste Stadt Deutschlands" wirbt. Steht eine
davon auf Platz 1, steht sie unter der Überschrift „Dörfer".

**Empfehlung:** Die Vorschlagsspalte. Schwellen amtlich, Namen in Alltagssprache.

---

## 2. Menü: Ist der Atlas das Ranking oder etwas daneben?

**Der gemeldete Widerspruch:** Im Hauptmenü stehen „Solar-Atlas" und „Rankings
der Kommunen" als zwei gleichrangige Punkte. Die Krümelspur der Ranglisten hängt
sie aber unter den Atlas.

**Was das Council ergeben hat** (drei unabhängige Entwürfe, jeder von einem
Prüfer angegriffen, der ihn kippen sollte — Noten 4, 4 und 5 von 10, keiner
überstand die Prüfung):

Einig waren sich alle drei:
- **Ein Bereich, nicht zwei.** Die Rangliste ist dieselben Daten, anders
  sortiert. Auf die Frage „was soll im Atlas sein, wenn nicht das Ranking"
  lautet die einstimmige Antwort: nichts anderes — es gehört hinein.
- **Das Menü hat unrecht, die Krümelspur hat recht.**
- **Die Ortsseite bleibt unangetastet.** Sie ist das Gut für den Kommunen-Kontakt.
- **Der Ranglisten-Einstieg gehört auf die Atlas-Startseite.**

Gekippt wurden die aufwendigen Entwürfe:
- Das Gebiet aus der Adresse in einen Filter zu schieben verkleinert die
  Crawl-Menge nicht, schreibt sie nur anders — und zerstört die sprechenden
  Adressen, die Presse und Anschreiben brauchen.
- Die Listen unter ihr Gebiet zu hängen ist technisch nicht baubar, weil die
  Adressform mit den Ortsseiten kollidiert.
- Beide kaufen nichts, was eine geänderte Krümelspur nicht auch liefert.

### Die drei Optionen

**A — Ein Bereich, keine Adresse zieht um** *(Empfehlung)*
Ein Menüpunkt, Rangliste als Ansicht im Atlas, Zugehörigkeit stellt die
Krümelspur her.
· Kosten: ein Tag. · Kein bestehender Link bricht.
· Schlechter: Die Rangliste verliert ihre eigene Haustür im Menü.

**B — Ein Bereich mit Adress-Umzug**
Wie A, zusätzlich wandern alle Ranglisten-Adressen unter ihr Gebiet.
· Kosten: groß — Weiterleitungen, Anschreiben-Generator, Verlinkung des Ordens,
Tests, auf einem Zweig, der noch nie live war.
· Schlechter: alles aus A, plus dauerhaft gepflegte Weiterleitungen — für einen
Effekt, den die Krümelspur ohne Umzug liefert.

**C — Zwei bewusst getrennte Produkte**
Atlas = „wie steht mein Ort da" (Outreach), Ranking = eigene Marke „wer baut am
meisten" (Presse).
· Kosten: mittel.
· Schlechter: Zwei Startseiten für dieselben Daten, doppelte Pflege — und der
Widerspruch wird nur andersherum aufgelöst statt beseitigt.

### Kleinster erster Schritt bei A

1. „Rankings der Kommunen" verschwindet aus dem Menü; „Solar-Atlas" bekommt den
   Zusatz „mit den Ranglisten der Städte und Gemeinden".
2. Die Kategorie-Kacheln der Ranking-Übersicht wandern auf die Atlas-Startseite.
3. Krümelspur der Listen läuft über das Gebiet:
   Deutschland › Bayern › Landkreis München › Ranking: Zubau in 5 Jahren.

---

## 3. Orden und Rangliste rechnen verschieden — BLOCKER

**Der Befund, am Code nachgeprüft:** Der Platzierungs-Orden auf der Gemeindeseite
rechnet mit einer 2.000-Einwohner-Grenze und **ohne** Größenklassen. Die
Rangliste, auf die er verlinkt, rechnet **ohne** Grenze und **mit**
Größenklassen.

**Die Folge:** Das Anschreiben sagt „Platz 3", die verlinkte Seite sagt etwas
anderes. Zwei Zahlen für dieselbe Sache, auf zwei Oberflächen, die aufeinander
zeigen. Das ist im Projekt als schwerste Fehlerklasse definiert.

**Warum es hier steht und nicht längst behoben ist:** Die Richtung ist klar — der
Orden muss dieselbe Funktion benutzen wie die Liste. Aber das ändert sichtbar,
was auf der Gemeindeseite und im Brief steht: aus „Platz 3 im Landkreis" wird
„Platz 3 unter den Dörfern im Landkreis". Der Wortlaut hängt an Punkt 1.

**Das ist der Blocker vor den ersten Aussendungen an Kommunen.**

---

## 4. Kleinere offene Fragen

- **Kunstwörter in den Anschreiben.** Die Kategorien tragen intern noch Namen wie
  „Solardach-Spitzenreiter", „Balkon-Pionier", „Zubau-Champion". Auf den
  Ranking-Seiten tauchen sie nicht auf, im Anschreiben-Generator schon. Ein
  Rathaus liest so etwas als Werbung, weil es die Auszeichnung nirgends gibt —
  die nackte Messgröße wirkt stärker. Vorschlag: raus.
- **Gruppenname „Sonstiges".** Es sind die Anlagen, die nicht Haushalten
  gehören. Vorschlag: „Gewerbe & Freiflächen".
- **„Speicher" und „Speicher-Quote" nebeneinander** in der Navigation — niemand
  errät, welches was ist. Vorschlag: „Speicher je Einwohner" und „Speicher je Dach".
- **„Freifläche"** heißt umgangssprachlich Solarpark.

---

## 5. Erledigt, hier nur zur Kenntnis

- **Datenfehler an der Quelle behoben** (29.07.): Gewerbehallen und Großspeicher
  waren als „privat" einsortiert. 17 Orte mit unmöglich großen Privatdächern und
  66 mit zu großen Privatspeichern → jeweils null. Gesamtleistung unverändert,
  ein Wächter hält das dauerhaft.
- **Monatslauf berechnete die Ranglisten-Tabelle nie neu** — sie wäre jeden Monat
  auf dem vorletzten Stand stehengeblieben. Behoben.
- **Widget-Galerie ignorierte die übergebene Gemeinde**: Wer auf seiner
  Gemeindeseite „mehr Widgets" klickte, sah Höchberg. Behoben, in beide
  Richtungen gemessen.
- **Landeshauptstädte wurden am Namen erkannt** — die 965-Einwohner-Gemeinde
  Schwerin in Brandenburg führte deren Rangliste an. Läuft jetzt über den
  Gemeindeschlüssel.
- **Nebenbefund, eigene Sitzung:** Ungültige Atlas-Adressen antworten mit „alles
  in Ordnung" statt „nicht gefunden" (auch auf Produktion, also nicht neu).
