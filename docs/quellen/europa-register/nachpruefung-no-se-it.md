# Nachprüfung Norwegen, Schweden, Italien — Gemeindedaten für einen Solar-Atlas

**Erhoben am 23.09.2026.** Anlass: Die erste Recherche hatte für alle drei Länder
"nicht machbar" bzw. "schwach" geurteilt, jeweils mit ungeprüften Spuren. Diese
Nachprüfung verfolgt genau diese Spuren.

**Die Leitfrage:** Lässt sich für jede Gemeinde sagen, wie viele Solaranlagen dort
stehen und wie viel Leistung installiert ist — private Dachanlagen enthalten,
unter einer Lizenz, die kommerzielle Nutzung erlaubt?

**Kennzeichnung:** Jede Aussage ist als GEPRÜFT (selbst aufgerufen, mit Datum) oder
UNGEPRÜFT markiert. Ein gescheiterter Abruf steht als solcher da und gilt nicht als
Beleg dafür, dass es die Quelle nicht gibt.

---

## Ergebnis in einem Satz je Land

| Land | Gemeindeseiten machbar | Beste Quelle | Ebene | Aktualität | Lizenz |
|---|---|---|---|---|---|
| **Schweden** | **ja** | Energimyndigheten, PxWeb-Statistikdatenbank | alle 290 Kommunen | Jahr, Stand 07.04.2026 (bis 2025) | amtliche Statistik, Lizenz nicht ausgeschrieben — ein Punkt bleibt offen |
| **Norwegen** | **ja** (technisch), **halb** (rechtlich) | NVE-Solkraftbericht, gespeist aus Elhub | 323 von 357 Kommunen | monatlich, Historie ab 2015 | "uten endringer" — einschränkend, siehe unten |
| **Italien** | **nein** | GSE Atlaimpianti | Comune vorhanden | laufend | kommerzielle Nutzung ausdrücklich verboten |

---

## NORWEGEN

### Was der bisherige Befund sagte

"NVE veröffentlicht Dach-Solarzahlen je Gemeinde, aber nur als Power-BI-Bericht,
nicht maschinenlesbar."

**Der zweite Halbsatz ist widerlegt.** Die Daten sind maschinenlesbar abrufbar.

### 1. Elhub — GEPRÜFT, Ergebnis: keine Solarleistung je Gemeinde

Elhub ist die norwegische Messdatenplattform, aus der NVE seine Zahlen bezieht.
Die offene Schnittstelle liegt unter `api.elhub.no`.

- `GET https://api.elhub.no/energy-data/v0/municipalities` liefert **360 Einträge**
  (357 Kommunen plus Svalbard, Jan Mayen und "Ukjent tilhørighet") — GEPRÜFT 23.09.2026.
- **Die Lizenz ist unproblematisch.** Wortlaut aus dem Datenkatalog
  (`elhub.no/data-og-innsikt/datakatalog`, GEPRÜFT 23.09.2026):
  > "Alle datasett er tilgjengelige under Creative Commons Attribution 4.0
  > International (CC BY 4.0)… du kan fritt kopiere, distribuere og bearbeide
  > dataene, **også kommersielt**, så lenge du viser til Elhub som kilde."
- **Aber: Solarleistung gibt es dort nicht je Gemeinde.** Die API validiert die
  Datensatznamen je Entität. Der Versuch
  `municipalities?dataset=PRODUCTION_PER_GROUP_MBA_HOUR` antwortet mit
  `400 "Invalid dataset for municipality entity"` — GEPRÜFT 23.09.2026.
  Das Bündel des API-Portals kennt genau **einen** Datensatz auf Gemeindeebene:
  `CONSUMPTION_PER_GROUP_MUNICIPALITY_HOUR` (Stromverbrauch), dazu die
  Norgespris-Zählung. Installierte Leistung je Erzeugungsart
  (`installed_capacity_per_date_mba_group_mptype`) liegt ausschließlich auf
  **Preisgebiets**-Ebene (NO1–NO5).

