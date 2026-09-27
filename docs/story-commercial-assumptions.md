# Gewerbliche Stromwerte: Cluster und erste Sensitivitätsannahmen

Stand: 18.09.2026. Lokaler Entwurf, noch keine Änderung der veröffentlichten Kennzahlen.

## Beleg und Nutzung getrennt halten

1. Gemeldete Volleinspeisung überstimmt jede Verbrauchsannahme: Eigenverbrauch null.
2. Gemeldete Gebäudenutzung trennt Industrie, Landwirtschaft, Handel/Dienstleistungen,
   öffentliche Gebäude und sonstige Nutzung. Unbekannt bleibt unbekannt.
3. Supermarkt, Lager und Büro sind Untergruppen nach geprüfter Standortnutzung.
   Treffer im Anlagennamen erzeugen nur einen Prüfhinweis. Firmenname, Rechtsform
   oder Anlagengröße allein dürfen keinen Stromverbrauch behaupten. Ein Dach kann
   einem Vermieter gehören, die Anlage einem Investor, der Verbrauch einem Mieter.
4. Eine Freifläche ohne gemeldete Volleinspeisung bleibt gesondert: Die Bauform ist
   kein Beleg dafür, dass kein Betrieb ihren Strom selbst nutzt.

## Erste Szenarien

Anteile beziehen sich auf den erzeugten PV-Strom, nicht auf den Betriebsverbrauch.
Die folgenden Werte sind bewusst gewählte Rechenszenarien, keine Messwerte,
keine statistischen Konfidenzintervalle und keine aus der HTW-Studie übernommenen Quoten.
Die mittlere Spalte ist kein automatisch freigegebener Schätzwert.

| Cluster | niedriger / mittlerer / hoher Eigenverbrauch | Profilannahme |
| --- | --- | --- |
| Produktion / Industrie | 30 / 60 / 90 % | Werktäglicher Tagesbetrieb; Schichten unbekannt |
| Landwirtschaft | 15 / 40 / 75 % | Große Unterschiede zwischen Tierhaltung, Ackerbau und Trocknung |
| Lebensmittelhandel, Standort geprüft | 40 / 65 / 90 % | Tagesbetrieb plus Kühlgrundlast |
| Lager / Logistik, Standort geprüft | 10 / 30 / 65 % | Tagesbetrieb; Kühlung und Fahrzeugladung offen |
| Büro / Verwaltung, Standort geprüft | 25 / 50 / 75 % | Werktage tagsüber, weniger Wochenendbedarf |
| Öffentliche Gebäude | 15 / 45 / 80 % | Schulen, Kliniken und Verwaltung nicht gleichsetzen |
| Unspezifische oder unbekannte Nutzung | 0 / 50 / 100 % | Vollständige Sensitivität, keine belastbare Quote |
| Freifläche ohne gemeldete Volleinspeisung | 0 / 25 / 100 % | Nutzungsmodell ungeklärt |
| Gemeldete Volleinspeisung | 0 / 0 / 0 % | Registerangabe |

Diese Jahresannahmen sind noch keine monatlichen Lastprofile. Besonders Ferien,
Wochenenden, saisonale Landwirtschaft und das Verhältnis von Verbrauch zu PV-Größe
können die Ergebnisse verändern. Die Szenarien garantieren keine wahre Unter-/Obergrenze.

## Bewertung

Der Szenarienrechner erhält Ertrag, Vergütung und den vermiedenen Arbeitspreis
explizit. Er übernimmt keinen Haushaltsstrompreis für Gewerbe. Feste Grund- oder
Leistungspreise gelten nicht automatisch als vermiedene Kosten. Eigenverbrauch
und Einspeisung müssen zusammen immer den Ertrag ergeben. Höherer Eigenverbrauch
kann bei alten hohen Vergütungssätzen sogar weniger Geld bedeuten; Min/Max werden
nach dem Ergebnis bestimmt, nicht anhand einer angenommenen Reihenfolge.

