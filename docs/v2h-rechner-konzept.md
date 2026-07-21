# Konzeptskizze: V2H/V2G-Rechner (bidirektionales Laden)

**Stand:** 2026-07-21 · Machbarkeits-/Bau-Grundlage, kein Produktions-Code · Autor: Produkt-/Berechnungs-Architektur-Session

---

## Kurzfazit

**Geht ein ehrlicher V2H-Rechner heute? — Ja, aber nur für die eine Hälfte des Themas, und genau da wird solar-check.io Early Mover.**

Das Thema zerfällt sauber in zwei Teile mit völlig unterschiedlicher Ehrlichkeits-Lage:

1. **V2H = „Auto puffert meinen PV-Überschuss" (Solarstrom → Auto → abends zurück ins Haus).** Das ist regulatorisch **heute schon sauber**, technisch **jetzt** verfügbar (V2H läuft praktisch, seit März 2026 gibt es die VDE-Norm), und rechnerisch ist es **derselbe Vorgang wie ein Heimspeicher** — nur mit einem 60–80-kWh-Akku, der zeitweise weg ist. Hier kann der Rechner eine **belastbare €-Zahl** liefern.

2. **V2G = „Auto handelt mit dem Netz" (Netzstrom billig laden, teuer zurückspeisen / Netzdienste).** Das ist in Deutschland 2026 **noch nicht ehrlich bezifferbar**: Die zentrale Hürde (Doppelbelastung mit Netzentgelten) ist zwar zum **1.1.2026** gefallen, aber es gibt **noch keine flächendeckenden Endkunden-Tarife**, der Smart-Meter-Rollout liegt bei **~3 %**, und die MiSpeL-Abrechnungsregeln greifen erst ab **1.4.2026** mit 6–12 Monaten Umsetzungszeit der Netzbetreiber. Eine €-Zahl hier wäre ein Versprechen ins Blaue.

