# Neue Zielgruppe: von der Erhebung bis zum Versand

**Das ist DIE Anleitung für jede neue Zielgruppe und jeden neuen Markt** —
„jetzt brauchen wir die Solarparks in Deutschland" ebenso wie „die Gemeinden in
der Schweiz". Alles, was dafür gelernt wurde, steht hier oder im Fehlerkatalog
`docs/lehren/kontakt-engine-fehler.md`; eine zweite Anleitung daneben gibt es
nicht mehr (die erste Prüfkette und ihre Dokumente wurden am 07.10.2026
ausgebaut, ihre tragenden Erkenntnisse stehen unten).

**Drei Fälle, ein Ablauf:**

| Auftrag | Was wiederverwendet wird | Was neu ist |
|---|---|---|
| Neue Zielgruppe aus einem Register (Solarparks, Speicherbetreiber) | alles — Vorlage ist der Windbetreiber-Lauf | Registerabfrage, Gattungswörter, Rollenwerk-Vokabular |
| Neue Zielgruppe ohne Register (Verbände, Agenturen) | Kontaktsuche, Freigabe, Versand | woher die Grundgesamtheit kommt (Schritt 2), Identitätsbeleg |
| Neuer Markt (Gemeinden in der Schweiz) | Kontaktsuche, Freigabe, Versandlauf, Protokoll | Prüfliste „Neues Land" unten — Recht, Quelle, Sprache, Kalender |

**Eine Zielgruppe ist erst fertig eingerichtet, wenn sie in der Zielgruppen-Liste
steht** (`lib/zielgruppen.ts`). Ein Test hält diese Liste gegen alle Stellen, an
denen eine Zielgruppe sonst eingetragen sein muss — Kontaktsuche, Belegung der
Domains, Bestände-Abgleich, Freigabe, Versandweg — und wird rot, sobald eine
fehlt. Vorher war es eine Merkliste mit fünf Punkten, und vergessen wurde immer
einer.


## Die Kontaktsuche

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

## Der Ablauf — Schritt für Schritt, jedes Mal gleich

Jede Fehlerklasse, gegen die ein Schritt gebaut ist, steht im Fehlerkatalog
`docs/lehren/kontakt-engine-fehler.md` (Nummern in Klammern). Vor dem ersten
Schritt eines neuen Bestands: den Katalog lesen.

**Grundsätze, die für alle Schritte gelten**
- **Eine Sitzung führt die Erhebung bis zum Ende** — keine Routinen, keine
  geplanten Aufträge (4). Ein Stopp gilt erst, wenn kein Prozess mehr läuft.
- **Keine bezahlte Suche** (1). Was das Register oder die Maschine nicht findet,
  sucht Claude selbst: WebSearch, eingebauter Browser, Helfer parallel.
- **In der eigenen Arbeitskopie**, mit frischem `npm ci` (5), nie fremde
  Arbeitskopien oder deren Prozesse anfassen.
- **Jede neue Fehlerklasse wird eine Regel mit Test** — nie eine Handkorrektur an
  Zeilen. Die Regel wird absichtlich kaputtgemacht (rot), der Rückweg grün,
  **und zwar erst, nachdem der Stand gesichert ist** (17). Danach Neubewertung.
- **Netzläufe nur unter Last 40** (3); Neubewertung, Auswertung und Berichte
  sind offline und brauchen keine Lastprüfung.

**1. Vorflug.** `--vorflug` muss BEREIT melden: Last, Zugänge gesetzt,
Abhängigkeiten passend, kein zweiter Lauf desselben Bestands, keine bezahlte
Suche im Ablauf, Datenbank erreichbar, jede DDL-Spalte angelegt, Registerstand
gelesen und geschrieben, keine offene Entscheidung zwischen Beständen
(Vorbild `scripts/windbetreiber-refresh.ts --vorflug`, Bausteine
`scripts/lib/vorflug.ts`). Meldet er eine fehlende Spalte: `--setup`, nie von
Hand.

**2. Identität aus der amtlichen Quelle.** Wer zum Bestand gehört, kommt aus
einem Register, nie aus einer Suche (Windbetreiber: Marktstammdatenregister).
Die Registerlesung wird gespeichert, bevor geschrieben wird (8), und bricht ab,
wenn ein referenzierter Eintrag im Verzeichnis fehlt.

