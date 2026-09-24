# Kommunale Charts und Stories

## Gemeinsame Grundlage, unterschiedliche Aufgaben

Charts zeigen den neuesten vollständig verfügbaren Datenstand sofort. Eine Story hält einen benannten Zeitraum samt Quellenstand fest und ordnet ihn ein. Veröffentlichung und Datenaktualisierung sind getrennt; Daten werden niemals für einen redaktionellen Termin zurückgehalten.

| Bestehendes Template | Dauerhafter Einsatz | Eigenständige Story |
| --- | --- | --- |
| Zubau-Verlauf | Monatsreihe, Anlagen/Leistung umschaltbar | Monatsrückblick mit Einordnung: welche Anlagen tragen den Zubau? |
| Solar-Monatsradial | Stundenprofile des abgeschlossenen Monats, Tagesauswahl | Besonderer Verlauf oder verständlicher Monatsrückblick |
| Solar/Wind-Jahresradial | Letztes vollständiges Jahr | Jahresrückblick, kein monatliches Wiederholen |
| Stromwert und Einspeisevergütung | Zwei klar getrennte Kennzahlen samt Annahmen | Mit Erzeugungsrückblick bündeln, nicht zwei zusätzliche Meldungen |
| Anteilsdonut | Aktueller Anlagenmix | Wesentliche Strukturänderung oder erstmalige Einordnung |
| Anlagenraster plus Leistungsanteil | Verteilung von Anzahl und Leistung | Auffälliger Gegensatz, nicht jede Kategorie als monatliche Meldung |
| Vergleichssäulen | Ergänzende Ansicht beim Zubau | Relevante Veränderung; keine Serie beliebiger historischer Paare |
| Zehnjähriger Ertragsvergleich | Kontext in einer Rekordstory | Echter lokaler Rekord/Ausreißer |
| Rangstory | Vollständige filterbare Rangtabelle bleibt eigenes Widget | Relevante Topplatzierungen gemeinsam; keine Story pro Filterkombination |
| Vergleichsumrisse | Noch kein passender Standardfall | Nur geeignete Flächen-/Ortsvergleiche, keine Anlagenanteile als Gemeindefläche |
| Förderung | Aktuelle Programme im Förderbereich | Start, Ende oder wesentliche tatsächliche Änderung zeitnah |

## Redaktioneller Rhythmus

Keine Pflichtzahl an Posts. Zubaurückblick und Erzeugung/Wert können zeitversetzt erscheinen, wenn sie eigene Einordnung enthalten. Rangänderungen und Ereignisse kommen anlassbezogen dazu. Ein bereits sichtbarer Wert wird nicht allein durch spätere Veröffentlichung zur Neuigkeit. Höchstens eine geplante Story pro Woche ist eine redaktionelle Leitlinie, kein aktiver Scheduler; aktuelle Ereignisse nicht verzögern. Einmalige Start-Einordnungen nicht jeden Monat wiederholen.

## Umsetzung und Grenzen

`MUNICIPAL_CHART_POLICY` ist die zentrale Zuordnung. `municipalChartsFromReport` liest alle geprüften Beobachtungen des aktuellen Ortsreports, nicht die fünf Vorschau-Stories, Veröffentlichungen oder eine Highlight-Auswahl. Die bestehende Concept-Struktur dient vorerst als Datenadapter, nicht als Beleg einer Veröffentlichung. Je Template wird der aktuelle Stand verwendet; Strukturkategorien bleiben unterscheidbar. Fehlende vorbereitete Daten werden als Verfügbarkeit zurückgegeben und nicht durch Null ersetzt.

`MunicipalChart` rendert dieselben zentralen Templates für die permanente Ansicht und Story-Snapshots; klein/groß und Autoplay sind Optionen. Die kommunale Seite bleibt Eigentümer von Layout, Abschnittsnavigation und Sichtbarkeitssteuerung. Die vorhandenen Interaktionen bleiben erhalten. Allgemeine Monats-/Jahresauswahl ist noch nicht implementiert: Sie darf erst verfügbare historische Datensätze anbieten. Der lokale Admin-Endpunkt `/api/admin/municipal-charts?city=…` liefert den vollständigen aktuellen Chartkatalog mit Quellenstand und Verfügbarkeit; kein öffentlicher Produktionsfeed.

Storyeditionen müssen ihren gespeicherten Datenstand behalten. Neue Daten erzeugen weder automatisch eine Veröffentlichung noch überschreiben sie eine alte Edition. Eine zukünftige Veröffentlichungsplanung braucht eigene Veröffentlichungstermine, Relevanzentscheidung und Dublettenprüfung; sie ist mit dieser Zuordnung nicht automatisch aktiv.
