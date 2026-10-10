# Die fünf Lücken des Markteintritts — geschlossen, teilweise, offen

**Erhoben am 26.09.2026.** Fortschreibung von `docs/marktstart-bestandsaufnahme.md`, Abschnitt 2.8.
Zielmärkte in der Reihenfolge der Bestandsaufnahme: **Schweiz, Niederlande, Frankreich, Portugal.**

**Prüfstatus.** `GEPRÜFT (26.09.2026)` heißt: an diesem Tag selbst abgerufen, und wo eine Datei
gemeint ist, selbst heruntergeladen und die Zeilen selbst gezählt. Die Zahlen in diesem Dokument
sind Messwerte, keine Angaben aus Beschreibungstexten. `UNGEPRÜFT` heißt: nicht selbst gesehen.
**Ein gescheiterter Abruf ist kein Beleg dafür, dass es die Quelle nicht gibt** — wo etwas
scheiterte, steht der Grund daneben.

**Die entscheidende Frage ist überall dieselbe: dürfen WIR das, kommerziell.** Seit dem
Affiliate-Block ist diese Seite kommerziell; eine Lizenz, die nur nicht-kommerziell erlaubt,
ist für uns eine Absage, egal wie gut die Daten sind.

---

## 0. Kurzfassung

| Lücke | Stand | Beste Quelle |
|---|---|---|
| 1 Lastprofil Haushalt | **teilweise** — Daten für alle vier Märkte da, Lizenz nur bei zwei geklärt | CH: ETH/EKZ (CC BY 4.0) · FR: Enedis (Licence Ouverte 2.0) · NL + PT: Datei da, **Lizenz nicht auffindbar** |
| 2 Börsenpreis Portugal | **geschlossen** | OMIE `marginalpdbc` — „puede ser utilizada libremente", keine kommerzielle Schranke |
| 3 Heizöl-Preisreihe | **teilweise** — EU ja, Schweiz nein | EU-Ölbulletin, wöchentlich 2005–2026 je Land; **CH fehlt (Nicht-EU), keine offene Quelle gefunden** |
| 4 Einwohner FR + ES | **geschlossen** | FR: geo.api.gouv.fr (34.957 von 34.969 befüllt) · ES: INE, CC BY 4.0 |
| 5 Nationale Geobasis | **teilweise** — CH/NL/FR vollständig, PT fehlt die PLZ-Zuordnung | swisstopo+BFS · PDOK/CBS · IGN/INSEE · DGT/INE |

**Die eine Überraschung:** Lücke 5, als schwerster Posten der Bestandsaufnahme bezeichnet, ist
für drei von vier Märkten in wenigen Stunden vollständig und kommerziell frei belegt — bei der
Schweiz sogar so, dass **eine einzige Datei Gemeindeliste, Grenzen und Einwohnerzahl zugleich
trägt**. Die Lücke, die bleibt, ist eine ganz andere: die **Lizenz der Lastprofile in den
Niederlanden und in Portugal**. Die Dateien liegen offen im Netz, in genau der Auflösung, die
wir brauchen — und keine der drei Stellen, die sie veröffentlicht, sagt ein Wort dazu, was man
damit tun darf.

**Die zweite Überraschung ist ein Messwert, der nur durch Nachzählen auffiel:** Die
niederländische Heizöl-Reihe im EU-Ölbulletin **endet am 27.02.2023**. 899 von 1.085 Wochen sind
befüllt, danach nichts mehr. Wer die Spalte nur ansieht, sieht Zahlen und hält sie für
vollständig.

---

## 1. Lastprofil des Haushalts

**Worum es geht.** Unsere Stundensimulation (`lib/pv-sim.ts`, `lib/balkon-sim.ts`) braucht eine
Kurve „wann im Jahr und am Tag verbraucht ein Haushalt Strom". Für Deutschland ist das
`calcHourlyConsumption` in `lib/consumption.ts` auf Basis BDEW H0 und VDI 4655.

### 1.1 Was gefunden wurde, Markt für Markt

#### Schweiz — GEPRÜFT (26.09.2026), kommerziell frei

**ETH Zürich + Elektrizitätswerke des Kantons Zürich, „Dataset on residential electricity load
profiles in Switzerland", Zenodo-Datensatz 21398769**, veröffentlicht 21.07.2026.

- **2.447 Wohn-Installationen**, Viertelstundenwerte aus **Smart Metern**, Jahre 2023 und 2024
- unterschieden nach Installationsart: Wohnungen, Einfamilienhäuser, **Wärmepumpen**,
  Gemeinschaftsflächen des Gebäudes
- eine Datei `dataset.zip`, 904,2 MB
- **Lizenz: Creative Commons Attribution 4.0 International** — kommerzielle Nutzung erlaubt,
  Namensnennung Pflicht

Das ist keine Norm, sondern eine Messung — fachlich besser als ein synthetisches Profil, und es
ist die einzige der vier Märkte, für die wir echte Haushaltsmessungen in der Hand haben.
**Nicht gefunden:** ein offen herunterladbares VSE-Standardlastprofil. Der VSE ist ein privater
Verband; dass dort nichts offen liegt, ist erwartbar, aber nicht belegt (UNGEPRÜFT — die
VSE-Seite selbst wurde nicht aufgerufen).

#### Niederlande — Datei GEPRÜFT, **Lizenz nicht auffindbar**

**MFFBAS / Energiedatawijzer, „Profielen elektriciteit 2027"**, ZIP 5,6 MB, selbst
heruntergeladen und ausgezählt.

- Kerndatei `Standaardprofielen elektriciteit 2027 versie 1.00.csv`, 13,4 MB
- **exakt 35.040 Datenzeilen = 365 Tage × 96 Viertelstunden**, volles Kalenderjahr, Werte sind
  Jahresanteile (Summe je Profil = 1)
- Haushaltskategorien direkt aus der Readme: `E1A` = ≤ 3×25 A ohne fernauslesbaren Zähler,
  `E1B` = mit fernauslesbarem Zähler, `E1C` = mit fernauslesbarem Zähler und Tarifschaltung;
  dazu E2A/E2B, E3A–E3D, E4A
- **jede Kategorie in vier Varianten:** `AZI` (Anschluss ohne Einspeisung) und `AMI` (Anschluss
  mit Einspeisung), je getrennt für Richtung `A` (Bezug) und `I` (Einspeisung)

Dass die Niederländer die Profile nach *mit und ohne PV* trennen, ist für uns mehr, als wir für
Deutschland haben — und genau die Unterscheidung, die ein PV-Rechner braucht.

**Zur Lizenz:** Die Datei liegt frei im Netz, ohne Anmeldung. Weder die Seite bei
Energiedatawijzer noch die Readme-PDF noch die Dokumentenseite von MFFBAS nennen eine Lizenz
oder Nutzungsbedingung (alle drei am 26.09.2026 gelesen). `nedu.nl`, in der Literatur überall als
Fundstelle genannt, antwortet mit **HTTP 404** — die Aufgaben sind an MFFBAS übergegangen.
→ **Offene Rechtsfrage, kein Beschaffungsproblem.**

#### Frankreich — GEPRÜFT, kommerziell frei

**Enedis, „Coefficients des profils"**, `opendata.enedis.fr/data-fair/api/v1/datasets/coefficients-des-profils`.

- **17.516.928 Datensätze**, zuletzt aktualisiert 26.09.2026 (täglich)
- **143 Unterprofile, davon 33 für Haushalte:** `RES1_BASE` (Einfachtarif), `RES2_HC`/`RES2_HP`
  (Nieder-/Hochtarif), `RES3_*` und `RES5_*` (Varianten mit Elektroheizung),
  `RES4-BRET/NORD/PACA/SUD_*` (regionale Fassungen), `RES11_*`, dazu Wochentag/Wochenende-Splits
