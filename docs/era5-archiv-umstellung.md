# Wetterdaten der Kommunalcharts ohne Abo: Bericht und Stand

Stand: 17.09.2026. Auftrag war, die kostenpflichtige Historien-API von Open-Meteo
(99 EUR/Monat für kommerzielle Nutzung) zu ersetzen, ohne dass die Zahlen sich
ändern. Ergebnis: umgesetzt, gemessen, noch nicht freigegeben.

## Die Quelle ist eine andere geworden als beauftragt

Der Auftrag nannte den Copernicus Climate Data Store (CDS). Genutzt wird
stattdessen **Open-Meteos eigenes offenes Datenarchiv** (AWS Open Data,
Bucket `openmeteo`, CC BY 4.0). Der Grund ist nicht Bequemlichkeit, sondern
Gleichwertigkeit: Dort liegt **genau die vorverarbeitete ERA5-Fassung, die die
kostenpflichtige API ausliefert**. Damit ist Parität messbar statt bloß
plausibel — und genau das war die Bedingung des Auftrags.

Was gegen den CDS spricht, alles geprüft:

| | CDS | offenes Archiv |
|---|---|---|
| Zugang | Konto, manuell angenommene Lizenz, Warteschlange | keiner |
| Rohprodukt | Kelvin, J/m² akkumuliert, GRIB/NetCDF | bereits °C, W/m² Stundenmittel |
| Zellwahl, Höhenbezug | müssten wir selbst erfinden | dieselbe Regel wie die API |
| Parität | nicht beweisbar, nur begründbar | gemessen, siehe unten |
| Werkzeuge | NetCDF/GRIB-Leser, in diesem Repo nicht vorhanden | ein npm-Paket |

Ebenfalls geprüft und verworfen: **ARCO-ERA5** bei Google (öffentlich, aktuell bis
2026-09-10, keine Zugangsdaten) — dort ist jede Stunde ein globales Feld von rund
2 MB, ein Monat wären ~6 GB und ein Jahr ~70 GB, weil sich räumlich nichts
ausschneiden lässt. Gemessen, nicht geschätzt.

## Was die neue Quelle liefert

Vier Größen je Stunde, je Rasterzelle von 0,25°: Temperatur (°C), Globalstrahlung
(W/m², Mittel der vorangegangenen Stunde), Windkomponenten in 100 m (m/s).
Der Bestand reicht rund fünf Tage an die Gegenwart heran und wird täglich
fortgeschrieben — dieselbe Verzögerung wie bisher, weil es dieselben Daten sind.

**Die zwei Regeln, die den Unterschied ausmachen**, sind aus dem
veröffentlichten Quelltext von Open-Meteo übernommen und im Code mit Fundstelle
belegt:

1. **Welche Rasterzelle ein Ort bekommt.** Nicht die nächstgelegene: Liegt die
   Modellhöhe der nächsten Zelle mehr als 100 m neben der Ortshöhe, wird im
   3×3-Block die passendere gesucht, mit 30 m Höhenaufschlag je Kilometer
   Entfernung. Das ist der Grund, warum Küstenorte nicht auf einer Seezelle
   landen. **Gemessen: schlichte Nächstgelegenheit hätte 2,55 % der Orte falsch
   zugeordnet** — fast ausschließlich an Nord- und Ostsee.
2. **Die Temperatur wird auf die Ortshöhe umgerechnet**, mit 0,65 K je 100 m.
   Strahlung und Wind nicht — das ist an den Antworten des Anbieters gemessen,
   nicht angenommen: zwei Orte in derselben Zelle unterscheiden sich
   ausschließlich in der Temperatur.

Die Ortshöhe kommt aus demselben 90-m-Höhenmodell, das der Anbieter benutzt; sie
liegt einmal erhoben als Tabelle vor (11.499 Punkte).

## Gemessene Gleichwertigkeit

Alles gegen die **3.419 Rohantworten**, die ein früherer Lauf gespeichert hat.
Kein einziger neuer Abruf beim Anbieter — dessen Tageslimit war erschöpft.

**Stundenwerte, 16,2 Millionen Vergleichspunkte:**

| Größe | identisch | größte Abweichung | Summenabweichung |
|---|---|---|---|
| Globalstrahlung | 100,0 % | 0,000 W/m² | 0,00000 % |
| Wind 100 m | 100,0 % | 0,01 m/s | 0,00002 % |
| Temperatur | 99,4 % | 0,1 °C | — |

Die 0,1 °C sind **eine Rundungsstufe der Anzeige**, kein Modellunterschied: der
Anbieter rundet auf eine Nachkommastelle, und unsere Höhenkorrektur fällt
gelegentlich auf die andere Seite. Mittlerer Versatz über alle 16,2 Mio Werte:
−0,0005 °C.

**Rasterzelle: 3.419 von 3.419 gleich.** Und, der eigentliche Nachweis, weil er
ohne den Anbieter auskommt: **mit unserer eigenen Ortshöhe 2.311 von 2.311
gleich (100,00 %).**

**Was ein Leser sieht** — beide Wetterquellen durch denselben Rechenweg, 1.146
Gemeinden:

| Ergebnis | Median | größte Abweichung |
|---|---|---|
| Monatschart, Gesamtmenge | 0,00000 % | 0,043 % |
| schlechtester Einzeltag | 0,00000 % | 0,045 % |
| Jahresprofil Solar | 0,00000 % | 0,041 % |
| Jahresprofil Wind | 0,00000 % | 0,00016 % |
| Stromwert in Euro | 0,00000 % | 0,043 % |
| Einspeise-Euro | 0,00000 % | 0,043 % |
| Spitzentag des Monats | — | 1.146 von 1.146 gleich |

