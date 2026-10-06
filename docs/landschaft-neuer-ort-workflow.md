# Neue Orte für die Kommunen-Stage vorbereiten

**Einstieg für Claude und Codex.** Auftrag ist ein **neuer Ort**, nicht das Umschalten auf eine bereits vorbereitete Szene. Ein Ort bekommt dieselbe zentrale Stage, keine Kopie davon. Dieses Runbook führt von der Ortsauswahl bis zum tatsächlich geprüften Aussand-Link. Es verschickt selbst keine Nachrichten und veröffentlicht keine Daten automatisch.

## 1. Auftrag und Bestand klären

1. `AGENTS.md` / `CLAUDE.md` lesen, `git fetch` und `npm run sessions`, eigener Worktree. Keine fremden Arbeitsstände ändern.
2. Amtlichen Gemeindeschlüssel (8 Stellen) bzw. Kreisschlüssel (5 Stellen) und aktuellen Namen feststellen. Stadt Kaiserslautern und Landkreis Kaiserslautern sind unterschiedliche Gebiete. Keine Namensähnlichkeit als Zuordnung verwenden.
3. Bestehende Aufträge und Kandidaten auf dem Server prüfen. Vorhandene Geometrie, nationale Registerbestände und gekachelte Quelldaten wiederverwenden; nicht pro Gespräch neu herunterladen.
4. Umfang: gewünschter Ort, echte Ortsmitte, koordinatenbasierte Wind-/Solarziele. Kein wirtschaftlicher Nutzen der Gemeinde aus Standort oder Registerschlüssel ableiten.

## 2. Ein gemeinsamer Einstieg

Das Werkzeug `scripts/stage-workflow.py` hat fünf Aktionen:

| Aktion | Wirkung |
| --- | --- |
| `plan` | Liest Bestand, zählt Anlagen, nennt fehlende Quellen bzw. Länderanbindung. Kein Download. Exit 2 bei fehlenden Voraussetzungen. |
| `run` | Verarbeitet einen unterstützten neuen Ort auf Hetzner, mit gemeinsamer Sperre und isoliertem Kandidatenverzeichnis. Keine Veröffentlichung. |
| `status` | Liest Ergebnis/Fehler des Auftrags. `not-started`, `running`, `interrupted`, `failed` und `needs-review` sind unterschiedliche Zustände. |
| `check` | Prüft die erzeugten Daten: Ortsidentität, Anlagen-IDs, echte Maße/Leistungen, Gelände, Ziele, Quellenbelege. Lücken bleiben sichtbar. |
| `verify-live` | Vergleicht öffentliche Szene mit geprüftem Kandidaten und ruft die tatsächlichen Wetterwege für Ort, Solar und jeden Windpark ab. Kein Ersatz für Browserabnahme. |

`stageReady` bleibt in diesen technischen Ergebnissen **false**: Kein dieser Befehle kann Browserabnahme, Nutzungsrechte oder eine Veröffentlichungsentscheidung behaupten. Auch `technicalChecksPassed: true` heißt nur, dass die aufgeführten maschinellen Prüfungen bestanden sind.

### Tatsächlich unterstützter Umfang

- **Bundesweite Vorarbeit:** technische Registerinventare mit vorläufiger Zuordnung anhand generalisierter Gemeindegrenzen. Das ist noch keine Szene.
- **Allgemeiner neuer-Geometrie-Lauf:** Niedersachsen, Nordrhein-Westfalen, Brandenburg und Sachsen-Anhalt (Länderadapter in `scripts/landscape_state_sources.py`), Gemeinden mit oder ohne Windanlagen. Brandenburg liefert UTM33 und wird beim Einlesen auf UTM32 umgerechnet; Sachsen-Anhalt liefert 2-km-Kacheln (Gebäude CityGML, Gelände DGM5) über den Kartendownloader des LVermGeo, dessen Kachelverzeichnis aus der Downloadseite gelesen wird. OSM-Auszug je Land bzw. Regierungsbezirk in `inputs/`.
- **Pilotrezepte, nicht allgemeine Länderabdeckung:** RLP-Kreisvorbereitung sowie Landkreis Oldenburg/Würzburg und die bisherigen Einzelorte. Ihre Skripte sind zur Wiederverwendung zentral verfügbar, aber teilweise auf Pilotquellen/Orte begrenzt. `plan` gibt einen anderen Ort deshalb nicht still an ein solches Skript weiter.
- **Andere Länder, neue Landkreise oder Orte ohne Wind:** vorhandene Bausteine und Quellen prüfen, fehlenden Adapter ergänzen. Vor größerer Recherche/Entwicklung Aufwand und Modellverbrauch mit dem Betreiber abstimmen. Ein nicht unterstützter Ort bleibt ein konkreter offener Auftrag; niemals einen vorhandenen Ort als Ersatz ausliefern.