- Zeitraum **18.09.2021 bis 24.09.2026** — ein gleitendes Fünf-Jahres-Fenster
- **Auflösung: Viertelstundenraster, aber die zugrunde liegenden Werte sind halbstündig** —
  gemessen an `RES1_BASE` am 24.09.2026: 23:30 und 23:45 tragen beide 0,7673, 23:00 und 23:15
  beide 0,8833. Wer das für echte Viertelstundenauflösung hält, überschätzt die Datenlage.
- **Lizenz, im Wortlaut aus den Metadaten des Datensatzes:**
  `{"href": "https://www.etalab.gouv.fr/licence-ouverte-open-licence", "title": "Licence Ouverte / Open Licence version 2.0"}`

Die Licence Ouverte 2.0 selbst, im Volltext gelesen (PDF über data.gouv.fr):
> „Le « Concédant » concède au « Réutilisateur » un droit non exclusif et gratuit de libre
> « Réutilisation » de l'« Information » objet de la présente licence, **à des fins commerciales
> ou non**, dans le monde entier et pour une durée illimitée"

und in der Aufzählung ausdrücklich: „de **l'exploiter à titre commercial**, par exemple en la
combinant avec d'[autres informations]". Gegenleistung ist die Paternité (Quellenangabe).

#### Portugal — Datei GEPRÜFT, **Lizenz nicht auffindbar**

**E-REDES, „Perfil Consumo e Injeção E-REDES 2026"**, XLSX 6,9 MB, selbst heruntergeladen und
ausgezählt.

- **35.045 Zeilen, davon 35.040 Datenzeilen = volles Jahr 2026 in Viertelstunden**
- Profile: **BTN A, BTN B, BTN C** (Baixa Tensão Normal — das sind die Haushalte), IP
  (Straßenbeleuchtung), MP, dazu **UPAC-Profile A und B** für Eigenverbrauchsanlagen, jeweils mit
  **getrennter Verbrauchs- und Einspeisekurve**
- Methodik von der Regulierungsbehörde ERSE genehmigt (GMLDD, in Kraft seit 12.09.2025), gebildet
  aus zehn Jahren Lastgängen (Oktober 2015 bis September 2025)

**Zur Lizenz:** Auf der Profilseite von E-REDES steht nichts. Kein Lizenzfeld, keine
Nutzungsbedingung. → **Offene Rechtsfrage, kein Beschaffungsproblem.**

### 1.2 Europaweite Forschungssätze — geprüft und als Ersatz verworfen

- **LoadProfileGenerator** (Forschungszentrum Jülich): seit Februar 2020 unter **MIT-Lizenz**,
  kommerzielle Nutzung also erlaubt. Aber: die 60 vordefinierten Haushalte sind **für Deutschland
  validiert**. Ein deutsches Verhaltensmodell auf die Schweiz, die Niederlande, Frankreich oder
  Portugal anzuwenden, ist dieselbe unbelegte Übertragung wie H0 — nur mit mehr Rechenaufwand.
- **Zenodo** trägt eine wachsende Zahl synthetischer Sätze (MODERATE-Projekt, LPG-Ableitungen,
  DLR-Sätze für Deutschland und Neuseeland). Für unsere vier Märkte ist der **Schweizer
  ETH/EKZ-Satz der einzige gefundene, der echte nationale Messungen enthält.**
- **Ein Satz mit allen vier Märkten in einer Datei wurde nicht gefunden.** Die nationale Quelle
  ist in drei von vier Fällen ohnehin besser, weil sie der Zuordnung folgt, die der jeweilige
  Markt selbst für seine Abrechnung benutzt.

### 1.3 Wäre das deutsche H0 als Übergangslösung vertretbar?

**Kurz: ja — aber die Frage ist in drei von vier Märkten gar nicht mehr zu stellen, und im
vierten ist sie am teuersten.**

**Was belegt ist.** Es gibt eine gemessene Gegenprobe des H0 gegen echte Haushaltsdaten, und sie
ist ernüchternd — aber sie ist **innerdeutsch**, nicht länderübergreifend: Der Datensatz zu
Einfamilienhäusern und Wärmepumpen in Deutschland (Nature Scientific Data, 2022) hält H0 gegen
gemessene deutsche (NOVAREF) und österreichische (ADRES) Haushalte. Befund: Die Grundform stimmt
(Nachtabsenkung, Tagesspitze, Abendspitze), aber die Messung liegt **rund zwei Stunden früher** —
die Nachtabsenkung endet gegen 5 Uhr statt 7 Uhr, die Abendspitze liegt bei 17–18 Uhr statt
20 Uhr; die Nachtlast ist höher (~170 W gegen 130 W), die winterliche Abendspitze niedriger
(~600 W gegen 680 W). **Das H0 ist also schon gegenüber der deutschen Wirklichkeit um zwei
Stunden verschoben**, bevor irgendjemand es exportiert.

**Was NICHT belegt ist — und das ist die eigentliche Antwort auf die Frage.** Es wurde **keine
Studie gefunden, die das deutsche H0 gegen schweizerische, niederländische, französische oder
portugiesische Haushaltsprofile hält.** Eine solche Gegenprobe existiert nach heutiger Recherche
nicht. Wer H0 exportiert, tut das unbelegt — nicht „vermutlich ungefähr richtig", sondern
ungeprüft.

**Qualitative Hinweise, ausdrücklich nur als Hinweise:** Die Literatur zur europäischen
Lastformen-Verschiedenheit nennt für die Niederlande, dass die Abendspitze **nach dem Essen**
liegt, weil dort mit Gas gekocht wird — das ist genau die Stunde, in der ein PV-Rechner
entscheidet, ob Strom aus dem Dach oder aus dem Netz kommt. Für die Iberische Halbinsel wird eine
schwache Teilnahme am kontinentaleuropäischen Tagesmuster beschrieben. Beides ist
Sekundärliteratur, beides ist **keine Zahl, mit der man rechnen kann**, und beides gehört nicht
in eine Begründung, ohne dass jemand die Fundstelle selbst gelesen hat.

**Was es kosten würde — und hier ist unser eigener Code die bessere Auskunft als jede Studie.**
Der Preis hängt davon ab, welcher Rechner in welchem Markt läuft:

| | Woran das Lastprofil hängt | Trifft es das GELD? |
|---|---|---|
| **Dach-PV-Rechner heute (DE)** | `simulatePvYear` → Autarkie (angezeigt) und `profilFaktorAus` → Wert des eigenen Einspeiseprofils | **Kaum.** Der Eigenverbrauch fürs Geld kommt aus `calcEigenverbrauchExakt` (HTW-Power-Law), nicht aus der Simulation — so steht es in `lib/calc.ts` und in CLAUDE.md. Geld berührt das Profil nur über den Börsenerlös, und der ist per Voreinstellung aus. |
| **Balkon-Rechner (DE)** | `simulateSolarYear` → `sim.selfUsedKwh`, `sim.feedInKwh` | **Ja, vollständig.** Dort IST die Stundensimulation die Geldrechnung. |
| **Dach-PV-Rechner Schweiz** | dieselbe Simulation | **Ja, vollständig** — und das ist der Punkt. Die Schweiz kennt keine laufende Einspeisevergütung, nur die Einmalvergütung plus eine Rückliefervergütung am Marktwert. Damit entscheidet die Aufteilung zwischen Eigenverbrauch und Rücklieferung über den gesamten Erlös, und die Aufteilung kommt aus dem Lastprofil. |

**Daraus die Empfehlung:**

1. **Für die Schweiz H0 NICHT übernehmen.** Der Markt, in dem das Profil am meisten Geld bewegt,
   ist zugleich der einzige mit einem echten gemessenen nationalen Datensatz unter CC BY 4.0. Das
   deutsche Profil dort einzusetzen wäre die schlechteste verfügbare Wahl bei vorhandener bester.
