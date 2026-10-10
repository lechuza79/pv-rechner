# Was ein neuer Ländermarkt braucht — Bestandsaufnahme

**Erhoben am 26.09.2026.** Arbeitsgrundlage, mit der Markt für Markt abgearbeitet werden kann.
Es wurde nichts umgebaut; dieses Dokument erhebt und schlägt vor.

**Was hier NICHT drinsteht: das Anlagenregister.** Welche Länder Anlagendaten je Gemeinde
haben, ist erhoben und liegt in `docs/quellen/europa-register/`. Die vier aussichtsreichsten
Märkte sind **Schweiz, Niederlande, Frankreich, Portugal**, danach Österreich, Schweden,
Dänemark, Belgien (Flandern), Spanien (Katalonien/Valencia), Tschechien. Dieses Dokument
erhebt alles **andere**.

**Prüfstatus.** Jede Aussage über unseren Code ist in den Dateien nachgelesen (Dateiname
genannt). Jede Aussage über eine externe Quelle ist mit `GEPRÜFT (26.09.2026)` markiert, wenn
sie an diesem Tag selbst abgerufen wurde, sonst mit `UNGEPRÜFT`. Ein gescheiterter Abruf ist
kein Beleg dafür, dass es die Quelle nicht gibt.

---

## 1. Kurzfassung

**Der Rechner ist der kleinere Teil der Arbeit, die Gemeindeseiten sind der größere, und das
Recht ist der teuerste.** Das ist das Gegenteil der naheliegenden Erwartung.

Gezählt wurden **68 Bedarfsposten** (die Zeilen der Tabellen unter 2.1 bis 2.7, nachgezählt am
fertigen Dokument). Davon sind **16 länderneutral** — sie gelten unverändert weiter und kosten
nichts. **51 sind je Land zu beschaffen**, für jeden ist eine Quelle benannt. **Einer entfällt**,
weil es den Gegenstand anderswo nicht gibt (die Grüngas-Pflicht des GModG). Innerhalb der 51
stehen **vier benannte Lücken**, für die heute keine belastbare Quelle gefunden wurde — sie
stehen unter 2.8 ausgeschrieben.

**Die drei Befunde, die den Zuschnitt bestimmen:**

1. **Der Rechenkern trägt weiter.** Ertrag, Stundensimulation, Eigenverbrauch, Autarkie,
   Amortisation, Szenarien, Speicher-Dispatch — das sind Funktionen, keine deutschen
   Annahmen. Was ausgetauscht werden muss, sind die **Eingangsgrößen**, und die stehen fast
   alle schon an genau einer Stelle (`lib/constants.ts`, `lib/prices-config.ts`,
   `lib/consumption.ts`). Die Disziplin „eine Größe, eine Quelle", die dieses Projekt gegen
   Drift aufgebaut hat, zahlt sich hier zum ersten Mal in barer Münze aus: Die Liste der
   auszutauschenden Werte ist erstellbar, weil sie nicht verstreut ist.

2. **PVGIS liefert die Stundenreihe europaweit — das war die offene Frage und sie ist
   beantwortet.** `seriescalc` gibt 8.760 Stundenwerte mit Leistung, Einstrahlung in
   Modulebene, Temperatur und Wind, für Zürich, Amsterdam, Lissabon und Stockholm gleichermaßen
   (GEPRÜFT 26.09.2026). Damit hängt die teuerste Rechengröße nicht mehr am Deutschen
   Wetterdienst. **Die Grenze ist die Zeitachse:** PVGIS v5.3 reicht von 2005 bis 2023, unsere
   DWD-Reihen von 1991 bis 2025. Das Amortisations-Rennen hätte in einem neuen Markt ein
   19-Jahres-Fenster statt 35, und es endete zwei Jahre in der Vergangenheit.

3. **Die Gemeindeseiten scheitern nicht am Anlagenregister, sondern an der Karte.** Die
   europaweite Gemeindegrundlage von Eurostat (GISCO LAU 2024) ist fachlich ideal — 97.987
   Gemeinden in 34 Ländern mit Namen, Fläche, Einwohnerzahl und Geometrie, in einer Datei von
   5,6 MB (GEPRÜFT 26.09.2026). Und sie trägt eine Klausel, die uns ausschließt: „The
   permission to use the data is granted on condition that: **the data will not be used for
   commercial purposes**" (GEPRÜFT im Wortlaut). Seit dem Affiliate-Block sind wir eine
   kommerzielle Seite — dieselbe Lage wie bei IRENA. Der Ausweg ist national und je Markt
   verschieden (swisstopo, IGN, PDOK, DGT), also vier Importe statt einem.

**Was der Ländermarkt NICHT kostet:** Die Energie-Widgets. Energy-Charts liefert Erzeugung und
Strommix für Schweiz, Niederlande, Frankreich und Portugal in derselben Struktur, die wir für
Deutschland schon verarbeiten, unter CC BY 4.0 (GEPRÜFT 26.09.2026). Strommix, Erzeugung,
EE-Ampel und Live-Simulation portieren mit ausgetauschtem Länderschlüssel.