**Der Ehrlichkeits-Trick** ist deshalb die **saubere Trennung dieser beiden Modi im Ergebnis**, nicht ein Verstecken hinter Disclaimern:
- **Basis-Szenario (belastbar, Default):** V2H-Solar-Eigenverbrauch. Zeigt den echten Autarkie-/Eigenverbrauchs-Gewinn und eine ehrliche €-Ersparnis — auf **derselben Rechen-Basis** wie der PV- und Balkon-Rechner.
- **Szenario-Ebene (klar als „so könnte es sein" markiert):** V2G-Arbitrage mit dynamischem Tarif — an **echten Länder-Beispielen** (Frankreich läuft kommerziell seit 10/2024, UK hat einen Tarif, Niederlande fahren Netzdienst-Pilots). Nie als deutsche Ist-Zahl verkauft.

Damit ist solar-check.io der ehrliche Rechner, den es noch nicht gibt: Er sagt klar, **was heute geht** (PV-Puffern lohnt sich) und **was noch nicht** (mit dem Netz Geld verdienen) — statt beides in eine schöngerechnete Amortisation zu werfen, wie es die Hardware-Verkäufer tun.

**Empfohlener MVP:** V2H-Solar-Eigenverbrauch als einziger belastbarer Rechenweg, das Auto als verfügbarkeits-begrenzter Speicher in der bestehenden Stundensimulation. V2G nur als aufklappbare „Ausblick"-Szenario-Kachel mit Länder-Beispielen, ohne deutsche €-Zusage.

---

## 1. Recherche-Befunde (Stand Juli 2026)

> Unsicherheits-Kennzeichnung: Vieles zu V2G ist 2026 in Bewegung. Regulatorische Kern-Daten unten sind aus mehreren Quellen quergeprüft; Marktzahlen (Preise, Modelle) sind Momentaufnahmen und gehören in eine wächter-gepflegte Config, nicht in den Code.

### 1.1 Fahrzeuge

Bidirektional-fähige Modelle, die 2026 in DE erhältlich/angekündigt sind:

| Modell | Bidi-Typ | Batterie (typ.) | Status |
|---|---|---|---|
| BMW Neue Klasse (iX3, i3, iX5) | DC, V2H **und V2G** | ~75–110 kWh | ab 2026 gestaffelt |
| Cupra Raval / Born 77 | DC, V2H/V2G | ~59–77 kWh | 2026 |
| VW ID-Serie (77 kWh+) | DC-V2H | 77 kWh | Software/Serie 2024/25 |
| Renault 5 E-Tech | AC-V2H (V2G-ready) | ~40–52 kWh | am Markt |
| Hyundai Ioniq 5/6, Kia EV6/EV9 | V2L jetzt; AC-V2H via ISO 15118-20 | ~58–84 kWh | Hardware da, Software 2025+ |
| Nissan Leaf | CHAdeMO (Alt-Standard) | ~39–62 kWh | am Markt, auslaufender Stecker |

**Belastbare Modell-Annahmen fürs Modell:**
- **Nutzbare Kapazität:** E-Auto-Akku ist **5–10× größer als ein Heimspeicher** (60–80 kWh vs. 5–10 kWh). Der Speicher ist also praktisch nie die Grenze — die Grenze ist **Verfügbarkeit** und **Fahr-Reserve**.
- **Bidirektionaler Wirkungsgrad (roundtrip):** praktisch gemessen **~86–91 %** über einen vollen Lade-/Rückspeise-Zyklus (DC-Wallboxen). Das liegt **auf dem Niveau des Heimspeichers** (Projekt nutzt 0,90). → Für das Modell **~0,88** als ehrlicher, leicht konservativer DC-Wert.
- **Lade-/Entladeleistung:** DC-Wallboxen zuhause typ. **~10–11 kW**; das ist die relevante Deckelung, nicht die Akku-Größe.
- **Verbreitung realistisch:** heute **Nischenthema**, Pilotprojekte; ehrlich als „für Vorreiter" zu framen, nicht als Massenmarkt.

Quellen: [Grüne Energie Ratgeber](https://grueneenergieratgeber.de/artikel/bidirektionales-laden-v2h-kompatible-autos-wallboxen-2026), [Autozeitung](https://www.autozeitung.de/bidirektionales-laden-elektroauto-208067.html), [MeinAuto](https://www.meinauto.de/ratgeber/rueckspeisefaehige-elektroautos)

### 1.2 Wallboxen

Marktreife **bidirektionale DC-Wallboxen** 2026:

| Modell | Preis (Hardware) | Wirkungsgrad (Hersteller) |
|---|---|---|
| Wallbox Quasar 2 | ~3.300 € | bis 97 % |
| ambiCHARGE (Ambibox) | ~2.500 € | — |
| E3/DC (EDISN) | 4.000–6.500 € | ~94 % CCS→Netz |

- **All-in mit Installation + HEMS-Anbindung:** Hardware 2.500–6.500 € **plus** 1.500–3.000 € → realistisch **~4.000–9.000 €**.
- Reifegrad: **kaufbar und zertifiziert**, aber teuer und jung. Das ist der **Kostenblock**, der die Wirtschaftlichkeit trägt oder kippt — er muss editierbar und ehrlich hoch sein.

Quellen: [Energiewende-Check](https://www.energiewende-check.de/bidirektionale-wallbox/), [ADAC](https://www.adac.de/rund-ums-haus/energie/versorgung/bidirektionale-wallbox/), [42watt](https://42watt.de/magazin/wallbox-bidirektionales-laden), [automobilsalon-bellemann](https://automobilsalon-bellemann.de/news/bidirektionale-wallbox-praxis-test-2026-quasar-2-e3dc-ambicharge/)

### 1.3 Standzeiten / Verfügbarkeit — der Kern-Input

Das ist die Größe, die einen V2H-Rechner vom Heimspeicher-Rechner unterscheidet. Belastbare Daten aus **„Mobilität in Deutschland" (MiD 2017/2023, BMDV)**:

- Ein privater Pkw **fährt im Schnitt ~45 Min/Tag** — er **steht ~23 Stunden**.
- Davon **~20 Stunden am eigenen Wohnort**.
- Nur **~3 % der Zeit** ist das Auto in Fahrt.

Das heißt fürs Modell: Das Auto ist **die meiste Zeit potenziell am Netz** — aber nicht immer, und **tagsüber (wenn die PV liefert) seltener als nachts** (Pendler-Muster). Die realistische Kalibrierung ist ein **Anwesenheits-/Ansteck-Profil über den Tag**, nach Nutzertyp abgestuft (Pendler tagsüber weg = schlechtestes V2H-Profil, weil das Auto genau in der Sonnenzeit fehlt; Homeoffice/Rentner = bestes Profil). Das koppelt sauber an die bestehende **`tagQuote`/NUTZUNG**-Logik.

**Wichtige ehrliche Konsequenz:** Beim Pendler ist V2H schwächer als beim Homeoffice-Haushalt — genau umgekehrt zur naiven Intuition „großer Akku = super". Das ist ein Ehrlichkeits-Pfund, das kein Hersteller-Rechner zeigt.

Quellen: [MiD 2023 Ergebnisbericht](https://www.mobilitaet-in-deutschland.de/pdf/MiD2023_Ergebnisbericht.pdf), [Zukunft Mobilität](https://www.zukunft-mobilitaet.net/13615/strassenverkehr/parkraum-abloesebetrag-parkgebuehr-23-stunden/)

### 1.4 Regulierung DE — der Knackpunkt (besser als erwartet, aber mit Fußnoten)

Der Stand hat sich Ende 2025 / Anfang 2026 **deutlich bewegt**:

- **Doppelbelastung Netzentgelte abgeschafft** (EnWG-Novelle Nov 2025, wirksam **1.1.2026**): Zurückgespeister Strom wird künftig **wie Strom aus einem stationären Speicher** behandelt — keine doppelten Netzentgelte mehr auf den Durchlauf.
- **Stromsteuer:** Entlastung greift **nur für Haushalte mit eigener PV-Anlage**; andere zahlen weiter **~2 ct/kWh** auf zwischengespeicherten Netzstrom. → Für **unseren** PV-Kontext ist das der günstige Fall.
- **Messkonzept (MiSpeL):** vereinfachte Abrechnungsregeln der BNetzA ab **1.4.2026**, **kein zweiter Zähler** mehr nötig. Aber: Netzbetreiber brauchen **6–12 Monate** zur Umsetzung → real greift es „gestaffelt ab 2026".
- **Technische Norm:** **VDE-AR-N 4105:2026-03** (seit März 2026) — allpolige Netztrennung, Systemzertifizierung Fahrzeug+Wallbox.
- **Struktureller Flaschenhals:** **~3 % Smart-Meter-Quote** in DE. Ohne intelligentes Messsystem kein netzdienlicher/arbitrage-fähiger Betrieb im großen Stil.

**Was das für die €-Aussage bedeutet:**
- **PV-Eigenverbrauch via Auto (V2H):** regulatorisch **unkritisch** — es ist der eigene Solarstrom, der durch den eigenen Akku läuft, wie beim Heimspeicher. **Hier ist eine €-Zahl ehrlich.**
- **Arbitrage/Netzdienst (V2G):** Hürde gefallen, aber **Tarife + Zähler-Infrastruktur fehlen praktisch**. **Keine belastbare deutsche €-Zahl möglich.**

Quellen: [The Mobility House (Bundestag-Beschluss)](https://mobilityhouse-energy.com/int_en/news/article/german-parliament-removes-key-barrier-to-bidirectional-charging-vehicle-to-grid-becomes-possible), [firmenauto](https://www.firmenauto.de/branche/v2g-bidirektionales-laden-enwg-reform-2026-netzentgelte-fuer-flotten/), [E3/DC](https://www.e3dc.com/v2g-netzentgeltbefreiung-fuer-bidirektionales-laden-kommt/), [insta-drive](https://magazin.insta-drive.com/elektroautos/news/bidirektionales-laden-diese-regeln-gelten-ab-juli-2026/)

### 1.5 Länder-Szenarien (exemplarisch, „so könnte es sein")

| Land | Reifegrad | Was es dort gibt |
|---|---|---|
| **Frankreich** | **kommerziell** (seit 10/2024) | Renault-Fahrer speisen via PowerBox Verso bidirektional zurück; Regulierung geschaffen |
| **UK** | ein Tarif live | Octopus **„Power Pack"**-V2G-Tarif; OFGEM bereitet breite Zulassung vor; Nissan ab 2026 |
| **Niederlande** | Netzdienst-Pilots | Utrecht (300+ Ladepunkte), **netz­engpass-getrieben**, dynamische Netz-Tarife |
| **Japan** | V2H kommerziell | V2H am Markt; V2G-Rechtsrahmen im Aufbau |
| **USA/Kalifornien** | Pilot/Utility | PG&E/SCE-Pilotprogramme, uneinheitlich je Bundesstaat |

Nutzung im Rechner: **nicht als volle Internationalisierung**, sondern als 2–3 vorkonfigurierte **Szenario-Presets** („Wie in Frankreich / UK / NL"), die andere Tarif-/Vergütungs-Annahmen setzen und das Ergebnis **explizit als Auslands-Beispiel** labeln.

Quellen: [The Mobility House Länder-Vergleich](https://mobilityhouse-energy.com/int_en/knowledge-center/article/v2g-progress-in-each-country), [Octopus/UK Electroverse](https://electroverse.com/community/ev-blogs-and-guides/bi-directional-charging), [Utrecht V2G (Univ. Edinburgh)](https://www.sps.ed.ac.uk/sites/default/files/assets/Charged%20with%20potential%20-%20Utrecht.pdf)

---

## 2. Rechen-Modell-Vorschlag (auf der geteilten Basis)

### 2.1 Kern-Einsicht: Das Auto ist ein Speicher mit drei Zusatz-Eigenschaften

Die bestehende Stunden-Jahressimulation `simulateSolarYear` (`lib/balkon-sim.ts`) dispatcht heute schon Stunde für Stunde: Erzeugung → Direktverbrauch → Speicher laden → Speicher entladen → Netz. Der Heimspeicher darin ist ein `batteryKwh` mit `roundtrip`, **ohne Leistungsgrenze, immer verfügbar, ohne Eigenverbrauch**.

Ein E-Auto ist **derselbe Speicher**, nur mit drei Ergänzungen — und **genau das ist der ganze neue Code**:

| Eigenschaft | Heimspeicher (heute) | E-Auto (neu) |
|---|---|---|
| Kapazität | fix, klein | groß (60–80 kWh), aber **nutzbares Fenster** durch Fahr-Reserve begrenzt |
| Verfügbarkeit | immer | **Anwesenheitsprofil** je Stunde (nicht angesteckt → kein Laden/Entladen) |
| Selbst-Entladung | keine | **Fahrbedarf** entlädt den Akku (E-Auto-kWh aus `consumption.ts`) |
| Leistung | ~unbegrenzt | **Lade-/Entladegrenze** der Wallbox (~10 kW) |
| Mindest-Ladestand | 0 | **Reserve** (Nutzer will morgens X km Reichweite) |

### 2.2 Was WIEDERVERWENDET wird (geteilte Basis — Pflicht laut CLAUDE.md)

- **Standort-Ertrag:** PVGIS-Monatswerte über `/api/pvgis` (12× kWh/kWp) — wie überall. **Nicht** nur die Jahressumme (das war die Balkon-Falle).
- **Haushaltslast:** `calcHourlyConsumption()` inkl. `HouseholdProfile` (BDEW H0 / VDI 4655).
- **E-Auto-Fahrbedarf:** existiert bereits — `EA_KWH_PER_KM = 0.18`, `EA_DEFAULT_KM`, `EA_SHAPE` (Lade-Stundenprofil) in `consumption.ts`. Der V2H-Rechner braucht **keine neue E-Auto-Verbrauchsgröße**, nur die Umkehrung: dieselbe Jahres-kWh entlädt den Akku statt aus dem Netz zu ziehen.
- **Stunden-Dispatch-Schleife:** `simulateSolarYear` — erweitert, nicht ersetzt.
- **Autarkie:** aus der Stundensimulation (`simulatePvYear`-Muster), **nicht** aus Jahresbilanz.
- **Eigenverbrauch fürs GELD:** hier ist eine **bewusste Abweichung** nötig (siehe 2.4).
- **Preise/Szenarien/Degradation:** `usePrices()`/`DEFAULT_PRICES`, `SCENARIOS`, `DEGRAD`, `YEARS`.
- **CO₂-Netzstrom:** `gridCo2PerKwh` (0,38), identisch zu WP/Balkon.
- **PLZ-Eingabe:** `components/StandortField.tsx`.

### 2.3 Was WIRKLICH neu ist

Eine **verfügbarkeits- und leistungsbegrenzte Speicher-Schicht** in der Dispatch-Schleife. Konkret ein zusätzlicher Parameter-Block, z. B.:

```
CarBatteryInput {
  usableKwh          // z.B. 60 (nutzbares Fenster, nicht Brutto-Akku)
  chargeKw           // Wallbox-Ladegrenze, ~10
  dischargeKw        // Wallbox-Entladegrenze, ~10
  roundtrip          // ~0.88 (DC-Bidi)
  minReserveKwh      // Fahr-Reserve, z.B. 20 kWh ≈ 100 km
  availabilityByHour // 24 Werte 0..1: Wahrscheinlichkeit angesteckt/zuhause
  drivingKwhPerDay   // aus EA_DEFAULT_KM × EA_KWH_PER_KM / 365
}
```

**Dispatch-Erweiterung pro Stunde (Priorität, ehrlich):**
1. **Fahrbedarf zuerst** — die Fahr-Stunden entladen den Akku (Reichweite geht vor Rückspeisung). Bildet ab, dass das Auto morgens geladen wegfährt.
2. **Nur wenn angesteckt** (`availabilityByHour[h]` hoch): laden/entladen erlaubt.
3. **PV-Überschuss → Auto laden**, begrenzt durch `chargeKw` und freien Platz bis `usableKwh`.
4. **Haushalts-Defizit → aus Auto entladen**, aber **nur bis `minReserveKwh`** und begrenzt durch `dischargeKw`, mit `roundtrip`-Verlust.
5. Rest wie gehabt: Einspeisung / Netzbezug.

Das ist eine **saubere Erweiterung derselben Schleife** — keine zweite Engine. Optionaler Heimspeicher **zusätzlich** zum Auto ist damit auch abbildbar (zwei Speicher in Prioritätsreihenfolge: erst Heimspeicher für die Feinregelung, Auto für die Grobmenge — oder umgekehrt konfigurierbar).

**Belastbar vs. Szenario-abhängig:**
- Belastbar: Ertrag, Haushaltslast, Fahrbedarf, Wirkungsgrad, Autarkie-/Eigenverbrauchs-**Effekt**. Das sind Physik + geteilte Basis.
- Szenario-abhängig: **jede €-Aussage jenseits des PV-Eigenverbrauchs** (Arbitrage-Erlös, Netzdienst-Vergütung) und die **Anwesenheits-Feinform** (individuell sehr verschieden → als Nutzer-Eingabe/Preset, nicht als harte Konstante).

### 2.4 Bewusste Abweichung von der geteilten Basis — dokumentiert

Der PV-Rechner nimmt fürs **Geld** das HTW-Power-Law (`calcEigenverbrauch`), **nicht** die Simulation (die Simulation hat bei Stundenauflösung einen leichten Optimismus-Bias). Das HTW-Power-Law **kennt aber kein verfügbarkeits-begrenztes Auto** — es ist auf feste Heimspeicher kalibriert.

→ **Für den V2H-Eigenverbrauch muss das Geld aus der Simulation kommen**, weil nur sie Anwesenheit + Reserve + Fahrbedarf abbildet. Das ist eine **legitime, zu kommentierende Abweichung** (analog zum Balkon-Rechner, der einen anderen HTW-Datensatz nutzt). Konsequenz: Das bekannte Simulations-Optimismus-Thema **konservativ gegenrechnen** (z. B. Wirkungsgrad am unteren Rand 0,86 statt 0,91, Reserve großzügig) — lieber untertreiben als ein Hersteller-Werbeversprechen wiederholen. Diese Entscheidung gehört als Kommentar in den Code **und** auf `/datenstand`.

---

## 3. Ehrlichkeits- & Länder-Szenario-Rahmen

### 3.1 Zwei-Modi-Trennung (das Herzstück)

Das Ergebnis zeigt **getrennt**:

**Modus A — „Sonne im Auto puffern" (V2H, Default, belastbare €-Zahl)**
- Rechenweg: PV-Überschuss lädt das Auto, abends/nachts deckt das Auto den Haushalt.
- Ergebnis: **Autarkie ↑, Eigenverbrauch ↑, €-Ersparnis/Jahr** gegenüber „gleiche PV ohne Auto-Puffer".
- Ehrlicher Vergleichsanker: **gegen einen Heimspeicher gleicher Wirkung**. Die Kernfrage, die der Rechner beantwortet: „Spare ich mir den Heimspeicher, wenn das Auto den Job macht?" — und der ehrliche Haken: **nur, wenn das Auto zur richtigen Zeit da ist** (Pendler-Problem).

**Modus B — „Mit dem Netz Geld verdienen" (V2G, Ausblick, KEINE deutsche €-Zusage)**
- Default in DE: **bewusst keine €-Zahl**, sondern Klartext: „In Deutschland ist die größte Hürde (doppelte Netzentgelte) seit 1.1.2026 gefallen, aber es fehlen noch flächendeckende Tarife und Smart Meter. Belastbar rechnen können wir das noch nicht — hier ein Blick, wie es im Ausland schon läuft."
- Darunter die **Länder-Presets** als „so könnte es sein".

### 3.2 Umgang mit Regulierungs-Unsicherheit (statt einem großen Disclaimer)

Nicht „mit/ohne Doppelbelastung" als abstrakte Schalter — das versteht niemand. Stattdessen **an konkreten Fragen aufgehängt**:
- „Nutzt du den Solarstrom selbst (übers Auto)?" → Modus A, heute belastbar.
- „Willst du Netzstrom billig laden und teuer zurückverkaufen?" → Modus B, „geht in DE noch nicht regulär — Beispiel Ausland".

Jede Zahl trägt **Stand-Datum + „ohne Gewähr, verbindlich ist die offizielle Quelle"** (Legal-Checkliste Punkt 4). Regulierungs-Fakten (1.1.2026 Netzentgelte, MiSpeL 1.4.2026, VDE-Norm) kommen aus einer **Config mit `validFrom`/`reviewBy`** und einem Wächter-Runbook — analog zu EEG/CO₂ —, weil sich hier 2026/27 noch viel bewegt.

### 3.3 Länder-Presets

Je Preset ein kleiner Parametersatz (Tarifmodell, ob Rückspeise-Vergütung, dynamischer Tarif ja/nein), **nicht** eine übersetzte Site. UI-Label immer im Konjunktiv: „**Beispiel Frankreich** — dort speisen Renault-Fahrer seit 2024 kommerziell zurück. So **könnte** eine Rechnung aussehen, wenn es das in DE gäbe."

---

## 4. UI-Flow

Vorbild: `balkonkraftwerk-rechner` (empfiehlt am Ende die beste Option) + `photovoltaik-rechner` (editierbares Ergebnis).

```
Step 0: Auto            → Modell-Presets (Batterie-Größe) + „Anderer Wert"
                          (nutzbare kWh, Lade-/Entladeleistung vorbelegt)
Step 1: Nutzung/Standzeit → Wann steht das Auto zuhause am Netz?
                          Presets an NUTZUNG gekoppelt:
                          Pendler (tags weg) / Homeoffice / Rentner/Familie
                          + Fahrleistung (km/a → Fahr-Reserve)
Step 2: PV-Anlage       → kWp + PLZ (StandortField) + opt. vorhandener Heimspeicher
Step 3: Modus/Land      → „Sonne puffern" (Default) | „Ausblick: Netz-Handel"
                          + Länder-Preset (nur im Ausblick-Modus)
→ Ergebnis
```

**Ergebnisseite zeigt:**
- **Hero:** Autarkie-Gewinn durch das Auto (z. B. „von 55 % auf 78 %") + €-Ersparnis/Jahr (Modus A).
- **Der ehrliche Kern-Vergleich:** „Auto als Puffer" vs. „extra Heimspeicher kaufen" — inkl. der Wallbox-Mehrkosten (4.000–9.000 €), damit die Amortisation **nicht schöngerechnet** ist.
- **Das Pendler-Caveat sichtbar:** Wenn das Auto tagsüber weg ist, sinkt der Nutzen — der Rechner zeigt das als Ergebnis, nicht als Kleingedrucktes.
- **Beispieltag** (recycelt aus `simulateExampleDay`-Muster): Auto steckt an, lädt mittags PV, fährt morgens mit Reserve weg, deckt abends das Haus.

**Was das Ergebnis bewusst NICHT zeigt:**
- Keine deutsche V2G-Arbitrage-€-Zahl.
- Keine „700 €/Jahr"-Pauschale wie Hersteller-Rechner (die Fraunhofer-Zahl gilt für den **optimal kombinierten** Fall — nur als Kontext nennen, nicht als Versprechen).
- Keine Netzdienst-Vergütung als deutsche Ist-Zahl.

---

## 5. MVP-Schnitt

**Kleinster ehrlicher erster Wurf:**
1. **Nur Modus A (V2H-Solar-Eigenverbrauch)** mit belastbarer €-Zahl.
2. Auto als verfügbarkeits-/leistungs-/reserve-begrenzter Speicher in einer **erweiterten `simulateSolarYear`**-Variante.
3. **3 Standzeit-Presets** (Pendler/Homeoffice/Rentner) gekoppelt an `NUTZUNG`, plus editierbare Reserve.
4. Vergleichsanker „Auto-Puffer vs. Heimspeicher", ehrliche Wallbox-Kosten editierbar.
5. Config `v2h-config.ts` mit `validFrom`/`reviewBy` (Wallbox-Preise, Modell-Kapazitäten, Reg-Stand) + Runbook.
6. Modus B **nur als statische Ausblick-Kachel** mit 1–2 Länder-Beispielen (Text, keine Rechnung).

**Später (Ausbau):**
- Modus B mit echter Arbitrage-Rechnung, sobald in DE reale dynamische Tarife + Smart Meter verfügbar sind (Config-Umschaltung, kein Rebuild).
- Länder-Presets mit echten Zahlen-Szenarien.
- Kombination Auto **+** Heimspeicher optimiert.
- Anbindung an den bestehenden PV-Rechner als „V2H dazurechnen"-Toggle (wie „PV dazu" beim WP-Rechner).
- Share-URL + Dashboard-Save.

---

## 6. Offene Fragen / Risiken

1. **Simulations-Optimismus fürs Geld (größtes Modell-Risiko):** V2H-Eigenverbrauch **muss** aus der Simulation kommen (das Power-Law kann kein Auto), aber die Simulation überschätzt tendenziell. Gegenmittel: konservative Parameter (Wirkungsgrad 0,86, großzügige Reserve) + gegen eine externe Referenz validieren (Fraunhofer/HTW, falls ein V2H-Kennfeld auffindbar ist). **Vor Launch klären.**
2. **Anwesenheitsprofil ist hoch individuell:** Ein falsches Default macht die €-Zahl beliebig. Lösung: als **Nutzer-Eingabe mit ehrlicher Bandbreite**, nicht als versteckte Konstante — und das Ergebnis auf die Eingabe reagieren lassen (Pendler-Effekt sichtbar).
3. **Regulierung bewegt sich schnell (2026/27):** MiSpeL-Umsetzung, Smart-Meter-Rollout, evtl. neue Tarife. → Reg-Fakten in Config + Wächter, nicht in den Fließtext hardcoden. Kein „TODO 2027".
4. **Doppelte Alterung:** Rückspeisen belastet den Auto-Akku (Zyklen). Ehrlich wäre ein Hinweis/optionaler Malus. MVP: als Hinweistext, nicht als Rechenposten (Datenlage dünn).
5. **Legal (Checkliste):** Neue Datenquellen (MiD, Reg-Fakten) → `lib/data-sources.ts`. Jede €-/Regulierungs-Aussage mit Stand + Unverbindlichkeit. Keine absoluten Claims („spart immer X"). Länder-Aussagen klar als Ausland/Beispiel — nicht als DE-Zusage (sonst § 5 UWG Irreführung).
6. **Abgrenzung zum bestehenden E-Auto-Feld im PV-Rechner:** Der PV-Rechner kennt das E-Auto schon als **Verbraucher**. V2H macht es zum **Speicher**. Sauber kommunizieren, dass das zwei verschiedene Rollen sind — sonst Doppelzählung des Fahr-Stroms.
7. **Vergleichsanker-Fairness:** „Auto spart Heimspeicher" stimmt nur, wenn das Auto verlässlich da ist. Der Rechner darf nicht suggerieren, ein Auto ersetze **immer** einen Heimspeicher.

---

## Anhang: Quellen (Kurzliste)

- Fahrzeuge/Wallboxen: grueneenergieratgeber.de, autozeitung.de, energiewende-check.de, adac.de, 42watt.de
- Regulierung DE: mobilityhouse-energy.com, firmenauto.de, e3dc.com, insta-drive.com, energie-experten.org
- Standzeiten: mobilitaet-in-deutschland.de (MiD 2023), zukunft-mobilitaet.net
- Länder: mobilityhouse-energy.com (Länder-Vergleich), electroverse.com (UK/Octopus), sps.ed.ac.uk (Utrecht)
- Wirkungsgrad: automobilsalon-bellemann.de, co2portal.de

*Alle Marktzahlen sind Momentaufnahmen Juli 2026 und gehören in eine wächter-gepflegte Config, nicht in den Code.*