2. **Für Frankreich Enedis nehmen.** Lizenz sauber, täglich aktualisiert, 33 Haushaltsvarianten —
   es gibt keinen Grund für einen Übergang.
3. **Für die Niederlande und Portugal ist H0 als Übergang vertretbar** — aber nur, solange der
   Rechner dort so gebaut ist wie der deutsche heute, also mit dem HTW-Power-Law fürs Geld und der
   Simulation nur für Autarkie und Marktwert. Die Autarkie ist eine angezeigte Zahl; sie mit einem
   fremden Profil zu rechnen ist eine Ungenauigkeit, kein falscher Euro-Betrag. **Sichtbar
   dranschreiben, was gilt** — dieselbe Regel wie beim übersprungenen Dach: ein stiller Default
   ist der eigentliche Fehler.
4. **Der Übergang endet, sobald die Lizenzfrage beantwortet ist**, und das ist eine Frage an einen
   Legal-Judge, keine Recherche mehr: Trägt ein regulatorisch festgesetztes Allokationsprofil
   (NL: nach der Informatiecode unter Aufsicht der ACM; PT: nach dem GMLDD der ERSE) überhaupt ein
   Schutzrecht, und wenn ja, wessen? Beide Dateien sind ohne Anmeldung öffentlich abrufbar.

---

## 2. Börsenpreis Portugal — **geschlossen**

**Die Sperre gilt nur der bisherigen Quelle, nicht dem Preis.** Am 26.09.2026 an der Schnittstelle
nachgemessen: Energy-Charts liefert je Gebotszone ein eigenes Lizenzfeld, und es heißt
`license_info`, nicht `license` — wer nach `license` greift, bekommt `None` und hält die Zone
fälschlich für unlizenziert.

- `bzn=NL` → `CC BY 4.0 (creativecommons.org/licenses/by/4.0) from Bundesnetzagentur | SMARD.de`
- `bzn=CH` → dasselbe
- `bzn=PT` → `The data provided herein is for private and internal use only. The utilization of
  any data, whether in its raw or derived form, for external or commercial purposes is expressly
  prohibited.`

Die Liste der freigegebenen Zonen steht in der API-Beschreibung im Klartext: **AT, BE, CH, CZ,
DE-LU, DE-AT-LU, DK1, DK2, FR, HU, IT-North, NL, NO2, PL, SE4, SI.** **PT und ES fehlen darin** —
die Bestandsaufnahme lag richtig.

### 2.1 Die Lösung: OMIE selbst

**OMIE (OMI-Polo Español S.A.) ist der Marktbetreiber des iberischen Tagesmarkts für Spanien UND
Portugal und veröffentlicht den portugiesischen Preis selbst.** GEPRÜFT (26.09.2026), Dateien
selbst heruntergeladen.

**Zugang:** ohne Anmeldung, ohne Schlüssel.
`https://www.omie.es/es/file-download?parents=marginalpdbc&filename=marginalpdbc_JJJJMMTT.1`
(Aufruf über 302 auf dieselbe Adresse ohne Array-Klammern — mit `-L` folgen.)

**Format.** Eine Kopfzeile `MARGINALPDBC;`, dann je Periode
`Jahr;Monat;Tag;Periode;Preis_Portugal;Preis_Spanien;`.

**Welche Spalte Portugal ist, wurde nicht geglaubt, sondern belegt.** Gegen den amtlichen
OMIE-Bericht `INT_PBC_EV_H_1_01_03_2026_01_03_2026.TXT`, der seine Zeilen selbst beschriftet:

| Periode | Bericht „sistema **español**" | Bericht „sistema **portugués**" | `marginalpdbc` Spalte 5 / Spalte 6 |
|---|---|---|---|
| 46 | −2,00 | −1,51 | −1.51 / −2 |
| 47 | −2,10 | −1,51 | −1.51 / −2.1 |

→ **Spalte 5 ist Portugal, Spalte 6 ist Spanien.** Am 01.03.2026 liefen die beiden Zonen in
13 Viertelstunden auseinander; an ruhigen Tagen (01.02.2025, 15.12.2023) sind sie identisch, weil
die Kopplung nicht bindet. Wer nur einen ruhigen Tag ansieht, kann die Spalten nicht unterscheiden.

**Auflösung, gemessen an den Dateien selbst:**

| Tag | Zeilen | bedeutet |
|---|---|---|
| 15.12.2023 | 26 | 24 Stunden — **stündlich** |
| 01.02.2025 | 26 | stündlich |
| 01.03.2026 | 98 | 96 Viertelstunden — **viertelstündlich** |

Die Umstellung ist der europäische Wechsel der Marktzeiteinheit auf 15 Minuten. Ein Importeur, der
24 Zeilen fest annimmt, bricht am Umstellungstag.

**Archivtiefe, gemessen:** Tagesdateien ab 01.01.2023, Jahres-ZIPs für **2018, 2019, 2020, 2021,
2022** (das ZIP 2018 selbst geladen: 366 Dateien, 242.278 Byte entpackt, erster Tag
`2018;01;01;1;28.1;6.74;`). Für **2010, 2014 und 2017 antwortet der Download mit HTTP 404** — die
Reihe beginnt nach heutigem Stand 2018. Acht Jahre reichen für einen Marktwert-Anker, nicht für
eine 20-Jahres-Reihe; das ist aber auch nicht nötig, weil unser Marktwert-Modell ein Niveau plus
eine Preisform ist, kein historischer Pfad.

**Lizenz, im Wortlaut** (Aviso Legal, 26.09.2026 in beiden Sprachfassungen gelesen):

> „la Información de carácter público y gratuito **puede ser utilizada libremente**, siempre que
> se respete íntegramente su contenido original"
> „En caso de que se utilice la información de la página Web de OMIE **en su formato original**,
> se debe citar la fuente."

Englische Fassung derselben Seite:

> „the Information that is of a public nature and free of charge **can be used freely**, provided
> that its original content is fully respected"
> „In the event that the information in the OMIE website is used in its original format, you must
> cite the source."

**Keine kommerzielle Schranke.** Die einzige Bedingung ist die Unversehrtheit des Inhalts und, bei
unveränderter Weitergabe, die Quellenangabe. Für einen abgeleiteten Monats-Marktwert greift die
Formulierung „en su formato original" streng genommen gar nicht — **wir nennen die Quelle
trotzdem**, mitsamt dem Zusatz, dass wir gerechnet haben, wie bei der KfW.

**Ein Vorbehalt, der ehrlich dazugehört:** „siempre que se respete íntegramente su contenido
original" ist auslegungsbedürftig. Gelesen als „nicht verfälschen" trägt es unseren Fall; gelesen
als „nur unverändert" trüge es ihn nicht. Vor dem ersten portugiesischen Euro gehört diese eine
Formulierung vor einen Legal-Judge — es ist ein Satz, keine Recherche.

### 2.2 Was noch geprüft wurde

- **ENTSO-E Transparency Platform** — tragfähige Rückfallebene, aber umständlicher. Die
  Nutzungsbedingungen (Fassung Juni 2015, PDF im Volltext gelesen) verlangen Treu und Glauben,
  Quellenangabe und das Verbot, einen Eindruck von Unterstützung durch ENTSO-E zu erwecken.
  **Ein Verbot kommerzieller Nutzung steht nicht darin.** Der Haken steht an anderer Stelle:
  > „not cause prejudice to the copyright or related right on a Transparency Platform Data, which
  > may be owned by the concerned Primary Owner of Data. In case of a risk to cause prejudice to
  > said right, the Data User shall seek the prior agreement of the holder"

  Der Primary Owner des portugiesischen Preises ist OMIE — und dessen eigene Bedingungen erlauben
  die freie Nutzung. Der Umweg endet also bei derselben Quelle, nur mit einer Bedingung mehr.
  **Die aktuelle Fassung (seit 01.11.2023) konnte nicht gelesen werden:** Die Seite steht hinter
  einer Bot-Prüfung von Cloudflare, HTTP 403. Das ist ein gescheiterter Abruf, kein Befund.
