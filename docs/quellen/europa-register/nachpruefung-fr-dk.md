# Nachprüfung Frankreich und Dänemark — die Kleinanlagen-Lücke

**Erhoben am 23.09.2026.** Auftrag: In `west-sued.md` (Frankreich) und `nord-ost-uk.md`
(Dänemark) steht je ein Befund, der die private Aufdachanlage betrifft und auf ungeprüften
Spuren beruht. Beide Befunde sind nachgeprüft worden — **beide waren zu pessimistisch.**

**Die Kurzfassung:**

| | bisher angenommen | gemessen |
|---|---|---|
| **Frankreich** | unter 36 kW eine Zeile je Gemeinde, keine Zeitachse | **IRIS-Ebene, neun Jahrgänge 2017–2025**, 1,14 Mio Anlagen, keine Untergrenze |
| **Dänemark** | Solar-Einzelanlagen erst ab 1 MW, darunter Gemeindesummen | Gemeindeebene mit **Anzahl UND Leistung je Größenklasse, acht Jahresstände 2018–2026** |

Jede Aussage unten ist als `GEPRÜFT` (selbst abgerufen, mit Datum) oder `UNGEPRÜFT`
gekennzeichnet. Ein gescheiterter Abruf steht mit seinem Grund da und gilt nicht als Beleg
für Nichtexistenz.

---

## Frankreich

### 1. Der Fund: Anlagenzahl je IRIS, neun Jahrgänge

**`GEPRÜFT` 23.09.2026, eigene Abfrage über die offene Schnittstelle.** Es gibt bei ODRÉ
einen eigenen Datensatz **je Jahrgang**, der genau die Anlagen zählt, die im Hauptregister
nur aggregiert erscheinen: *Nombre d'installations de production et de stockage
d'électricité de moins de 36 kW par IRIS.*

Neun Jahrgänge, alle selbst abgefragt (`select=count(*), sum(nbinstallations),
count(distinct codeinseecommune), count(distinct codeiris)`):

| Stichtag | Zeilen | Anlagen | Gemeinden | IRIS-Gebiete |
|---|---|---|---|---|
| 31.12.2017 | 44.078 | 378.480 | 29.400 | 36.713 |
| 31.12.2018 | 46.075 | 403.585 | 30.718 | 37.088 |
| 31.12.2019 | 48.551 | 430.501 | 31.167 | 38.889 |
| 31.12.2020 | 51.215 | 464.548 | 31.548 | 39.245 |
| 31.12.2021 | 63.204 | 519.781 | 32.012 | 40.337 |
| 31.12.2022 | 62.206 | 586.322 | 32.246 | 40.935 |
| 31.12.2023 | 48.960 | 770.345 | 32.759 | 42.848 |
| 31.12.2024 | 56.162 | 973.970 | 31.233 | 43.284 |
| **31.12.2025** | **68.866** | **1.139.713** | **31.472** | **43.452** |

Dataset-Kennungen (alle `GEPRÜFT`, HTTP 200):
`nombre-installation-production-stockage-electricite-31122017` … `-31122022`,
`nombre-installation-production-stockage-electricite` (= Stand 31.12.2023),
`-31122024`, `-3112025`.

**IRIS ist die Ebene unterhalb der Gemeinde** (rund 2.000 Einwohner, von der INSEE
geführt) — feiner als alles, was das deutsche Anlagenregister für uns hergibt.

### 2. Warum das die Lücke schließt

**Es gibt keine Datenschutz-Untergrenze** — `GEPRÜFT`: `min(nbinstallations)` ist in allen
geprüften Jahrgängen **1** (2022, 2023, 2025 einzeln abgefragt). Eine Gemeinde mit einer
einzigen Anlage steht mit dieser einen Anlage drin.

**Die Gemeindeebene ist vollständig, die IRIS-Ebene nur dort, wo es IRIS gibt.** `GEPRÜFT`:
Im Jahrgang 2025 tragen 25.164 der 68.866 Zeilen **keinen** IRIS-Schlüssel — das sind die
Gemeinden, die die INSEE gar nicht unterteilt (IRIS gibt es erst ab rund 5.000 Einwohnern).
Diese Zeilen tragen den Gemeindeschlüssel. Auf Gemeindeebene geht also nichts verloren.