**Fazit Elhub:** offene Lizenz, aber die gesuchte Größe fehlt auf Gemeindeebene.

### 2. SSB (Statistikamt) — GEPRÜFT, Ergebnis: verweist selbst an NVE

Die Solkraft-Faktenseite des SSB führt keine Gemeindetabelle und sagt das
ausdrücklich (GEPRÜFT 23.09.2026):

> "Norges vassdrags- og energidirektorat (NVE) har en oppdatert oversikt over
> solkraft i Norge… Tallgrunnlaget er delt opp på kommune- og fylkesnivå"

In der Statistikbank des SSB liegt dazu keine eigene Tabelle. Die Spur endet bei NVE.

### 3. Geonorge — GEPRÜFT, Ergebnis: nichts

`kartkatalog.geonorge.no/api/search?text=solkraft` und `…?text=solcelle` liefern
beide **NumFound: 0** (GEPRÜFT 23.09.2026). Kein Solar-Datensatz im nationalen
Geodatenkatalog.

### 4. NVEs Power-BI-Bericht — GEPRÜFT, und er IST maschinenlesbar

Der Bericht liegt unter
`nve.no/energi/energisystem/solkraft/oversikt-over-solkraftanlegg-i-norge/`.
Im ausgelieferten HTML steht die vollständige Power-BI-Einbettung samt
öffentlichem Zugriffstoken (`allowAccessOverPublicInternet: true`),
Report `661cbef9-69d1-4b3c-bdf6-42ea13e9986c`.

Damit ließ sich das Datenmodell abfragen — GEPRÜFT 23.09.2026:

- `GET {cluster}/explore/reports/{id}/modelsAndExploration` → HTTP 200, 1,5 MB.
- Das Modell enthält die Dimension `dim_FylkeKommune` mit den Feldern
  **`Kommunenummer`**, `KommuneNavn`, `FylkeNavn` — also den amtlichen
  Gemeindeschlüssel, an dem sich Ortsseiten aufhängen lassen.
- Kennzahlen unter anderem: `Kumulativ antall anlegg`,
  `Kumulativ Installert effekt (kW)`, `Estimert produksjon over valgt periode (MWh)`,
  `Antall nye anlegg over valgt periode`, dazu Leistungsklassen
  `… cummulative (MW): 0-20 kW` / `20-50` / `50-100` / `100-1000` / `>1000 kW`.
- Eine Seite des Berichts heißt "Fylke, Kommune" und enthält ein Tabellen-Visual,
  dessen Abfrage genau diese Spalten liefert (Fylke, Kommune, Jahr, neue Anlagen,
  kumulierte Anlagen, neue kW, kumulierte kW, geschätzte Produktion MWh).

**Abfrage ausgeführt und Daten erhalten** (POST `/explore/querydata`, HTTP 200):

- **323 Kommunen** mit Solardaten, sortiert nach Gemeindeschlüssel.
- Summe über alle Kommunen: **34.542 Anlagen, 972,2 MW**.
- Stichproben: Oslo (0301) 1.473 Anlagen / 45.606 kW · Kristiansand (4204)
  1.169 / 30.654 kW · Bergen (4601) 875 / 27.172 kW · Porsanger (5622) 2 / 25 kW.
- Zeitachse im Modell: 2015 bis 2026.

### Private Dachanlagen: enthalten UND trennbar — GEPRÜFT

Eine zweite Abfrage über die Dimension `dim_Næring` (Feld "Næring eller privat")
liefert je Kommune die Aufteilung (GEPRÜFT 23.09.2026):

| Kategorie | Anlagen | Leistung |
|---|---|---|
| Privat husholdning (Privathaushalt) | 25.615 | 282,4 MW |
| Næring (Gewerbe) | 5.621 | 624,7 MW |
| Ukjent (unbekannt) | 3.306 | 65,1 MW |

Beispiel Oslo: 1.136 private Haushaltsanlagen mit 9.669 kW, 316 gewerbliche mit
34.322 kW, 21 unbekannt mit 1.615 kW.

