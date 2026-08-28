# PV-Fachbetriebe: welche Quelle trägt, welche nicht

**Alles hier ist am 27.08.2026 gemessen oder im Volltext geprüft, nichts geschätzt.**
Wer diese Erhebung erweitert, liest zuerst diese Datei — vier Quellen sind bereits
durchgeprüft, drei davon verworfen. Der Weg muss nicht noch einmal gegangen werden.

---

## Warum überhaupt

Der Wettbewerbsbefund (`docs/seo/wettbewerb-solarcheck-deutschland.md`, Abschnitt 4) hat
gemessen, wer den Solar- und Speicherrechner der HTW Berlin verlinkt — kostenlos,
unabhängig, ohne Leadfunnel, also unser Zwilling. 2.080 verweisende Domains; wir haben
null echte. Unter den 1.000 stärksten sind Fachbetriebe mit 146 Domains die größte
Gruppe. Ein Fachbetrieb verlinkt einen unabhängigen Rechner, weil er die eigene
Beratung stützt und selbst keinen bauen will.

**Kalibrierung dieser 146 beim Eichen:** Die Zahl beruht auf einer Namensheuristik, nicht
auf einer geprüften Einordnung. Gegenprobe an drei Beispielen aus der Liste —
`heidel-solar.de` ist **kein Fachbetrieb**, sondern eine ehrenamtliche
Balkonstrom-Initiative der Heidelberger Energiegenossenschaft, die auf ihrer Seite
ausdrücklich schreibt, sie arbeite „ehrenamtlich und semi-professionell" und könne keine
Einzelberatung leisten. Die Kernaussage (Fachbetriebe sind die größte Gruppe) bleibt; die
Zahl 146 ist eine Obergrenze, keine Messung.

---

## Die vier geprüften Quellen

### 1. Google Places / Maps — GESPERRT, nicht bloß heikel

Rechtlich ausgeschlossen, dreifach, aus den Google Maps Platform Terms of Service
(Volltext-Auszug in `docs/quellen/fachbetriebe/google-maps-platform-terms-2026-08-27.txt`):

- **3.2.3(a) No Scraping**, Ziffer (iii): „copy and save business names, addresses, or
  user reviews" — also Name, Anschrift **und** Bewertungen.
