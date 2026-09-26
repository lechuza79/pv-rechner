# Kommunale Storymuster und Datenabdeckung

Arbeitsstand: 14. September 2026. Lokale Entwicklung, keine Veröffentlichung.

## Entscheidung nach Abgleich mit dem Original

Die Kategorien aus `lib/redaktionsplan.ts` bleiben die gemeinsame Zuordnung. Die bisherige V2-Liste „Evergreen / Snapshot / Ereignis und Rückblick“ war keine Kategorienliste: Sie vermischte Wiederverwendbarkeit, Datenstand und Erzählanlass.

- **Kategorie:** Wovon handelt der Befund? Bestehende Kategorien dürfen sich überschneiden: Ein auffälliger Balkon-Zubau gehört zu Balkon und Auffälligkeiten.
- **Zeitbezug:** Momentaufnahme, Ereignis, Rückblick. Ein historisches Ereignis darf zugleich ein Rückblick sein. Ein Jahresvergleich ist zunächst ein Rückblick; eine Einweihung ist ein Ereignis. Eine Häufung im Register belegt keine Einweihung.
- **Wiederverwendbarkeit:** Eigenständige Eigenschaft. Ein Flächenprofil eignet sich als Evergreen, hat trotzdem einen konkreten Datenstand. Ein fest veröffentlichter Beitrag wird dadurch nicht automatisch fortgeschrieben; ein Widget kann die aktuellen Werte desselben Musters zeigen.
- **Neu entdeckt:** Vergleich zweier kompatibler Datenläufe, keine Behauptung über Aktualität. Beim ersten vollständigen Einlesen gibt es keine automatisch behaupteten News. Eine nachgemeldete Anlage von 2015 ist keine neue Anlage von heute.

Damit gibt es keine feste Quote und keine Pflicht, jede Matrixzelle zu füllen. Der Pool hält belastbare Befunde unabhängig davon, ob bereits ein Visual fertig ist. Gestaltung, Veröffentlichung und Kanalwahl folgen danach.

## Matrix aus dem vorhandenen Katalog

| Bestehende Kategorie | Momentaufnahme / wiederverwendbar | Ereignis | Rückblick | Datenvoraussetzung |
|---|---|---|---|---|
| Zubau | aktueller Bestand als Kontext | abgesetzter Inbetriebnahmezeitraum | gleiche Perioden, Jahresentwicklung, Rekorde, Rückgänge | Register mit Inbetriebnahmedatum und Status |
| Vergleich | Ort vs benannte Vergleichsgruppe, aktueller Rang | Auf- und Abstieg | Monats-/Jahres-Rangstand | vergleichbare Ortsbasis; für Veränderungen zwei echte Rangstände |
| Auffälligkeiten | auffällige Struktur | Tages-/Wochen-/Monatsspitze, großer Leistungszugang | historische Spitzen und verändertes Niveau | vollständiger Verlauf; keine behauptete Ursache |
| Balkonkraftwerke | Anzahl, Anteil, Größen | Zubau oder belegter Fördertermin | Entwicklung nach gleichen Zeiträumen | deklarierter Anlagentyp, keine Ableitung allein aus geringer Leistung |
| Flächenmix | Gebäude / Freifläche / andere Typen | belegter Wechsel der Struktur | Vergleich zweier echter Datenstände | Gebäudetyp allein ist kein Beleg für Privat- oder Gewerbedach |
| Anlagenjahrgänge | Größenverteilung, kleinste / mittlere / größte Einheit; Speicher | neue belegte Größenklasse | Anzahl und Leistung entwickeln sich unterschiedlich | Einzeleinheiten; Batterie-kWh getrennt von PV-kWp |
| Förderung | gültiges lokales Angebot | belegter Beginn, Änderung, Ende | Entwicklung rund um belegte Termine | amtliche Förderhistorie; zeitlicher Zusammenhang ist keine Wirkung |
| Puls / Erzeugung | aktuelle modellierte Erzeugung | modellierter Ertragsrekord | gleicher Tag / Woche im Wettervergleich | Wetter × damals passender Anlagenbestand × Modellversion |
| Geld | ausdrücklich gerechnete Einordnung | Vergütungsende eines Jahrgangs | modellierter Erlös eines Zeitraums | Betriebs-/Vergütungsdaten, Ertragsmodell, Annahmen; keine gemessenen Einnahmen behaupten |
| Stichtag / Service / Mythos / Preis | übertragbarer Ratgeber oder Modellvergleich | belegte Frist oder Änderung | nur mit passendem Anlass | eigene fachliche Quellen; keine automatischen Registerfunde |
| Ungebaut | ungenutztes Potenzial | – | Potenzialentwicklung | tatsächlicher geeigneter Gebäudebestand als Nenner |