**Damit ist die Kernfrage für Norwegen sachlich mit ja beantwortet:** Anlagenzahl
und Leistung je Gemeinde, private Dachanlagen enthalten und sogar getrennt
ausweisbar, monatlich aktualisiert.

### Die Einschränkung ist rechtlich, nicht technisch

Auf derselben NVE-Seite steht (GEPRÜFT 23.09.2026, Wortlaut):

> "Det er tillatt å bruke data og figurer dersom NVE er angitt som kilde og
> innholdet presenteres **uten endringer**."

"Uten endringer" — ohne Änderungen. Wer Zahlen je Gemeinde herausgreift, in eigene
Kacheln setzt, Pro-Kopf-Werte bildet oder mit Einwohnerzahlen verrechnet, ändert
den Inhalt. Nach dem Wortlaut deckt diese Erlaubnis einen Atlas **nicht**.

Dagegen steht: NVE nutzt an anderer Stelle die norwegische Lizenz für öffentliche
Daten (NLOD), die genau das erlauben würde. Das ist UNGEPRÜFT für diesen Datensatz —
in Geonorge (siehe oben) liegt er nicht, und auf der Seite selbst steht die engere
Formulierung.

**Offener Punkt (eine Mail):** NVE fragen, ob die Solkraft-Daten unter NLOD stehen
oder ob eine Nutzung mit Quellenangabe in abgeleiteter Form erlaubt ist. Solange
das nicht geklärt ist, gilt für Norwegen: **technisch ja, rechtlich halb.**

### Datenqualität, die NVE selbst benennt

> "Tall for installert effekt er hentet fra dataplattformen [Elhub]…"

und zur Leistungsangabe:

> "Det er ikke gitt at et anlegg produserer like mye som oppgitt, selv under gode
> so[lforhold]…" — dazu der Hinweis, dass in Elhub die **Wechselrichterleistung (AC)**
> registriert wird, die nicht der Modulleistung in kWp entspricht.