**Die Rechtsgrundlage steht in der Datensatzbeschreibung** (`GEPRÜFT`, Wortlaut):

> „Dans le cadre de l'arrêté du 7 juillet 2016 (cf PJ), ce nombre d'installation par maille
> IRIS doit être rendu public."

Die Veröffentlichung ist also vorgeschrieben, nicht freiwillig — das spricht für Fortbestand.

### 3. Was der Datensatz NICHT kann

**Keine Technik-Trennung und keine Leistung.** `GEPRÜFT` — die Feldliste ist vollständig:
`codeiris, codeinseecommune, commune, code_insee_epci, epci, codedepartement, departement,
coderegion, region_maj, nbinstallations`. Mehr steht nicht drin. Es ist eine reine Zählung
aller Techniken unter 36 kW.

**Das ist für unseren Zweck fast folgenlos, und zwar gemessen.** Aus dem Hauptregister,
gruppiert über alle Aggregatzeilen (`GEPRÜFT` 23.09.2026):

| filière | Aggregatzeilen | Anlagen < 36 kW | Leistung |
|---|---|---|---|
| **Solaire** | 33.722 | **1.182.942** | 6.152.184 kW |
| Hydraulique | 15 | 309 | 24.357 kW |
| Eolien | 9 | 143 | 5.654 kW |
| Bioénergies | 7 | 108 | 4.176 kW |
| Autre | 5 | 84 | 704 kW |
| Thermique non renouvelable | 1 | 11 | 275 kW |

**Nicht-Solar sind 655 von 1.183.597 Anlagen — 0,055 %.** Wer die IRIS-Zählung als
Photovoltaik-Zählung liest, irrt sich um ein Zwanzigstel Promille. Das gehört als Vorbehalt
an die Zahl, ändert aber nichts an der Brauchbarkeit.

### 4. Zubau: aus der Differenz — und das ist hier kein Notbehelf

Die Vorrecherche nennt die Differenz zweier Jahresarchive als Ausweg und klingt dabei
entschuldigend. **Gemessen ist es eine saubere Reihe aus derselben Erhebung mit demselben
Schlüssel.** Gegenprobe an Bordeaux (INSEE 33063), alle Werte `GEPRÜFT`:

| Stand | Kleinanlagen in Bordeaux | IRIS-Zeilen |
|---|---|---|
| 31.12.2017 | 276 | 69 |
| 31.12.2020 | 307 | 68 |
| 31.12.2022 | 368 | 69 |
| 31.12.2023 | 494 | 71 |
| 31.12.2024 | 670 | 73 |
| 31.12.2025 | 811 | 73 |

Zubau 2025 = 141 Anlagen. **Gegenprobe zum Hauptregister:** Dort stehen für Bordeaux (Stand
31.07.2026) fünf Solar-Aggregatzeilen mit zusammen 848 Anlagen (`GEPRÜFT`, Einzelzeilen
gelesen: 790 + 20 + 15 + 12 + 11). 811 zum 31.12.2025 gegen 848 sieben Monate später ist
konsistent.

**Ein Vorbehalt, der bleibt:** Die Zeilenzahl je Jahrgang ist nicht monoton (2022: 62.206,
2023: 48.960, 2025: 68.866), und die Zahl der Gemeinden schwankt (32.759 in 2023, 31.233 in
2024). Die IRIS-Gliederung ist also **zwischen den Jahrgängen nicht stabil**. Auf
Gemeindeebene aufsummiert ist der Vergleich belastbar; ein IRIS-genauer Zubau-Vergleich ist
es nicht ohne weitere Prüfung — `UNGEPRÜFT`, woher die Schwankung kommt.

### 5. Das Hauptregister kann mehr, als bisher hier stand

Die bisherige Formulierung „darunter genau eine Zeile je Gemeinde" ist **widerlegt**
(`GEPRÜFT` 23.09.2026):

- **33.722 Solar-Aggregatzeilen verteilen sich auf 20.722 Gemeinden** — im Schnitt 1,6
  Zeilen je Gemeinde.
- Der Grund ist an Bordeaux abgelesen: Ein Teil der Aggregate ist **auf IRIS-Ebene**
  gebildet (`codeiris` gesetzt), der Rest fällt in eine Gemeinde-Restzeile.
