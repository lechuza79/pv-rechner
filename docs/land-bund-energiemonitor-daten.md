# Energiemonitor für Bundesländer und Deutschland — Datenschnittstelle

Stand 26.09.2026. Übergabe an die UI-Einbindung (Codex). Daten fertig, UI nicht angefasst.

## Was es gibt

Der Kreispaket-Lauf (`npm run kreise:pakete`, täglich per `.github/workflows/kreis-pakete.yml`,
monatlich im Gemeinde-Monatslauf) baut jetzt in **derselben Generation** wie die 294
Kreispakete je ein Paket für die 16 Länder und für Deutschland (`lib/region-package.ts`).
Pfad: `kreise/v1/<generation>/region-<id>.json.br`, eingetragen im Zeiger
`kreise/v1/aktuell.json` unter `regions` (neben `districts`).

- **Land** = seine Kreispakete + die Gemeindepakete seiner kreisfreien Städte.
- **Deutschland** = die 16 Länderergebnisse.
- Summiert wird mit den **unveränderten** Kreisfunktionen (`aggregateDistrictMonitor`,
  `aggregateDistrictEnergy`); jedes Kind geht als ein „Paket" hinein. Dadurch gelten deren
  Regeln eine Ebene höher: alle Kinder vorhanden, ein Registerstand, nur vollständige
  gemeinsame Monate/Jahre, fehlende Stunden bleiben `null`, Geldwerte nur auf gemeinsamer
  Bewertungsgrundlage. Ein unvollständiges Kind macht die Ebene „nicht verfügbar", nie
  kleiner.
- Kosten: gebaut wird nur, wenn sich ein Kreis, eine kreisfreie Stadt oder die
  Mitgliedschaft geändert hat; dann alle 17 zusammen (~25 MB Lesen aus dem eigenen
  Speicher, ~20 s). Keine Gemeindeaggregation beim Seitenaufruf.

## Lesen auf der Seite

```ts
import {loadRegionContent} from "lib/district-monitor-server";
const content = loadRegionContent(region.region_id, children.map(c => c.region_id), stand);
// → Promise<DistrictContent>, exakt derselbe Typ wie loadDistrictContent
```

- `children` = die Kinder, die die Seite ohnehin hat (`getChildren(region)`), **ungefiltert**.
  Das Paket kennt neben den summierten Kindern auch die bewusst nicht summierten
  (`excluded`: aufgelöste Kreise 03152, 03156, 16056 und gemeindefreie Gebiete direkt unter
  dem Land wie 07000999, 13000998, 13000999). Jedes davon wird beim Bau im Register auf
  „keine einzige Anlage" geprüft; stimmt die Kinderliste nicht, lehnt der Leser ab
  (`prepared.reason: "membership"`).
- `prepared.state`: `current` / `older-edition` / `unavailable` (+`reason`) — wie beim Kreis.
- Cache-Tags wie beim Kreis (`ATLAS_DATEN_TAG`, `KREIS_PAKET_TAG`): die bestehende
  Invalidierung nach dem Lauf (`/api/atlas/revalidate?umfang=kreise`) erfasst die
  Land-/Bundesseiten mit.

`content.monitor` hat dieselbe Form wie beim Kreis, geht also direkt in die vorhandenen
Widgets (`LandkreisMonitor` → `KpiOverview` über `monitorKpiGroups`, `DistrictEnergyWidgets`):

| Widget | Feld | Hinweis |
|---|---|---|
| KPI-Monatsvergleiche | `monitor.status==='ready'` → `history.observations` (25 Monatsenden) | Summen, keine Mittel |
| Solarerzeugung im Tagesverlauf | `monitor.energy.monthly[].solar` (Tage × 24 h) | |
| Energieverlauf im Jahr | `monitor.energy.annual[]` | Solar und Wind |
| Wert des Solarstroms / Einspeisevergütung | `monitor.energy.monthly[].value` | nur Monate mit `value` anbieten (macht `DistrictEnergyWidgets` schon) |
| Solarleistung heute (live) | **`monitor.sites` ist immer `null`** | siehe Lücken |
| Insights | `stories` ist immer `[]` | |

