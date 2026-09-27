# Vergleichsregeln für automatisierte Ortsstories

Arbeitsentwurf, 10. September 2026. Geprüft am Zubaupeak Fürfeld. Diese Regeln sind noch keine Änderung des produktiven Suchlaufs.

## Befund am Beispiel

Die aktuelle Monatstabelle bestätigt März–Mai 2025: 6 + 4 + 29 = 39 Steckersolaranlagen. Verfügbar ist eine globale Monatsreihe ab August 2024. Die separate Monatsauswertung nutzt einen rollierenden Horizont von 25 Monaten; ihr Exportdatum wird nicht als eigener belastbarer Quellenstand mitgeliefert. Das Datum des Abrufs und die letzte Tabellenschreibung ersetzen diesen Stand nicht.

Mit reifen Monaten bis einschließlich Mai 2026 entstehen 15 Referenzfenster, die März–Mai 2025 nicht berühren. Werte: 5, 3, 1, 1, 3, 6, 2, 3, 3, 3, 1, 0, 0, 1, 3. Median 3, Spannweite 0–6. Die Zeiträume und alle 22 Monatswerte stehen im Konzept unter „Vergleichszeiträume und Monatswerte“.

Das ist deskriptiv reproduzierbar, aber kein sauberer Nachweis eines ungewöhnlichen Ereignisses relativ zu Saison und Trend. Die Fenster überlappen untereinander; 15 Fenster sind keine 15 unabhängigen Beobachtungen. Frühere und spätere Zeiträume werden gemischt. Ein Vergleich mit März–Mai 2024 ist unmöglich, weil diese Monate fehlen. Für die Veröffentlichung deshalb Verlauf zeigen, keinen „Normalwert“ und keine Signifikanz behaupten.

## Verbindlicher Vergleichsvertrag für neue Templates

- **Messgegenstand:** Anlage oder Leistung, Segment, Betriebsstatus und Gebiet explizit festlegen. Die aktuelle Auswertung zählt weiterhin in Betrieb befindliche Anlagen nach Inbetriebnahmedatum, nicht alle jemals erfolgten Netzanschlüsse und nicht Kaufentscheidungen.
- **Zeitraum:** Anfang, Ende, Zeitzone und Vollständigkeit nennen. Unvollständige Wochen/Jahre nicht mit vollständigen vergleichen. Kalenderwochen einschließlich ISO-Jahr, Schaltjahre und gleiche Tageslängen berücksichtigen.
- **Referenz:** Exakte Zeiträume, Anzahl, Ausschlüsse, Aggregation und ungerundete Werte speichern. „Durchschnitt“ nur für das tatsächlich berechnete Mittel; Median auch so nennen.
- **Null versus fehlend:** Null nur innerhalb einer nachweislich abgedeckten Reihe. Fehlende Abdeckung bleibt fehlend. Bei Nullreferenz keine Division durch einen künstlich eingesetzten Wert als Faktor veröffentlichen.
- **Datenstand:** Quelle, Exportdatum, Importdatum, Abfragezeit und Methodenfassung getrennt. Alle Vergleichswerte müssen aus kompatiblen Ständen stammen. Ein späterer Import darf eine bereits veröffentlichte Ausgabe nicht still verändern.
- **Reife:** Nachmeldungen explizit berücksichtigen. Eine Karenz allein macht Daten nicht vollständig; empirische Nachmeldequoten nicht ungeprüft von einer früheren Stichprobe auf jeden Ort übertragen.

## Geeignete Vergleiche

Für laufende Zubau-Meldungen zuerst derselbe abgeschlossene Kalenderzeitraum im Vorjahr. Bei mehr Historie dieselben Kalendermonate der vergangenen Jahre nebeneinander zeigen; Anzahl der Jahre nennen. Das kontrolliert die Jahreszeit teilweise, ersetzt aber kein Trendmodell. Kein Fünfjahresvergleich ohne fünf Jahre Daten. Für lokale Tageswerte ist Anlagenzubau meist zu dünn; Monats-/Quartalswerte vorziehen. Wetterabhängige Erzeugungsvergleiche brauchen zusätzlich Angaben zu Wetter, installierter Leistung und Modell, sonst werden unterschiedliche Ursachen vermischt.

Ortsvergleiche: gleiche Kennzahl, Zeit, Größenklasse und Abdeckung. Eigene absolute Menge neben dem Pro-Kopf-Wert. Gesamtes Vergleichsfeld und Fallzahl dokumentieren. Bei Rangwechseln identische Gruppenmitglieder und Regeln oder ausdrücklich einen Gruppenwechsel statt Leistungsverbesserung melden.

Auffälligkeiten: automatischer Suchlauf darf Kandidaten vorschlagen. Bei vielen geprüften Orten und Fenstern entstehen zwangsläufig extreme Treffer; ein großer Faktor ist kein Signifikanztest. Für statistische Behauptungen wäre ein validiertes Modell mit Saison, Trend, Abhängigkeiten und Berücksichtigung der vielen Suchtests nötig. Für den ersten Release genügt eine ehrliche deskriptive Aussage plus Verlauf. Zeitreihen brauchen gerade wegen Saison und Abhängigkeiten besondere Behandlung; siehe [NIST: Zeitreihen](https://www.itl.nist.gov/div898/handbook/pmc/section4/pmc4.htm) und [Saison](https://www.itl.nist.gov/div898/handbook/pmc/section4/pmc443.htm).

Förderprogramm und Peak: zeitliches Zusammenfallen ist ein Anlass zur Recherche, kein Wirkungsnachweis. Beginn, Gebiet, Fördergegenstand und erwartbare Verzögerung prüfen; ohne weitergehende Belege „während“, nicht „wegen“. Das Nichtfinden eines Programms beweist nicht, dass keines existiert. Auch Abstieg und Rückgang sachlich darstellen, wenn der Vergleich belastbar ist.

## Vor automatischer Übernahme noch am Suchlauf zu korrigieren

Beim aktuellen Code-Lesen gefunden, noch nicht produktiv geändert:

1. Der Dreimonatslauf bricht beim ersten qualifizierten Fenster ab, obwohl der Kommentar den stärksten Ausschlag verspricht. Auswahlregel und Aussage müssen übereinstimmen.
2. Nullmediane werden für den Faktor intern auf eins angehoben. Dieser Suchscore darf nicht als realer Vergleichsfaktor im Text landen.
3. Die globale vorhandene Monatsliste wird verwendet. Bei einer echten Lücke im Gesamtbestand dürfen drei Listeneinträge nicht als drei aufeinanderfolgende Monate gelten.
4. Der Fund speichert nicht die vollständigen Referenzfenster und deren Abdeckung. Diese Provenienz muss beim Fund mitgespeichert werden; eine spätere Rekonstruktion ist schwächer.
5. Die Regeln „nur nach oben“ und „bekannte Förderung ausschließen“ passen nicht mehr vollständig zum gewünschten Produkt. Änderungen daran brauchen klare Auswahlregeln, keine stillen Ausnahmen im Text.

Gegenprüfungen vor automatischer Veröffentlichung: reine Saison ohne Zusatzsignal, stetiger Trend, viele Nullmonate, fehlender Monat, späte Nachmeldung, Änderung der Gruppenmitglieder, gleichzeitige Förderung ohne Wirkungsbeleg. Die neue Vorschau ändert bewusst nur Darstellung und Einordnung, nicht diese produktive Auswahl.
