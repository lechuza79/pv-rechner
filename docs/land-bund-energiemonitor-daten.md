# Energiemonitor für Bundesländer und Deutschland — Datenschnittstelle

## Release and activation closeout — 28 September 2026

**Code published:** the regional data work (`6ea0fcdc`, `78cbaa1f`) and shared UI
integration shipped with `60029ab7` on 27 September 2026. Vercel confirmed deployment.
The subsequent widget contrast/reduced-motion correction `c801f8ad` was also deployed
that day. Release scope, remaining CI findings and deferred settings are recorded in
[the central visual plan](zentrale-visuals-konzept.md#release-closeout--28-september-2026).

**Storage activation, verified from existing run logs on 28 September:**

- [Package run 36339227588](https://github.com/lechuza79/pv-rechner/actions/runs/36339227588)
  succeeded on 27 September and published generation `20260927T180417Z-7df6f8`
  with 17 state/country packages, reusing 294 district packages. Thus publication
  happened; the historical statement below that nothing was written is superseded.
- Sachsen-Anhalt had a complete monitor, 20 energy/value months, one year and 218
  sites. Schleswig-Holstein, Rheinland-Pfalz and Germany remained unavailable for
  historical monitor/energy data (`history`); the two states had no site lists.
  Thüringen had monetary values for 17 months. A successful publisher does not mean
  all regional datasets are complete.
- [Weather run 36339533623](https://github.com/lechuza79/pv-rechner/actions/runs/36339533623)
  succeeded, including the regional-curve step, and wrote
  `wetter-modell/regionen/solartag.json` (151 kB). For both 27 and 28 September its
  log reports **14/17 ready**: Schleswig-Holstein and Rheinland-Pfalz `no-sites`,
  Germany `incomplete-states(01,07)`. The remaining states, including Sachsen-Anhalt,
  had prepared daily curves. Missing curves must remain unavailable, never zero.

These are the results of those specific production runs, not a fresh audit of every
public endpoint or the latest storage generation. Subsequent imports, repaired child
packages, later weather runs and current all-17 availability were **not verified**
in this documentation-only closeout. No rebuild or new test run was triggered.

**Historical handoff follows.** Its local-only wording, example-package results and
then-pending activation steps remain as dated evidence, not the current release status.

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
| Solarleistung heute (live) | eigener Endpunkt `/api/region/solartag?ags=15` bzw. `ags=de` | siehe unten |
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

**Wirksam wurde das erst am 28.09.2026 mit einem manuellen Lauf „alle Kreise neu bauen".**
Der Fingerabdruck änderte sich durch die Regel nicht, deshalb behielten die täglichen
Läufe vom 26./27.09. die alten Kreispakete („0 gebaut, 294 übernommen"), und
Schleswig-Holstein, Rheinland-Pfalz und Deutschland blieben „nicht verfügbar" — die
Tageskurve ebenso (`no-sites` für die Länder, weil ein nicht verfügbarer Kreis keine
Standortliste hat; `incomplete-states` für Deutschland). Seitdem trägt jeder
Fingerabdruck `DISTRICT_CONTENT_REVISION` (`lib/district-package.ts`): Wer die Summierung
ändert, erhöht sie, und der nächste Lauf baut alle Kreise und Regionen neu, ohne den
Zeigerpfad zu verschieben.
Das ändert auch die drei **Kreisseiten** (sie bekommen ihren Monitor) — sichtbar live.

## Verbleibende Lücken

1. **Geldwerte Deutschland nur für 5 von 20 Monaten.** Ursache liegt in den Gemeindepaketen:
   Kreis Steinburg hat für 01/2025–03/2026 keinen Wert, Saale-Orla-Kreis für 01–03/2025
   (Solkwitz: Wert fehlt in diesen Monaten, Eigenverbrauchsanteil 0). Warum die
   Gemeindeberechnung dort keinen Wert liefert, ist **nicht geprüft**. Schleswig-Holstein
   entsprechend 5 Monate, Thüringen 17. Alle anderen Länder 20/20.
2. **Live-Solarleistung:** Datenberechnung und lokale UI-Anbindung sind fertig (siehe unten). Produktiv fehlen noch die Aktivierungsschritte: Landespakete v2 bauen und Tagesdatei schreiben. Bis dahin zeigt das Widget einen Nicht-verfügbar-Hinweis.
3. Die regionalen Widgets verwenden bereits gebietsneutrale Texte.
4. Das Jahresprofil enthält nur **2025** (wie auf Kreisebene).

## Solarleistung heute (Land und Deutschland), Stand 26.09.2026

Vorberechnet im stündlichen Wetterlauf (`.github/workflows/wetter-schnappschuss.yml`,
Schritt „Länder- und Deutschland-Tageskurve“, `npm run wetter:regionen`,
`lib/region-solar-day.ts`) und abgelegt als **eine** Datei
`wetter-modell/regionen/solartag.json`. Kein Wetterabruf je Seitenaufruf.

- **Dasselbe Modell wie der Kreis:** je Gemeinde `solarTagAusModell` am Wetterpunkt,
  gewichtet mit installierter Leistung über `districtSolarCurve`. Gemeindeliste und kWp
  aus den Landespaketen (`monitor.sites`, Paketversion 2) → identisch mit den Kreispaketen
  derselben Generation, keine Doppelzählung (Kreise zerlegen das Land; geprüft).
- **Wetterpunkt je Gemeinde:** `gemeindeWetterpunkt` — eigene PLZ; sonst der nächste
  PLZ-Punkt zur Mitte der Gemeindegrenze (≤ 20 km); sonst über den amtlichen Vorgänger-
  schlüssel (Hanau). Gilt seitdem **auch für den Kreis-Endpunkt**: 441 Dörfer ohne eigene
  PLZ (0,5 % der Leistung) machten bisher ihren ganzen Kreis „nicht verfügbar“.
- **Nie eine zu kleine Summe:** Fehlt einer Gemeinde Lage oder Tageskurve, ist ihr Land
  nicht verfügbar; Deutschland braucht alle 16.
- **Nie eine alte Kurve als heutige:** gespeichert je deutschem Kalendertag (heute und,
  sobald das Modell ihn abdeckt, morgen — deshalb gibt es auch nach Mitternacht eine
  Kurve). Der Endpunkt liefert ausschließlich den heutigen Tag, sonst 503.
  Setzt ein Lauf aus, bleibt die zuletzt vollständige Kurve desselben Tages stehen.

Zugriff: `GET /api/region/solartag?ags=01…16|de`, Antwort wie beim Kreis:

```json
{"points":[{"time":"2026-09-25T22:00:00.000Z","powerPct":0}, "… 96 Viertelstunden"],
 "installedKwp":1.2921e8,"towns":10746,"day":"2026-09-26","runInit":"<Modelllauf des Schnappschusses>"}
```

503 `{"error":…,"reason":"not-today"|"no-file"|"no-sites"|"no-location"|"no-weather"|"incomplete-states"}`.
Im Widget reicht es, die `weatherSource` auf diese Adresse zu setzen.

Geprüft (lokal, echter Wetter-Schnappschuss vom 26.09.2026, Landespakete im Speicher
gebaut, nichts geschrieben): alle 16 Länder und Deutschland für heute und morgen
vollständig; Deutschland 10.746 Gemeinden, 129,21 GWp (Register 129,2 GWp);
Deutschland 12:00 = nach Leistung gewichtete Länderkurven (37,7436 % beidseitig);
Rechenzeit ~55 s für zwei Tage.

Zur Aktivierung: Merge auf main → nächster Kreispaket-Lauf baut die Landespakete v2 mit
Gemeindelisten → nächster stündlicher Wetterlauf schreibt die Datei.
## Local UI integration — 26 September 2026

The `codex/atlas-regional-polish` worktree now uses `loadRegionContent` with the unfiltered page children for state/country pages. The shared monitor renders monthly KPIs and energy/value widgets from the package. Live power uses the shared widget on every regional level; state/country curves come from `/api/region/solartag`, independently of historical package availability. Both an unavailable package and an unavailable monitor show a visible notice; register snapshots remain separately available. Partial monetary coverage is disclosed and only calculable months are selectable. No upper-level stories are rendered.

Nothing has been published by this UI integration. For local visual acceptance, `REGIONAL_UI_FIXTURES` can point to validated example packages. This override is read only in development and the page marks the preview through a DOM attribute. Without it, unpublished packages remain unavailable. Production always reads the published generation. Sachsen-Anhalt and Germany were visually checked with the local examples, including sparklines, radial charts, money widgets and Germany's 5/20 monetary coverage. Legacy regional ranking teasers and duplicate funding blocks are removed; the shared ranking and funding sections remain.

### Shared monitor composition (local, 26 September)

All adapters now use `EnergyMonitor`: KPIs, current power when supported and
annual growth, Anlagenbestand, Strom und Wert, optional municipality map. Money
widgets precede the daily and annual profiles, matching the municipality page.
The development fixture marker is a DOM attribute (`data-monitor-preview`),
not product copy. The preview still uses local example packages until publication;
removing the visible developer note does not publish or refresh data.

### Local live-widget integration

Commit `78cbaa1f` is integrated locally. `regionalSolarWeatherSource` chooses
the regional endpoint for state/country IDs and retains the district endpoint
for districts. The shared live widget renders independently of historical
package readiness. Non-success responses reject the load and use its existing
unavailable state, never a zero curve. Seven targeted integration tests passed.
The old local historical example envelopes were upgraded to package version 2;
their site lists remain null and no historical values were changed. They do not
supply a live-weather curve. Nothing was published or rebuilt in storage.
