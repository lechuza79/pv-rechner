# Regionale Monatsmails

`lib/newsletter-region.ts` liest Gemeinden, Kreise, veröffentlichte Verbände, Bundesländer und Deutschland über denselben Einstieg. Verwendet werden die veröffentlichten Ortspakete (`ladeGemeindePaket`) beziehungsweise die vorhandenen regionalen Paketloader. Keine temporären Paketübergaben und keine Anfrage an jede Mitgliedsgemeinde. Bestand und Monatszubau stammen aus zwei Monatsendständen derselben Ausgabe wie die Solar-Monatskurve. Fehlende Tage, Ausgabenabweichungen oder fehlende Gebiete halten die Vorbereitung zurück.

Der anlassbezogene `aboLauf` bleibt unabhängig. Der Newsletter verwendet ausschließlich `empfaengerFuerOrt` und bestätigt die Zuordnung erneut unmittelbar vor dem Versand. Vorlagen für Verwaltung und andere Abonnenten liegen in `scripts/templates`; das Bild rendert die zentrale `MonthlySolarRadial`-Komponente. Quellen stehen im Mailfooter.

## Vorbereitung und Versand

Die Ausgabe September 2026 ist abgenommen. Weitere Ausgaben müssen vor einem Versand im bestehenden Kampagnenregister freigegeben werden; dieser Weg legt keinen wiederkehrenden Versand an.

```
node --conditions react-server --import tsx scripts/newsletter-vorbereiten.ts --monat 2026-09 --ausgabe /private/tmp/newsletter.json --vorschau /private/tmp/newsletter-preview
node --conditions react-server --import tsx scripts/aussendung.ts --zielgruppe gemeinde-abos --senden /private/tmp/newsletter.json --schub newsletter-september-2026 --trocken
node --conditions react-server --import tsx scripts/aussendung.ts --zielgruppe gemeinde-abos --senden /private/tmp/newsletter.json --schub newsletter-september-2026
```

Die Vorbereitung nutzt die bestehende Betriebsautorisierung an `/api/abo/versenden` (POST `aktion: vorbereiten`). Diese prüft das bestätigte Abo, lädt den gemeinsamen Monatsstand und erzeugt die beiden persönlichen Links. Der Signaturschlüssel verlässt den Server nie. `aktion: links` erlaubt dem Sender die erneute Prüfung gegen die kanonischen Links. Keine Endpunkte sind ohne Betriebsautorisierung nutzbar.

Jede Mail wird vor SMTP in `aussendungen` vermerkt; die Kombination aus Ausgabe, Adresse und Region wird auch bei geändertem Betreff zurückgehalten. Vor Versand wird zusätzlich der bisherige Abo-Versandmerker gesetzt. Unklare oder fehlgeschlagene Versuche werden nicht automatisch erneut verschickt. Mailbilder werden als eingebettete Anhänge versandt; List-Unsubscribe und One-Click-Abmeldung verwenden den gültigen persönlichen Link. Testzählung bleibt vom Produktionsnewsletter getrennt.

Die Versanddatei enthält Adressen und persönliche Links, wird mit restriktiven Dateirechten geschrieben und gehört nicht ins Repository. HTML-Vorschauen enthalten ungültige Vorschau-Abmeldelinks. Die Versanddatei nach dem abschließenden Versandnachweis entfernen.
