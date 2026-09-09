# Projekt-Statistik: Übergabe

Stand 09.09.2026. Für eine Sitzung, die daraus eine öffentliche Seite baut.

## Was gebaut ist

Ein wöchentlicher Lauf (montags, `npm run stats:erfassen -- --schreiben`) liest die
Gesprächsprotokolle von Claude Code und die Versionsgeschichte und schreibt je
Kalendertag eine Zeile in `projekt_statistik`, dazu den Bestand in
`projekt_bestand`. Beide Tabellen: RLS an ohne Policy, nur über den
Dienstschlüssel. Rechnung in `lib/projekt-statistik.ts`, Aufwandsvergleich in
`lib/aufwand-schaetzung.ts`, Einrichtung über `/api/projekt-statistik/setup`.

**Der Lauf muss lokal laufen.** Die Protokolle liegen unter
`~/.claude/projects/-Users-eule-projects-pv-rechner*` auf dem Rechner des
Betreibers und nirgends sonst. Eine Cloud-Variante gibt es nicht und kann es
nicht geben.

## Was NICHT gebaut ist

- Keine Leseschicht für eine Seite. Die Tabellen sind nur über den
  Dienstschlüssel erreichbar; eine Seite braucht ein serverseitiges Lesemodul.
- Keine About-Seite, kein Widget, keine Darstellung.
- Kein Verlaufsdiagramm. Die Tageszeilen geben es her, gebaut ist nichts.

## Die Zahlen (Stand 08.09.2026)

Der laufende Tag wird bewusst nie abgelegt — sonst steht in der Reihe ein
schwacher Tag, der bloß noch nicht zu Ende ist.

### Gemessen, 15.07. bis 08.09.2026 (47 Tage)

| | |
|---|---|
| Tokens gesamt | 45.574.201.790 |
| davon wiedergelesener Kontext | 44.220.976.469 |
| frisch in den Zwischenspeicher | ~1,26 Mrd. |
| selbst geschrieben | 92.077.914 |
| Arbeitszeit (zusammengelegt) | 255 h |
| getippte Sätze | 4.135 (Mittellänge 132 Zeichen) |
| längere Eingaben (Wächter-Aufträge, Eingefügtes) | ~900 |
| Antworten | 104.383 |
| Werkzeugschritte | 60.806 |
| Sitzungen | 288, davon 177 mit Mensch |

Arbeitszeit nach Uhrzeit: 7 bis 20 Uhr, Knick um 11, zweiter Gipfel 17–19 Uhr.
Nachts läuft nur die Automatik.

### Geschätzt, 22.03. bis 14.07.2026 (44 Tage)

11.004.642.904 Tokens, 62 Stunden. **Einmalig gelaufen — nicht wiederholen:**
Ein zweiter Rückrechnungslauf nähme einen neuen Kennwert und schriebe für
dieselben Tage andere Zahlen, ohne dass sich an den Daten etwas geändert hätte.

Die Regel: Tokens je Commit aus dem gemessenen Zeitraum × Commits des Tages.
Nicht über Kalendertage — die frühe Phase war viel dünner besetzt (382 von 2.122
Änderungen an 44 von 97 aktiven Tagen). **Sie überschätzt eher**, weil Repo und
Projektanleitung damals kleiner waren und jede Anfrage weniger Kontext trug.

### Bestand

1.676 Dateien · 188.419 Zeilen Code (ohne Tests) · 50.530 Zeilen Tests ·
25.256 Zeilen Doku · 247 Test-Dateien mit 3.483 Prüfungen (Lauf am 09.09.2026;
zusätzlich 31 Browser-Test-Dateien) · 2.122 Änderungen · 171 Tage seit dem
ersten Commit (22.03.2026) · 97 aktive Tage.

Gezählt: 5 Rechner · 68 feste Seiten · 8 dynamische Routen · 21 Widgets ·
88 Schnittstellen-Routen (davon 18 Einrichtung/Automatik) · 152 Komponenten ·
276 Rechenmodule · 63 Skripte · 110 Förderprogramme.

## Die Vergleiche, die auf die Seite sollen

