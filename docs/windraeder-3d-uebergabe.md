# Auftrag: Windräder einer Gemeinde in 3D zeichnen (Prototyp)

Du arbeitest im Repo solar-check.io (pv-rechner). Lies zuerst `AGENTS.md` und `CLAUDE.md` vollständig, zusätzlich `docs/frontend-mit-codex.md` und `docs/landkreis-vorschau.md`. Die Regeln dort gelten. Das betrifft vor allem die Worktree-Arbeit, dass du erst `npm run sessions` ausführst, dass Zahlen und Einheiten nur aus den Formatier-Funktionen kommen, dass Browser-Tests gegen den Build laufen und dass du keinen Merge ohne Abnahme machst.

## Ziel

Du baust eine 3D-Szene, die für EINE Gemeinde ihre Fläche und die Windräder darauf zeigt. Jedes Windrad steht an seinem echten Standort und hat seine echte Nabenhöhe und seinen echten Rotordurchmesser, maßstäblich zueinander. Das ist ein Prototyp auf einer eigenen Vorschau-Seite mit „nicht indexieren“. Er wird noch in keine öffentliche Seite eingebaut.

Nimm diese Testgemeinden, die sich bewusst unterscheiden:

| Gemeinde | Schlüssel | Windräder in Betrieb | Warum |
|---|---|---|---|
| Bad Wünnenberg | 05774040 | 194 | sehr viele Anlagen, Mittelgebirge |
| Wangerland | 03455020 | 120 | Küste, flach, 6 Anlagen ohne Koordinate |
| Hinte | 03452011 | 118 | kleine Fläche, dicht besetzt |
| Fehmarn | 01055046 | 88 | Insel, Fläche aus mehreren Teilen |
| Sydower Fließ | 12060250 | 20 | wenige große Anlagen |
| Heringen (Werra) | 06632009 | 17 | Gemeinde, die uns bereits veröffentlicht hat |

## Daten

### Windräder

Die Windräder stehen in der Supabase-Tabelle `mastr_wind_anlagen`, eine Zeile je Windrad. Die Tabelle ist nur mit dem Service-Key lesbar (`SUPABASE_SERVICE_KEY` aus `.env.local`, serverseitig). Befüllt wird sie über `scripts/mastr-wind-anlagen.ts`, die Tabellendefinition steht in `lib/mastr-wind-sql.ts`. Quelle ist das Marktstammdatenregister der Bundesnetzagentur, Lizenz dl-de/by-2-0. Die Quellenangabe kommt aus `lib/data-sources.ts` und wird nie von Hand getippt.

Relevante Spalten:

- `status`: `35` = in Betrieb, `31` = in Planung, `37` = vorübergehend stillgelegt, `38` = stillgelegt. Für den Prototyp zeichnest du nur `35`.
- `lage`: `Windkraft an Land` oder `Windkraft auf See`. Du zeichnest nur an Land.
- `lat`, `lon`: der Standort (WGS84). Er kann `null` sein. Solche Anlagen zeichnest du nicht, erfindest keinen Standort und nennst ihre Zahl sichtbar.
- `nabenhoehe_m`, `rotor_m`: beide in Metern. Sie können `null` sein. Dann bekommt die Anlage keine erfundene Größe, sondern eine erkennbar neutrale Darstellung, und ihre Zahl steht dabei.
- `brutto_kw`: Leistung in kW. In der Beschriftung formatierst du sie über die vorhandenen Formatier-Funktionen, nie mit einer angeklebten Einheit.
- `hersteller`, `typ`, `windpark`, `inbetriebnahme`: für den Hover bzw. Tooltip.
- `region_id`: der Gemeindeschlüssel laut Register. Siehe die Falle unten.

### Gemeindefläche

Die Fläche kommt aus `public/geo/gemeinden/<5-stelliger Kreisschlüssel>.geo.json` (BKG VG250, Lizenz dl-de/by-2-0). Das Feature findest du über `properties.id` gleich dem 8-stelligen Gemeindeschlüssel. Die Umrisse sind vereinfacht, etwa 18 %, und liegen deshalb an den Grenzen bis zu einigen hundert Metern daneben.

## Die eine Falle: Zuordnung per Koordinate, nicht per Registerschlüssel

Gemessen am 27.09.2026 an 29.370 laufenden Windrädern mit Koordinate und Gemeinde:

- Nur **79 %** liegen mit ihrer Koordinate in der Gemeinde, die das Register ihnen zuordnet.
- Bei rund 2.700 ist die Abweichung kleiner als 2 km. Das ist überwiegend unser vereinfachter Umriss.
- Rund 4.600 liegen eindeutig in einer Nachbargemeinde desselben Kreises. Der Registerschlüssel und die Koordinate widersprechen sich also. Schon der erste Datensatz im Register trägt drei verschiedene Ortsangaben: Gemeinde, Gemarkung und Ort.

Daraus folgt die Regel für die Zeichnung: **Ein Windrad gehört in die Szene, wenn seine Koordinate in der Gemeindefläche liegt**, mit einem Puffer von 500 m um den vereinfachten Umriss. Welchen Gemeindeschlüssel es im Register trägt, spielt dafür keine Rolle. Sonst steht ein Windrad sichtbar außerhalb der Fläche, auf der es angeblich steht, und Anlagen, die wirklich dort stehen, fehlen.

