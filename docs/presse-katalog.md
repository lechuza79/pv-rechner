# Presse- und Creator-Katalog

Vierte Erhebung dieses Repos nach Gemeinden, Versorgern und Fachbetrieben.
Mechanik geteilt, Vokabular eigen — Befunde der anderen drei übertragen sich
ausdrücklich **nicht**.

- Muster (reine Logik): `lib/presse-extrakt.ts`, Tests `lib/__tests__/presse-extrakt.test.ts`
- Saat (benannte Medien): `lib/presse-saat.ts`
- Lauf: `scripts/presse-refresh.ts` (`npm run presse`)
- Tabellen: `presse_medien`, `presse_kontakte`, `presse_belege` (RLS an, keine
  Policy — die Sätze enthalten Namen und Funktionen von Journalistinnen und
  Journalisten)
- Ausgabe: `docs/presse/*.csv`

## Warum die Trefferquote hier höher ist als bei den drei vorigen

Bei Gemeinden, Versorgern und Fachbetrieben ist der Ansprechpartner eine
Fundsache. Bei einem journalistisch-redaktionellen Angebot ist er **gesetzlich
verlangt**: § 18 Abs. 2 MStV nennt eine natürliche Person mit Namen und
Anschrift, zusätzlich zu § 5 DDG. Der Anker dieser Erhebung ist deshalb nicht
die persönliche Mailadresse, sondern die Funktionsbezeichnung.

Gemessen am 03.09.2026 über 382 Adressen: **1.381 Kontakte mit Namen, 758 davon
mit persönlicher Adresse.** Zum Vergleich: Bei den Versorgern war ein
namentlicher Ansprechpartner nicht zu holen (0 von 20 Impressen).

## Der größte Einzelhebel: verschleierte Adressen

`ohneAdressVerschleierung` setzt Cloudflares Adress-Verschleierung in den
Klartext zurück, den jeder Browser ohnehin anzeigt. Ohne diesen Schritt findet
die Erhebung auf der Teamseite von pv magazine **null** Adressen — dort stehen
69 verschleierte — und hält die Seite für eine ohne Kontaktweg.

Das ist kein Umgehen einer Schutzmaßnahme: Die Adresse ist veröffentlicht,
verschleiert wird sie gegen Sammler ohne JavaScript. Was nicht passiert: eine
Adresse erfinden, die dort nicht steht.

## Fachmedium oder Publikumsmedium

**Der Betreiber am 04.09.2026: „ZEIT und COMPUTER BILD brauche ich nicht
anschreiben."** Er hatte recht, und die Ursache war messbar: Die erste
Einstufung zählte Themenwörter ABSOLUT, und die weiche Gruppe „Verbraucher"
(Test, Kosten, Vergleich, Ratgeber) trug ein A allein. heise stand damit auf
Priorität A mit 30 Treffern dieser Gruppe und **zwei** für Photovoltaik,
COMPUTER BILD mit 82 zu null.

Drei Änderungen, jede an einer Handprüfung von 24 bekannten Titeln kalibriert:

1. **Die weiche Gruppe ist an die Energie gebunden.** „Test" sagt über die
   Passung nichts, „Stromkosten" schon.
2. **Ein A braucht das Kernthema** (Photovoltaik, Balkonkraftwerk, Speicher,
   Strommix) — die Randthemen können es nie allein tragen.
