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

## Grundgesamtheit unabhängig abgleichen

Die Kontaktliste ist nicht selbst der Nachweis, dass alle Gemeinden vorkommen.
Eine lokale `population-reference.json` verweist deshalb mit Dateihash und
Beobachtungszeit auf den unabhängigen Regionsbestand. `sync` vergleicht dessen
Gemeinden mit der Kontaktliste und schreibt `population-gaps.json`. Fehlende oder
unerwartete Kennungen müssen sachlich geklärt werden: tatsächliche Lücke,
Zusammenschluss oder veralteter Registereintrag. Ohne Referenzabgleich gibt es
keine Gesamtfertigmeldung, auch wenn jede vorhandene Zeile geprüft wäre.
Der gespeicherte Abgleich vom 14.09.2026 enthält 28 fehlende Kennungen. Deren
heutiger Verwaltungsstatus ist noch zu verifizieren; sie werden nicht still entfernt.

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


## Automatischer Vollbestand statt Pflicht zur manuellen Vollakte

Der amtlich abgeglichene aktive Umfang steht lokal in
`workflow/current-municipal-scope.json`. Historische Kennungen und gemeindefreie
Gebiete bleiben als Herkunft erhalten; aktive Gemeinden werden genau einmal
ausgewertet. Eine abweichende Inventarkennung braucht einen amtlichen eindeutigen
Nachfolgebeleg. Aufgeteilte Gemeinden erlauben keine automatische Kontaktübernahme.

`scripts/contact-automatic-review.ts --source=<Erhebung>` prüft sämtliche aktiven
Fälle lokal, ohne Netzwerk, Modellaufrufe oder Produktdatenänderungen. Mit
`--partition=0 --partitions=2` und der zweiten Partition können disjunkte Teile
parallel laufen. `--action=summarize` zählt ausschließlich zum aktuellen Regel- und
Quellenumfang passende Ergebnisse. Jeder Fall hat Originalbelege, einzeln geprüfte
Kontakte und konkrete Nachrechercheaufträge. Originalbeleg, explizit belegte Funktion
und abgeschlossene Suche sind unterschiedliche Aussagen.

Persönliche dienstliche Adressen und Funktionspostfächer werden nach denselben
Quellenbelegen geprüft. Ein Funktionswort im Postfachnamen genügt nicht. Explizite
Kontaktkarten eines Fachbereichs dürfen dessen Zuständigkeit übernehmen; allgemeine
Footer, Nachrichtenüberschriften und mehrdeutige Personenkarten nicht. Energie/Klima
und Presse bleiben getrennte, gleichzeitig speicherbare Kontaktwege.

Gemeinsame Verwaltungen sind reguläre Ansprechpartner. Der belegte Behördenname
bleibt erhalten; die Zuständigkeit wird nicht ohne eigenen Nachweis auf alle
Mitgliedsgemeinden übertragen. Vorhandene vollständige Einzelentscheidungen bleiben
revisionsgebunden erhalten.

Nicht gelesene veröffentlichte Kontaktlinks, dynamische Verzeichnisse, PDF-/Browser-
Belege und fehlende Quellen bleiben konkrete Arbeitsaufträge. Auch bei offener Suche
bleiben belegte Einzelkontakte erhalten. `evaluationComplete` bedeutet, dass dieser
Datensatz mit allen gespeicherten Beobachtungen maschinell ausgewertet wurde; es
ist keine behauptete vollständige Internetsuche. Alte Einzelurteile werden weder
umetikettiert noch durch automatische Kandidaten überschrieben. Die bestehende
Versandprüfung bleibt zusätzlich erforderlich und wird durch diesen Lauf nicht
ausgehebelt.

Ausgaben liegen unter `workflow/automatic/`: `records/` je aktive Gemeinde,
`sources/` als versionsgebundener lokaler Extraktionscache, `progress-*.json` je
Partition sowie `summary.json` und `queue.json` nach Zusammenfassung. Wiederholungen
prüfen Originalintegrität erneut; identische Quellen müssen nicht erneut geparst
werden. Abgebrochene Läufe können mit derselben Partition wieder gestartet werden.


## Verbindlicher Alt-neu-Vergleich vor Versand

Die korrigierte Auswahl kann mit `--output=<separater Ordner>` und
`--reuse-runtime=<eingefrorene Laufzeit>` unveränderte Extraktionen wiederverwenden.
Parser-Dateien müssen dabei identisch sein; Rollen werden neu geprüft. `--ids=`
erlaubt gezielte Wiederholung geänderter Fälle, ohne andere Fälle neu zu erheben.
Nach der Zusammenfassung erzeugt `scripts/contact-selection-comparison.ts`
(`--source=<Erhebung> --evaluation=<Ausgabe>`) den Vergleich für den amtlichen
Gesamtbestand, einschließlich noch nicht geprüfter Gemeinden. Beide Auswahlen
werden nach denselben Quellenurteilen bewertet. Verlorene belegte Altkontakte sind
Verschlechterungen; nicht bestätigte alte Adressen bleiben ungeklärt, nicht falsch.
Kontaktgewinne sind keine automatische Aussage über vollständige Suchabdeckung.

