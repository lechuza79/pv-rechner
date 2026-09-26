# Storypool: Abgleich mit dem ursprünglichen Redaktionssystem

## Trennung der Dimensionen

Die Originalfamilien in `lib/redaktionsplan.ts` mischen Themen, Perspektiven und Anlässe. Deshalb bleiben mehrere Inhaltskategorien je Befund möglich. Eine Balkonkraftwerk-Monatsspitze gehört gleichzeitig zu Balkon, Zubau und Auffälligkeiten. Sie wird dadurch nicht dreimal zu einer Geschichte.

Der Zeitbezug wird separat zugeordnet:

- **Momentaufnahme:** Bestand, Größenverteilung, Wohnstruktur, modellierter Jahresertrag und Ortsvergleich zu einem benannten Stand oder Bezugsjahr.
- **Ereignis:** dokumentierte Förder- oder Rangänderung sowie Inbetriebnahme einer kleinen Zahl leistungsstarker Registereinheiten. Das Alter allein macht ein Ereignis nicht zusätzlich zum Rückblick.
- **Rückblick:** Jahresvergleiche, Tages-/Wochen-/Monatshöchstwerte, Jahreshöchstwerte und längerfristige Entwicklungen. Diese Befunde beschreiben eine historische Periode; sie beweisen nicht, dass gerade etwas Neues passiert ist.

**Wiederverwendbar (Evergreen)** ist eine zusätzliche Eigenschaft eines Musters. Die dargestellten Zahlen bleiben an ihren Stand gebunden. Ein neues Registerexportdatum erzeugt keine neue Storyidentität. Ein tatsächlich neuer Zensusstichtag dagegen ist eine neue Momentaufnahme.

Die alte Kategorie `evergreen | snapshot | event` bleibt nur als Kompatibilitätsfeld bestehen. Für Filter und redaktionelle Entscheidungen gelten `categories`, `timeAspects` und `evergreen` getrennt.

## Berichtigte Zuordnungen

- Wohnstruktur ist nicht Familie G15 „Was nicht gebaut wurde“: Wohnungen belegen kein ungenutztes Dachpotenzial. Sie erhält eine eigene Kategorie.
- Jahresertrag als Modell ist nicht G1 „Puls“, der Bestand und aktuelles Wetter benötigt. Modelle erhalten eine eigene Kategorie.
- Speicherbestand ist kein Größen-/Jahrgangsvergleich allein: Speicher erhalten eine eigene Kategorie, beim Speicherzubau zusätzlich Zubau.
- Unbekannte neue Befundfamilien bleiben sichtbar und werden als nicht zugeordnet ausgewiesen. Sie werden weder still als Zubau bezeichnet noch verworfen. Der Abdeckungstest muss solche Fälle melden.

## Erhaltung und Neuheit

Alle belastbaren Eingangsbefunde bleiben in den Themen erhalten. Gruppiert wird nach Messbereich, Zeitbezug und tatsächlicher Periode, nicht nach einem Jahresbudget oder einer Maximalzahl. Messgrößen desselben Zeitraums können gemeinsam betrachtet werden; unterschiedliche Monate bleiben getrennt.

„Neu im Datenlauf“ bedeutet eine neu erkannte Beobachtung, nicht eine neue Veröffentlichung oder aktuelle Nachricht. Ein Erstimport ist nicht neu. Vorberichte müssen dieselbe Gemeinde und dieselbe Regelversion betreffen. Für gespeicherte Vorläufe werden stabile Befundidentitäten verwendet. Alte reine ID-Listen werden unterstützt, ersetzen aber keine vollständige Versionshistorie.

## Grenzen dieses Schritts

Diese Zuordnung beweist weder die vollständige Erkennungsabdeckung aller ursprünglichen Familien noch die statistische Güte der Erkennungsregeln. Familien wie Geld, aktueller Puls, Mythos, Service und Preis benötigen ihre jeweiligen Daten- oder Redaktionseingaben. Der Anschluss an die Gestaltung, die Historisierung veröffentlichter Stories und die automatische Wiederholung des Datenlaufs liegen außerhalb dieser Pool-Komponente.

## Geprüft

Gegenproben: getrennte historische Monate; Erhaltung beider Messgrößen im selben Thema; erstmaliger Import nicht neu; neue Exportstempel/aktualisierte Bestandswerte nicht neu; andere Gemeinde als Vorbericht unzulässig; Ereignis nicht automatisch Rückblick; Wohnstruktur kein ungebautes Potenzial; unbekannte Familie bleibt sichtbar.

## Alter Fundvorrat und Nachberechnung

`social_funde` enthält Sätze, Werte, Grundlage und letzte Sichtung, aber keinen belastbaren Quellenstand, keine strukturierte Bezugsperiode und keine eindeutigen Gemeindeschlüssel. Eine neue Lesung dieser Tabelle macht die alten Angaben nicht aktuell. Der konservative Adapter `story-legacy-adapter.ts` übernimmt daher nur explizit nachgerechnete Originalfunde mit Quellenstand, Periode, aufgelöster Gemeinde und echten Einheiten. Nicht angeschlossene Voraussetzungen sind Datenlücken und erzeugen keine manuellen Prüftickets. Der Adapter ist nicht als zweite aktive Pipeline vorgesehen.

Der direkte Nachberechnungslauf `story-original-patterns.ts` entwickelt kommunale Entsprechungen der Originalmuster. Das ist nicht durchgehend eine identische Neuauflage: Der ursprüngliche Gruppen-Kontrast wird beispielsweise durch einen ausdrücklich ausgewählten Vergleichsort ergänzt; Wohnform wird durch eine Verhältniszahl aus Gebäude-Solarleistung und Wohnungen ergänzt. Die Matrix darf diese Entsprechungen nicht als vollständige Prüfung aller ursprünglichen Aussagen ausgeben.

## Förderbestand

Bestehende Programme sind Momentaufnahmen, keine Neuigkeiten über einen Förderbeginn. Grundlage ist ausschließlich `last_verified` mit dem bestätigten Quellenlink, niemals der letzte Datenbank-Schreibzeitpunkt. Spätere unbestätigte Seitenänderungen verhindern die Übernahme als bestätigten Programmbestand; bereits belegte historische Änderungen bleiben erhalten. Fördersätze und Bedingungen werden als Originaltexte einschließlich ihrer Technikzuordnung übernommen, nicht in unvollständige Diagrammzahlen zerlegt.

Die tatsächlich gespeicherte Ebene `landkreis` und der frühere Alias `kreis` werden berücksichtigt. Entscheidend bleibt der Gemeindeschlüssel: Das Programm des Landkreises Trier-Saarburg gehört nicht zur kreisfreien Stadt Trier. Im gelesenen Katalog hat sich Niddas Quellenseite nach der letzten Bestätigung geändert; sein aktueller Programmbestand ist daher noch nicht bestätigt. Das ist eine konkrete Quellenlücke, kein fehlendes Storytemplate.