- **Jede Aggregatzeile trägt Technik und Leistung.** Beispielzeile Ribagnac (24351),
  vollständig gelesen: `filiere: Solaire`, `technologie: Photovoltaïque`,
  `puismaxinstallee: 87.54`, `nbinstallations: 15`, `energieannuelleglissanteinjectee:
  63459`.

**Was die Aggregatzeile NICHT hergibt, ist die Zeitachse.** Ihr `datemiseenservice` ist ein
einzelnes Datum für die ganze Gruppe (Ribagnac: 22.07.2010; Bordeaux-Restzeile: 12.01.2007)
— ersichtlich das älteste, nicht das jüngste, und für einen Jahreszubau unbrauchbar.
Dafür ist der IRIS-Zähldatensatz aus Abschnitt 1 zuständig.

Stand des Hauptregisters: **31.07.2026**, verarbeitet 10.09.2026, 140.539 Zeilen (`GEPRÜFT`).

### 6. Enedis Open Data — der wichtigste ungeprüfte Kandidat, geprüft

**Das Portal ist umgebaut und die alte Schnittstelle ist abgeschaltet** (`GEPRÜFT`
23.09.2026). Das ist für jeden wichtig, der die Vorrecherche-Adressen weiterverwendet:

- `https://data.enedis.fr/api/explore/v2.1/...` → **HTTP 301** auf einen Pfad, der 404 gibt.
- `https://opendata.enedis.fr/api/explore/v2.1/...` → **HTTP 410** mit dem Wortlaut „Cette
  couche de compatibilité pour la version d'API précédente ne supporte pas cette requête."
- Die alte v1-API → HTML-Fehlerseite.

**Die heutige Adresse ist `https://opendata.enedis.fr/data-fair/api/v1/datasets`**
(`GEPRÜFT`, HTTP 200, **317 Datensätze**). Das Portal läuft jetzt auf *data-fair*, nicht
mehr auf Opendatasoft.

**Die vier im Auftrag genannten Datensätze, einzeln geprüft:**

**a) „Production d'électricité annuelle par filière à la maille IRIS"** — existiert, Kennung
`swbjpp-d0-3539oclq0pkgjw`, 283.857 Zeilen, Licence Ouverte 2.0 (`GEPRÜFT`). **Die Felder
sind genau die, die man sich wünscht:**

```
annee, code_iris, type_iris, code_commune, code_epci, code_departement, code_region,
domaine_de_tension,
nb_sites_photovoltaique_enedis, energie_produite_annuelle_photovoltaique_enedis_mwh,
nb_sites_eolien_enedis, ... (dito für hydraulique, bio_energie, cogeneration, autres)
```

Also: **Anzahl PV-Anlagen und erzeugte Energie je IRIS, je Jahr, nach Spannungsebene**.

**Und der Haken, im Original gelesen:** Die Reihe endet **2016**. Die Beschreibung sagt
(`GEPRÜFT`, Wortlaut):

> „À partir de l'année 2017, les données sont présentées annuellement dans des jeux de
> données distincts accessibles via ce lien."

Der Link darin (`GEPRÜFT`, aus dem Roh-HTML extrahiert) zeigt auf
`https://opendata.enedis.fr/?q=registre` — also auf die **Registerdatensätze**, nicht auf
eine Fortsetzung der IRIS-Produktionsreihe. **Die Reihe mit PV-Anlagenzahl und Erzeugung je
IRIS ist eingestellt und durch das Register ersetzt worden.** Eine Suche im Enedis-Katalog
nach `filiere`, `filière`, `annuelle`, `nombre de sites`, `IRIS`, `commune`, `solaire`,
`photovolta`, `producteur`, `autoconsommation`, `production` förderte **keine** Fassung ab
2017 zutage (`GEPRÜFT`, zehn Suchläufe).

Zum Vergleich: Die **Verbrauchs**reihe derselben Bauart läuft weiter („Consommation et
thermosensibilité annuelles d'électricité par secteur d'activité à la maille IRIS **de 2011
à 2024**", 5.146.108 Zeilen). Bei der Produktion wurde die Fortführung bewusst aufgegeben.

**b) „Installations de production et de stockage d'électricité (2017…2025)"** — existiert
als neun Jahrgänge (`GEPRÜFT`, 2025er mit 115.520 Zeilen). **Kein Zugewinn:** Das ist
dasselbe Register, auf das Enedis-Netz gefiltert. Die Beschreibung sagt es selbst
(`GEPRÜFT`, Wortlaut): „Le fichier ci-joint présente uniquement les installations […]
raccordées au réseau exploité par Enedis". Dieselben Felder wie das ODRÉ-Register.