Die ausgewiesene Produktion ist **geschätzt**, nicht gemessen ("Den faktiske
produksjonen er ikke kjent"). Für einen Atlas sind Anlagenzahl und Leistung die
belastbaren Größen, die Produktion ist ein Modellwert.

---

## SCHWEDEN

### Was der bisherige Befund sagte

"Die amtliche Statistik führt alle 290 Kommunen mit drei Leistungsklassen, aber die
Klasse der Dachanlagen unter 20 kW ist vielfach aus Geheimhaltungsgründen
unterdrückt."

**Der erste Halbsatz stimmt. Der zweite ist für die aktuellen Jahre falsch.**

### Die Quelle — GEPRÜFT

Die Statistik liegt **nicht** bei SCB, sondern in der PxWeb-Datenbank der
Energiebehörde. Vollständiger Pfad (GEPRÜFT 23.09.2026):

```
https://pxexternal.energimyndigheten.se/api/v1/sv/
  Energimyndighetens_statistikdatabas/Officiell_energistatistik/
  Natanslutna_solcellsanlaggningar/EN0123_1.px
```

Tabelle: "Nätanslutna solcellsanläggningar, antal och installerad effekt, från år 2016 -",
zuletzt aktualisiert **07.04.2026**.

Die Struktur (aus den Metadaten, GEPRÜFT):

- **År:** 2016–2025 (10 Jahre)
- **Region:** 312 Werte = 1 Riket + 21 Län + **290 Kommunen**
- **Effektklass:** `< 20 kW` · `20 kW – 1 000 kW` · `> 1 000 kW` · `Totalt`
- **Kategori:** `Solcellsanläggningar, antal` · `Installerad effekt (MW)`

### Die Auszählung — das war der Auftrag

Abgefragt über die PxWeb-Schnittstelle, alle 290 Kommunen, alle zehn Jahre.
Unterdrückte Zellen tragen im Ergebnis den Status `".."`. Gezählt wurde, in wie
vielen Kommunen ein Wert steht und in wie vielen nicht:

| Jahr | Kommunen mit Wert für < 20 kW | unterdrückt | Kommunen mit Wert für „Totalt" | unterdrückt |
|---|---|---|---|---|
| 2016 | 259 | **31** | 262 | **28** |
| 2017 | 255 | **35** | 262 | **28** |
| 2018 | 271 | **19** | 269 | **21** |
| 2019 | 264 | **26** | 277 | **13** |
| 2020 | 286 | **4** | 287 | **3** |
| 2021 | 290 | **0** | 290 | **0** |
| 2022 | 290 | **0** | 290 | **0** |
| 2023 | 290 | **0** | 290 | **0** |
| 2024 | 290 | **0** | 290 | **0** |
| 2025 | 239 | **51** | 280 | **10** |

**Das Ergebnis für 2025:** Von 290 Kommunen haben **239 einen Wert für die
Dachanlagen-Klasse unter 20 kW**, in **51** ist sie unterdrückt (17,6 %).
Die **Gesamtsumme je Kommune ("Totalt") steht in 280 von 290** Kommunen, in
**10** fehlt sie (3,4 %).

**Für 2021 bis 2024 ist gar nichts unterdrückt** — alle 290 Kommunen tragen in
beiden Klassen einen Wert. Das ist der eigentliche Befund: Der bisherige Eindruck
"vielfach unterdrückt" trifft auf die Anfangsjahre zu (2016/2017: 31 bzw. 35
Kommunen ohne Dachanlagen-Wert) und auf das jüngste Jahr, nicht auf den Bestand.

Die Unterdrückung folgt nicht der Größe der Kommune: Für 2025 fehlt der Wert unter
20 kW unter anderem für **Stockholm**, während er für kleine Kommunen wie Laxå
(298 Anlagen) vorliegt. Das spricht dafür, dass die Geheimhaltung an der **Zahl der
meldenden Netzbetreiber** hängt, nicht an der Zahl der Anlagen — dort, wo ein
Netzbetreiber das Gebiet allein bedient, ist sein Einzelwert sonst ablesbar.
Diese Erklärung ist **UNGEPRÜFT**; in den Fußnoten der Tabelle
(px-Kopf, GEPRÜFT) steht keine Legende dazu.

Die zehn Kommunen ohne Gesamtsumme 2025: Vingåker, Nyköping, Båstad, Ystad, Hylte,
Laholm, Hallsberg, Degerfors, Hofors, Gävle.

### Gegenprobe der Summen — GEPRÜFT

Über alle 290 Kommunen, Jahr 2025: **302.848 Anlagen**, **5.328 MW** installiert,
davon **213.209 Anlagen** in der Klasse unter 20 kW. Stichproben: Linköping
4.833 Anlagen / 98,34 MW (davon 4.196 / 44,0 MW unter 20 kW), Kiruna 107 / 1,25 MW.

### Sind private Dachanlagen enthalten? — ja, GEPRÜFT

Die Meldepflicht liegt bei den Netzbetreibern, und sie melden **je Gemeinde**.
Aus der Erhebungsanleitung (scb.se, GEPRÜFT 23.09.2026):

> "I blanketten anger ni antalet solcellsanläggningar och installerad effekt för
> dessa uppdelat på **kommun** och fem olika effektintervall."

> "Uppgiftsskyldighet föreligger enligt lagen (2001:99) och förordningen (2001:100)
> om den officiella statistiken."

Erfasst wird, was ans Netz angeschlossen ist — die Klasse unter 20 kW ist genau
die der privaten Dachanlagen. Eine Untergrenze wird nicht genannt.

### Lizenz — überwiegend geklärt, ein Rest offen

SCB schreibt für seine Statistikdatenbank (GEPRÜFT 23.09.2026):

> "Statistik och geodata som SCB tillgängliggör som öppna data i statistikdatabasen
> och i vår geodataplattform har licensen Creative commons 0 1.0 Universal, **CC0**."

> "Om du använder eller sprider statistik från scb.se ska dock som källa alltid
> SCB anges."

**Aber diese Tabelle liegt nicht in SCBs Datenbank, sondern in der der
Energiebehörde.** Deren eigene Nutzungsbedingungen enthalten keine
Lizenzangabe, die sich abrufen ließ (zwei Adressen versucht, beide antworten mit
HTTP 200 ohne Lizenztext — das ist ein gescheiterter Abruf, kein Beleg für das
Fehlen). Der allgemeine Rahmen: schwedische Behördendaten fallen unter das
Open-Data-Gesetz, und Digg empfiehlt für Behördendatenbanken CC0 — beides
UNGEPRÜFT für diesen konkreten Datensatz.

**Offener Punkt (eine Mail):** Die Kontaktperson steht im Tabellenkopf
(Johan Harrysson, Energimyndigheten). Eine Zeile Rückfrage klärt die Lizenz.
Das Risiko ist gering: Es handelt sich um amtliche Statistik einer Behörde,
nicht um eine private Datensammlung.

### Zweite Tabelle

`EN0123_2.px` — "installerad effekt per capita och landareal" — enthält dieselbe
Regionalgliederung, bereits auf Einwohner und Fläche bezogen. Für einen Atlas
nicht nötig, die Bezugsgrößen rechnet man besser selbst.

---

## ITALIEN

Hier ist die Trennung zwischen "technisch nicht da" und "rechtlich verboten"
entscheidend. **Für Italien gilt das Zweite: Die Daten existieren auf
Gemeindeebene, ihre kommerzielle Nutzung ist ausdrücklich untersagt.**

### 1. GSE Atlaimpianti — erreichbar, Gemeindeebene vorhanden, kommerziell verboten

Der alte Hostname `atla.gse.it` ist **nicht mehr auflösbar** (DNS-Fehler, GEPRÜFT
23.09.2026). Die Einstiegsseite `gse.it/dati-e-scenari/atlaimpianti` antwortet
dagegen mit HTTP 200; der Atlas ist also nicht eingestellt, sondern umgezogen.

Die Nutzungsbedingungen liegen als PDF bereit
(`Termini di Utilizzo - Atlaimpianti.pdf`, 3 Seiten, heruntergeladen und im
Volltext gelesen, GEPRÜFT 23.09.2026). Drei Stellen im Wortlaut:

**Zur Gliederung — Gemeindeebene ist ausdrücklich enthalten:**

> "Il GSE… mette a disposizione degli utenti il sistema informativo geografico
> Atlaimpianti per consentire la consultazione dei dati e delle informazioni
> relativi agli impianti di produzione di energia elettrica e termica incentivati
> dal GSE, organizzati in forma aggregata per tipologia e potenza dell'impianto,
> meccanismo di incentivazione e area geografica (Regione, Provincia e **Comune**)."

**Zur erlaubten Nutzung:**

> "È consentito riprodurre dati e analisi tecniche del GSE, messe a disposizione
> dal sito, a condizione che venga citata la fonte negli elaborati e nel rispetto
> delle presenti condizioni di utilizzo e della legge istitutiva della banca dati."

**Das Verbot — die entscheidende Stelle:**

> "Al di fuori degli usi consentiti dai presenti termini e delle modalità di
> riproduzione di cui sopra è vietata qualsiasi altra forma di utilizzo delle
> informazioni. **Non è in particolare consentito commercializzare oppure
> trasferire dati e immagini - o parti di esse – per fini di lucro.**"

Dazu, für einen automatisierten Abruf einschlägig:

> "…è fatto espresso divieto di: … c) porre in essere ogni condotta idonea a
> saturare risorse o degradare la regolare disponibilità del servizio… In tale
> ambito vengono comprese anche **operazioni di download e tile cache permanenti
> dei dati**."

Solar Check ist ein kommerzielles Angebot (Provisionserlöse). "Per fini di lucro"
trifft damit zu. **Atlaimpianti ist für uns rechtlich zu, und das steht schwarz
auf weiß.**

Zweite Einschränkung, unabhängig vom Recht: Atlaimpianti führt nur Anlagen,
die **vom GSE gefördert** werden ("incentivati dal GSE") — nicht zwingend den
Gesamtbestand.

### 2. GSE Open Data — ebenfalls nicht-kommerziell

Die Open-Data-Seite des GSE (`gse.it/dati-e-scenari/open-data`, GEPRÜFT
23.09.2026) trägt:

> "Quest'opera è distribuita con Licenza Creative Commons Attribuzione -
> **Non commerciale** - Condividi allo stesso modo 3.0 Italia"

CC BY-**NC**-SA 3.0 IT. Dieselbe Sperre, andere Formulierung. Die dort angebotenen
Themen (Conto Energia, FER Elettriche, Conto Termico …) beziehen sich auf
Fördermechanismen, nicht auf den Gesamtbestand.

### 3. Terna — der einzige echte offene Punkt Italiens

Der Übertragungsnetzbetreiber betreibt ein Datenportal (`dati.terna.it`).
Im ausgelieferten HTML des Download-Centers steht die Filterkonfiguration
(GEPRÜFT 23.09.2026, Wortlaut aus der eingebetteten Konfiguration):

```json
"connectionsViews": [
  {"value":"Region","label":"Region"},
  {"value":"Province","label":"Province"},
  {"value":"Municipality","label":"Municipality"}
]
```

Dazu `FERSources` mit `Solare` und Spannungsebenen einschließlich **`BT`**
(bassa tensione, Niederspannung) — das ist die Ebene, auf der private
Dachanlagen hängen.

**Das ist die einzige italienische Spur, die eine Gemeindeebene mit privaten
Dachanlagen verspricht.** Was ich NICHT belegen konnte:

- Der Download-Endpunkt liegt nicht im ausgelieferten HTML. Fünf geratene
  API-Pfade lieferten alle dieselbe Antwortgröße (≈43 kB, also die Fehlerseite) —
  ein gescheiterter Abruf, kein Beleg für Nichtexistenz.
- **Ob der Datensatz den Bestand oder nur Netzanschluss-Anfragen führt**, ist
  damit offen. "Connessioni" kann beides heißen, und der Unterschied entscheidet
  alles.
- **Die Lizenz ist ungeklärt.** Die API-Nutzungsbedingungen
  (`developer.terna.it/API_Terms_of_Use`, GEPRÜFT) regeln den Portalzugang
  ("L'utenza di accesso è strettamente personale…"), sagen aber zur kommerziellen
  Weiterverwendung der Daten nichts. Ein Zugang setzt eine Registrierung voraus.

**Offener Punkt:** Terna-Konto anlegen, den Datensatz "Connessioni / FER" auf
Gemeindeebene einmal herunterladen und nachsehen, ob dort installierte Leistung
oder nur Anfragen stehen. Erst danach lässt sich Italien abschließend beurteilen.
Bis dahin bleibt es bei **nein**.

### 4. ISTAT — nur 109 Städte, nicht 7.900 Gemeinden

ISTAT führt Photovoltaik in seiner Erhebung "Ambiente urbano". Abgedeckt sind
**ausschließlich die 109 Provinz- und Metropolhauptstädte**, nicht die Gemeinden
(GEPRÜFT 23.09.2026 an der Pressemitteilung "Ambiente urbano – Anno 2024").

Die Kennzahlen dort sind **bezogen**, nicht absolut: Anlagen je km² (2024: 14,4),
installierte Leistung je 100 Einwohner (27,2 kW), Nettoerzeugung je Einwohner
(269,3 kWh), Eigenverbrauch je Einwohner (86,4 kWh). Private Anlagen sind
offensichtlich enthalten (der Eigenverbrauch wäre sonst nicht ausweisbar).

Ein Tabellenpaket wird als ZIP angeboten. Eine Lizenzangabe war auf der Seite
nicht auffindbar — UNGEPRÜFT.

**Für einen Atlas reicht das nicht:** 109 von rund 7.900 Gemeinden, und die
absoluten Werte müsste man aus Bezugsgrößen zurückrechnen.

### 5. dati.gov.it — ein Flickenteppich, national nichts

Das nationale Open-Data-Portal wurde über seine CKAN-Schnittstelle abgefragt
(GEPRÜFT 23.09.2026): `package_search?q=fotovoltaico` liefert **24 Treffer**,
`q=fotovoltaico+comune` **14**. Praktisch alle unter **CC BY 4.0** — die Lizenz
wäre also in Ordnung. Nur ist nichts davon national:

- **Comune di Milano** führt gleich fünf Reihen ab 2015 (Anlagenzahl und Leistung
  in kW, Dichte je 10 km², mittlere Leistung je Anlage, Leistung je 1.000
  Einwohner) — aber eben nur für Mailand.
- **Regione Emilia Romagna / Unione dei Comuni Valle del Savio**: "Impianti
  fotovoltaici pubblici e privati installati". Klingt nach dem Gesuchten, ist es
  aber nicht — aus der Beschreibung im Wortlaut:
  > "I dati sugli impianti privati si riferiscono ai soli impianti incentivati dal
  > GSE (l'incentivazione ha cessato di applicarsi il 06/07/2013)."
  Also nur geförderte Anlagen, und die Förderung endete 2013. Veraltet, und es
  deckt einen Gemeindeverbund ab, keine Region.
- **Provincia Autonoma di Trento**: nur Anlagen auf landeseigenen Gebäuden.
- **Comune di Genova**: nur Anlagen auf gemeindeeigenen Gebäuden.
- **GeoDati-RNDT "fotovoltaico_comune"**: "Individuazione degli impianti
  fotovoltaici di **proprietà comunale**" — Anlagen im Gemeindebesitz.
- **Provincia di Rovigo**, **Regione Toscana**, **Regione Puglia**,
  **Regione Calabria**: Freiflächenanlagen, Genehmigungsverfahren oder
  Eignungsflächen — nicht der Bestand privater Dächer.

**Kein einziger Datensatz deckt den privaten Anlagenbestand über alle italienischen
Gemeinden ab.**

### 6. Südtirol — GEPRÜFT, nichts Passendes

Das Open-Data-Portal des Landes (`data.civis.bz.it`, CKAN-Schnittstelle) liefert
für "fotovoltaico" **0 Treffer**, für "photovoltaik" **2 Treffer** (GEPRÜFT
23.09.2026): zwei Datensätze mit dem mittleren Jahresertrag je Modultyp,
beide CC0. Das sind **Ertragskarten, kein Anlagenregister**. Die Zweisprachigkeit
nützt hier nichts, weil es die Daten schlicht nicht gibt.

---

## Was daraus folgt

**Schweden ist der klare Gewinner und war falsch eingeschätzt.** Eine amtliche
Statistik, die Netzbetreiber gesetzlich verpflichtet je Gemeinde zu melden,
290 Kommunen, Anlagenzahl und Leistung, private Dachanlagen als eigene Klasse,
und in den Jahren 2021–2024 **keine einzige unterdrückte Zelle**. Offen ist nur
eine Lizenzzeile.

**Norwegen ist technisch gelöst, rechtlich nicht.** Die Daten sind da, je Gemeinde,
mit Gemeindeschlüssel, privat und gewerblich getrennt, monatlich aktuell — und
abrufbar. Was fehlt, ist die Erlaubnis, sie in veränderter Form zu zeigen. Das ist
eine Frage an NVE, keine Recherchefrage mehr.

**Italien bleibt zu, und zwar aus einem Grund, den man zitieren kann.** Die Daten
existieren auf Gemeindeebene, aber "non è… consentito commercializzare… per fini
di lucro". Die einzige Tür, die noch offen sein könnte, ist Terna — und die
öffnet sich erst mit einem Konto.
