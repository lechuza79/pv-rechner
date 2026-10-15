# Batteriespeicher mit Ortsbezug: Schweiz und Niederlande

**Rechercheauftrag:** Der Vorlauf hat für CH und NL behauptet, Speicherdaten je Gemeinde gebe es
nicht — geprüft hatte er aber nur das schweizerische Anlagenregister plus den BFE-Datenkatalog
bzw. beim niederländischen Statistikamt nur die nationale Reihe. Dieser Durchgang sucht breit.

**Alle Messungen dieses Dokuments: 23.09.2026.** Jede Aussage ist als GEPRÜFT (selbst aufgerufen,
Datei selbst geladen, Zeilen selbst gezählt) oder UNGEPRÜFT markiert.

**Begriffstrennung, die durchgehend eingehalten wird:**
- **Heimspeicher** — Batterie im Haushalt hinter dem Zähler. Das ist, was unser Atlas zeigt.
- **Großbatterie** — Netzspeicher über 1 MW mit eigenem Netzanschluss. Anderer Befund, wird
  niemals als Antwort auf die Heimspeicher-Frage ausgegeben.
- **Pumpspeicher** — Wasserkraft. Taucht in beiden Ländern in Speicher-Suchen auf und ist hier
  immer ein Fehltreffer.

---

## Kurzbefund

| | Schweiz | Niederlande |
|---|---|---|
| Speicherdaten je Gemeinde | **nein** | **nein** |
| Speicher als Einzelanlage mit Ortsbezug | **nein** (kein Register) | **ja, aber unveröffentlicht** (CERES/energieleveren.nl, adressgenau) |
| Gröbere Ebene | **nein** | **nein** (auch nicht Provinz oder Netzgebiet) |
| Beste veröffentlichte Ebene | national | national, monatlich |
| Inhalt | Anzahl **und** kWh | Anzahl **und kW** — keine kWh |
| Heimspeicher trennbar | ja (Erhebung zielt darauf) | ja (Kleinverbrauch/Großverbrauch) |
| Herkunft | Kohortenmodell auf Verkaufszahlen | Pflichtregister (unvollständig) |
| Belegter Grund für die Lücke | keine zentrale Meldepflicht | Register existiert erst seit 05/2024, veröffentlicht wird nur aggregiert |

**Der entscheidende Unterschied:** In der Schweiz **gibt es die Daten nicht** — es existiert kein
Register. In den Niederlanden **gibt es die Daten adressgenau**, sie werden nur nicht in
räumlicher Auflösung veröffentlicht. Das macht NL zu einer Anfrage, CH zu einer Sackgasse.

---

# SCHWEIZ

## 1. Das Anlagenregister — vollständige Werteliste geprüft

Der Auftrag verlangte ausdrücklich die **vollständige** Liste der Kategorie-Werte, nicht nur die
erwarteten. Sie liegt jetzt gemessen vor.

**GEPRÜFT 23.09.2026.** Datensatz `ch.bfe.elektrizitaetsproduktionsanlagen`, abgerufen über die
STAC-Schnittstelle von data.geo.admin.ch:

- Datenstand `2026-08-06`, Datei zuletzt aktualisiert `2026-09-16T21:49`
- `elektrizitaetsproduktionsanlagen_2056.csv.zip`, 19.195.387 Byte, selbst geladen und entpackt
- `ElectricityProductionPlant.csv`: 42.963.477 Byte, **339.499 Anlagenzeilen**
- `PlantDetail.csv`: 406.676 Zeilen
- dazu die drei Katalogdateien, die die erlaubten Werte abschließend enthalten

### SubCategoryCatalogue — vollständig, 10 Werte, kein Speicher

```
subcat_1   Wasserkraft        Énergie hydraulique    Forza idrica         Hydroelectric power
subcat_2   Photovoltaik       Photovoltaïque         Energia fotovoltaica Photovoltaic
subcat_3   Windenergie        Énergie éolienne       Energia eolica       Wind energy
subcat_4   Biomasse           Biomasse               Biomassa             Biomass
subcat_5   Geothermie         Géothermie             Geotermia            Geothermal energy
subcat_6   Kernenergie        Énergie nucléaire      Energia nucleare     Nuclear energy
subcat_7   Erdöl              Pétrole                Petrolio             Crude oil
subcat_8   Erdgas             Gaz naturel            Gas naturale         Natural gas
subcat_9   Kohle              Charbon                Carbone              Coal
subcat_10  Abfälle            Déchets                Rifiuti              Waste
```

Tatsächlich in den 339.499 Zeilen vorkommend (gezählt): subcat_2 337.455 · subcat_1 1.325 ·
subcat_4 434 · subcat_8 188 · subcat_3 64 · subcat_10 28 · subcat_6 4 · subcat_7 1. Also acht von
zehn definierten Werten — **kein undokumentierter Wert, keine Speicher-Kennung.**

### MainCategoryCatalogue — vollständig, 4 Werte

```
maincat_1  Wasserkraft
maincat_2  Übrige erneuerbare Energien
maincat_3  Kernenergie
maincat_4  Fossile Energieträger
```

### PlantCategoryCatalogue — vollständig, 13 Werte

```
plantcat_1   Abwasserkraftwerk          plantcat_8   Angebaut
plantcat_2   Ausleitkraftwerk           plantcat_9   Integriert
plantcat_3   Dotierwasserkraftwerk      plantcat_10  Freistehend
plantcat_4   Durchlaufkraftwerk         plantcat_11  Biomassenutzung
plantcat_5   Trinkwasserkraftwerk       plantcat_12  Kehrichtverbrennung
plantcat_6   Pumpspeicherkraftwerk      plantcat_13  Abwasserreinigung
plantcat_7   Speicherkraftwerk
```

**Hier liegt die Falle, auf die der Auftrag zielte.** Zwei Werte tragen das Wort „Speicher":
`plantcat_6 Pumpspeicherkraftwerk` (20 Anlagen) und `plantcat_7 Speicherkraftwerk` (97 Anlagen).
Beides ist **Wasserkraft** — Pumpspeicher und Speicherkraftwerk im Sinne von Stausee. Wer nach
„Speicher" grept, findet sie und hält sie für einen Fund. Sie haben mit Batterien nichts zu tun;
`plantcat_6/7` treten ausschließlich mit `subcat_1 Wasserkraft` auf.

### Attributliste — kein einziges kWh-Feld