**3. Messgerät eichen.** Drei bis fünf Fälle von Hand lösen, bevor die Regeln
geschrieben werden — ohne das misst man die eigene Erwartung.

**4. Website-Beleg.** Jede Website zählt nur, wenn ihr EIGENES Impressum die
Organisation belegt (Name, Registeranschrift, Marke — Regeln 18–22), plus die
im Register selbst angegebene Website und ein Funktionspostfach. Kandidaten:
die eigenen Registerangaben, dann die der Nachbarn an derselben Anschrift,
inklusive deren schon belegter Websites. Gescheiterte Abrufe werden
wiederholt, nicht gespeichert (7).

**5. Neubewertung nach jeder Regeländerung** (`--neu-bewerten`, nur aus dem
Speicher, 23). Kandidaten unter einer alten Domain-Regel werden entfernt (13).

**6. Gegenlesen der Website-Stufe** (14): 20 zufällige Treffer, 10 Ablehnungen,
10 Offene von Hand. Jede gefundene Fehlerklasse → Regel → Test → Schritt 5.

**7. Handprüfung der Offenen** (`--offen`: gruppiert nach Registeranschrift,
größte Leistung zuerst). Für jede Anschrift: Muttergesellschaft an der
Anschrift suchen, sonst je Organisation Name + Ort, Domain des
Registerpostfachs. Eintragen NUR über die Befehle des Bestands:
`--manuell ABR1,ABR2 <url> [--seite=<url>]` (dieselbe Prüfung wie die Maschine;
die Belegseite darf eine andere Seite derselben Website sein, ein Name dort
belegt nur, wenn er die Organisation identifiziert, 20) oder
`--keine ABR1,ABR2 "<was gesucht wurde>"` (Notiz ≥ 40 Zeichen). Der Handbefehl
ersetzt nie still eine schon belegte andere Website (`--ersetzen`, 55) und
übernimmt keinen Beleg, der nur auf einer Unterdomain steht (`--subdomain-ok`
nur, wenn Haupt- und Unterdomain dieselbe Firma sind, 58). Die Belegseite wird
gespeichert; `--neu-bewerten` prüft jede Handübernahme daran erneut und
MELDET, was die heutige Regel nicht mehr trägt — und umgekehrt jedes von Hand
vermerkte „keine“, dessen abgelehnter Kandidat heute trägt (62) — geändert wird nichts, das
entscheidet ein Mensch (`--zuruecknehmen`). Fehlen alte Belegseiten:
`--belegseiten-nachholen`. Nach der Handprüfung: `--geschwister` (gleiches
Postfach, gleiche Anschrift) und `--anschrift-gegenlesen` (Anschriftsbelege auf
Seiten ohne Energiebezug, alle von Hand lesen, 57) und `--marke-gegenlesen` (Marken ohne
Rückhalt in Postfach oder Postleitzahl, 59) und `--marke-gegenlesen --namen` (kurze
Namen ebenso, 75). Für Tempo bis
zu vier Helfer parallel, jeder mit eigenem Block und dem Auftragstext
(Vorlage unten). Jeder Helfer berichtet Ablehnungen, die er für falsch hält —
daraus werden Regeln.

**8. Kontakte.** `--mode=research` (begrenzte Abrufe je Website, das Impressum
der Website-Stufe geht als Spur und als gespeicherte Seite ein, 26), dann
`--mode=evaluate` (offline), `--mode=summary`, `--mode=stichprobe` (20 Kontakte,
10 Lücken lesen, 14/15), dann `--mode=apply --schreiben` (nur aktuelle Regeln,
nur noch belegte Websites, ein unveränderter Kontakt behält seine Freigabe, 24).

**9. Handprüfung der Websites ohne Kontakt.** Seite mit Postfach gefunden →
`--mode=spur --ids=<website> --url=<seite>` (die Maschine liest und urteilt);
sonst `--kein-kontakt <website> "<welche Seiten gelesen>"`. Danach Schritt 8
(evaluate, apply).

**10. Freigabe** (`kontakte-freigabe.ts --bestand=… --schreiben`): taugliches
Postfach, Domain nimmt Mails an, Fundstelle auf der eigenen belegten Website
(25), Adresse steht dort jetzt noch — frisch gelesen, mit derselben
Seitenvorbereitung wie die Kontaktsuche (83). Die Übernahme (Schritt 8) schreibt
den Kontakt jedem Betreiber der Website, nur die abweichenden (82); nach jeder
Handübernahme also apply und Freigabe erneut.