3. **Fach- und Publikumsmedium werden an der DICHTE getrennt**, nicht an der
   Zahl. Gemessene Kerntreffer je 1.000 Wörter der Startseite:

   | Fachtitel | | Publikumstitel | |
   |---|---|---|---|
   | Solarserver | 18,9 | energiezukunft | 1,8 |
   | photovoltaik | 15,1 | heise | 1,1 |
   | pv magazine | 13,3 | n-tv | 0,6 |
   | stadt+werk | 5,3 | test.de | 0,4 |
   | Erneuerbare Energien | 4,7 | SPIEGEL | 0,3 |
   | IKZ | 4,3 | ZEIT, taz, SZ | 0,0 |
   | ZfK | 4,1 | | |

   Die Schwelle liegt in der Lücke zwischen 4,1 und 1,8. **Eine erste Fassung
   verlangte zusätzlich acht absolute Treffer — und stufte damit stadt+werk,
   Erneuerbare Energien und die IKZ als Publikumsmedien ein**, weil ihre
   Startseite an diesem Tag nur fünf bis sieben Fundstellen trug. Drei Fachtitel
   als Publikum ist der teurere Fehler: Sie fallen aus der Ansicht heraus.

**Die Messung ist ein VORSCHLAG, kein Urteil**, und das ist keine Bescheidenheit,
sondern gemessen: Sie sieht eine Startseite an einem Tag. Fünf echte Fachtitel
liegen knapp darunter, weil ihre Startseite gerade über etwas anderes schrieb —
energate (1,7), pv Europe (2,1), SBZ (0,5), klimareporter (1,1), Treffpunkt
Kommune (0,5). Umgekehrt steht Finanztip als Fachmedium da, obwohl es ein
Verbraucherportal ist.

Deshalb lässt sich die Einordnung **von Hand überschreiben**, in einer eigenen
Spalte, die der Erhebungslauf nie anfasst — ein Test liest den Lauf und wird
rot, wenn er es doch täte. Stünde die Handentscheidung in derselben Spalte wie
die Messung, korrigierte man dieselbe Fehleinschätzung jeden Monat neu, ohne
dass es auffiele.

**Gelöscht wird nichts** (Betreiber, 04.09.2026). Publikumsmedien bleiben im
Bestand und sind einen Filter weit entfernt; für eine wirklich gute
Datengeschichte ist ein Datenressort irgendwann der richtige Adressat — nur
nicht im ersten Schub.

## Woher die Fehlzuordnungen kamen — und was sie abstellt

**Betreiber, 05.09.2026: „woher kommen ständig diese fehlzuordnungen, wie können
wir die vermeiden?"** Jeder Fehlgriff dieser Erhebung hatte dieselbe Form:
Geprüft wurde ein Wort, das mit der Sache **korreliert**, statt der Sache selbst.

| Muster | korreliert mit | traf in Wahrheit |
|---|---|---|
| „Angebot anfordern" | Händler | die Abo-Werbung eines Verlags |
| „Warenkorb" | Shop | den Buchshop eines Recherchebüros |
| altes Datum | eingestellt | jede Artikelseite |
| „Wärmepumpe" im Menü | behandelt das Thema | die Navigationsleiste |
| „läuft" + „nennt Autoren" | passendes Medium | jedes Nachrichtenangebot der Welt |

**Und keiner fiel von allein auf**, weil die einzelne Zeile immer plausibel
aussieht — erst ein Mensch, der das Ergebnis las, hat sie gefunden. Deshalb ist
die Gegenmaßnahme kein besseres Muster, sondern `lib/__tests__/presse-eignung.test.ts`:
eine feste Liste bekannter Fälle mit erwartetem Urteil, die **vor** jedem Lauf
läuft. Jeder Fall darin ist einmal wirklich falsch gelaufen. Beim ersten Lauf
fand sie sofort einen weiteren: „ob sich eine Wärmepumpe rechnet" fiel durch,
weil das Muster nur die Hauptsatzstellung kannte.

