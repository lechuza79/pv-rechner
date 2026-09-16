# Kontaktprüfung: verbindlicher Ablauf für den gesamten Bestand

Ziel: belegte, passende Kontakte für jede Organisation, nachvollziehbarer Vergleich
zum bisherigen Bestand und vollständige Änderungskontrolle vor jedem Versand.
Kommunen zuerst; derselbe Ablauf gilt für Presse, Handwerk und Versorger mit jeweils
eigenen Rollen. Die alten 289 Anschriften bestimmen weder Umfang noch Reihenfolge.

## Was übernommen wird

Der eingefrorene Quellenlauf, Originaldateien samt Beobachtungszeit und Hash,
Browser-/PDF-Belege, Nachrecherchen und frühere Einzelurteile bleiben bestehen.
Laufsteuerung und lokale Aufbereitung sind Hilfsdienste. Ihre fertigen Datensätze
sind keine abgeschlossenen Kontaktprüfungen. Der neue lokale Workflow führt alle
Organisationen und bestehende Prüfbelege zusammen, ohne frühere Urteile umzudeuten.

## Ein verbindlicher Zustand je Organisation

Fünf Fragen müssen belegt beantwortet sein:

1. **Identität:** Gehört die Quelle zur Gemeinde oder ihrer zuständigen Verwaltung?
2. **Suchabdeckung:** Wurden Gemeindeseite, Kontakt-/Mitarbeiterverzeichnis und
   Impressum untersucht, veröffentlichte zuständige Verwaltungsangebote verfolgt
   und unlesbare/fehlgeleitete Quellen nachrecherchiert?
3. **Zuständigkeit:** Welche Person oder Stelle gehört zu welcher Adresse, für
   welchen Veröffentlichungsweg oder fachlichen Zweck? Allgemeine Amtsadressen,
   Dienstleister und historische Ansprechpartner bleiben unterscheidbar.
4. **Widersprüche:** Sind abweichende Namen, Kontaktkarten, Rollen und Adressen
   aufgelöst? Gleiche Originalbelege dürfen wiederverwendet werden; Zuständigkeit
   für eine weitere Kommune muss dennoch belegt sein.
5. **Ausschlüsse:** Sind Sperren, unpassende Zwecke und erkennbare Einschränkungen
   dokumentiert? Die spätere Prüfung der tatsächlichen Versandhistorie bleibt
   zusätzlich zwingend.

Ergebnisse sind **passender Fach-/Veröffentlichungskontakt**, **allgemeiner
Kontakt** oder **konkret ungeklärt**. Ein ungeklärtes Ergebnis braucht einen
belegten offenen Prüfschritt. Es ist ein dokumentiertes Urteil, keine positive
Kontaktbestätigung. Eine vollständige Internetsuche und Zustellbarkeit werden
nicht behauptet. Weitere gefundene relevante Links öffnen die Suche wieder.

Ein Prüfer übernimmt eine zeitlich begrenzte Aufgabe. Eine abgebrochene Aufgabe
wird nach Ablauf wieder verfügbar. Die Entscheidung ist an die exakte Version
von Eingaben, Quellenbeobachtungen und bisherigen Befunden gebunden. Neue Belege
oder geänderte Originalbytes machen eine bisherige Freigabe ungültig. Entscheidungen
werden historisiert. Automatische Extraktion kann die fünf Prüfungen nicht bestehen.

## Lokale Ausführung

Alle Aktionen außer `refresh` arbeiten ohne Netzwerkzugriff.

`scripts/contact-workflow.ts --source=<Erhebung> --output=<privater Workflow>`:

- `--action=sync`: alle Datensätze einlesen, Revisionen vergleichen, gemeinsame
  Aufgabenliste und Gesamtauswertung aktualisieren. Unabhängige Erhebungen bleiben
  unverändert. Keine Kontaktadresse wird in die Produktdatenbank geschrieben.
- `--action=claim --worker=<Prüfer> [--id=<Organisation>]`: exklusive Aufgabe für
  30 Minuten übernehmen. Andere Prüfer bearbeiten andere Organisationen.
- `--action=packet --id=<Organisation>`: Originalintegrität prüfen und lokale
  Prüfakte samt leerer Entscheidungsvorlage erzeugen. Die Akte wird nicht übertragen.
- `--action=submit --id=<Organisation> --decision=<Datei> --lease-token=<Token>`:
  persönliche Entscheidung mit Belegen einreichen. Fehlende Fragen, erfundene
  Adressen, veränderte Belege oder abgelaufene Aufgabenübernahme werden abgewiesen.
- `--action=preflight --batch=<Datei>`: jeden vorgesehenen Empfänger prüfen;
  fehlende oder geänderte Belege, Wiederholungen, geteilte Postfächer und fehlende
  aktuelle Änderungskontrolle blockieren den gesamten Batch. Kein Versand.

