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
| **betrieb** | **3.118** | regional, mit Website, mit PV-Angebot |
| unklar | 913 | kein PV-Wort im ausgelieferten HTML — meist Verzeichnisse, die ihren Inhalt per Skript nachladen |
| kein-betrieb | 760 | Kommunen (280 der Stichprobe), Vereine/Genossenschaften (57), Presse (38), Portale (25) |
| ueberregional | 61 | Portale und bundesweite Anbieter |

**Trust-Signale der 3.118 Betriebe:** Anschrift 85 % · Handelsregisternummer 58 % ·
E-Mail 84 % · **amtlicher Gemeindeschlüssel 98 % der Betriebe mit Anschrift** ·
Meisterbetrieb 21 % · Handwerkskammer 14 % · Zertifikat 12 % · Gründungsjahr 8 % ·
Bewertung (Selbstauskunft) 1 % · Innung 1 % · Installateurverzeichnis 1 %.

Die niedrigen Quoten unten sind **kein Erfassungsfehler, sondern die Realität**: Diese
Angaben stehen auf den meisten Websites schlicht nicht. Ein loseres Muster brächte höhere
Quoten und falsche Werte — genau das war der erste Lauf.

**Gemessene Restunschärfe der Klasse „betrieb": rund 1 %** (31 von 3.118 tragen ein Wort,
das auf Vermittlung, Verzeichnis, Presse oder Finanzdienstleistung deutet; davon sind bei
Durchsicht etwa die Hälfte echte Fehleinordnungen). Zwei Muster sind daraufhin ergänzt
worden — Lead-Vermittlung und erweiterte Presse-Erkennung. **Der Rest bleibt stehen und
wird hier genannt statt weggepoliert:** Die Belege liegen vor, wer schärfer filtern will,
filtert die Belege neu.

**Die Streuungsverteilung bestätigt die Bauweise:** 2.105 Betriebe erscheinen in genau
einem Kreis, 774 in zwei bis vier, 170 in fünf bis neun, nur 69 in zehn bis neunzehn.
Genau die Verteilung, die eine Schwelle bei 20 unkritisch macht.

**Der Gemeindeschlüssel geht gegen das Melderegister auf: null Abweichungen** bei 3.899
Zuordnungen. 50 blieben offen, weil die Postleitzahl mehrere Gemeinden abdeckt und der
Ortsname aus dem Impressum zu keiner passte — dort steht **kein** Schlüssel, lieber keine
Zuordnung als die falsche Gemeinde.

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