**Der Beleg ist der jüngste Beitrag zum Thema, mit Überschrift und Alter**
(Betreiber: „immer einen möglichst aktuellen beitrag als beleg auf den wir uns
dann auch beziehen können"). Ein Beleg, der nur „behandelt das Thema" sagt,
trägt keinen ersten Satz im Anschreiben.

## Das Eignungsurteil: die eine Frage, die keine Messung beantwortet

**Nach drei Runden Musterschärfen abgebrochen (05.09.2026, Betreiber: „glaube das
ist ein konzeptionelles Problem").** Themenzahl → Dichte → Rechtsform im
Impressum: Jede Runde fing das zuletzt genannte Beispiel und verfehlte das
nächste, und die dritte machte es an einer Stelle schlechter (die ZfK, eine echte
Fachzeitung, rutschte zu den Publikumsmedien). Der Grund ist nicht die Schwelle,
sondern die Frage: **Ob eine Redaktion eine fremde Datengeschichte aufnimmt,
steht weder auf ihrer Startseite noch in ihrem Impressum.**

Der Katalog liefert seitdem nur noch **Tatsachen** — wer, welche Funktion, welche
Adresse, welche Fundstelle, welche Themen. Das Urteil fällt **einmal von Hand**
je Medium (`eignung`, `eignung_grund`), und der Erhebungslauf fasst es nie an;
derselbe Wächter, der die Handeinordnung schützt, wird rot, wenn er es täte.

**Jedes Urteil trägt seine Fundstelle** — die Seite, auf der es steht, plus den
Wortlaut. Das ist keine Formalie: Beim ersten Durchgang hatte ich aus Namen,
gemessenen Themen und Kontakten geurteilt; **das Nachlesen der Belegseiten hat
sechs von 32 Urteilen gedreht**, davon zwei in beide Richtungen falsch —
solarbranche.de galt als Marktplatz und weist im Impressum eine eigene Redaktion
des IWR aus, effizienzhaus-online.de galt als offen und leitet auf den
Affiliate-Bereich eines Vermittlers. Dazu eine falsche Begründung bei richtigem
Urteil (machdeinenstrom.de ist kein Händler, sondern der Bundesverband
Steckersolar). **Ein Urteil ohne gelesene Fundstelle ist eine Behauptung**, und
zwar eine, die genauso plausibel klingt wie ein belegtes.

**Erster Durchgang, 32 Fachmedien der Pakete 1–3:** 16 vorgemerkt, 14 ungeeignet,
2 von Hand nachzusehen. Die Trennlinie verläuft nicht zwischen groß und klein,
sondern zwischen **Redaktion** und allem anderen — Verbände und Institute
veröffentlichen ihre eigenen Zahlen (BEE, BSW, Fraunhofer ISE), Ratgeber- und
Leadportale haben gar keine Redaktion (solaranlage.eu, solarbranche.de), Händler
haben ein Magazin und keinen Meldungsbetrieb. Jedes Urteil trägt seinen Grund im
Katalog; wer es anders sieht, stellt es in der Ansicht um.

## Die vier Pakete

| Paket | Was | Zeilen |
|---|---|---|
| 1 | bundesweite Fach-, Energie-, Kommunal- und Verbrauchermedien | 786 |
| 2 | Regionalmedien mit eindeutig zuordenbarem Gebiet | 356 |
| 3 | Newsletter, Podcasts, Creator | 22 |
| 4 | **Prüfliste** — was die Suche gefunden hat, noch niemand angesehen | 2.024 |

Die Ansicht zeigt bei Paket 1 standardmäßig nur **Fachmedien** — 23 Titel statt
129. Das ist ein Filter, keine Verkleinerung des Bestands, und die Zeile über der
Tabelle sagt das inzwischen auch: „23 von 382 Medien im Bestand". **Sie sagte es
zuerst nicht**, und der Betreiber hat prompt gefragt, ob alles außer den 23
rausgeflogen sei — eine Zahl ohne ihren Nenner behauptet etwas anderes, als sie
misst, hier wie überall sonst im Projekt.

**Die Voreinstellung hängt am PAKET.** Fachmedien vorzufiltern ist nur bei den
bundesweiten Titeln und den Creatorn richtig; eine Lokalzeitung ist per
Definition kein Fachmedium. Paket 2 enthält 55 Regionaltitel und **null**
Fachmedien — mit einer festen Voreinstellung wäre das ganze Regionalpaket
unsichtbar gewesen, und zwar so, dass es wie ein leerer Bestand aussieht statt
wie ein Filter. Aufgefallen erst beim Nachzählen nach dem Umbau.

**Paket 4 ist kein Katalogpaket.** Ein Suchtreffer ist eine Adresse, kein Befund;
grob die Hälfte ist nichts (im Förderbereich gemessen, hier nicht anders). Neben
die benannten Medien gestellt sähe eine Vermutung aus wie eine Messung.

**Paket 3 ist dünn, und das ist ein Befund.** Deutsche Creator zum Thema haben
selten eine eigene Website mit Impressum; wer eine hat, ist überwiegend Händler
mit Magazin (im Katalog als solcher vermerkt). Wer das Paket füllen will, kommt
an der Plattform nicht vorbei — und YouTube gibt seine Kanaldaten weder ohne
JavaScript noch ohne Verstoß gegen seine Bedingungen her.

## Neun gemessene Fehlerklassen

Jede stammt aus einer Handprüfung von 26–32 Zeilen, jede ist in
`lib/__tests__/presse-extrakt.test.ts` festgenagelt. **Keine einzige war an einer
Quote zu erkennen.**

1. **Adressen verschleiert** — 27 Redakteure gemeldet, 0 Adressen (pv magazine).
2. **Namen quer über Einträge** — „Emiliano Bellini News Director" als Name. Der
   Aufbau ist zeilenorientiert, `\s` überspringt aber Zeilenumbrüche.
3. **Funktionszusatz verloren** — „Editor, France" wurde zu „Editor". Für einen
   deutschen Verteiler ist das der Unterschied zwischen richtig und falsch.
4. **Menü als Person** — „Magazine Netiquette Impressum" (energiezukunft.eu).
5. **Funktion als Person** — „Chief Content Officer" (ikz.de).
6. **Marke als Person** — „Springer Professional", „National Geographic Magazin".
7. **Artikeltext als Redaktion** — auf sueddeutsche.de landete ein
   Ministerpräsident aus einer Schlagzeile als „Redakteur" im Katalog. Seitdem
   werden Rollen **nicht mehr von der Startseite** gelesen.
8. **Nichtssagender Seitentitel** — drei Medien hießen im Katalog „Startseite".
9. **Stehengebliebene Werte** — nach einem gescheiterten Abruf blieb die
   Einstufung des letzten geglückten Laufs stehen: energieverbraucher.de stand
   mit Priorität A da, ohne einen einzigen Kontakt.

Dazu zwei Fehler in der Mechanik, die dieselbe Form haben wie anderswo im Repo:
**verwaiste Kontakte** (ein Upsert schreibt nur, was jetzt gefunden wurde — die
Fehltreffer des Laufs davor blieben stehen, der Fix sah im Diff richtig aus und
änderte nichts) und **eine gesperrte Startseite als „Medium nicht erreichbar"**
(sechs Madsack-Titel antworten der Startseite mit 403 und dem Impressum mit 200;
die Meldung war eine Auskunft über uns, nicht über das Medium).

## Was der Katalog behauptet und was nicht

- **Gemessen:** Name, Funktion, Adresse, Quell-Adresse, Prüfdatum, Themen (aus
  der Zahl der Fundstellen auf der Startseite), Medientyp, Reichweite (nur mit
  Beschriftung), redaktionelles Angebot ja/nein.
- **Abgeleitet:** passende Geschichten, Aufhänger, Priorität — alle drei
  mechanisch aus den gemessenen Themen. Wer die Muster ändert, ändert alle drei.
- **Ungeprüft und als solches gekennzeichnet:** Gebiet und, wo die Messung
  nichts hergab, Medientyp und Schwerpunkt.

**Priorität ist eine Zeilen-, keine Medien-Eigenschaft.** Ein A-Medium kann einen
C-Kontakt tragen: Bei pv magazine steht die Australien-Redaktion auf derselben
Seite wie die deutsche.

## Was NICHT gebaut ist

Kein Anschreiben, kein Versandweg, kein Cockpit. Diese Erhebung erhebt.

**Vor dem ersten Kontakt zu klären** (gehört dem Betreiber, nicht mir):
- Die Datenschutzerklärung nennt diese Verarbeitung mit keinem Wort. Die Ausnahme
  „unverhältnismäßiger Aufwand" nach Art. 14 Abs. 5 DSGVO trägt hier nicht — wer
  Kontaktdaten erhebt, *um* Kontakt aufzunehmen, kann Kontakt nicht als zu
  aufwendig ausgeben. Dieselbe offene Frage wie bei den Fachbetrieben.
- § 7 UWG ist für Presseanfragen milder als für Werbung, aber nicht abgeschaltet:
  Eine Pressemitteilung an eine Redaktion, die dafür ein Postfach ausweist, ist
  etwas anderes als ein Angebot an eine namentlich genannte Person. Die Grenze
  gehört vor dem ersten Schub durch zwei Legal-Judges.

---

## Konzeptwechsel am 05.09.2026: Merkmale statt Urteil, Thema statt Medienprüfung

Der Betreiber hat den Eignungs-Ansatz verworfen, nachdem er dreimal in dieselbe
Richtung gelaufen war. **Die Ursache war nicht das Kriterium, sondern die
Denkrichtung:** Jede seiner Korrekturen wurde als Korrektur eines Datenfelds
verstanden und daraus wieder eine Erhebung gebaut — statt vom Anschreiben aus zu
denken, für das der Katalog existiert.

### Was gilt

**Es gibt kein Ausschlusskriterium.** Auch nicht den eigenen Rechner: „evtl.
bieten wir das bessere tool" (Betreiber). Ein eigener Rechner ist ein MERKMAL mit
Fundstelle und wird in einem zweiten Schritt gesondert ausgewertet — dieselbe
Auswertung ist auch für die Rechner fällig, die in den anderen Erhebungen
gefunden wurden.

**Ein Händler, Hersteller oder Institut ist kein Ausschluss, sondern eine andere
ANSPRACHE** — Vertrieb statt Redaktion. Das stand schon am 05.09. in der ersten
Fragenrunde und wurde beim Bauen wieder eingebaut; die neun Fragen enthielten am
Ende vier Kriterien, die der Betreiber nie verlangt hatte (Meldungsbetrieb,
Autorennennung, Zitierverhalten, Produktverkauf), und sein einziges wirkliches
Kriterium — der inhaltliche Themenbezug — war eines von neun.

### Fünf Rubriken, und sie bestimmen den AUFHÄNGER, nicht die Eignung

| Rubrik | Aufhänger |
|---|---|
| Fachmedien | aktueller Fachbeitrag zu unserem Thema |
| Regionale Medien | Zahlen der Region aus dem Kommunen-/Kreis-/Landesranking — **keine Themensuche** |
| Allgemeine Medien | aktueller Beitrag zu unserem Thema, für Endkunden |
| Creator (Newsletter, YouTube, Podcast) | aktuelle Folge zu unserem Thema |
| Hersteller, Händler, Portale, Institute | offen; hier wird nur Kategorie und eigener Rechner vermerkt |

Die Sorte ist NICHT aus dem Bestand ableitbar. Der Versuch, sie über die
Streuung zu bestimmen (in wie vielen Landkreisen eine Adresse gefunden wurde),
ist gescheitert: Die 121 Adressen mit der höchsten Streuung sind fast durchweg
Regionalzeitungen mit großem Verbreitungsgebiet, Anzeigenblatt-Netzwerke und
Rundfunkanstalten. **Streuung misst Reichweite, nicht die Trennung regional /
überregional.**

### Die Suchrichtung dreht sich um

Nicht mehr: Medienliste nehmen und je Medium fragen, ob es passt.
Sondern: **nach unseren Themen suchen — wer darüber schreibt, kommt in den
Verteiler, und der gefundene Artikel IST der Aufhänger.** Kein separater
Bewertungsschritt.

**Harte Regel aus einem gemessenen Fehlgriff:** Belegt ist nur, was im
Artikeltext selbst gelesen wurde. Die Behauptung „Finanztip empfiehlt den
HTW-Rechner" stammte aus einer Suchmaschinen-Zusammenfassung und hält am Artikel
nicht stand — dort steht eine eigene Faustregel (1.600 €/kWp) und die Empfehlung
dreier Vermittlungsportale mit Provision. Auf dieser Falschannahme stand das
Kriterium „verweist auf fremde Rechner".

### Erhebung vom 05.09.2026

Gearbeitet wird über die **Navigation der Startseite** — sie ist die Auswahl, die
das Haus selbst getroffen hat, steht statisch im HTML und schlägt die Sitemap
(gemessen im Fachbetriebe-Bereich: 3 Treffer je 4,3 Abrufe gegen 1 je 6,2). Die
Startseite allein reicht NICHT als Themenbeleg: Dort steht das Tagesgeschäft,
unsere Themen liegen in der Rubrik. Energie & Management, ZfK und energiezukunft
wären sonst als „kein Thema" durchgefallen, obwohl ZfK eine ganze Serie zur
2027er Einspeisebegrenzung führt.

| | Ergebnis |
|---|---|
| überregionale Seiten gelesen | 290 |
| davon mit datiertem Themenbeleg | 162 |
| regionale Adressen eingeordnet | 3.262 |
| davon Medium | 1.274 (alle 400 Landkreise) |
| davon kein Medium | 1.736 (825 Behörden, 192 Plattformen, 133 Vereine, 87 Bibliotheken …) |
| bewusst unklar gelassen | 334 |

**Neue Felder:** `rubrik`, `beleg_titel`, `beleg_url`, `beleg_notiz`, `beleg_am`.
Die alten Eignungs-Felder bleiben stehen, werden aber nicht mehr fortgeschrieben.

### Was beim nächsten Mal Zeit spart

- **Parallele Läufe auf derselben Liste schreiben sich gegenseitig.** Fünf
  Nachzügler-Läufe bearbeiteten dieselben Adressen wie zehn bereits laufende,
  weil deren Zwischenstand nicht sichtbar war. Kein Datenverlust, aber doppelte
  Arbeit und ein Widerspruch, der von Hand geklärt werden musste
  (balkonkraftwerk.blog hat sehr wohl einen eigenen Rechner).
- **Schreibweisen vereinheitlichen.** Ein Lauf schrieb ohne Umlaute
  („Waermepumpe", „Foerderung"); 216 Einträge mussten nachgezogen werden. Nie
  blind `ae`→`ä` ersetzen, nur eindeutige Wörter.
- **Rund 30 Seiten sind maschinell nicht erreichbar** (Chip, Computerbild, DIW,
  Wirtschaftsministerium, ifeu, haus.de — Bot-Sperren, TLS-Fehler, tote
  Domains). Die brauchen den Browser.
- **Zwei Domains sind umgewidmet:** energiespektrum.de trägt heute ein
  Krypto-Casino-Portal, solarthemen.de leitet auf solarserver.de.

### Nachlese vom 05.09.2026: Browser statt einfachem Abruf

**57 Adressen wiesen den einfachen Abruf ab** (Bot-Sperre, TLS-Fehler,
Weiterleitungsschleife). Über den Browser kommen die meisten durch — von den
ersten 32 lieferten 8 einen Themenbeleg, darunter haus.de, Chip ePower,
Erneuerbare Energien, photovoltaik.eu und der Gebäude-Energieberater. Dauerhaft
gesperrt bleibt praktisch nur IWR.

**Was der Browser NICHT löst:** Zustimmungsabfragen (geo.de, Golem liefern ohne
Einwilligung gar keinen Inhalt) und Bezahlschranken (Handelsblatt, Table
Briefings). Dort ist „nicht lesbar" der Befund, nicht „kein Thema".

**Geratene Rubrikadressen treffen nicht.** `handelsblatt.com/themen/photovoltaik`,
`t3n.de/tag/vibe-coding`, `spektrum.de/thema/energie` — alle drei antworten mit
404, obwohl es die Themen dort gibt. Auch für Menschen gilt die Regel: erst die
Startseite, dann die Navigation lesen. Ich habe sie selbst zweimal gebrochen,
nachdem ich sie den Läufen vorgeschrieben hatte.

### Sechste Rubrik: Startup, Vibe Coding, UX (Betreiber, 05.09.2026)

**Der Aufhänger ist hier NICHT Photovoltaik**, sondern die Entstehungsgeschichte:
ein öffentliches Produkt mit Live-Daten aus amtlichen Registern, eigenen
Rechenmodellen, über 3.000 automatischen Tests und laufender Überwachung —
gebaut von einem UX-Architekten mit KI statt von einem Entwicklerteam.

Stärkste Funde: **t3n führt eine eigene Rubrik „Vibecoding in der Praxis"** in
der Hauptnavigation · **kopfundstift.de** schreibt über Claude Code und bietet
CLAUDE.md-Vorlagen an, also über genau die Arbeitsweise dieses Projekts ·
**StartingUp** fragt in mehreren Beiträgen, ob sich mit Vibe Coding eine
launchfähige App bauen lässt · **Business Insider / Gründerszene** schreibt über
programmierende Agenten als gefragtesten KI-Anwendungsfall · **PAGE** ist das
UX-Standbein.

Bei deutsche-startups, OMR, Basic Thinking, Business Punk, Hamburg Startups und
Munich Startup passt das Umfeld, aber der Aufhänger wäre die Gründung, nicht die
Bauweise — das ist eine andere Geschichte und gehört getrennt entschieden.

### Die Anschreibbarkeit war besser als zuerst gemessen

Die erste Zahl („nur 215 anschreibbar") maß Person UND persönliche Adresse in
einer Zeile. Für ein Anschreiben genügt aber **ein Name für die Anrede plus
irgendein Versandweg** — bei Lokalzeitungen ist das Redaktionspostfach der
Normalfall, nicht die Ausnahme.

| | Anzahl |
|---|---|
| Verteiler-Kandidaten | 1.451 |
| **anschreibbar mit Anrede** (Name + Versandweg) | **709** |
| davon mit persönlicher Adresse | 216 |
| nur Postfach, keine Person | 393 |
| gar kein Weg | 349 |

Die 349 ohne Weg sind größtenteils kein Datenproblem, sondern ein Abrufproblem:
146 wurden gelesen, ohne dass ein Vermerk entstand, 72 ohne auffindbares
Impressum — darunter Berliner Zeitung, neue energie und Chip, die selbstredend
erreichbar sind. Auch hier ist der Browser der nächste Schritt.

## Endstand vom 05.09.2026

| | |
|---|---|
| Adressen im Bestand | 3.817 |
| **Verteiler-Kandidaten** | **1.718** (1.397 regional, 321 überregional mit Aufhänger) |
| anschreibbar mit Anrede | 1.019 |
| nur über ein Postfach | 586 |
| ohne Weg | 113 |
| regional weiter unklar | 58 |
| Kontakte gesamt | 13.591, davon 7.820 mit Namen |

**Mit Aufhänger nach Rubrik:** Fachmedien 95 · allgemeine Medien 77 · Startup,
Vibe Coding, UX 44 · Verbände 29 · Händler 27 · Portale 17 · Creator 13 ·
Institute 13 · Behörden 6 · Hersteller 4.

### Die Startliste war keine Erhebung — und das war messbar

Der Betreiber am 05.09.2026: „tendenziell verstehe ich nicht wieso jetzt nur 47
fachmedien und 24 allgemeine, das kann nicht stimmen." Er hatte recht: Beide
Zahlen maßen, was aus dem Kopf auf einer Startliste gelandet war, nicht was es
gibt. Die systematische Suche hat die Fachmedien auf **95** und die allgemeinen
Medien auf **77** gebracht — jeweils rund eine Verdopplung, ohne dass eine Regel
gelockert wurde.

Bei den allgemeinen Medien ist das Feld damit **weitgehend erschöpft**: Neun
weitere Häuser wurden geprüft und lieferten nichts (Abrufsperren, gelöschte
Beiträge, eine Adresse, die es nicht mehr gibt). Das ist ein Befund, keine
Lücke — wer dort weitersucht, sucht an derselben Stelle noch einmal.

### Was die Kontaktnachlese über deutsche Presse gelernt hat

Drei Läufe über zusammen 582 Medien ohne Kontaktweg. Die Ausbeute lag nicht an
besseren Mustern, sondern an einer widerlegten Annahme und an sechs
Fehlerklassen, die erst das Eichen von Hand zeigte:

- **Die Verlagsadresse auf fremder Domain ist die richtige** (255 von 288). Von
  13 nachgelesenen Fällen waren 11 der Herausgeber selbst, meist im
  § 5-TMG-Block. Steht jetzt in der Bibliothek, samt Gegenproben.
- **Namen um eine Position verschoben:** Auf einer Autorenseite trug jeder
  Redakteur die Funktion des nächsten. Von außen unsichtbar — fünf plausible
  Zeilen, alle falsch.
- **Der Name hinter dem Doppelpunkt** gehört zur Funktion davor. „Chefredakteurin:
  Bettina Steinke" hatte den Mann eine Zeile darüber zugeordnet; die Korrektur
  hat nebenbei einen veralteten Chefredakteur beim Tagesspiegel ersetzt.
- **24 Medientitel und Überschriften standen als Personen** im Ergebnis („Hallo
  Peine", „Registergericht Walsrode", „UNSERE SERVICESTELLEN").
- **Zusammengeklebte Adressen** durch fehlende Zeilenumbrüche
  (`redaktion@kelheim-today.deRedaktion`) — repariert statt verworfen, sonst
  hätten vier Medien ihren einzigen Weg verloren.
- **Die Gegenprobe hat zweimal eigene Korrekturen gefangen:** Ein Ausschluss von
  Freemail-Adressen hätte drei echte Betreiberadressen gekostet (bei kleinen
  Blättern ist Freemail der Normalfall), und eine als Dienstleister eingestufte
  Werbeagentur war beim Landkreismagazin die Herausgeberin.

### Was bleibt

- **113 ohne Kontaktweg**: 67 nennen wirklich keinen (nur Anschrift und
  Telefon), 31 bauen ihr Impressum erst im Browser auf, der Rest sperrt.
- **58 regionale Adressen weiter unklar** — ausschließlich, weil die Seite nicht
  zu lesen war: 21 liefern gar keinen Text aus, 13 antworten mit Fehlerseiten,
  10 sind tot, 9 sperren, 5 verweigern Zugriffe aus Deutschland.
- **Zwei Einordnungen zur Nachprüfung:** `enkreis.de` steht als Medium und ist
  die Kreisverwaltung Ennepe-Ruhr; `ostalb-aktuell.de` führt regional klingende
  Artikel mit demselben Änderungsdatum und Orten aus dem falschen Landkreis.
- **Vor jedem Versand:** Die Datenschutzerklärung nennt diese Erhebung nicht,
  und einen Versandweg gibt es nicht.