## 3. Hetzner verwenden

Bestehender Host: `root@91.98.120.32`, vorhandener lokaler SSH-Schlüssel `~/.ssh/hetzner_crawler`. Keine Schlüssel oder Anwendungs-Geheimnisse ins Repo kopieren. Datenroot: `/opt/solar-check-landscape`. Python: `venv/bin/python`. Der Arbeitscode dieses Workflows liegt getrennt von den laufenden Altjobs unter `workflow/current/scripts/`.

Beispiel für einen neuen Auftrag (Schlüssel durch den tatsächlich beauftragten Ort ersetzen):

```sh
ssh -i ~/.ssh/hetzner_crawler root@91.98.120.32 \
  '/opt/solar-check-landscape/venv/bin/python /opt/solar-check-landscape/workflow/current/scripts/stage-workflow.py plan --place 03458003'
```

Erst bei geklärtem Plan den Auftrag starten. In `jobs/stages/<AGS>.env` steht **nur** der Pfad des bereits vorhandenen, datierten OSM-Auszuges, z.B. `OSM_FILE=/opt/solar-check-landscape/inputs/niedersachsen-261001.osm.pbf`. Einen aktuelleren Auszug nicht blind nach Dateiname wählen: Stand und Quellenbeleg prüfen. Die Datei enthält keine API-Schlüssel.

```sh
# On the existing preparation host:
systemctl start --no-block solar-check-stage@03458003.service
/opt/solar-check-landscape/venv/bin/python \
  /opt/solar-check-landscape/workflow/current/scripts/stage-workflow.py status --place 03458003
journalctl -u solar-check-stage@03458003.service -n 40 --no-pager
```

Der Dienst nutzt höchstens 75 % eines CPU-Kerns und 1.8 GB RAM. Eine gemeinsame Sperre verhindert parallele neue Geometrieaufträge; bei besetzter Sperre später erneut starten, nicht einen zweiten Weg benutzen. Ein Leselock verhindert den Wechsel der nationalen Quellgeneration während der Verarbeitung. Keine neuen Server, Datenträger, bezahlten Datenquellen oder Modellaufrufe. Vorhandener Server-/Traffic-Tarif gilt weiter; „keine Modellaufrufe“ heißt nicht „beliebig viel Traffic garantiert kostenlos“.

Ergebnis:

- `candidates/<AGS>/public/geo/landscape-tours/<AGS>/`: Szene und Belege.
- `candidates/<AGS>/checks.json`: technische Prüfung und offene Gates.
- `jobs/stages/<AGS>.json`: Status und Logpfad.
- `logs/stage-<AGS>.log`: Fehlerdiagnose.

Fehler bleiben Fehler. Vorhandene Kandidaten werden nicht überschrieben. Einen fehlgeschlagenen Lauf ohne fertigen Kandidaten kann man nach Ursachenbehebung erneut starten; vorhandene Kandidaten zuerst sichern und gezielt beurteilen. Keine pauschale Löschung des Cache oder nationalen Neuläufe als Reparatur.

### Code des Workflows installieren/aktualisieren