Klasse `ElectricityProductionPlant`:
`xtf_id, Address, PostCode, Municipality, Canton, EGID, BeginningOfOperation, InitialPower,
TotalPower, MainCategory, SubCategory, PlantCategory, _x, _y`

Klasse `PlantDetail`:
`xtf_id, Date, Power, Inclination, Orientation, PlantCategory, ElectricityProductionPlantR`

`InitialPower` und `TotalPower` sind **kW** (Leistung), `Power` im Detail ebenso. Eine
Speicherkapazität in kWh kommt im Datenmodell nicht vor. Auch keine Anzahl, kein Flag, keine
Notiz. Das Datenmodell kann einen Speicher gar nicht ausdrücken.

Nebenbefund für uns: die Anlagen tragen `EGID`, also den eidgenössischen Gebäudeidentifikator —
und `Municipality`, `PostCode`, `Canton` plus Koordinaten. Für PV ist das ein sehr gutes
Fundament. Nur eben ohne Speicher.

### Warum der Katalog so aussieht — rechtlich festgelegt

**GEPRÜFT.** Das minimale Geodatenmodell (Version 1.0, Stand 04.01.2022, PDF selbst geladen aus
`pubdb.bfe.admin.ch/de/publication/download/10449`, Text extrahiert) sagt zu allen drei
Katalogen wörtlich, sie enthielten den „Mehrsprachiger Klartext der möglichen Hauptkategorien
**gemäss Anhang 1 der HKSV**" bzw. entsprechend für Unter- und Anlagenkategorien.

Die HKSV ist die Verordnung des UVEK über den Herkunftsnachweis und die Stromkennzeichnung
(SR 730.010.1). Ihr Anhang 1 listet **Energieträger** für Herkunftsnachweise. Ein Batteriespeicher
erzeugt keinen Strom und ist kein Energieträger — er hat dort strukturell keinen Platz. Das
Register ist ein Herkunftsnachweis-Register, kein Anlagenregister im Sinne des deutschen MaStR.

*UNGEPRÜFT:* Der Volltext von HKSV Anhang 1 wurde in dieser Sitzung nicht im Original gelesen —
der Verweis auf ihn steht aber im BFE-Datenmodell im Wortlaut. Wer die Argumentation
weiterverwendet, beschafft den Anhang.

### Lizenz und Takt

**GEPRÜFT** über die CKAN-Schnittstelle von opendata.swiss (`package_show`): Jede Ressource trägt
`rights = https://opendata.swiss/terms-of-use#terms_by`. Aktualisierung
`http://publications.europa.eu/resource/authority/frequency/MONTHLY`, also monatlich — deckt sich
mit dem gemessenen Datenstand (06.08.2026, Datei vom 16.09.2026).

*UNGEPRÜFT:* Der Wortlaut der Lizenzstufe. `opendata.swiss/de/terms-of-use` antwortete auf zwei
Anläufe mit **HTTP 403** (Bot-Abwehr). `terms_by` ist die Stufe „Quellenangabe ist Pflicht" ohne
kommerzielle Einschränkung; der exakte Satz ist zu beschaffen, bevor er zitiert wird.

## 2. Gibt es einen zweiten, verwandten Datensatz? — Nein, vollständig durchgezählt

**GEPRÜFT.** Der gesamte Geodaten-Katalog des Bundes wurde über die STAC-Schnittstelle
durchgeblättert (Seitengröße 100, bis `rel=next` endet):

- **513 Collections insgesamt**
- **46 davon `ch.bfe.*`**, vollständig gelistet und gelesen
- **keine einzige** über Batterie- oder Stromspeicher

Die Treffer auf Speicher-Stichwörter sind sämtlich Fehltreffer:
`ch.bfe.statistik-wasserkraftanlagen` (WASTA, Wasserkraft), `ch.bfe.stauanlagen-bundesaufsicht`
(Talsperren), `ch.blw.bodeneignung-wasserspeichervermoegen` und
`-naehrstoffspeichervermoegen` (Böden), `energiedashboard.ch: Füllstände Gasspeicher EU` (Gas),
`ENSTAT: Füllungsgrad der Speicherseen` (Stauseen).

Benachbart und geprüft, aber ohne Speicher: `ch.bfe.photovoltaik-grossanlagen`,
`ch.bfe.windenergieanlagen`, `ch.bfe.biogasanlagen`, `ch.bfe.kehrichtverbrennungsanlagen`,
`ch.bfe.kernkraftwerke`, `ch.bfe.solarenergie-eignung-daecher`, `ch.bfe.ladestellen-elektromobilitaet`.

## 3. opendata.swiss — elf Stichwörter, null Treffer

**GEPRÜFT** über die CKAN-Schnittstelle (`package_search`, je bis 60 Ergebnisse, Browser-Kennung
nötig, sonst blockt der Dienst):

| Stichwort | Treffer | Befund |
|---|---|---|
| `batteriespeicher` | **0** | — |
| `stromspeicher` | **0** | — |
| `energiespeicher` | **0** | — |
| `heimspeicher` | **0** | — |
| `speicher` | 6 | Stauseen, Gasspeicher, Bodenwasser, ein Modellcode |
| `batterie` | 49 | fast alles Materials-Cloud-Forschungsarbeiten zu Zellchemie; dazu Ladebedarf-Szenarien für E-Autos, Sonderabfallsammlung Zürich, Recyclingstationen Basel |
| `stockage` | 30 | Regenrückhaltebecken, Altlastenkataster, Trinkwasserreservoire, Gasspeicher |
| `accumulateur` | 8 | Stauanlagen, Speicherseen, Elektrizitätsbilanz |
| `storage` | 61 | Speicherseen, Gasspeicher, Bodenkarten, Materialforschung |
| `batteria` | 7 | Ladebedarf-Szenarien, Bildungsszenarien |
| `accumulatore` | 4 | Speicherseen, Elektrizitätsbilanz |

**Kein Datensatz zu Batteriespeichern, in keiner der vier Landessprachen.**

Der nationale Metadatenkatalog **i14y.admin.ch** sagt auf seiner Katalogseite selbst, er zeige
zusätzlich „die Datensätze der Metadatenportalen opendata.swiss und geocat.ch" — also genau den
Bestand, der oben erschöpfend durchsucht ist. *UNGEPRÜFT:* die i14y-eigenen Einträge jenseits
dieser beiden Portale (2.460 Datensätze, überwiegend BFS-Statistiktabellen); die Suchfunktion der
Seite ließ sich nicht ansteuern, eine Schnittstelle war nicht auffindbar (zwei geratene Endpunkte
antworteten mit 404).