- Die Auswahl machst du über die Koordinaten aller Windräder, nicht über `region_id`. Hol vorab per Begrenzungsrahmen der Fläche plus Puffer nur die Kandidaten aus der Tabelle; es gibt keine Tabelle ohne Filter und keine 43.000 Zeilen im Browser.
- Unterscheidet sich die Zahl von der Registerzählung für die Gemeinde, steht beides sichtbar da. Zum Beispiel: „194 Windräder stehen auf der Gemarkung, 3 davon ordnet das Register einer Nachbargemeinde zu.“
- Die Punkt-in-Fläche-Prüfung gibt es schon in `lib/region-perspektive.ts` (`insidePolygon`). Benutze sie, statt eine zweite zu schreiben.
- Ob die Koordinaten den Mast wirklich treffen, ist ungeprüft. Vergleiche vor der Abnahme an mindestens zehn Anlagen aus zwei Testgemeinden die Koordinate mit einem Luftbild, zum Beispiel über die frei zugänglichen Luftbilder der Länder. Leg das Ergebnis mit Zahlen im Übergabebericht ab.

## Darstellung

- **Die vorhandene Szene wiederverwenden, nicht neu bauen.** `components/landkreis/RegionScene.tsx` und `components/landkreis/region-scene.ts` zeigen schon Gemeindeflächen in Three.js, mit extrudierten Flächen samt Löchern und Teilflächen, Umrissen, Licht, Schatten, Drehen per Maus und Touch, pausiertem Rendern außerhalb des sichtbaren Bereichs und vollständigem Aufräumen beim Entfernen. Die Touch-Bedienung ist dort am 26.09.2026 mühsam korrekt gemacht worden; nicht zurückbauen. Projektion und Geometrie liefert `lib/region-perspektive.ts`. Ist der Bestand für eine einzelne Gemeinde ungeeignet, sag, warum, bevor du eine zweite Szene anlegst.
- **Maßstab ist der Punkt.** Nabenhöhe und Rotor stehen im selben Maßstab wie die Fläche. Eine Anlage aus dem Jahr 2000 (etwa 70 m Nabe) und eine von 2025 (etwa 140 m Nabe, 140 m Rotor) müssen sichtbar verschieden groß sein. Gemessen im Bestand: Vor 2005 lag der Schnitt bei 72 m Nabe und 59 m Rotor, seit 2024 bei 136 m Nabe und 140 m Rotor. Wird die Höhe gegenüber der Fläche überhöht, damit man überhaupt etwas sieht, dann mit **einem** Faktor für alle Anlagen, und der Faktor steht sichtbar an der Szene.
- Die Rotoren drehen sich langsam. Bei „weniger Bewegung“ bleiben sie stehen, wie im Bestand die Drehung der Szene.
- Gestaltung: dieselbe einfarbige Anmutung wie die Landkreis-Szene, Farben nur aus den Theme-Tokens (`lib/theme.ts`). Keine erfundenen Bäume, Straßen oder Häuser. Was nicht aus Daten kommt, zeichnest du nicht.
- Hover oder Tippen auf ein Windrad zeigt Windpark, Hersteller und Typ, Leistung, Nabenhöhe, Rotor und Inbetriebnahmejahr. Fehlende Angaben stehen als „nicht im Register“, nie als 0.
- Ohne WebGL gibt es einen Ersatz: eine Liste der Windräder mit denselben Angaben.
- Performance: 194 Anlagen in Bad Wünnenberg müssen flüssig laufen. Rotor und Turm teilen sich Geometrie und Material über alle Anlagen (Instancing oder gemeinsame Geometrie), wie bei den Bäumen der Landkreis-Szene.

## Datenzugriff

Die Seite liest serverseitig, mit weichem Zeitbudget und Schutzschalter wie die übrigen Lesemodule (siehe „Jeder Datenbank-Read im Seitenaufbau hat ein Zeitbudget“ in `CLAUDE.md`), und gibt dem Browser nur die Anlagen dieser Gemeinde mit. Der Anon-Key reicht nicht, und die Tabelle wird dafür NICHT geöffnet.

## Prüfen und abgeben

- Unit-Test für die Auswahl per Koordinate: Innen, außen, im Puffer, ohne Koordinate und über mehrere Teilflächen (Fehmarn). Baue ihn absichtlich einmal kaputt und sieh ihn rot werden.
- Browser-Test gegen den Build auf 375 px und Desktop: Die Szene lädt, die Zahl der gezeichneten Anlagen stimmt mit der Datenauswahl überein, es gibt keinen seitlichen Überlauf und der Ersatz ohne WebGL funktioniert.
- Screenshots aller sechs Testgemeinden für die Abnahme. Die Abnahme macht der Betreiber im Browser; nicht selbst mergen.
- Übergabebericht mit dem, was gemessen wurde, und dem, was ungeprüft ist, darunter Luftbild-Abgleich und echte Geräte.

## Nicht Teil dieses Auftrags

Strommenge und Ertrag der Windräder: Das Ertragsmodell entsteht in einer anderen Sitzung aus Wetterdaten und Nabenhöhe und ist noch nicht kalibriert. Zeige keine kWh- oder MWh-Zahl. Außerdem nicht Teil dieses Auftrags sind Abregelung, geplante und stillgelegte Anlagen sowie der Einbau in die Gemeindeseite.