**Die Akzeptanzgrenze war nicht großzügig gesetzt, sie wurde nicht gebraucht.**
Der schlechteste Ort weicht um 0,043 % ab; die Zahlen werden auf drei
signifikante Stellen angezeigt. Ein Unterschied, den man sehen könnte, entsteht
erst zwei Größenordnungen darüber.

## Was das kostet

Gemessen auf diesem Rechner:

- **Ein Monat, alle vier Größen, ganz Deutschland: 40 Sekunden, 23 MB.**
- Ein volles Jahr: 214 Sekunden, 208 MB.
- Arbeitsspeicher im Lauf: 230 MB Spitze.
- Auf der Platte: 2,9 MB je Größe und 21-Tage-Block. Der Bestand für ein Jahr
  plus einen Monat liegt bei 226 MB — gegenüber 485 MB roher Anbieterantworten
  für einen Bruchteil der Gemeinden.
- Wiederholter Lauf: **null Anfragen**, die fertigen Blöcke werden übersprungen.
- Der Ausschnitt ist einmal Deutschland, nicht einmal je Gemeinde. Die Kosten
  wachsen mit dem Kalender, nicht mit der Zahl der Orte.

Zum Vergleich: die bisherige Lösung brauchte **einen Abruf je Gemeinde und
Zeitraum** und ist genau daran ins Tageslimit gelaufen.

## Was gebaut ist

- `lib/era5-grid.ts` — Rastergeometrie und Zellwahl, mit Fundstellen.
- `lib/era5-orography-de.json` — Modellhöhen des deutschen Ausschnitts,
  eingecheckt, damit die Zellwahl ohne Netz nachvollziehbar bleibt.
- `lib/era5-archive.ts`, `lib/era5-store.ts` — Zuschnitt und lokaler Blockspeicher.
- `lib/era5-weather.ts` — erzeugt die vorhandene Wetterform, plus Herkunftsangabe.
- `lib/story-weather-provider.ts` — die Quellenwahl, **Vorgabe bleibt der alte
  Anbieter**; die neue Quelle nur auf ausdrückliche Ansage.
- `scripts/era5-sync.ts`, `era5-month.ts` — Laden und monatliche Pflege.
- `scripts/era5-static-build.ts`, `era5-points-build.ts` — die statischen Grundlagen.
- `scripts/era5-compare.ts`, `era5-compare-outputs.ts`, `era5-report.ts`,
  `era5-spotcheck.ts` — die Messungen dieses Berichts, wiederholbar.
- 29 Tests, darunter die Fehlerfälle: fehlende Stunde, unvollständiger Download,
  fehlender Wert, Zelle außerhalb Deutschlands, Seezelle, vertauschte
  Breitenrichtung, getrennte Zwischenspeicher je Quelle, kein Wetterabruf beim
  Seitenaufruf. Jede Schranke wurde absichtlich einmal ausgebaut; jede wurde rot.

## Was offen bleibt

- **Die Berge sind nicht gegen den Anbieter geprüft, nur nachgerechnet.** Die
  gespeicherten Antworten reichen bis 725 m Höhe und liegen zu 98 % nördlich des
  50. Breitengrads. Die Höhenkorrektur wird aber im Süden am größten: bis 5,2 K,
  bei 712 Orten über 1 K. Dass sie dort stimmt, folgt aus identischem Verfahren
  und identischen Eingaben, nicht aus einer Messung. `npm run era5:stichprobe`
  schließt die Lücke mit sieben Abrufen, sobald das Tageslimit des Anbieters
  zurückgesetzt ist.
- **Vorläufige Werte (ERA5T) sind nicht als solche erkennbar.** Das Archiv
  veröffentlicht die Kennzeichnung nicht. Wir sehen nur, **dass** ein Block
  überarbeitet wurde (`era5:monat --revision` vergleicht den Änderungszeitpunkt),
  nicht warum. Das bleibt bewusst ein Befund zum Ansehen und überschreibt
  niemals einen bereits berechneten Stand.
- **Der Zehnjahres-Ertragsvergleich läuft unverändert weiter** über den alten
  Weg. Er wurde nicht angefasst — halb umgestellt wären die Jahre nicht mehr
  vergleichbar, und ein Methodenwechsel mitten in einer Reihe erzeugt Rekorde,
  die keine sind. Eine spätere Migration muss die **ganze** Reihe erfassen.
- **Ein Befund, der nicht zu dieser Arbeit gehört, aber im selben Code liegt:**
  Der Vorbereitungslauf setzte sein Bewertungsdatum aus der Weltzeit statt aus
  der deutschen Uhr. Zwischen Mitternacht und zwei Uhr morgens steht dort der
  Vortag. Der Zeitzonen-Wächter des Projekts meldet das seit jeher — in der
  Story-Worktree ist derselbe Test heute rot. Hier ist die eine Zeile behoben;
  die andere Sitzung wird beim Einchecken sonst am selben Test hängenbleiben.
- **Freigabe steht aus.** Nichts ist gemergt, die Vorgabe bleibt der alte
  Anbieter. Die Umstellung ist ein Schalter, kein Zustand.

## Wenn umgestellt wird

1. `npm run era5:punkte` — Wetterpunkte sammeln, **einschließlich der in
   früheren Ständen festgehaltenen**. Ohne die fehlt einem Drittel der bereits
   berechneten Orte die Höhe, und der Lauf bleibt bei ihnen stehen. Gemessen:
   556 von 1.724.
2. `npm run era5:static -- --orographie --hoehen` — einmalig, rund fünf Minuten.
3. `npm run era5:monat -- --month=JJJJ-MM` — lädt und prüft, idempotent.
4. `npm run story:prepare -- --provider=era5-archive …` — der bestehende Lauf,
   unverändert, nur mit anderer Quelle.
