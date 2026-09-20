# Kontaktwirkung parallel zur Erhebung auswerten

Die Auswertung liest Versandbestände und Besuchsdaten, verbindet sie mit separat geprüften Originalquellen und schreibt ausschließlich lokale Berichte. Sie verändert keine Kontaktprofile und versendet nichts. Der laufende Suchlauf wird nicht verändert.

```sh
npm run kommunen:wirkung -- --directory=/absolute/private/new-snapshot --reviews=/absolute/private/reviews.json --collect --research=/absolute/private/full-run/results
```

Ohne `--collect` wird derselbe unveränderte Snapshot erneut ausgewertet. So lassen sich später fertiggestellte Suchergebnisse ohne weitere Analytics-Abfragen abgleichen. Für neue Besuchsdaten einen neuen Ausgabeordner verwenden. Rohmails, Empfänger und Analytics gehören ausschließlich in den ignorierten privaten Cache, niemals ins Repository.

Die geprüfte Eingabe enthält `sources`, `actions` und optional `recipients`; die Typen stehen in `lib/outreach-evaluation.ts`. Jede Beobachtung nennt Gemeinde, Originalquelle, wörtlichen Beleg, Prüfenden und Prüfdatum. Bei Mails bleibt eigener Text vom zitierten Verlauf getrennt. Eine Veröffentlichung braucht eine gelesene öffentliche Seite und den überprüften Herausgeber. Die inhaltliche Einordnung erfordert eine Quellenprüfung; die automatische Zitatprüfung ersetzt diese nicht.

Antwort, interne Weiterleitung, aufbereitete Meldung, Presseverteilung und Veröffentlichung werden unabhängig gezählt. Eine Handlung begründet keine nachfolgende. Das Erstellen einer Pressemitteilung belegt keine Verteilung. Ein persönlicher Social-Media-Beitrag ist keine kommunale Veröffentlichung. Ein Amtstitel belegt keine Kommunikationsfähigkeit. Veröffentlichungen bleiben ohne separat belegte handelnde Adresse auf Gemeindeebene.

Die Verbindung zu Suchergebnissen verlangt dieselbe Gemeinde und exakt dieselbe belegte Mailadresse. Nicht bereits gespeicherte Gemeinden sind noch nicht geprüft. Nicht gefundene Adressen werden nicht automatisch als unbrauchbar bezeichnet. Die beobachteten alten Antworten beweisen keinen Effekt der neuen Suche.

Besuche werden pro Atlas-Seite ab dem Versandtag abgefragt. Der Versandtag ist vollständig enthalten, der aktuelle Tag teilweise. Herkunftsgruppen können dieselben Menschen enthalten und werden deshalb nicht zu eindeutigen Personen addiert. Direkte Besuche oder Referrer beweisen weder Mailöffnung noch Zustellung, Handlung oder Identität. Ein fehlgeschlagener Abruf ist kein Nullwert. Globale Herkunftsereignisse bleiben ohne Gemeindezuordnung.

Der aktuelle Profilkontakt ist kein historischer Versandempfänger. Zitierte Versandkopfzeilen bleiben schwächer als unabhängig geprüfte Originalnachrichten. Die früher genannten 202 bezeichneten Softwaretests und waren keine Versandkohorte. Die Fallprüfung ist keine vollständige Suche nach sämtlichen öffentlichen oder privaten Veröffentlichungen.

## Erhebungsabbruch durch lange Leerraumfolgen

Am 14.09.2026 blockierte eine reale Seiteneingabe die synchrone Adressbereinigung. Netzwerk-Zeitlimits konnten den laufenden regulären Ausdruck nicht unterbrechen. Ein Leistungsprofil und die gesicherte Eingabe reproduzierten die Ursache: Die Suche setzte innerhalb einer langen Leerraumfolge an jeder Position erneut an. Die Reparatur sucht nur am Anfang jeder Folge; die Domainbereinigung sucht vorwärts statt mit einem variabel langen Rückblick. Der Gegencheck läuft in einem eigenen Prozess, damit sein Zeitlimit auch bei blockierter Verarbeitung wirksam bleibt; der alte Code scheitert daran.

Ein unterbrochener Lauf bleibt mit seinen gespeicherten Ergebnissen erhalten. Bei geändertem Recherchecode wird ein neuer vollständiger Lauf mit neuer Herkunftskennung begonnen. Alte Ergebnisse werden nicht nachträglich als Ergebnisse der neuen Fassung ausgegeben.

## Abo-Feedback

Die Auswertung berücksichtigt aktuell bestätigte und noch offene Abos getrennt. Nur nach dem jeweiligen Anschreiben angelegte Abos mit plausiblen Zeitangaben zählen zum anschließenden Feedback. Brief-Herkunft und freiwillige Angabe Verwaltung werden einzeln und gemeinsam ausgewiesen. Die gemeinsame Briefkennung identifiziert weder den Empfänger noch die Versandwelle. Keine Adressen werden gelesen oder Kontaktrollen aus Abos abgeleitet. Abmeldungen zählen nicht zur aktuellen Reichweite. Wiederanmeldungen können wegen des ursprünglichen Anlagedatums fehlen; die Bestandsauswertung ist kein vollständiger historischer Abschluss-Trichter.

Neue Datenerfassungen holen die Abo-Zahlen automatisch. Bei einem bestehenden Analytics-Snapshot kann `--collect-subscriptions` in einem neuen Ausgabeverzeichnis ergänzt werden; die getrennten Erfassungszeitpunkte bleiben sichtbar. Fehlgeschlagene oder fehlende Abo-Abfragen sind unbekannt, nicht null. `abo_anmeldung` aus Web Analytics zählt nur Anmeldeversuche und bleibt von bestätigten Abos getrennt.

Verwaltungsangaben werden außerhalb des Cockpits erst ab fünf bestätigten Abos je Gemeinde ausgegeben. Unterdrückte Teilwerte werden nicht als null Abos summiert.
