# Wettbewerb in Europa: Bestandsatlas und Rentabilitätsrechner

**Erhebungsdatum: 23.09.2026.** Alles, was hier steht, trägt eine Herkunftsmarkierung:

- **[GEPRÜFT]** — die Seite wurde in dieser Sitzung selbst aufgerufen, das Beschriebene selbst gesehen.
- **[UNGEPRÜFT]** — nur in Suchergebnissen, Fremdartikeln oder Anbieter-Marketing gelesen. Gilt als unbelegt.
- **[ABRUF GESCHEITERT]** — Seite existiert, war aber nicht lesbar (Grund jeweils genannt). Das ist **kein** Beleg für Nichtexistenz.

„Kostenlos“ steht nur dort, wo ein Ergebnis **ohne Mailadresse** wirklich gesehen wurde.

---

## Methodische Grenze, die für das ganze Dokument gilt

Die Frage „rankt der Anbieter bei Suchanfragen?“ ist hier nur eingeschränkt beantwortbar: Die
verfügbare Suche ist **US-indexiert**. Englischsprachige Verbraucherabfragen lassen sich damit
prüfen, landessprachliche Abfragen („zonnepanelen gemeente …“, „ile paneli w gminie …“) nur
sehr grob. Wo unten eine Ranking-Aussage steht, ist sie so gekennzeichnet. Eine belastbare
Sichtbarkeitsmessung je Land braucht einen Rank-Tracker mit Landesindex — sie ist hier **nicht**
geleistet und darf nicht als geleistet dargestellt werden.

## Verhältnis zu den Schwesterdokumenten in diesem Ordner

Dieses Dokument beantwortet **wer schon etwas Ähnliches macht** — Atlas (Teil A) und Rechner
(Teil B). Die Frage **welche Daten es je Land überhaupt gibt** beantworten drei parallel
entstandene Dokumente, und die sind dafür maßgeblich:

- **`west-sued.md`** — Register in CH, FR, BE, NL, IT, ES, PT, AT
- **`nord-ost-uk.md`** — Register in UK, IE, DK, SE, NO, FI, PL, CZ, SK, HU, RO, GR
- **`eu-weite-quellen.md`** — ENTSO-E, Eurostat, IRENA, Ember, JRC, OSM, Satellitenerkennung, EU-Recht

Wo dieses Dokument eine Datenaussage trifft, stammt sie von dort oder ist als eigene Messung
gekennzeichnet. **An drei Stellen musste ich meine eigene, gröbere Erhebung gegen sie korrigieren;
das steht offen in Abschnitt A8.**

---

# TEIL A — Länderübergreifender Solar-Atlas / Bestandsstatistik

## Die Kurzfassung vorweg

**Einen länderübergreifenden Atlas des PV-BESTANDS auf Gemeindeebene gibt es nicht.** Was es gibt,
zerfällt in vier Gruppen, und keine davon ist, was wir in Deutschland machen:

1. **Länderaggregate** (Ember, Energy-Charts, IEA PVPS, SolarPower Europe) — eine Zahl je Land,
   für Fachpublikum.
2. **Großanlagen-Verzeichnisse** (Global Solar Power Tracker, OpenInfraMap, akademische
   Inventare) — Einzelanlage, aber erst ab 1 MW bzw. 10 kW, also **ohne den Aufdachbestand**, der
   der eigentliche Gegenstand eines Gemeindeatlas ist.
3. **Potenzialkataster** (tetraeder.solar, JRC DBSM, PVGIS) — was ein Dach könnte, nicht was
   darauf steht.
4. **Nationale Register** (CH, BE-Flandern, FR, NL, CZ, DK) — teils bis zur Einzelanlage, offen
   und kommerziell nutzbar, aber überall als **Rohdatentabelle für Fachleute**. **In keinem
   einzigen Land wurde daraus eine lesbare Ortsseite für Endverbraucher gebaut.** Die Register
   selbst stehen ausführlich in `west-sued.md` und `nord-ost-uk.md`; dieses Dokument nimmt von
   dort nur, was der Wettbewerbsbefund braucht.

Ein 2025er Fachaufsatz formuliert die Lücke ausdrücklich: es gebe „in the absence of a
comprehensive, publicly available PV capacity database at sub-national level over Europe“ keine
solche Datenbank; die Autoren konnten für 2023 nur für **150 von 333** NUTS-2-Regionen echte
(nicht modellierte) Kapazitätswerte beschaffen.
**[UNGEPRÜFT AN DER QUELLE]** — der Volltext (ScienceDirect, `S235248472500424X`) antwortete mit
HTTP 403; die Aussage stammt aus dem Suchindex-Auszug und ist vor einer Verwendung nach außen im
Original nachzulesen.

---

## A1 · OpenInfraMap — **[GEPRÜFT 23.09.2026]**

`openinframap.org` · Datenbasis OpenStreetMap (ODbL), Auswertung CC-BY.

- **Was:** Weltkarte der Infrastruktur aus OSM, mit einem Solar-Layer für Kraftwerke/Generatoren.
- **Granularität:** Einzelanlage auf der Karte; die Statistikseiten aggregieren **nur je Land**.
  `openinframap.org/stats/area/Germany` zeigt Solar als **13.436 MW in 6.628 Anlagen**
  (Stand der Seite: 23.09.2026). **Keine** Gemeindeebene.
- **Der entscheidende Befund:** Deutschlands echter Bestand liegt bei **129,9 GW DC / 118,2 GW AC**
  (Energy-Charts, siehe A4, selbst abgelesen am 23.09.2026). OpenInfraMap kennt also
  **rund ein Zehntel** davon, verteilt auf 6.628 Objekte — während das deutsche Register
  Millionen Einzelanlagen führt. Was fehlt, ist der Aufdachbestand: Einzelne Hausdächer werden in
  OpenStreetMap nicht systematisch erfasst, große Freiflächenanlagen schon.
- **Kostenlos:** ja, ohne Anmeldung. **Zielgruppe:** OSM-Mitwirkende und Infrastruktur-Interessierte,
  ausdrücklich nicht Endverbraucher („primarily intended to assist OpenStreetMap contributors“).
- **Als Wettbewerber:** nein. Andere Datenklasse, andere Zielgruppe, und für den Hausdach-Bestand
  strukturell blind.

## A2 · Global Energy Monitor — Global Solar Power Tracker — **[GEPRÜFT 23.09.2026]**

`globalenergymonitor.org/projects/global-solar-power-tracker/`

- **Was:** Anlagenscharfes Verzeichnis der **Großanlagen**; 103.940 erfasste Bauabschnitte weltweit.
- **Schwelle:** ab **1 MW**. Alles darunter läuft als „distributed solar“ und wird **nur als
  Landesaggregat** geführt, für 31 Länder/Gebiete, mit ausdrücklich ungleichmäßiger Abdeckung.
- **Granularität:** Einzelanlage (nur ≥1 MW) · Land · Region/Subregion. **Keine** Gemeindeebene.
- **Aufdach:** faktisch nein — Hausdachanlagen liegen zwei bis drei Größenordnungen unter der
  Schwelle und stecken im Landesaggregat.
- **Lizenz/Kosten:** CC BY 4.0. Die Downloadseite bezeichnet die Bestände selbst als
  „Open-access data … available for public download" **[GEPRÜFT]**; ob davor noch ein Formular
  steht, blieb offen — das Download-Element hat in meiner Sitzung nicht gerendert.
- **Zahlen von der Projektseite, selbst abgelesen:** 103.940 Bauabschnitte, 2.093 GW AC in Betrieb,
  2.247 GW geplant, **31 Länder mit verteilter Solarenergie**.
- **Aktualität:** letzte genannte Ausgabe Februar 2026.
- **Als Wettbewerber:** nein, für den Gemeindeatlas nicht verwendbar.

## A3 · Ember — Electricity Data Explorer — **[GEPRÜFT 23.09.2026]**

`ember-energy.org/data/electricity-data-explorer/`

- **Was:** Stromnachfrage, Erzeugung, Kapazität und CO₂ für 215 Länder und Gebiete.
- **Granularität:** **Land**. Sub-national nur in zwei Sonderwerkzeugen (China nach Provinz,
  Indien nach Bundesstaat) — **nichts für Europa unterhalb der Landesebene**.
- **Aufdach vs. Freifläche:** wird im Haupt-Explorer nicht getrennt ausgewiesen.
- **Kostenlos:** ja, CC BY 4.0, mit Download und API. Monatliche Aktualisierung.
- **Zielgruppe:** Analyse und Fachpublikum.
- **Als Wettbewerber:** nein. Ember ist eher eine **mögliche Quelle** für Landeskennzahlen als ein
  Konkurrent. Wir benutzen ihre Reihen bereits für die Ländervergleichs-Charts.

## A4 · Energy-Charts (Fraunhofer ISE) — **[GEPRÜFT 23.09.2026]**

`energy-charts.info`

- **Was:** Erzeugung, Preise, Handel, Netzfrequenz **und installierte Leistung**. Selbst abgelesen:
  Deutschland 2026 mit Solar DC 129,9 GW / Solar AC 118,2 GW; Frankreich 2025 mit Solar AC
  28,25 GW. Der Länderwähler enthält unter anderem NL, FR und weitere.
- **Granularität:** **Land bzw. Gebotszone.** Keine Region, keine Gemeinde. Die installierte
  Leistung liegt je Land als eine Zahl je Technologie und Jahr vor.
- **Abdeckung:** „mehr als 40 europäische Länder und Gebotszonen“ **[UNGEPRÜFT]** (Fraunhofer-Angabe
  aus dem Suchindex; der Länderwähler war selbst sichtbar, aber nicht vollständig ausgezählt).
- **Kostenlos:** ja, ohne Anmeldung, mit API. Lizenz CC BY 4.0 je Antwort — vgl. unsere eigene
  Lizenzprüfung in `project_energy_charts_lizenz`.
- **Zielgruppe:** eher Fachpublikum, aber bedienbar.
- **Als Wettbewerber:** nein. Für Landeskennzahlen die beste kostenlose Quelle in Europa, aber
  strukturell eine Ebene über uns.

## A5 · Electricity Maps — **[TEILWEISE GEPRÜFT 23.09.2026]**

`electricitymaps.com` (Unternehmensseite gelesen) · `app.electricitymaps.com/map`
**[ABRUF GESCHEITERT — HTTP 403]**, die Kartenanwendung selbst konnte ich nicht lesen.

- **Was:** Live-CO₂-Intensität des Netzes, Prognosen, historische Netzsignale.
- **Granularität:** Zone/Gebotszone.
- **Bestandsdaten:** Auf der Produktseite ist **kein** Bestand an installierter PV-Leistung und
  **kein** Aufdach-Thema genannt. Das Produkt ist Emissions- und Handelsdaten, nicht Anlagenbestand.
- **Kosten:** Karte frei, API und Prognosen kostenpflichtig.
- **Als Wettbewerber:** nein — anderes Thema.

## A6 · SolarPower Europe — **[GEPRÜFT 23.09.2026]**

`solarpowereurope.org/insights/outlooks/eu-solar-market-outlook-2025-2030`

- **Was:** Jahresberichte mit Marktzahlen, darunter eine Durchsicht von 14 EU-Märkten im GW-Maßstab.
- **Zugang:** Der Bericht steht hinter einem **Formular mit Mailadresse, Branche und Land**; der
  Zustimmungssatz lautet wörtlich „By submitting my information, I agree to the privacy policy and
  to learn more about products and services from SolarPower Europe“. Ein Preis ist nicht genannt.
  Das ist also **Lead-Erfassung, nicht Bezahlschranke** — und damit nach unserer eigenen Definition
  **nicht „kostenlos“**.
- **Datensätze:** Die vollständigen Zahlenwerke sind laut Verbandsangabe **Mitgliedern
  vorbehalten** **[UNGEPRÜFT]** (Suchindex-Auszug, nicht im Mitgliederbereich nachgeprüft).
- **Granularität:** Land. Keine Gemeinde, keine Region.
- **Als Wettbewerber:** nein, aber als Datenquelle für einen Ländervergleich wegen der
  Mailadressen-Hürde und der Mitgliedsbindung **unattraktiv**.

## A7 · IEA PVPS Snapshot — **[GEPRÜFT 23.09.2026]**

`iea-pvps.org/snapshot-reports/`

- **Was:** jährlicher Schnappschuss des weltweiten PV-Markts, seit 2013, aktuell Ausgabe 2026.
- **Zugang:** Auf der Seite steht ausdrücklich „You may download the report without submitting
  responses“ — der Fragebogen ist also überspringbar. **[UNGEPRÜFT]** ob die PDF-Datei danach
  wirklich ohne weitere Hürde kommt; den Download selbst habe ich nicht ausgeführt.
- **Granularität:** Land. Sub-nationales wird nicht angeboten.
- **Als Wettbewerber:** nein; als Querprüfung für Landeszahlen brauchbar.

## A8 · Nationale Register — **steht ausführlich in den Schwesterdokumenten, nicht hier**

Während dieser Recherche entstanden in diesem Ordner parallel drei Dokumente, die genau diese
Frage tiefer beantworten, als ich es nebenbei könnte:

- **`west-sued.md`** — CH, FR, BE (Flandern/Wallonie/Brüssel), NL, IT, ES, PT, AT
- **`nord-ost-uk.md`** — UK, IE, DK, SE, NO, FI, PL, CZ, SK, HU, RO, GR
- **`eu-weite-quellen.md`** — ENTSO-E, Eurostat, IRENA, Ember, JRC, OSM, Satellitenerkennung, EU-Recht

**Maßgeblich sind diese drei.** Was unten steht, ist nur so viel, wie der Wettbewerbsbefund
braucht — und an drei Stellen musste ich meine eigene, gröbere Erhebung gegen sie korrigieren.
Das ist in beide Richtungen wichtig: Zwei Dokumente im selben Ordner, die dieselbe Größe
verschieden angeben, sind schlimmer als eines.

**Die drei Korrekturen an meiner eigenen Erhebung:**

1. **Flandern hat Einzelanlagen, nicht nur Gemeindesummen.** Ich hatte den Fluvius-Datensatz
   *Lokale productie-installaties per gemeente* geprüft (Spalten Peildatum · DNB · Hoofdgemeente ·
   Technologie · Aantal installaties · Geïnstalleerd vermogen) und daraus auf ein Aggregat
   geschlossen. `west-sued.md` weist daneben **1.110.420 PV-Einzelanlagen** nach, je Zeile mit
   Postleitzahl, Inbetriebnahmejahr und Leistung, täglich aktualisiert, kommerzielle Nutzung
   ausdrücklich erlaubt — **einschließlich Steckersolar als eigener Kategorie.**
2. **Frankreich ist feiner und zugleich stumpfer, als ich es dargestellt habe.** Einzelanlagen
   gibt es **ab 36 kW**; darunter — also bei praktisch jeder privaten Aufdachanlage — genau
   **eine Zeile je Gemeinde ohne Zeitachse**. Mein Befund „Anlagenzahl und Produktion je Gemeinde"
   stimmt, aber ein „Zubau 2025 in Ihrer Gemeinde" ist daraus **nicht** ableitbar.
3. **Die Schweiz ist belegt, mein Aktualitätszweifel war unbegründet.** Ich hatte auf
   opendata.swiss als letzte Änderung den 13.01.2021 gelesen und das als offenen Widerspruch
   vermerkt. `west-sued.md` weist **339.499 Anlagen (davon 337.455 PV)** mit Adresse, Gemeinde,
   Koordinaten und **taggenauem Inbetriebnahmedatum** nach, Datei vom **14.09.2026**, monatlich,
   kommerziell frei gegen Quellenangabe. Das Katalogdatum war eine Metadaten-Angabe, kein Datenstand.

**Was für den Wettbewerbsbefund davon zählt** — und nur das gehört in dieses Dokument:

| Land | Feinste offene Ebene | Für einen Bestandsatlas brauchbar? |
|---|---|---|
| **Schweiz** | Einzelanlage mit Adresse und Tagesdatum | **Ja, unverändert übertragbar** |
| **Flandern** | Einzelanlage mit PLZ und Inbetriebnahmejahr | **Ja** (ohne Adresse und Monat) |
| **Frankreich** | ab 36 kW Einzelanlage; darunter Gemeindesumme ohne Jahr | **Teilweise** — kein Zubau je Gemeinde |
| **Niederlande** | Gemeinde (361), Jahresbestände ohne Inbetriebnahmedatum | **Teilweise** |
| **Wallonien** | Jahresbestände je Ortschaft | Teilweise |
| **Italien** | Gemeindeaggregate, Atlas **offline**, kommerzielle Nutzung **untersagt** | **Nein** |

### Was ich zusätzlich selbst gesehen habe