**11. Bestände-Abgleich** (`bestaende-abgleich.ts`, 12).

**12. Abschluss.** `--stand` meldet VOLLSTÄNDIG erst, wenn keine Organisation
ohne Website ohne Hand-Vermerk ist, keine belegte Website ohne Kontakt ohne
Hand-Vermerk und kein Verstoß. Gemeldet werden nur Zahlen aus `--stand`, nach
der Gegenlese.

**13. Eintrag in der Zielgruppen-Liste** (`lib/zielgruppen.ts`). Der Test
`lib/__tests__/zielgruppen.test.ts` nennt jede Stelle, die noch fehlt.

**14. Brief entwerfen — eigene Strategie je Zielgruppe.** Nie den Brief einer
anderen Zielgruppe kopieren: Gemeinde, Redaktion und Betreiber wollen
Verschiedenes, und jede bisherige Zielgruppe hat ihren eigenen Aufhänger, Ton
und Fuß bekommen. Die Gegenüberstellung mit Beispielen steht in
`docs/outreach-zielgruppen.md`; **eine neue Zielgruppe bekommt dort eine eigene
Spalte, bevor ihr Entwurf geschrieben wird.** Der Entwurf ist
ein eingechecktes Skript, das eine Mail-Datei schreibt und **selbst nicht
sendet** (Vorlage: `scripts/presse-kreise.ts`). Seine Eingaben liegen im
Zwischenspeicher des Haupt-Checkouts, **nie im temporären Ordner der Sitzung**
— dort sind im September Eingaben und Protokoll der Presse verloren gegangen.
Abgenommen wird am echten Beispiel einer echten Organisation, nicht am Muster.

**15. Versand** über den einen Versandlauf:
`npm run aussendung -- --zielgruppe <name> --senden <mails.json> --schub <name>`.
Er prüft vor der ersten Mail jede Mail auf Pflichtangaben (Klarname, Impressum,
Datenschutz, Herkunft der Adresse) und Lücken der Vorlage und hält sonst den
ganzen Schub an, verweigert den Versand ohne veröffentlichten DKIM-Schlüssel,
schreibt jede Mail **vor** dem Senden in die Tabelle `aussendungen` und schickt
dieselbe Mail nie zweimal an dieselbe Adresse. Gemeinden und Förderstellen haben
ältere eigene Läufe mit eigenem Protokoll und bleiben dort. Was je Zielgruppe
dazukommt und nicht im Lauf steckt: Versandtage und Feiertage des Ziellands,
Schubgröße, und dass eine Gruppe (ein Kreis, ein Verbund) nie auf zwei Schübe
verteilt wird. **Ein Skript, das an diesem Lauf vorbei sendet, gibt es nicht** —
`npm run sessions` meldet nie eingecheckte Sender in jedem Arbeitsstand.

**16. Rücklauf und Wirkung.** Antworten werden der Aussendung zugeordnet, die
Wirkung an Tag 3, 7, 14 und 28 gemessen (`npm run wirkung`). Antwort,
Veröffentlichung, Verweis, Abo und Besuch sind **getrennte** Ergebnisse — ein Abo
oder Besuch beweist keine Veröffentlichung. Der tägliche Rücklauf ordnet
Antworten auf `aussendungen` zu — zuerst über die Kennung unserer Mail im Kopf
der Antwort, dann über die Absender-Domain, aber nur, wo keine Gemeinde dieselbe
Domain hat (`lib/aussendung-ruecklauf.ts`); ein Widerspruch sperrt die Domain für
die Zielgruppe. Eine neue Zielgruppe wird in der Wirkungsmessung als eigener Fall
eingetragen (`scripts/outreach-wirkung.ts`), **bevor** ihr erster Schub
hinausgeht — sonst ist „hat nichts gebracht" nicht von „nicht gemessen" zu
unterscheiden. Eine Antwort zählt in einem Messpunkt erst ab ihrem Tag; ein
nachgeholter Messpunkt zeigt deshalb nicht den Stand von heute.

### Auftragstext für Helfer der Handprüfung (Vorlage)