Der echte Versender benötigt zusätzlich `--contact-quality-comparison=<Bericht>`.
Fehlende, unvollständige, veraltete, ungeklärte oder verschlechterte Vergleiche
brechen vor Aufbau des Mailtransports ab. Eingangsdaten, Quellen, Entscheidungen,
zusätzliche Beobachtungen und ausgewählte Empfänger werden erneut gebunden geprüft.
Der Bericht erzeugt keine Versandfreigabe und aktiviert keinen Versand.


### Vergleichsgrundlage und belegte Ausschlüsse

Der Vergleich benötigt `--selection-baseline` mit dem ursprünglichen gespeicherten Kontaktbestand. Rollen-, Presse-, Personen- und allgemeine Adressen bleiben darin vom gesamten alten Kandidatenpool getrennt. Mit `--sent-baseline` werden zusätzlich tatsächliche Versandnachweise ausgewertet; eine gespeicherte Adresse allein beweist keinen Versand. Beide Ausgangsdateien sind im Bericht mit Prüfsumme gebunden und werden vor einem Versand erneut geprüft.

Ein ausdrücklich belegter fachfremder Kontakt kann als ausgeschlossen abgeschlossen werden. Dafür sind unveränderte lesbare Originale, eine exklusive Zuordnung und eine eindeutige fremde Aufgabe nötig; fehlende Rollenbelege, Sperren und widersprüchliche Zuständigkeiten bleiben offen. Gute alte Kandidaten bleiben auch dann gegen Verlust geschützt, wenn sie noch nicht als Empfänger gespeichert waren. Veraltete Auswertungen tragen keine aktuellen Gewinn- oder Verlustzahlen bei.

## Zweite Generation (ab 17.09.2026) — ersetzt Abschlusskriterium und Zuständigkeitsprüfung

Gegenprüfung vom 17.09.2026: Der erste automatische Lauf ließ 10.741 von 10.747
Kommunen „ungeklärt", weil (1) eine Kontaktkarte wörtlich „Stadt X" tragen musste,
(2) jeder ungelesene Link oder ein nicht belegbarer allgemeiner Rathauskontakt jede
Verbesserung blockierte und (3) Überschriften über einer Adresse nie gelesen wurden.
Dazu kamen zwei nicht entschlüsselte Adress-Verschleierungen (472 und 49 Kommunen),
Symbol-Verschleierung (Kerpen) und verworfene vCards.

`scripts/contact-municipal-v2.ts` (Bewertung in `lib/contact-municipal-judge.ts`):

- **Zuständigkeit:** eigene Website plus eigene Adressendung genügt. Gemeinsame
  Verwaltungen werden über das amtliche Gemeindeverzeichnis (GV100AD, Satzart 50/60,
  `lib/gemeindeverband.ts`) belegt, nicht aus Seitentiteln geraten. Kreis- und
  Regionsadressen auf dem Stadtportal zählen nicht als Stadt (Hannover).
- **Rolle:** Kontaktkarte, nächste Inhaltsüberschrift ohne dazwischenliegende andere
  Adresse, Seitenüberschrift bei genau einer Adresse. Nie aus der Schreibweise der
  Adresse; die ordnet nur gleich belegte Kandidaten.
- **Vergleich:** Ein bestätigter alter Kontakt bleibt als Rückfall erhalten und blockiert
  keine belegte Verbesserung; ein belegter alter Rollenkontakt wird nie entfernt.
- **Abschluss:** höchstens 15 neue Seiten je Kommune, zweiter Versuch nur bei
  Unerreichbarkeit und frühestens nach 24 h. Danach ist das Ergebnis fest
  (beide Fachkanäle / einer / nur allgemein / ungeklärt mit Grund), bis sich eine
  Seite ändert.
- **Zwischenstände:** Ergebnis je Kommune, Seitenauszug je Seiteninhalt zwischengespeichert;
  eine Regeländerung bewertet neu, lädt aber nichts neu.

Messung vor dem Gesamtlauf: frische Stichprobe von 50 Kommunen, alle ausgewählten
Fachkontakte von Hand gegen den Belegtext gelesen — keiner falsch, drei schwach belegt.
Altes System auf denselben 50: 3 Fachkontakte, 0 abgeschlossen; neu: 15 Kommunen mit
Fachkontakt, 41 mit festem Ergebnis. Die Regeln wurden an 30 Probekommunen nachgeschärft;
die 50 lagen außerhalb davon.
