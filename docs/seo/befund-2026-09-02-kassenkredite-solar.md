# Klamme Kasse, leeres Dach — der IW-Befund an unseren eigenen Daten

**Gemessen am 02.09.2026.** Anlass: Die Frage, ob sich belegen lässt, dass konservativ
geführte Länder, Kreise oder Gemeinden weniger Erneuerbare zubauen. Antwort darauf:
nein (siehe `docs/quellen/iw-kommunen-erneuerbare/README.md`). Die einzige Studie zur
Frage findet für Dach-Photovoltaik **keinen** Parteieffekt — wohl aber einen Effekt der
**Gemeindefinanzen**. Das ist hier nachgerechnet, bundesweit statt nur für NRW.

## Datengrundlage

- **Kassenkredite je Gemeinde**, Stichtag 31.12.2023, aus der Regionaldatenbank
  Deutschland (Tabelle 71327-Z-05, Stapelabruf über die Schnittstelle). Lizenz:
  Datenlizenz Deutschland – Namensnennung 2.0, von der Schnittstelle in jeder Antwort
  mitgeliefert. Abzug im selben Ordner.
- **Dach-Photovoltaik je Gemeinde**, kumuliert bis 2023, aus unserem Anlagenregister-
  Bestand. Freiflächen bleiben außen vor: Sie hängen an Fläche und Bebauungsplan, nicht
  am Haushalt der Gemeinde.
- Zusammengeführt über den Gemeindeschlüssel, Gemeinden ab 1.000 Einwohnern.
  **3.357 Gemeinden** im Vergleich.

## Befund

Kassenkredite sind die kurzfristige Überziehung des kommunalen Haushalts und gelten als
Krisenzeichen. **1.096 Gemeinden** haben welche, 11.691 ausdrücklich keine.

Gemeinden mit Überziehung haben in **jeder** Größenklasse weniger Dach-Solar je
Einwohner:

| Größenklasse | mit Überziehung | ohne | Unterschied |
|---|---|---|---|
| unter 5.000 Einwohner | 1.274 Wp/Kopf (n=36) | 1.412 (n=897) | −10 % |
| 5.000–20.000 | 679 (n=236) | 848 (n=1.527) | −20 % |
| 20.000–100.000 | 484 (n=139) | 507 (n=447) | −4 % |
| ab 100.000 | 203 (n=30) | 249 (n=45) | −18 % |

**Ohne Größenkontrolle sieht es nach −35 % aus.** Rund die Hälfte davon ist ein
Größeneffekt: Überzogene Gemeinden sind im Mittel deutlich größer, und größere Gemeinden
haben ohnehin weniger Dachfläche je Kopf. Wer die Zahl ohne diese Kontrolle veröffentlicht,
verkauft einen Stadt-Land-Unterschied als Finanzeffekt — genau der Fehler, vor dem die
Studie in eigener Sache warnt.

## Die Gegenprobe, die den Befund trägt

Die überzogenen Gemeinden konzentrieren sich stark (NRW 164, Rheinland-Pfalz 85,
Niedersachsen 37, Sachsen-Anhalt 36, Bayern 36). Der Unterschied könnte also ein
Bundesland-Effekt sein. Ist er nicht — er zeigt sich **innerhalb** der Länder:

| Land | mit | ohne | Unterschied |
|---|---|---|---|
| Nordrhein-Westfalen | 674 Wp/Kopf (n=164) | 891 (n=232) | −24 % |
| Bayern | 1.116 (n=36) | 1.344 (n=1.056) | −17 % |
| Sachsen-Anhalt | 866 (n=36) | 1.038 (n=68) | −17 % |
| Niedersachsen | 627 (n=37) | 731 (n=250) | −14 % |
| Saarland | 671 (n=19) | 586 (n=33) | **+14 %** |

## Was NICHT belastbar ist

- **Rheinland-Pfalz fliegt raus.** Dort ergibt die Rechnung 60 gegen 255 Wp/Kopf — Werte,
  die um den Faktor fünf unter allen anderen Ländern liegen und nicht zum Landeswert des
  Atlas passen. Verdacht: Die Schlüssel-Zuordnung trifft bei den rund 2.300
  Ortsgemeinden unter Verbandsgemeinden nicht. **Vor jeder Veröffentlichung zu klären.**
- **Das Saarland dreht die Richtung um** (+14 %, n=19). Bei dieser Fallzahl ist das kein
  Gegenbeweis, aber es gehört genannt: Der Zusammenhang ist nicht überall gleich.
- **Es ist eine Korrelation, keine Ursache.** Überzogene Gemeinden unterscheiden sich in
  vielem — Strukturschwäche, Abwanderung, Altbaubestand. Die Studie kontrolliert Fläche
  und naturnahe Flächen, wir nur die Einwohnerzahl. Ein Satz wie „die klamme Kasse
  verhindert Solaranlagen" ist damit **nicht** gedeckt.
- **Der Schlüssel-Abgleich deckt 3.357 von rund 11.000 Gemeinden.** Woran die übrigen
  scheitern, ist ungeprüft.

## Warum das trotzdem eine Geschichte ist

Sie erklärt etwas, das die Atlas-Zahlen sichtbar machen, aber nicht begründen — und sie
ist für Kommunen anschlussfähig statt anstößig: ein Argument für Förderung und für
Bürgerenergie-Modelle, die den Haushalt nicht belasten, kein Vorwurf an die Verwaltung.
Damit ist sie das Gegenteil der Partei-Achse, die am selben Tag verworfen wurde.