Ein Helfer bekommt: das Arbeitsverzeichnis, einen Block (JSON mit Anschriften
bzw. Websites), die zwei erlaubten Befehle und diese Regeln — nie eine bezahlte
Suche, nie direkt in die Datenbank, nie Code oder git; das Skript entscheidet
über den Beleg, nicht der Helfer; Verzeichnisse (northdata, firmenwissen,
Branchenbücher, Wikipedia, Zeitungen) und Referenzlisten von Planern oder
Finanzierern sind keine Websites; höchstens ~4 Suchen je Anschrift, bei großen
Organisationen gründlicher; am Ende ein Bericht mit Zahlen und jedem Fall, in
dem das Skript etwas Richtiges ablehnte oder etwas Falsches übernahm.

### Für einen Bestand aus einem Register (z. B. Solarparkbetreiber)

Der Windbetreiber-Lauf ist die Vorlage: Tabelle + DDL in einer Datei
(`lib/windbetreiber-sql.ts`), Regeln ohne Ein-/Ausgabe (`lib/windbetreiber.ts`),
ein Skript mit `--vorflug`, `--setup`, `--register`, `--neu-bewerten`,
`--impressum`, `--manuell`, `--keine`, `--kein-kontakt`, `--stand`, `--offen`,
die Kontaktsuche als drei Angaben (`scripts/windbetreiber-kontakte.ts`), ein
Eintrag in `scripts/lib/bestand-belegung.ts` und in `kontakte-freigabe.ts`.
Für Solarparks ändern sich: die Registertabelle (Einheiten Solar statt Wind,
nur Freiflächen), die Gattungswörter (Solarpark, PV, Photovoltaik) und das
Rollenwerk-Vokabular; der Ablauf bleibt.

## Aus der ersten Prüfkette übernommen (bis 17.09.2026)

Die erste Kette (lokale Prüfakten, Aufseher-Prozess, Vergleichsberichte als
Versandsperre) wurde am 17.09.2026 durch die heutige Kontaktsuche ersetzt und am
07.10.2026 ausgebaut. Vier Erkenntnisse tragen weiter:

- **Die Grundgesamtheit wird gegen eine unabhängige Quelle abgeglichen.** Die
  eigene Liste beweist nicht, dass alle vorkommen. Abgleich gegen das amtliche
  Verzeichnis (Gemeinden: Melderegister, Fusionen; Register-Bestände: der
  Registerstand), fehlende oder überzählige Kennungen werden geklärt, nicht still
  entfernt. Ohne diesen Abgleich keine Meldung „vollständig".
- **Drei Ergebnisse, nicht zwei:** passender Fachkontakt, allgemeines Postfach,
  oder konkret ungeklärt — und „ungeklärt" nennt den offenen Prüfschritt. Ein
  ungeklärter Fall ist ein Urteil, keine Kontaktbestätigung.
- **Eine gemeinsame Verwaltung ist Ansprechpartner, aber ihre Zuständigkeit wird
  nicht ohne eigenen Beleg auf jedes Mitglied übertragen.**
- **Ein Kontakt aus einem PDF zählt nur mit Seite und Zeile** — ein Textfund
  irgendwo im Dokument nicht; ein nicht lesbarer Scan bleibt offen.

## Altlast, keine Vorlage

**Die allgemeinen Postfächer der Gemeinden** sucht noch die erste eigene Suche
(`npm run kommunen:kontakt`, Profil- und Lückenlauf) mit eigener Auswertung;
daneben findet die gemeinsame Kontaktsuche dieselben Postfächer. Bewusst nicht
umgestellt: Sie betrifft keine künftige Zielgruppe, aber laufende Briefe. Für
eine neue Zielgruppe ist sie **keine Vorlage** — dort gilt allein der Ablauf oben.

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
| Windparkbetreiber | `scripts/windbetreiber-kontakte.ts` | ein Eintrag je belegter Website, nicht je Betreiber; Identität und Website kommen vorher aus `scripts/windbetreiber-refresh.ts` |

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

### Vor jedem neuen Bestand: gegen die anderen Bestände (06.10.2026)

