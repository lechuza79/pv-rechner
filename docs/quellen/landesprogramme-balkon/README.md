# Landesprogramme Steckersolar — Prüfstand

Erhebung vom **26.08.2026**. Anlass: `docs/seo/befund-2026-08-19-balkon-foerderung.md`
misst die Nachfrage auf Bundesland-Ebene (rund 1.900 Suchen/Monat über die 16 Länder),
und die beiden stärksten Anfragen — Sachsen und Berlin — trafen bei uns auf null
Programme.

**Diese Datei ist der Gedächtnisersatz.** Ohne sie prüft die nächste Sitzung dieselben
fünf Länder noch einmal, und die negativen Befunde („dort gibt es nichts") sind genau
die, die niemand im Code sieht.

## Geprüft an der Amtsquelle

| Land | Volumen/Monat | Befund | Quelle |
|---|---|---|---|
| Sachsen | 390 | **ausgelaufen zum 30.06.2026** — 300 € pauschal, FRL EEuS/2023 Teil B | `sab-sachsen-balkonkraftwerke.txt` |
| Berlin | 260 | **keine Neuanträge** — SolarPLUS führt Steckersolar nur noch unter „Antragsbearbeitung" | ibb.de/de/foerderprogramme/solarplus.html |
| Nordrhein-Westfalen | 260 | **kein Förderbereich Steckersolar** — Seite aktuell (Meldung vom 14.08.2026) | bra.nrw.de, Förderbereiche progres.nrw |
| Mecklenburg-Vorpommern | 110 | **aktiv**, 500 € je Anlage — Eigentümer-Kontingent erschöpft, nur noch Mietende | `lfi-mv-mini-solaranlagen.txt` |
| Hamburg | 20–90 | **aktiv**, bis 90 % der Anschaffung — nur Haushalte mit geringem Einkommen, über die Caritas | `hamburg-bukea-balkonkraftwerk.txt` |

Im Katalog gelandet sind die drei mit eigenem Programm (`sachsen-balkon`,
`mv-mini-solar`, `hamburg-balkon-geringes-einkommen`). Berlin steht dort längst als
PV-Programm mit ausdrücklichem Balkon-Ausschluss; NRW braucht keinen Eintrag, weil es
nichts zu erfassen gibt.

## Noch offen

Bayern (210), Niedersachsen (140), Hessen (110), Brandenburg, Baden-Württemberg,
Schleswig-Holstein, Thüringen, Sachsen-Anhalt, Saarland, Bremen, Rheinland-Pfalz.

Für Thüringen und Sachsen-Anhalt sagen mehrere Sekundärquellen übereinstimmend „kein
Landesprogramm" (Thüringens *Solar Invest* endete zum 31.12.2022). **Das ist kein
Beleg** und steht deshalb nirgends auf einer Seite — ein negativer Befund braucht
dieselbe Amtsquelle wie ein positiver, sonst behaupten wir „gibt es nicht" auf der
Grundlage von Ratgeberlisten, deren Fehlerquote wir bei Sachsen gerade gemessen haben:
sechs von sechs führten den ausgelaufenen Zuschuss weiter als abrufbar.

Solange diese Länder offen sind, trägt `/balkonkraftwerk/foerderung` ihren Vorbehalt.

## Zwei Fallen, die hier schon zugeschnappt sind

**Ein Landesschlüssel deckt jeden Ort seines Landes.** Sachsens „14" hat Dresden,
Leipzig und Chemnitz ein Programm gegeben, ohne dass jemand diese Einträge angefasst
hätte. Bei Berlin und Bremen fiel das nie auf, weil dort Land und Stadt derselbe Ort
sind. Eine Seite entsteht dadurch nicht — der Releaseplan hält —, aber wer ein
Landesprogramm aufnimmt, prüft danach `archivedCities()` und `liveCities()`.

**Ein glatter Festbetrag ist noch kein Rechenwert.** M-V zahlt 500 €, und trotzdem
steht dort kein `balkonPauschale`: Der Eigentümer-Topf ist leer, zahlbar ist der Betrag
nur an Mietende, und Miete/Eigentum ist im Balkon-Rechner ein Hinweis und kein
Rechenweg. Wer die Zahl einträgt, zieht sie jedem Eigentümer in M-V ab.
