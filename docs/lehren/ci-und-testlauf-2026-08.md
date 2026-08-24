# CI, Browser-Tests und Dev-Server: Vorfälle (Stand 08/2026)

Ausgelagert aus `CLAUDE.md` am 24.08.2026. Die Regeln stehen weiterhin dort.

## Rot, das nichts mit unserem Code zu tun hatte (18./19.08.2026)

Der CI-Schritt, der Playwrights System-Bibliotheken nachinstalliert (`apt-get` gegen Ubuntus Spiegel),
blieb dreimal in 18 Stunden hängen: einmal 35 Minuten bis zum Job-Abbruch, danach zweimal bis in die
eigens gesetzte 5-Minuten-Grenze. Jedes Mal Rot, ohne dass an unserem Code etwas war.

**Ein Lauf ohne Urteil ist schlimmer als ein roter** — Rot sieht man, „abgebrochen" liest man als „egal".
Und von wiederholtem Fremd-Rot gewöhnt man sich ab, Rot überhaupt ernst zu nehmen.

Das Runner-Image bringt Chromiums Bibliotheken bereits mit; der Schritt ist Absicherung, kein Fundament.
Deshalb `continue-on-error`. Der Browser-Download über Playwrights eigenes CDN hat nie gehangen und
bleibt fatal.

## Alle Kombinationen bei jedem Push: gemessen und verworfen (18.08.2026)

~600 Seitenaufbauten sättigten den 2-Kern-Runner. React übernahm frisch geladene Seiten länger als
20 Sekunden nicht, und der Läufer meldete „Option ließ sich nicht wählen" für Optionen, die von Hand
funktionieren. Fünf rote Läufe an einem Tag — einer davon auf einem Commit, der nur CLAUDE.md änderte.

Seitdem: jede Option jedes Schritts bei jedem Push, alle Kombinationen nur nächtlich.

## Der Flow-Läufer sah zwei Bedienfamilien nicht (bis 22.08.2026)

Die Akkordeon-Fragen (Dachform, Ausrichtung, Neigung, alle vier Gebäudefragen) und die Ein/Aus-Schalter
trugen keine Kennzeichnung und waren damit unsichtbar — während der Lauf grün „geprüft" meldete.

Die zweite wog schwerer: Ohne Kennzeichnung hielt der Läufer den Großverbraucher-Schritt für einen
„Schritt ohne Auswahl" und klickte nur Weiter. Er hat damit **die Wärmepumpe nie eingeschaltet**, also
auch nichts geprüft, was dahinter liegt.

Durchgekommen ist so ein Fehler, bei dem ein Klick auf „Flachdach" wieder „Satteldach" hinterließ.

Zwei Fallen beim Nachbauen der Prüfung:
- **Nicht über den Text der eingeklappten Zeile** vergleichen — der ist nicht immer der der
  Knopfbeschriftung (Heizsystem: Kürzel im Knopf, ganzer Name in der Zeile). Ein Textvergleich wäre
  dort falsch-rot.
- **Nicht gegen den Router messen.** Wo der Zustand in der Adresse liegt, wirkt die Adressänderung erst
  im nächsten Render — im Dev-Server mehrere hundert Millisekunden. Die erste Fassung sah sofort nach
  dem Klick nach und meldete „die Antwort hält nicht" für Antworten, die eine halbe Sekunde später
  korrekt dastanden.

## Drei Browser-Tests stundenlang rot aus fremder Ursache (18.08.2026)

Die Helfer zum Durchklicken lagen in der Flow-Test-Datei und standen damit nur dem Flow-Läufer zur
Verfügung. Als der Flow-Umbau die Vorauswahl aus jedem Schritt nahm, blieb „Weiter" gesperrt, bis alle
Fragen des Schritts beantwortet sind. Die älteren Tests klickten weiter nur „Weiter" und hingen am
ausgegrauten Knopf — mit einer Ursache, die nichts mit dem zu tun hatte, was sie prüfen.

Der Knopf sagt inzwischen selbst, was fehlt — nur hört ihm ein Test nicht zu, der ihn nur anklickt.

## Zwei Sessions prüften stundenlang fremden Code (17.08.2026)

Playwright verwendet einen laufenden Server auf dem Ziel-Port ungefragt weiter. Port 3045 gehörte einem
fremden Worktree mit einer anderen Framework-Version; die andere Session hatte ihren Vorschau-Server im
Haupt-Repo.

Beide bekamen grüne Läufe, die über die eigenen Änderungen nichts aussagten — und suchten dazu Fehler an
Symptomen, die es im eigenen Zweig gar nicht gab: leere Seiten, fehlende Umgebungsvariablen, angeblich
nicht gerenderte Bausteine.

Kosten: je mehrere Stunden, an einem Tag, bei zwei Sessions gleichzeitig.

## Das Wettrennen beim Vorwärmen

Der Dev-Server übersetzt jede Route erst beim ersten Aufruf. Lösen mehrere Test-Arbeiter das gleichzeitig
aus, scheitert das serverseitige Rendern mit `__webpack_modules__[moduleId] is not a function` — dieselbe
Wettrennen-Klasse wie beim geteilten Ausgabeverzeichnis von Dev-Server und Build.

Deshalb wärmt der Testlauf alle Adressen **nacheinander** vor. Nicht über Wiederholungen wegkehren: Ein
Test, der beim zweiten Mal grün wird, gewöhnt daran, Rot nicht ernst zu nehmen.

## Warum der Pre-commit-Hook existiert

Nach einem Verschieben per `git mv` waren nur die Umbenennungen vorgemerkt. Der lokale Build lief grün,
weil der Arbeitsstand korrekt war — der Build in der Produktion fiel um, weil der Commit selbst kaputt war.

Mit Hook gilt: was committet wird, ist auch typgeprüft.