- **ERSE und REN** wurden nicht als Preisquelle geprüft, weil OMIE die Frage bereits beantwortet.
  ERSE ist die Regulierungsbehörde (sie genehmigt Tarife und Profile, sie führt keinen
  Spotmarkt), REN ist der Übertragungsnetzbetreiber. UNGEPRÜFT, aber auch nicht mehr nötig.
- **Für den Marktwert Solar fehlt neben dem Preis die Gewichtung, also das portugiesische
  Solar-Erzeugungsprofil.** Das liefert Energy-Charts: `public_power?country=pt` gibt 15 Reihen
  einschließlich `Solar` (GEPRÜFT). Die Antwort trägt **kein** Lizenzfeld — das ist kein Mangel,
  sondern die Voreinstellung der Schnittstelle, denn die API-Beschreibung sagt im Wortlaut:
  > „**Unless stated otherwise**, the data provided by the Energy-Charts API is licensed under the
  > CC BY 4.0 license. Proper attribution to Energy-Charts.info as the source is required."

  Das ausdrückliche Verbot gilt ausschließlich dem `/price`-Endpunkt und dort nur den Zonen
  außerhalb der Liste. **Erzeugung Portugal ist damit CC BY 4.0, Preis Portugal nicht.**
  Der Marktwert entsteht aus OMIE-Preis × Energy-Charts-Erzeugung, zwei Quellen, beide nutzbar.

---

## 3. Heizöl-Preisreihe — **teilweise**

### 3.1 Die EU-Märkte: geschlossen, mit einem gemessenen Loch

**Ölbulletin der Europäischen Kommission (GD Energie).** Die Datei
`Weekly_Oil_Bulletin_Prices_History_maticni_4web.xlsx` (4,5 MB) wurde heruntergeladen und
ausgezählt.

- Blätter: `Prices with taxes`, `Prices wo taxes`, `Consumption`, `VAT`, `Excise duties`,
  `Excise duties - components`, `Other Indirect Taxes`
- Produkt im Kopf wörtlich: „**Gas oil de chauffage / Heating gas oil / Heizöl (II)**", Einheit
  **€ je 1000 l**, daneben Euro-super 95, Dieselkraftstoff, schweres Heizöl, Flüssiggas
- **1.085 Wochen, 03.01.2005 bis 21.09.2026** — knapp 22 Jahre
- 27 Mitgliedstaaten plus die Aggregate EU und Euroraum

**Befüllung je Land, gezählt (nicht angenommen):**

| Land | befüllte Wochen | jüngster Wert | ältester Wert |
|---|---:|---|---|
| Frankreich | 1085 / 1085 | 21.09.2026 · 1.937 €/1000 l | 03.01.2005 · 473 |
| Portugal | 1085 / 1085 | 21.09.2026 · 2.268 | 03.01.2005 · 523 |
| Deutschland | 1085 / 1085 | 21.09.2026 · 1.710 | 03.01.2005 · 433 |
| Spanien | 1084 / 1085 | 21.09.2026 · 1.510 | 03.01.2005 · 486 |
| **Niederlande** | **899 / 1085** | **27.02.2023 · 1.902** | 03.01.2005 · 673 |

**Die niederländische Reihe hört 2023 auf.** Das ist der Befund, der nur durch Zählen auffällt —
die Spalte sieht befüllt aus, weil 899 Zahlen darin stehen. Für uns ist der Schaden gering, weil
in den Niederlanden Gas und nicht Heizöl die fossile Referenz ist; **aber wer dort eine
Öl-Referenz baut, baut sie auf einer Reihe, die seit dreieinhalb Jahren stillsteht.** Für die
Niederlande gilt: fossile Referenz = Gas, und Gas führt Eurostat (`nrg_pc_202`).

**Reihenlänge für einen 20-Jahres-Preispfad:** Frankreich, Portugal und Spanien tragen
22 Jahre lückenlos. Das ist länger als jede Reihe, mit der wir heute für Deutschland rechnen.

**Lizenz.** Der Eintrag im EU-Datenportal (`data.europa.eu`, Kennung `eu-oil-bulletin`, Herausgeber
Generaldirektion Energie) trägt **kein Lizenzfeld**; `access_right` steht auf
`http://publications.europa.eu/resource/authority/access-right/PUBLIC`. Die tragende Regel ist
der **Beschluss 2011/833/EU der Kommission vom 12.12.2011 über die Weiterverwendung von
Kommissionsdokumenten**, am 26.09.2026 im Volltext gelesen:

> Art. 3 Nr. 2: „‚reuse' means the use of documents by persons or legal entities of documents,
> **for commercial or non-commercial purposes** other than the initial purpose for which the
> documents were produced."
> Art. 6 Abs. 1: „Documents shall be made available for reuse **without application** unless
> otherwise specified and **without restrictions** or, where appropriate, an open licence or
> disclaimer setting out conditions".
> Art. 9 Abs. 1: „The reuse of documents shall in principle be **free of charge**."

Art. 6 Abs. 2 nennt als zulässige Bedingungen genau die beiden, die wir ohnehin einhalten: die
Quelle nennen und den ursprünglichen Sinn nicht verfälschen. **Kommerzielle Nutzung ist damit
gedeckt.** Der Geltungsbereich nach Art. 2 sind von der Kommission veröffentlichte Dokumente —
das Ölbulletin ist eines.

### 3.2 Die Schweiz: bleibt offen

**Es wurde keine offene amtliche Schweizer Heizöl-Preisreihe in CHF je Liter gefunden.** Gemessen,
nicht vermutet:

- **opendata.swiss, Suche „Heizöl": 3 Treffer** — Bruttoenergieverbrauch je Gemeinde,
  CO₂-Emissionen je Energieträger, Wohngebäude nach Heizungs-Energieträger. **Kein Preis.**
- **opendata.swiss, Suche „Durchschnittspreise": 24 Treffer**, sämtlich Agrarmarkt (Ölsaaten,
  Eier, Früchte). **Kein Heizöl.**
- Das BFS veröffentlicht den **Landesindex der Konsumentenpreise** — das ist ein Index, kein
  Preis in CHF je Liter. Als Pfadgröße für eine Brennstoffrechnung reicht ein Index nicht: Wir
  brauchen ein Niveau, nicht nur eine Veränderung.
- Die monatliche Reihe in Rappen je Liter, die in der Schweiz überall zitiert wird, stammt von
  **Avenergy Suisse** (Branchenverband) beziehungsweise wird von der NZZ wöchentlich publiziert und
  vom HEV nachgeführt. Das sind **private Stellen** — Datenbankherstellerrecht, Nutzungsbedingungen
  ungeprüft. Dieselbe Klasse wie die fremden Förderlisten: als Hinweisgeber brauchbar, als Quelle
  für eine Zahl in unserem Rechner nicht ohne eigene Prüfung.

**Empfehlung für die Schweiz:** Heizöl im Wärmepumpen-Rechner zunächst **gar nicht anbieten** und
das sichtbar begründen, statt eine Zahl aus einer Verbandsquelle zu übernehmen. Die Schweiz heizt
ohnehin überwiegend mit Öl und Gas in etwa gleichen Teilen; welche Referenz dort gebraucht wird,
ist ohnehin eine eigene Erhebung. **Was nicht passieren darf:** den deutschen oder
französischen Heizölpreis als Näherung einsetzen — die Schweizer Mineralölsteuer und der
Wechselkurs machen daraus eine Zahl, die niemand nachrechnen kann.

