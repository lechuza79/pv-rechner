# Briefing: ein Test, der Flows durchklickt UND Antworten ändert

**Stand 17.08.2026.** Auftrag des Betreibers, eigene Session. Dies ist die
Vorlage dafür — der Auftrag ist klein, die Begründung ist der wertvolle Teil.

## Warum es diesen Test braucht

Am 17.08.2026 wurden in einem Umbau der Rechner-Flows **neun Fehler** gefunden.
Nicht von den Tests: 1.258 Unit-Tests und 66 Browser-Tests waren durchgehend
grün. Gefunden haben sie drei unabhängige Review-Durchgänge über den Diff.

Sieben der neun gehören zu **einer** Fehlerklasse: *etwas geht kaputt, wenn eine
Antwort geändert wird, nachdem eine Folgeantwort schon steht.* Die Tests klicken
je einen Weg vorwärts durch und prüfen das Ergebnis — genau dieser Weg
funktionierte immer.

Die beiden schwersten Fälle, als Maßstab, was der Test finden muss:

1. **Dachform wechseln setzte den Ertrag still auf den Bestfall.**
   Satteldach/Nord/45° ergab 450 kWh je kWp. Wechsel auf Flachdach (dort ist
   Nord unzulässig) verwarf die Ausrichtung, ließ die Frage aber als
   „beantwortet" stehen. Sie kam nie wieder, der Dachfaktor fiel auf 1,0 —
   **1.000 kWh je kWp, mehr als das Doppelte.** Die tiefere Ursache: Das
   Ergebnis übergab ein konstantes „alles beantwortet"-Set, in dem eine
   Rücknahme gar nicht wirken konnte.

2. **Ertrag von Hand korrigieren zerriss den Teilen-Link.** Die Eingabe wird auf
   das Standort-Optimum zurückgerechnet, und das muss im Bereich bleiben, den
   der Teilen-Parameter liest. Bei Nordlage lag es immer darüber: Eingabe 700
   ergab 1.556, der Empfänger fiel auf den Default zurück und sah **428 statt
   700** — und der Absender nach einem Neuladen ebenso.

Beide sind unsichtbar: Die Seite zeigt eine plausible Zahl, kein Fehler, kein
Absturz. Genau die Klasse, die dieses Projekt am teuersten bezahlt.

## Was der Test tun soll

Nicht alle Kombinationen — vier Dachformen × vier Ausrichtungen × drei Neigungen
× vier Haustypen wären Tausende Läufe. Sondern **jeden Wechsel**:

1. Einen Flow vollständig beantworten.
2. Dann **eine vorherige Antwort ändern** — jede der Fragen einmal.
3. Nach jedem Wechsel prüfen:
   - Steht jede Frage, die gestellt wurde, noch mit einem Wert da? (Oder ist sie
     als offene Frage sichtbar — beides ist in Ordnung, „leer und zugeklappt"
     ist es nicht.)
   - Nennt die Kopfzeile des Abschnitts, wonach gerechnet wird?
   - Bewegt sich die betroffene Zahl in die erwartete **Richtung**? (Nicht auf
     den exakten Wert prüfen — den decken die Unit-Tests ab.)
   - Passt der Teilen-Link zum Bildschirm? Link öffnen und dieselbe Zahl
     erwarten. Das ist der einzige Weg, Fund 2 zu fangen.

## Wo anfangen

Betroffen sind die Rechner mit den geteilten Frage-Bausteinen:
`components/DachField.tsx` (Dachform → Ausrichtung → Neigung; jede Antwort kann
die nächste ungültig machen) und `components/GebaeudeField.tsx` (Haustyp →
Wohnfläche → Dämmung → Heizsystem). Verbaut in PV-Rechner, Empfehlungs-Flow,
Einspeisevergütung, Wärmepumpe — welcher wo, steht in `lib/inflows.ts`.

Der ergiebigste erste Fall ist der Dachform-Wechsel im PV-Ergebnis: Er hat den
schwersten Fehler produziert und braucht keine Vorbedingungen außer einem
Teilen-Link (`?da=0&az=nord&ng=45`).

## Zwei Fallen der Testumgebung

**Eigener Port, oder der Lauf prüft fremden Code.** `E2E_PORT=<port>` setzen;
der Default 3045 ist bei parallelen Worktrees fast immer belegt, und Playwright
verwendet einen laufenden Server ungefragt weiter. Details in CLAUDE.md unter
„Prüfe, aus welchem Verzeichnis dein Dev-Server läuft".

**Ein Exit-Code hinter einer Pipe ist der der Pipe.** `npx playwright test |
tail` meldet Erfolg, auch wenn 20 Tests fehlschlagen.