**Was er unerwartet kostet:** Die Börsenpreise sind **je Gebotszone verschieden lizenziert**.
CH, NL und FR liefern CC BY 4.0, **Portugal liefert den Sperrvermerk** („The utilization of any
data, whether in its raw or derived form, for external or commercial purposes is expressly
prohibited", GEPRÜFT 26.09.2026). Ein portugiesischer Markt hätte aus dieser Quelle keinen
Börsenerlös — und damit fehlt genau die Größe, aus der der Rechner nach dem Ende einer
Einspeisevergütung rechnet.

**Die Reihenfolge, die sich daraus ergibt:** Schweiz zuerst — dort sind Register, Geobasis,
Strompreis je Gemeinde und Fördersystem alle offen, kommerziell nutzbar und aktuell.
Niederlande als zweiter Markt, weil dort das Vergütungsregime am 01.01.2027 kippt und ein
Rechner genau dann gebraucht wird. Frankreich und Portugal danach, beide mit je einer harten
offenen Frage (FR: Einwohnerzahlen fehlen in der EU-Quelle, Tarifreform 2026 ungeprüft; PT:
Börsenpreis gesperrt, Inselregionen fehlen).

---

## 2. Bedarfsposten

Legende der Spalte „länderneutral?":
**neutral** = gilt unverändert weiter, kein Beschaffungsbedarf · **je Land** = auszutauschen,
Quelle benannt · **entfällt** = den Gegenstand gibt es im Zielmarkt nicht.

Manche Zeile trägt beides. Dann steht **zuerst, was Arbeit macht** — ein Verfahren, das nur
einen neuen Parameter braucht, ist trotzdem ein Beschaffungsposten, und es soll sich nicht
als kostenlos lesen. Wer nachzählt, zählt das erste Etikett je Zeile; dann kommt dieselbe
Summe heraus wie unter 2.8.

Legende „Blocker für Livegang?":
**BLOCKER** = ohne das geht die Seite nicht live · **nachreichbar** = die Seite trägt auch ohne ·
**—** = kein Beschaffungsbedarf.

### 2.1 Rechenkern PV — die geteilte Rechen-Basis

| Posten | heute in Deutschland | länderneutral? | Quelle für neue Märkte | Blocker für Livegang? |
|---|---|---|---|---|
| **Standort-Ertrag (Jahr + 12 Monate)** | `/api/pvgis` → PVGIS, gecacht in Supabase; Rückfall `NATIONAL_AVG_YIELD = 1050` und `BL_ERTRAG` je Bundesland. `lib/pvgis.ts` verwirft Koordinaten außerhalb `lat 47–55 / lon 5–16` — eine fest verdrahtete Deutschlandbox | **je Land** (Box + Rückfallwerte), **neutral** (Quelle) | PVGIS v5.3 weltweit, GEPRÜFT für Zürich/Amsterdam/Lissabon/Stockholm. Box je Markt weiten, Rückfallwerte je Region einmal aus PVGIS vorrechnen | **BLOCKER** (die Box wirft sonst jeden Nicht-DE-Ort auf den deutschen Mittelwert) |
| **Dach-Ertrag (Neigung × Ausrichtung)** | `dachErtragKwp()` / `lib/tilt-config.ts`, Matrix aus dokumentiertem PVGIS-Referenzabruf für Deutschland | **je Land** | Derselbe PVGIS-Referenzabruf an einem repräsentativen Punkt des Markts. Solargeometrie ändert sich nicht — der Lauf ist einmalig, kein Wächter | **BLOCKER** (eine deutsche Matrix auf Lissabon angewandt verfehlt Neigungsoptimum und Nord-Abschlag) |
| **Stündliche Jahressimulation** | `simulateSolarYear` / `simulatePvYear` auf PVGIS-Monatswerten + Lastprofil | **neutral** (Verfahren) | — | — |
| **Stündliche Erzeugungsreihe je Ort** | aus PVGIS-Monatswerten modelliert | **neutral**, mit Zugewinn | PVGIS `seriescalc` liefert echte Stundenwerte (8.760 Zeilen mit `P`, `G(i)`, `T2m`, `WS10m`), GEPRÜFT. Jahre **2005–2023**, Strahlung SARAH3, Meteorologie ERA5 | nachreichbar |
| **Lastprofil Haushalt (Stunde × Monat)** | `calcHourlyConsumption` (`lib/consumption.ts`): BDEW H0 Tag/Nacht-Form, saisonaler Faktor, dazu eigene Profile für Wärmepumpe (VDI 4655), E-Auto und Klimagerät | **je Land**, und **schwach belegt** | Keine europaweite harmonisierte offene Sammlung gefunden (UNGEPRÜFT im Sinne von: die Suche fand nur nationale Standards und die BDEW-Profile selbst). Je Land beim Verteilnetzverband bzw. Regulierer: CH VSE, NL NEDU, FR Enedis, PT ERSE — Zugangs- und Lizenzlage je Land **ungeprüft** | nachreichbar, **mit sichtbarem Vorbehalt** |
| **Jahresverbrauch je Haushaltsgröße** | `PERSONEN` in `lib/constants.ts`: 1→1800, 2→2800, 3–4→3800, 5+→5000 kWh | **je Land** | Eurostat `nrg_d_hhq` (Haushaltsstromverbrauch) bzw. nationale Statistik. Achtung: In Ländern mit Elektroheizung (FR, PT, SE, NO) ist der Haushaltsverbrauch strukturell ein anderer — eine deutsche Tabelle wäre dort grob falsch | **BLOCKER** (der Verbrauch ist der Nenner jeder Eigenverbrauchsrechnung) |
| **Tag/Nacht-Quote nach Nutzung** | `NUTZUNG` (0,24 / 0,30 / 0,38 / 0,45) | **neutral** | Verhaltensgröße, nicht Landesrecht. Übernehmen und im Methodik-Text als Annahme benennen | nachreichbar |
| **Eigenverbrauchs-Kennfeld** | HTW-Power-Law in `calcEigenverbrauchExakt`, kalibriert an 25.000 HTW-Konfigurationen | **neutral** | Das Power-Law hängt an Anlagengröße ÷ Verbrauch und ist damit dimensionslos übertragbar. Seine Kappe ist das HTW-Autarkiekennfeld, und dessen x-Achse ist auf `AUTARKY_HTW_YIELD = 1024 kWh/kWp` normiert — der Ertrag wird beim Aufruf schon auf den echten Standort skaliert, also trägt es | nachreichbar (mit Vorbehalt im Methodik-Text) |
| **Autarkie-Kennfeld** | `AUTARKY_GRID` (HTW, 11 × 15 Stützstellen) | **neutral** | dito — auf Ertrag normiert, nicht auf deutsches Wetter | — |
| **Strompreis-Niveau** | `DEFAULT_PRICES.electricityPrice = 0,312 €/kWh` (BNetzA-Strompreismonitor 06/2026), live aus `market_prices` | **je Land** | **Eurostat `nrg_pc_204`, GEPRÜFT 26.09.2026**: halbjährlich, 43 Länder, Bänder DA–DE (DC = 2.500–4.999 kWh trifft unseren Fall), drei Steuerfassungen, Euro oder Landeswährung, zuletzt 2025-S2, Datei aktualisiert 24.09.2026. Lizenz Beschluss 2011/833/EU, kommerziell ausdrücklich erlaubt — **die Quelle ist bei uns schon im Register** (`DATA_SOURCES.eurostat`). **Schweiz fehlt darin** (nicht unter den 43 Geos); dort ElCom | **BLOCKER** |
| **Strompreis je Gemeinde (Sonderfall CH)** | gibt es in Deutschland nicht | **je Land** | ElCom-Datensatz „Strompreis per Stromnetzbetreiber **und Gemeinde**", opendata.swiss, SPARQL über LINDAS, Nutzungsbedingungen `terms_open`, zuletzt geändert 23.09.2026 (GEPRÜFT). Wäre ein Vorteil gegenüber Deutschland | nachreichbar |
| **Strompreis-Pfad (Anstieg p. a.)** | `electricityIncrease = 0,02`, ausdrücklich Modellkonvention ohne Live-Quelle | **neutral** | Übernehmen, im Methodik-Text als Annahme benennen. Alternativ je Land aus der Eurostat-Reihe zurückrechnen — dann ist es aber eine Rückschau, keine Prognose | nachreichbar |
| **Szenarien (+1/+2/+5 %)** | `SCENARIOS` in `lib/constants.ts` | **neutral** | — | — |
| **Anlagenpreise PV (€/kWp)** | monatlich gescrapt von taptaphome.com, Rückfall `DEFAULT_PRICES` | **je Land** | Keine europaweite Preisquelle. Je Markt eine Portalquelle oder eine Angebotssammlung wie bei der Wärmepumpe. **Warnung aus der eigenen Geschichte:** Eine Portal-Kostenseite ist keine Preisquelle für Gewerke — der alte WP-Scrape rechnete unter dem günstigsten realen Angebot | **BLOCKER** (ohne Preis keine Amortisation) |
| **Speicherpreise (€/kWh + Basis)** | `batteryBase` / `batteryPerKwh`, gescrapt | **je Land** | dito | **BLOCKER** |
| **Degradation und Laufzeit** | `DEGRAD = 0,005`, `YEARS = 25` | **neutral** | Physik des Moduls, nicht Landesrecht | — |
| **Profilfaktor der eigenen Einspeisung** | `profilFaktorAus(sim)` aus der eigenen Stundensimulation | **neutral** | fällt aus der Simulation an | — |
| **CO₂-Faktor Netzstrom** | `gridCo2PerKwh`, in WP-/Klima-/Balkon-Config identisch | **je Land** | Umweltbundesamt-Äquivalent je Land, oder europaweit einheitlich aus Ember (schon im Register, CC BY 4.0). **Der Unterschied ist groß und darf nicht übernommen werden:** Frankreich liegt eine Größenordnung unter Deutschland, Portugal deutlich darunter, die Schweiz noch tiefer | **BLOCKER** (eine deutsche Zahl in Frankreich wäre der schwerste Fehler dieses Projekts) |

### 2.2 Vergütung und Steuer

| Posten | heute in Deutschland | länderneutral? | Quelle für neue Märkte | Blocker für Livegang? |
|---|---|---|---|---|
| **Vergütungsregime (Struktur)** | EEG: fester Satz je Inbetriebnahme-Halbjahr, 20 Jahre garantiert, Teil-/Volleinspeisung, Degression 1 %/Halbjahr (`lib/feedin-config.ts` als Stichtagsplan) | **je Land**, und **strukturell verschieden** | **Vier Länder, vier Regime** (siehe 2.7): CH Einmalvergütung + marktnahe Rückliefervergütung · NL Saldierung bis 31.12.2026, danach Mindestvergütung · FR Einspeisetarif, 2026 grundlegend geändert · PT kein Tarif, Überschussverkauf über Aggregator | **BLOCKER** — und der teuerste Posten überhaupt, weil er nicht nur eine Zahl, sondern eine andere **Rechenform** verlangt |
| **Vergütungssätze (die Zahlen)** | `FEED_IN_SCHEDULE` + Gesetzeskette, Archiv seit 2000 (`lib/feedin-archiv.ts`, `lib/feedin-history.ts`) | **je Land** | CH: BFE-Referenzmarktpreis quartalsweise + kantonale/EVU-Tarife · NL: „ten minste 50 % van het kale leveringstarief" bis 2030, ACM beaufsichtigt · FR: Legifrance/CRE · PT: Marktpreis, kein amtlicher Satz | **BLOCKER** |
| **Historische Vergütungsreihe** | 2000–heute, speist `/einspeiseverguetung-tabelle` und den Lebenslauf-Rechner | **je Land** | Je Markt eigene Recherche. In CH und PT gibt es diese Reihe gar nicht, weil es das Instrument nicht gab | nachreichbar (eigene Seitengattung) |
| **Börsenerlös / Marktwert Solar** | `lib/marktwert-config.ts`, Niveau × Preisform über Monat × Stunde; Quelle netztransparenz.de | **je Land**, und **je Land verschieden lizenziert** | Energy-Charts `/v2/price`: **CH, NL, FR = CC BY 4.0** (von BNetzA/SMARD), **PT = ausdrücklich für kommerzielle Zwecke untersagt** (alle vier GEPRÜFT 26.09.2026). Unsere vorhandene Sperre `spotPreisFreigegeben()` greift korrekt — sie liest allerdings `license_info` der v1-Antwort, v2 heißt das Feld `license` | **je Markt verschieden**: BLOCKER in CH/NL, nicht beschaffbar in PT |
| **Umsatzsteuer auf die Anlage** | Nullsteuersatz § 12 Abs. 3 UStG, Vermutungsregel ab 30 kW, UStAE 12.18 für Speicher | **je Land** | Nationales Steuerrecht. CH: Mehrwertsteuer ohne Nullsatz-Äquivalent · NL: Nullsatz seit 2023 auf Wohngebäude-PV · FR/PT: ermäßigte Sätze, je Leistung gestaffelt — **alle vier UNGEPRÜFT** | **BLOCKER** (der Preis, mit dem wir rechnen, ist brutto oder netto — das entscheidet die Amortisation) |
| **Anmelde-/Registrierungspflicht** | MaStR binnen eines Monats, Bußgeldkette § 5/§ 21 MaStRV → § 95 EnWG | **je Land** | CH: Pronovo/Netzbetreiber · NL: energieleveren.nl (CERES) · FR: Enedis/Consuel · PT: DGEG-Registrierung | **BLOCKER** für Balkon-/Anmelde-Ratgeber, nachreichbar für den Rechner |

### 2.3 Wärmepumpe

| Posten | heute in Deutschland | länderneutral? | Quelle für neue Märkte | Blocker für Livegang? |
|---|---|---|---|---|
| **Gebäude-/Dämmstufen** | `INSULATION_BESTAND` / `INSULATION_NEUBAU`: spezifischer Bedarf und Heizlast, belegt aus dena-Gebäudereport und DIN V 18599 | **je Land** | Nationale Gebäudetypologie. Europaweit: **TABULA/EPISCOPE** (IEE-Projekt, 21 Länder, Wohngebäude-Typologien mit Kennwerten) — der naheliegende Kandidat, **UNGEPRÜFT** (weder Aktualität noch Lizenz an der Quelle geprüft) | **BLOCKER** für den WP-Rechner |
| **Norm-Heizlast** | `heatLoadW` je Dämmstufe, DIN EN 12831 | **je Land** (Klima), **neutral** (Norm) | DIN EN 12831 ist eine europäische Norm; die Auslegungs-Außentemperatur ist national. Aus PVGIS `T2m` oder ERA5 je Ort ableitbar | **BLOCKER** |
| **Bedarf → Verbrauch (Prebound)** | `verbrauchAusBedarf` (`lib/heat-consumption.ts`), belegt an Sunikka-Blank/Galvin über 3.400 deutsche Wohnungen | **neutral** (mit Vorbehalt) | Der Prebound-Effekt ist international belegt, die Höhe ist es nicht. Übernehmen mit ausgeschriebenem Vorbehalt oder aus nationalen Verbrauchsbändern neu kalibrieren | nachreichbar (mit Vorbehalt) |
| **Fossile Brennstoffpreise** | `FUEL_PRICE` (Gas 0,11 €/kWh, Öl 0,10 €/kWh) | **je Land** | **Eurostat `nrg_pc_202`** (Gaspreise Haushalte, halbjährlich, gleiche Bauart wie die Strompreisreihe — **UNGEPRÜFT**, aber derselbe Datensatzstamm). Heizöl: keine europaweite amtliche Reihe gefunden | **BLOCKER** für den WP-Rechner |
| **Kesselwirkungsgrade** | `efficiency` je Kesselvariante; Ökodesign-VO (EU) 813/2013 als Untergrenze | **neutral** | Die Ökodesign-Verordnung gilt EU-weit; in der Schweiz gilt sie nicht unmittelbar, faktisch aber derselbe Gerätemarkt | nachreichbar |
| **Grundpreis / Wartung / Ersatzinvest** | `lib/fossil-reference.ts` + `heatpump-config.ts` | **je Land** | Je Markt eine Quelle. Der Gasnetz-Grundpreis ist national reguliert | **BLOCKER** für den WP-Rechner |
| **Beimischungs-/Grüngas-Pflicht** | GModG § 43 (Bio-Treppe), Stufenplan in `lib/greengas-config.ts`, täglich wächter-geprüft | **entfällt** | Kein Äquivalent in CH/NL/FR/PT bekannt (UNGEPRÜFT). In den Niederlanden gibt es eine Beimischungsverpflichtung für grünes Gas ab 2026 (UNGEPRÜFT). **Der ganze Block entfällt im Zweifel** — und das ist keine Lücke, sondern der richtige Zustand | — (entfällt) |
| **WP-Investitionskosten** | kalibriert an 160 echten Angeboten der Verbraucherzentrale RLP | **je Land** | Je Markt eine vergleichbare Angebotssammlung. **Das ist der aufwendigste Einzelposten des WP-Rechners** — der deutsche Wert hat eine Volltextquelle mit Medianpreis und Kostenkategorien gekostet | **BLOCKER** für den WP-Rechner |
| **Nationale WP-Förderung** | BEG, KfW-Merkblatt 458, Fahrplan mit drei Stichtagen (`BEG_FAHRPLAN`) | **je Land** | CH: kantonale Förderung (Harmonisiertes Fördermodell der Kantone, HFM 2015) · NL: ISDE · FR: MaPrimeRénov' · PT: Fundo Ambiental — alle vier **UNGEPRÜFT** | **BLOCKER** für den WP-Rechner |
| **Antragsreihenfolge** | `lib/beg-antrag.ts`, die teuerste Auskunft des Förderbereichs | **je Land** | Je Programm neu zu lesen. Die Systematik (eine Quelle, ein Anker, Browser-Test) ist übertragbar | **BLOCKER** zusammen mit der Förderung |
| **Tagesmitteltemperatur / Gradtage** | `lib/temperatur-tage.ts`, DWD-Stationsmittel 1991–2025, 96 Stationen — trägt die Form des Heizkosten-Rennens | **je Land** | ERA5 (unser eigenes Archiv, AWS Open Data, CC BY 4.0) oder PVGIS `T2m`. Eurostat hat zusätzlich **Heiz- und Kühlgradtage auf NUTS-Ebene** (`nrg_chddr2_a` / `_m`) — die einzigen `nrg_*`-Datensätze mit Regionalbezug | nachreichbar (nur das Rennen hängt daran) |

### 2.4 Klimaanlage und Balkonkraftwerk

| Posten | heute in Deutschland | länderneutral? | Quelle für neue Märkte | Blocker für Livegang? |
|---|---|---|---|---|
| **Kühlgradstunden je Ort** | `lib/kuehlgrad.json`, jährlich vorgerechnet aus unserem ERA5-Archiv (`npm run klima:kuehlgrad`) | **je Land** (Ausschnitt), **neutral** (Verfahren) | Dasselbe Verfahren. Der gespeicherte ERA5-Ausschnitt ist heute ausdrücklich „one cell wider than Germany on every side" (`ERA5_WINDOW` in `lib/era5-archive.ts`, Zeilen 548–583, Spalten 742–783). Das ist ein **Parameter**, keine Strukturgrenze — das Archiv im AWS-Bucket ist global | nachreichbar (nur der Klima-Rechner hängt daran) |
| **Klimaprojektion** | `lib/klima-projektion.json` aus acht CMIP6-Modellen je 0,25°-Rasterfeld | **neutral** | NEX-GDDP-CMIP6 ist global. Nur der Rasterausschnitt wird geweitet | nachreichbar |
| **Klimageräte-Preise und -Effizienzen** | `lib/aircon-config.ts`, quartalsweise wächter-geprüft | **je Land** (Preise), **neutral** (Effizienz-Systematik) | Die SEER/EER-Systematik folgt EN 14825 / EN 14511 und gilt EU-weit; die Gerätepreise sind national | nachreichbar |
| **Balkonkraftwerk-Rechtsrahmen** | `BALKON_RECHT` in `lib/balkon-config.ts`: 800 VA, Anmeldung, Nullsteuersatz, Mietrecht (privilegierte Maßnahme seit 2024) | **je Land**, und **teils gegenstandslos** | Die 800-VA-Grenze folgt der VDE-AR-N 4105 und der EU-Verordnung 2016/631 — in NL, AT und BE gelten andere Schwellen bzw. andere Anmeldewege (UNGEPRÜFT). **In Flandern ist Steckersolar sogar eine eigene Registerkategorie** („Plug & Play PV", 2.196 Anlagen) | **BLOCKER** für den Balkon-Cluster, sonst entfällt er |
| **Balkon-Set-Preise + Affiliate** | `lib/shop-solakon.ts`, ein deutscher Händler, Bildfreigabe per Mail belegt | **je Land** | Je Markt ein eigener Partner, eine eigene Bildfreigabe, eigene Programmbedingungen. **Die Kennzeichnungspflicht ist national** (§ 5a Abs. 4 UWG hat in jedem Markt ein Gegenstück, nicht denselben Wortlaut) | nachreichbar (der Block blendet sich ohne Abruf ohnehin aus) |

### 2.5 Ortsbezug und Gemeindeseiten

| Posten | heute in Deutschland | länderneutral? | Quelle für neue Märkte | Blocker für Livegang? |
|---|---|---|---|---|
| **Anlagenregister** | MaStR, 6,31 Mio. Anlagen, 129,2 GWp, monatlicher Import | **je Land** | **Erledigt durch die Vorarbeit** — `docs/quellen/europa-register/`. CH vollständig (Einzelanlage, Adresse, Koordinaten, taggenaues Datum, kommerziell frei), NL nur Gemeindeaggregate (CBS), FR Gemeindeaggregate ohne Zeitachse unter 36 kW, PT Monatsaggregate je Gemeinde **und Ortsteil** | **BLOCKER** für die Gemeindeseiten |
| **Gemeindeschlüssel-Systematik** | AGS, acht- oder fünfstellig, Präfix-Logik trägt Atlas *und* Förderkatalog | **je Land** | CH: BFS-Nummer (vierstellig) · NL: CBS-gemeentecode · FR: Code INSEE (fünfstellig) · PT: DICOFRE (Concelho + Freguesia). **Die Präfix-Logik des Förderkatalogs ist deutsch gedacht** — „Land = 2 Stellen, Kreis = 5, Gemeinde = 8" gilt in keinem der vier Märkte | **BLOCKER** |
| **Ortsverzeichnis + Hierarchie** | `ATLAS_CITIES` (255 Einträge) + `mastr_regions`, Gemeinde → Kreis → Land | **je Land** | GISCO LAU 2024 (**97.987 Gemeinden, 34 Länder**, GEPRÜFT 26.09.2026) wäre die eine Quelle — **scheitert an der Nicht-kommerziell-Klausel**. Ausweichen auf: CH BFS-Gemeindeverzeichnis · NL CBS · FR INSEE COG · PT INE/DGT | **BLOCKER** |
| **Einwohnerzahlen** | Destatis GV100AD | **je Land** | GISCO LAU 2024 trägt `POP_2024` — **gemessen vollständig für CH (2.136 von 2.180), NL (342/342), PT (3.092/3.092)** und **vollständig leer für Frankreich (0 von 34.946) und Spanien (0 von 8.132)**. Für FR also INSEE direkt (ADMIN EXPRESS COG PLUS trägt die Einwohnerzahl mit) | **BLOCKER** (jede Pro-Kopf-Zahl hängt daran) |
| **Gebietsänderungen / Schlüssel-Nachfolge** | `lib/ags-nachfolger.ts` aus der amtlichen Destatis-Liste; 277 alte Schlüssel trugen 11.300 Anlagen | **je Land** | Je Land eine amtliche Änderungsliste. **Frankreich ist hier der schwierigste Fall** — „communes nouvelles" fusionieren laufend, INSEE führt die Historie im COG | nachreichbar, **aber die Fehlerklasse ist unsichtbar** (eine Gemeinde zeigt null Anlagen und sieht dabei normal aus) |
| **Gemeindegeometrien (Karte)** | BKG VG250/VG2500, dl-de/by-2-0, vereinfacht in `public/geo/` | **je Land** | **GISCO scheidet aus** (nicht-kommerziell, GEPRÜFT im Wortlaut). National: **CH swisstopo swissBOUNDARIES3D** (seit 2021 OGD, kommerziell ausdrücklich erlaubt, nur Quellenangabe — UNGEPRÜFT am Original) · **FR IGN ADMIN EXPRESS** (Licence Ouverte 2.0, UNGEPRÜFT) · **NL PDOK Bestuurlijke Gebieden** (offen, Lizenz UNGEPRÜFT) · **PT DGT CAOP** (CC BY 4.0, UNGEPRÜFT) | **BLOCKER** für die Karte, nachreichbar für die Zahlen |
| **Postleitzahl → Ort und Koordinate** | `public/plz.json` + `lib/plz-nearest.ts` + `PLZ_BL` (zweistelliges Präfix → Bundesland) | **je Land** | **Die PLZ-Systematik ist in keinem der vier Märkte wie in Deutschland.** NL: vierstellig + zwei Buchstaben · CH: vierstellig, Post-eigen · FR: fünfstellig, deckt sich **nicht** mit dem Code INSEE · PT: siebenstellig. Die Zuordnung Präfix → Region muss je Land neu gebaut werden | **BLOCKER** (jeder Rechner fragt die PLZ) |
| **Wohnungs-/Gebäudebestand** | Zensus 2022, der Nenner „wie viele Dächer gibt es" | **je Land** | EU-weit: Zensus 2021 über Eurostat (GISCO Census Grid, dieselbe Nicht-kommerziell-Klausel — **zu prüfen**). National: CH BFS Gebäude- und Wohnungsregister (GWR) · NL BAG · FR INSEE Logements · PT INE Censos | nachreichbar (ohne ihn fehlt die Einordnung, nicht die Zahl) |
| **Live-Wetter am Ort** | ICON-D2-Schnappschüsse (`lib/icon-d2-store.ts`) | **je Land**, mit harter Grenze | **Gemessen am Code:** `ICON_D2_GRID` deckt lat 43,18–58,10 und lon −3,94–20,36 ab. Damit liegen **Portugal vollständig, die französische Atlantikküste westlich von −3,94° und Korsika außerhalb**. Ausweg: ICON-EU oder ECMWF IFS aus demselben Open-Meteo-Archiv | nachreichbar (nur Live-Wetter, Sonnenanzeige, Hitzewelle) |
| **Strahlungsreihen für die Rennen** | `lib/strahlungsjahre.ts` (DWD-Monatsraster 1991–2025), `lib/strahlung-tage.ts` (56 Stationen) | **je Land** | PVGIS `MRcalc` liefert Monatswerte je Koordinate **2005–2023** (GEPRÜFT). Damit ist das Rennen möglich, aber auf 19 Jahre verkürzt und zwei Jahre veraltet | nachreichbar (nur die beiden Rennen hängen daran) |

### 2.6 Energiedaten und Widgets

| Posten | heute in Deutschland | länderneutral? | Quelle für neue Märkte | Blocker für Livegang? |
|---|---|---|---|---|
| **Strommix und Erzeugung (live)** | Energy-Charts, CC BY 4.0 | **neutral** | **GEPRÜFT 26.09.2026**: `public_power` liefert CH (12 Serien), NL (14), FR (19), PT (15) in derselben Struktur wie DE (21). `/v2/public_power` weist für PT und CH ausdrücklich „CC BY 4.0, attribution: energy-charts.info" aus | — (portiert mit Länderschlüssel) |
| **Börsenpreis je Gebotszone** | Energy-Charts `/price`, Sperre in `spotPreisFreigegeben()` | **je Land verschieden** | siehe 2.2 — CH/NL/FR frei, **PT gesperrt** | je Markt verschieden |
| **Langzeitreihe Erzeugung + CO₂-Intensität** | Umweltbundesamt, 1990–heute | **je Land** | Ember (schon im Register, CC BY 4.0, jährlich bis 2025, monatlich bis 08/2026) deckt CH, NL, FR, PT ab — aber ohne die Tiefe der UBA-Reihe | nachreichbar |
| **Länderreihen (Anteile, Zubau, pro Kopf)** | `lib/country-comparison.ts` aus Ember, monatlicher Sync | **neutral** | schon europaweit | — |
| **Nationaler Bestand und Zubau** | aus dem MaStR gerechnet (`lib/anlagenbestand-server.ts`) | **je Land** | Aus dem jeweiligen Register, wo es eines gibt. Sonst Eurostat `nrg_inf_epcrw` — die einzige Quelle, die nach Anlagengröße trennt (`< 30 kW` in 42 von 42 Ländern gemeldet) | nachreichbar |
| **Einbettbare Widgets (Rahmen)** | `lib/widget-registry.ts`, Theming, Export, Quellenkante | **neutral** (Mechanik) | Titel, Teilen-Texte und nächster Schritt sind Sprache, nicht Struktur | — |

### 2.7 Recht, Texte, Betrieb

| Posten | heute in Deutschland | länderneutral? | Quelle für neue Märkte | Blocker für Livegang? |
|---|---|---|---|---|
| **Datenschutzerklärung** | national, mit 16 Abschnitten, gegen den Code geprüft (`scripts/rechtstexte-verify.md`) | **je Land** | DSGVO gilt EU-weit, die **nationalen Umsetzungen nicht**: § 25 TDDDG (DE) hat in NL, FR, PT je ein eigenes Gegenstück, in der **Schweiz gilt das revDSG statt der DSGVO**. Anwaltlich | **BLOCKER** |
| **Impressum / Anbieterkennzeichnung** | § 5 DDG, § 18 MStV | **je Land** | Je Land eigene Pflichtangaben. Die Schweiz kennt keine Impressumspflicht in dieser Form, aber Art. 3 UWG (CH) | **BLOCKER** |
| **Cookie- / Endgeräte-Einwilligung** | § 25 TDDDG; unsere Messung ist einwilligungsfrei, weil `trackEvent` **keine** Begleitangaben trägt | **je Land** (Begründung), **neutral** (Bauweise) | Die Bauweise trägt überall: was keine Eigenschaften mitschickt, ist auch anderswo eher gedeckt. Der Begründungstext ist national | nachreichbar (die Bauweise steht schon) |
| **Wettbewerbs- und Kennzeichnungsrecht** | § 5 UWG (Irreführung), § 5a Abs. 4 UWG (Anzeige), § 7 UWG (Kaltakquise), § 5b Abs. 3 UWG (Bewertungen) | **je Land** | UGP-Richtlinie 2005/29/EG ist EU-weit harmonisiert — die **Grundsätze** tragen also; die Durchsetzung und die Abmahnbefugnis sind national und in Deutschland besonders scharf. CH: UWG (CH) mit ganz anderer Durchsetzung | **BLOCKER** für Vertrauens-Leiste und Affiliate-Block |
| **Rechtsbelegregister** | `lib/rechtsbelege.ts`, **27 Vorschriften**, alle deutsch (UStG, EEG, GModG, MaStRV, BGB, OWiG, DDG, MStV, TDDDG, UWG) | **je Land** | Vollständig neu. Die **Mechanik** (Test liest die Vorschriften aus dem ausgelieferten Text und verlangt für jede einen Eintrag) ist übertragbar, das Muster für die Norm-Erkennung nicht | **BLOCKER** |
| **Nutzungsvorbehalt / Lizenzseite** | `/lizenz`, TDM-Vorbehalt in `public/.well-known/tdmrep.json`, § 87b UrhG, § 60d UrhG, § 2 Abs. 5 DNG | **neutral** (Grundsatz) | Das Datenbankherstellerrecht ist über die Richtlinie 96/9/EG EU-weit harmonisiert, der TDM-Vorbehalt über Art. 4 DSM-Richtlinie. **Die Schweiz kennt kein sui-generis-Datenbankrecht** — dort trägt der Vorbehalt anders | nachreichbar |
| **Ratgeber, FAQ, Glossar** | 10 Registry-Einträge plus die Cluster-Seiten, alle deutsches Recht und deutsche Zahlen | **je Land** | Vollständig neu zu schreiben. Übersetzen reicht nicht: Die Inhalte beantworten nationale Fragen (Nullsteuersatz, MaStR-Frist, GModG-Treppe) | **BLOCKER** für den SEO-Hebel, nicht für den Rechner |
| **Sprache und Formatierung** | Deutsch; `de-DE` steht in **161 Dateien**, `Europe/Berlin` an 12 Stellen in `lib/`, Einheitenformatierung in `lib/atlas-format.ts` fest auf € | **je Land** | Es gibt heute **keine Lokalisierungsschicht**. Ein zweiter Markt verlangt entweder eine (Zahlformat, Währung, Zeitzone, Texte) oder eine eigene Instanz | **BLOCKER** — und der am leichtesten unterschätzte |
| **Zeitzone / Stichtagslogik** | `lib/zeit.ts` (`heuteInBerlin`), wächter-erzwungen | **je Land** (Zone), **neutral** (Bauweise) | Die Bauweise ist genau richtig; die Zone wird ein Parameter. **Achtung:** Portugal liegt in WET/WEST, also eine Stunde neben allen anderen drei Märkten — ein hart verdrahtetes Berlin wäre dort um eine Stunde daneben | **BLOCKER** (dieselbe unsichtbare Fehlerklasse wie bei uns viermal aufgetreten) |
| **Domain und Marke** | solar-check.io | **je Land** | Entscheidung des Betreibers (siehe 5.) | **BLOCKER** |
| **Anmelde-Mails und Rechtsbelehrungen** | `lib/auth-mail.ts`, Einwilligungs-Archiv `lib/auth-einwilligung.ts`, 90-Tage-Regel aus WP194 | **je Land** (Text), **neutral** (Bauweise) | Die Bauweise (datierter Wortlaut, nie überschrieben) trägt überall | nachreichbar |
| **Kommunen-Ansprache** | Brief, Ferienkalender, Tagespensum, Rückläufer-Erkennung — alles auf deutsche Gemeinden und § 7 UWG zugeschnitten | **je Land** | Der Ferienkalender allein ist je Land eine eigene Tabelle. Das Anschreiben lebt vom Aufhänger „Platz 1 unter gleich großen Gemeinden" — den gibt es nur, wo ein Register die Rangliste hergibt | nachreichbar |

### 2.8 Zusammenzählung

| | Anzahl |
|---|---:|
| Bedarfsposten gesamt | **68** |
| davon **länderneutral** (kein Beschaffungsbedarf) | **16** |
| davon **je Land zu beschaffen** (Quelle benannt) | **51** |
| davon **entfällt** (Gegenstand existiert dort nicht) | **1** |

Die 16 länderneutralen, damit klar ist, was wirklich nichts kostet: Stunden-Jahressimulation ·
stündliche Erzeugungsreihe · Tag/Nacht-Quote · Eigenverbrauchs-Kennfeld · Autarkie-Kennfeld ·
Strompreis-Pfad · Szenarien · Degradation und Laufzeit · Profilfaktor der eigenen Einspeisung ·
Bedarf-zu-Verbrauch-Korrektur (mit Vorbehalt) · Kesselwirkungsgrade · Klimaprojektion ·
Strommix und Erzeugung live · Länderreihen · Widget-Rahmen · Nutzungsvorbehalt und TDM.

**Vier benannte Lücken innerhalb der 51** — dort ist heute keine Quelle in der Qualität
gefunden, die dieses Projekt verlangt:

1. **Lastprofil des Haushalts** — kein europaweiter offener Satz gefunden; national je Regulierer, Lizenzlage in allen vier Märkten ungeprüft. Übernahme des deutschen H0 wäre möglich, aber eine unbelegte Annahme in genau der Größe, die den Eigenverbrauch bestimmt.
2. **Börsenerlös Portugal** — an der Quelle, die wir nutzen, ausdrücklich für kommerzielle Zwecke untersagt (GEPRÜFT). Ohne ihn fehlt in Portugal die Größe, aus der nach dem Ende einer Vergütung gerechnet wird — und dort gibt es gar keine Vergütung, also ist der Marktpreis die *einzige* Erlösgröße.
3. **Heizöl-Preisreihe** — keine europaweite amtliche Reihe gefunden (Eurostat führt Strom und Gas, nicht Heizöl). Betrifft nur den Wärmepumpen-Rechner.
4. **Einwohnerzahlen Frankreich und Spanien in der EU-Quelle** — in GISCO LAU 2024 gemessen leer (0 von 34.946 bzw. 0 von 8.132). National bei INSEE bzw. INE vorhanden, also beschaffbar; in der einen Quelle, die alles andere trägt, aber nicht.

---

## 3. Startcheckliste je Markt

Die Reihenfolge ist die Beschaffungsreihenfolge, nicht die Baureihenfolge. Was weiter oben
steht, blockiert das Darunterliegende.

### 3.0 Was für JEDEN Markt zuerst kommt (marktunabhängig, einmalig)

Diese vier Dinge sind keine Beschaffung, sondern Umbau — und sie müssen **vor** dem ersten
Markt stehen, weil sie sonst je Markt noch einmal gemacht werden:

1. **Eine Lokalisierungsschicht.** Zahlformat, Währung, Zeitzone, Texte. Heute steht `de-DE`
   in 161 Dateien und `Europe/Berlin` an 12 Stellen. *Alternative, die ernsthaft zu prüfen
   ist: je Markt eine eigene Instanz statt einer Mehrsprachigkeit — siehe 5.*
2. **Eine Markt-Dimension im Prüfstand und im Wächter-Register.** Heute kennen beide keine
   Länder (siehe 4.).
3. **Die Deutschlandbox aus `lib/pvgis.ts` herausnehmen** und durch einen Marktparameter
   ersetzen. Sie ist die eine Stelle, an der ein ausländischer Ort still auf den deutschen
   Mittelwert fällt.
4. **Den Ortsschlüssel von der AGS-Präfixlogik lösen.** Atlas *und* Förderkatalog rechnen
   heute mit „Land = 2, Kreis = 5, Gemeinde = 8". In keinem der vier Märkte stimmt das.

### 3.1 Schweiz — der erste Markt

**Warum zuerst:** Als einziger Markt sind Register, Geobasis, Strompreis *je Gemeinde* und
Fördersystem alle offen, kommerziell nutzbar und aktuell. Und das Register ist besser als das
deutsche — es trägt Neigung und Ausrichtung je Anlage.

**Für den RECHNER (in dieser Reihenfolge):**

| # | Posten | Quelle | Blocker? |
|---|---|---|---|
| 1 | Standort-Ertrag: Box weiten, Rückfallwerte je Kanton | PVGIS (GEPRÜFT) | BLOCKER |
| 2 | Dach-Ertragsmatrix | PVGIS-Referenzabruf, einmalig | BLOCKER |
| 3 | Strompreis-Niveau | ElCom je Gemeinde (SPARQL/LINDAS, `terms_open`, GEPRÜFT). **Eurostat trägt hier nicht — die Schweiz fehlt in `nrg_pc_204`** | BLOCKER |
| 4 | Jahresverbrauch je Haushaltsgröße | BFS bzw. VSE — UNGEPRÜFT | BLOCKER |
| 5 | Anlagen- und Speicherpreise | Marktquelle zu finden; Swissolar veröffentlicht Preisindizes — UNGEPRÜFT | BLOCKER |
| 6 | CO₂-Faktor Netzstrom | Ember oder BFE. **Die Schweiz liegt weit unter Deutschland — die deutsche Zahl wäre grob falsch** | BLOCKER |
| 7 | Vergütungsregime | **Einmalvergütung (KLEIV < 100 kW, GREIV ≥ 100 kW, HEIV ohne Eigenverbrauch), Pronovo — ausschließlich Einmalvergütung, keine laufende Einspeisevergütung** (GEPRÜFT an pronovo.ch). Dazu die Rückliefervergütung der Netzbetreiber, seit dem neuen Stromgesetz mit einer national einheitlichen Mindestvergütung für Anlagen unter 150 kW und einem quartalsweise vom BFE festgelegten Referenzmarktpreis (UNGEPRÜFT — nur aus Sekundärquellen gelesen, **vor dem Bau am BFE nachzulesen**) | BLOCKER |
| 8 | Mehrwertsteuer auf die Anlage | UNGEPRÜFT | BLOCKER |
| 9 | Lastprofil | VSE — UNGEPRÜFT | nachreichbar |

**Der Rechenkern muss für die Schweiz umgebaut werden, nicht nur umparametriert.** Eine
Einmalvergütung ist ein negativer Investitionsbetrag, keine Erlösreihe — `einspeiseVerlauf`
kennt diese Form heute nicht. Das ist der größte einzelne Codeposten des Markteintritts.

**Für die GEMEINDESEITEN:**

| # | Posten | Quelle | Blocker? |
|---|---|---|---|
| 1 | Anlagenregister | BFE `ch.bfe.elektrizitaetsproduktionsanlagen` — Einzelanlage, Adresse, Koordinaten, taggenaues Inbetriebnahmedatum, monatlich, kommerziell frei (erhoben in `west-sued.md`) | BLOCKER |
| 2 | Gemeindeverzeichnis + BFS-Nummer | BFS Gemeindeverzeichnis | BLOCKER |
| 3 | Einwohnerzahlen | BFS; GISCO hätte sie (2.136 von 2.180 gemessen), ist aber nicht kommerziell nutzbar | BLOCKER |
| 4 | Geometrien | swisstopo swissBOUNDARIES3D, OGD seit 2021, kommerziell erlaubt (UNGEPRÜFT am Original) | BLOCKER für die Karte |
| 5 | PLZ → Gemeinde | swisstopo / Post; **PLZ und Gemeinde decken sich in der Schweiz nicht** | BLOCKER |
| 6 | Gebäudebestand als Nenner | BFS Gebäude- und Wohnungsregister (GWR) | nachreichbar |
| 7 | Gebietsänderungen | BFS führt Gemeindefusionen; die Schweiz fusioniert häufiger als Deutschland | nachreichbar, Fehler unsichtbar |
| 8 | Speicher je Gemeinde | **Gibt es nicht** — im Register kein einziges kWh-Feld, vollständig durchgezählt (`speicher-ch-nl.md`) | entfällt, sichtbar benennen |

**Für die RATGEBER:** vollständig neu. Der Anmelde-Ratgeber, der Nullsteuersatz-Block und die
Bio-Treppe sind gegenstandslos; an ihre Stelle treten Einmalvergütung, Rückliefervergütung und
die kantonale Förderlandschaft.

### 3.2 Niederlande — der zweite Markt

**Warum zweitens, und warum jetzt:** Die Saldierung endet am **01.01.2027** (GEPRÜFT an
rijksoverheid.nl). Danach gilt für zurückgelieferten Strom eine Vergütung von **mindestens
50 % des reinen Lieferungstarifs, bis 2030**, beaufsichtigt von der ACM. Das ist der Moment,
in dem eine ganze Nation ihre Anlage neu durchrechnen muss — und in dem ein Rechner, der es
ehrlich tut, gebraucht wird. Ein Markteintritt danach kommt zu spät.

**Für den RECHNER:**

| # | Posten | Quelle | Blocker? |
|---|---|---|---|
| 1 | Vergütungsregime | Energiewet: Saldierung bis 31.12.2026, ab 01.01.2027 Mindestvergütung ≥ 50 % des nackten Lieferungstarifs bis 01.01.2030 (GEPRÜFT). **Die Rechenform ist eine dritte, die wir nicht haben:** ein Anteil des eigenen Bezugspreises statt eines festen Satzes — und mit einem Stichtag, an dem sie kippt | BLOCKER |
| 2 | Strompreis | Eurostat `nrg_pc_204`, NL = 0,2558 €/kWh Band DC inkl. Steuern, 2025-S2 (GEPRÜFT) | BLOCKER |
| 3 | Standort-Ertrag + Dachmatrix | PVGIS (GEPRÜFT für Amsterdam) | BLOCKER |
| 4 | Anlagen- und Speicherpreise | Marktquelle zu finden | BLOCKER |
| 5 | CO₂-Faktor | Ember / CBS | BLOCKER |
| 6 | Umsatzsteuer | Nullsatz auf Wohngebäude-PV seit 2023 — UNGEPRÜFT | BLOCKER |
| 7 | Lastprofil | NEDU-Profile — UNGEPRÜFT | nachreichbar |

**Der Speicher ist in den Niederlanden der eigentliche Hebel** und wird es ab 2027 schlagartig:
Mit dem Ende der Saldierung lohnt sich Eigenverbrauch zum ersten Mal. Unser Speichermodell ist
dafür fertig — das ist ein seltener Fall, in dem wir vorbereitet sind.

**Für die GEMEINDESEITEN:**

| # | Posten | Quelle | Blocker? |
|---|---|---|---|
| 1 | Anlagendaten je Gemeinde | CBS-OData, 361 Gemeinden, CC BY 4.0, zweimal jährlich, Perioden 2019–2025 (erhoben). **Jahresbestände ohne Inbetriebnahmedatum — kein Zubau je Monat** | BLOCKER |
| 2 | Gemeindeverzeichnis + Einwohner | CBS; GISCO hätte 342/342 | BLOCKER |
| 3 | Geometrien | PDOK Bestuurlijke Gebieden (UNGEPRÜFT) | BLOCKER für die Karte |
| 4 | PLZ → Gemeinde | vierstellig + zwei Buchstaben; die Zuordnung ist eine eigene Tabelle | BLOCKER |
| 5 | Heimspeicher je Gemeinde | CERES/energieleveren.nl rechnet es aus und **veröffentlicht die Gemeindesicht nur als JPEG** (erhoben). Dort liegt der Hebel, und er ist eine Mail weit — **Außenkontakt, Entscheidung des Betreibers** | nachreichbar |

**Der offene Punkt, der den NL-Atlas entscheidet:** Ob EDSN die Gemeindedaten aus CERES als
Daten herausgibt. Ohne sie ist der niederländische Atlas eine Jahresreihe über 361 Gemeinden,
mit ihnen eine Monatsreihe mit Heimspeichern.

### 3.3 Frankreich — der dritte Markt

**Warum drittens:** Größter Markt der vier, aber zwei harte Lücken. Unterhalb von 36 kW — also
bei praktisch jeder privaten Anlage — gibt es genau eine Zeile je Gemeinde **ohne Zeitachse**;
ein „Zubau 2025 in Ihrer Gemeinde" ist daraus nicht ableitbar. Und die Einwohnerzahlen fehlen
in der EU-Quelle vollständig.

**Für den RECHNER:**

| # | Posten | Quelle | Blocker? |
|---|---|---|---|
| 1 | Vergütungsregime | Arrêté tarifaire S21, obligation d'achat. **2026 grundlegend geändert:** ein einheitlicher Tarif statt Quartalstarifen, die prime à l'autoconsommation gestrichen, jährliche Indexierung statt Quartalsanpassung, Einspeisung oberhalb 1.600 kWh/kWc·a unvergütet — **alles UNGEPRÜFT**, nur aus photovoltaique.info gelesen. Die kursierende Zahl „1,1 c€/kWh" ist so niedrig, dass sie **vor jeder Verwendung an Legifrance im Volltext zu prüfen ist** | BLOCKER |
| 2 | Strompreis | Eurostat, FR = 0,2561 €/kWh Band DC inkl. Steuern, 2025-S2 (GEPRÜFT) | BLOCKER |
| 3 | Jahresverbrauch je Haushalt | **Besonders wichtig in Frankreich:** Ein großer Teil der Haushalte heizt elektrisch, der Verbrauch ist strukturell ein anderer und stark winterlastig. Eine deutsche Tabelle wäre hier grob falsch, und auch die Tag/Nacht-Quote und das Lastprofil kippen | BLOCKER |
| 4 | CO₂-Faktor | **Der größte Unterschied aller vier Märkte** — Frankreich liegt wegen der Kernkraft eine Größenordnung unter Deutschland. Eine übernommene deutsche Zahl machte aus der CO₂-Aussage das Gegenteil | BLOCKER |
| 5 | Anlagen-/Speicherpreise, Steuer | zu beschaffen | BLOCKER |

**Für die GEMEINDESEITEN:**

| # | Posten | Quelle | Blocker? |
|---|---|---|---|
| 1 | Anlagendaten | ODRÉ / Enedis, Gemeindeaggregate; unter 36 kW eine Zeile je Gemeinde ohne Zeitachse (erhoben). Ein Zubau nur über die Differenz zweier Jahresschnappschüsse — **und das ist eine Aussage, die wir selbst erzeugen, kein gemessener Wert** | BLOCKER |
| 2 | Gemeindeverzeichnis + **Einwohnerzahlen** | INSEE COG bzw. IGN ADMIN EXPRESS COG PLUS (Licence Ouverte 2.0, trägt die Einwohnerzahl mit). **GISCO hat 34.946 Gemeinden und null Einwohnerzahlen — gemessen** | BLOCKER |
| 3 | Geometrien | IGN ADMIN EXPRESS, Licence Ouverte 2.0 (UNGEPRÜFT) | BLOCKER für die Karte |
| 4 | Gebietsänderungen | „communes nouvelles" fusionieren laufend; INSEE führt die Historie. **Von den vier Märkten der aufwendigste Fall** | nachreichbar, Fehler unsichtbar |
| 5 | PLZ → Gemeinde | Der Code postal deckt sich **nicht** mit dem Code INSEE; die Zuordnung ist mehrdeutig in beide Richtungen | BLOCKER |
| 6 | Live-Wetter | ICON-D2 deckt die Atlantikküste westlich von −3,94° und Korsika **nicht** (gemessen am Code) | nachreichbar |

**Ein Fund, der für Frankreich gesondert zu bewerten ist:** OpenPVMapper liefert 1,14 Mio.
Aufdachanlagen mit Gemeindeschlüssel, Fläche, Neigung, Azimut und kWp unter CC BY 4.0, Stand
07/2026 — inhaltlich genau das, was fehlt. **Aber die Präzision liegt bei 74–75 %**, jeder
vierte Eintrag ist potenziell falsch. Für ein Projekt, dessen Zusage die Richtigkeit der Zahlen
ist, nur mit sichtbarem Vorbehalt verwendbar, und niemals in einer Kachel neben gemessenen
Registerwerten.

### 3.4 Portugal — der vierte Markt

**Warum viertens:** Die Daten sind gut (Monatsaggregate je Gemeinde *und Ortsteil*, CC BY 4.0,
518.067 Zeilen), das Umfeld ist es nicht. Kein Einspeisetarif, gesperrter Börsenpreis, kein
Live-Wetter aus unserem Modell, und die Inselregionen fehlen.

**Für den RECHNER:**

| # | Posten | Quelle | Blocker? |
|---|---|---|---|
| 1 | Vergütungsregime | Autoconsumo nach Decreto-Lei 15/2022; Überschuss wird über einen Aggregator zum Marktpreis verkauft, **kein amtlicher Satz** (UNGEPRÜFT im Volltext). Damit ist der Erlös der Marktpreis — und genau der ist an unserer Quelle gesperrt | BLOCKER, **und heute ohne Quelle** |
| 2 | Strompreis | Eurostat, PT = 0,2435 €/kWh Band DC inkl. Steuern, 2025-S2 (GEPRÜFT) | BLOCKER |
| 3 | Standort-Ertrag | PVGIS (GEPRÜFT für Lissabon). **Portugal ist der ertragreichste der vier Märkte — die Amortisation sieht dort grundsätzlich anders aus** | BLOCKER |
| 4 | Klimaanlage statt Wärmepumpe | In Portugal ist Kühlen der relevantere Fall. Unser Klima-Rechner passt besser als der WP-Rechner — und die Kühlgradstunden kommen aus ERA5, also aus einer Quelle, die nur einen anderen Ausschnitt braucht | Chance, kein Blocker |
| 5 | Live-Wetter | **ICON-D2 deckt Portugal gar nicht ab** (gemessen: lon ab −3,94°, Portugal liegt bei −9,5 bis −6,2°). Ausweichen auf ECMWF IFS aus demselben Archiv | nachreichbar |

**Für die GEMEINDESEITEN:**

| # | Posten | Quelle | Blocker? |
|---|---|---|---|
| 1 | Anlagendaten | E-REDES, Monatsaggregate je `codconcelho` **und `codfreguesia`** und PLZ, CC BY 4.0, Stand 08/2026 (erhoben). Bestandsreihe seit 01/2023 — **eine echte Monatsreihe, besser als Frankreich und die Niederlande** | BLOCKER |
| 2 | Zwei Ortsebenen entscheiden | Portugals LAU ist die **Freguesia** (3.092 in GISCO gemessen), der Concelho (308) ist NUTS-nah. Welche Ebene die Ortsseite trägt, ist eine Produktentscheidung: Der Concelho ist das, was Menschen „meine Stadt" nennen | BLOCKER |
| 3 | Einwohnerzahlen | GISCO hätte 3.092/3.092 (gemessen), ist aber nicht kommerziell nutzbar → INE | BLOCKER |
| 4 | Geometrien | DGT CAOP, CC BY 4.0 (UNGEPRÜFT) | BLOCKER für die Karte |
| 5 | Inselregionen | **Azoren (EDA) und Madeira (EEM) fehlen bei E-REDES** — rund 5 % der Bevölkerung. Sichtbar benennen, nicht stillschweigend weglassen | nachreichbar, **muss sichtbar sein** |

---

## 4. Wie die Wächter marktfähig würden

**Heute gibt es keine Länder-Dimension.** `lib/pruefstand.ts` führt **19 geprüfte Werte**,
`lib/waechter-register.ts` **19 Läufe** (beides am 26.09.2026 gezählt), und beide identifizieren
über eine Zeichenkette: der Prüfstand über `feld` („`DEFAULT_HEATPUMP_CONFIG.geprueftIso`"), das
Register über `id` und `tag`. Ein zweiter Markt mit denselben Feldnamen kollidiert.

### 4.1 Der Umbau, der nötig ist — und der, der es nicht ist

**Nötig sind drei Dinge, keines davon groß:**

1. **Ein `markt`-Feld an `PruefEintrag` und `WaechterJob`**, Vorgabewert `"de"`. Damit bleibt
   jeder bestehende Eintrag unverändert gültig, und `stand:faellig` bekommt einen Filter. Die
   Ablage `waechter_reports` trägt den Markt im `tag` mit (`foerder-news-waechter-ch`), nicht
   in einer neuen Spalte — die Spalte gäbe es zweimal.
2. **Die Toleranz bleibt, wo sie ist.** Der Grundsatz „wo das Prüfdatum der Beleg ist, steht die
   Grenze im Prüfstand und wird von dort geholt" trägt unverändert; es kommt nur ein Schlüssel
   (Markt + Feld) statt eines.
3. **`GEPLANTE_LAEUFE` im Gesundheitscheck** braucht je Markt eine eigene Zeile, weil ein
   ausgefallener Schweizer Lauf nichts über den deutschen sagt.

**NICHT nötig — und das ist die wichtigere Aussage:** eine gemeinsame Terminlogik über Märkte.
Ein deutscher EEG-Stichtag und ein Schweizer BFE-Quartalstermin haben nichts miteinander zu
tun; sie in einen Rhythmus zu zwingen wäre eine Vereinheitlichung, die eine Gleichheit
behauptet, die es nicht gibt.

### 4.2 Welche der 19 Läufe sich übertragen lassen

**Unverändert übertragbar — 6 Läufe.** Sie messen unseren Betrieb, nicht einen Markt:
Fehler-Triage, Gesundheitscheck, Kostenwache, nächtlicher Flow-Läufer,
Auto-Änderungen-Wochenbericht, Rechenmodell-Council. Sie brauchen kein `markt`-Feld, nur mehr
Adressen in ihren Listen. **Der Flow-Läufer wird dabei teuer:** Er steht heute bei rund 150
Minuten Wanduhr je Nacht für sieben Flows (255 Minuten Rechenzeit, auf getrennte Jobs
verteilt); ein zweiter Markt verdoppelt beides, und das nächtliche Zeitlimit ist am
05.09.2026 schon einmal gerissen.

**Mechanik übertragbar, Inhalt je Markt — 7 Läufe.** Dieselbe Maschine, andere Quellen:
Förder-Erfassung (der ganze Crawl-, Such- und Screening-Apparat), Förder-Vollprüfung,
Preis-Pipeline, Index-Wellen-Monitor, SEO-Wächter, Geräte-Configs, Legal-Wächter. Bei diesen
sieben ist der Aufwand die **Quellenbeschaffung**, nicht der Code — und genau deshalb sind sie
der billigere Teil.

**Neu zu denken — 6 Läufe.** Ihr Gegenstand existiert anderswo nicht oder anders:

| Lauf | warum er nicht portiert |
|---|---|
| Förder-/CO₂-/BEG-/EEG-News (täglich) | scannt deutsche Rechtsquellen auf vier deutsche Regelwerke. Je Markt ein anderer Scan mit anderen Quellen — die **Bauweise** (Sachstand aus einer Quelle, Zustandswechsel wirft) trägt, der Inhalt nicht |
| Wärmepumpe: Anschaffung, Tarife, BEG | BEG ist deutsches Förderrecht mit einem Fahrplan aus einer Richtlinie. CH/NL/FR/PT haben je ein anderes Instrument |
| EEG-Vergütungssätze und Börsenerlös | rechnet die Degressionskette des EEG nach. In der Schweiz gibt es keine Kette, in Portugal keinen Satz |
| Freiflächen-Zuschlagswerte | deutsche Ausschreibungstermine. In den vier Märkten teils gar kein Ausschreibungssystem für die relevante Größe |
| CO₂-Preis-Prognose-Scan + Voll-Prüfung (2 Läufe) | BEHG ist national. **Teilweise rettbar:** EU-ETS2 gilt ab 2027 EU-weit, also könnte ein Lauf die EU-Ebene für alle EU-Märkte gemeinsam prüfen. Ob die Schweiz — deren Emissionshandel seit 2020 mit dem EU-ETS1 verknüpft ist — auch am ETS2 teilnimmt, ist **UNGEPRÜFT** und vor einem gemeinsamen Lauf zu klären |

**Antwort in einer Zahl: 13 von 19 Läufen lassen sich übertragen** (6 unverändert, 7 mit
ausgetauschten Quellen), **6 müssen neu gedacht werden.**

### 4.3 Was ein neuer Markt an Wächtern zusätzlich braucht

Zwei, die es heute nicht gibt, weil Deutschland sie nicht braucht:

1. **Ein Stichtags-Wächter für das Vergütungsregime.** In den Niederlanden kippt die Regel am
   01.01.2027 und die Mindestvergütung endet am 01.01.2030; in der Schweiz wird der
   Referenzmarktpreis quartalsweise neu festgelegt. Beides ist die Bauform, die wir schon
   haben (`FEED_IN_SCHEDULE`, `BEG_FAHRPLAN`) — aber sie gehört von Anfang an gebaut, nicht
   nachgerüstet. **Der Fahrplan des BEG ist genau daran fast gescheitert:** ohne Stichtag
   hätte der Rechner ab 01.01.2027 den doppelten Fördersatz gezeigt, ohne Absturz und ohne
   roten Test.
2. **Ein Lizenz-Wächter je Gebotszone.** Dass Portugals Börsenpreis gesperrt ist und der
   niederländische nicht, steht in der Antwort und kann sich mit ihr ändern. Unsere Sperre
   liest das heute schon — aber niemand merkt, wenn eine bisher freie Zone zumacht oder eine
   gesperrte aufmacht.

---

## 5. Offene Fragen, die ein Mensch entscheiden muss

**Produkt und Geld:**

1. **Eine Instanz je Markt oder eine mehrsprachige Seite?** Das ist die teuerste
   Architekturentscheidung des ganzen Vorhabens, und sie fällt vor der ersten Zeile Code. Für
   getrennte Instanzen spricht, dass fast jede Zahl, jeder Rechtstext und jede Seitenstruktur
   national ist — die Gemeinsamkeit wäre der Rechenkern, nicht die Seite. Dagegen spricht, dass
   dann jede Verbesserung viermal gemacht wird. **Empfehlung: getrennte Domains, geteiltes
   Paket** — also ein Repository mit einem marktabhängigen Konfigurationssatz und je Markt
   eigenem Deployment. Das ist das, was die Codebasis heute schon nahelegt, weil alle
   Eingangsgrößen ohnehin in Konfigurationsmodulen stehen.
2. **Welche Marke und welche Domain?** „Solar Check" trägt in der Schweiz und den Niederlanden
   vermutlich, in Frankreich und Portugal ist es ein englischer Name in einem Markt, der
   englische Namen unterschiedlich gut aufnimmt. Markenrecherche vor der Domainbuchung.
3. **Wer schreibt die Inhalte?** Die Ratgeber sind der SEO-Hebel, und sie sind nicht
   übersetzbar: Sie beantworten nationale Fragen. Das ist je Markt redaktionelle Arbeit in der
   Landessprache.
4. **Lohnt sich der Wärmepumpen-Rechner überhaupt je Markt?** Er ist der aufwendigste Rechner
   (Gebäudetypologie, Angebotssammlung, Förderrecht, fossile Referenz) und in Portugal
   vermutlich der unwichtigste. **Empfehlung: je Markt einzeln entscheiden, nicht pauschal
   portieren** — in Portugal stattdessen den Klima-Rechner voranstellen.

**Recht und Außenkontakt:**

5. **Anwaltliche Prüfung je Markt** für Datenschutzerklärung, Impressum-Äquivalent und
   Werbekennzeichnung. Das ist nichts, was ein Council ersetzt: Es geht um nationale
   Umsetzungen und nationale Durchsetzungspraxis. In der Schweiz kommt hinzu, dass dort das
   revDSG gilt und nicht die DSGVO.
6. **GISCO: Legal-Judge auf die Nicht-kommerziell-Klausel.** Die Klausel spricht von
   „geographical data" — ob sie auch die reine Attributtabelle (`LAU_..._csv` mit Name, Fläche,
   Einwohnerzahl, ohne Geometrie) erfasst, ist echt zweifelhaft und entscheidet, ob wir eine
   Quelle für 34 Länder haben oder vier nationale Importe bauen. **Nicht selbst entscheiden.**
7. **EDSN anschreiben (Niederlande).** Die Gemeindedaten aus CERES existieren und werden nur
   als Bild veröffentlicht. Eine Mail an `servicedesk@edsn.nl` entscheidet, ob der
   niederländische Atlas eine Jahresreihe oder eine Monatsreihe mit Heimspeichern wird.
   Außenkontakt, also Entscheidung des Betreibers.
8. **Affiliate je Markt.** Der Balkon-Block hängt an einem deutschen Händler, an dessen
   Bildfreigabe und an dessen Programmbedingungen. Ob das Geschäftsmodell in den anderen
   Märkten überhaupt trägt (in der Schweiz ist Steckersolar anders geregelt, in Frankreich und
   Portugal weniger verbreitet), ist eine Produktfrage.

**Fachlich, aber mit Geldfolge:**

9. **Darf das deutsche Lastprofil übernommen werden, wenn kein nationales beschaffbar ist?**
   Es bestimmt den Eigenverbrauch, also die Kernzahl. Die ehrliche Variante ist: übernehmen,
   sichtbar als Annahme benennen, und in der Methodik sagen, in welche Richtung der Fehler
   geht. Die unehrliche wäre, es stillschweigend zu tun. **Empfehlung: übernehmen mit
   sichtbarem Vorbehalt, und in Frankreich nicht** — dort kippt die Elektroheizung das Profil
   so stark, dass die Annahme falsch wird statt unscharf.
10. **19 Jahre statt 35 im Amortisations-Rennen — akzeptabel?** PVGIS reicht 2005–2023. Das
    Rennen ist ein Erzählformat, kein Rechenkern; ein kürzeres Fenster kostet Textur, keine
    Richtigkeit. Aber es endet **zwei Jahre in der Vergangenheit**, und das muss im Bild
    stehen.

---

## 6. Was diese Erhebung nicht geklärt hat

Damit es niemand für geprüft hält:

- **Lastprofile in allen vier Märkten** — nur gesucht, nicht an einer Quelle geprüft.
- **Der französische Einspeisetarif nach der Reform vom Juni 2026** — die genannte Zahl von
  1,1 c€/kWh stammt aus einer Sekundärquelle und ist so niedrig, dass sie vor jeder Verwendung
  an Legifrance im Volltext zu prüfen ist.
- **Die Schweizer Mindestvergütung und der BFE-Referenzmarktpreis** — nur aus Sekundärquellen
  (Energieversorger-Blogs) gelesen. Das BFE selbst wurde nicht abgerufen.
- **Umsatzsteuer auf PV in allen vier Märkten** — nicht geprüft.
- **Nationale Wärmepumpen-Förderung in allen vier Märkten** — nur die Programmnamen genannt.
- **TABULA/EPISCOPE** als europäische Gebäudetypologie — als Kandidat benannt, nicht geprüft.
- **Eurostat `nrg_pc_202`** (Gaspreise) — als wahrscheinliche Entsprechung der Strompreisreihe
  benannt, nicht abgerufen.
- **Die Lizenzen von swisstopo, IGN, PDOK und DGT** — aus Sekundärquellen, nicht am
  Lizenztext.
- **Ob das GISCO-Verbot die Attributtabelle mit erfasst** — offen, siehe Frage 6.