Nur die eingecheckten `scripts/landscape*.py`, `scripts/stage-workflow.py`, Tests und `scripts/systemd/solar-check-stage@.service` übertragen. Ziel ist ein neues versioniertes `workflow/<Version>/`-Verzeichnis; dort Tests ausführen, danach `workflow/current` auf genau diese Version setzen. Dienstdefinition nach `/etc/systemd/system/`, anschließend `systemctl daemon-reload`. **Keinen neuen Ort allein durch Installation starten.** Laufende Wetter-/Registertimer und deren Code nicht überschreiben. Abhängigkeiten stehen in `scripts/landscape-requirements.txt`; vorhandenes Server-Environment zuerst prüfen, nicht ungefragt aktualisieren.

## 4. Datenlücken vor Integration bearbeiten

`check` laufen lassen und `provenance.json`, `assignment-audit.json`, `data-gaps.json` sowie `solar-register.json` lesen. Prüfen:

- Generalisierte Grenzen sind kein Flurstücksnachweis. Grenznahe Anlagen anhand genauer amtlicher Grenzen kontrollieren; Registergemeinde separat behalten.
- Fehlende Koordinate, Nabenhöhe, Rotordurchmesser oder Leistung niemals schätzen. Bestehende neutrale Darstellung bzw. ehrliche Nichtverfügbarkeit nutzen, fehlende Registerfelder als Rechercheauftrag erhalten.
- Solarfläche muss mit tatsächlichen aktiven Freiflächen-Einträgen verknüpft sein. Ein Registerpunkt in einem Polygon beweist nicht automatisch die vollständige Parkleistung. Keine Gebäude-PV als Freiflächenpark ausgeben.
- Vorhandene Wetterkurve ohne bestätigte Parkleistung darf als relative Auslastung erscheinen; keine erfundenen kW. Vor Aussand diese Lücke ausdrücklich beurteilen, nicht still als vollständig abhaken.
- Keine doppelten Windräder, keine beliebigen Parknamen, echte Gebäude, durchgehende Höhenbezüge. Quellen, Stand und Quellenhashes behalten.
- Fehlen einem Windrad Nabenhöhe oder Rotordurchmesser im Register, steht es sonst nur als Bodenmarke da. `python3 scripts/landscape_wind_dimensions.py --root public/geo/landscape-tours --write` ergänzt den fehlenden Wert als Median baugleicher Windräder aller vorbereiteten Szenen (mindestens zwei), sonst gleicher Nennleistung ±10 % (mindestens drei). Registerwerte bleiben unangetastet; jede Schätzung steht mit Methode und Vergleichszahl am Windrad und in der Lückenliste. Derselbe Lauf entfernt Windradtürme, die das amtliche Gebäudemodell als eigene Gebäude führt (schlank, über 20 m hoch, auf einem Windradstandort) — sie stünden sonst als nackter Zylinder neben dem Windrad. Nach jeder neuen Szene laufen lassen.
- Nutzungsrecht und korrekte Attribution **für jede verwendete Quelle** prüfen. Ein Textfeld mit einer Lizenz ist kein juristischer Freigabenachweis. UFZ ist keine Voraussetzung; ohne geklärte Zugangs-/Nutzungsrechte nicht importieren. Amtliche offene Quellen/MaStR/OSM nach ihren jeweiligen Bedingungen verwenden.

## 5. In die vorhandene Stage integrieren

Nur kompakte vorbereitete Ergebnisse vom Server holen, nie Rohterrain/LoD-Gesamtpakete aufs MacBook.