Jede Erhebung lief für sich, keine fragte die anderen. Ergebnis: 110 von 3.115
„Fachbetrieben" standen zugleich im Presse-Katalog oder in der Versorger-Liste
(Stadtwerke, Tageszeitungen, Kreisportale). Seitdem entscheidet
`lib/bestand-abgleich.ts`: amtliche Herkunft (Register, Gemeindeverzeichnis)
schlägt eigene Suche; Gemeinde/Versorger/Windbetreiber dürfen sich eine Domain
teilen; zwei Suchbestände gegeneinander entscheidet ein Mensch
(`npm run bestaende:abgleich -- --entscheiden <domain> --falsch=… --notiz=…`),
und die Entscheidung gilt danach in jedem Lauf beider Bestände. **Ein neuer
Bestand trägt sich in `scripts/lib/bestand-belegung.ts` ein und prüft in
seinem einzigen Schreibweg** — Vorbild ist die Schranke in
`scripts/fachbetriebe-refresh.ts`. Gezählt werden nur bestätigte Einträge
(Presse: `ist_medium = 'medium'`), sonst erzeugen abgelehnte Kandidaten
falsche Kollisionen (694 beim ersten Messen).

### Ein Suchbestand braucht einen Identitätsbeleg (06.10.2026)

Der Abgleich gegen andere Bestände fängt nur, wer dort schon steht. Bei den
Fachbetrieben blieben danach noch Verbände, Händler, Kreisportale und
Stadtwerke ohne Registereintrag übrig: 10 von 50 zufälligen „Betrieben". Wer
einen Bestand aus einer Suche aufbaut, ordnet deshalb am **Impressum** ein —
wer ist der Anbieter, und gibt es einen Beleg für die gesuchte Art (bei
Betrieben: Kammer, Meister, Gewerk, Montage-Angebot)? Ohne Beleg „unklar",
nicht „gehört dazu". Vorbild: `lib/fachbetrieb-einordnung.ts`. Was in einen
anderen Bestand gehört und dort fehlt, wird als Kandidat dorthin übergeben,
nicht nur zurückgestuft.

### Was beim Erkennen am Impressum schiefgeht (06.10.2026, sechs Messläufe)

Gemessen an den Fachbetrieben; jede Zeile ist ein Fehlgriff, der in einem
Messlauf auftrat und jetzt einen Test hat. Gilt für jeden Bestand, der eine
Organisation an ihrer Website erkennt.

