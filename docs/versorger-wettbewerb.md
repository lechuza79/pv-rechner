# Wettbewerbslage: Wer bietet Versorgungskunden einen Rechner an?

**Stand 05.09.2026.** Interne Arbeitsgrundlage. Für die Feature-Tabelle auf der
Website siehe den letzten Abschnitt — die ist ausdrücklich noch nicht gebaut,
und sie ist vergleichende Werbung nach § 6 UWG.

**Diese Fassung ersetzt die vom 25.08.2026 vollständig.** Deren vier tragende
Zahlen haben eine Handprüfung nicht überstanden; was daran falsch war und warum,
steht unter „Was die erste Fassung falsch gemacht hat". Wer die alten Zahlen
irgendwo zitiert findet, ersetzt sie durch die hier.

---

## Wie diese Zahlen entstanden sind

Zwei Stufen, und die Trennung ist der Grund, warum man ihnen trauen kann.

**Stufe 1 — sammeln.** Ein Lauf über alle 910 Versorger mit Website ruft je Haus
die Startseite ab, liest das Seitenverzeichnis aus der eigenen Sitemap, holt die
Photovoltaik- und Wärmepumpen-Seiten und geht von dort eine Ebene tiefer.
Erreicht wurden **864**; 46 blieben unerreichbar (Bot-Sperre oder Server-Fehler)
— für die liegt **kein Befund** vor, nicht der Befund „nichts vorhanden".

**Stufe 2 — ansehen.** Jeder Kandidat aus Stufe 1 wurde in einem echten Browser
geöffnet, mit ausgeführtem JavaScript, und einzeln eingeordnet: **244 Seiten**,
davon 169 Kandidaten und 80 aus einer Stichprobe der vermeintlich leeren.

Die zweite Stufe gibt es, weil die erste die Frage nicht beantworten kann. Ob
eine Seite eine Investition durchrechnet oder einen Stromtarif, steht nicht im
Quelltext. **74 der 244 Einordnungen mussten korrigiert werden — fast jede
dritte.**

Jeder Befund in der Datenbank trägt deshalb, ob er *angesehen* oder nur
*vermutet* ist. Nur Angesehenes steht in diesem Papier.

---

## Der Befund

**Von 864 abgerufenen Versorgern haben 23 ein bestätigtes Rechenwerkzeug.**

| | Anzahl | |
|---|---|---|
| **eingekauft** | 11 | ein Werkzeug eines gewerblichen Anbieters |
| **kostenlos eingebunden** | 10 | Landeskataster, Hochschule, EU-Rechner, Verband — hier hat niemand gezahlt |
| **selbst gebaut** | 2 | |

Die Zahl war bis zum Bedien-Durchgang um vier höher. Drei Häuser (Frankenthal,
Dirmstein, Gerolsheim) teilen sich ein Werkzeug, das **gar keines ist**: eine
Postleitzahl-Abfrage, danach sofort Name, Mail und Telefon — die Versorger-Seite
verspricht „vier Fragen und eine erste Kostengrößenordnung", geliefert wird eine
Frage und keine Zahl. Und Ditzingen hat nichts gekauft, sondern bindet das
landesweite Kataster Baden-Württembergs ein.

Aufgeschlüsselt nach Thema wird die Sache deutlich:

| | Photovoltaik | Wärmepumpe |
|---|---|---|
| eingekauft | 11 | **0** |
| kostenlos eingebunden | 9 | 1 |
| selbst gebaut | 1 | 1 |

**Bei Wärmepumpe gibt es in ganz Deutschland zwei Werkzeuge.** Stadtwerke Bernau
betreibt einen eigenen Preisrechner (13 Gebäudefragen bis hin zum Einkommen für
die Förderstufe), Stadtwerke Bad Kissingen bindet den Förderrechner des
Bundesverbands Wärmepumpe ein. Gekauft hat **kein einziger**.

Bei Photovoltaik kaufen 11 Häuser ein. Selbst gebaut hat dort genau einer —
Havelstrom Zehdenick —, und der gibt sein Ergebnis erst nach Anrede, Name,
Adresse, E-Mail und Telefonnummer heraus.

### Was das für die Ansprache heißt

Bei Photovoltaik gibt es einen Markt: 11 Häuser haben für ein Werkzeug bezahlt,
verteilt auf sieben verschiedene Anbieter. Bei Wärmepumpe hat noch
niemand etwas gekauft — und das ist zweideutig. Es kann heißen, dass der Bedarf
unbesetzt ist, oder dass es ihn nicht gibt. **Diese Erhebung kann die Frage
nicht beantworten**, und wer sie als „unbesetzter Markt" verkauft, behauptet
mehr als hier gemessen wurde.