Ausland, eigene Werkstatt und allgemeine UX-Inhalte bleiben im ursprünglichen Katalog. Sie sind keine automatisch für jede einzelne Kommune entstehenden Datenstories. Fehlende Gemeinde-Zuordnung bedeutet nicht „kein Treffer“.

## Was der lokale Vollabruf wirklich liefert

Quelle: offizieller vollständiger Marktstammdatenregisterexport vom 10. September 2026. Der lokale Einheitenkatalog bewahrt Solar- und Speicher-Einheiten, exakte Inbetriebnahmetage, Betriebsstatus, Leistung, Speicherkapazität und deklarierte Nutzungsart auf. Aktive Solar-Einheiten sind nach Tag, ISO-Woche, Monat und Jahr auswertbar. Aggregationen für alle Orte entstehen aus demselben Export, nicht aus einer handgewählten Städteauswahl.

Speicher: Nutzbare Kapazität kommt aus der verknüpften Speicheranlage. Mehrere verknüpfte Einheiten teilen deren Kapazität, statt sie mehrfach zu zählen. Batterien, Pumpspeicher und andere Technologien bleiben getrennt. Fehlende Kapazität wird nicht zu null erklärt: Anzahl bleibt nutzbar, unvollständige Gesamtkapazität wird nicht als vollständiger Wert veröffentlicht.

Einwohner: neu eingelesenes Gemeindeverzeichnis. Das Feld für das Datum wird vom bestehenden Import aus dem **Gebietsstand** befüllt. Deshalb nennt der Vergleich diese Verzeichnisausgabe ausdrücklich, statt einen nicht belegten Erhebungsstichtag zu behaupten. Vergleichsorte kommen aus derselben Ausgabe. Ein Zubaujahr geteilt durch diese Einwohnerbasis ist kein historischer Pro-Kopf-Wert des damaligen Jahres.

Die Quellenabdeckung ist von der Musterabdeckung zu unterscheiden: Tages- und Wochenreihen erlauben weitere Ansätze, aktuell ist daran die Suche nach klar abgesetzten Höchstwerten angeschlossen. Das behauptet weder vollständige Anomalieerkennung noch statistische Signifikanz.

## Offene Quellen sind kein redaktioneller Prüfauftrag

- Ehemalige veröffentlichte Rangstände sind nicht durch aktuelle Anlagenjahrgänge ersetzbar. Fehlende historische Beobachtungen bleiben fehlend.
- Aktive Anlagen nach Inbetriebnahmedatum sind kein damaliger Gesamtbestand: Stilllegungen und spätere Korrekturen verändern die Rückschau. Auch mit heute vorhandenen inaktiven Einheiten ist ohne historischen Statusverlauf kein beliebiger damaliger Bestand belegt.
- Der gepflegte Förderkatalog und sein dokumentierter Änderungsverlauf sind für alle zugeordneten Orte angeschlossen. Ältere Förderkontexte rund um den Zubau sind zusätzlich für ausgewählte Orte belegt. Eine amtliche Förderhistorie für alle Gemeinden folgt nicht aus dem Registervollabruf.
- Das bestehende Atlas-Jahresertragsmodell ist angeschlossen. Wetterbezogene Erzeugungs- und Erlösstories benötigen zusätzliche Datenverknüpfungen. Registerleistung ist weder gemessene Erzeugung noch Einnahme.
- Die vorhandenen Zensus-Wohnungsdaten sind angeschlossen. Geeignetes Gebäudepotenzial, tatsächlicher privater/gewerblicher Nutzungsanteil und vollständige Projektnamen benötigen jeweils passende Quellen beziehungsweise die zusätzliche Auswertung der erhaltenen Nutzungsangaben.

Solche Quellenlücken gehören in die Abdeckungsübersicht, nicht als „bitte prüfen“-Aufgabe in den Storypool. Der vollständige Registerabruf löst die bisherige künstliche Zeitbegrenzung; er löst nicht automatisch alle Quellenvoraussetzungen des gesamten Redaktionskatalogs.

## Wiederholbarer Ablauf

1. Vollständige Quelle mit Datum lokal einlesen, Ausschlüsse zählen, Einheiten eindeutig halten.
2. Sämtliche Orte und Zeitreihen ableiten. ISO-Wochen vollständig abschließen; die laufende und jüngsten drei abgeschlossenen Monate bleiben als Nachmeldepuffer aus Ereignisvergleichen heraus.
3. Jede angeschlossene Regel ausführen, einschließlich Rückgängen. Kein Top-N-Limit für Städte oder Befunde.
4. Nur identische Aussagen deduplizieren. Aussagen desselben Zeitraums gruppieren, einzelne Evidenz vollständig behalten.
5. Kategorien, Zeitbezüge und Wiederverwendbarkeit zuordnen; keine Neuigkeitsbehauptung beim historischen Erstlauf.
6. Datenlauf samt Regeln und Datenstand lokal speichern; dieselbe Quelle mit denselben Regeln muss denselben Inhalt liefern.
7. Aus dem Pool gemeinsam Visual und Text entwickeln. Ein Muster kann Social-Post, Webteaser, Storydetail und gegebenenfalls aktuelles Widget bedienen.