---

## 4. Einwohnerzahlen Frankreich und Spanien — **geschlossen**

### 4.1 Frankreich — eine einzige Abfrage genügt

`https://geo.api.gouv.fr/communes?fields=code,nom,population,codeDepartement,codeRegion,codesPostaux&format=json`
— 4,2 MB, GEPRÜFT (26.09.2026), selbst heruntergeladen und ausgezählt:

- **34.969 Gemeinden**
- **Einwohnerzahl bei 34.957 (100,0 %)**, Summe **68.952.941** (plausibel für Frankreich
  einschließlich Überseedepartements)
- **Postleitzahlen bei 34.964**
- Gemeindeschlüssel ist der **INSEE-Code** (fünfstellig, z. B. `01001`), dazu Departement und
  Region
- Beispiel wörtlich: `{'code': '01001', 'nom': "L'Abergement-Clémenciat", 'population': 860,
  'codeDepartement': '01', 'codeRegion': '84', 'codesPostaux': ['01400']}`

Die API führt INSEE-Gemeindeverzeichnis, INSEE-Bevölkerungszahlen, IGN-Geometrie und die
Postleitzahlen zusammen. **Die Bestandsaufnahme hatte recht, dass die europaweite Datei die
Einwohnerzahlen für Frankreich nicht trägt — und die nationale Lösung kostet eine Zeile Code.**

Die Einwohnerzahl steht zusätzlich als Feld `POPULATION` in IGN **ADMIN EXPRESS** (Lizenz siehe
unten), also auch dort, wo ohnehin die Geometrie herkommt.

### 4.2 Spanien — CC BY 4.0, im Wortlaut

**INE (Instituto Nacional de Estadística).** Die Lizenzseite wurde im Volltext gelesen:

> „La licencia de uso general a aplicar a la información estadística de este sitio web, salvo que
> se indique lo contrario, es la **Creative Commons Reconocimiento 4.0 (CC BY 4.0)** que implica
> la autorización para la reutilización de la información en condiciones no restrictivas, siendo
> posible la copia, distribución y comunicación pública, así como la producción de obras
> derivadas, **incluso con finalidad comercial** citando la autoría."

Und — für uns unmittelbar anschlussfähig an die KfW-Regel — die geforderte Quellenangabe
unterscheidet, ob wir gerechnet haben:

> „Fuente: Sitio web del INE: www.ine.es **si no se realiza ningún tratamiento de los datos** o
> bien: **Elaboración propia con datos extraídos del sitio web del INE**: www.ine.es en caso de
> que se realice tratamiento de los datos."