- **Der Anbieter steht im Anbieterblock, nicht irgendwo im Impressum.**
  Versicherer samt Ombudsmann („Anbieter: Ergo Versicherung"), Kammer,
  Webdesigner, eRecht24-Haftungstext — alle mit Namen und Anschrift. Das Bauteil
  dafür ist `lib/impressum-anbieter.ts`; ein leerer Block heißt „nicht gelesen",
  nie „kein Treffer".
- **Erwähnung ist nicht Selbstauskunft.** „Kompetenten Fachbetrieb finden"
  (Kreiskarte), „wir können diesen Fachbetrieb empfehlen" (Bewertung),
  „Handwerksrolle" in der A–Z-Liste einer Stadt, „Meisterbonus" eines
  Ministeriums, „bietet Ihrem Fachbetrieb die Möglichkeit" (Portal) — ein Status
  zählt nur mit Selbstbezug („Ihr Fachbetrieb", „Eintragung in die
  Handwerksrolle").
- **Verneinung, Ratschlag, Dritte:** „wir vermitteln Sie nicht weiter",
  „vor der Installation sollte …", „die Installation einer PV-Anlage steigert
  den Wert", „unsere Partner installieren" sind kein Angebot. Das Umfeld vor UND
  nach dem Treffer prüfen.
- **Wörter mit zweiter Bedeutung:** „Marktplatz 8" ist eine Straße,
  „E-Mail-Adressen" ein Haftungssatz, „PV-Magazin" ein Menüpunkt,
  „Montagesystem" ein Produkt, „Großhandel" als Menüpunkt neben „Privatkunden"
  ein Nebengeschäft, eine URL im Text ist kein Satz.
- **Eine Beschreibung ist keine Identität.** „Energieversorgung" im Titel einer
  Ingenieurgesellschaft beschreibt eine Leistung; „Energieversorger" sagt, wer es
  ist. Versorger erkennt man an Abrechnung und Zähler (Zählerstand, Abschlag),
  nicht an einer Störungsnummer — die haben PV-Wartungsfirmen auch.
- **Kein `\b` nach einem Punkt** („e\.V\.\b" trifft nie vor einem Leerzeichen);
  `(?!\w)` statt dessen. Erzwungen von `lib/__tests__/regex-punkt-wortgrenze.test.ts`.
- **Presse (06.10.2026), dieselbe Lehre in einem zweiten Bestand:** Der
  Medientyp „Verband" lief über den ganzen Seitentext. Repariert, aber weiter
  auf dem ganzen Text, hätte er 924 von 3.047 neu gelesenen Medien markiert;
  am Anbieterblock und Seitentitel sind es 216, Stichprobe 19 von 20 richtig
  (der Fehlgriff: „Mitglied Deutscher Fachjournalisten-Verband"). Drei
  Fallen, die es bei den Fachbetrieben nicht gab: Initialen („E. v. Wagner"),
  eine Mitgliedschaft im Anbieterblock, und NRW-Lokalradios, deren
  Veranstaltergemeinschaft ein e.V. ist, ohne dass das Radio ein Verbandsmedium
  wäre (37 Sender). Tests: `lib/__tests__/presse-verband.test.ts`.
- **Eine grobe Phase überschreibt nie ein belegtes Urteil.** Die Streuung über
  die Kreissuche schrieb „betrieb" und hob damit bei jedem Lauf jede Rückstufung
  am Impressum auf.
- **Erst messen, dann schreiben.** Messlauf mit Protokoll, Stichproben je
  Ergebnisgruppe gegenlesen (auch die Hochstufungen), dann aus dem Protokoll
  schreiben. Vor dem Schreiben die „nicht erreichbar"-Fälle nachmessen: Am Ende
  eines Laufs brach einmal die Verbindung, und 141 Einträge kamen auf einmal
  als unerreichbar zurück, 42 davon zu Unrecht.

### Belegarten eines Registerbestands, stärkste zuerst (Windbetreiber, 06.10.2026)

Name im Impressum · Registeranschrift · Marke (in Name, Domain und Impressum
zugleich) · Register (selbst angegebene Website oder Funktionspostfach) ·
Telefon (Registerpostfach auf der Domain UND Registertelefon im Impressum, nur
auf einer Seite mit Energiebezug, nie auf Berater- oder Prüferseiten; eine
Zentrale „-0" deckt ihre Durchwahlen, 53/56) · Schwester (gleiches Postfach und
gleiche Anschrift wie ein schon belegter Betreiber, Postfach auf dessen
Website). Die zwei schwachen Arten verlieren immer gegen eine starke, auch wenn
deren Kandidat schlechter platziert ist — die erste Telefonregel hatte sechs
Namensbelege verdrängt und acht branchenfremde Eigentümer (Spedition,
IT-Firma) belegt. Eine Anschrift, die nur ein Rathaus ist, bleibt bewusst
stehen (Gemeinde als Verwalterin) und wird im Bericht genannt.

## Neues Land (Prüfliste)

Übertragbar ohne Änderung: Ablauf, Belegpflicht, Zwischenspeicher, Nachprüfung
der Belegseite, Tauglichkeit der Postfächer, Versandlauf und Protokoll.

Je Land **vor dem ersten Abruf** zu klären — und keine dieser Antworten aus dem
deutschen Recht übernehmen:

1. **Darf man dort so anschreiben?** Die Kalibrierung zu unverlangten Mails gilt
   für Deutschland. Für jedes neue Land eigene Prüfung durch zwei Rechtsprüfer,
   der zweite mit dem Auftrag, den ersten zu widerlegen. Ohne Ergebnis kein Versand.
2. **Gibt es dort eine Impressumspflicht?** Der Website-Beleg (Schritt 4) und die
   Kontaktsuche leben davon, dass Organisationen ihre Anschrift und ein Postfach
   veröffentlichen müssen. Wo das nicht gilt, ist die Abdeckung eine andere und
   die Belegart muss neu geeicht werden (Schritt 3).
3. **Woher kommt die Grundgesamtheit?** Amtliches Verzeichnis mit stabilen
   Kennungen und Gebietsänderungen (für Deutschland das Melderegister und die
   Destatis-Liste der Gebietsänderungen).
4. **Sprache(n).** Das Rollenwerk trägt deutsche Wörter („Klimaschutzmanager",
   „Pressestelle"); ein mehrsprachiges Land braucht es je Sprache. Ebenso der
   Brief und die Pflichtangaben.
5. **Kalender.** Feiertage und Ferien des Ziellands bzw. der Region für die
   Versandtage.
6. **Domains.** Namensvarianten der Organisationen und, wo es sie gibt,
   gemeinsame Verwaltungsdomains.

Das Rollenwerk ist die Stelle, an der ein neues Land Arbeit kostet; Recht und
Grundgesamtheit sind die Stellen, an denen es scheitern kann.