1. Geprüfte Dateien nach `public/geo/landscape-tours/<AGS>/` im eigenen Worktree übernehmen, einschließlich Quellen-/Zuordnungs-/Lückenbelegen. Keine Kandidatensymlinks veröffentlichen.
2. In `lib/landscape-places.ts` den neuen Ort **und seine tatsächliche Attribution** ergänzen. Der bisherige Hessen-Fallback ist für neue Länder kein Beleg. Quellenanzeige in `components/landscape/LandscapeHero.tsx` mitprüfen.
3. `lib/wind-map.ts::isWindWeatherTown` für den tatsächlichen Wetterort ergänzen. Kreise tragen einen realen zugehörigen `weatherMunicipality`-Schlüssel; Kreisübersicht nutzt Kreisaggregation, Parkkachel Parkleistung. Nicht nur den Dropdown-Eintrag ergänzen: sonst lädt Geometrie, aber die Wetterroute weist den Ort ab.
4. `python3 scripts/landscape-stop-metadata.py` erzeugt `public/geo/landscape-wind-stops.json`. Diff prüfen: Keine bisherige Parkposition darf beiläufig verschwinden.
5. Aktualisierte Windziel-Metadaten auch an den Wetterdienst `/opt/solar-check-park-weather` liefern; siehe `docs/park-wetter-betrieb.md`. Auf einen erfolgreichen Lauf warten und konkrete neue Parkdaten prüfen. Die nationale Solar-/Ortswetterpipeline ist separat; ein erfolgreicher Parkwind-Lauf garantiert keine Solarkurve.
6. Zentrale `LandscapeHero`, `HeroLandscapeTour`, `LocationMicroCard` und Chart-Widgets **verwenden**, nicht kopieren. Szenengeometrie und Flugsteuerung werden nicht pro Ort neu entwickelt.
7. `npm run kommunen:build` erzeugt die Produkt-Landingpage aus diesen gemeinsamen Komponenten. Die Astro/HTML-ähnliche lokale Komposition ist kein zweiter veröffentlichter Besitzer der Stage.

## 6. Browser, Veröffentlichung und Aussand

Vor Freigabe dieselbe Kommunen-**Produktlandingpage** mit `?gemeinde=<AGS>` prüfen, nicht bloß den Atlas, die Windvorschau oder einen temporären Szenenwrapper:

- Desktop und Telefon: richtige Orts-/Kreisstartansicht, echte Gebäude, Geländeverlauf, klare Kacheln und lesbare CTA.
- Ganzer Rundflug einschließlich Rückweg; jeder Pin/Ort und jede Parkkachel. Unbekannte Daten dürfen keine Null vortäuschen.
- Wechsel im Dropdown hält die Stage, zeigt Ladezustand, liefert weder den alten Ort noch alte Wetterwerte weiter.
- Alle Park- und Ortskurven laden; Windbewegung und Kachel nutzen denselben Wetterstand. Bestehende Prüfungen für technische Änderungen laufen lassen; keine Zeitlimits wegen Rechnerlast lockern, Tests gegebenenfalls mit einem Worker wiederholen.
- Geräte-/Browserbefund dokumentieren. Ein schneller Entwicklungsrechner beweist keine allgemeine Besucherperformance.

Neue Orte erst nach der geltenden Produkt-/Browserfreigabe veröffentlichen. Nach erfolgreicher Auslieferung:

```sh
python3 scripts/stage-workflow.py verify-live --place 03458003 \
  --directory public/geo/landscape-tours/03458003
```

Danach den **öffentlichen** Link im Browser öffnen, ganzen Rundflug prüfen und Desktop-/Mobilbeleg sichern. Bei Fehler kein Aussand. Dokumentiere im Auftragsnachweis: Ort/Gebiet, Szenenhash, Quelldatum, erledigte/offene Datenlücken, Lizenzbelege, Browserbefund, Liveprüfung mit Zeit, Veröffentlichung und endgültigen Link.

Erst jetzt den Link als versandbereit übergeben:
`https://solar-check.io/fuer-organisationen/kommunen?gemeinde=<AGS>`.

**Workflow-Ende ist ein geprüfter Link, nicht `stageReady:false`, ein Log oder ein laufender Serverjob.** Offene Schritte werden mit konkretem Grund und nächster Handlung gemeldet. Mailversand bleibt ein gesonderter Auftrag; bestehende Versandregeln gelten unverändert.

## Kurzer Auftrag für eine andere Session

> Bereite die Kommunen-Produktstage für [Ort, Bundesland, Gemeinde/Landkreis] vor dem Aussand vor. Folge `docs/landschaft-neuer-ort-workflow.md`. Nutze den bestehenden Hetzner-Bestand und gemeinsame Komponenten, keine neue Szene. Beginne mit dem Plan, bearbeite Lücken sichtbar und liefere erst nach Quellen-, Wetter-, Browser- und Liveprüfung den teilbaren Link. Umfangreiche neue Adapter-/Recherchearbeit vorher mit mir abwägen; keine bezahlten Modellläufe oder Infrastruktur ohne Absprache.
