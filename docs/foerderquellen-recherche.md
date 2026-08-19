# Fremde Förderquellen: taugen sie als Abkürzung?

**Stand 19.08.2026.** Auftrag: Prüfen, ob kommunale Förderprogramme irgendwo
gesammelt vorliegen, statt sie von 11.000 Gemeinde-Websites zu holen.

Alle Zahlen hier sind **gemessen**, nicht geschätzt — die Messbefehle stehen
jeweils dabei, damit ein späterer Lauf sie nachrechnen kann.

## Kurz: Nein — und die Abkürzung, die es gäbe, sollten wir nicht nehmen

**Keine Quelle führt den langen Schwanz.** Bund, Länder und Energieagenturen
führen Programme **für** Kommunen, nicht **von** Kommunen. Die einzigen beiden
Sammlungen mit kommunalen Bürgerprogrammen sind private Portale, die zusammen
rund 200 der 11.247 Gemeinden kennen — Poing (~15.000 Einwohner, von uns am
19.08. gefunden) steht in keiner davon.

Sie brächten **148 Gemeinden, die wir noch nicht haben**. Zwei Legal-Judges
raten übereinstimmend vom automatischen Abzug ab: Bei diesen Portalen *ist* die
Auswahl die vollständige Investition, damit ist gerade die Ortsname-plus-Link-
Liste der qualitativ wesentliche Teil (§ 87b Abs. 1 S. 1). Dazu wären wir
Mitbewerber und die Portale abmahnbefugt — und wir beanspruchen dasselbe Recht
auf `/lizenz` für uns selbst.

**Empfehlung:** Weder abziehen noch anfragen. Die Portale einmalig von Hand als
Quergegenprobe nutzen — das ist ohne Erlaubnis vertretbar und reicht für die
Menge, um die es geht. Eine Anfrage bräuchte es nur für einen **laufenden**
Abgleich, und genau der ist der rechtlich verbotene Teil.

Der eigentliche Hebel ist die **eigene Suche** (rechtlich sauber, § 2 Abs. 5 DNG):
die CMS-eigene Suchfunktion statt Link-Crawling hebt die Trefferquote von 13 %
auf **35 %**.

## 1. Förderdatenbank des Bundes (foerderdatenbank.de) — fällt aus

Enthält **Bund, Länder, EU. Keine Kommunen.** Das ist keine Lücke, sondern der
definierte Umfang; das Bundesfinanzministerium nennt sie „Förderdatenbank
Deutschland – Bund, Länder, EU".