**c) „Installations de production raccordées au réseau" / „Producteurs d'électricité par
commune"** — unter diesen Namen im Enedis-Katalog **nicht gefunden** (`GEPRÜFT`, Suchläufe
`producteur` und `production`). Was es unter dem ersten Namen gibt, ist die Registerreihe
aus (b).

**d) Sonstige Enedis-Datensätze mit Leistungsklassen** — „Parc de production – Tranches de
puissance et modalités d'injection" gibt es in vier Fassungen (Répartition, Évolution
trimestrielle, Historiques cumulés, Dernier historique connu), aber die Mengengerüste
(249 bis 8.532 Zeilen) zeigen, dass sie **nicht** auf Gemeindeebene liegen — `UNGEPRÜFT`,
welche Ebene genau, weil die Zeilenzahl eine Gemeindeebene ausschließt (11.000 Gemeinden ×
Klassen wären fünfstellig).

### 7. ODRÉ, data.gouv.fr, RTE, Agence ORE

**ODRÉ** (`https://odre.opendatasoft.com/api/explore/v2.1/...`) läuft weiter auf
Opendatasoft, offene API ohne Schlüssel, **187 Datensätze** (`GEPRÜFT`, beide Katalogseiten
gelesen). Das ist die Quelle für alles oben Genannte. Herausgeber laut Metadaten: RTE,
Enedis, EDF SEI und rund 70 lokale Netzbetreiber (ELD), namentlich in der Beschreibung.

**data.gouv.fr** spiegelt die ODRÉ-Datensätze und liefert nichts Eigenes (`GEPRÜFT`, Suche
nach „installations production electricite IRIS" → 9 Treffer, alle mit Herausgeber „Open
Data Réseaux Énergies"; „photovoltaique commune" und „autoconsommation photovoltaique" →
je 0 Treffer).

**RTE** ist als Herausgeber des nationalen Registers bereits die Quelle des Hauptdatensatzes
(Rechtsgrundlage `article L142-9-1 du code de l'énergie`, `GEPRÜFT` in der
Datensatzbeschreibung). Eine feinere RTE-eigene Aufschlüsselung wurde nicht gefunden —
RTE betreibt das Übertragungsnetz, Kleinanlagen hängen definitionsgemäß nicht daran.

**Agence ORE** läuft ebenfalls auf data-fair
(`https://opendata.agenceore.fr/data-fair/api/v1/datasets`, `GEPRÜFT`). Ein Fund ist
bemerkenswert und taugt trotzdem nicht: **„Registre des productions agrégé"**
(`sbsqvualkw7k0yv200iz555m`, 14.083 Zeilen, aktualisiert 22.09.2026) trägt die Felder
`date_raccordement, commune, code_insee, filiere, pmax_installee_kw,
nb_installations_par_date, installations_cumulees` — **eine echte Zeitachse je Gemeinde und
Anschlussdatum.** Genau die Form, die in Frankreich landesweit fehlt. Aber die Beschreibung
sagt (`GEPRÜFT`, Wortlaut): „Ce registre présente les installations […] raccordées […] au
réseau public d'électricité du GRD **Strasbourg Electricité Réseaux**." Es gilt für einen
einzigen lokalen Netzbetreiber. Es zeigt, dass es technisch ginge — mehr nicht.

### 8. Lizenz Frankreich

**Licence Ouverte v2.0 (Etalab)** für alle genannten Datensätze — `GEPRÜFT` in den
Metadaten jedes einzelnen (`license: "Licence Ouverte v2.0 (Etalab)"`, `license_url:
https://www.etalab.gouv.fr/wp-content/uploads/2017/04/ETALAB-Licence-Ouverte-v2.0.pdf`).

