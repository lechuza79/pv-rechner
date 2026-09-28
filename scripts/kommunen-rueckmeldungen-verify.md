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
- Bleibt es mehrdeutig — zwei Orte gleichen Namens, keine erkennbare Gemeinde —, bleibt
  die Mail ungeordnet und steht im Bericht. **Raten ist hier teurer als offenlassen:** ein
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
- Kommt die Seite nicht durch (Anmeldung, Bot-Prüfung, Bezahlschranke), aber der Hinweis
  stammt aus der **Besucherherkunft** und die verweisende Seite ist ein Medium oder ein
  soziales Netz (nicht die eigene Website der Gemeinde, kein Mail-Prüfdienst): **eintragen**,
  mit `--kanal presse` bzw. `soziales-netz`. Die Adresse des Beitrags findet eine Google-Suche
  im Browser: `site:<verweisende Domain>` mit `solar-check.io`, dann mit den Schreibweisen
  „Solar Check" und „solar-check". Findet das nichts (Bezahlschranke: Google kennt dann nur
  den Anreißer), dieselbe Suche mit Ortsname und Messgröße — so am 28.09.2026 der LN-Artikel
  über Berkenthin. Nur wenn auch das nichts findet: die Startseite des Mediums.
  Besucher, die von dort auf die Seite der Gemeinde oder ihres Landkreises kommen, SIND der
  Beleg, dass dort etwas steht (Betreiber, 28.09.2026: „wir sehen die über die Referrer").
  Vorher blieben solche Hinweise wochenlang offen, und die Lübecker Nachrichten fehlten
  deshalb in jeder Auswertung. Worüber der Beitrag genau spricht, steht dann nicht fest —
  das gehört in die Notiz, nicht in eine Sperre.
- **Die Besucherherkunft ist die Quelle, nicht die Websuche** (Betreiber, 28.09.2026: „wenn
  niemand geklickt hat, ist der Beitrag ohnehin nahezu irrelevant“). Eine Suche ohne
  Verweis-Anlass läuft nicht mehr.

## 3. Was dem Betreiber gehört

**Über eine Antwort wird NICHT gemeldet** (Betreiber, 23.09.2026). Sie liegt bereits in
seinem Postfach — der Brief verweist als Antwortadresse genau dorthin. Eine Mail „X hat
geantwortet" ist die zweite Nachricht über denselben Vorgang; er hat sie sich ausdrücklich
verbeten. Dasselbe gilt für eine Mail, die sich nicht zuordnen ließ: Auch die liegt dort.
Beides gehört in den Bericht (`done`), nicht in `decisions`.

Als Entscheidung geht nur hinaus, was eine FOLGE hat, die am Postfach nicht sichtbar ist:

- **Ein Widerspruch.** Die Gemeinde ist ab sofort dauerhaft gesperrt, und nur der Betreiber
  kann das zurücknehmen, falls die Einstufung falsch war.

Eingetragene Veröffentlichungen, verworfene Hinweise und nachgetragene Antworten sind
`done`-Zeilen: erledigt, nichts zu entscheiden.

## 4. Bericht

`berichtAblegen` mit `tag: "kommunen-hinweise"`. **Auch ein leerer Lauf wird abgelegt** —
ohne ihn ist „nichts passiert" nicht von „der Lauf ist ausgefallen" zu unterscheiden.