Was sie beantworten kann: Wer bei Wärmepumpe etwas anbietet, steht nicht neben
einem eingeführten Wettbewerber.

---

## Die Anbieter

Von den 11 gekauften Werkzeugen verteilen sich die Anbieter so:

| Anbieter | Häuser |
|---|---|
| Eturnity | 3 (Sachsenwald, Staßfurt, Torgau) |
| Reonic | 2 (Schwäbisch Gmünd, Garbsen) |
| tetraeder.solar | 2 (Emden, Blomberg) |
| geoplex | 1 (Elmshorn) |
| Solarmaker, IBC Solar, greenventory | je 1 |

**Blomberg zählt hier formal als Kauf und ist doch keiner:** Das Haus lizenziert
dasselbe Kataster-Produkt, das die Nachbarkreise kostenlos anbieten — sogar ohne
deren Gründach-Modul. Wer daraus „zwei tetraeder-Käufe" liest, liest zu viel.

**Solantiq kommt bei keinem einzigen deutschen Versorger vor.** Der Anbieter
zielt auf Installateure, nicht auf Stadtwerke; er ist unser preislicher
Anhaltspunkt, aber kein Wettbewerber um dieselben Kunden.

Zu den kostenlosen Angeboten: Neun Häuser binden ein Landes-, Kreis- oder
Stadtkataster ein, den Unabhängigkeitsrechner der HTW Berlin, den EU-Rechner
PVGIS oder den Förderrechner eines Verbands. **Sie sind kein Beleg für
Zahlungsbereitschaft — eher das Gegenteil.** Sie zeigen aber, dass in diesen
Häusern jemand das Thema für wichtig genug hält, um etwas einzubinden.

---

## Womit man uns verwechseln wird

Drei Sorten Werkzeug sehen einem Rechner ähnlich und sind keiner. Sie sind der
Grund, warum die erste Fassung dieses Papiers falsch lag, und sie werden auch im
Gespräch mit einem Versorger auftauchen.

**Der Tarifrechner** (28 Häuser, angesehen). Er steht im Seitenkopf jeder
Unterseite, fragt Postleitzahl und Jahresverbrauch und gibt einen Preis aus.
Auch dann, wenn er „Wärmepumpentarif" heißt, rechnet er einen Stromtarif und
keine Anlage. **Er ist trotzdem der interessanteste Nebenbefund:** Der
Jahresverbrauch ist dort bereits eingegeben — genau die Angabe, an der unser
Rechner hängt.

**Der Netz-Pflichtprozess** (79 Häuser). Anlagenanmeldung, Netzanschluss,
Umlagenbefreiung, Eigenerklärung zur Privilegierung. Er trägt Zahlen- und
Personenfelder und sieht deshalb aus wie ein Rechner hinter einer
Datenabfrage — tatsächlich muss der Netzbetreiber ihn anbieten. Über Vertrieb,
Budget oder Zuständigkeit sagt er **nichts**.

**Das Anfrageformular** (34 Häuser). Heißt oft „Check" oder „Rechner" und
rechnet nichts; am Ende steht „ein Mitarbeiter meldet sich".

---

## Stromkennzeichnung nach § 42 EnWG

Jeder Stromlieferant muss jährlich seinen Energieträgermix veröffentlichen,
grafisch aufbereitet, seit dem 1. Juli mit den Werten des Vorjahres.

Gefunden: **317 Kennzeichnungsseiten**, bei 202 war das Bezugsjahr maschinell
lesbar, davon **33 veraltet**.

**Was diese Zahl nicht ist:** ein Compliance-Befund. Ein nicht gefundener
Nachweis heißt nicht, dass es keinen gibt — die Kennzeichnung hängt oft in einem
PDF hinter einer Übersichtsseite oder als Bild ohne Textverweis. Und rund ein
Fünftel der erfassten Häuser sind reine Netzgesellschaften, die niemanden
beliefern und deshalb gar keine schulden.

Als Aufhänger für ein Anschreiben taugen die 33 veralteten trotzdem — sie sind
konkret, nachprüfbar und unangenehm. **Vor dem Absenden gehört jeder Einzelfall
von Hand geprüft**, sonst ist die peinliche Zahl unsere.

---

## Was diese Erhebung nicht sieht