Nicht ohne weitere Grundlage umstellen: Die amtliche Nutzungsgruppe erklärt nicht
den Jahresverbrauch. Zur Übernahme eines mittleren Werts brauchen wir belastbare
Verbrauchsrelationen oder eine ausgewiesene, geprüfte Modellkonvention und einen
passenden Gewerbe-Arbeitspreis. Bis dahin sind die Ergebnisse ein getrenntes
Sensitivitätsszenario; bestehende Storywerte werden nicht stillschweigend geändert.

## Fachliche Quellen und konkrete Grenzen

- HTW Berlin, PV im Gewerbe: https://solar.htw-berlin.de/themen/pv-im-gewerbe/
- HTW Berlin, PV-Wegweiser, April 2021, Kapitel 6.1, gedruckte Seiten 32–38:
  https://solar.htw-berlin.de/wp-content/uploads/HTW-PV-Wegweiser.pdf

Die HTW analysiert Direktverbrauch in Abhängigkeit von PV-Leistung und Jahresverbrauch.
Büro/Einzelhandel zeigen regelmäßigere Profile, industrielle Nutzungen eine größere
Streuung. Daraus folgen die getrennten Gruppen und die Notwendigkeit einer
Verbrauchsrelation; die oben gewählten Prozentsätze sind keine HTW-Ergebnisse.
Historische Preise und Rechtsangaben dieser Studie werden nicht übernommen.

## Auswertung und Wiederholung

`scripts/story-commercial-cluster-audit.py` liest den vollständigen lokalen Export
und schreibt `scripts/.cache/story-commercial-clusters/audit.json`.
Gezählt werden aktive Einheiten mit positiver Leistung; private Dächer und Balkon
werden ausgeschlossen. Standort-Prüfhinweise sind Teilmengen des Handelsclusters,
keine zusätzlichen Anlagen. Gegenwärtiger Registerstand, keine Rekonstruktion des
historischen Betriebsstatus. Das Ergebnis enthält auch die gemeldete Einspeisungsart.

Zentrale Cluster/Szenarien: `lib/story-commercial-clusters.ts`.
Tests prüfen Volleinspeiser, widersprüchliche Namenshinweise, Teil-Einspeisung bei
Freiflächen, Energieerhaltung und die umgekehrte Wertreihenfolge bei hohen Alttarifen.

## Ergebnis des vollständigen Exportlaufs

1,074,512 aktive positive Registereinheiten außerhalb gemeldeter Haushaltsdächer und Balkonanlagen ausgewertet.

- agriculture: 296,769 Einheiten, davon 204,588 Voll-, 90,824 Teileinspeiser und 1,357 ohne Angabe.
- commerce-unspecified: 293,662 Einheiten, davon 124,408 Voll-, 167,902 Teileinspeiser und 1,352 ohne Angabe.
- unknown-use: 230,694 Einheiten, davon 68,856 Voll-, 158,809 Teileinspeiser und 3,029 ohne Angabe.
- other-use: 150,148 Einheiten, davon 63,338 Voll-, 86,064 Teileinspeiser und 746 ohne Angabe.
- ground-mounted: 19,655 Einheiten, davon 15,798 Voll-, 3,741 Teileinspeiser und 116 ohne Angabe.
- industry: 29,606 Einheiten, davon 12,644 Voll-, 16,802 Teileinspeiser und 160 ohne Angabe.
- public-building: 53,978 Einheiten, davon 26,940 Voll-, 26,735 Teileinspeiser und 303 ohne Angabe.

Nur 76 Lebensmittelhandels-Hinweise über eindeutige Standortbegriffe; dies ist keine Vollständigkeitszahl für Supermärkte. 2.795 Lager- und 1.349 Bürohinweise. Betreiberzuordnung und Standortprüfung stehen für diese Untergruppen noch aus.