**Italien, GSE Atlaimpianti — [GEPRÜFT 23.09.2026]: der Atlas ist OFFLINE.** Auf
`gse.it/dati-e-scenari/atlaimpianti` steht selbst gelesen, das System sei „currently unavailable
as it is being updated"; `atla.gse.it` löste nicht auf (DNS). Der Ersatz ist ein **PDF-Jahresbericht**
mit Region als feinster genannter Gliederung. Und die GSE-Seite trägt **CC BY-NC-SA 3.0 Italien** —
**nicht-kommerziell**, für eine Seite mit Provisionslinks also keine Grundlage. Das deckt sich mit
dem schärferen Befund in `west-sued.md` („Non è […] consentito commercializzare […] per fini di
lucro").

**Niederlande, Regionale Klimaatmonitor — [GEPRÜFT 23.09.2026]:** `klimaatmonitor.databank.nl` ist
eine Seite der niederländischen Regierung, **ohne Anmeldung erreichbar**, mit Dashboard, Viewer und
API, voreingestellt auf eine einzelne Gemeinde. **Zielgruppe ist ausdrücklich die Verwaltung**
(„helpt bij het maken en sturen van beleid" für „decentrale overheden"), nicht der Bürger. Den
Solarbereich selbst habe ich nicht geöffnet; `/dashboard/dashboard/zonnestroom` antwortete mit
„pagina niet gevonden".

**Niederlande, CBS StatLine 85005NED — [GEPRÜFT 23.09.2026]:** Anzahl der Anlagen, installierte
Modulleistung, Wechselrichterleistung und Erzeugung, aufteilbar bis auf die **Gemeinde** (die
Erzeugungszahl nur bis zur Sub-RES-Ebene). Frei ohne Anmeldung, CSV, StatLine, offene Daten und API.
Die Vorgängertabelle 84783NED ist **eingestellt** — wer alte Reihen nutzt, greift ins Leere.

**Frankreich, Enedis Open Data — [GEPRÜFT 23.09.2026]:** Der Gemeinde-Datensatz
*Production d'électricité annuelle par filière à la maille commune* hat **222.192 Datensätze**,
Lizenz **Licence Ouverte 2.0**, Tabelle, API und Download ohne Anmeldung, jährlich fortgeschrieben,
zuletzt 10.10.2025. Es gibt dieselbe Reihe auf **IRIS**-Ebene, also **unterhalb** der Gemeinde.
Einen Datensatz „parc … par commune" (installierte Leistung je Gemeinde) gibt es unter dem
naheliegenden Namen **nicht** (404); den „parc"-Satz gibt es auf Departements- und Regionsebene.

## A9 · Niederländische Verbraucher-Karten (die einzige echte Vorbesetzung)

### zonnepanelenkaart.com — **[GEPRÜFT 23.09.2026]**

- Erkennt **tatsächlich verbaute Module** per KI aus Luftbildern mit 7 cm Auflösung, nicht aus einem
  Register („wij bepalen zelf exact hoeveel panelen er op elk dak liggen“, ausdrücklich gegen
  „verouderde registraties“ gerichtet).
- Granularität: **einzelnes Gebäude und Adresse**, dazu Aggregate je Viertel/Quartier/Gemeinde mit
  Anteilswerten und Download.
- **Nicht frei:** Zugang über Registrierung mit **20 Gratis-Credits im Monat**, ohne Kreditkarte.
  Also ein Freemium-Konto, kein offenes Nachschlagewerk. Privatfirma aus Utrecht.

### NEO / Terramira — **[GEPRÜFT 23.09.2026]**

- Satelliten- und KI-Erkennung von Solarmodulen, Granularität Adresse/Gebäude/Viertel/Gemeinde,
  Aktualisierung mehrmals jährlich, API und GIS-Anbindung.
- **Rein kommerziell**, Kunden sind Behörden und Netzbetreiber; **kein öffentlicher Viewer**,
  Zugang über Verkaufsgespräch. Nur Niederlande.

### zonopkaart.nl — **[GEPRÜFT 23.09.2026]**

- Betreiber ROM3D. **Frei ohne Anmeldung.** Zeigt **nur Solarparks** (Freifläche und schwimmend),
  ausdrücklich **ohne Dachanlagen**; 7.765 MW erfasst, Stand 01.07.2026, Quelle überwiegend
  RVO-Förderanträge (SDE).
- Granularität Gemeinde und Provinz — mit der offen genannten Einschränkung, dass geplante Parks
  mangels bekanntem Standort am Sitz des Antragstellers oder im Gemeindemittelpunkt verortet werden.

**Was das für uns heißt:** Die Niederlande sind die **einzige** der geprüften Nationen, in der die
Atlas-Idee bereits mehrfach besetzt ist — allerdings aufgeteilt: die freie Karte kann keine
Dächer, die Dächer-Karte ist nicht frei, und die offenen Gemeindezahlen von CBS hat noch niemand
in lesbare Ortsseiten übersetzt.

## A10 · Potenzialkataster (abzugrenzen, kein Bestandsatlas)

### tetraeder.solar — **[GEPRÜFT 23.09.2026]**

- Eigene Angabe: **12 Länder**, über **135 Millionen Gebäude**, über **1.500 deutsche Kommunen**.
  Produkte sind Solar- und Gründach-**Potenzial**kataster, Freiflächen-Spotter, Ladesäulenplanung.
- Kunden sind Kommunen, Planungsbüros, Klimaagenturen, Solarfirmen. Preise nicht öffentlich.
- **Abgrenzung, die man nicht verwischen darf:** Ein Solarkataster sagt, **was ein Dach könnte**.
  Unser Atlas sagt, **was tatsächlich steht**. Das sind verschiedene Fragen, verschiedene Daten
  und verschiedene Suchanfragen. tetraeder ist damit **kein** Wettbewerber unseres Atlas — wohl
  aber der etablierte Anbieter, falls wir je in Richtung Kataster gingen.

### JRC European Digital Building Stock Model (DBSM R2025) — **[GEPRÜFT 23.09.2026]**

- 271 Millionen Gebäude in der EU, gebäudescharf, offen im JRC-Datenkatalog, Code veröffentlicht.
- **Potenzial, nicht Bestand.** Die JRC-Meldung nennt beiläufig die für uns interessanteste Zahl:
  derzeit trügen **rund 10 %** der europäischen Gebäudedächer eine PV-Anlage.
- **Kein Bürger-Viewer** genannt; es ist ein Datensatz für Planung und Forschung.

### PVGIS (EU-Kommission, JRC) — **[GEPRÜFT indirekt, siehe Teil B]**

Europaweit, kostenlos, mit API — liefert **Ertrag in kWh**, keine Wirtschaftlichkeit, keinen
Eigenverbrauch, keine Strompreise, keine Förderung und keinen Anlagenbestand. Wir benutzen PVGIS
selbst als Ertragsquelle. Es ist die Grundlage fast aller europäischen Rechner (siehe Teil B).

## A10b · Solantiq „Solar-Ertrags-Atlas 2026" — der einzige Ortsseiten-Wettbewerber im DACH-Raum

**[GEPRÜFT 23.09.2026]** `solantiq.com/staedte`

- **165 Städte** in Deutschland (113), Österreich (26) und der Schweiz (26), mit Rangliste,
  Kennzahlen-Kacheln und einer Auswertung je Stadt. Datenbasis PVGIS, Stand Juni 2026.
- **Das ist unser Seitenformat, aber die andere Größe:** Es rankt den **spezifischen Ertrag**
  (kWh/kWp, Süd, 35°), nicht den **Anlagenbestand**. Also „wie viel bringt ein Dach hier“, nicht
  „wie viele Dächer sind hier schon belegt“.
- **Warum das trotzdem zählt:** Für Österreich und die Schweiz ist damit das Muster
  „Stadtseite mit Rangliste“ bereits von einem Anbieter besetzt, der denselben Rechner daneben
  stellt. Wer dort mit einem Bestandsatlas einsteigt, trifft auf eine vorhandene, gepflegte
  Seitenfamilie — inhaltlich verschieden, in der Suchergebnisliste aber benachbart.

## A11 · Akademische Karten

- **Kruitwagen et al. 2021 (Nature)** — globales Inventar von **68.661** PV-Anlagen aus
  Satellitenbildern, Schwelle **ab 10 kW**, also gewerblich/industriell/Freifläche. Datenbestand
  **2016–2018**, Code und Daten offen auf GitHub/Zenodo. **Ein Schnappschuss, keine laufende Quelle.**
  **[UNGEPRÜFT an der Primärquelle]** — Angaben aus Abstract-/Repository-Auszügen.
- **Dunnett et al. 2020 (Scientific Data)** — harmonisierter globaler Datensatz von Wind- und
  Solar-„Farmen“ aus OpenStreetMap. **[ABRUF GESCHEITERT]** — nature.com leitete auf eine
  Anmeldeseite um; Inhalt nicht selbst gelesen.
- **Regionale PV-Kapazität in Europa (2025, ScienceDirect)** — modelliert NUTS-2-Kapazitäten, weil
  es die Messdaten nicht gibt (siehe Kurzfassung oben). **[ABRUF GESCHEITERT — HTTP 403]**.

Gemeinsam ist allen dreien: **Momentaufnahme statt laufender Datenstand**, und **Großanlagen statt
Hausdächer**. Genau die beiden Eigenschaften, mit denen unser Atlas in Deutschland punktet
(monatlicher Registerauszug, jede Anlage ab dem Balkonkraftwerk), fehlen dort.

## A12 · Was eine Verbraucherabfrage heute zurückgibt — **[GEPRÜFT 23.09.2026, US-Index]**

Auf die englische Abfrage nach der Anzahl installierter PV-Anlagen je Gemeinde in Europa liefert
der Index **keine einzige Bestands-Seite auf Gemeindeebene**. Zurück kommen: PVGIS (Potenzial),
das JRC-Gebäudemodell (Potenzial), die Agrisolar-Karte von SolarPower Europe (200 Projekte),
die EU-Solar-Manufacturing-Karte (Fabriken) und der Wikipedia-Artikel.

Das ist ein Indiz, kein Beweis — der Index ist US-basiert und landessprachliche Abfragen fehlen.
Aber es deckt sich mit dem, was die Anbieterprüfung oben ergeben hat.

---

# TEIL B — PV-Rentabilitätsrechner in anderen europäischen Ländern

## B0 · Die paneuropäischen Anbieter (aus einer Codebasis für mehrere Länder)

Das ist die Frage, die über die ganze Idee entscheidet: Bedient schon jemand mehrere Länder aus
einem System? **Die Antwort ist ja — aber jeder, der es tut, gibt dabei etwas Entscheidendes auf.**

### eu-solarcalculator.com — **[SELBST BEDIENT 23.09.2026]**

Der breiteste kostenlose Ortsseiten-Rechner, den ich gefunden habe: **6.328 europäische Städte**
in 30 Ländern, Datenbasis PVGIS v5.3, Strompreise aus Eurostat `nrg_pc_204` H1 2025. Kostenlos,
keine Anmeldung, Ergebnis sofort. Je Stadt eine eigene Adresse (`/netherlands/amsterdam`), dazu
Vergleichsseiten und ein Ranking — **strukturell genau unser Seitenformat**.

**Und er ist im Kern falsch.** Selbst abgelesen für Amsterdam, 5 kWp, ohne Speicher:

| Was dort steht | Wert |
|---|---|
| Jahresertrag | 5.132 kWh |
| „Self-consumed (**100 %** of 5.132 kWh)" | 5.132 kWh × 0,280 €/kWh = **1.437 €** |
| „Injected to grid (**0 %** of production)" | 0 kWh × 0,070 €/kWh = **0 €** |
| Amortisation | **3,8 Jahre** |
| 25 Jahre | 43.490 € |

Die Voreinstellung „Without Battery" ist dort wörtlich mit „**~100 % self-consumption**"
beschriftet. Ein Haushalt ohne Speicher erreicht real etwa ein Drittel. Der Rechner fragt **den
Stromverbrauch überhaupt nicht ab** — er kann den Eigenverbrauch also gar nicht kennen und bewertet
stattdessen **jede erzeugte Kilowattstunde zum Haushaltsstrompreis**. Das ist kein Schätzfehler,
sondern eine Größenordnung: Die ausgewiesene Amortisation von 3,8 Jahren ist etwa dreimal zu kurz.

Bemerkenswert daneben: Die Seite **kennt** das Problem, sie rechnet es nur nicht. Unter dem
Ergebnis steht ein zutreffender Hinweis, dass die niederländische Saldierung zum **01.01.2027**
endet und Überschüsse danach mit rund 5–10 ct vergütet werden.

**Wer dahintersteckt, ist nicht feststellbar.** Selbst im Quelltext nachgesehen: Es gibt
**kein Impressum, keine Firma, keine Kontaktadresse** — nur Privacy, Terms und Disclaimer. Keine
Provisionslinks, keine Werbeskripte. Gehostet als Next.js-Anwendung. Das ist eine anonyme,
frisch gebaute Seitenfamilie ohne erkennbares Geschäftsmodell.

### TrackMyEnergy — **[SELBST BEDIENT 23.09.2026]**

`trackmyenergy.net/solar` · **19 europäische Länder**, kostenlos, ohne Anmeldung.

Fragt: Anlagengröße (Schieber 1–20 kWp) · Installationskosten (Voreinstellung **1.200 €/kWp für
alle Länder**) · Jahresverbrauch · **Eigenverbrauchsquote als Schieber** · Strompreis · Land.
Gibt aus: Jahresertrag, Ersparnis, Amortisation, 25-Jahres-Ergebnis, CO₂.

Drei Mängel, alle selbst am deutschen Rechner abgelesen:

1. **Ein einziger Ertragswert je Land.** Deutschland: 1.000 kWh/kWp — für Flensburg wie für
   Freiburg. Es gibt kein Standortfeld.
2. **Dieselbe Autarkie-Falle wie oben, nur anders verpackt.** Voreinstellung 70 % Eigenverbrauch
   bei 3.500 kWh Verbrauch ergibt „Self-consumed 3.500 kWh" und darunter die Kachel
   „**Solar Self-Sufficiency 100 %**". Ein Haushalt, der im Dezember nachts Strom braucht, ist
   nicht zu 100 % autark. **Die Seite widerspricht sich dabei selbst:** Ihr eigener Fließtext
   darunter schreibt, ein Haushalt ohne Speicher erreiche 30–40 %.
3. **Die 25-Jahres-Zahl ist eine Multiplikation.** 1.140 € × 25 − 6.000 € = 22.500 € — das ist
   exakt der ausgewiesene Wert. Also **keine Degradation, kein Strompreispfad, kein Auslaufen der
   Einspeisevergütung nach 20 Jahren.**

Dazu ein falscher Eingangswert: deutsche Einspeisevergütung mit **0,06 €/kWh** angesetzt.
Betreiber und Impressum sind auf der Seite nicht erkennbar.

### Solantiq (contexagon GmbH, Kreuzlingen/CH) — **[TEILWEISE SELBST GEPRÜFT 23.09.2026]**

Bisher führten wir Solantiq als „deutschen Anbieter für DE/AT/CH". **Beides ist zu korrigieren:**
Betreiber ist eine **Schweizer** GmbH, und die englische Fassung des Rechners hat eine
Länderauswahl mit **13 Einträgen** (AU, AT, CA, FR, DE, IN, IT, JP, NL, ES, CH, GB, US).

Der Rechner ist ohne Anmeldung voll bedienbar und fachlich der stärkste der paneuropäischen Gruppe:
mehrere Dachflächen einzeln, gradgenaue Ausrichtung, Verschattung, Speicher/Wallbox/Wärmepumpe.
**Aber die Eigenverbrauchsquote ist auch dort ein Eingabefeld** (Voreinstellung 30 %), keine
Simulation.

**Offen geblieben:** ob die Länderauswahl nur die Ertragsdaten umschaltet oder auch die
Finanzannahmen. Im Test blieben bei Auswahl „Spanien" Strompreis und Einspeisevergütung deutsch
(35 ct, 7,78 ct mit dem Hinweis „EEG 2024"). Eine spanische Postleitzahl ließ sich nicht
auflösen. **Das ist ein gescheiterter Test, kein Befund.**

**Der wichtigste Einzelbefund, von mir unabhängig nachgeprüft:** Das White-Label-Angebot
(`solantiq.com/tools/white-label/`, Starter 49 €/Monat, Professional 149 €/Monat) hat **keinen
Kaufweg**. Die Kontaktadresse auf der Seite lautet wörtlich **`partner@solantiq.example.com`** —
`example.com` ist eine per RFC 2606 reservierte Platzhalter-Domain, dort kann niemand Post
empfangen. Und `solantiq.com/auth/register?tier=starter` liefert die **Startseite** statt einer
Registrierung. Der Anbieter, den wir bislang als einzigen direkten Wettbewerber geführt haben,
**verkauft dieses Produkt derzeit nachweislich nicht.**

Geld verdient Solantiq laut eigenem Impressum über das **CHECK24-Partnerprogramm**, also über
Tarifwechsel-Provisionen — nicht über das Widget-Abo.

### Photonik (Team hinter Clean Energy Reviews) — **[TEILWEISE GEPRÜFT 23.09.2026]**

`photonik.solar` · Länderwähler mit **über 190 Ländern**, Oberfläche auf Deutsch, Werbeversprechen
„Keine Anmeldung nötig", nach eigener Angabe über 50.000 erstellte Entwürfe und über 2.000
Installateure. Zwei Produkte: „Lite" für Hausbesitzer, „Pro" für Installateure.

**Der Ablauf, den die Seite selbst beschreibt, endet in Vermittlung:** Schritt 3 lautet
„Mit Installateuren vernetzen und Angebote vergleichen". **[ABRUF GESCHEITERT]** — der
Startknopf führte in meiner Sitzung nicht weiter, die Ergebnisseite habe ich **nicht** gesehen.
Ob vor dem Ergebnis eine Mailadresse verlangt wird, bleibt damit **ungeprüft**.

### Otovo, Selectra, Enpal, 1KOMMA5° — Vertrieb, kein Rechner

- **Otovo** (13 europäische Länder + USA): kein Rechner. Der Einstieg `otovo.de/angebot/` besteht
  aus **einem einzigen Feld — der Adresse**. Otovo verkauft selbst (ab 8.000 € Direktkauf,
  ab 55 €/Monat Mietkauf), es ist ein Marktplatz. **[UNGEPRÜFT]** ob nach der Adresse eine
  Mailadresse verlangt wird — die Adressauswahl ließ sich nicht automatisiert bedienen.
- **Selectra** (nach Sekundärquellen 16–18 Länder): Der spanische „Rechner" verlangt
  **E-Mail und Telefonnummer vor dem Ergebnis** und vermittelt an gelistete Installateure.
- **Enpal** (nur Deutschland): elf Schritte mit Fortschrittsbalken; bei 68 % verlangt er
  **Ort, Straße und Hausnummer**, bevor irgendeine Zahl erscheint. Kein Länderwähler.
- **1KOMMA5°**: **[UNGEPRÜFT]** — die Seite spricht von „Deutschland und Europa", nennt aber keine
  Länder; der Trichter wurde nicht bedient.

### Fachwerkzeuge, die hier nicht hingehören

Solargis, RatedPower, PVcase (88+ Länder) und Mapdwell (seit 2021 bei Palmetto, USA) zielen auf
Projektierer, EPC und Versorger, nicht auf Endverbraucher. Preise durchweg nicht öffentlich.
**Google Project Sunroof** ist online und ohne Abkündigungshinweis, lieferte aber auf zwei deutsche
Adressen ausschließlich US-Vorschläge — **[ABRUF GESCHEITERT]**, kein Beleg für einen Rückzug aus
Deutschland; der kommerzielle Weg läuft ohnehin über die Solar API der Google Maps Platform.

### Die Einbett-Nische

| Anbieter | Länder | Preis | Beleg |
|---|---|---|---|
| Solantiq White-Label | DACH (Rechner dahinter: 13) | 49 € / 149 € im Monat — **kein Kaufweg** | selbst geprüft |
| PVGenius (DE) | DE | 0 € / 49 € / 149 € im Monat, nach Leads gestaffelt | Seite gelesen |
| leadgenerator-solar.de | DE | Einrichtungsgebühr + Preis je Lead, keine Zahlen | Seite gelesen |
| tetraeder.solar | DE (Kataster in 12 Ländern) | nicht öffentlich | Seite gelesen |
| Solar Estimator | US, UK, CA, AU, NZ, IE, **ES**, MX, CO | Widget kostenlos, Pro-Preis nicht genannt | Seite gelesen |

**Gesucht in vier Sprachen, nicht gefunden: ein einbettbares Wirtschaftlichkeits-Widget für
mehrere europäische Länder.** Jeder gefundene Anbieter ist national, und bei jedem ist die
Lead-Weiterleitung entweder das Produkt oder das teurere Paket.

### PVGIS ist die Zutat, nicht das Produkt — **[GEPRÜFT 23.09.2026]**

`re.jrc.ec.europa.eu/pvg_tools/en/`, Version 5.3. Kostenlos, ohne Registrierung, CSV/JSON, API,
ganz Europa. Eingaben: Standort, Strahlungsdatenbank, PV-Technologie, kWp, Systemverluste in
Prozent, Montageart, Neigung und Azimut.

**Was es nicht rechnet:** keinen Haushaltsverbrauch, keinen Eigenverbrauch, keinen Strompreis,
keine Einspeisevergütung, keine Förderung, keine Amortisation. Die einzige Geldgröße sind die
**Stromgestehungskosten** je kWh aus Anlagenkosten, Zins und Laufzeit — also „was kostet mich die
eigene kWh", nicht „was spare ich". Ein Speicher kommt nur im Inselbetrieb vor.

Und es ist ein **Fachwerkzeug**: Es verlangt Systemverluste in Prozent und Azimut in Grad,
Angaben, die ein Hausbesitzer nicht hat.

**Daraus folgt der Kern von Teil B:** Der Ertragsteil ist in ganz Europa kostenlos gelöst, deshalb
hat ihn jeder. Was in jedem Land neu zu bauen und laufend zu pflegen ist — Verbrauch,
Eigenverbrauch, Tarif, Vergütungsregime, Steuer, Förderung — hat **niemand** grenzüberschreitend
gelöst. Genau daran scheitern die beiden Breitesten sichtbar: TrackMyEnergy schreibt für
Deutschland 6 ct Einspeisevergütung, wo 7,78 ct gelten, und eu-solarcalculator unterstellt
100 % Eigenverbrauch.

---

## B1 · Niederlande

### Die Rechtslage ist der ganze Punkt — **[GEPRÜFT 23.09.2026, rijksoverheid.nl]**

Die **salderingsregeling endet am 01.01.2027, ersatzlos** — kein Abschmelzpfad. Danach wird
Einspeisung vergütet, und die Vergütung muss bis 2030 mindestens **50 % des nackten Lieferpreises**
betragen, wovon Lieferanten Bearbeitungskosten abziehen dürfen. Selbstverbrauchter Strom bleibt
abgabenfrei.

**Eine kursierende Angabe ist widerlegt und darf nicht weiterverwendet werden:** „2026 gilt bereits
eine Saldierungsquote von 36 %“ stammt aus dem **2024 gescheiterten** Entwurf. Das beschlossene
Gesetz ist ein harter Schnitt.

**Was das bedeutet, steht in den Voreinstellungen des HIER-Rechners:** ab 2027 stehen 0,21 €/kWh
Bezugspreis gegen **netto 0,01 €/kWh** Einspeisevergütung. **Faktor 21.** Unter der Saldierung war
der Eigenverbrauchsanteil für die Jahresbilanz fast egal; ab dem 01.01.2027 hängt alles daran.
**Das ist das Zeitfenster: rund 100 Tage.**

### HIER Zonnepanelen-Checker (`hier.nu/zonnepanelentool`) — **[SELBST BEDIENT]**

Betreiber ist **HIER**, eine niederländische Klima-NGO; der Hauseigentümerverband Vereniging Eigen
Huis verweist seine Mitglieder dorthin. **Kostenlos ohne Lead-Erfassung — bestätigt**, das
vollständige Ergebnis war ohne Mailadresse sichtbar.

Drei Stufen: Jahresverbrauch → Panelzahl und Gesamtkosten → Ergebnis, dazu ein aufklappbarer Block
mit **editierbaren Annahmen**. Tarife getrennt nach **bis 2026** und **ab 2027**. Ausgabe:
Jahresersparnis für beide Regime, Amortisation, 25-Jahres-Summe, vollständige Rechnung mit und
ohne Anlage. Kein Standort, keine Neigung.

**Er ist der einzige im Land, der den Regimewechsel sauber abbildet — und ausgerechnet sein
Eigenverbrauch ist der schwächste Teil.** Gemessen:

| Anlage | Basis | + Geräte tagsüber | + Wärmepumpe | + Heimspeicher 5 kW |
|---|---|---|---|---|
| 10 Panele (4,35 kWp) | 26 % | 31 % | 33 % | **51 %** |
| 30 Panele (13,05 kWp) | 14 % | — | — | **39 %** |

Die Basis skaliert richtig (26 → 14 %). **Die Zuschläge nicht: Der Speicher gibt bei beiden Größen
exakt +25 Prozentpunkte.** Bei 30 Panelen wären das rund 4.300 kWh Eigenverbrauch — bei 3.500 kWh
Jahresverbrauch. Die angezeigte Quote ist nicht erreichbar, und sie **trägt die Schlagzeile**
(„Amortisation von 21 auf 11 Jahre"). Die Euro-Beträge deuten auf eine interne Deckelung hin
(ausgewiesen: 1.947 kWh Zukauf, 9.540 kWh Einspeisung ⇒ 14 %) — Anzeige und Rechnung laufen also
auseinander. In derselben Aufstellung steht zudem „68 kWh × 0,07 € = 531 €“.

### Zonnecalculator.nl — **[SELBST BEDIENT]**

Betreiber ZEMS BV, mit weichem Verweis auf einen Speicheranbieter. **Kostenlos ohne Lead-Erfassung
— bestätigt.**

Eingaben: PLZ, Wp, **Dachneigung 10–90°**, **Ausrichtung in 22,5°-Schritten**, Jahresverbrauch,
**Verbrauchsprofil** (privat mit Gaskessel / mit Wärmepumpe / vier gewerbliche). Ausgabe: Ertrag im
Mittel **und je echtem Wetterjahr** (Quellen KNMI, OpenWeatherMap), **Eigenverbrauch 31,8 % und
Autarkie 41,1 % getrennt**, mit empfohlenem Speicher 55,6 % / 69,4 %, plus Kurve über die
Speichergröße.

**Das ist die einzige niederländische Stelle, die den Eigenverbrauch wirklich rechnet** — eine
Speichergrößen-Kurve ist aus einer Jahresprozentzahl nicht ableitbar, dahinter steht ein
zeitaufgelöstes Lastprofil. Sie trennt Eigenverbrauch und Autarkie sauber, genau wie wir.
**Aber sie rechnet kein Geld:** keine Amortisation, kein Euro-Betrag, kein 2027-Regime.

### energievergelijk.nl — **[TEILWEISE BEDIENT]**

Kommerzielles Vergleichsportal, Seite ausdrücklich auf „Zonnepanelen 2027“ zugeschnitten.
Degradation 0,7 %/Jahr, Wechselrichtertausch in Jahr 12. **Der Eigenverbrauch ist ein Schieber, den
der Nutzer setzt** (Vorgabe 30 %, Spanne 15–90 %) — immerhin transparent beziffert.
**Lead-Gate nicht verifiziert:** Die Seite behauptet „zonder gegevens achter te laten“, aber die
Blöcke 3–4 mit dem persönlichen Ergebnis haben nicht gerendert; PLZ- und Hausnummernfelder liegen
im Seitengerüst.

### Negativbefunde — **[GEPRÜFT]**

- **Milieu Centraal**, die meistzitierte halbstaatliche Verbraucheraufklärung des Landes, hat
  **keinen PV-Rentabilitätsrechner**; das vollständige Werkzeugverzeichnis wurde durchgesehen.
- **Consumentenbond**: kein interaktiver Rechner; Beispielrechnung mit rund 30 % Direktverbrauch,
  Amortisation 9,3 → 16,8 Jahre durch das Saldierungsende.
- **Zonneplan** (großer Installateur, rankt vorn): kein Rechner, nur Artikel plus Angebotsanfrage.
- **Einen staatlichen Rechner gibt es nicht** — **[UNGEPRÜFT als Negativbefund]**, die Suche blieb
  ohne Treffer, das ist kein Beleg für Nichtexistenz.

> **Guter kostenloser Rechner ohne Lead-Gate? TEILWEISE.** Kostenlos und ohne Mauer: ja, mehrfach.
> Aber der einzige, der das kommende Regime abbildet, rechnet den Eigenverbrauch über starre
> Zuschläge, die bei größeren Anlagen physikalisch unmöglich werden — und der einzige, der den
> Eigenverbrauch echt rechnet, nennt keinen Euro.

## B2 · Belgien — Flandern

**Rechtslage:** Die *terugdraaiende teller* wurde am 14.01.2021 vom Verfassungsgerichtshof gekippt
**[UNGEPRÜFT, Sekundärquellen einhellig]**. Seither digitaler Zähler, getrennte Messung,
**Injektionstarif 1–7 ct/kWh** gegen den vollen Bezugspreis, und das **Kapazitätstarif** nach
monatlicher Viertelstunden-Spitze statt des Prosumententarifs.

**Strategisch der wichtigste Satz dieses Abschnitts: Flandern ist seit fünf Jahren dort, wo die
Niederlande am 01.01.2027 ankommen.** Es ist damit die beste verfügbare Vorschau darauf, was der
Regimewechsel mit dem Markt macht.

### Zonnekaart (`apps.energiesparen.be/zonnekaart`) — **[TEILWEISE BEDIENT]**

**Behördlich:** VEKA (flämische Energieagentur), Agentschap Informatie Vlaanderen und VITO
gemeinsam. Das offizielle Werkzeug.

Drei Stufen: Adresse → **„Ontwerp op uw dak"** mit einzeln anklickbaren Dachteilen (Ausrichtung,
Neigung, Fläche, Paneeltyp, liegend/stehend, „Dach optimieren"), laufender Anzeige von Panelzahl
und Jahresproduktion → Bericht. Die Adressauswahl ließ sich nicht automatisiert auslösen,
**ein fertiger Bericht wurde nicht erzeugt.**

**Lead-Gate sehr wahrscheinlich keines:** In der geladenen Anwendung existiert **kein einziges
E-Mail-Feld**, und ein frei im Netz liegender echter Ergebnisbericht enthält keine
Kontakterfassung. Selbst ausgelöst wurde er aber nicht.

**Fachlich zweigeteilt.** Auf der Ertragsseite stark: dachteilgenau, echte Ausrichtung und Neigung
aus Laserbefliegung. Auf der Eigenverbrauchsseite eine **Pauschale von 35 %** (im geprüften
Beispielbericht 30 %). Dafür rechnet sie **Kapazitätstarif und Injektionskosten ausdrücklich mit** —
darin ist sie den meisten deutschen Rechnern voraus. Annahmen offengelegt: 25 Jahre, 1.217 €/kWp
inkl. 6 % MwSt., Wechselrichtertausch 265 €/kWp, 23,4 ct vermiedener Strompreis, 3,8 ct Einspeisung.
**Degradation wird nirgends genannt.** Im selben Dokument zwei Widersprüche (Wechselrichter „nach
12 Jahren" gegen Parameter „nach 15 Jahren"; Prämienangabe „in 2023" in einem Bericht von 11/2024).

### WattEconomics (KU Leuven) — **[GEPRÜFT, nicht bedient]**

Aus einer Doktorarbeit. **Das einzige Werkzeug in ganz Belgien, das den Eigenverbrauch nicht
schätzt, sondern rechnet:** Es nimmt die **Viertelstundenwerte des eigenen Zählers als CSV aus
Mijn Fluvius** und simuliert PV, Speicher (mehrere Fahrweisen inklusive Peak-Shaving), Wallbox und
Wärmepumpe. Bildet Kapazitätstarif, Injektionstarif und dynamische Börsentarife ab; Ausgabe
Ersparnis, Amortisation, Kapitalwert.

**Zwei harte Einschränkungen:** Die hochgeladenen Verbrauchsdaten werden laut Seite **gespeichert
und öffentlich zugänglich gemacht**, und der CSV-Export beim Netzbetreiber ist für Laien eine hohe
Hürde. Kein Massenwerkzeug.

### Negativbefunde — **[GEPRÜFT]**

- **Bobex.be** rankt auf Platz 1 für „terugverdientijd zonnepanelen 2026" und **hat keinen
  Rechner** — Artikel plus Formular, **vollständiges Lead-Gate verifiziert** (Name, Mail, Telefon,
  Adresse zwingend).
- **Test-Aankoop** (Verbraucherorganisation) hat **keinen eigenen Rechner** und verweist auf die
  staatlichen Werkzeuge.
- **Beide behördlichen Zusatz-Simulatoren sind tot:** Die VEKA-Heimspeicher-Simulation ist
  abgeschaltet („Deze simulator is niet langer beschikbaar"), der RAI-Simulator antwortet mit 404.
  **Für „lohnt sich ein Speicher" gibt es in Flandern derzeit kein behördliches Werkzeug mehr.**

> **Guter kostenloser Rechner ohne Lead-Gate? TEILWEISE.** Die staatliche Zonnekaart ist kostenlos,
> ohne erkennbare Mauer, dachteilgenau und beim Tarifregime weiter als fast alles in Deutschland —
> setzt den Eigenverbrauch aber pauschal auf 35 % und nennt keine Degradation. Echte Simulation gibt
> es nur akademisch mit CSV-Hürde, und der Speicher-Rechner der Behörde ist abgeschaltet.

## B3 · Belgien — Wallonie

**Rechtslage — [GEPRÜFT 23.09.2026, wallonie.be]:** Anlagen **≤ 10 kW mit Inbetriebnahme vor dem
01.01.2024** behalten die Kompensation bis **31.12.2030**. **Neuanlagen ab 01.01.2024 nicht mehr.**
Dazu der kapazitätsbasierte *tarif prosumer*; die 2026er Sätze sind **[UNGEPRÜFT]** (der Beleg im
CWaPE-PDF war nicht extrahierbar).

Wallonien ist damit die dritte Variante: ein Bestand, der bis 2030 weiterläuft, neben Neuanlagen,
für die der Eigenverbrauch schon heute alles entscheidet.

### SIFPV (`sifpv.energiecommune.be`) — **[GEPRÜFT, nicht bedient]**

Betreiber Energie Commune (Non-Profit), **mit Förderung der Region Wallonie**. Vier Blöcke auf
einer Seite: Ausgangslage · Anlage (kWc, kVA, Ausrichtung und Neigung in Grad) · Finanzierung
(Kredit, Zins, Laufzeit) · Prosumer. Ausgabe: spezifischer Ertrag, Deckungsgrad, Amortisation,
**Kapitalwert über 25 Jahre, TRI und TRIM** — der **einzige** Rechner dieser ganzen Recherche mit
interner Rendite. Kein Mail-Feld auf der Seite; **ein Ergebnis wurde nicht gesehen.**

Annahmen vorbildlich offengelegt: 25 Jahre, 0,5 %/Jahr Degradation, PVGIS Namur 1.200 kWh/m²·a,
Performance Ratio 85 %, Inflation 2,5 %, Strompreissteigerung 2,5 %, Diskontsatz 2 %, Wartung
50 €/a, Wechselrichter 275 €/kVA nach 12 Jahren. **Der Eigenverbrauch ist eine Nutzereingabe**
(CWaPE-Standard 37,76 %). **Der Haken: Seitenstand 13.03.2024**, der Prosumer-Satz steht auf 2024er
Werten, und die Einheit schwankt innerhalb eines Satzes zwischen €/kWe und €/kWc.

### Cartographie solaire (`cartographie-solaire.spw.wallonie.be`) — **[ABRUF GESCHEITERT]**

**Das offizielle Tool der wallonischen Verwaltung (SPW Énergie).** Reine JavaScript-Anwendung; der
Abruf lieferte nur den Titel. **Eingaben, Ausgaben und Lead-Gate konnten am Werkzeug selbst nicht
geprüft werden.** Aus der amtlichen FAQ **[GEPRÜFT]**: Adresse und Kataster, optional Verbrauch,
Verbrauchsprofil, E-Autos, Modulplatzierung, Finanzparameter; Ausgabe Jahresproduktion,
Autarkiegrad, Kosten, Jahresersparnis, Amortisation. Ein Mail-Erfordernis wird dort nicht erwähnt —
**ein Nicht-Erwähnen ist kein Beleg.**

Auffällig: Die FAQ nennt eine **Laufzeit von 30 Jahren**, der SIFPV rechnet mit 25. Zwei staatlich
getragene Werkzeuge derselben Region mit verschiedener Laufzeitannahme.

### Negativbefunde

- **CWaPE** (Regulator): kein Rentabilitätsrechner. Der „Simulateur pour les prosumers" von
  **2019** beantwortet nur die Zählerfrage; `tarifimpact.be` rechnet ausschließlich Netztarife.
- **Test-Achats**: der als „Simulateur" verlinkte Dienst ist ein Stromtarifvergleich.
- **Bobex.fr-be**: vollständiges Lead-Gate, kein Rechner.

> **Guter kostenloser Rechner ohne Lead-Gate? TEILWEISE.** Der SIFPV ist inhaltlich der
> vollständigste der ganzen Recherche — als einziger mit interner Rendite und Kapitalwert, Annahmen
> vollständig offen. Er ist aber **zweieinhalb Jahre alt und führt den Prosumer-Tarif auf Stand
> 2024**, und der Eigenverbrauch ist eine Nutzereingabe.

## B-Querbefund Benelux — der wichtigste Satz von Teil B

**Kein einziger der in NL, Flandern und Wallonie geprüften Rechner simuliert den Eigenverbrauch
stündlich UND rechnet daraus Geld.** Entweder eine Pauschale (Zonnekaart 35 %, HIER 26 % plus starre
Zuschläge, Consumentenbond 30 %), eine Nutzereingabe (energievergelijk 30 %, SIFPV 37,76 %) — oder,
in den zwei Fällen mit echter Zeitauflösung, **kein Geld**: Zonnecalculator.nl rechnet Eigenverbrauch
und Autarkie aus Wetterjahren und Lastprofilen, nennt aber keinen Euro; WattEconomics rechnet alles,
verlangt aber einen CSV-Upload beim Netzbetreiber und veröffentlicht die Daten.

**Genau diese Naht ist bei uns geschlossen.**

Und die Warnung dazu, ebenfalls aus den Daten: **Der Regimewechsel allein schafft die Pauschale
nicht ab.** Flandern lebt seit fünf Jahren ohne Netto-Verrechnung, und das offizielle Werkzeug
rechnet immer noch mit 35 %.

---

## B4 · Vereinigtes Königreich

### Energy Saving Trust — der eine gute Rechner des Landes — **[SELBST BEDIENT 23.09.2026]**

`energysavingtrust.org.uk/tool/solar-energy-calculator/` (Werkzeug auf
`pvfitcalculator.energysavingtrust.org.uk`). Betreiber ist der **Energy Saving Trust**, eine
unabhängige Organisation, **keine Behörde** — die genaue Rechtsform wurde nicht am Register
geprüft.

**Kostenlos ohne Lead-Erfassung — bestätigt.** Das vollständige Ergebnis erschien ohne Mailadresse,
ohne Telefonnummer, ohne Konto; ein Konto gibt es nur optional zum Speichern.

Erste Stufe: **Postleitzahl → Auswahl der konkreten Hausanschrift aus einer Liste → Personenzahl →
„Ist tagsüber jemand zu Hause?"**. Ergebnis (SW1A 1AA, 2 Personen, tagsüber niemand da):

| Ausgabe | Wert |
|---|---|
| Installationskosten | £9.000 |
| Ersparnis + Exporterlös | £825/Jahr |
| **Amortisation** | **11 Jahre** |
| Anlage | 12 Module (5,5 kWp), Zahl änderbar |
| davon Stromrechnung / Export | £185 / £640 |

Zweite Stufe fragt zusätzlich: stromintensive Geräte (Elektroheizung, Wärmepumpe, Warmwasser,
E-Auto), exakten Jahresverbrauch, Dachneigung, Dachrichtung über einen Kompass, Verschattung in
vier Stufen. **Kein Speicher in der Fragestrecke.**

**Die fachliche Besonderheit, die ihn vom Rest Europas abhebt:** Der Eigenverbrauch wird **nicht**
eingegeben, sondern aus Personenzahl und Anwesenheit abgeleitet — und der Verbrauch kommt aus der
**Gebäudedatenbank zum konkreten Haus**: „Our tool uses property details such as: size, insulation,
energy performance certificate (EPC) rating from your home or similar homes." Das ist ein Weg, den
in Deutschland niemand geht. **Ob dahinter eine Stundensimulation steckt, ist nicht dokumentiert.**
Die Größenordnung im Beispiel (£640 Export gegen £185 Eigenverbrauch) passt zur Angabe „tagsüber
niemand da". Die **SEG** ist abgebildet, samt dem Hinweis, dass die Anmeldung nicht automatisch
erfolgt, und samt der benannten Grenze „Our tool assumes no export limits".

**Seine Schwächen sind präzise benennbar:** kein Speicher · **Strompreis, SEG-Satz und
Eigenverbrauchsquote stehen nirgends als Zahl** · keine Szenarien · kein Teilen-Link · 0 % MwSt.
und ECO4 werden auf den geprüften Seiten nicht erwähnt.

**Und er ist die Referenz des Landes:** MoneySavingExpert, die reichweitenstärkste britische
Verbraucher-Geldseite, hat **keinen eigenen Rechner** und verweist im Solar-Leitfaden wörtlich auf
ihn.

### Solar Guide — ein Rechner auf einem seit 2019 geschlossenen Förderregime — **[TEILWEISE BEDIENT]**

`solarguide.co.uk/solar-pv-calculator`, kommerzielles Lead-Portal. Ergebnis ohne Mailadresse
sichtbar. **Aber es rechnet die Feed-in-Tariff-Ära:** „Income from Feed-In Generation Tariff
@ **0,00 p/kWh**: £0,00" und „Export Tariff @ **0,00 p/kWh**: £0,00" — die Rechnung kennt also
**überhaupt keinen Erlös für eingespeisten Strom**. Folgerichtig kommt eine Amortisation von
**20 Jahren 5 Monaten** heraus. Die Modul-Vergleichstabelle listet „Sharp 230W Poly" und
„Canadian Solar 250W Mono". Verluste und Annahmen sind offengelegt, das Regime ist sieben Jahre alt.

### GreenMatch — **[ABRUF GESCHEITERT]**

Lead-Vermittler über mehrere Gewerke. Eingaben sind nur Adresse und Monatsrechnung; die
Adressauswahl ließ sich nicht bedienen (`Please select an adress from the drop down`).
**Das Ergebnis wurde nicht gesehen, ob dahinter eine Mailadresse steht, ist offen.**

### Bestandsatlas UK — **[GEPRÜFT]**

- **MCS Data Dashboard** (`datadashboard.mcscertified.com`): **Registrierungsmauer.** Die
  Startseite verlangt Mailadresse, Rolle und Passwort plus Aktivierungslink. **Die Granularität
  konnte deshalb nicht selbst gesehen werden.** Bemerkenswert: Die Marketingseite behauptet das
  Gegenteil — „free and open to the public so there are no restrictions on who can see this
  information". Zwei Aussagen desselben Anbieters, die einander widersprechen. **[UNGEPRÜFT]**
  laut Marketingseite: jede zertifizierte Kleinanlage seit 2008, Filter nach Monat, Jahr, Ort und
  Technologie, tägliche Aktualisierung; eine Pressemitteilung nennt Zahlen auf
  **Local-Authority-Ebene**.
- **DESNZ „Solar photovoltaics deployment" (ET 6.3):** monatlich, Excel/ODS, **reine
  Landesstatistik** nach Kapazitätsklassen. Keine der acht gelisteten Dateien nennt „local
  authority", „region" oder „postcode".
- **DESNZ „Regional renewable statistics" — das ist die eigentliche Entsprechung:** Datei
  „Renewable electricity by local authority, 2014 to 2024" mit **Anlagenzahl, installierter
  Leistung, Erzeugung und Volllaststunden je Local Authority**. Aber: **nur Excel, nur jährlich,
  Stand 2024, veröffentlicht 30.09.2025** — rund ein Jahr Nachlauf. Keine Gemeinde-, Postleitzahl-
  oder Einzelanlagenebene.

**Zwischenbefund:** Local-Authority-Daten gibt es, aber als Behörden-Tabelle mit einem Jahr Verzug,
und das einzige aufbereitete Werkzeug liegt hinter einer Kontopflicht. **Eine Ortsseite mit
aktuellem Anlagenbestand für Endverbraucher wurde nicht gefunden** — was nicht heißt, dass es keine
gibt.

> **Guter kostenloser Rechner ohne Lead-Gate? JA — genau einer.** Der Energy Saving Trust liefert
> Kosten, Ersparnis, Amortisation und CO₂ ohne jede Kontaktangabe und leitet den Verbrauch aus der
> Gebäudedatenbank des konkreten Hauses ab. Alles andere Geprüfte ist Lead-Vermittlung oder rechnet
> ein abgeschafftes Förderregime.

## B5 · Polen

### oplaca.pl — das direkte Gegenstück zu uns, mit zwei Haken — **[SELBST BEDIENT, vollständig]**

`oplaca.pl/kalkulator`. **Kein Lead-Gate, keine Mailadresse, kein Konto** — die Seite sagt das auch
selbst („Bez konta, bez maila", „bez ofert handlowych").

Sechs Schritte: **Lokalizacja · Zużycie · Dach · Profil · Dodatki · Sprawdź**, mit einer laufenden
Live-Zeile („Bilans roczny ≈ + 2.357 zł") über der ganzen Strecke. Der Profil-Schritt bietet vier
Nutzungsmuster **mit ausgeschriebener Eigenverbrauchsquote**: leeres Haus ≈ 18 %, jemand ganztags
da ≈ 32 %, Homeoffice ≈ 40 %, Wärmepumpe ≈ 50 %.

Ergebnis (Warschau, 4.000 kWh, G11 zu 1,02 zł/kWh, 35° Süd, „jemand ganztags da"):
**Amortisation 7,1 Jahre · 25-Jahres-Bilanz 86.897 zł · Eigenverbrauch 30 % · NPV (7 %)
22.704 zł · IRR 15,5 %**, dazu kumulierter Cashflow mit markiertem Amortisationspunkt,
Monatsdiagramm, Energiebilanz, eine **Szenariotabelle ohne Speicher / +5 kWh / +10 kWh** und
ein **Teilen-Link mit 90 Tagen Gültigkeit ohne Anmeldung**.

Quellen offen: **PVGIS SARAH-3**, URE-Tarife 2026, Net-billing nach der OZE-Novelle vom 27.11.2024.
Er ist **der einzige geprüfte polnische Rechner, der das Regime seit 2022 explizit abbildet**
(„net-billing **RCEm × 1,23**", mit eigener Erklärseite).

**Zwei Haken, beide selbst gesehen:**
1. **Dieselbe Größe mit zwei Nennern auf einer Seite:** Kachel „Autokonsumpcja 30 %", Aufschlüsselung
   darunter „1.277 kWh (18 %)" — einmal Anteil der Erzeugung, einmal Anteil von Erzeugung plus
   Netzbezug. Genau die Fehlerklasse, gegen die unser Einheiten-Wächter gebaut ist.
2. **Eine Förderaussage, der die amtliche Seite widerspricht:** oplaca schreibt „Trwają prace nad
   **Mój Prąd 7.0**", während `mojprad.gov.pl` ausdrücklich vor solchen Behauptungen warnt.
3. **Kein Impressum** — weder Firma noch Person, nur eine Mailadresse.

**Und die entscheidende Unbekannte: seine Sichtbarkeit ist ungeprüft.** Ranking, Alter und
Reichweite konnten nicht gemessen werden (das Suchbudget war erschöpft). Er wird hier deshalb
**ausdrücklich nicht** als „einer der sichtbarsten" geführt, sondern als das inhaltlich
nächstliegende Gegenstück. **Ob er ein ernstzunehmender Wettbewerber oder eine unsichtbare
Neugründung ist, muss vor jeder Entscheidung gemessen werden.**

### enerad.pl — **[TEILWEISE BEDIENT]**

Vergleichsportal (Analytics Masters, Warschau). **Kein Lead-Gate** — das vollständige Ergebnis
steht ohne Kontaktangabe, das Angebotsformular sitzt darunter. Strahlungsdaten aus **SARAH II**,
also derselben Quelle wie PVGIS. Ausgabe: empfohlene Leistung, Speichergröße, Jahresertrag,
25-Jahres-Ertrag **mit Degradation**, Energiewert mit ausgewiesenen 5 % Inflation, Diagramm
Speichergröße gegen Ersparnis.

**Was fehlt, ist das Wichtigste:** **keine Investitionssumme, also keine Amortisation.** Der
Rechner beantwortet „wie viel Strom, und was ist der wert", nicht „wann habe ich das Geld wieder".
Net-billing wird erwähnt, aber nicht gerechnet — ein RCEm-Erlös taucht in keiner Zahl auf.
Der Eigenverbrauch ist eine **eingetippte Prozentzahl**, und dabei widerspricht sich die Seite:
Der Hinweistext nennt „około 20 %" als typischen Haushaltswert, die Vorgabe steht auf **80 %**.

### Columbus Energy — der sichtbarste, und er mauert am Preis — **[SELBST BEDIENT bis zur Mauer]**

`columbusenergy.pl/kalkulator-fotowoltaiczny/`, Installateur. Drei Schritte, ausdrücklich
beschriftet: **Stan obecny · Kalkulacja · Wycena**.

Schritt 2 liefert ohne Kontaktangabe: abgeleiteter Jahresbedarf, empfohlene Anlage und Speicher,
und eine Jahresersparnis. **Schritt 3 („Wycena") verlangt Telefonnummer, Postleitzahl, Vor- und
Nachname, E-Mail und zwei Pflicht-Einwilligungen**, mit der Zusage „wir melden uns binnen
48 Stunden **telefonisch**". **Die Anschaffungskosten und damit jede Amortisation liegen hinter
dieser Mauer.** Kein Standort, keine Ausrichtung, keine Neigung, kein PVGIS — der Ertrag folgt
allein aus der Rechnungshöhe.

### PGE (Versorger) — **[SELBST BEDIENT]**

Eine einzige Eingabe (Monatsrechnung), daraus abgeleitet und **editierbar**: Jahresbedarf,
Anlagenleistung, Strompreis, **Eigenverbrauchsquote (fest 40 %)**, Verkaufspreis (0,32 zł/kWh als
feste Zahl statt eines RCEm-Verlaufs). Kein Lead-Gate. **Keine Investitionssumme, keine
Amortisation.** Die Editierbarkeit der Annahmen ist der einzige Punkt, an dem er unserem Prinzip
nahekommt.

**Tauron:** Die als Net-billing-Rechner gelistete Adresse liefert heute eine **Produktseite mit
Kreditangebot**, keinen Rechner. Ob umgezogen oder abgeschaltet, ist ungeklärt.

### Staatlicher Rechner und Register — **[GEPRÜFT]**

- **Keinen staatlichen Rechner gefunden.** `mojprad.gov.pl` trägt nur Programminformation und
  Antragsstatus; MP6 ist geschlossen, Nachfolger ist ein Speicherprogramm seit 30.03.2026.
- **Haushaltsanlagen stehen in keinem öffentlichen Einzelanlagen-Register.** Das URE-Register
  erfasst **małe instalacje**, nicht **mikroinstalacje** — Haushalts-PV bis 50 kW fällt also nicht
  hinein. Mikroanlagen kennt URE nur als **Aggregat aus den Jahresberichten der Netzbetreiber**;
  veröffentlicht werden Landeswerte (Ende 2024 über 1,5 Mio. Anlagen, über 12,7 GW) und eine
  Aufteilung nach Netzbetreiber. **Gemeinde- oder Powiat-Ebene wurde nicht gefunden.**
- **`dane.gov.pl` ließ sich nicht bedienen** (JavaScript-Anwendung) — **[ABRUF GESCHEITERT]**,
  ob es dort einen Gemeinde-Datensatz gibt, ist offen.

> **Guter kostenloser Rechner ohne Lead-Gate? TEILWEISE — und die Lücke ist eine andere als in UK.**
> Ergebnisse ohne Mailadresse gibt es mehrfach; was fast überall fehlt, ist die **Wirtschaftlichkeit**:
> enerad nennt keine Anschaffungskosten, PGE endet bei der Jahresersparnis, und der sichtbarste
> Anbieter legt genau den Preis hinter eine Telefonpflicht mit Rückruf-Zusage. Der eine Rechner, der
> alles zusammen hat, ist impressumslos und von ungeprüfter Reichweite.

---

## B6 · Frankreich — der einzige Markt mit einem guten, amtlich gelisteten Rechner

### „Évaluer mon devis" (Hespul) — **[SELBST BEDIENT 23.09.2026, vollständig]**

`evaluer-mon-devis.photovoltaique.info`. Betreiber ist der Verein **Hespul**, im Seitenfuß mit den
Logos von **ADEME** und der Region Auvergne-Rhône-Alpes. **Das französische Staatsportal führt
genau dieses Werkzeug als seinen Simulator:** `service-public.gouv.fr/particuliers/vosdroits/R73721`,
„Émetteur du simulateur: **Ademe**", geprüft am 25.09.2025.

**Kostenlos ohne Lead-Erfassung — bestätigt.** Auf der gesamten Strecke existiert kein Kontaktfeld.

Vier Schritte: **Caractéristiques** (Adresse auf Karte, Neigung, Ausrichtung in Grad, kWc, kVA;
der Standortertrag kommt automatisch aus **PVGIS**) · **Autoconsommation** (Eigenverbrauch als
Schieber, darunter eine Orientierungstabelle 3/6/9 kWc × 2.000–17.000 kWh als Bandbreiten;
Strompreis, Preissteigerung getrennt für die ersten fünf Jahre und danach) · **Investissement**
(getrennt für vier Verwertungsarten) · **Comparaisons**.

**Ausgabe: „Résultat sur 20 ans" für alle vier Verwertungsarten nebeneinander** — Volleinspeisung,
Überschussverkauf, unentgeltliche Abgabe, Volleigenverbrauch — als Jahr-für-Jahr-Kurve. Im
durchgespielten Fall (9 kWc, 9.000 kWh, 30 % EV, 12.000 €): Volleigenverbrauch **+1.846 €**,
Überschussverkauf **−1.568 €**, Volleinspeisung **−26.740 €**. Keine Renditeprozente, kein CO₂.

**Er ist am Regime nachweislich aktuell.** Die Antwort des Rechners führt `tarif d'achat PV T2 bis
2026`, `purchase_price: 1.1` (c€/kWh, nur beim Überschussverkauf) und
**`investment_prime: 0` bei allen vier Varianten** — die abgeschaffte
*prime à l'autoconsommation* ist also korrekt mit null eingerechnet. TURPE wird je Variante
beziffert. Bei der unentgeltlichen Abgabe steht ehrlich: „Aucun cadre réglementaire officiel n'est
encore déterminé."

**Rechtsstand [GEPRÜFT]:** Seit dem **Arrêté vom 05.06.2026** gilt für ≤100 kWc ein **einheitlicher
Satz von 1,1 c€/kWh**, +2 %/Jahr über 20 Jahre; die **prime à l'autoconsommation existiert nicht
mehr**.

**Schwächen:** Der Eigenverbrauch ist eine **eingetippte Quote**, keine Simulation — die Seite sagt
das offen und verweist für die echte Rechnung auf AutoCalSol. Und **das Stichdatum des Tarifs steht
nirgends sichtbar auf der Seite**, nur im Datenstrom dahinter. Die Oberfläche verlangt Neigung und
Ausrichtung in Grad.

### AutoCalSol (INES) — **[TEILWEISE GEPRÜFT]**

Öffentliche Forschungseinrichtung. Ohne Login war nur bis Schritt 2 zu kommen; danach
„Vous n'avez pas encore accès à cette étape." Die Lizenzseite nennt einen **kostenlosen
48-Stunden-Test mit Mail-Registrierung** und eine **Jahreslizenz zu 250 € HT**.
**Kein Endverbraucher-Werkzeug**, sondern Profi-Software hinter Registrierung.

### Otovo.fr — **[SELBST BEDIENT bis zum Ergebnis]**

Zwei Schritte (Adresse, Dach auf der Karte setzen), **Ergebnis ohne Mailadresse**: 6 Module,
3,0 kWp, 3.800 kWh/Jahr, „Estimation de vos économies **21.000–28.000 €**" über **30 Jahre**.
Eigenverbrauch als **Spanne (50–60 %)**. **Keine Amortisation, keine Rendite.** Ohne Anfassen des
Schiebers rechnet die Seite mit einer **unterstellten Rechnung von 144 €/Monat**.

**Und hier steht der schärfste Kontrast des ganzen Berichts:** Otovo wirbt auf derselben Seite
weiter mit der *„prime à l'autoconsommation, aide d'Etat de 240 € à 720 €"* — einer Förderung, die
es nach dem Arrêté vom 05.06.2026 **nicht mehr gibt** und die der amtlich gelistete Rechner
korrekt mit null ansetzt. Der Verkäufer rechnet mit Geld, das der Staat nicht mehr zahlt.

> **Guter kostenloser Rechner ohne Lead-Gate? JA.** Frankreich ist der bestversorgte der geprüften
> Märkte: unabhängiger Träger, staatlich gelistet, vier Verwertungsarten im Vergleich, Regime
> aktuell. Die Lücke ist die Eigenverbrauchs-Simulation und die Bedienbarkeit für Laien.

## B7 · Spanien — der schwächste Markt der ganzen Erhebung

| Anbieter | Was dort steht | Lead-Gate |
|---|---|---|
| **OCU** (Verbraucherorganisation) | Rechner existiert, aber: „Esta calculadora está reservada para Amigos de OCU" | **Registrierungswand** |
| **Selectra** | eingebettetes Formular mit 20 Feldern; die letzten beiden verlangen Name, Telefon und Mail, **bevor** gerechnet wird | **hart** |
| **SotySolar** | verlangt Name, Nachname, Telefon, Mail **vor der Adresse**, in Schritt 2 | **hart, noch früher** |
| **Holaluz** (Versorger) | 5 Schritte; die Routen im ausgelieferten Skript sind `/`, `/tu-consumo`, `/tu-direccion`, **`/tus-datos`**, `/gracias` — **es gibt keine Ergebnis-Route** | **sehr wahrscheinlich, nicht bestätigt** |
| **Otovo.es** | Ergebnis ohne Mail: 5,1 kWp, 8.100 kWh, „Ahorros estimados 39.000–55.000 €" über 30 Jahre, Eigenverbrauch als Spanne 40–45 %, CO₂ | **erst danach** |
| **simuladorsolar.es** | der einzige unabhängige und lead-freie | **kein Gate — aber er rechnet nicht** |

### simuladorsolar.es — inhaltlich das spanische Gegenstück zu uns, und es ist kaputt — **[GEPRÜFT]**

Selbstbeschreibung: unabhängig, verkauft keine Anlagen, **finanziert über Werbung und
Affiliate-Links**. **Kein Impressum, keine Firma** — nur eine Mailadresse. **Kein einziges E-Mail-
oder Telefonfeld auf der ganzen Seite.**

Angelegt ist er beachtlich: Eingabe wahlweise Monatsrechnung oder kWh/Jahr, Provinz mit
Produktionsfaktor aus **PVGIS 5.2**, Ausrichtung, €/kWp, Verbrauchsprofil mit vier
Eigenverbrauchs-Voreinstellungen (40/55/70/85 %) plus Feinschieber, **Überschussvergütung editierbar
mit Verweis auf RD 244/2019**, Batterie. Angekündigte Ausgabe: Investition, Jahresertrag,
Jahresersparnis, **Nettogewinn über 25 Jahre mit 0,6 %/Jahr Degradation**, **Amortisation als
Spanne mit Sensitivität ±20 % Strompreis**, dazu **IRPF-Abzug (20/40/60 %)**, **IBI**- und
**ICIO**-Nachlass. Jeder Referenzwert mit Datum („julio 2026") und Quelle. Die Kappungsregel der
*compensación simplificada* wird korrekt erklärt.

**Nur: In zwei unabhängigen Läufen bricht das Seitenskript beim Start ab**
(`ReferenceError: valorExcedenteBruto is not defined` in `init`, Zeile 994). Die Provinz-Auswahl
bleibt leer, **sämtliche Ergebnisfelder zeigen „—"**. Es wurde **kein einziges Ergebnis gesehen.**

**Einen staatlichen Rechner gibt es nicht.** Die *Oficina de Autoconsumo* des **IDAE** wurde selbst
aufgerufen: Leitfäden, Normen, Beratungspostfach, Verweise auf die Autonomen Gemeinschaften —
**kein Rechner**. MITECO wurde nicht geprüft.

> **Guter kostenloser Rechner ohne Lead-Gate? NEIN.** Die drei sichtbarsten Wege sind Wände, der
> Marktplatz zeigt eine 30-Jahres-Sparspanne ohne Amortisation und ohne spanisches Regime, und der
> einzige unabhängige und transparente Rechner **läuft gerade nicht**. Kein staatliches Werkzeug.
> **Das ist die offenste Lücke der ganzen Erhebung** — mit der Einschränkung, dass das Suchbudget
> in der Spanien-Runde erschöpft war und ein sichtbarer Anbieter gefehlt haben kann.

---

## B8 · Österreich — der fachlich stärkste Wettbewerber, den wir in Europa gefunden haben

### SonnenKlar PV-Rechner (PV Austria) — **[SELBST BEDIENT 23.09.2026]**

`pvbaustria.at/pv-rechner/`, Betreiber ist der **Bundesverband Photovoltaic Austria**.
**Kostenlos ohne Lead-Erfassung — bestätigt**, kein Formular auf der ganzen Strecke.

Sechs Abschnitte als Akkordeon — und die Fragen lesen sich wie unsere: **Meine Anlage**
(Standort/PLZ, Überschuss- oder Volleinspeisung, kWp, Neigung, Ausrichtung, weitere Dachflächen,
Speicher) · **Mein Gebäude** (Personen, Jahresverbrauch, **„Wie oft bist du werktags zuhause?"
nie/selten/teilweise/oft/immer**, Gebäudekategorie, Wohnfläche, Heizwärmebedarf) ·
**Meine Wärmebereitung** · **Mein E-Auto** · **Meine Kosten** · **Auswertung**.

Ergebnis (5 kWp, 30°, Süd): **Eigenverbrauchsquote 25 %**, 7.654 € Investition,
**11 Jahre Amortisation**; aufklappbar Erzeugung 5.651 kWh, Einspeisung 4.241 kWh, Direktverbrauch
**aufgeschlüsselt nach E-Auto / Warmwasser / Raumwärme / Rest-Haushalt**, **Autarkiegrad 34 %**.

**Das ist der einzige Rechner der ganzen Erhebung, der den Eigenverbrauch so behandelt wie wir:**
gerechnet statt abgefragt, getrennt nach Verbrauchergruppen, mit einer Anwesenheitsfrage. Der
Disclaimer sagt offen, wie: „Alle Angaben basieren auf **Simulationsergebnissen und daraus
extrahierten Näherungsformeln**" — also vorab simuliert und in Formeln gegossen, keine
Stundensimulation im Browser.

**Seine Lücken sind genau unsere drei Stärken:** **Förderung und Einspeisetarif sind freie
Eingabefelder** statt eines gepflegten Katalogs · die **Annahmen werden nicht offengelegt** (kein
Methodikteil) · **keine Editierbarkeit im Ergebnis**.

### Der offizielle Rechner ist eine Excel-Datei — **[SELBST HERUNTERGELADEN 23.09.2026]**

Österreichische Energieagentur / klimaaktiv, Datei `PVTOOL_LAG_Priv_06.25_Vers.17.0.xlsx`
(Stand 06/2025, 1,8 MB, **Download ohne Registrierung**). Neun Tabellenblätter, sehr detailliert
beim Regime: EAG-Investitionszuschuss gestaffelt (160/150/140/130 €/kWp), Landesförderungen je
Bundesland, **Made-in-Europe-Bonus ab 23.06.2025**, Tarifförderung nach Anlagengröße.

**Und der bezeichnendste Befund Österreichs:** Die Wetterdaten enthalten **ausschließlich
Jahreswerte** je Ort — keine Monats-, erst recht keine Stundenwerte. Der Eigenverbrauch ist deshalb
**eine Nutzereingabe** (Vorgabe 55 %), und das amtliche Werkzeug **verweist für die Schätzung auf
ein fremdes Tool** (`energieinstitut.at/tools/susi/`). **Die offizielle österreichische Rechenhilfe
lagert genau die Größe aus, die über die Wirtschaftlichkeit entscheidet.**
Kuriosum am Rande: Das Blatt „Strompreis" trägt den Stand **17.03.2009** — Altlast, nicht
Rechengrundlage (gerechnet wird mit der Nutzereingabe).

### Smart Meter Portal — **[SELBST BEDIENT]**

`smartmeter-portal.at/pv-rechner/`. Medieninhaber laut Impressum **ANIMAL Design OG, Graz**, eine
Designagentur; daneben laufen Stromanbieter-Vergleiche (Geschäftsmodell nicht offengelegt).
**Kostenlos ohne Lead-Erfassung — bestätigt**, und er hat sogar einen **Teilen-Link mit kodiertem
Zustand**, dasselbe Prinzip wie bei uns. Der **Einspeisetarif ist mit dem OeMAG-Wert vorbelegt**
(6,772 ct/kWh). Kein Standort, kein Lastprofil — Ertrag je kWp und Eigenverbrauchsquote sind
Nutzereingaben. Dafür sehr offen darin, was **nicht** enthalten ist („Wechselrichter-Tausch und
Betriebskosten sind nicht berücksichtigt").

### pvrechner24.at — mit belegtem Rechenfehler — **[SELBST BEDIENT, mit Gegenprobe]**

Wirbt mit „PVGIS-Ertragsdaten" und „E-Control Lastprofile AT". **Kostenlos, ohne Lead-Gate.**
Zwei Läufe, gleicher Verbrauch (4.500 kWh, H0), **beide ohne Speicher**:

| Anlage | Autarkiegrad | Netzbezug |
|---|---|---|
| 10 kWp | 87,2 % | 577 kWh |
| **30 kWp** | **100,0 %** | **0 kWh** |

**Ein Haushalt ohne Speicher kann nachts keinen Solarstrom verbrauchen; 0 kWh Netzbezug ist
physikalisch unmöglich.** Die Zahlen sind nur mit einer Jahres- oder Monatsbilanz erklärbar, nicht
mit dem beworbenen Stundenlastprofil. Die Seite verkauft eine Zeitauflösung, die sie nicht rechnet —
und die Amortisation (9,3 Jahre im ersten Lauf) ist dadurch systematisch zu gut. **Das ist exakt die
Fehlerklasse, gegen die unsere eigene Autarkie-Regel gebaut ist** („Jahresbilanz → 100 % bei großen
Anlagen").

### Das österreichische MaStR-Pendant: `anlagenregister.at` — **[SELBST ABGEFRAGT 23.09.2026]**

**Das ist der wichtigste Einzelfund dieser Recherche für die Atlas-Frage.** Betreiber E-Control,
**öffentlich ohne Login**, Suchmaske nach Anlagentyp, Energieträger, Bundesland, PLZ und Ort,
Excel-Export vorhanden. **Offene JSON-Schnittstelle ohne Schlüssel.**

**Ich habe die Schnittstelle selbst abgefragt und die Felder ausgezählt** — und muss dabei den
Befund des Rechercheurs in einem entscheidenden Punkt korrigieren.

Die Antwort führt je Anlage siebzehn Felder: `AnlPlz` · `AnlOrt` · `Bundesland` · `Energietraeger` ·
`Engpassleistung` · `Inbetriebnahme` · `Anlagenbetreiber` · `Kontaktdaten` · `TechCode` · `Typ` ·
und sechs `Jahressumme_Minus_1` bis `_6`.

**Gemessen über vier Postleitzahlen (Graz 8010, Eisenstadt 7000, Linz 4020, Innsbruck 6020),
zusammen 4.971 PV-Anlagen:**

| Feld | gefüllt |
|---|---|
| PLZ, Ort, Bundesland, Energieträger, **Engpassleistung** | **immer** |
| `Inbetriebnahme` | **0 von 4.971** |
| `Anlagenbetreiber`, `Kontaktdaten`, `TechCode`, `Typ` | **0 von 4.971** |
| **`Jahressumme_Minus_1` … `_6` (Einspeisemenge)** | **0 von 4.971 — durchgehend 0,0** |

**Die Einspeisemengen sind also NICHT verfügbar.** Die Spalten existieren, sie sind leer. Der
Rechercheur hatte sie als Österreichs Vorteil gegenüber dem MaStR geführt („Ranglisten nach
tatsächlich eingespeister Strommenge") — **dieser Vorteil besteht nach meiner Messung nicht.**
Ein Detail-Abruf je Anlage ist auch nicht möglich: Das Feld `ID` ist eine laufende Nummer der
Antwortzeile (0, 1, 2 …), kein Schlüssel.

**Was wirklich übrig bleibt, ist dünn:** PLZ, Ort, Bundesland, Energieträger und Leistung. Nichts
sonst. **Kein Inbetriebnahmejahr heißt: keine Zubau-Zeitreihe je Ort** — also weg fällt der
stärkste Inhalt unseres Atlas und der Aufhänger des Kommunen-Anschreibens.

**Positiv, und ebenfalls selbst gemessen:** Der Aufdachbestand ist drin. Die häufigsten
Leistungswerte in Graz sind 10, 5, 8, 6 und 4 kW — das sind Hausdächer, keine Freiflächen.
Für Graz kommen 21.654 kW auf 1.213 Anlagen.

Gemessene Größenordnung: PLZ 8010 Graz → **1.225 PV-Anlagen, 22,0 MW** in 1,4 s. Burgenland →
**34.140 PV-Anlagen, 1.195 MW**, 13 MB, 46 s. **Eine Abfrage für ganz Österreich lief nach 600 s
ins Leere** — der Bestand ist nur bundeslandweise oder PLZ-weise zu holen.

**Zwei Einschränkungen, beide ungeprüft:** Die Datenbasis ist die **Herkunftsnachweisdatenbank**
nach § 81 EAG — ob reine Eigenverbrauchsanlagen ohne Herkunftsnachweis darin stehen, ist **offen**
und wäre vor einer Entscheidung zu klären. Und **Lizenz- und Nutzungsbedingungen wurden nicht
geprüft.** Die Granularität ist **PLZ/Ort, nicht Gemeindeschlüssel** — in Österreich nicht
deckungsgleich, die Zuordnung müsste man selbst bauen.

> **Guter kostenloser Rechner ohne Lead-Gate? JA — und der beste, den wir gefunden haben.** Der
> PV-Austria-Rechner rechnet den Eigenverbrauch strukturell wie wir. **Die Lücke dort ist nicht die
> Rechnung, sondern Förderkatalog, Annahmen-Transparenz und Editierbarkeit.**

## B9 · Italien — der Staat besetzt unsere Position bereits

### GSE „Portale Autoconsumo Fotovoltaico" — **[SELBST BEDIENT 23.09.2026]**

`autoconsumo.gse.it/simulatore/input-base`. Betreiber ist **GSE S.p.A.**, also genau die staatliche
Stelle, die die Förderungen abwickelt. **Kostenlos ohne Lead-Erfassung — bestätigt**, vollständiges
Ergebnis ohne Mail, Telefon oder Login.

Profilwahl (Privathaushalte / Unternehmen und Verwaltung / **Gruppen, Gemeinschaften und
Fern-Eigenverbraucher**, also Energiegemeinschaften ausdrücklich), Adresse über Kartensuche mit
Satellitenbild, Jahresverbrauch, besonnte Fläche, dazu eine **Karte der Umspannbezirke** für
Energiegemeinschaften.

Ergebnis (Bologna, 3.500 kWh, 40 m²): **2,2 kW empfohlen, 986 kWh Eigenverbrauch**, 2.701 kWh
Produktion — und darunter **drei Finanzierungsvarianten nebeneinander** (ohne Finanzierung / mit
Finanzierung / über ESCO), je mit Nettogewinn über 25 Jahre, Anfangsauszahlung, mittlerem
Jahresnutzen und **Rückflusszeit 20,8 Jahre**.

**Methodisch die interessanteste Variante der ganzen Erhebung:** Die Annahmen stehen im Wortlaut
unter dem Ergebnis — 25 Jahre Lebensdauer, außerordentliche Wartung im 12. Jahr, und **Kosten,
Produktion und Eigenverbrauch aus den Mittelwerten realer, beim GSE registrierter Anlagen im ganzen
Land**. Also **empirisch aus dem eigenen Anlagenbestand**, weder simuliert noch abgefragt. Und die
**Annahmen sind editierbar** („vedi e modifica le ipotesi"): Steuerabzug, Speicher,
Inselförderung, Scambio sul Posto, Asbestentsorgung — **samt eingebautem Angebotscheck**
(„Hai già un preventivo?").

**Zwei Beobachtungen:** Die **20,8 Jahre** Rückflusszeit liegen weit über dem, was kommerzielle
italienische Rechner nennen (4–7 Jahre) — die staatliche Stelle rechnet deutlich vorsichtiger.
Und der Schalter **„Scambio sul Posto" wird weiter angeboten**, obwohl das Verfahren für Neuanlagen
geschlossen sein soll **[UNGEPRÜFT — nicht an der Originalquelle nachgesehen]**.

### Eni Plenitude — **[GEPRÜFT: hartes Lead-Gate mit SMS-Verifikation]**

Kein Rentabilitätsrechner, sondern ein **Verkaufskonfigurator**. Im ausgelieferten HTML steht
wörtlich: „Inserisci il nr. di cellulare per ricevere via SMS il codice di verifica…" — die Preise
sind erst **nach SMS-Verifikation** vollständig sichtbar. Pflichtfelder: Name, Nachname, Telefon,
Mail, PLZ, Ort. Die gezeigten Beispielzahlen sind **Werbezahlen, kein Ergebnis von Eingaben**.

### SunEarthTools — **[SELBST BEDIENT]**

Kostenlos, kein Lead-Gate, mit **NPV, IRR, Cashflow über 30 Jahre** und PDF/Excel-Export. Aber:
**kein Standort, keine Einstrahlung, kein Lastprofil und kein italienisches Regime.** Ertrag und
Eigenverbrauch muss der Nutzer selbst mitbringen; die Zuschussfelder sind generisch — weder
Detrazione 50 %, noch Ritiro Dedicato, noch Energiegemeinschaften sind benannt.

### Die Verbraucherorganisation hat ihr Werkzeug abgeschaltet — **[GEPRÜFT]**

Der in Artikeln genannte freie **Altroconsumo**-Simulator unter `casarinnovabile.it/p/simulatore`
**existiert nicht mehr**: **abgelaufenes TLS-Zertifikat**, danach Weiterleitung auf die
Altroconsumo-Energieseite. Dort gibt es **keinen Wirtschaftlichkeitsrechner**, sondern einen
Produktvergleich **hinter der Mitgliedschaft**.

### Und der Atlas ist auch hier zu — **[GEPRÜFT]**

`atla.gse.it` löst bei **zwei unabhängigen öffentlichen Resolvern (8.8.8.8 und 1.1.1.1) mit
NXDOMAIN** auf, während `www.gse.it` normal auflöst; die GSE-Seite nennt das System selbst
„attualmente non disponibile poiché in fase di aggiornamento". **Über Felder, Granularität und
Download lässt sich heute nichts sagen.**

**ENEA wurde nicht geprüft** (Suchbudget erschöpft) — **[keine Aussage möglich]**.

> **Guter kostenloser Rechner ohne Lead-Gate? JA — aber er gehört dem Staat und besetzt fast genau
> unsere Position.** Der GSE-Simulator deckt Regime, Steuerabzug, Speicher, Inselförderung und
> Energiegemeinschaften ab, legt seine Annahmen offen, macht sie editierbar und hat den
> Angebotscheck eingebaut — mit dem Vertrauensvorsprung der staatlichen Stelle. Das kommerzielle
> Umfeld daneben ist schwach, aber die Position ist besetzt.

---

# LÜCKENANALYSE

## Wie die Spalten gemeint sind

- **Guter kostenloser Rechner?** „Ja" heißt: **ein Ergebnis ohne Mailadresse selbst gesehen**, mit
  Amortisation oder Gewinn, auf dem aktuellen nationalen Regime. „Teilweise" heißt: kostenlos, aber
  mit einem Mangel, der die Kernzahl trägt. „Nein" heißt: Mauer oder kaputt.
- **Bestandsatlas?** Gefragt ist eine **lesbare Ortsseite für Endverbraucher**, nicht eine offene
  Datentabelle. Die Datenlage steht daneben in Klammern — sie entscheidet, ob man einen bauen
  *könnte*. Für die Datenspalte sind `west-sued.md` und `nord-ost-uk.md` maßgeblich.

## Die Tabelle

| Land | Guter kostenloser Rechner? | Bestandsatlas für Endverbraucher? | Lücke? |
|---|---|---|---|
| **Deutschland** (Referenz) | ja — wir | ja — wir | — |
| **Niederlande** | **teilweise** — HIER ohne Gate und mit 2027-Regime, aber Eigenverbrauch bei großen Anlagen physikalisch unmöglich; der eine echte EV-Rechner nennt kein Geld | **nein** (Daten: CBS-Gemeindewerte offen, CC BY 4.0, aber Jahresbestände ohne Zubaujahr; freie Karte kann keine Dächer, Dächer-Karte ist Freemium) | **JA — und die zeitlich dringendste** |
| **Belgien / Flandern** | **teilweise** — staatliche Zonnekaart dachteilgenau und mit Kapazitätstarif, aber Eigenverbrauch pauschal 35 %, keine Degradation; Speicher-Tool der Behörde abgeschaltet | **nein** (Daten: **1,11 Mio. Einzelanlagen** mit PLZ und Inbetriebnahmejahr, täglich, kommerziell ausdrücklich erlaubt, **Steckersolar als eigene Kategorie**) | **JA — datenseitig der beste Fall nach der Schweiz** |
| **Belgien / Wallonie** | **teilweise** — SIFPV als einziger mit interner Rendite und Kapitalwert, Annahmen vollständig offen, aber **Stand 03/2024**; das amtliche Tool war nicht prüfbar | **nein** (Daten: Jahresbestände je Ortschaft, offen) | **Ja, aber kleiner Markt** |
| **Frankreich** | **JA** — Hespul, vom Staatsportal als Simulator gelistet, vier Verwertungsarten über 20 Jahre, Regime auf dem Stand 06/2026 | **nein** (Daten: Gemeinde und sogar IRIS offen, Licence Ouverte 2.0 — aber unter 36 kW **keine Zeitachse**) | **Rechner: keine Lücke. Atlas: Lücke ja, aber unter 36 kW ohne Zeitachse** |
| **Spanien** | **NEIN** — OCU hinter Registrierung, Selectra und SotySolar verlangen Telefon und Mail vor der Rechnung, Holaluz hat keine Ergebnis-Route, und der einzige freie und transparente **läuft wegen eines Skriptfehlers nicht** | **offen — nicht geprüft** | **JA — die offenste Rechner-Lücke** |
| **Italien** | **JA** — GSE, staatlich, Regime samt Steuerabzug, Speicher, Inselförderung und Energiegemeinschaften, Annahmen offen **und editierbar**, Angebotscheck eingebaut | **nein, und nicht baubar** (GAUDÌ nicht öffentlich, Atlaimpianti offline mit NXDOMAIN, GSE-Inhalte **CC BY-NC-SA**, kommerzielle Nutzung wörtlich untersagt) | **keine — Rechner besetzt, Atlas rechtlich zu** |
| **Österreich** | **JA** — PV Austria rechnet den Eigenverbrauch strukturell wie wir (Anwesenheit, Verbrauchergruppen, Autarkie getrennt) | **nein, und kaum baubar** (Register offen, aber **Inbetriebnahme und Einspeisemenge in 4.971 geprüften Zeilen durchgehend leer** → kein Zubau je Ort) | **Rechner: nur kleine Lücke. Atlas: keine Lücke — Daten tragen ihn nicht** |
| **Polen** | **teilweise** — der einzige vollständige (oplaca.pl: Amortisation, NPV, IRR, Speicher-Szenarien, RCEm, Teilen-Link, kein Gate) ist **impressumslos, mit ungeprüfter Reichweite und einer widerlegten Förderaussage**; die sichtbaren mauern am Preis | **nein** (Daten: **Mikroanlagen in keinem öffentlichen Einzelregister**, nur Landessummen; Register erst ab 50 kW) | **Rechner: Lücke ja. Atlas: keine Lücke — Daten fehlen** |
| **UK** | **JA** — Energy Saving Trust, ohne Gate, leitet den Verbrauch aus der Gebäudedatenbank des konkreten Hauses ab, SEG abgebildet; MoneySavingExpert verweist auf ihn statt auf einen eigenen | **nein** (Daten: Local-Authority-Tabelle als **Excel mit einem Jahr Nachlauf**; MCS-Dashboard hinter Kontopflicht; kein Kleinanlagenregister) | **Rechner: keine Lücke. Atlas: Lücke ja, aber Daten ein Jahr alt** |
| **Schweiz** (nicht angefragt) | teilweise — Solantiq bedient DACH | **nein** (Daten: **das einzige echte MaStR-Äquivalent** — Einzelanlagen mit Adresse, Koordinaten, **taggenauem Inbetriebnahmedatum**, monatlich, kommerziell frei gegen Quellenangabe) | **JA — technisch der billigste zweite Atlas** |

## Die drei Sätze, auf die es hinausläuft

**1. Rechner und Atlas haben in Europa NICHT dieselbe Lücke — und nirgends fallen sie zusammen.**
Wo der Rechner fehlt (Spanien, Polen), sind die Registerdaten schwach oder nicht vorhanden. Wo die
Daten stark sind (Schweiz, Flandern), gibt es entweder schon einen guten Rechner oder einen kleinen
Markt. Ein Markteintritt, der beides gleichzeitig mitnimmt, ist in dieser Erhebung **nicht**
aufgetaucht. Die Niederlande kommen dem am nächsten: mittelmäßiger Rechner, brauchbare Daten,
und ein Regimewechsel in rund 100 Tagen, der die Eigenverbrauchsrechnung schlagartig wichtig macht.

**2. Der Eigenverbrauch ist der gemeinsame Schwachpunkt fast aller europäischen Rechner — und er
ist genau unsere Kernkompetenz.** Von allen geprüften Rechnern in acht Ländern **rechnet keiner den
Eigenverbrauch stundenweise UND daraus Geld**. Es gibt drei Muster: die eingetippte Prozentzahl
(SIFPV 37,76 %, enerad, Solantiq, TrackMyEnergy, AEA-Excel), die Pauschale (Zonnekaart 35 %, HIER,
GSE empirisch, Otovo als Spanne) — und in den zwei Fällen mit echter Zeitauflösung
(Zonnecalculator.nl, WattEconomics) **kein Geld bzw. eine CSV-Hürde beim Netzbetreiber**. Zwei
Anbieter behaupten dabei etwas, das physikalisch nicht geht: **eu-solarcalculator rechnet mit
100 % Eigenverbrauch ohne Speicher**, und **pvrechner24.at weist 100 % Autarkie bei 0 kWh
Netzbezug aus** — beides von mir selbst nachgerechnet.

**3. Wo ein Staat oder eine Behörde das Feld besetzt, ist es zu — und das ist die härteste
Grenze.** In Frankreich, Italien, dem UK und (über den Verband) Österreich steht ein
kostenloses, gut gemachtes Werkzeug mit Vertrauensvorsprung. Dagegen tritt man nicht mit „auch
kostenlos" an. Übrig bleiben zwei Sorten Markt: solche **ohne** Amtsangebot (Spanien, Polen, NL) —
und die Frage, ob unser Vorsprung in der Rechnung selbst (Stundensimulation, Förderkatalog,
editierbare Annahmen) reicht, um gegen ein Amtsangebot anzutreten. **Das ist eine
Produktentscheidung, keine Rechercheaussage.**

## Was diese Erhebung NICHT beantwortet

Damit niemand mehr hineinliest, als drinsteht:

1. **Sichtbarkeit.** Die verfügbare Suche ist US-indexiert; landessprachliche Rankings wurden
   **nicht** gemessen. Bei `oplaca.pl` ist das entscheidungsrelevant: Er ist inhaltlich unser
   direktes Gegenstück, könnte aber eine unsichtbare Neugründung sein.
2. **Spaniens Register.** In `west-sued.md` steht an dieser Stelle ein Platzhalter
   („Ergebnis der parallelen Recherche — wird eingefügt"), und meine eigene Nachprüfung kam nicht
   mehr zustande: Das Suchbudget der Sitzung war aufgebraucht, und `datos.gob.es` lieferte beim
   Abruf eine leere Seite. **Die Spalte „Bestandsatlas" für Spanien ist damit offen — nicht mit
   „nein" beantwortet.** Wer sie schließt, tut das in `west-sued.md`, nicht hier.
3. **Marktgrößen.** Es wurde kein Suchvolumen erhoben. Die beiden Fragen aus unserer eigenen
   Freigabe-Regel („wird auf dieser Ebene gesucht?" und „steht eine eigene Seitenfamilie schon auf
   denselben Anfragen?") sind für **kein** Land beantwortet. **Vor einer Länderentscheidung ist
   das nachzuholen** — sonst wiederholen wir den Fehler der Landkreisseiten: technisch grün,
   inhaltlich ins Leere.
4. **Lizenzen im Original.** Für die Schweiz, Flandern und Frankreich liegen Lizenzangaben vor,
   aber die Volltexte wurden nicht durchweg gelesen. Vor einer Nutzung gilt Faktenprüfungs-Regel 6.
5. **Mehrere Abrufe sind gescheitert** und sind jeweils als solche markiert — keiner davon ist ein
   Beleg für Nichtexistenz: Electricity Maps (403), die wallonische Karte (JavaScript),
   GreenMatch und Holaluz (Adressauswahl), AutoCalSol und OCU (Registrierung, bewusst nicht
   angelegt), Photonik (Startknopf ohne Wirkung).