## 4. Energie Reporter — die Gemeindeebene existiert, ohne Speicher

Das war der aussichtsreichste Kandidat: ein Datensatz, der **je Gemeinde** den Stand der
Energiewende führt, unter CC BY 4.0.

**GEPRÜFT.** `energyreporter_latest.zip` selbst geladen (153.587 Byte) und entpackt:
`energyreporter_national_latest.csv`, `energyreporter_canton_latest.csv`,
`energyreporter_municipality_latest.csv` (468.640 Byte, mit `bfs_nr` je Gemeinde) plus README.

Die 33 Spalten der Gemeindedatei, vollständig:

```
bfs_nr, municipality, canton, bfs_municipality_type_2012_25,
electric_car_share, electric_car_count, electric_car_share_last_change,
electric_car_charging_spot_count, electric_cars_per_charging_spot,
electric_car_charging_spot_last_change,
solar_potential_usage, solar_power_installed_kwp, solar_potential_usage_last_change,
renewable_heating_share, renewable_heating_count, non_renewable_heating_count,
no_heating_count, renewable_heating_share_coverage, renewable_heating_share_last_change,
elec_consumption_mwh_per_year_per_capita, elec_consumption_households_mwh_per_year_per_capita,
elec_consumption_mwh_per_year, elec_consumption_households_mwh_per_year,
elec_consumption_date_from, elec_consumption_date_until,
renelec_production_mwh_per_year_per_capita, renelec_production_mwh_per_year,
renelec_production_water_mwh_per_year, renelec_production_solar_mwh_per_year,
renelec_production_wind_mwh_per_year, renelec_production_biomass_mwh_per_year,
renelec_production_waste_mwh_per_year,
renelec_production_date_from, renelec_production_date_until
```

**Keine Speicherspalte.** Themen sind E-Autos, Solarleistung in kWp, erneuerbares Heizen,
Stromverbrauch, erneuerbare Stromproduktion. Die Datensatzbeschreibung nennt dieselben fünf
Themen und keinen sechsten.

Lizenz, aus der Datensatzbeschreibung im Wortlaut:

> Diese Daten sind unter der Creative Commons Lizenz [CC BY 4.0] veröffentlicht. Sie können frei
> verwendet und weitergegeben werden. Bei einer Veröffentlichung müssen der Name __Energie
> Reporter__ als Quelle sowie __geoimpact__ und __EnergieSchweiz__ als Mitwirkende angegeben
> werden. Bei Online-Inhalten ist zudem der Link zu [Energie Reporter] anzugeben.

Für einen künftigen CH-Atlas ist das die beste Gemeindequelle, die die Schweiz hat — nur eben
ohne Speicher.

## 5. Die einzige echte Schweizer Speicherquelle: national und gerechnet, nicht gezählt

**GEPRÜFT.** „Statistik Sonnenenergie 2024", Erhebung im Auftrag des BFE / EnergieSchweiz,
durchgeführt von Swissolar, veröffentlicht 03.07.2025. PDF selbst geladen (858.566 Byte), Text
extrahiert, 1.404 Zeilen.

Wörtlich aus Kapitel 3:

> Seit 2015 wird die Anzahl sowie die (Nenn-)Kapazität der installierten elektrischen
> Energiespeicher erhoben, die an Solaranlagen im Netzverbund angeschlossen sind (Heimspeicher).
> Speichersysteme der Verteilnetzbetreiber beispielsweise zur Erbringung von
> Systemdienstleistungen werden in dieser Statistik nicht berücksichtigt.

Das ist ausdrücklich **Heimspeicher** — genau unsere Größe. Bestand am Jahresende:

| | 2023 | 2024 |
|---|---|---|
| Li-Ionen, Anzahl Systeme | 44.470 | **64.782** |
| Salz, Anzahl Systeme | 438 | 717 |
| Blei, Anzahl Systeme | 133 | 149 |
| **Total Anzahl** | **45.041** | **65.648** |
| Li-Ionen, kWh | 599.468 | 883.583 |
| Salz, kWh | 6.210 | 10.529 |
| Blei und andere, kWh | 1.634 | 1.877 |
| **Total kWh** | **607.312** | **895.989** |

Neu installiert 2024, nach Größenklasse (Angaben der Installationsbetriebe):

| Klasse | Anz. Anlagen | Kapazität kWh | Ø kWh |
|---|---|---|---|
| bis 20 kWh | 18.301 | 202.705 | 11,1 |
| über 20 bis 100 kWh | 2.312 | 64.280 | 27,8 |
| über 100 kWh | 42 | 20.415 | 489,6 |

**Zwei Einschränkungen, die mitgehören:**

1. **Kein Ortsbezug, auf keiner Ebene.** Das Wort „Kanton" kommt im ganzen Bericht ein einziges
   Mal vor, und zwar zu den Mustervorschriften der Kantone bei Sonnenkollektoren. Keine Gemeinde,
   keine Region, keine Postleitzahl.
2. **Die Zahlen sind modelliert, nicht gezählt.** Erhoben werden **Verkaufszahlen** — 364
   Meldungen von Produzenten, Direktimporteuren und Installateuren, geschätzter Erfassungsgrad
   95 %. Der Bestand entsteht daraus so:

   > Bei den Energiespeichern wird davon ausgegangen, dass sämtliche im Referenzjahr verkauften
   > Systeme installiert wurden. Basierend auf den Verkaufszahlen [...] werden mit Hilfe eines
   > Kohorten-Modells [...] die Bestandszahlen [...] berechnet.

   Eine solche Zahl lässt sich prinzipiell nicht auf Gemeinden herunterbrechen. Ein Modell auf
   Verkaufszahlen weiß nicht, wo etwas eingebaut wurde.

## 6. Swissolar-„Regionen" — sieht wie Daten aus und ist keine

**Diese Falle ist wichtig, weil sie auf den ersten Blick genau der gesuchte Befund ist.** Der
Swissolar-Batteriebericht 2025 (PDF selbst geladen, 5.451.758 Byte) enthält Abbildung 4
„Mittlere Einschätzung Batteriemarkt 2024 im EFH-Segment nach Grossregionen" — mit Aussagen wie
„In der Westschweiz und im Tessin wird ein mittleres Wachstum (Zunahme von 10-20 %) prognostiziert,
während für die Ostschweiz lediglich ein geringes Wachstum (bis zu 10 %) erwartet wird."

