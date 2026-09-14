# Selbstheilende Vollerhebung

Der bestehende Recherchecode und sein eingefrorener Bestand bleiben unverändert. Die neue Laufsteuerung liest dieselben Ziele, bewahrt fertige Ergebnisse und führt fehlende Ziele in einzeln beendbaren Prozessen aus. Die Laufzeitgrenze liegt außerhalb der JavaScript-Verarbeitung und wirkt damit auch bei Endlosschleifen und blockierenden regulären Ausdrücken.

- Höchstens acht gleichzeitige Organisationen; dieselbe Ausgangs-Webdomain wird seriell gelesen.
- Sechs Minuten je Versuch, höchstens drei dauerhaft protokollierte Versuche je Ziel. Nach ausgeschöpften Versuchen steht ein sichtbarer Fehler; der übrige Bestand wird weiterbearbeitet.
- Wiederholungen betreffen Abstürze, Hänger und reine Abruffehler ohne gelesene Seite. Teilweise erfolgreiche Recherchen bleiben mit ihren Lücken erhalten. Ein vollständig versuchter Bestand bedeutet keine vollständige oder verifizierte Kontaktsammlung.
- Eingaben, Seitenbelege, Ausgaben und Fehler jedes Versuchs bleiben separat erhalten. Beschädigte Endergebnisse werden aufgehoben und erneut erhoben.
- Ein erfolgreicher Zwischenstand des Einzelprozesses wird nach einem Absturz der Steuerung übernommen. Eine Betriebssystem-Sperre verhindert zwei gleichzeitige Steuerungen; aktive alte Vollerhebungen verhindern die Übernahme.
- Verwaiste Einzelprozesse werden nur nach Abgleich ihrer individuellen Eingabedatei und Prozessgruppe beendet, niemals allein aufgrund einer früher gespeicherten Prozessnummer.
- Recherchequellen und Steuerung werden vor dem Start in einen eigenen Laufzeitordner kopiert. Änderungen im Arbeitsverzeichnis beeinflussen den laufenden Prozess dadurch nicht. Eine Änderung der installierten Abhängigkeiten stoppt neue Versuche sichtbar, statt unbemerkt die Recherchefassung zu wechseln.

## Start

Zuerst vorhandenen alten Lauf identifizieren und geordnet stoppen. Keine fremden Prozesse beenden. Dann vorbereiten und den lokalen macOS-Dienst registrieren:

```sh
python3 scripts/install-contact-supervisor.py --directory=/absolute/path/to/frozen-run
python3 scripts/install-contact-supervisor.py --directory=/absolute/path/to/frozen-run --install
```

Die erste Zeile erzeugt nur lokale Dateien und die prüfbare Dienstdefinition. Die zweite registriert einen benutzereigenen macOS-Hintergrunddienst. Keine neuen Versandaktionen, Datenbankänderungen oder bezahlten Suchanfragen.

macOS startet die Steuerung nach einem Fehler erneut; wiederholte Starts werden mit einem Mindestabstand von 30 Sekunden gedrosselt. Nach erfolgreichem Abschluss beendet sie sich. Der Dienst läuft unabhängig von der Codex-App und startet nach einer erneuten Benutzeranmeldung wieder; ein ausgeschalteter oder schlafender Mac erhebt keine Daten. Er ändert keine Energieeinstellungen.

`supervisor-state.json` enthält den aktuellen Lebensnachweis. `summary.json` wird erst nach Prüfung jedes Ziels geschrieben und enthält Fehler ausdrücklich. Die Plist im Laufverzeichnis enthält den konkreten Dienstnamen und die Startparameter. Mit `launchctl bootout gui/$(id -u)/DIENSTNAME` wird der Dienst angehalten; nicht während eines aktiven Laufs die Laufzeitdateien löschen.

## Ausfalltests

`python3 scripts/__tests__/contact_supervisor_test.py` prüft echte hart begrenzte Endlosschleifen, dauerhafte Wiederholungsgrenzen, Wiederaufnahme ohne Doppelarbeit, beschädigte Zwischenstände, Ergebnisübernahme nach einem Steuerungsabsturz und Schutz fremder Prozesse. Der Test wird über Vitest auch in der normalen CI ausgeführt.