## Zusätzliche Befunde beim Originalabgleich

- `orts-stories.ts` enthält bereits eine Erlös-Modellrechnung. Sie wird nicht blind übernommen: Die vorhandene Überschrift behauptet zugeflossene Einnahmen, während die Rechnung pauschale Erträge und Einspeiseannahmen verwendet. Außerdem benötigt sie die bisher verwendete Privat-/Gewerbe-Segmentierung. Vor einem automatischen Befund muss daraus eine korrekt benannte Modellrechnung mit passender Eingabebasis werden.
- Die ursprüngliche Wohnformstory behauptet aus Wohnungen einen Dach- beziehungsweise Potenzialanteil. Der neue Anschluss übernimmt nur die tatsächlich gemessene Wohnstruktur.
- Ältere Katalogtexte schließen Rückgänge teilweise aus und vermeiden Bestandsstories wegen Doppelung auf der Seite. Das entspricht nicht mehr dem hier vereinbarten Auftrag: Rückgänge bleiben erhalten; wiederverwendbare Strukturbefunde können als Story oder Widget verwendet werden.
- Die bisherige Ereignisprüfung beginnt ab 2000; frühere Datumsangaben bleiben im vollständigen Einheitenkatalog und den Verlaufsdaten erhalten. Die frühe Reihe enthält sowohl plausible 1990er-Jahrgänge als auch offensichtlichen Klärungsbedarf wie Solar-Inbetriebnahmen von 1900. Das ist eine verbleibende Einschränkung der automatischen Ereignisregeln, keine fehlende Rohdatenabdeckung.

## Lokaler Wiederholungslauf

Reihenfolge für die Entwicklung (alle Ausgaben lokal):

```sh
node scripts/story-source-inputs.mjs
python3 scripts/story-history-local.py
python3 scripts/story-register-detail.py
python3 scripts/story-detail-summaries.py
node --import tsx scripts/story-discovery-run.ts --cities=all --directory=scripts/.cache/story-discovery --output=scripts/.cache/story-discovery-all-v4.json
```

Die beiden Registerleser verwenden das jüngste lokal vorhandene offizielle ZIP. Der Auswertungslauf verwendet dessen abgeleitete Historie; `--history=` erlaubt eine explizite ältere Grundlage. Einwohner-, Förder- und Zensusdaten werden separat gespeichert. Unterschiedliche Kombinationen bekommen unterschiedliche Laufkennungen und überschreiben nicht die gespeicherten Eingaben anderer Kombinationen. Neue Regeln starten eine neue Vergleichsreihe; ein Methodenwechsel zählt nicht als neue Nachricht.

Der lokale Einheitenkatalog enthält außerdem inaktive Einheiten. Die bisher angeschlossenen Zeitreihen und Storyregeln verwenden ausdrücklich den aktiven Bestand. Nutzungsangaben sind erhalten, werden aber noch nicht pauschal in „Privatdach/Gewerbedach“ übersetzt.

## Verifizierter Lauf vom 14. September 2026

- 11,247 Verzeichnisorte durchlaufen; 11.024 Registerorte vollständig zugeordnet, 223 Verzeichnisorte ohne gültig datierte Solar-/Speichereinheiten.
- 6,315,726 aktive Solareinheiten: Summen aus unabhängiger Monatsauswertung stimmen mit Tages- und Wochenreihen überein.
- 4,710,700 Tageswerte und 3,020,809 ISO-Wochenwerte lokal gespeichert.
- 305,118 automatisch zugelassene Beobachtungen verlustfrei in 231,002 Themen gruppiert. Kein Top-N-Limit.
- 8,671 aktuelle Vergleichsrangstände als erste belegte Beobachtungen gespeichert.
- 170 Förderprogramme, 157 Verlaufseinträge und 10.786 Zensus-Ortszeilen eingelesen.
- Trier: 57 Themen / 76 Beobachtungen. Nidda: 38 / 53. Themen sind noch keine ausgearbeiteten Veröffentlichungen.
- 28 gezielte Tests und Typprüfung bestanden; Filter und Matrix im Browser geprüft. Trier und Nidda liefern beim Wiederholungslauf byteidentische Berichte.