Quelle darunter: „Swissolar, Mitgliederbefragung Dezember 2024 (n variiert je nach Grossregion
zwischen 8 und 39)".

Das ist die **Erwartung befragter Installationsfirmen** über Marktwachstum, teils aus acht
Antworten. Es ist kein installierter Bestand, keine Anzahl, keine Kapazität. **Nicht als
regionale Speicherdaten verwenden.**

## 7. Großbatterien Schweiz — private Zusammenstellung, benannter Ort

Getrennter Befund, ausdrücklich **nicht** die Heimspeicher-Antwort.

**GEPRÜFT** aus demselben Bericht, Abbildung 12 „Übersicht Grossbatteriespeicher Schweiz":

> Abbildung 12 zeigt eine Übersicht zu Grossbatteriespeichern über 1 MW, die entweder bereits in
> Betrieb sind oder sich in Realisierung befinden. Insgesamt stellen die 32 in der Abbildung
> erfassten Grossbatteriespeicher in der Schweiz über 430 MWh Speicherkapazität und fast 250 MW
> Leistung bereit.

Quelle der Abbildung: „Wagner-Boysen, Christian (2025): Vortrag PV-Tagung 2.4.2025: Die Rolle von
Grossbatteriespeichersystemen (BESS) in der Schweiz. CKW Axpo Group" — also ein **Vortrag eines
Energieunternehmens**, keine amtliche Quelle, keine Datei, keine Lizenz.

Im Text benannte Standorte: Ingenbohl SZ (20 MW, seit 2020 der größte der Schweiz, CKW),
Rheineck SG (5 MW, SAK, im Bau, Netzebene 5), Laufenburg AG (Redox-Flow geplant),
Lugaggia TI (Quartierbatterie 50 kWh für 18 Wohnhäuser und einen Kindergarten).

## 8. Der belegte Grund: keine zentrale Meldepflicht

Die Frage des Auftrags war, ob es die Daten überhaupt geben **kann**.

**GEPRÜFT, soweit erreichbar:**

- **Anmeldung nur beim Verteilnetzbetreiber.** Die BKW schreibt auf ihrer Seite zu
  Batteriespeichern, der Speicher müsse vor der Installation beim Netzbetreiber angemeldet werden,
  weil er aktiv Strom aufnimmt und abgibt und damit das Netz beeinflusst; die Anmeldung erledigt
  der Fachpartner. Das ist eine Anmeldung bei **einem von rund 600** Verteilnetzbetreibern — kein
  Bundesregister.