Die Änderungskontrolle muss höchstens 24 Stunden alt sein, nach der Entscheidung
liegen und sowohl erneute Suche als auch Quellen, Ausschlüsse und bisherige
Sendungen umfassen. Allgemeine Kontakte brauchen eine ausdrückliche Auswahl im
Batch. Ein bestandenes technisches Gate ist keine eigenständige Versandbeauftragung.
Der tatsächliche Kommunenversand verlangt `--contact-workflow=<Verzeichnis>` und
`--contact-batch=<Datei>` und führt die Kontrolle selbst vor dem Aufbau der
Mailverbindung aus. Ein alter gespeicherter Erfolgsbericht genügt nicht. Bereits
im Ausgangsbestand zurückgestellte Adressen bleiben gesperrt. Die vorhandene
Datenbankprüfung unmittelbar vor jeder Mail bleibt zusätzlich aktiv.

`--action=refresh --batch=<Plan> --refreshed-batch=<neue Datei>` ruft die
Belegquellen erneut ab und speichert Antwortbytes, Zeitpunkt, Zieladresse und
Vergleich lokal. Fehlgeschlagene Abrufe, andere Weiterleitungen und jede Änderung
bleiben gesperrt. Auch ein nachträglich gesetztes „unverändert“ reicht ohne passende
Originalbelege nicht. Ein Prüfer muss zusätzlich die Suchabdeckung und aktuelle
Ausschlüsse bestätigen und sich namentlich zuordnen. Die Neuabrufe allein erteilen
keine Freigabe. Browserbelege brauchen weiterhin einen erneuten Browservergleich;
der normale HTTP-Abruf kann sie nicht ersetzen.

PDF-Kontakte verwenden die bestehende Prüfung einer konkret benannten Seite und
Kontaktzeile: Originaldatei, Beobachtung, Ausschnitt, Zitat und begründete Zuordnung
müssen zusammenpassen. Ein pauschaler PDF-Textfund genügt nicht. Nicht auslesbare
Scans bleiben offen. Ein fehlgeschlagener Neuabruf sperrt auch ältere Batch-Prüfungen
derselben Fallversion; neue Belege und eine neue Entscheidung sind erforderlich.

## Messung und Lernen

Die Übersicht nennt die gesamte Population, Kommunen und Kreise getrennt,
Quellenstände, vorhandene ältere Befunde, neu abgeschlossene Entscheidungen,
Fachkontakte, allgemeine Kontakte, ungeklärte Fälle und entwertete Entscheidungen.
Postfächer und Zuordnungen werden getrennt gezählt. Neue und erhaltene belegte
Adressen werden gegen den eingefrorenen Ausgangsbestand verglichen. Ungeprüfte
Funde sind keine Qualitätsgewinne. Rollenverbesserungen brauchen einen belegten
alten und neuen Rollenstand; reine Neuzuordnung ist kein Mengenwachstum.

Antworten, Weiterleitungen, Presseverteilung, eigene Veröffentlichungen, Besuche
und bestätigte/ausstehende Abonnements bleiben getrennte Ergebnisarten. Bestehende
Auswertung: `scripts/outreach-evaluation.ts`, `lib/outreach-evaluation.ts` und
`lib/outreach-subscriptions.ts`. Sie werden lokal nach tatsächlichem Versanddatum
und Empfänger zugeordnet. Ein Abo oder Besuch allein beweist keine Veröffentlichung
oder Kausalität. Diese Erkenntnisse verbessern Rollenprioritäten und Gegenbeispiele,
ersetzen aber niemals die Quellenprüfung einer anderen Organisation.

## Umsetzung und Abschlusskriterien

Zuerst gemeinsame Steuerung und Gegenprüfungen, dann tatsächlicher Import aller
Datensätze und belegter Pilot einschließlich negativer Fälle. Danach die gemeinsame
Aufgabenliste abarbeiten; Rückstände und Durchsatz statt nur Abrufzahlen berichten.
Änderungen der Suche werden an Originalen erneut ausgewertet, gute Kontakte müssen
erhalten bleiben und bekannte Fehlzuordnungen ausscheiden. Parallele Arbeiten
liefern in dieselbe Liste. Vollständiger Abschluss erst mit einem belegten Urteil
für jede Organisation und veröffentlichtem Gesamtvergleich einschließlich Lücken.

Vollständige Quellen, Kontakte, Analysedaten und Abonnements bleiben lokal. Kein
Cloud-Aktenprüfer, kein anderer Anbieter als Ausweichweg. Nur erforderliche
Quellenausschnitte werden zur persönlichen Prüfung in dieser Aufgabe gelesen.