**Tokens als Werk.** 92 Mio. selbst geschriebene Tokens ≈ 70 Mio. Wörter ≈
**90 Bibeln** (Lutherbibel ~780.000 Wörter — Quelle ist die Schweizerische
Bibelgesellschaft, für eine öffentliche Seite vor Verwendung noch einmal am
Original bestätigen). Anschaulicher pro Antwort: bei jeder der 104.383 Antworten
wurden 425.000 Tokens neu eingelesen, etwa ein halbes Altes Testament.

**Selbst gemessener Anker, ohne fremde Quelle:** Quelltext und Doku sind
zusammen rund 3,9 Mio. Tokens. Der wiedergelesene Kontext entspricht damit
**etwa 11.600 vollständigen Durchgängen durch das Projekt**.

**Aufwand: nach Gewerken, nie nach Codezeilen.** Rund **600 Personentage**
(Spanne 450–750), das sind ~2,8 Personenjahre oder ein Dreierteam über zehn
Monate. Gegen die tatsächlichen ~66 Personentage ergibt das **Faktor neun**.
Die Menge je Position ist gezählt, die Tagessätze sind Urteil — beides steht
getrennt, damit die Summe mitwächst und niemand die Schätzung für eine Messung
hält.

## Vier Sackgassen — nicht noch einmal betreten

1. **Vollständige Tokenzahlen sind nicht mehr zu beschaffen.** Am 09.09.2026
   geprüft: Protokolle vor dem 15.07. gelöscht, kein Time Machine, keine
   Systemschnappschüsse, die lokale Telemetrie enthält nur Fehlerereignisse ohne
   Tokenzahlen, die Nutzungsstatistik auf der Platte steht auf Februar.
   Ungeprüft geblieben: ob die Abo-Nutzungsseite bei Anthropic rückwirkende
   Zahlen herausgibt.
2. **COCOMO taugt hier nicht.** Das Verfahren aus Codezeilen (Boehm 1981)
   liefert 62 Personenjahre gegen tatsächlich rund ein Drittel — Faktor 200.
   Das belegt nichts, es zeigt, dass das Modell nicht passt: Es unterstellt
   handgeschriebenen Code ohne fertige Bausteine, und in den 237.000 Zeilen
   stecken Datentabellen, erzeugte Reihen und 50.000 Zeilen Tests.
3. **Ein moderneres automatisches Werkzeug gibt es nicht.** Die gängigen
   Code-Zähler geben eine Aufwandsschätzung aus und rechnen darunter alle
   dasselbe Modell von 1981. Der anerkannte Nachfolger (COSMIC-Funktionspunkte,
   ISO/IEC 19761) misst Funktionen statt Zeilen und verlangt einen
   zertifizierten Menschen, der von Hand zählt.
4. **Zeilenzahlen bekannter Software als Vergleich weglassen** (Space Shuttle
   400.000, Photoshop 1.0 128.000, Linux-Kern über 40 Mio.). Alles
   Sekundärliteratur ohne saubere Zählweise, und die Zeilenzahl sagt nichts,
   was die beiden anderen Vergleiche nicht besser sagen.

## Fallen für die Seite

- **Die Lücke muss dranstehen.** Die Tokenzahl ist für die erste Projekthälfte
  hochgerechnet. Auf einer Seite, die für Ehrlichkeit bürgt, ist eine als
  Messung verkaufte Schätzung der teuerste Fehler — die Herkunft steht je Tag in
  der Ablage und gehört auch in die Anzeige.
- **Kein Punktwert beim Aufwand.** Immer die Spanne, immer mit dem Satz, dass
  die Tagessätze Urteil sind.
- **Keine Arbeitszeiten je Tag öffentlich.** Aus den Tageszeilen lässt sich das
  Arbeitsverhalten des Betreibers ablesen. Öffentlich gehören Summen, keine
  Tagesreihe mit Uhrzeiten.
- **Live rechnen, nicht eintippen** (ausdrückliche Vorgabe): Bestand und
  Aufwandsschätzung wachsen mit; eine getippte Zahl ist beim nächsten Datenlauf
  falsch.
