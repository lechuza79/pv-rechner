# Race-Chart: Vorlage für weitere Rennen

Arbeitsmaterial für Folgesessions (auch mit kleinerem Modell). Erster Aufrufer und
Referenz: das Stromkosten-Rennen (`components/charts/KostenrennenWidget.tsx`).

## Was ein Rennen ist

Zwei Läufer, jeder eine **kumulierte Tagesreihe** über denselben Zeitraum
(`Float64Array`, Index 0 = Start, Länge = Tage + 1). Der Baustein
`components/charts/RaceChart.tsx` zeichnet beide als Linien, die sich selbst
zeichnen, mit mitlaufenden Achsen, Ereignis-Zeitleiste, Bild- und Video-Download.
Das Rennen selbst bringt nur mit:

| Was | Woher |
|---|---|
| Zwei Reihen (`kamera`, `anderer`) | aus dem Rechenkern — nie eine eigene Rechnung im Widget (Regel „Geteilte Rechen-Basis") |
| Kalender (`ersterTag`, `datumVon`) | aus demselben Tagesverlauf (Muster `lib/kostenrennen-tage.ts`) |
| Ereignisse (`ereignisse`) | Liste `{tag, jahr, label, text, linie?, bild?}` — aufsteigend nach Tag, das letzte ist die Schlusszahl |
| Formatierer (`fmt`, `fmtKurz`) | aus `lib/atlas-format.ts` (z. B. `fmtEuroVoll` / `fmtEuroK`), nie getippt |
| Register-Eintrag (`widget`) | `lib/widget-registry.ts` — Titel, Teilen-Ziel, Quellen, CTA |
| Zwei Hilfetexte | am Titel (was verglichen wird), am Zeitraum (was die Linien zählen) |
| `ariaLabel`, `exportNote`, `dateiname` | Vorlesetext, Bild-Fußnote, Dateiname für Bild und Video |

`kamera` ist der Läufer, dem die Geldskala am Anfang folgt — der, der **vorn
startet** (beim Stromkosten-Rennen die Anlage mit ihrer Anschaffung). Der
`anderer` liegt anfangs außerhalb des Bildes und wird am Rand mit Zahl geführt.

## Was der Baustein entscheidet (nicht je Rennen neu)

Kamera und Zoom-Öffnung, Tempo, Zeitleiste im Zubau-Stil (immer ein Ereignis
aktiv, das vorige blendet aus), Punkte in Akzentfarbe, Beträge über der Spitze
mit Halo, Quellen-Kante am Chart-Bereich, Video in Echtzeit. Wer davon etwas
ändert, ändert alle Rennen — das ist gewollt.

## Anderer Zeitraum oder Werteraum

Die Voreinstellungen sind für 25 Jahre und Tausende Euro. Zwei Props passen sie an:

- `tempo`: `ruhigeTage` (Anfang im ruhigen Tempo, Standard 730), `msJeTagStart`
  (22) und `msJeTagEnde` (1,5). Gesamtdauer ≈ Summe über die Tage; bei 10 Jahren
  eher `ruhigeTage: 365`, `msJeTagEnde: 3`.
- `skala`: `minTage` (Mindestfenster der Zeitachse, 365), `luft` (Luft um den
  Kamera-Läufer, 0,9 Spannen), `minSpanne` und `minRand` (in **Werteinheiten**,
  Standard 120 und 20 — bei Prozent oder kWh anpassen, sonst zoomt das Bild am
  ersten Tag auf ein paar Nachkommastellen), `zoomAb` (ab wann die Skala auf das
  Gesamtbild öffnet, 0,5).

Die Zeitachse setzt **Tage mit Kalendermonaten** voraus (Jahresmarken je Januar,
reduzierte Bewegung springt je Jahr). Wochen- oder Stundenreihen passen nicht.

## Ein neues Rennen anlegen — Reihenfolge

1. **Rechnung**: Reihen aus dem Rechenkern ableiten (wie `lib/kostenrennen.ts` +
   `lib/kostenrennen-tage.ts`), mit Test, dass Endstand und Kreuzung dem Rechner
   entsprechen. Neue Modellannahmen gehören durch Kohärenz-Tests, nicht ins Widget.
2. **Register**: Eintrag in `lib/widget-registry.ts` (Titel, `kind: "chart"`,
   Quellen aus `lib/data-sources.ts`, CTA).
3. **Widget**: dünner Aufrufer nach dem Muster des Stromkosten-Rennens; die
   Ereignisliste als eigene, testbare Funktion (`kostenrennenEreignisse`).
4. **Hülle**: Embed-Route unter `app/(embed)/embed/<id>/`, Onsite-Einbau, Eintrag
   in `lib/chart-katalog.ts`, `EMBED_WIDGETS`, Galerie-Sektion, `e2e/routen.ts`,
   Export-Spec. Dieselbe Liste wie beim ersten Rennen (Commit-Historie 05.09.2026).
5. **Prüfen am Bild und am Video**, nicht am Code: Beträge lesbar, Ereignisse
   erscheinen zur richtigen Zeit, Endbild zeigt beide Linien ganz.

## Fallen, die schon bezahlt sind

- Ein Regler auf der Ereignis-Spur geht nicht: Die Spur liegt auf der wachsenden
  Chart-Achse, ein Regler darauf wechselt beim Ziehen die Skala. Zweimal gebaut,
  zweimal zurück (05.09.2026).
- Ereignis-Punkte, die verschwinden, sehen aus wie ein Fehler — sie bleiben.
- Beträge, die je nach Linienrichtung über/unter der Spitze wechseln, springen —
  fest über dem Punkt, mit Halo.
- Der erste Animationsframe kann eine negative Zeitdifferenz liefern (Tag −1,
  NaN im Chart) — geklemmt im Baustein.
- Im Video gibt es keine CSS-Variablen und keine Web-Fonts: Farben aus
  `tokens[...]`, Schrift auf dem SVG-Klon setzen (`lib/race-video.ts`).