**Der Lizenztext ist am 23.09.2026 im Original heruntergeladen und gelesen worden**
(PDF, 4 Seiten, HTTP 200 — die HTML-Seite `etalab.gouv.fr/licence-ouverte-open-licence/`
leitet inzwischen auf data.gouv.fr um, das PDF ist der verlässliche Weg). Wortlaut:

> „Le « Réutilisateur » est libre de réutiliser l'« Information » : de la reproduire, la
> copier, de l'adapter, la modifier, l'extraire et la transformer, pour créer des
> informations dérivées […] **de l'exploiter à titre commercial**, par exemple en la
> combinant avec d'autres informations, ou en l'incluant dans son propre produit ou
> application.
>
> Sous réserve de : **mentionner la paternité** de l'« Information » : sa source (au moins
> le nom du « Concédant ») et **la date de dernière mise à jour** de l'« Information »
> réutilisée."

Drei Dinge folgen daraus und werden gern übersehen: **kommerzielle Nutzung ist
ausdrücklich erlaubt**; geschuldet ist die Quellenangabe **und das Datum des letzten
Stands**; die Lizenz ist laut eigenem Text kompatibel mit CC BY („compatible avec […]
« Creative Commons Attribution » (CC-BY)").

---

## Dänemark

### 1. Der Geodatendienst — gefunden

Die Vorrecherche hat ihn nicht gefunden und eine falsche Adresse vermutet. Er existiert,
und er liegt **nicht** bei plandata.dk, sondern unter der Kartenanwendung selbst.

**`GEPRÜFT` 23.09.2026, im Browser bedient und die Aufrufe mitgelesen:**

```
https://www.sologvindinfo.dk/wms?servicename=ve-info&service=WMS
    &request=GetCapabilities&version=1.1.1
```

→ HTTP 200, 276.071 Byte Capabilities, **ohne Sitzung, ohne Schlüssel**. Der Parameter
`servicename=ve-info` ist zwingend; ohne ihn antwortet der Dienst mit
`ServiceException: servicename parameter missing` (`GEPRÜFT`).

**Wie er gefunden wurde** — das gehört dazu, weil der Weg wiederholbar sein muss: Die
Kartenanwendung ist eine „cbkort"-Installation; ihre Ebenenliste
(`/rest/profile/ve-info/themes/active`) antwortet mit **HTTP 401**, auch aus dem
angemeldeten Browser heraus, und `POST /spatialmap?page=legend-data-json` mit
`InvalidSessionException` (beides `GEPRÜFT`). Geliefert hat den Servicenamen erst der
Quelltext der geladenen Seite: die Legendenbilder tragen ihn in der Adresse
(`…&layer=theme-ve_sol_kom_stat_legend_i1&…&servicename=ve-info`).

### 2. Was dahinterliegt: mehr als eine Kapazitätssumme

Die Karte hat je Ebene eine Tabellenansicht („Ad-hoc tabelvisning af data inden for det
aktuelle kortudsnit"). **Sie wurde geöffnet und ausgelesen** (`GEPRÜFT` 23.09.2026). Die
Ebene heißt intern `ve_sol_kom_stat_wfs` und trägt elf Spalten:

```
shape_wkt, kommune, komnr,
kw_total, kw_smaa, kw_mellem, kw_store,
anl_total, anl_smaa, anl_mellem, anl_store
```

**Das ist Anzahl UND Leistung, getrennt nach drei Größenklassen, je Gemeinde** — deutlich
mehr als die „Gemeindesummen je Monat", von denen die Vorrecherche ausging. Die Klassen
stehen im Wortlaut auf ens.dk (`GEPRÜFT`): „Anlæg med en kapacitet på **max 10 kW** (fx små
taganlæg)" · „Anlæg med en kapacitet **mellem 10-1.000 kW** (fx større taganlæg)" · „Anlæg
med en kapacitet på **1.000 kW og derover**".

Gelesene Einzelwerte (aktueller Stand, `GEPRÜFT`):

| Gemeinde | anl_total | anl_smaa | kw_total | kw_smaa |
|---|---|---|---|---|
| Vesthimmerlands | 1.574 | 1.414 | 46.583 | 7.721 |
| Lemvig | 979 | 888 | 135.668 | 4.781 |
| Skanderborg | 2.381 | 2.143 | 20.798 | 10.688 |
| Hedensted | 2.980 | 2.781 | 72.884 | 13.645 |

**Landessumme über alle 99 Zeilen, selbst addiert** (`GEPRÜFT`): **171.849 Anlagen, davon
153.649 mit höchstens 10 kW**; **5.404.862 kW** installiert, davon 803.346 kW in der
Kleinanlagen-Klasse. Kleinanlagen sind damit **89 % aller Anlagen und 15 % der Leistung**.

Stand laut Tooltip der Ebene (`GEPRÜFT`, Wortlaut): „Nettilsluttede solcelleanlæg opgjort på
kommuneniveau og kapacitet. **Opdateret april 2026.**"

**Gegenprobe gegen eine unabhängige Zahl:** Eine Pressemitteilung nennt für den 31.03.2025
156.740 netzangeschlossene Anlagen mit 4.200 MW (`UNGEPRÜFT` — Sekundärquelle, nicht im
Original gelesen). Unsere gemessenen 171.849 Anlagen / 5.405 MW für April 2026 liegen ein
Jahr später und passen zur Richtung.

### 3. Die Zeitachse: acht Stände, 2018 bis heute

**`GEPRÜFT` 23.09.2026.** Die WMS-Capabilities führen neben der aktuellen Ebene sieben
Jahresstände:

```
theme-ve_sol_kom_stat            „Solcelleanlæg på kommuneniveau"  (April 2026)
theme-ve_sol_kom_stat_2018 … _2024  „Primo 2018" … „Primo 2024"
theme-ve_sol_kom_stat_2018-kopi … _2024-kopi  (zweite Fassung derselben Stände)
theme-ve_sol_grp_3               „Store solcelleanlæg"
theme-ve_sol_pot_tage / _tagflade  Sonneneinstrahlung auf Dächer/Dachflächen
```

ens.dk sagt dazu im Wortlaut (`GEPRÜFT`): die Ebene „Solcelleanlæg udvikling pr. år" „viser
den historiske kommunestatistik **pr. 1. januar fra 2018 og frem**".

**Entscheidend: Die Jahresstände tragen dieselben Spalten.** Der Jahrgang 2018 wurde
geöffnet — Dialogtitel `Ad-hoc tabelvisning: Solcelleanlæg primo 2018
(ve_sol_kom_stat_201801_wfs)`, Tooltip „Nettilsluttede solcelleanlæg opgjort på
kommuneniveau og kapacitet. **Januar 2018.**" — und ausgelesen (`GEPRÜFT`):

| | primo 2018 | April 2026 | Faktor |
|---|---|---|---|
| Anlagen gesamt | 97.434 | 171.849 | 1,8 |
| davon ≤ 10 kW | 94.194 | 153.649 | 1,6 |
| Leistung gesamt | 904.364 kW | 5.404.862 kW | 6,0 |
| Vesthimmerlands | 1.056 Anlagen / 5.951 kW | 1.574 / 46.583 kW | |
| Lemvig | 728 / 39.466 kW | 979 / 135.668 kW | |

**Damit gibt es für Dänemark eine Zubau-Reihe je Gemeinde**, acht Stützstellen, aus einer
einheitlichen Erhebung. Die Namensystematik `ve_sol_kom_stat_YYYYMM_wfs` legt nahe, dass
jeder Jahrgang als eigene Ebene ansprechbar ist — `UNGEPRÜFT` für die Jahrgänge 2019–2024,
geprüft nur an 2018.

### 4. Zugang: kein offener WFS gefunden

Der interne Ebenenname endet auf `_wfs`, ein öffentlich erreichbarer WFS wurde jedoch
**nicht** gefunden. Fünf Adressen geprüft (`GEPRÜFT` 23.09.2026):

| Adresse | Antwort |
|---|---|
| `sologvindinfo.dk/wfs?servicename=ve-info&service=WFS&request=GetCapabilities` | HTTP 404 |
| `sologvindinfo.dk/wms?servicename=ve-info&service=WFS&request=GetCapabilities` | HTTP 404 |
| `sologvindinfo.dk/geoserver/wfs` | HTTP 404 |
| `geoserver.sologvindinfo.dk/geoserver/wfs` | keine Verbindung |
| `kort.plandata.dk/geoserver/wfs` | HTTP 404 |

**Der plandata-WFS existiert und führt die Solaranlagen nicht.**
`https://geoserver.plandata.dk/geoserver/wfs?service=WFS&request=GetCapabilities` antwortet
mit HTTP 200 und 211 Ebenen (`GEPRÜFT`); die einzigen Treffer auf „sol" sind
Bebauungsplan-Ebenen (`pdk:theme_pdk_lokalplan_vedtaget_solcelle` und fünf weitere), nicht
die Anlagenstatistik. Die Empfehlung auf ens.dk, die Webservices über plandata.dk zu
beziehen, führt für diese Daten also ins Leere.

**Was bleibt:** der WMS (Bilder und Legenden, offen abrufbar) und der Tabellenexport in der
Kartenanwendung („Eksportér valgte rækker", Excel). Bei 99 Zeilen je Jahrgang und acht
Jahrgängen ist das Handarbeit, aber überschaubar. Der Tabellenaufruf selbst läuft über
`POST /spatialmap?page=spatialanalyze` und braucht eine Sitzung — für einen automatischen
Abruf müsste man die Sitzung nachbilden, was `UNGEPRÜFT` und heikel ist.

### 5. Warum Wind einzeln und Solar nicht — keine Begründung gefunden

**`GEPRÜFT` 23.09.2026, ens.dk/energikilder/solenergi im Volltext gelesen: Die Seite nennt
keinen Grund.** Sie beschreibt, dass Einzelanlagen erst ab 1 MW gezeigt werden und darunter
auf Gemeindeebene aggregiert wird, ohne Datenschutz, Personendaten oder DSGVO zu erwähnen.

**Ein Stammdatenregister für Solar existiert**, im Wortlaut (`GEPRÜFT`):

> „Energistyrelsen offentliggør i samarbejde med Plan- og Landdistriktsstyrelsen
> **stamdata for nettilsluttede solcelleanlæg** i Danmark."

Es ist also nicht so, dass es die Einzeldaten nicht gäbe — sie werden in dieser Form nicht
veröffentlicht. **Damit ist die Frage offen, nicht beantwortet**, und eine Anfrage an
Energistyrelsen ist der einzige Weg, sie zu klären. Das wäre Außenkontakt und damit eine
Entscheidung des Betreibers.

Ein Vorbehalt der Behörde, der für jede Auswertung zählt und aus der Vorrecherche
übernommen wird (dort `GEPRÜFT`): „større anlæg, der er beliggende på samme adresse, vises
som samlede anlæg" — Großanlagen an derselben Adresse werden zusammengefasst gezählt.

### 6. Energi Data Service: vollständig durchgesehen, nichts Feineres

**`GEPRÜFT` 23.09.2026.** Der Metadaten-Endpunkt ist
`https://api.energidataservice.dk/meta/dataset` (die naheliegenden `/datasets` und
`/dataset` antworten mit HTTP 404). Er liefert **100 Datensätze**; auch mit `?limit=500`
bleiben es 100.

Alles mit Solar- oder Gemeindebezug durchgesehen. Zwei Datensätze sind einschlägig:

- **`CapacityPerMunicipality`** — bereits bekannt: Gemeinde × Monat, `SolarPowerCapacity`
  und `NumberSolarPanels`. **Keine Größenklassen, keine Einzelanlagen.**
- **`DatahubMeasuringPointStatisticsMunicipality`** — neu gefunden. Zählt Messpunkte je
  Gemeinde und Monat nach Typ, Status und Ablesefrequenz. Eine gelesene Zeile
  (`GEPRÜFT`): `{"Month":"2026-08-01","MunicipalityNo":"101","MP_TypeDescription":
  "Production","MP_PhysicalStatusDescription":"New","Number_MP":4}`. **Kein Solarbezug** —
  „Production" umfasst jede Erzeugungsart. Als Zubau-Anzeiger („neue Produktions-Messpunkte
  je Gemeinde und Monat") interessant, als Solarzahl unbrauchbar.
- `ReCoverageMunicipality` (EE-Deckung je Gemeinde) und `PrivateConsumptionHeatingMonth`
  (Verbrauch je Gemeinde) betreffen den Verbrauch, nicht den Anlagenbestand.

**Ergebnis: Energi Data Service liefert nichts, was die Kartendaten nicht besser können.**
Sein Vorzug bleibt die Lizenz (siehe unten) und die monatliche Frequenz.

### 7. Danmarks Statistik: keine Solar-Tabelle je Kommune

**`GEPRÜFT` 23.09.2026** über die Statistikbank-Schnittstelle
(`POST https://api.statbank.dk/v1/tables`, HTTP 200, **2.309 Tabellen** vollständig
durchsucht). Keine einzige Tabelle zu Solaranlagen, Solarkapazität oder Anlagenzahl je
Kommune.

Was es gibt und was nicht reicht:
- `ENEGEO` „Industriens energiforbrug" — Variable `kommune`, aber **Verbrauch der
  Industrie**, nicht Erzeugung.
- `LABY33` „Nøgletalstabel for energiforbrug og -produktion" — Variable
  **`kommunegruppe`**, nicht `kommune`. Gemeindegruppen, keine einzelnen Gemeinden.
- `SDG07021`, `TEMA9003` — EE-Anteil am Bruttoenergieverbrauch, Landesebene.

Das ist ein sauberer Negativbefund: **Der dänische Weg zu Solarzahlen je Gemeinde führt
über die Energiebehörde, nicht über das Statistikamt.**

### 8. Lizenz Dänemark — ungeklärt, und das ist der schwächste Punkt

**Die Kartenanwendung nennt in ihrer Fußzeile (`GEPRÜFT`, im Browser gelesen):**

> „(CC BY) Klimadatastyrelsen, © Energistyrelsen"

**Das ist keine Lizenzangabe für die Solardaten, sondern eine gemischte Zeile.**
Klimadatastyrelsen ist das Vermessungsamt und liefert die Kartengrundlage — das CC BY
bezieht sich der Stellung nach auf sie. Die Solardaten stehen unter „© Energistyrelsen", und
ein Copyright-Zeichen ist gerade **keine** offene Lizenz.

Geprüft und nicht gefunden (alles `GEPRÜFT` 23.09.2026):
- `plandata.dk/om-plandata/vilkaar-og-betingelser` → HTTP 404.
- `plandata.dk/webservices` nennt keine Lizenz und keine konkreten Dienstadressen.
- `datavejviser.dk` (dänischer Datenkatalog) bietet keine CKAN-Schnittstelle unter
  `/api/3/action/package_search` → HTTP 404, also kein maschineller Lizenzabruf.
- ens.dk/energikilder/solenergi nennt keine Nutzungsbedingungen.

**Demgegenüber steht Energi Data Service mit einer im Original geprüften Lizenz**
(aus der Vorrecherche, dort `GEPRÜFT`): CC BY 4.0, „Users may copy, change and distribute
data freely, **even for commercial purposes**", Quellenangabe „Source: Energinet
(www.energidataservice.dk)" und Änderungshinweis.

**Daraus folgt für die Praxis:** Die besseren Daten (Karte) haben die unklarere Lizenz, die
schwächeren Daten (Energinet) die klare. Wer die Kartendaten nutzen will, klärt die Lizenz
vorher bei Energistyrelsen — Außenkontakt, Entscheidung des Betreibers.

---

## Was offen bleibt

**Frankreich:**
- Woher die nicht-monotone Zeilen- und Gemeindezahl der IRIS-Jahrgänge kommt (2022: 62.206
  Zeilen, 2023: 48.960). Auf Gemeindeebene folgenlos, auf IRIS-Ebene zu klären, bevor man
  einen IRIS-genauen Zubau zeigt.
- Auf welcher Ebene „Parc de production – Tranches de puissance" wirklich liegt. Die
  Zeilenzahl schließt Gemeindeebene aus, geprüft ist es nicht.

**Dänemark:**
- **Die Lizenz der Solar-Kartendaten.** Der wichtigste offene Punkt; ohne sie ist eine
  Nutzung nicht vertretbar.
- Ob die Jahrgänge 2019–2024 einzeln über denselben Weg ansprechbar sind (für 2018 und den
  aktuellen Stand belegt).
- Ob sich der Tabellenabruf ohne Browser-Sitzung automatisieren lässt.
- Warum Solar-Einzelanlagen nicht veröffentlicht werden — auf den amtlichen Seiten steht
  kein Grund; nur eine Anfrage bei Energistyrelsen kann das beantworten.