**Die Falle dabei:** Die Datenbank enthält sehr wohl Programme **für** Kommunen
(Kommune als Empfängerin, z. B. „Freiwillige kommunale Wärmeplanung"). Das ist
die Umkehrung dessen, was wir brauchen — Programme **von** Kommunen für ihre
Bürger. Wer nach „kommunal" sucht, findet Treffer und hält die Quelle
fälschlich für ergiebig.

Dazu: **kein Export, keine Schnittstelle.** Die Verwaltungsdaten-Informations-
plattform des Bundes (Registereintrag 159) sagt es selbst — der Bestand sei
„Open Data-tauglich", stehe aber „aufgrund des Datenformats bzw. der Lizenz
gegenwärtig nicht als Open Data zur Verfügung". Betrieb: BMWE, technisch ]init[ AG.

Die Seite liegt hinter einer Radware-Bot-Prüfung. Sie wurde **nicht** umgangen
(vgl. `scripts/foerder-verify.md`); die Auskunft stammt aus der Startseite, dem
BMF und dem amtlichen Registereintrag.

## 2. Landes-Energieagenturen — dieselbe Umkehrung, fallen aus

Geprüft an KEA-BW (`kea-bw.de/foerderprogrammsuche`), der am weitesten
ausgebauten: über 200 Programme, Fördergeber sind **Bund, Land, EU**. Einzelne
Städte als Fördergeber kommen nicht vor. Es ist eine Datenbank **für** Kommunen.
Kein Bundesland führt die Bürgerprogramme seiner Gemeinden zentral.

## 3. Solarenergie-Förderverein (SFV) — tot

Die traditionsreiche Liste „Speicherförderung in Bundesländern und Kommunen"
führt **5 Gemeinden**, letzter datierter Eintrag **April 2020**. Nicht mehr gepflegt.

## 4. GovData / Open Data — nicht die gesuchte Sorte

81 Treffer zu „Förderprogramme", überwiegend CC-Zero oder dl-de/by-2.0 — aber es
sind Listen **geförderter Projekte** (etwa „Im Rahmen des Förderprogramms
NRWeltoffen geförderte Kommunen"), keine Kataloge kommunaler Zuschüsse für
Bürger. Für unseren Zweck unbrauchbar.

## 5. co2online.de — trägt, aber begrenzt

Gemeinnützige co2online gGmbH. **Gemessen** über die vier Themenlisten, die
unsere drei Techniken abdecken (photovoltaik, waermepumpe_unspezifisch,
balkonkraftwerk, batteriespeicher):

| | |
|---|---|
| kommunale Fördergeber | **64** |
| kommunale Programme | **102** |
| davon neu für uns | **36** |

Die Seite gruppiert selbst nach „Maßnahmen in Kommunen" — die Zahl ist also
nicht geschätzt, sondern aus ihrer eigenen Gliederung gezählt.

**Die 35.000-Einwohner-Grenze gilt nur dem Beratungstool, nicht der Datenbank.**
Der FördermittelCheck sagt „bei kommunalen Angeboten ab 35.000 Einwohnern" —
die Themenlisten führen aber Borgholzhausen (~9.000) und Werther (~11.000).
Wer nur die Selbstbeschreibung liest, verwirft die Quelle zu Unrecht.

**Kein Prüfdatum je Eintrag.** Aktualisiert wird laut Eigenauskunft „mit
Inkrafttreten eines neuen Programmes" — das sagt nichts darüber, ob ein
bestehender Eintrag noch stimmt.

## 6. foerderregister.de — die ergiebigste Kandidatenquelle

Kommerziell, Betreiber `growing-brands.de`. **Nicht als Zahlenquelle brauchbar**
(vgl. Memory `feedback_foerder_quellenqualitaet`: Portale sind in beide
Richtungen falsch) — aber es tut genau das, was wir brauchen: Es nennt je
Eintrag ein Prüfdatum **und verlinkt die amtliche Quelle**.

Gemessen über die vier Themenseiten:

| | |
|---|---|
| verlinkte Amtsdomains | **189** |
| davon Bund/Land (raus) | 16 |
| kommunale Ebene | **173** |
| davon schon im Katalog | 33 |
| **neue Kandidaten** | **140** (davon 36 Stadtwerke/Versorger) |

## Zusammen: 148 neue Kandidaten-Gemeinden

co2online 36 neu, foerderregister 129 neu, Überschneidung 17 → **148**.

**Was das ist und was nicht:** Eine Liste von Orten mit Adresse. Jede Zahl wird
weiterhin an der Amtsseite gelesen — die Portale sind der Einstieg, nie der Beleg.

**Was es nicht löst:** Alle Portale zusammen kennen rund 200 der 11.247
Gemeinden. Poing (~15.000 Einwohner, 600 € Wärmepumpe, von uns am 19.08.
gefunden) steht in **keinem** davon. Der lange Schwanz ist für alle unsichtbar,
aus demselben Grund: Niemand sonst crawlt 11.000 Gemeinde-Websites.
Bei Balkonkraftwerken sind **wir bereits vollständiger** als die Portale.

## Die Suche vertiefen: die CMS-eigene Suchfunktion

Die heutige Suche (`scripts/funding-discover.ts`) folgt Links und Sitemap, zwei
Klicks tief — sie sieht nur, was verlinkt ist. Trefferquote **13 %**
(1.303 Förderseiten aus 9.722 Gemeinden).

Fast jede Verwaltungs-Website hat eine Volltextsuche. Die findet die Förderseite
auch dann, wenn sie im Menü drei Ebenen tief hängt.

**Ein einheitliches Adressmuster gibt es nicht** — gemessen an 12 Seiten kamen
sieben verschiedene Parameternamen vor (`q`, `s`, `search`, `suchbegriff`,
`keywords`, `keys`, `qs`). Muster zu raten scheitert, und schlimmer: Viele
Systeme antworten auf einen unbekannten Parameter mit **HTTP 200 und der
Startseite**. Ein 200er ist also kein Beleg, dass gesucht wurde — Dorsten lieferte
auf `/suche?q=` byte-identisch dieselbe Seite wie auf einen Unsinns-Suchbegriff.

**Was stattdessen funktioniert — zwei Wege, die sich ergänzen:**

1. **`schema.org`-`SearchAction`** im Quelltext der Startseite. Der Standard ist
   genau dafür da und deklariert die Such-Adresse als Vorlage
   (`https://…/?q={search_term_string}`).
2. **Das Suchformular im HTML lesen** — `action` plus Name des Textfelds.

Gemessen an 20 Gemeinde-Websites (`/tmp/streng.py`): **7 von 20 = 35 %**
liefern echte Treffer im sichtbaren Text. Entscheidend: Die beiden Wege greifen
**abwechselnd** — Harsewinkel und Garbsen kamen über `schema.org`, Iserlohn,
Aalen, Dorsten, Herten und Bielefeld über das Formular.

**Diese 35 % sind eine Korrektur meiner eigenen ersten Messung, die 55 % ergab.**
Der Fehler ist lehrreich genug, um ihn festzuhalten: Das erste Kriterium
(„Antwort unterscheidet sich vom Unsinns-Begriff **und** Suchwort kommt mehrfach
vor") zählte **Seitenblätter-Links** als Treffer. Borgholzhausen etwa liefert
`?q=Photovoltaik&page=2…4` in der Blätter-Navigation — fünf Vorkommen des
Suchworts, kein einziges Ergebnis im Text. Die Suche **hat** dort gearbeitet
(vier Ergebnisseiten), nur baut erst JavaScript die Liste auf.

**Das strenge Kriterium** zählt deshalb nur im *sichtbaren* Text (Skripte,
Stile und Attribute entfernt) und verlangt mindestens drei Vorkommen mehr als
bei der Unsinns-Abfrage.

### Wo die Grenze liegt

Die übrigen 13 der 20 Seiten (Karlsruhe, Minden, Flensburg, Aachen, Gelsenkirchen,
Borgholzhausen, Steinhagen …) haben eine funktionierende Suche, liefern per HTTP
aber nur die Suchmaske — die Trefferliste baut erst JavaScript auf. Solche Seiten
brauchen einen rendernden Browser; bei 9.700 Gemeinden ist das teuer, aber nicht
unmöglich (der Förder-Wächter nutzt diese Stufe bereits für geblockte Träger).

**35 % ist also die Obergrenze des billigen Wegs, nicht der Suche insgesamt.**
Die Rechnung bleibt trotzdem klar zugunsten der Suche:

| | heute (Link-Crawl) | CMS-Suche, billiger Weg |
|---|---|---|
| erreichte Gemeinden | 1.303 von 9.722 = **13 %** | rund **35 %**, also ~3.400 |

Grob das **Dreifache** — und zwar bei Gemeinden, die der Link-Crawl strukturell
nicht sieht, weil ihre Förderseite nicht binnen zwei Klicks verlinkt ist. Mit
rendernder Stufe für den Rest wäre der Großteil der 9.700 erreichbar.

**Drei Fallen, jede gemessen:**
1. **HTTP 200 ist kein Beleg.** Dorsten lieferte auf `/suche?q=` byte-identisch
   dieselbe Seite wie auf einen Unsinns-Begriff.
2. **Ein Vorkommen des Suchworts ist kein Beleg** — meist nur das
   zurückgespiegelte Eingabefeld (so bei Karlsruhe, Minden, Flensburg).
3. **Mehrere Vorkommen sind auch noch kein Beleg**, wenn sie aus der
   Blätter-Navigation stammen. Nur im sichtbaren Text zählen.

## Rechtslage (zwei Legal-Judges, 19.08.2026 — der zweite widerlegt den ersten)

**Der wichtigste Satz zuerst — für unser eigenes Crawlen:** Gemeinden sind
öffentliche Stellen nach § 3 Nr. 1 DNG, und **§ 2 Abs. 5 DNG** verbietet
öffentlichen Stellen ausdrücklich, sich auf § 87b UrhG zu berufen. Das Crawlen
der ~9.700 Gemeinde-Websites ist von dieser Seite **rechtlich unproblematisch**.
Dasselbe gilt für die Förderdatenbank des Bundes.

**Für die privaten Portale gilt das Gegenteil, und zwar schärfer als erwartet.**
Die beiden EuGH-Urteile, die man reflexhaft zur Entlastung zitiert
(C-203/02 *British Horseracing* Rn. 31, C-338/02 *Fixtures Marketing*), sprechen
hier **für** den Schutz: Dort scheiterte er, weil die Kläger die Daten selbst
*erzeugt* hatten. Die Portale erzeugen die Förderprogramme nicht — die Kommunen
tun das. Was die Portale leisten, ist genau das vom EuGH als schutzwürdig
Benannte: vorhandene, verstreute Elemente **auffinden und zusammenstellen**.

**Die Einzelinformation ist frei** (Erwägungsgrund 46 RL 96/9/EG): „Gemeinde X
hat ein Programm, hier ist der Amtslink" ist als solche nicht schutzfähig —
keine Schöpfungshöhe, kein Schutz am Einzelelement. Geschützt wäre allein die
Entnahme eines **wesentlichen Teils der Sammlung**.

**Und genau da liegt das Problem:** Ein Vollabzug aller Ortsname-URL-Paare ist
quantitativ wesentlich (100 % der Datensätze — der EuGH stellt auf den
Datensatzanteil ab, nicht auf die Feldzahl) **und** qualitativ wesentlich, weil
die Rechercheinvestition des Portals fast vollständig in genau dieser
Information steckt. Die Beschränkung auf zwei Spalten hilft weniger, als sie
intuitiv scheint. Auch Abschreiben von Hand ist nicht privilegiert
(EuGH C-304/07 *Directmedia*) — es senkt nur Volumen und Systematik.

**Nutzungsbedingungen der Portale sind irrelevant** — ohne Vertragsschluss keine
Einbeziehung (§ 305 Abs. 2 BGB); der BGH verneinte eine unlautere Behinderung
sogar bei *angenommenen* Bedingungen (I ZR 224/12, Flugvermittlung im Internet).
Das nützt aber nichts: § 87b gilt **ex lege**, unabhängig von jeder Zustimmung.

**Gemessen, nicht vermutet:** Weder co2online.de noch foerderregister.de führen
einen maschinenlesbaren TDM-Vorbehalt (robots.txt geprüft, `/.well-known/
tdmrep.json` beidseitig 404). Das eröffnet § 44b i.V.m. § 87c Abs. 1 Nr. 4 UrhG
(Text und Data Mining) als Argument — ob das dauerhafte Behalten der
Ergebnisliste davon gedeckt ist, ist allerdings ungeklärt.

### Der Fund, der die Entscheidung trägt

`foerderregister.de/api/dataset` ist per robots.txt ausdrücklich freigegeben
(`Allow: /api/dataset`) und liefert **680 Kandidaten, 500 geprüfte Quellseiten,
mit AGS-Schlüssel und Postleitzahlen** — also genau unser Datenmodell.

**Er trägt aber selbst die Kennzeichnung `"license":"internal-planning-dataset"`.**
Eine robots-Freigabe ist eine Crawl-Erlaubnis, keine Nutzungslizenz, und das
Label sagt ausdrücklich das Gegenteil. **Deshalb wurde er nicht abgezogen** —
nur der Metadaten-Kopf wurde gelesen, um den Lizenzstand zu belegen.

Das macht die Anfrage beim Betreiber zur mit Abstand lohnendsten Handlung: Die
Schnittstelle ist fertig, sie kostet ihn nichts, und sie brächte ihm einen Link.

### Wo die beiden Prüfer auseinandergehen

Der erste hielt einen einmaligen, auf zwei Felder beschränkten Abzug für einen
vertretbaren Graubereich. **Der adversariale Gegenprüfer widerlegt das**, und
seine Fundstellen sind die spezifischeren:

1. **Ein Abzug über `/api/dataset` ist gar keine Teil-Frage.** Er entnimmt „die
   Datenbank insgesamt" — § 87b Abs. 1 S. 1 **Alt. 1**. Die ganze
   Wesentlichkeits-Dogmatik ist der Prüfpunkt für *Teile* und wird hier nicht
   mehr gebraucht.
2. **Gerade die Auswahl ist bei diesen Portalen die vollständige Investition.**
   Beträge und Fristen stehen ohnehin bei der Kommune; die Arbeit besteht
   ausschließlich darin, unter 11.000 Gemeinden die mit Programm zu finden.
   Wer Ortsname + Amtslink nimmt, nimmt **100 % des Investitionsergebnisses**
   und lässt zurück, was nichts gekostet hat. „Wir nehmen ja nur zwei Spalten"
   beschreibt den Vorwurf, es widerlegt ihn nicht (EuGH C-203/02;
   BGH I ZR 159/10 *Automobil-Onlinebörse*: ob sich „gerade in diesem Teil ein
   wesentlicher Teil der Investition verkörpert").
3. **Wiederkehrende Abgleichläufe lösen § 87b Abs. 1 S. 2 aus** — ihr Zweck ist
   die fortlaufende Deckungsgleichheit mit fremdem Bestand, also genau die
   „Wiedererstellung", die der BGH als Grenze zieht. Die Schwelle ist nicht eine
   Zahl von Abrufen: **ab dem zweiten geplanten Lauf** ist „gelegentlich" nicht
   mehr haltbar.
4. **„Wir sind kostenlos" ist keine Verteidigung.** BGH I ZR 154/16
   *Werbeblocker II*: Unentgeltlichkeit einzelner Angebote ist unerheblich,
   sofern sie die gewerbliche Tätigkeit fördern. Wir sind damit Mitbewerber —
   und **beide Portale wären nach § 8 Abs. 3 UWG selbst abmahnbefugt**, anders
   als die Kommunen im Outreach-Fall.
5. **Das Risikoprofil ist asymmetrisch.** co2online ist gemeinnützig und lebt von
   Verbreitung — eine Abmahnung liefe ihrem Zweck zuwider. foerderregister ist
   ein Einzelunternehmer, der über Leads verdient (`Disallow: /api/leads/`) und
   einen direkten Konkurrenten vor sich hätte. Das ist das Profil, das abmahnt.
   Der Schaden wäre nicht die Kostennote, sondern ein Unterlassungstitel, der
   den ganzen Förder-Arbeitsablauf einschnürt.

**Nicht tragfähig** (der Gegenprüfer sagt es selbst): § 4 Nr. 3 und Nr. 4 UWG
(BGH I ZR 224/12 und *Automobil-Onlinebörse* verschließen die Behinderung,
solange keine technische Sperre umgangen wird — die `robots.txt` erlaubt den
Pfad sogar), Vertrag/virtuelles Hausrecht/§ 823/§ 1004 (kein Vertragsschluss,
§ 87b ist die Spezialregelung; *Ryanair* C-30/14 mangels Vertrag nicht
einschlägig), und co2onlines Impressum-Satz („Nachdruck nur mit schriftlicher
Genehmigung") als maschinenlesbarer TDM-Vorbehalt (LG Hamburg 310 O 227/23 hat
einen in natürlicher Sprache formulierten Vorbehalt gerade nicht genügen lassen).

**Eine Korrektur an meiner eigenen Fragestellung:** Ich hatte
BGH I ZR 224/17 als „Davidoff" für Screen-Scraping angeführt. Falsch — das ist
ein Zuständigkeitsbeschluss vom 31.10.2018; die Scraping-Entscheidung ist
**I ZR 224/12 „Flugvermittlung im Internet"** (30.04.2014). Der Gegenprüfer hat
das gefunden. Eine Fundstelle aus dem Gedächtnis ist unbelegt, auch wenn sie
konkret klingt.

### Was daraus folgt — worin beide Prüfer übereinstimmen

| | |
|---|---|
| Eigenes Crawlen der Amtsseiten | **sicher** (§ 2 Abs. 5 DNG) |
| Förderdatenbank des Bundes | **sicher** — enthält aber keine Kommunen |
| Portalseiten einmalig als **Suchanstoß** sichten, Fundstelle selbst ermitteln | **vertretbar** |
| Automatischer Vollabzug beider Portale | **unterlassen** |
| `api/dataset` nutzen | **unterlassen** — § 87b Abs. 1 S. 1 Alt. 1, ausdrücklich nicht lizenziert |
| Eingerichtete Wiederholungsläufe zum Abgleich | **unterlassen** — § 87b Abs. 1 S. 2 |
| Beträge, Fristen, Status übernehmen | **unterlassen** |
| Prüfdaten von foerderregister übernehmen | **unterlassen** — bricht zusätzlich unsere eigene BLOCKER-Regel |
| Betreiber um Erlaubnis fragen | **der saubere Weg** |

**Konsistenz-Argument, das schwerer wiegt als das Haftungsrisiko:** Wir
beanspruchen auf `/lizenz` für unsere eigene Förderdatenbank ein
Datenbankherstellerrecht. Wer das tut und zugleich bei anderen abzieht, kann
beides nicht gleichzeitig ernst meinen.


## Nachtrag: Wie groß ist der Zugewinn wirklich? (gemessen gegen die eigene DB)

Die erste Zahl („148 neue Gemeinden") war gegen den **Katalog** gerechnet — also
gegen die 99 fertigen Programme. Das ist der falsche Maßstab: Zwischen Katalog
und Nichts liegt unsere eigene Suche, die längst 2.561 Förderseiten gefunden hat.
Richtig gemessen gegen das Gemeindeverzeichnis (11.219 Einträge):

| Portal-Kandidaten (184, ohne Bund/Land/Versorger) | |
|---|---|
| Förderseite kennen wir schon | ein großer Teil |
| **echte Lücke: Seite bei uns unbekannt** | **68** |
| davon nur noch in der Warteschlange | **0** |

**Die 68 sind echte Fehlgriffe unserer Suche, kein Rückstand.** Alle 68 wurden
vom Suchlauf bereits abgearbeitet: 66 mit dem Ergebnis „keine Seite gefunden",
2 „unerreichbar". Das war die entscheidende Gegenprobe — wäre der Rückstand die
Erklärung gewesen, hätte sich die ganze Frage erledigt.

### Und die verbesserte Suche? Sie schließt diese Lücke NICHT

Dieselbe strenge Messung auf genau die 68 Lücken-Websites angewandt:
**12 von 68 = 18 %** — gegenüber 35 % auf einer allgemeinen Stichprobe.

**Der Grund ist dieselbe Ursache auf beiden Seiten:** Gemeinden, deren Förderseite
der Link-Crawler nicht findet, bauen ihre Seite überwiegend per JavaScript auf —
und genau diese Seiten liefern auch ihre Trefferliste erst per JavaScript. Die
Lücke des Crawlers und die Lücke der billigen Suche sind **dieselbe Menge**.
Wer die eine schließen will, braucht die rendernde Browser-Stufe, die wir für
geblockte Träger ohnehin schon einsetzen.

### Folge für die Entscheidung

Die Portale decken rund **56 Gemeinden** auf, die weder unser heutiger Crawl noch
die billige Suchverbesserung finden würde. Das ist wertvoll — aber es sind 68
Namen, also eine Nachmittagsaufgabe von Hand, und genau diese Nutzungsform
(einmal ansehen, Ort notieren, Fundstelle selbst ermitteln) haben **beide**
Legal-Judges als vertretbar bezeichnet. **Damit entfällt der Grund für eine
Anfrage:** Erlaubnis bräuchte nur ein laufender automatischer Abgleich — und der
ist der Teil, den beide Prüfer klar untersagen (§ 87b Abs. 1 S. 2).
