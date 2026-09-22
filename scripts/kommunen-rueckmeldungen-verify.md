# Rückmeldungen der angeschriebenen Kommunen abarbeiten

**Wer:** der zweistündliche Förder-Wächter (`foerder-news-waechter`), Schritt „Outreach".
**Warum es das gibt (22.09.2026):** Die Maschine holt Antworten und Hinweise ab, aber
das *Lesen* blieb an einem Menschen hängen — und blieb deshalb liegen. Berkenthins
Bürgermeister schickte eine fertige Pressemitteilung; sie lag neun Tage unbearbeitet im
Postfach, und die Auswertung meldete währenddessen drei Antworten statt sechs. Zwei
Hinweise auf mögliche Veröffentlichungen lagen seit dem 30.08. unangesehen da.
**Die Regel dahinter:** Was Urteilsvermögen braucht, aber keine Entscheidung des
Betreibers ist, macht Claude selbst. Zum Betreiber geht nur, was nach außen wirkt.

## 1. Rücklauf abholen

`npm run kommunen:ruecklauf -- --tage=14 --schreiben --melden`

Der Lauf trägt Antworten, Widersprüche und Unzustellbarkeiten nach. Danach bleibt die
Liste „nicht zuzuordnen". **Jede Mail darin, die nach einem Menschen aussieht, wird in
DIESEM Lauf angesehen** — nicht gemeldet und liegengelassen:

- Öffne die Mail im Postfach (`--tage` groß genug wählen, damit sie noch dabei ist) und
  lies, wovon sie handelt. Der Ortsname steht fast immer im Text, in der Signatur oder
  im zitierten Betreff.
- Führt das eindeutig zu einer angeschriebenen Gemeinde: Notiz und Status von Hand
  nachtragen (dieselbe Form wie der Lauf sie schreibt: Datum, Art, Betreff, Absender,
  darunter der Text). **Eine Veröffentlichung wird nicht zu „geantwortet" herabgestuft**,
  das Antwortdatum wird trotzdem gesetzt.
- Bleibt es mehrdeutig — zwei Orte gleichen Namens, keine erkennbare Gemeinde —, geht
  die Mail als Entscheidung an den Betreiber. **Raten ist hier teurer als fragen:** ein
  falsch gesetztes „gesperrt" verliert eine Gemeinde für immer.
- Fremde Post (Partnerprogramme, Dienstleister, Behördenregistrierungen) wird ignoriert.
  Kommt dieselbe Quelle mehrfach vor, gehört sie in die Ausblendliste des Laufs.

## 2. Offene Hinweise auf Veröffentlichungen abarbeiten

`npm run kommunen:stand` listet sie am Ende („offene Hinweise"). Jeder Hinweis wird in
diesem Lauf **gelesen**, nicht weitergereicht:

- Seite aufrufen und prüfen: Nennt der Beitrag den Ort UND seine Platzierung, und stammt
  er von der Gemeinde, einem Medium oder einer Plattform — also keine fremde Seite, die
  zufällig „Solar-Check" schreibt? (Vier Fehltreffer dieser Art standen einen Monat in
  der Tabelle: gemeint war der Solar-Check der Verbraucherzentrale.)
- Trägt er: `npm run kommunen:veroeffentlichungen -- --eintragen <Gemeindeschlüssel> <Adresse>`
  (`--ohne-link`, wenn er uns nicht verlinkt; `--nicht-mehr-online`, wenn der Text weg
  ist; `--gesehen JJJJ-MM-TT` für den ersten Beleg). Der Eintrag setzt Status und Notiz
  mit — damit meldet der wöchentliche Lauf denselben Fund nicht erneut.
- Trägt er nicht: den Grund als Notiz an die Gemeinde schreiben, mit der Adresse. **Ohne
  diesen Vermerk kommt der Hinweis nächste Woche wieder** — die Notiz IST das Gedächtnis,
  eine zweite Tabelle „gesichtet" wäre eine zweite Wahrheit.
- Kommt die Seite nicht durch (Anmeldung, Bot-Prüfung), bleibt der Hinweis offen und
  wird beim nächsten Lauf erneut versucht. Nicht eintragen, was niemand gesehen hat.

## 3. Was dem Betreiber gehört

Nur zwei Dinge, beide als `decisions` (alles andere geht stumm in die Ablage):

- **Eine Gemeinde hat geschrieben und wartet auf eine Reaktion.** Der Brief lebt davon,
  dass ein Mensch antwortet; eine Antwort im Namen des Betreibers zu schreiben ist
  Außenkontakt und nicht Sache des Wächters. Nenne Ort, Datum, Betreff und in einem Satz,
  was die Gemeinde will.
- **Eine Mail, die sich nicht zuordnen ließ** (siehe 1) — mit Absender und Betreff.

Eingetragene Veröffentlichungen, verworfene Hinweise und nachgetragene Antworten sind
`done`-Zeilen: erledigt, nichts zu entscheiden.

## 4. Bericht

`berichtAblegen` mit `tag: "kommunen-hinweise"`. **Auch ein leerer Lauf wird abgelegt** —
ohne ihn ist „nichts passiert" nicht von „der Lauf ist ausgefallen" zu unterscheiden.