- **3.2.3(b) No Caching**: Zwischenspeichern nur, soweit die Service Specific Terms es
  erlauben. Die erlauben in Abschnitt A.3 ausschließlich **Kennnummern** („Customer may
  cache the Google ID values … place_id from Places API"), sonst nichts.
- **3.2.3(d) No Re-Creating Google Products**, Ziffer (iii): die Nutzung „in a listings or
  directory service" — das ist wortwörtlich dieser Anwendungsfall.

**Damit fällt Google nicht nur für Bewertungen aus, sondern als Quelle überhaupt.** Ein
Umweg über einen Dritten, der Google seinerseits ausliest, ist keine Lösung, sondern eine
neue Rechtsfrage (fremde Nutzungsbedingungen, Datenbankherstellerrecht Googles, § 3a UWG)
— und die stellt sich gar nicht, solange ein sauberer Weg existiert.

**Was stattdessen zulässig ist:** Zeigt ein Betrieb seine Bewertung selbst auf der
eigenen Website — was viele tun, im Eichlauf etwa `eberhardt-solar.de` mit „4,5 aus 24
Bewertungen" —, ist das eine Selbstauskunft auf einer öffentlichen Seite. Sie wird
deshalb mit `bewertung_quelle = 'eigene-website'` erfasst und **nie** als
„Google-Bewertung" beschriftet. Wir lesen die Seite des Betriebs, nicht Google.

### 2. Handwerkskammer-Betriebsdatenbanken — fachlich stark, rechtlich offen

**Gemessen (HWK für München und Oberbayern, Suchbegriff „Photovoltaik", PLZ 80331,
Umkreis 50 km):** Die Suche ist ein schlichtes GET-Formular mit lesbaren Feldnamen, die
Trefferliste steht im ausgelieferten HTML, `robots.txt` erlaubt die Betriebsseiten. Je
Betrieb liefert die Detailseite:

- Firmenname mit Rechtsform, vollständige Anschrift
- **den Landkreis** — die regionale Zuordnung frei Haus
- Ansprechpartner, Telefon, E-Mail
- eine Leistungsbeschreibung (dort steht, ob PV gemacht wird)
- **die amtlich eingetragenen Berufe aus der Handwerksrolle** — „Elektrotechniker" ist ein
  zulassungspflichtiges Handwerk nach Anlage A HwO, der Eintrag setzt die Meisterprüfung
  oder eine Ausnahmebewilligung voraus. Das ist das härteste Trust-Signal überhaupt,
  härter als jede Selbstauskunft.
- Website bei **7 von 12** geprüften Betrieben (58 %).

**Warum sie trotzdem nicht die Massenquelle ist — der bequeme Freibrief trägt nicht.**
Naheliegend wäre der Merksatz aus dem Förderbereich gewesen: „Gemeinden sind öffentliche
Stellen, und § 2 Abs. 5 DNG verbietet ihnen die Berufung auf § 87b UrhG." Handwerkskammern
sind ebenfalls öffentliche Stellen (§ 90 Abs. 1 HwO: „sie sind Körperschaften des
öffentlichen Rechts", im Volltext geprüft). **Der Schluss ist trotzdem falsch**, und zwar
aus § 2 Abs. 3 DNG selbst:

- **Nr. 1 Buchst. a Doppelbuchst. aa** — das Gesetz gilt nicht, „soweit der Schutz
  personenbezogener Daten entgegensteht". Die Datenbank führt Einzelunternehmer mit
  Klarnamen und Handynummer.
- **Nr. 1 Buchst. d** — es gilt nicht für Daten, „deren Bereitstellung nicht unter den
  durch Rechtsvorschrift festgelegten öffentlichen Auftrag der öffentlichen Stelle fällt".
  Die Betriebsdatenbank ist ein freiwilliges Werbeangebot der Kammer („Mitgliedsbetriebe
  können sich kostenlos eintragen"), nicht die Handwerksrolle nach § 6 HwO.

Das ist genau der Fall, vor dem CLAUDE.md warnt: *„ein ‚gilt nicht für X' braucht eine
eigene Fundstelle — Verweisketten mitlesen."* Der Förder-Merksatz wäre hier ungeprüft
übernommen worden und hätte danach als Rechtfertigung dagestanden.

**Offene Entscheidung, keine Sackgasse.** Die Quelle ist fachlich die beste von allen. Ob
wir sie nutzen, ist eine Rechtsfrage mit mehreren vertretbaren Antworten (hat die Kammer
eine „wesentliche Investition" im Sinne des § 87b UrhG? greift § 87b Abs. 1 S. 2 bei
wiederholter Entnahme unwesentlicher Teile? wie steht es mit Art. 14 DSGVO bei den
Personennamen?). Sie gehört vor einer Nutzung durch zwei Legal-Judges, nicht in eine
Vermutung. **Nicht gemessen und offen:** wie viele der 53 Kammern dieselbe Software
fahren — ein erster Shell-Versuch war unbrauchbar (Zeichensatzfehler, und die Suche ist
auf vielen Startseiten gar nicht verlinkt).

### 3. OpenStreetMap — gemessen und zu dünn

Overpass-Abfrage über ganz Deutschland, 27.08.2026:

| Abfrage | Objekte |
|---|---|
| `craft=photovoltaic` + `shop=solar` + `craft=solar` | **52** |
| `craft=electrician` | **3.716** |

Bei rund 50.000 Elektrohandwerksbetrieben in Deutschland deckt die zweite Zahl etwa 7 %
ab — zufällig verteilt, ohne jede Aussage darüber, ob PV gemacht wird, und ohne Website
im Regelfall. Als Grundgesamtheit unbrauchbar. Die Lizenz (ODbL) wäre unproblematisch
gewesen; daran liegt es nicht.

### 4. Ortssuche über die Suchmaschine — DIESER WEG

Je Landkreis zwei Fragen an die SERP-Schnittstelle, die wir ohnehin bezahlen
(0,002 $ je Abruf, 400 Kreise × 2 = **1,60 $ für ganz Deutschland**).

**Gemessen an drei Kreisen vorab** (Fulda, Bautzen, Emsland): 10 bis 20 echte
Betriebs-Domains je Kreis, dazwischen klar erkennbare Portale.

Drei Eigenschaften, die keine andere Quelle hat:

1. **Nur Betriebe mit Website** — per Konstruktion. Ein Betrieb ohne Website kann kein
   Widget einbetten; die 42 % ohne Website in der Kammer-Datenbank wären für den Zweck
   Ballast.
2. **Keine fremde Datenbank angefasst.** Wir bekommen Adressen von Websites und lesen
   danach deren Impressen — Angaben, die § 5 DDG ohnehin öffentlich verlangt.
3. **Zwei Fragen, weil eine systematisch etwas verliert.** „Photovoltaik Fachbetrieb X"
   findet die Betriebe aus dem Solargeschäft, „Solarteur X" die, nach denen Suchende
   fragen. Die Trefferlisten überschneiden sich nur etwa zur Hälfte; ein Begriff allein
   verlöre das Elektrohandwerk, das PV mitmacht, ohne es im Namen zu führen.

---

## Regional oder überregional: gemessen, nicht gepflegt

Eine gepflegte Sperrliste von Vergleichsportalen wäre dasselbe Wettrennen wie beim
Förder-Crawl — sie veraltet, sobald ein Portal aufmacht. Stattdessen entscheidet die
**Streuung**: Ein Fachbetrieb bedient einen Umkreis und erscheint in ein bis drei
Landkreisen; ein Vergleichsportal erscheint in jedem. Zwischen vier und zehn liegt
niemand, deshalb ist die Schwelle unkritisch (acht Kreise, mit Sicherheitsabstand nach
unten; sie wächst mit der Zahl der abgefragten Kreise, damit in einem Teillauf nicht
jedes Portal als „Betrieb" durchgeht).

**Gemessen über alle 400 Kreise: 4.792 regional, 61 überregional.** Die Trennung sitzt —
sie fängt my-hammer (373 Kreise), energie-experten (369), meinestadt (326), Gelbe Seiten
(175), Das Telefonbuch (107) und die Vergleichsrechner.

**Und sie hat sofort eine Beschriftungslüge aufgedeckt.** Die erste Fassung nannte die
Klasse `portal`. Unter den 61 stehen aber auch **Enpal (54 Kreise), Zolar (79) und Enerix
(261)** — bundesweite ANBIETER, keine Verzeichnisse. Beide gehören aus der Liste heraus
(ein bundesweiter Konzern ist kein regionaler Verteiler, sondern der Wettbewerber, gegen
den wir positioniert sind), aber sie „Portal" zu nennen wäre genau der Fehler, den
CLAUDE.md an erster Stelle nennt: eine Beschriftung, die etwas anderes behauptet als die
Zahl darunter. Die Klasse heißt deshalb `ueberregional`, und der Grund nennt die Messung
im Klartext („in 54 von 400 abgefragten Kreisen").

Eine kurze Liste großer Plattformen (Facebook, YouTube, Wikipedia …) bleibt trotzdem
nötig: Sie erscheinen zwar überall, aber ein *einzelner* Treffer in einem Kreis käme
sonst als „Betrieb mit einem Kreis" durch.

---

## Was das Eichen an den Extraktoren gefunden hat

Drei Betriebe von Hand, dann 25 maschinell, dann jede Zeile gegengelesen. Die Zahlen des
ersten Laufs sahen plausibel aus (88 % mit Anschrift, 40 % mit Handelsregisternummer) —
**und enthielten sechs Fehlerklassen**, keine davon von außen erkennbar:

| Fehler | Beispiel | Ursache |
|---|---|---|
| Rechtsform aus Wortmitte | „DORFMANAGEMENT" → AG, „WERKZEUG" → UG | keine Wortgrenzen |
| Gründungsjahr aus beliebigem „seit"-Satz | Hamburger Abendblatt → 2021 | Muster zu weit |
| Beispieladresse als Kontakt | `user@example.com` | erste Adresse im Text gewinnt |
| Hoster-Adresse als Kontakt | `info@ionos.de` auf geparkter Domain | dasselbe |
| Überschrift als Kammername | „Handwerkskammer Berufsrechtliche Regelungen" | Muster frisst die nächste Zeile |
| „kein Betrieb" als Urteil ohne Messung | Hersteller mit per Skript nachgeladener Seite | „nichts gefunden" ≠ „ist keiner" |

Der letzte ist der wichtigste und ist jetzt zweistufig gelöst: Ein erkanntes Kommunal-,
Verlags- oder Portalmuster ist ein **Befund** (`kein-betrieb`); ein fehlendes PV-Wort ist
nur eine **Lücke** (`unklar`, mit dem Vermerk „von Hand ansehen").

**Merksatz für die nächste Erweiterung:** Wer einen Extraktor baut, liest dreißig Zeilen
Ergebnis von Hand gegen. Die Trefferquote sagt nichts darüber, ob getroffen wurde, was
gemeint war.

---

## Was am 27.08.2026 herausgekommen ist

Alle 400 Landkreise abgefragt, zwei Fragen je Kreis, **1,68 $ Gesamtkosten** (3 von 800
Abrufen kamen nicht durch). 4.853 Domains gefunden, davon nach Streuung und Impressum:

| Klasse | Zahl | was das heißt |
|---|---|---|
| **betrieb** | **3.119** | regional, mit Website, mit PV-Angebot |
| unklar | 764 | zweimal geprüft, kein PV-Angebot gefunden — überwiegend Elektrobetriebe ohne PV-Geschäft und geparkte Domains |
| kein-betrieb | 909 | Kommunen, Solarkataster, Vereine/Genossenschaften, Presse, Portale |
| ueberregional | 61 | Portale und bundesweite Anbieter |

Dazu **14.965 Belege** — jeder mit Fundstelle, Textstelle und Datum.

**Erreichbarkeit der Betriebe: 94 %** — E-Mail 85 %, Telefon 83 %, Kontaktformular 8 %. Die Zusammenfassung steht neben den Einzelwerten, nicht an ihrer Stelle: Ein Formular
ist ein Kontaktweg, aber kein Postfach, und wer später schreiben will, braucht den
Unterschied.

**Trust-Signale:** Anschrift 84 % · **amtlicher Gemeindeschlüssel 83 %** ·
Handelsregisternummer 57 % · Meisterbetrieb 21 % · Handwerkskammer 14 % · Zertifikat 12 % ·
Gründungsjahr 8 % · Bewertung (Selbstauskunft) 1 % · Innung 1 % ·
Installateurverzeichnis 1 %.

Die niedrigen Quoten unten sind **kein Erfassungsfehler, sondern die Realität**: Diese
Angaben stehen auf den meisten Websites schlicht nicht. Ein loseres Muster brächte höhere
Quoten und falsche Werte — genau das war der erste Lauf.

**Abdeckung: alle 16 Bundesländer, 391 der 400 Kreise mit mindestens einem Betrieb.**
Die Verteilung folgt der Wirtschaftskraft, wie zu erwarten — Bayern 531, Nordrhein-
Westfalen 525, Baden-Württemberg 341, Niedersachsen 308, am unteren Ende die Stadtstaaten
(Hamburg 16, Bremen 20) und das Saarland (29). Die neun Kreise ohne Eintrag heißen
**nicht**, dass es dort keine Betriebe gibt: Dort hatte keiner der gefundenen eine
auslesbare Anschrift, oder die Postleitzahl blieb mehrdeutig.

**Gemessene Restunschärfe der Klasse „betrieb": rund 1 %** (31 von 3.118 vor der
Nachbesserung trugen ein Wort, das auf Vermittlung, Verzeichnis, Presse oder
Finanzdienstleistung deutet; bei Durchsicht war etwa die Hälfte davon eine echte
Fehleinordnung). Zwei Muster sind daraufhin ergänzt worden — Lead-Vermittlung und
erweiterte Presse-Erkennung —, sie haben beim Nachlauf 20 Domains zurückgestuft. **Der
Rest bleibt stehen und wird hier genannt statt weggepoliert:** Die Belege liegen vor, wer
schärfer filtern will, filtert die Belege neu statt neu zu crawlen.

**Die Streuungsverteilung bestätigt die Bauweise:** 2.105 Betriebe erscheinen in genau
einem Kreis, 774 in zwei bis vier, 170 in fünf bis neun, nur 69 in zehn bis neunzehn.
Genau die Verteilung, die eine Schwelle bei 20 unkritisch macht.

**Der Gemeindeschlüssel geht gegen das Melderegister auf: null Abweichungen** bei 3.843
Zuordnungen. 50 blieben offen, weil die Postleitzahl mehrere Gemeinden abdeckt und der
Ortsname aus dem Impressum zu keiner passte — dort steht **kein** Schlüssel, lieber keine
Zuordnung als die falsche Gemeinde.

## Nachtrag 28.08.2026: Kontaktwege, Restklasse, Ansicht

### Die Kontaktseite schließt die Lücke — nicht das Impressum

473 der Betriebe hatten keine auslesbare E-Mail-Adresse, 233 gar keinen Kontaktweg. Der
Grund ist selten, dass es keinen gibt: Er steht auf der **Kontaktseite**, und dort oft als
Formular statt als Adresse. Die Durchgänge über die Kontaktseiten brachten **rund 200 neue
E-Mail-Adressen und 653 Kontaktformulare** — am Ende sind **90 % der Betriebe
erreichbar**.

**Ein Formular IST ein Kontaktweg** und wird als solcher gezählt — bei den Gemeinden war
genau das der Regelfall, und ein Betrieb, der bewusst keine Adresse zeigt, ist deshalb
nicht unerreichbar.

### Ein Denkfehler, den erst das Gegenlesen zeigte

Der erste Anlauf prüfte das GEWERK auf der Kontaktseite — und löste damit fast nichts auf.
Dort steht das Angebot naturgemäß nicht; offensichtliche Elektrobetriebe blieben auf
„unklar". Richtig ist die **Navigation der Startseite**: Sie ist statisch im HTML, auch
wenn der Inhalt per Skript nachlädt. Ein Betrieb, dessen Startseite uns leer erscheint,
hat „Photovoltaik" trotzdem im Menü.

### Die Restklasse enthält kaum verborgene Betriebe — auch das ein Befund

Von den unklaren Domains wurden **64 doch zu Betrieben**, 32 als Nicht-Betrieb erkannt
(überwiegend kommunale Solarkataster), und **722 zweimal geprüft ohne Photovoltaik-
Angebot**. Die Stichprobe erklärt, warum: Dahinter stecken Elektrobetriebe **ohne**
PV-Geschäft und geparkte Domains, nicht verborgene Fachbetriebe.

Diese 722 behalten die Klasse „unklar" — ein Angebot kann auf einer Unterseite stehen,
die wir nicht gelesen haben —, aber ihr Grund sagt jetzt, dass zweimal nachgesehen wurde.
**„Nichts gefunden" und „noch nicht angesehen" müssen unterscheidbar bleiben**, sonst
prüft die nächste Sitzung dieselben 722 noch einmal.

### Der Firmenname: zwanzig Prozent kaputt, und die Quote zeigte es nicht

**Nachtrag 28.08.2026, ausgelöst vom Betreiber.** Er sah eine einzelne Karte —
„& Datenschutz – SED-Solar GmbH" — und sagte, die Firmenbezeichnungen seien unbrauchbar.
Die Auszählung über den ganzen Bestand gab ihm recht und zeigte mehr, als sein Beispiel
ahnen ließ: **633 von 3.115 Namen — 20 % — trugen Müll**, in fünf klaren Klassen.

| Klasse | Beispiel | Ursache |
|---|---|---|
| Rest einer zerlegten Überschrift | „& Datenschutz - SED-Solar GmbH" | Die Impressum-Überschrift lautet „Impressum & Datenschutz"; das erste Wort war entfernt, der Rest blieb |
| nachgestelltes Seitenwort | „Elektro-Klaas GmbH: Impressum" | nur führende Wörter wurden geputzt |
| unaufgelöste HTML-Entität | „&ndash; AURORASOL GmbH" | `&ndash;` fehlte in der Entitätenliste |
| Name HINTEN im Seitentitel | „Photovoltaik und Elektrotechnik - Mac Metzler Energietechnik GmbH" | die Zerlegung nahm den ersten Teil |
| reiner Werbespruch | „Solarprodukte zu den besten Tagespreisen kaufen" | der Seitentitel als Rückfall, ungeprüft |

**Der Grundfehler war, den Seitentitel als Rückfall oberflächlich zu putzen. Ein
Seitentitel ist fast nie der Firmenname.** Die neue Regel: an allen Trennern zerlegen, der
Teil MIT Rechtsform gewinnt (gleich an welcher Stelle), ohne Rechtsform gilt nur, was wie
ein Name aussieht und nicht wie ein Satz — sonst gar kein Name, dann zeigt die Liste die
Adresse.

**Ergebnis: von 20,3 % auf 1,4 %.** Alle 18 gemessenen Fälle sind als Test festgenagelt.

**Und der Fix erzeugte prompt einen neuen Fehler** — sichtbar nur, weil dieselbe Auszählung
noch einmal lief: Aus „Uwe Schmidt Elektroinstallation Gas | Wasser | Sanitär GmbH -
Elektromeisterbetrieb Berlin" wurde **„Sanitär GmbH"**. Dort sind die Striche eine
Aufzählung IM Namen, kein Titel-Trenner, und der Schnitt traf mitten hinein. Ab vier Teilen
wird deshalb nicht mehr zerlegt. **Merksatz: Nach einem Fix an einem Extraktor läuft die
Messung noch einmal — ein Fix kann eine neue Fehlerklasse öffnen, und die sieht genauso
plausibel aus wie die alte.**

### Der Firmenname war der dritte Fehlgriff, und er fiel erst in der Liste auf

In der Datenbank sahen die Namen unauffällig aus. Untereinander in einer Ansicht standen
dann: „Impressum - 3E-Elektrotechnik GmbH", „Home | ABEL ReTec", „Kontakt Wagner GmbH",
„Name 3NERGY GmbH Adresse Am Pönitzer Dreieck 1" — und einmal bloß „GmbH & Co. KG" ganz
ohne Namen. Herkunft: die Überschrift des Impressums oder der Seitentitel als Rückfall.

In einem Anschreiben wäre jeder davon peinlich, und genau dafür wird der Name irgendwann
gebraucht. Die Reinigung ist deshalb streng: **Was nach dem Putzen nur noch aus einer
Rechtsform besteht, wird verworfen — lieber kein Name als ein falscher.**

**Merksatz, jetzt zum dritten Mal bestätigt:** Eine Spalte prüft man nicht in der
Datenbank, sondern dort, wo sie später gelesen wird. Erst die Liste macht sichtbar, was
einzeln plausibel aussieht.

### Wer mehr gesehen hat, gewinnt — und das ist nicht der spätere Lauf

Die schwerste Falle dieser Runde, und sie war nur durch Nachzählen zu finden: Ein
Wiederholungslauf der Profil-Phase **nahm die Erkenntnisse der Kontakt-Phase zurück**. Aus
758 Domains mit dem Vermerk „zweimal geprüft, kein Photovoltaik" wurden wieder 27, und die
55 Betriebe, die erst die Navigation verraten hatte, standen wieder auf „unklar".

Die Ursache ist allgemein: **Zwei Läufe schreiben dasselbe Feld, und der spätere gewinnt —
auch wenn er weniger gesehen hat.** Die Profil-Phase kennt Startseite und Impressum, die
Kontakt-Phase zusätzlich Navigation und Kontaktseite.

Von außen ist der Schaden unsichtbar: Die Zahlen bleiben plausibel, nur die gründlichere
Prüfung ist weg — und dieselben Seiten würden beim nächsten Lauf ein drittes Mal
abgerufen. Die Regel lautet jetzt: Ein erkanntes Nicht-Betrieb-Muster ist ein **Befund**
und gilt immer; die bloße Rückstufung auf „unklar" gilt nur, solange die gründlichere
Prüfung noch nicht gelaufen ist. Festgehalten als Entscheidungstabelle in
`lib/__tests__/fachbetrieb-stand.test.ts`.

### Zwei Fallen beim Schreiben, beide gemessen

Ein einzelnes kaputtes Prozentzeichen in einem fremden Link ließ `decodeURIComponent`
werfen und riss einen Lauf nach 450 von 1.254 Domains ab. Und ein Nullbyte aus einer
Website ließ den ganzen Schreibblock scheitern. Beides ist jetzt abgefangen — wer fremdes
HTML verarbeitet, trifft solche Fälle zwangsläufig; es genügt EINE Seite unter tausenden.

### Das Gewerk — und warum es eine eigene Spalte ist

Auf Vorgabe des Betreibers (28.08.2026), weil die Erhebung später um Heizungsbauer und
weitere Gewerke wachsen soll. **Zu unterscheiden von den Geschäftsfeldern:** Die sagen,
WAS angeboten wird (Photovoltaik, Speicher, Wallbox), das Gewerk sagt, WER es anbietet.
Ein Elektrobetrieb, ein Dachdecker und ein reiner Solarteur bauen dieselbe Anlage und sind
drei verschiedene Gesprächspartner.

Gelesen aus Firmenname, Navigation und Impressum. **Gemessen: 67 % tragen mindestens
eines** — Elektro 1.454, Heizung/Sanitär 513, Solarteur 494, Energieberatung 327,
Dachdecker 241, Zimmerei 98. Mehrere sind erlaubt und der Normalfall im Handwerk; die
Verteilung ist gesund (1.285 mit einem, 608 mit zwei, 153 mit drei, 40 mit vier oder
mehr — und die vierzig sind echte Komplettanbieter, kein Fehlgriff).

Zwei Muster mussten nachgebessert werden, beide vom Test gefunden: **„Elektro" allein**
(die häufigste Schreibweise im Handwerk — die erste Fassung verlangte ein Suffix und fand
„Elektro Klaas GmbH" nicht) und **„Dachdeckerei"**. Gegenprobe im Test: „Elektroauto" und
„Elektromobilität" stehen auf jeder zweiten Solarteur-Seite und sind kein Gewerk.

### Bewertungen: verdreifacht, und trotzdem eine Minderheit

Google bleibt gesperrt. Der zulässige Weg sind die **strukturierten Daten der eigenen
Website** — `AggregateRating` nach schema.org, als JSON-LD oder Microdata. Das ist eine
Selbstauskunft auf einer öffentlichen Seite, genau wie eine Zahl im Fließtext, nur
maschinenlesbar.

**Vorab gemessen an 120 Betrieben:** 6 mit JSON-LD, 3 mit Microdata. Über den ganzen
Bestand hebt das die Quote von 42 auf **156 Betriebe (5 %)**. Die Erwartung „jeder Betrieb
bekommt Sterne" erfüllt kein zulässiger Weg — das ist die ehrliche Antwort auf die Frage,
ob sich Bewertungen ergänzen lassen.

Die Herkunft wird mitgeführt und nie verwischt: Was der Betrieb selbst ausweist, heißt
„eigene Website" — auch dann, wenn er dort seine Google-Sterne wiedergibt. Wir haben die
Zahl von ihm, nicht von Google.

### Das Logo

Das Favicon der eigenen Seite, **Adresse aus dem HTML gelesen statt geraten**. Dieselbe
Lehre wie beim Impressum: `/favicon.ico` ist nur eine von mehreren Konventionen, viele
liegen unter eigenem Pfad, als PNG oder SVG, oft mit Zeitstempel im Namen. Gemessen: 2.796
von 3.117 Betrieben (90 %) haben eines. Geladen ohne Herkunftsangabe, damit der Abruf dem
Betrieb nicht verrät, woher er kommt; fehlt es, bleibt der Platz leer — ein Ersatzbild
würde eine Marke behaupten, die es nicht gibt.

### Die Ansicht

`/admin/fachbetriebe`, eigener Bereich in der Seitenleiste (nicht unter „Versorger" —
Handwerksbetriebe sind eine andere Zielgruppe mit anderem Rechtsrahmen, und der Bereich
wächst um weitere Gewerke).

Eine Tabelle mit Kopfzeile: Logo, Betrieb, Ort, Landkreis (groß) mit Bundesland (klein),
Gewerk, Merkmale, belegte Zahl, Erreichbarkeit, Arbeitsstand. Filter nach Bundesland,
Gewerk, Art, Arbeitsstand, Erreichbarkeit und Meisterbetrieb. Details beim Aufklappen,
Arbeitsstand und Notiz pro Betrieb.

**Die Kopfzeile erklärt sich selbst, wo eine Zahl es nicht tut** — „belegt", „Gewerk" und
„Kontakt" tragen ein „?" mit einer Erklärung. Eine Zahl wie „3/8" ohne Beschriftung ist
eine Behauptung.

**Sie kann bewusst wenig.** Es gibt keinen Versand, kein Anschreiben, keine Auswahlliste.
Die Arbeitsstände heißen „offen · vorgemerkt · angesehen · ungeeignet" — ein Zustand wie
„angeschrieben" würde einen Apparat behaupten, den es nicht gibt; ein Test verbietet
solche Namen.

**Die Zahl neben jedem Betrieb (`3/8`) zählt belegte Merkmale, nicht Qualität.** Ein
Meisterbetrieb, der seinen Titel nicht auf die Website schreibt, bekommt weniger Punkte
als einer, der es tut — die Zahl misst unseren Datenstand, nicht den Betrieb. Deshalb
heißt sie so und steht neben den einzelnen Merkmalen, nicht an ihrer Stelle.

## Was diese Erhebung ausdrücklich NICHT ist

Sie baut keinen Vermittlungsweg, kein Anschreiben, kein Cockpit und verschickt nichts.
Die Zusage „ohne Verkaufsanrufe · keine Lead-Erfassung · kein Vertriebskontakt" steht an
vierzehn Stellen im Code und in der Datenschutzerklärung und wird hier nicht angefasst.

**Zwei Fragen, die vor jeder Nutzung der Adressen zu klären sind — beide gehören dem
Betreiber, nicht dem Code:**

1. **Würde ein Fachbetrieb ein Widget einbetten, das ihm keine Leads liefert?** Der
   Wettbewerbsbefund nennt das selbst als ungeklärt und sagt, es sei „eine Frage an drei
   Betriebe, nicht an eine Datenbank". Erheben ist billig und reversibel, ein Versandschub
   nicht — deshalb ist die Erhebung trotzdem vorgezogen worden; die Frage bleibt offen.
2. **Datenschutz vor dem ersten Kontakt.** Die Sätze enthalten bei Einzelunternehmern
   personenbezogene Daten (Name, Telefon, E-Mail). Für die Erhebung selbst trägt Art. 6
   Abs. 1 lit. f DSGVO; sobald kontaktiert wird, greift die Informationspflicht nach
   Art. 14 — dieselbe Lage wie bei den Gemeindebriefen, wo sie über den
   Datenschutz-Einzeiler in der Mail gelöst ist. Die Datenschutzerklärung nennt diese
   Verarbeitung heute **nicht**; das ist Schritt eins jeder Nutzung, nicht der Erhebung.