- **Für Netzspeicher gibt es gar keine Meldepflicht.** Recherchierte Darstellung: große
  BESS-Systeme im Verteilnetz („front-of-the-meter") werden in der Schweiz **nicht zentral
  erfasst**, eine Meldepflicht besteht nicht. Genau das erklärt, warum die 32 Großbatterien aus
  einem Firmenvortrag statt aus einem Register stammen.
- **Pronovo führt Speicher nur als Anhang an eine geförderte Anlage.** Pronovo ist die
  akkreditierte Vollzugsstelle für Herkunftsnachweise und Einmalvergütung. Ihre Mitteilung
  „Meldung von nachträglich eingebauten Speichern" verlangt eine E-Mail an `info@pronovo.ch` mit
  Projektnummer, Betreiber, „Installierte, nominale Speicherkapazität (kWh)", genauer
  Technologiebeschreibung (z. B. Li-Ionen-Batterie, Druckluftspeicher), Hersteller, Modell und
  Inbetriebnahmedatum des Speichers. **Die Seite nennt weder ein Register noch eine
  Rechtsgrundlage** — sie beschreibt einen Verwaltungsvorgang („ist es ausreichend"). Pronovo
  veröffentlicht dazu keine Statistik und keinen Export; die Downloadseite antwortete mit
  HTTP 404, die Formularseite listet nur Titel ohne Feldinhalte.

**Folgerung:** Die Schweiz hat kein Gegenstück zum deutschen MaStR für Speicher. Damit existiert
die Grundgesamtheit, aus der man einen Gemeindewert bilden könnte, nirgends — auch nicht
unveröffentlicht an einer zentralen Stelle. Der Vorlauf hat das richtige Ergebnis gehabt, aber aus
zu engem Anlass; mit dem breiten Durchgang ist es jetzt belegt.

**UNGEPRÜFT und die einzige offene Spur:** wie viele Pronovo-Datensätze tatsächlich eine
Speicherkapazität tragen (die Angabe fällt bei geförderten Anlagen und Nachrüstungen an, also bei
einem nennenswerten Teil des PV-Bestands), und ob Pronovo oder das BFE daraus eine Aggregation je
Gemeinde herausgeben würden. Dafür müssten die Einmalvergütungs-Formulare im Inhalt geprüft und
Pronovo angeschrieben werden — Außenkontakt, also eine Entscheidung des Betreibers.

## 9. Ein Fehltreffer, der fast als Beleg durchgegangen wäre

Die Suche nach der Schweizer Speicher-Meldung liefert prominent ein PDF
„Erläuterung für das Formular zur Meldung von Batteriespeichern im Register der
Bundesnetzagentur", gehostet auf `energie360.de`. Der Domainname sieht nach dem Zürcher
Energieversorger Energie 360° aus.

**GEPRÜFT: Es ist ein deutsches Dokument.** Selbst geladen und gelesen — Kontakt
`service@marktstammdatenregister.de`, Telefon 0228, Postanschrift Bundesnetzagentur Bonn,
Rechtsgrundlage „§ 5 Absatz 1 MaStRV", Stand 01.07.2018. Es beschreibt das **deutsche**
Marktstammdatenregister und sagt über die Schweiz nichts. Verworfen.

---

# NIEDERLANDE

## 1. Es gibt ein Pflichtregister für Heimspeicher — CERES / energieleveren.nl

Das ist der zentrale Fund dieses Durchgangs. Der Vorlauf hatte nur das Statistikamt geprüft und
darum das Register nicht gesehen.

**GEPRÜFT:**

- **energieleveren.nl** ist das gemeinsame Anmeldeportal der niederländischen Netzbetreiber
  (Logos von Liander, Enexis, Stedin, Rendo, Coteq, Westland und EDSN stehen im Fuß der Seite).
  Dahinter liegt **CERES**, das zentrale Installationsregister der Netzbetreiber.
- **Anmeldung ist Pflicht.** Netbeheer Nederland: Stromspeichereinheiten **bis 1 MW**
  („elektriciteitsopslageenheden tot 1 megawatt") müssen seit dem **07.05.2024** separat auf
  energieleveren.nl registriert werden. Als Grundlage nennt Netbeheer Nederland die europäischen
  Verordnungen „Requirements for Generators (RfG)" und „Demand Connection (DCC)".
- **Die Erfassung ist adressgenau.** Ein Konto entsteht über eine Prüfung der letzten Stellen der
  Zählernummer („een toets op de laatste cijfers van het meternummer"), die Anmeldung hängt also
  am Netzanschluss. Die Rohdaten liegen damit auf Hausebene.

**Damit existiert in den Niederlanden genau das, was in der Schweiz fehlt: eine
Anlagen-Grundgesamtheit für Heimspeicher mit Ortsbezug.** Sie wird nur nicht räumlich
veröffentlicht.

## 2. Was veröffentlicht wird: national, monatlich, in kW statt kWh

**GEPRÜFT.** Die Seite `energieleveren.nl/inzicht` im Browser aufgerufen und gelesen. Sie trägt
einen Abschnitt „Inzichten opslaginstallaties". Die dort verlinkte Datei ist **nicht** unter der
Adresse erreichbar, die in Suchergebnissen steht (`/assets/data/open-data-energieleveren.csv`
liefert die SPA-Hülle, 380 Byte HTML). Der echte Link steht im Seitenfuß:

`https://prd.content-energieleveren-nl.pages.dev/data/open-data-energieleveren.csv`

Selbst geladen: 10.571 Byte, 96 Zeilen, `text/csv`. Zwei Abschnitte: „Opwek zon installaties"
(Zeile 1) und „Opslag installaties" (Zeile 67).

Spalten des Speicher-Abschnitts:

```
Datum registratie, Som van aantal_registraties,
<5 kW, 5-15 kW, >15 kW,
aantal van vermogen <5 kW, Aantal van vermogen 5-15 kW, aantal van vermogen >15 kW,
Aantal KVB, Aantal GVB,
Cumulatief aantal registraties, Cumulatief <5kW, Cumulatief 5-15 kW, Cumulatief >15kW
```

Reihe läuft monatlich von 04/2024 (2 Anmeldungen) bis 08/2026. Gemessene Endstände:

| Stand | Kumulierte Speicheranlagen |
|---|---|
| 09/2025 | 18.833 |
| 12/2025 | 25.714 |
| 03/2026 | 35.131 |
| 06/2026 | 56.570 |
| **08/2026** | **70.696** |

Leistung kumuliert 08/2026: 67 MW (<5 kW) + 370 MW (5–15 kW) + 494 MW (>15 kW).

**Drei Eigenschaften, die für unseren Atlas entscheidend sind:**

1. **Heimspeicher lassen sich trennen.** `Aantal KVB` / `Aantal GVB` ist Kleinverbrauch gegen
   Großverbrauch. August 2026: 6.752 Anmeldungen, davon **6.710 KVB und 42 GVB**. Über die
   gesamte Reihe dominiert KVB deutlich. Kleinverbrauch umfasst allerdings auch kleine Betriebe,
   ist also nicht deckungsgleich mit „Haushalt".
2. **Es gibt keine kWh.** Die Seite sagt es selbst: „Het geïnstalleerde vermogen dat gerapporteerd
   wordt is het AC- of uitgangsvermogen van de omvormer in kilowatt." Gemeldet wird die
   **Wechselrichter-Leistung in kW**, nicht die Speicherkapazität. Unser Atlas zeigt kWh und
   mittlere Batteriegröße — beides ließe sich aus dieser Quelle nicht bilden, nur über eine
   Annahme, und die wäre geraten.
3. **Die Reihe ist unvollständig, und zwar zugegeben.** Von der Seite: „De registratie van een
   installatie kan later plaatsvinden dan het installeren zelf. Hierdoor zullen de cijfers
   achterlopen op de werkelijk geïnstalleerde installaties. Daarnaast kunnen er registraties
   missen, waardoor de gegevens niet compleet zijn." Recherchiert, *UNGEPRÜFT*: EDSN schätze, dass
   möglicherweise nur die Hälfte aller Batterien registriert ist; eine Durchsetzung der
   Meldepflicht gibt es nicht.

## 3. Die Gemeindeebene existiert — für Solar, und nur als Bild

**Das ist der präziseste Befund zur Auftragsfrage.** Die Inzicht-Seite zeigt sehr wohl
Gemeindekarten, aber nur für Photovoltaik:

- „Aantal zon opwekinstallaties per gemeente"
- „Percentage aansluitingen met zonnepanelen per gemeente"
- „Gemiddeld geïnstalleerd omvormervermogen zon in kilowatt per aansluiting per gemeente"

**GEPRÜFT** über das DOM der Seite: Diese Karten sind **JPEG-Bilder**, keine Datenebenen:

```
/images/map_2026-09-01_aantal_installaties_2026.jpeg
/images/map_2026-09-01_percentageAansluitingenMetZonnepanelen_2026.jpeg
/images/map_2026-09-01_opgesteldVermogenPerAansluiting_2026.jpeg
```

Für Speicher existieren nur zwei nationale Monatsgrafiken, ebenfalls als Bild:

```
/images/09-2026_Grafiek_aantal_registraties_opslag_maand.jpg
/images/09-2026_Grafiek_vermogen_opslag_maand.jpg
```

Es gibt also **keine Speicherkarte** und **für keine der beiden Techniken eine herunterladbare
Gemeindedatei**. Das Register kann die Gemeindeauswertung offensichtlich — es tut es für Solar —
und tut es für Speicher nicht.

Stichtag der Seite: „alle registraties die gedaan zijn voor 1 september 2026". Kontakt für
Datenfragen ist auf der Seite genannt: `servicedesk@edsn.nl`.

*UNGEPRÜFT:* Lizenz. Die Datei ist als „Open data" bezeichnet, eine Lizenzangabe war weder auf
der Seite noch an der Datei zu finden.

## 4. CBS — national, und nur Großbatterien

**GEPRÜFT** über die OData-Schnittstelle, nicht über die Weboberfläche. Tabelle **85929NED**
„Grote batterijen voor opslag van elektriciteit":

- Dimensionen: **`GrootteklasseInOpslagcapaciteit`** und **`Perioden`** — und sonst keine.
  **Keine Regionaldimension.** Damit ist die Frage für diese Tabelle abschließend beantwortet.
- Zeitraum „Vanaf 2022", zuletzt geändert 17.07.2025
- Inhalt: Batterien, Vermögen, Kapazität, Bruttoproduktion
- Erfasst ausschließlich Batterien mit Speicherkapazität **über 1 MWh** — also Großbatterien.
  Recherchiert: rund 600 MWh installiert Ende 2024.

## 5. CBS baut die Statistik gerade aus — Heimspeicher ja, Region nein

**GEPRÜFT.** CBS-Longread „Ontwikkeling statistiek over batterijen voor opslag van elektriciteit",
veröffentlicht **19.12.2025**, Daten bis Ende 2024. CBS erweitert über die 1-MWh-Grenze hinaus auf
vier Segmente:

| Segment | Kapazität Ende 2024 | Anzahl |
|---|---|---|
| Heimspeicher (< 0,02 MWh) | ~400 MWh | ~76.000 Wohnhaus-Systeme |
| Mittelsegment (0,02–1 MWh) | ~300 MWh | — |
| Großbatterien (> 1 MWh) | 600–900 MWh | — |
| mobile Batterien | ~250 MWh | — |

Genutzte Quellen: eigene Pflichterhebung bei Betreibern großer Batterien; **das CERES-Register der
Netzbetreiber, das CBS für Wohnhaus-Systeme ausdrücklich als unvollständig bezeichnet**;
Marktbefragungen von DNE Research bei Batterielieferanten; Projektdaten von Voltho; eigene
Befragung für mobile Batterien (Rücklauf 64 %).

**Das Dokument enthält keine kommunale oder regionale Aufschlüsselung** — nur nationale Werte.

Bemerkenswert: CBS' Heimspeicherzahl (~76.000 Ende 2024) liegt weit über den damals im Register
stehenden Anmeldungen. Das ist die Gegenprobe zur Unvollständigkeit des Registers — und zugleich
der Grund, warum eine Gemeindeauswertung aus dem Register heute systematisch zu niedrig wäre.

*UNGEPRÜFT:* Lizenz der CBS-Tabellen (StatLine steht üblicherweise unter CC BY 4.0; in dieser
Sitzung nicht am Original geprüft).

## 6. Netzbetreiber — die Granularität existiert, für Speicher nichts

**GEPRÜFT.** Liander veröffentlicht zwölf offene Datensätze; vollständig gelesen:

```
1  Liggingsgegevens elektriciteitsnetten (Netzgeometrie, ArcGIS/WFS)
2  LianderPower (anonymisierte Orte, 5-km-Verschiebung)
3  Netbewust publiek laden (Trafostationen und öffentliche Ladepunkte)
4  Opwekdata kleinverbruikaansluitingen (je CBS-Buurt)
5  Terugleverdata kleinverbruikaansluitingen (je Postcode, min. 10 Anschlüsse)
6  Transportprognoses (regionale Teilnetze)
7  Verbruiksdata kleinverbruikaansluitingen (je Postcode)
8  Verbruiksdata slimme meter 2012-2014 (~80 Adressen)
9  Verbruiksprofielen grootverbruik elektriciteit (nach SBI-Branchencode)
10 Verbruiksprofielen grootverbruik gas (nach SBI-Branchencode)
11 STORM onderstation (Unterwerksebene)
12 Historische 15-minuten bedrijfsmetingen
```

**Kein Datensatz zu Batterien oder Speichern.** Der Solar-Datensatz liegt je CBS-Nachbarschaft und
zeigt, dass Liander diese Auflösung veröffentlichen kann und rechtlich für zulässig hält
(Aggregation ab 10 Anschlüssen je PC6 zum Schutz der Anonymität). Für Batterien tut sie es nicht.

*UNGEPRÜFT:* Enexis und Stedin wurden nicht einzeln geprüft. Beide speisen dasselbe CERES-Register
und veröffentlichen nach Kenntnisstand analoge Datensätze; ein abweichender Befund wäre
überraschend, ist aber nicht ausgeschlossen.

## 7. Klimaatmonitor — Kerndatensatz geprüft, Gesamtbestand offen

**GEPRÜFT:** Die Struktur des Kerndatensatzes („Kerndataset monitoring klimaat- en
energietransitie decentrale overheden") im Browser gelesen. Themen: Totaal, Elektriciteit,
Gebouwde omgeving, Mobiliteit, Industrie, Landbouw; darunter die Blöcke 1.1–1.6 Emissies,
2.1–2.6 Energieverbruik, 3.2–3.4 Resultaten, 4.2 Voortgang. **Kein Speicher-Indikator.**

Die Nachrichtenliste bis 09/2026 nennt „Zonnestroom 'achter de meter' 2025" (01.09.2026),
„Levering aardgas en elektriciteit woningen 2025" (31.08.2026), „SDE- en SCE-regeling 2026"
(26.08.2026) — kein Eintrag zu Batterien.

**UNGEPRÜFT, und das ist eine echte Lücke:** Der Monitor führt nach eigener Angabe „duizenden
indicatoren" im Viewer. Die Suchfunktion der Seite lieferte für „batterij" kein Ergebnis — **aber
die Gegenprobe mit dem Kontrollbegriff „zonnestroom" lieferte ebenfalls kein Ergebnis.** Die Suche
ist also defekt, und das Null-Ergebnis belegt nichts. Eine Schnittstelle war nicht ansteuerbar
(die Seiten `/dashboard/dashboard/api` und `/dashboard/dashboard/kerndataset` antworten mit
„pagina niet gevonden").

Indirekt: Klimaatmonitor führt keine eigenen Erhebungen, sondern verarbeitet Fremdquellen. Da
CBS, energieleveren.nl und die Netzbetreiber nachweislich keine regionalen Batteriedaten
veröffentlichen, kann Klimaatmonitor solche nicht haben. Das ist ein Schluss, keine Messung.

## 8. Großbatterien mit Standort — nur Pressestand

Getrennter Befund, ausdrücklich **nicht** die Heimspeicher-Antwort.

Eine amtliche Liste mit Standorten wurde nicht gefunden. **TenneTs Karte ist eine Prognose des
benötigten Bedarfs je Provinz, kein Bestandsverzeichnis.** Recherchiert, *UNGEPRÜFT* (Presse- und
Bankquellen, nicht am Original): Ende 2024 rund 350 MW / 620 MWh an Batterien ab 1 MW; bis 2030
möglicherweise 5 GW. Einzelprojekte sind benannt: Moerdijk (RWE, 400 MW / 1.100 MWh, Inbetriebnahme
geplant Q2 2028), Vlissingen („Pollux", 30 MW / 68 MWh), Dronten (DEO, 180 MW).

## 9. Der belegte Grund: die Saldierung endet erst am 01.01.2027

Die Auftragsvermutung war richtig, und sie ist die beste Erklärung für den Befund.

**GEPRÜFT** am Primärvorgang der Ersten Kammer, Gesetzesvorlage **36611 „Wet beëindiging
salderingsregeling"**:

- Zweite Kammer angenommen **14.11.2024**
- Erste Kammer angenommen **17.12.2024** („na stemming bij zitten en opstaan")
- Veröffentlichung Staatsblad **29.01.2025**, Nr. 17
- Inkrafttreten: „Deze wet treedt in werking met ingang van 1 januari 2027"

Bis 31.12.2026 gilt die volle Saldierung: eingespeister Strom wird mit dem Bezug verrechnet. Unter
dieser Regel hat ein Heimspeicher wirtschaftlich kaum einen Zweck — das Netz ist der Speicher. Ab
2027 gibt es nur noch eine Einspeisevergütung von mindestens 50 % des nackten Lieferpreises, und
Eigenverbrauch wird plötzlich wertvoll.

Die Anmeldekurve zeigt genau diesen Umschlag, und sie ist oben gemessen: 18.833 Anlagen im
09/2025, 70.696 im 08/2026 — Vervierfachung in elf Monaten, mit einem Einzelmonat von **9.774**
Anmeldungen im April 2026.

**Folgerung:** Die niederländische Datenlücke ist **kein Datenschutz- und kein
Nie-erhoben-Problem.** Das Register besteht seit Mai 2024, die Daten fallen adressgenau an, die
Gemeindeauswertung ist für Solar bereits gebaut. Es fehlt bisher nur die Veröffentlichung für
Speicher — bei einem Markt, der erst 2026 richtig angelaufen ist.

---

# Was daraus folgt

## Für einen CH-Atlas

**Speicher ist nicht darstellbar, und das ist kein Veröffentlichungsproblem, sondern ein
Erhebungsproblem.** Es gibt kein Register, aus dem ein Gemeindewert gebildet werden könnte. Die
einzige belastbare Zahl (65.648 Systeme / 895.989 kWh, Ende 2024) ist national und aus
Verkaufszahlen modelliert. Eine Speicher-Kachel müsste in der Schweiz entfallen; Anzahl,
Kapazität und mittlere Batteriegröße sind alle drei nicht bildbar.

Die PV-Seite dagegen ist gut: 339.499 Anlagen mit Gemeinde, Postleitzahl, Kanton, Koordinaten und
Gebäudeidentifikator, monatlich aktualisiert, freie Nutzung mit Quellenangabe — plus Energie
Reporter als Gemeinde-Rahmen unter CC BY 4.0.

## Für einen NL-Atlas

**Speicher je Gemeinde ist heute nicht verfügbar, aber es ist die einzige der beiden Länder-Lücken,
die sich durch eine Anfrage schließen ließe.** Die Argumente dafür stehen alle in diesem Dokument:
die Daten sind adressgenau, das Register ist Pflicht, und **die Gemeindeauswertung existiert für
Photovoltaik bereits auf derselben Seite** — es ist also dieselbe Auswertung auf einer anderen
Spalte. Adressat wäre `servicedesk@edsn.nl`, den die Seite selbst für Datenfragen nennt.

Zwei Dinge blieben auch nach einer erfolgreichen Anfrage offen, und sie gehören in die Anfrage
hinein:

1. **kWh fehlt im Register.** Gemeldet wird Wechselrichter-Leistung in kW. Unsere Kacheln
   „Speicherkapazität kWh" und „mittlere Batteriegröße kWh" ließen sich daraus nicht füllen —
   allenfalls eine Kachel „Anzahl Speicher" und eine in kW. Eine Umrechnung wäre geraten.
2. **Die Vollständigkeit ist bekannt schlecht.** CBS zählt für Ende 2024 rund 76.000
   Heimspeicher, im Register standen zu dem Zeitpunkt gut 5.000 Anmeldungen. Ein Gemeindewert aus
   dem Register wäre heute systematisch zu niedrig, und zwar ungleichmäßig. Er bräuchte denselben
   sichtbaren Vorbehalt, den wir an jede Zahl mit unklarem Nenner schreiben.

## Offene Punkte, nach Aussicht geordnet

1. **EDSN/Netbeheer Nederland anschreiben** — Gemeindeaggregat der Speicheranmeldungen aus CERES,
   analog zur bestehenden Solar-Gemeindeauswertung. Aussichtsreichster Punkt beider Länder.
   Außenkontakt, also Betreiber-Entscheidung.
2. **Klimaatmonitor-Viewer wirklich durchsuchen** — die Suche der Seite ist defekt, die Gegenprobe
   hat es belegt. Ohne Schnittstelle bleibt nur der Indikatorbaum im Viewer von Hand.
3. **Pronovo anfragen** — hält die Datenbank Speicherkapazitäten in nennenswerter Zahl, und gäbe
   es ein Gemeindeaggregat? Geringere Aussicht als NL, weil die Angabe nur an geförderten Anlagen
   und Nachrüstungen hängt.
4. **Enexis und Stedin** offene Daten einzeln prüfen.
5. **HKSV Anhang 1** im Volltext beschaffen, falls die rechtliche Begründung für die fehlende
   Speicherkategorie je zitiert werden soll.
6. **Wortlaut der opendata.swiss-Lizenzstufe `terms_by`** beschaffen (Seite antwortet mit 403).

## Fehlgriffe dieses Durchgangs, damit sie nicht zurückkommen

- **`plantcat_6` / `plantcat_7` im Schweizer Register heißen „Pumpspeicherkraftwerk" und
  „Speicherkraftwerk" und sind Wasserkraft.** Eine Stichwortsuche nach „Speicher" findet sie.
- **Swissolars „Grossregionen"-Abbildung ist eine Umfrage zu Markterwartungen** (n=8–39), kein
  installierter Bestand.
- **Das PDF zur „Meldung von Batteriespeichern" auf `energie360.de` ist das deutsche MaStR**, trotz
  des schweizerisch klingenden Domainnamens.
- **`energieleveren.nl/assets/data/open-data-energieleveren.csv` liefert HTML**, nicht die Datei.
  Der echte Pfad liegt auf `prd.content-energieleveren-nl.pages.dev`.
- **Die niederländische Speicherleistung ist kW, nicht kWh.** Wer die MW-Spalten als Kapazität
  liest, bekommt eine Zahl, die um etwa den Faktor zwei danebenliegt und plausibel aussieht.
- **Die Gemeindekarten auf energieleveren.nl sind JPEG.** Sie sehen wie eine Datenebene aus.
- **Ein Null-Ergebnis einer Suchfunktion belegt nichts ohne Kontrollbegriff.** Bei Klimaatmonitor
  war „batterij" leer — und „zonnestroom" auch.
- **opendata.swiss und i14y antworten Werkzeugen ohne Browser-Kennung mit 403.** Ein 403 ist kein
  Beleg für Nichtexistenz.

---

# Quellenverzeichnis

## Schweiz

| Quelle | Adresse | Status |
|---|---|---|
| Anlagenregister, STAC-Eintrag | `data.geo.admin.ch/api/stac/v0.9/collections/ch.bfe.elektrizitaetsproduktionsanlagen/items` | GEPRÜFT 23.09.2026 |
| Anlagenregister, CSV | `data.geo.admin.ch/ch.bfe.elektrizitaetsproduktionsanlagen/elektrizitaetsproduktionsanlagen/elektrizitaetsproduktionsanlagen_2056.csv.zip` | GEPRÜFT, 19.195.387 Byte, 339.499 Zeilen |
| Vollständiger Geodaten-Katalog | `data.geo.admin.ch/api/stac/v0.9/collections` | GEPRÜFT, 513 Collections, 46× ch.bfe |
| Minimales Geodatenmodell v1.0 | `pubdb.bfe.admin.ch/de/publication/download/10449` | GEPRÜFT, PDF selbst geladen |
| opendata.swiss Katalogsuche | `opendata.swiss/api/3/action/package_search` | GEPRÜFT, 11 Stichwörter |
| opendata.swiss Datensatz-Metadaten | `opendata.swiss/api/3/action/package_show?id=elektrizitatsproduktionsanlagen` | GEPRÜFT |
| Energie Reporter | `opendata.geoimpact.ch/energiereporter/energyreporter_latest.zip` | GEPRÜFT, 153.587 Byte |
| Statistik Sonnenenergie 2024 | `swissolar.ch/03_angebot/news-und-medien/statistik-sonnenenergie/12222-20250703_statistik_sonnenenergie_2024_bericht_de_final.pdf` | GEPRÜFT, 858.566 Byte |
| Swissolar Batteriebericht 2025 | `swissolar.ch/02_markt-politik/batteriesmonitor/130525_batteriespeicher_bericht_sws.pdf` | GEPRÜFT, 5.451.758 Byte |
| Pronovo, Meldung nachträglicher Speicher | `pronovo.ch/news/meldung-von-nachtraeglich-eingebauten-speichern/` | GEPRÜFT |
| Pronovo Formulare | `pronovo.ch/de/services/formulare/` | GEPRÜFT (nur Titel, keine Feldinhalte) |
| Pronovo Downloads | `pronovo.ch/de/service/downloads/` | HTTP 404 |
| opendata.swiss Nutzungsbedingungen | `opendata.swiss/de/terms-of-use` | HTTP 403, UNGEPRÜFT |
| BKW, Speicher und Stromnetz | `bkw.ch/.../batteriespeicher-und-stromnetz-was-sie-wissen-sollten` | recherchiert, nicht am Original |
| i14y Metadatenkatalog | `i14y.admin.ch/de/catalog/datasets` | teilweise, Suche nicht ansteuerbar |

## Niederlande

| Quelle | Adresse | Status |
|---|---|---|
| energieleveren.nl Inzicht | `energieleveren.nl/inzicht` | GEPRÜFT 23.09.2026, im Browser gelesen |
| energieleveren.nl offene Daten | `prd.content-energieleveren-nl.pages.dev/data/open-data-energieleveren.csv` | GEPRÜFT, 10.571 Byte, 96 Zeilen |
| Netbeheer Nederland, Meldepflicht | `netbeheernederland.nl/artikelen/nieuws/meld-thuisbatterijen-aan-op-energieleverennl` | GEPRÜFT |
| EDSN, Batterien registrieren | `edsn.nl/nieuws/thuisbatterijen-registreren/` | GEPRÜFT |
| CBS 85929NED, Dimensionen | `opendata.cbs.nl/ODataApi/odata/85929NED` | GEPRÜFT, 2 Dimensionen, keine Region |
| CBS 85929NED, Tabellenkopf | `opendata.cbs.nl/ODataApi/odata/85929NED/TableInfos` | GEPRÜFT |
| CBS Longread Batteriestatistik | `cbs.nl/nl-nl/longread/aanvullende-statistische-diensten/2025/ontwikkeling-statistiek-over-batterijen-voor-opslag-van-elektriciteit` | GEPRÜFT, 19.12.2025 |
| Liander offene Daten | `liander.nl/over-ons/open-data` | GEPRÜFT, 12 Datensätze, keiner zu Speicher |
| Erste Kammer, Vorlage 36611 | `eerstekamer.nl/wetsvoorstel/36611_wet_beeindiging` | GEPRÜFT |
| Klimaatmonitor Kerndatensatz | `klimaatmonitor.databank.nl/dashboard/kerndataset` | GEPRÜFT (Struktur) |
| Klimaatmonitor Suche | `klimaatmonitor.databank.nl/zoeken` | defekt, Kontrollbegriff belegt es |
| Klimaatmonitor Viewer, Gesamtbestand | — | UNGEPRÜFT |
| Enexis, Stedin offene Daten | — | UNGEPRÜFT |
| RVO | — | UNGEPRÜFT; kein nationales Heimspeicher-Förderprogramm bekannt |