**Zugang, GEPRÜFT:** `https://servicios.ine.es/wstempus/js/ES/DATOS_TABLA/<id>?nult=1`, ohne
Schlüssel. Die Operation `DPOP` („Cifras Oficiales de Población de los Municipios Españoles")
führt **65 Tabellen**, darunter **52 Gemeindetabellen, eine je Provinz**. Alle 52 wurden
abgerufen und ausgezählt:

- **8.136 Gemeindereihen, Datenjahr 2025** (amtlich werden 8.132 Gemeinden geführt; die Differenz
  von vier kommt aus meiner Zählweise — je Provinz eine Summenzeile abgezogen —, nicht aus den
  Daten)
- je Gemeinde drei Reihen (Gesamt / Männer / Frauen); Beispiel Albacete: 264 Reihen = 88 Gemeinden
- Datenjahr **2025** — deutlich aktueller als jede Zensusquelle, und aktueller als das, was die
  europaweite Gemeindedatei überhaupt führen könnte

**Zwei Fallen, beide gemessen:**
- Die Sammeltabelle 29005 („Cifras oficiales del padrón por municipio") liefert über die
  Schnittstelle nur ein abgeschnittenes Bruchstück (250 KB, kein gültiges JSON). **Der Weg geht
  über die 52 Provinztabellen, nicht über die Sammeltabelle.**
- Ein Lauf über alle 52 lief in **einen Zeitüberschreitungs-Fehler bei Tabelle 2878 (Lleida)**,
  der im zweiten Anlauf durchging. Ein Importeur, der den Fehlschlag nicht wiederholt, verliert
  eine ganze Provinz (231 Gemeinden) — **und zwar still**, weil die anderen 51 sauber laufen.

---

## 5. Nationale Geobasis je Markt — **teilweise (3 von 4 vollständig)**

Gebraucht werden vier Bestandteile: amtliche Gemeindeliste mit Schlüssel · Gemeindegrenzen als
Geometrie · Einwohnerzahl je Gemeinde · Zuordnung Postleitzahl → Gemeinde.

### 5.1 Übersicht

| Markt | Gemeindeliste | Grenzen | Einwohner | PLZ → Gemeinde |
|---|---|---|---|---|
| **Schweiz** | **ja** | **ja** | **ja** | **ja** |
| **Niederlande** | **ja** | **ja** | **ja** | **ja** |
| **Frankreich** | **ja** | **ja** | **ja** | **ja** |
| **Portugal** | ja¹ | ja¹ | **ja** (Zensus 2021) | **nein — hinter Anmeldung** |

¹ Quelle, Lizenz und Existenz der Datei sind belegt; **der Dateiinhalt wurde nicht ausgezählt**,
weil der Download der DGT dreimal in ein Zeitlimit lief (Einzelheiten unter 5.5).

Alle mit „ja" markierten Bestandteile sind **kommerziell nutzbar**, Lizenz unten im Wortlaut. Kein
Eintrag ist „kommerziell fraglich" — die einzige Zelle mit einem Problem ist die portugiesische
Postleitzahl, und dort ist das Problem nicht die Lizenz, sondern dass man sie ohne Konto gar nicht
zu Gesicht bekommt.

### 5.2 Schweiz — drei von vier Bestandteilen in EINER Datei

**Gemeindeliste: BFS, amtliches Gemeindeverzeichnis, über die Schnittstelle**
`https://www.agvchapp.bfs.admin.ch/api/communes/snapshot?date=TT-MM-JJJJ` (Datumsformat
**TT-MM-JJJJ**; `JJJJ-MM-TT` wird mit HTTP 400 abgewiesen). Stand 01.09.2026, selbst
heruntergeladen und ausgezählt:

- **2.280 Zeilen: 2.110 Gemeinden, 144 Bezirke, 26 Kantone**
- Spalten: `HistoricalCode, BfsCode, ValidFrom, ValidTo, Level, Parent, Name, ShortName,
  Inscription, Radiation` — also Schlüssel, Hierarchie **und Gültigkeitszeitraum**
- Die Gebietsänderungen, für die wir in Deutschland einen eigenen Destatis-Lauf brauchen, stecken
  hier in denselben Feldern. Für ein Land, das häufiger fusioniert als Deutschland, ist das der
  wichtigere Teil.

**Grenzen UND Einwohnerzahl: swisstopo swissBOUNDARIES3D.** Ausgabe `swissboundaries3d_2026-01`,
GeoPackage-ZIP 37,4 MB (entpackt 74,2 MB), selbst heruntergeladen und mit SQLite ausgezählt.
Ebene `tlm_hoheitsgebiet`:

- **2.136 Zeilen, davon 2.123 mit Länderkennung `CH`** (dazu 11 Liechtenstein, je 1 deutsche und
  italienische Enklave)
- Felder: `bfs_nummer`, `name`, `kantonsnummer`, `bezirksnummer`, **`einwohnerzahl`**,
  `gem_flaeche`, `see_flaeche`, `geom` (MultiPolygon)
- **2.110 der 2.123 Schweizer Zeilen tragen eine Einwohnerzahl > 0, Summe 9.051.029** — plausibel
  für die Schweiz
- Beispiel: `131 | Adliswil | Kanton 1 | Bezirk 106 | 19.893 Einwohner | 777 ha`

**Die beiden Quellen stimmen auf die Zeile überein, und das wurde nachgesehen statt angenommen.**
Das BFS-Verzeichnis führt 2.110 Gemeinden, swisstopo 2.123 Schweizer Flächen — die Differenz von
13 sind **Seeflächen, Kommunanzen und ein Staatswald, jeweils mit eigener BFS-Nummer und ohne
Einwohner**: Zürichsee (ZH), Bodensee (TG), Bodensee (SG), Brienzersee, Thunersee, Greifensee,
Bielersee (BE/NE), Lac de Neuchâtel (BE/NE), Comunanza Cadenazzo/Monteceneri, Comunanza
Capriasca/Lugano, Staatswald Galm. **2.123 − 13 = 2.110.** Wer die Seeflächen mitzählt, hat 13
Gemeinden zu viel und eine Kachel „Anlagen je Einwohner" mit Nenner null.

**Das ist der beste Einzelfund dieser Recherche:** Geometrie, Schlüssel und Einwohnerzahl in einer
Datei, in einem Import, aus einer Quelle. Deutschland braucht dafür drei.

**Lizenz swisstopo, im Wortlaut** („Nutzungsbedingungen für kostenlose Geodaten und Geodienste",
Abschnitt 2, gelesen 26.09.2026):

> Die Geodaten „dürfen angereichert, bearbeitet sowie auch **kommerziell genutzt** werden."

Pflicht ist die Quellenangabe: „Bei digitalen oder analogen Darstellungen und Publikationen sowie
bei der Weitergabe ist in jedem Fall eine der folgenden Quellenangaben anzubringen" — zulässig
sind unter anderem „Bundesamt für Landestopografie swisstopo" und „©swisstopo".

**Ein Hinweis, der Zeit spart:** Der Katalogeintrag bei data.geo.admin.ch trägt im Feld `license`
den Wert `proprietary`. Das ist **kein Widerspruch** zu den Bedingungen oben, sondern der
Umstand, dass swisstopo bewusst keine Creative-Commons-Lizenz verwendet — die Nutzungsbedingungen
selbst sagen, CC-Lizenzen seien „nicht kompatibel" mit den gesetzlichen Grundlagen (GeoIG, GeoIV).
Wer nur das Katalogfeld liest, hält die Daten für unfrei und sie sind es nicht.

**PLZ → Gemeinde: swisstopo, amtliches Ortschaftenverzeichnis mit Postleitzahl und Perimeter**
(`ch.swisstopo-vd.ortschaftenverzeichnis_plz`, CSV in WGS84, 193 KB gepackt). Selbst
heruntergeladen und ausgezählt:

- **5.718 Zeilen**, Spalten `Ortschaftsname; PLZ4; Zusatzziffer; ZIP_ID; Gemeindename; BFS-Nr;
  Kantonskürzel; Adressenanteil; E; N; Sprache; Validity`
- **3.190 verschiedene PLZ4**, **2.123 verschiedene BFS-Nummern**
- **1.223 Postleitzahlen (38 %) liegen in mehr als einer Gemeinde**; 2.852 Zeilen tragen einen
  Adressenanteil unter 100 %

Die Bestandsaufnahme notierte „PLZ und Gemeinde decken sich in der Schweiz nicht". **Das ist jetzt
eine Zahl: 38 %** — und die amtliche Datei löst es selbst, indem sie je Paar aus PLZ und Gemeinde
den Anteil der Adressen mitliefert. Wer eine Schweizer PLZ auf eine Gemeinde abbildet, ohne diesen
Anteil zu benutzen, trifft in gut jedem dritten Fall eine Gemeinde nach Zufall.

### 5.3 Niederlande — vollständig, und die Statistik gibt es gratis dazu

**Gemeindeliste + Grenzen + Einwohner in einem: PDOK, CBS Wijk- en Buurtkaart 2024**, Ebene
`wijkenbuurten:gemeenten` über WFS. Selbst abgerufen und ausgezählt:

- **424 Objekte, davon 342 Landgemeinden** (`water = "NEE"`) — das entspricht dem amtlichen Stand
- **alle 342 tragen `aantalInwoners`, Summe 17.942.942**; dazu `aantalHuishoudens`
  (Haushalte — für uns ein brauchbarer Nenner)
- **239 Attribute je Gemeinde**, Schlüssel `gemeentecode` im Format `GM0014`
- Beispiel: `GM0014 | Groningen | 243.768 Einwohner | 145.764 Haushalte`

**Lizenz, aus den WFS-Capabilities selbst:** `Fees: none`, `AccessConstraints:
https://creativecommons.org/publicdomain/zero/1.0/deed.nl` — **CC0 1.0**, also
Public-Domain-Widmung ohne jede Bedingung.

**Zweite, unabhängige Grenzquelle:** PDOK/Kadaster „Bestuurlijke Gebieden", OGC-API, Sammlung
`gemeentegebied` — 342 Objekte mit `identificatie` (`GM0263`), `naam`, Provinz, MultiPolygon.
Der Lizenzlink der Sammlung zeigt auf `creativecommons.org/licenses/by/4.0/deed.nl` — **CC BY 4.0**.

**PLZ → Gemeinde: PDOK Locatieserver (Ministerium BZK).** GEPRÜFT an `1012AB`:
`.../free?q=1012AB&fl=gemeentecode,gemeentenaam,postcode,type` liefert unmittelbar
`{'type': 'postcode', 'postcode': '1012AB', 'gemeentecode': '0363', 'gemeentenaam': 'Amsterdam'}`.
Kein Schlüssel, keine Anmeldung. Damit entfällt der Umweg über die CBS-Kopplungstabelle
(„Buurt, wijk en gemeente voor postcode huisnummer", über 7 Mio. Zeilen) vollständig.

**Ein Zusatzfund, den wir in Deutschland nicht haben:** Der CBS-Datensatz `postcode4` (PDOK-WFS,
CC BY 4.0) trägt je vierstelliger PLZ unter anderem `aantalWoningen` (Wohnungen) und
**`gemiddeldElektriciteitsverbruikWoning`** — den durchschnittlichen Stromverbrauch je Wohnung.
Das ist genau der Realitätsanker, für den wir in Deutschland auf Verbandswerte zurückgreifen.

**Bemerkung zur Erreichbarkeit:** `opendata.cbs.nl` und `datasets.cbs.nl` waren aus dieser Umgebung
nicht erreichbar („Network is unreachable" beziehungsweise Verbindungsabbruch, auch über IPv4).
Das ist ein Netzproblem hier, kein Befund über die Quelle — der gesamte CBS-Bestand ist über PDOK
ohnehin zugänglich. Die Lizenz des CBS bestätigt sich unabhängig davon über data.overheid.nl:
„Kerncijfers wijken en buurten 2026" steht dort als **CC-BY (4.0)**.

### 5.4 Frankreich — vollständig

- **Gemeindeliste, Einwohner und PLZ:** `geo.api.gouv.fr` in einer Abfrage (siehe Lücke 4.1) —
  34.969 Gemeinden, 34.957 mit Einwohnerzahl, 34.964 mit Postleitzahlen.
- **Grenzen:** IGN **ADMIN EXPRESS** (Varianten ADMIN EXPRESS, COG, COG CARTO). Der
  data.gouv.fr-Eintrag der IGN selbst weist die Lizenz als `lov2` aus — **Licence Ouverte 2.0**,
  Wortlaut siehe Lücke 1.1: kommerzielle Nutzung ausdrücklich erlaubt, Paternité als einzige
  Bedingung. Wer keine volle Geometrie braucht, bekommt vereinfachte Umrisse direkt aus derselben
  API (GEPRÜFT an Paris: Polygon, 2.103.778 Einwohner).
- **Eine Falle:** `geoservices.ign.fr/admin-express` leitet inzwischen dauerhaft auf
  `cartes.gouv.fr` um. Wer den alten Link in einen Import schreibt, hat einen Redirect im
  Datenpfad.

### 5.5 Portugal — drei von vier

- **Gemeindeliste und Grenzen:** DGT, **Carta Administrativa Oficial de Portugal (CAOP) 2025**,
  GeoPackage. Die Datei enthält Distrikte, Municípios und Freguesias, also genau die Ebenen, die
  wir brauchen. Fundstelle der amtlichen Ausgabe: „Aviso n.º 3502/2026/2 do Diário da República,
  2.ª série, n.º 34, de 18 de fevereiro de 2026".
  **Lizenz: CC BY 4.0**, GEPRÜFT am 26.09.2026 auf der Open-Data-Seite der DGT selbst, im
  portugiesischen Wortlaut:
  > „A informação geográfica descarregada do Centro de Dados está sujeita a uma licença de
  > utilização **CC-BY 4.0**, que permite a **utilização livre e gratuita** dos dados tendo apenas
  > como obrigação a menção de que a entidade proprietária da informação é a Direção-Geral do
  > Território."

  Die Seite nennt CAOP ausdrücklich als einen der betroffenen Bestände. Kommerzielle Nutzung ist
  damit erlaubt, einzige Auflage ist die Nennung der DGT.
  **Was hier NICHT geprüft ist: der Inhalt der Datei.** Belegt sind Existenz, Größe
  (`Content-Length: 111.647.845`, `Content-Type: application/zip`) und die Ebenen-Beschreibung
  der DGT selbst („Áreas das freguesias, municípios, distritos") — **die Datei wurde nicht
  vollständig geladen und ihre Ebenen wurden nicht ausgezählt**, anders als bei der Schweiz und
  den Niederlanden. Grund ist kein Zugangsproblem, sondern die Übertragungsrate: gemessen rund
  30–50 kB/s, drei Anläufe endeten in Zeitlimits (der weiteste bei 92 von 111 MB nach 20 Minuten);
  auch die kleineren Inseldateien kamen in dieser Sitzung nicht durch.
  **Zwei Folgerungen:** Vor dem Bau ist die Datei einmal vollständig zu laden und ihre
  Ebenenstruktur zu prüfen. Und wer den Import baut, plant Wiederaufnahme ein (`curl -C -`) und
  ein großzügiges Zeitlimit — sonst bricht der Lauf am Netz statt an den Daten, und das sieht im
  Protokoll aus wie ein Datenfehler.
  **Continente, Açores und Madeira sind drei getrennte Dateien**, GEPRÜFT an der CAOP-Seite der
  DGT: `CAOP_Continente_2025-gpkg.zip`, `CAOP_RAA_2025-gpkg.zip` (Azoren),
  `CAOP_RAM_2025-gpkg.zip` (Madeira). Ein portugiesischer Markt ohne die Inseln ist ein
  unvollständiger, und die Bestandsaufnahme hatte das schon als offenen Punkt — es sind zwei
  zusätzliche Importe, keine fehlende Quelle. Die Dateien enthalten laut DGT „Áreas das
  freguesias, municípios, distritos", also alle drei Ebenen, die wir brauchen.
- **Einwohner:** dados.gov.pt, „População residente (Nº) por concelho - Censos 2021", CSV, Lizenz
  `cc-by`. Selbst heruntergeladen: **308 Zeilen = 308 Municípios**, mit `Código Concelho`,
  Distrikt und NUTS-Ebenen. **Stichtag 31.12.2021** — fünf Jahre alt. Jährliche Fortschreibungen
  („Estimativas de População Residente") gibt das INE heraus; sie wurden heute nicht geprüft
  (UNGEPRÜFT) und sind vor dem Bau zu holen, weil eine fünf Jahre alte Einwohnerzahl auf einer
  Ortsseite als Zahl daneben steht, ohne dass jemand sie einordnen kann.
- **PLZ → Gemeinde: das Loch.** Die offizielle Datenbank der Postleitzahlen führt CTT Correios de
  Portugal. **GEPRÜFT: Die Downloadseite liegt unter `/restricted/` und liefert eine
  Anmeldemaske** (`https://www.ctt.pt/feapl_2/app/restricted/postalCodeSearch/postalCodeDownloadFiles.jspx`,
  HTTP 200 mit Login-Seite; die Varianten unter `/open/` antworten mit HTTP 404). Ohne Konto ist
  weder die Datei noch ihre Nutzungsbedingung einzusehen. Bei dados.gov.pt: **0 Treffer** für
  „códigos postais".
  **Die kursierenden freien Nachbauten auf GitHub (PDDL, CP7 mit Koordinaten) sind abgeleitete
  Werke der CTT-Datenbank** — dieselbe Lage wie bei den fremden Förderlisten: als Hinweisgeber
  brauchbar, als Grundlage für eine kommerzielle Seite nicht ohne eigene Rechtsprüfung. CTT ist ein
  privatisiertes Unternehmen, nicht eine öffentliche Stelle; das Argument aus § 2 Abs. 5 DNG, das
  bei deutschen Gemeinden trägt, trägt hier nicht.
  **Empfehlung:** Konto bei CTT anlegen, die Bedingungen lesen, dann entscheiden — das ist eine
  Registrierung, keine Recherche. Als Behelf trägt für einen Rechner die Ortsauswahl über den
  Município-Namen; die Postleitzahl ist in Portugal für unseren Zweck (Standort-Ertrag und
  Gemeindezuordnung) ersetzbar, für die Gemeindeseiten aber nicht.

---

## 6. Was sich an der Bestandsaufnahme ändert

1. **Lücke 4 entfällt.** Frankreich und Spanien sind national vollständig belegt, beide
   kommerziell nutzbar, beide in einer Abfrage.
2. **Lücke 2 entfällt.** Portugal hat einen Börsenpreis; er kommt vom iberischen Marktbetreiber
   selbst und trägt keine kommerzielle Schranke.
3. **Lücke 5 schrumpft auf eine Zelle:** die portugiesische Postleitzahl.
4. **Lücke 3 verschiebt sich:** nicht mehr „keine europaweite Reihe gefunden", sondern
   „22 Jahre für alle EU-Märkte, **die Schweiz fehlt**, und die niederländische Reihe endet 2023".
5. **Lücke 1 verschiebt sich am stärksten:** nicht mehr „kein Profil gefunden", sondern „vier
   Profile gefunden, zwei davon ohne Lizenzangabe". Aus einer Beschaffungsfrage ist eine
   Rechtsfrage geworden — und das ist der teurere Typ, weil er sich nicht durch Suchen löst.

**Die Reihenfolge der Märkte bleibt richtig.** Die Schweiz ist nach dieser Recherche noch
deutlicher der erste Markt: Geobasis vollständig in zwei Dateien, Lastprofil als echte Messung
unter CC BY, Register und Strompreis je Gemeinde waren schon belegt. Der einzige neue Minuspunkt
ist der Heizölpreis — und der betrifft den Wärmepumpen-Rechner, nicht den PV-Rechner.

---

## 7. Was offen bleibt, und für wen

**Rechtsfragen (Legal-Judge, nicht Recherche):**
- Trägt ein regulatorisch festgesetztes Lastprofil (NL: Informatiecode/ACM · PT: GMLDD/ERSE)
  ein Schutzrecht, und wenn ja, wessen? Beide Dateien sind ohne Anmeldung öffentlich abrufbar.
- OMIE: Trägt „siempre que se respete íntegramente su contenido original" unseren abgeleiteten
  Monats-Marktwert?

**Beschaffung (eine Registrierung oder ein Abruf, keine Suche):**
- CTT-Konto, um die portugiesischen Postleitzahlen und ihre Bedingungen überhaupt zu sehen.
- INE Portugal: jährliche Bevölkerungsfortschreibung statt Zensus 2021.
- CAOP-Dateien für Açores und Madeira (Adressen oben, zwei zusätzliche Importe).
- ENTSO-E: die seit 01.11.2023 geltende Fassung der Nutzungsbedingungen. Nur nötig, falls wir den
  portugiesischen Preis doch dort holen statt bei OMIE — also voraussichtlich gar nicht.

**Nicht zu beschaffen, sondern zu entscheiden:**
- Schweizer Heizölpreis. Es gibt keine offene amtliche Reihe. Entweder Heizöl dort weglassen und
  das sichtbar sagen, oder eine Verbandsquelle rechtlich prüfen lassen. **Eine Näherung aus einem
  Nachbarland ist keine dritte Option.**

**Nicht wieder aufmachen:**
- Energy-Charts-Lizenz je Gebotszone. Das Feld heißt `license_info`, die freigegebene Liste ist
  oben im Wortlaut zitiert, PT und ES stehen nicht darin. Wer nach `license` greift, misst nichts.
- OMIE-Spaltenzuordnung. Spalte 5 ist Portugal, belegt gegen den amtlichen Bericht desselben Tages.
- Ob der Schweizer PLZ-Bezug eindeutig ist. Er ist es zu 62 %; die amtliche Datei liefert den
  Adressanteil für den Rest.

---

## 8. Anhang: was genau abgerufen wurde

Damit eine spätere Sitzung nicht dieselben Sackgassen abläuft. Alle Adressen am 26.09.2026
aufgerufen; wo eine Zahl daneben steht, wurde die Datei geladen und ausgezählt.

| Gegenstand | Adresse | Ergebnis |
|---|---|---|
| CH Gemeindeverzeichnis | `agvchapp.bfs.admin.ch/api/communes/snapshot?date=01-09-2026` | 2.280 Zeilen (2.110 Gem., 144 Bez., 26 Kant.). Datumsformat **TT-MM-JJJJ**, sonst HTTP 400 |
| CH Grenzen + Einwohner | `data.geo.admin.ch/ch.swisstopo.swissboundaries3d/swissboundaries3d_2026-01/…gpkg.zip` | 37,4 MB; Ebene `tlm_hoheitsgebiet`: 2.136 Zeilen, 2.123 CH, Summe Einwohner 9.051.029 |
| CH PLZ | `data.geo.admin.ch/ch.swisstopo-vd.ortschaftenverzeichnis_plz/…_4326.csv.zip` | 5.718 Zeilen, 3.190 PLZ4, 1.223 PLZ über mehrere Gemeinden |
| NL Gemeinden + Einwohner | `service.pdok.nl/cbs/wijkenbuurten/2024/wfs/v1_0` → `wijkenbuurten:gemeenten` | 424 Objekte, 342 Landgemeinden, Summe 17.942.942; Capabilities: CC0, Fees none |
| NL Grenzen (2. Quelle) | `api.pdok.nl/kadaster/bestuurlijkegebieden/ogc/v1/collections/gemeentegebied/items` | 342 Objekte; Lizenzlink CC BY 4.0. **`skipGeometry` kennt die API nicht** (HTTP 400), paginieren über `next` |
| NL PLZ → Gemeinde | `api.pdok.nl/bzk/locatieserver/search/v3_1/free?q=1012AB&fl=gemeentecode,gemeentenaam` | `0363 / Amsterdam` |
| NL Lastprofile | `energiedatawijzer.nl/app/uploads/Documenten/Profielen/Profielen/Profielen-elektriciteit-2027-v1.00.zip` | 5,6 MB, 35.040 Viertelstunden, Kategorien E1A–E4A. **`nedu.nl` ist tot (404)** |
| FR Gemeinden + Einw. + PLZ | `geo.api.gouv.fr/communes?fields=code,nom,population,codeDepartement,codeRegion,codesPostaux` | 34.969 Gemeinden, 34.957 mit Einwohnerzahl, Summe 68.952.941 |
| FR Lastprofile | `opendata.enedis.fr/data-fair/api/v1/datasets/coefficients-des-profils` | 17.516.928 Sätze, 143 Unterprofile (33 RES). **Feldnamen in der API klein** (`sous_profil`), im CSV-Export groß |
| PT Einwohner | `dados.gov.pt/…/populacao-por-concelho-censos-2021.csv` | 308 Concelhos, Stichtag 31.12.2021, `cc-by` |
| PT Lastprofile | `e-redes.pt/sites/eredes/files/2025-12/Perfil_Consumo_Injeção_E-REDES_2026.xlsx` | 6,9 MB, 35.040 Viertelstunden, BTN A/B/C + UPAC |
| PT Börsenpreis | `omie.es/es/file-download?parents=marginalpdbc&filename=marginalpdbc_JJJJMMTT.1` | Sp. 5 = PT, Sp. 6 = ES; 2023→heute täglich, 2018–2022 als Jahres-ZIP; **2017 und früher: 404** |
| PT Preis-Gegenprobe | `omie.es/sites/default/files/dados/AGNO_2026/MES_03/TXT/INT_PBC_EV_H_1_01_03_2026_01_03_2026.TXT` | beschriftete Zeilen „sistema español" / „sistema portugués" — damit ist die Spaltenfrage belegt |
| EU Heizöl | `energy.ec.europa.eu/document/download/906e60ca-…_en?filename=Weekly_Oil_Bulletin_Prices_History_maticni_4web.xlsx` | 4,5 MB, 1.085 Wochen 2005–2026, 27 Länder; **NL endet 27.02.2023** |
| ES Einwohner | `servicios.ine.es/wstempus/js/ES/DATOS_TABLA/<id>?nult=1`, 52 Provinztabellen | 8.136 Gemeindereihen, Datenjahr 2025. **Sammeltabelle 29005 liefert abgeschnittenes JSON** |
| Energy-Charts Lizenz | `api.energy-charts.info/price?bzn=<zone>` und `/openapi.json` | Feld heißt **`license_info`**; PT/ES gesperrt, CH/NL/FR CC BY 4.0 |

**Gescheiterte Abrufe, mit Grund — keiner davon ist ein Befund über die Quelle:**

- `opendata.cbs.nl` und `datasets.cbs.nl`: aus dieser Umgebung nicht erreichbar („Network is
  unreachable" bzw. Verbindungsabbruch, auch über IPv4). Der CBS-Bestand ist über PDOK zugänglich.
- `transparencyplatform.zendesk.com` (aktuelle ENTSO-E-Bedingungen): HTTP 403, Cloudflare-Bot-Prüfung.
  Die Fassung von Juni 2015 liegt als PDF offen und wurde gelesen.
- `eur-lex.europa.eu` PDF-Direktlink: HTTP 202 mit leerem Körper. Der Volltext des Beschlusses
  2011/833/EU war über `legislation.gov.uk` lesbar.
- `geo2.dgterritorio.gov.pt` (CAOP): drei Zeitlimits bei rund 30–50 kB/s.
- `nedu.nl`: HTTP 404 auf allen Wegen — die Stelle existiert nicht mehr, ihre Aufgaben liegen bei
  MFFBAS. Wer die Literatur liest, findet überall noch die alte Adresse.
- `www.ine.es/pob_xls/pobmunNN.zip`: HTTP 404. Der früher übliche Sammel-Download ist weg, der Weg
  geht über die Schnittstelle.