Die Vorbehalte gehen in **beide** Richtungen. Die erste Fassung nannte nur die
eine, und genau deshalb war sie zu optimistisch.

**Nach unten — wir könnten etwas übersehen haben:**

- 46 Versorger waren nicht abrufbar. Für sie liegt kein Befund vor.
- Die Stichprobe der 80 vermeintlich leeren fand **kein** übersehenes Werkzeug.
  Sie hat aber nur die **Startseite** gesehen, nicht die ganze Website. Die Null
  ist eine Untergrenze fürs Übersehen und **keine Hochrechnung auf alle 864**.
- Ein Werkzeug hinter einem Cookie-Banner ist auch im Browser unsichtbar. Zwei
  Fälle stehen deshalb bis heute auf „unklar".

**Nach oben — wir könnten zu viel gezählt haben:**

- „Versorger mit Werkzeug" ist nicht „Versorger, die gekauft haben". Blomberg
  lizenziert dasselbe Kataster, das die Nachbarkreise gratis anbieten.
- **Auch die 23 sind noch zu hoch.** Diese Zahl entstand, nachdem vier Fälle beim
  Bedienen weggefallen sind (drei Häuser mit einem „Werkzeug", das nur eine
  Postleitzahl abfragt, plus ein eingebettetes Landeskataster). Wo ein Werkzeug
  bisher nur gesehen und nicht bedient wurde, kann dasselbe noch einmal
  passieren.
- Der Rechenumfang ist für neun Werkzeuge geprüft (siehe
  `versorger-werkzeuge-profile.md`), für die übrigen nicht.

---

## Was der Feature-Tabelle noch fehlt

Die Tabelle für die Website ist nicht Teil dieses Papiers, und sie kann es noch
nicht sein. Was dafür fehlt:

1. **Die verbreiteten Werkzeuge selbst durchrechnen.** Eturnity, Reonic, VLink,
   geoplex und tetraeder sind als eingebettet erkannt — benutzt hat sie niemand
   von uns. Ohne das ist jede Aussage über ihre Rechenqualität eine Behauptung.
2. **Preise.** Für keinen dieser Anbieter kennen wir einen. Solantiq nennt seinen
   öffentlich (49 bzw. 149 € im Monat), ist aber der einzige — und der einzige
   ohne einen einzigen deutschen Versorger als Kunden.
3. **Rechtsprüfung.** Eine namentliche Gegenüberstellung ist vergleichende
   Werbung. Zulässig, aber nur mit objektiven, nachprüfbaren Aussagen und ohne
   Herabsetzung. Was hier steht, ist dafür teils zu weich formuliert und teils
   zu ungeprüft.

---

## Was die erste Fassung falsch gemacht hat

Steht hier, damit die Fehlerklasse beim nächsten Mal auffällt — und weil zwei
der vier Zahlen bereits in Gesprächen zitiert worden sein könnten.

| Behauptet am 25.08. | Tatsächlich |
|---|---|
| 6 Versorger mit eigenem Photovoltaik-Rechner | **0.** Alle sechs waren der Tarifrechner im Seitenkopf |
| 23 haben ein Werkzeug eingekauft | **15**, und darunter drei, die sich eine Instanz teilen |
| Bei Wärmepumpe hat einer eingekauft | **Keiner.** Der Fund war ein Knopf „Zur Studie" auf eine Forschungsseite |
| Der eine WP-Rechner gibt sein Ergebnis nur gegen Kontaktdaten | **Falsch.** Bernau zeigt das Ergebnis sofort; das Kontaktformular daneben ist ein getrennter Weg |
| Bei 33 Versorgern ließ sich der Anbieter benennen | **12** in jener Fassung — die 33 war eine Doppelzählung |

**Die gemeinsame Ursache:** Die Erkennung war ausschließlich daran geeicht, ob
sie ein vorhandenes Werkzeug *findet*. Kein einziger Test fragte, ob sie liegen
lässt, was keines ist. Ein Test schrieb den Fehler sogar fest — er verlangte für
einen Stromtarifrechner ausdrücklich die Einstufung „Rechner". Er hieß
„Tarifrechner ist kein Solarwerkzeug".

Dazu kam ein zweiter, unabhängiger Fehler: Drei Korrekturen an der
Sitemap-Auswertung waren nur in der geteilten Bibliothek gelandet, nicht im
Skript, das den Lauf gemacht hat. Der Lauf vom 25.08. sah deshalb systematisch
zu wenige Themenseiten — nach der Reparatur stiegen die Solar-Funde von 78 auf
124.