## Geprüft (26.09.2026, echter Speicherstand, nur lesend, nichts veröffentlicht)

| | Stichtag 31.08.2026 | Register heute (10.09.) | Monate Erzeugung / mit Geldwert | Jahre |
|---|---|---|---|---|
| Sachsen-Anhalt | 145.183 Anlagen, 6.307 MWp | 145.409 Anlagen, 6.307 MWp | 20 (01/2025–08/2026) / 20 | 2025 |
| Deutschland | 6.302.755 Anlagen, 129.119 MWp | 6.312.591 Anlagen, 129.215 MWp | 20 / **5** | 2025 |

Der Unterschied Stichtag/heute sind die Inbetriebnahmen zwischen 31.08. und dem
Registerstand. Kinderliste Seite = Paket bei allen 17 (nach Abzug der geprüften
`excluded`). Größte Paketdatei (Deutschland) 84 kB komprimiert.

Unit-Tests: `lib/__tests__/region-package.test.ts` (Land und Bund gleich der flachen Summe
aller Gemeinden, unvollständiges Kind → nicht verfügbar, Geld nur bei gemeinsamer
Grundlage, Kinderliste, Einbindung in die Generation). Zwei absichtliche Sabotagen
(Bewertungsregel, Vollständigkeitsregel) wurden rot.

## Zusätzliche Regel auf Kreisebene: registerbestätigte Nullen

Gröde (7 Einw.), Dierfeld (15) und Sengerich (26) haben **keine einzige Anlage** im Register
(geprüft). Ihre Gemeindepakete tragen deshalb keinen Verlauf — und das machte bisher ihre
Kreise (Nordfriesland, Bernkastel-Wittlich, Eifelkreis) und damit Schleswig-Holstein,
Rheinland-Pfalz und Deutschland „nicht verfügbar". Jetzt: Ein Ort, dessen Paket nichts
enthält **und** für den das Register beim Bau keine Zeile führt, wird aus den Summen
gelassen (= plus null) und im Kreispaket unter `empty` genannt. Ohne diese Bestätigung
bleibt es beim alten Verhalten.

**Wirksam erst nach Neubau dieser drei Kreise.** Ihr Fingerabdruck ändert sich durch die
Regel nicht; sie werden beim nächsten Registerimport (1./3./5. des Monats → alle Kreise
neu) oder mit einem manuellen Lauf „alle Kreise neu bauen" neu gerechnet. Bis dahin
zeigen Schleswig-Holstein, Rheinland-Pfalz und Deutschland „nicht verfügbar".
Das ändert auch die drei **Kreisseiten** (sie bekommen ihren Monitor) — sichtbar live.

## Verbleibende Lücken

1. **Geldwerte Deutschland nur für 5 von 20 Monaten.** Ursache liegt in den Gemeindepaketen:
   Kreis Steinburg hat für 01/2025–03/2026 keinen Wert, Saale-Orla-Kreis für 01–03/2025
   (Solkwitz: Wert fehlt in diesen Monaten, Eigenverbrauchsanteil 0). Warum die
   Gemeindeberechnung dort keinen Wert liefert, ist **nicht geprüft**. Schleswig-Holstein
   entsprechend 5 Monate, Thüringen 17. Alle anderen Länder 20/20.
2. **Live-Solarleistung** (`sites`) gibt es oben nicht. Der Kreis-Endpunkt rechnet je Gemeinde
   Wetter; für Deutschland wären das ~11.000 Orte je Abruf. Braucht eine eigene Lösung
   (z. B. aus den Kreiskurven gewichtet) — bis dahin das Widget auf Land/Bund **nicht**
   rendern (`LandkreisMonitor` rendert es heute, sobald `monitor` übergeben wird, und
   ruft einen Endpunkt, der nur fünfstellige Kreise annimmt).
3. **Texte in `LandkreisMonitor`/`DistrictEnergyWidgets`** sprechen von „Landkreis" /
   „aller Gemeinden" — auf Land/Bund anpassen (UI).
4. Das Jahresprofil enthält nur **2025** (wie auf Kreisebene).
