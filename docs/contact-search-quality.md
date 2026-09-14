# Gemeinsame Kontaktsuche und Qualitätsvergleich

Die vier Zielgruppen verwenden für die gemeinsame Recherche denselben Lauf:
`npm run kontakte:recherche -- --dataset=kommunen|fachbetriebe|presse|versorger`.
Das ist eine additive Recherche; die bisherigen profilspezifischen Erhebungen
bleiben vorhanden. Kontaktfunde werden nicht automatisch zu Versandempfängern.

## Ablauf

1. **Identität prüfen.** Ein Registereintrag ist nicht automatisch eine aktuelle
   eigenständige Organisation. Gemeindefreie Gebiete, Ortsteile und rechtlich
   getrennte Konzerngesellschaften brauchen eine eigene Zuordnung. Fehlende
   Websites bleiben als `missing-website` sichtbar; sie werden nicht ausgefiltert.
2. **Quellen ergänzen.** `kontakte:quellen -- --manifest=FILE` zeigt zunächst nur
   den Plan. Das Manifest enthält `targets` mit `dataset`, `organization_id`,
   `name` und optional `question`. Erst `--execute` nutzt den vorhandenen
   Suchdienst, höchstens `--limit=20` Anfragen, standardmäßig vier. Treffer bleiben
   `found-unverified`. Namensgleichheit und Suchtreffertext sind kein Nachweis.
   Quellenfehler und tatsächliche vom Anbieter zurückgegebene Kosten werden
   mitgeschrieben. Der Live-Test dieses Schritts wurde am 14.09.2026 von der
   automatischen Freigabeprüfung abgelehnt; vor Ausführung ist eine ausdrückliche
   Betreiberfreigabe für den externen Suchdienst erforderlich.
3. **Originalquellen lesen.** Nach Prüfung kann `kontakte:recherche` mit
   `--manifest=FILE` belegte Einstiegspunkte lesen. Jeder Eintrag unter `targets`
   benötigt `dataset`, `organization_id`, `website`, `sourceUrl` und `evidence`.
   Das erzwingt nachvollziehbare Eingaben, ersetzt aber keine inhaltliche Prüfung.
   Auch bei einer Website-Weiterleitung bleiben fremde E-Mail-Domains unbestätigt.
4. **Innerhalb einer Website recherchieren.** Der Lauf folgt Kontakt-, Abteilungs-
   und Themenseiten. Er entfernt Druck-/Trackingvarianten und Bilddateien aus
   der Warteschlange, berücksichtigt tatsächlich beobachtete Weiterleitungen
   und kann nach einem veralteten Unterseitenlink zur Startseite zurückkehren.
   Wenn verlinkte Wege erschöpft sind, wird die Sitemap innerhalb desselben
   Abrufbudgets geprüft. Diese Korrekturen erweitern keine Organisationszuordnung.
5. **Funde prüfen.** Gespeicherte Rollenwörter im Umfeld einer Adresse sind
   Hinweise, keine bestätigte Zuständigkeit. Eine allgemeine Verwaltungsadresse,
   eine Redaktion, eine Pressestelle und ein Netzanschlusskontakt werden bei der
   Bewertung getrennt. Unterschiedliche Domainnamen können berechtigte
   Verwaltungs-/Verlags-/Konzernkontakte sein; sie werden deshalb bewahrt, aber
   nicht automatisch als eigene Kontakte bestätigt.
6. **Vergleichen.** `kontakte:vergleich -- --before=DIR --after=DIR
   --references=FILE --output=FILE` wertet genau einen Lauf pro Organisation aus.
   Doppelte Läufe werden abgelehnt, fehlende Paare führen zu Exit 1. Der Vergleich
   trennt quellengestützte Referenztreffer, verlorene richtige Referenzkontakte,
   ausdrücklich widerlegte Adressen und zusätzliche ungeprüfte Kandidaten.

## Budget, Fortschritt und Nachvollziehbarkeit

`--pages=12` ist das Standardlimit für HTML- und Sitemap-Abrufe zusammen.
Browser-Nachladen ist zusätzlich auf zwei Seiten begrenzt. `--limit` begrenzt
Organisationen, `--after` setzt die nach Kennung sortierte Auswahl fort; `--id`
prüft genau eine Organisation. Ohne `--write` bleiben Ergebnisse lokal, mit
`--write` werden sie zusätzlich an die private Recherchehistorie angehängt.
Bestehende Kontaktprofile, Notizen und Empfängerauswahl bleiben erhalten.

Der private lokale Lauf enthält auch Quellenvorgabe, Abrufzahl und
Sitemap-Beobachtungen. Das bestehende Datenbankschema hält weiterhin Seiten,
Kandidaten, Restwarteschlange und Status. Rohfunde und Vergleichsdateien gehören
in `scripts/.cache/contact-evidence/`, nicht ins öffentliche Repository.

Ein gleicher maximaler Abrufrahmen ist **kein gleicher tatsächlicher Aufwand**:
Der neue Lauf nutzt freie Kapazität für Wiederherstellung und Sitemap-Suche.
Die Auswertung muss beide tatsächlichen Abrufzahlen nennen. `found` bedeutet
nur einen Fund, niemals vollständige Erfassung. `partial`, Restwarteschlange,
fehlende Website und Quellenfehler bleiben eigenständige Befunde.

## Referenzformat

Eine Datei enthält `references`, pro Eintrag `dataset`, `organization_id`,
`contacts` und optional `rejectedEmails`. Jeder Kontakt hat `email`,
`sourceUrls` und `department`. Ein Treffer zählt nur, wenn Adresse **und eine
bestätigte Quellenseite** übereinstimmen. Ein leeres Referenzfeld ist unbekannt,
nicht der Beweis einer kontaktlosen Organisation.

Die festen Prüfkontakte sind **positive Anker**, keine vollständigen Listen aller
richtigen Kontakte. Daraus darf weder eine allgemeine Trefferquote noch die
Vollständigkeit des Kontaktbestands errechnet werden. Ein nach einem Befund
angepasster Prüfbestand ist kein unberührter Holdout mehr. Ursprüngliche Läufe
aufheben; spätere Korrekturen separat messen.

## Prüfstand vom 14.09.2026

Der private Stand `quality-2026-09-14` bewahrt die geschichtete Auswahl von 76
Fällen, ursprüngliche Abrufe und Vergleichsläufe. Originalquellen wurden
zusätzlich unabhängig geprüft. Festgestellte Fehlerklassen: Textverklebungen an
HTML-Grenzen, gelöschte No-Script-Fallbacks, kodierte Adressen, unsichtbare
Antispamfragmente, Druckkopien/Bilddateien im Seitenbudget, veraltete Einstiegspfade
und Quellen außerhalb der bekannten Website. Regressionstests schützen dabei
auch normale Inline-Aufteilungen und Kontakte in aufklappbaren Verzeichnissen.

Die ursprüngliche Bestandsauswertung bezeichnete alle Gemeindeschlüssel als
Gemeinden. Diese Bezugsmenge enthält auch gemeindefreie Gebiete und historische
Einheiten. Sie ist als technische Registerabdeckung verwendbar, nicht als Zahl
aktueller kommunaler Outreach-Empfänger. Keine pauschale Bereinigung anhand von
Namen oder einer aus wenigen Beispielen abgeleiteten Schlüsselheuristik.
