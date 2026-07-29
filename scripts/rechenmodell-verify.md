# Rechenmodell-Council — Runbook

**Zweck:** Die Rechenmodelle aller Rechner (PV, Wärmepumpe, Balkon, Klima,
Simulation) regelmäßig **adversarial** prüfen — also mit dem Auftrag, Fehler zu
finden, nicht die Arbeit zu bestätigen.

## Warum es diesen Wächter gibt — BLOCKER-Begründung

Der Betreiber ist UX-Architekt und programmiert nicht. Bei sichtbaren Änderungen
nimmt er das **Aussehen** ab; die **Zahlen** kann er nicht abnehmen, und zwar
nicht aus Bequemlichkeit, sondern weil es unmöglich ist. Seine Worte am
28.07.2026: „ich kann nichts abnehmen, weil das viel zu komplex ist als das ich
einen fehler bemerken könnte. das musst du über prüfmechanismen sicherstellen."

Das ist zutreffend. An diesem Tag traten vier Fehler auf, von denen **keiner** im
Browser sichtbar war:

| Fehler | Wirkung | Sichtbar? |
|---|---|---|
| Alter Kessel (80 % Nutzungsgrad) als NEU eingebaute Heizung gerechnet | ~14.000 € zugunsten der Wärmepumpe | nein — eine Zahl sieht man ihren Wirkungsgrad nicht an |
| Beimischungspflicht gerechnet, Anschaffung der Heizung nicht angesetzt | ~9.000 € | nein |
| „Heizlast" meinte an zwei Stellen zwei Größen | 18 % größere Anlage bei DIN-Eingabe | nein |
| Aufschlüsselung rechnete anderes Szenario als die Überschrift | bis 29.000 € Widerspruch | nur, wenn man beide Zahlen von Hand vergleicht |

Alle vier haben dieselbe Form: **ein Kostenblock stammt aus dem einen Fall, ein
anderer aus dem anderen.** Danach ist gezielt zu suchen.

## Zwei Stufen — was der Test kann und was nicht

1. **`lib/__tests__/modell-kohaerenz.test.ts`** läuft bei jedem Commit
   (Pre-commit-Hook) und fängt die **bekannten** Fehlerklassen: keine halben
   Fälle, eine Größe = eine Bedeutung, Bilanz geht auf, Skalen wachsen mit,
   Beschriftung folgt der Rechnung.
2. **Dieser Wächter** sucht das **Unbekannte**. Ein Test prüft nur, was jemand
   vorher als Frage formuliert hat — die Funde vom 28.07.2026 kamen von Prüfern,
   die frei suchen durften. Beides zusammen, nicht eins statt des anderen.

## Vorgehen je Lauf

Zuerst `scripts/waechter-gate.md` lesen — es hat Vorrang vor diesem Runbook.
Dann **drei unabhängige Prüfer** spawnen, jeder mit dem ausdrücklichen Auftrag zu
WIDERLEGEN, nicht zu bestätigen. Keiner darf die Befunde der anderen sehen:

**Prüfer 1 — Rechenweg.** Misst mit echten Aufrufen über ein Kreuzprodukt von
Eingaben (Fläche, alle Dämmstufen, alle Heizsysteme, beide Anlagentypen, alle
Brennstoffe, Szenarien, Grenzwerte). Sucht: Bilanzlücken, Kurve ≠ Summe,
Monotonie-Verstöße (bessere Dämmung muss Bedarf, Heizlast, Strom und Kosten
senken), NaN/Infinity, Vorzeichenfehler, Werte, die über einen Eingabeweg
durchschlagen (`override`, Szenario-Wrapper, UI-Pfad).

**Prüfer 2 — Text gegen Zahl.** Geht jede Oberfläche durch, die Zahlen zeigt, und
fragt bei jeder: Sagt die Beschriftung dasselbe, was die Zahl misst? Stimmt der
Nenner? Trägt ein Mittelwert überhaupt? Ist die Einheit die richtige — und steht
sie an der Zahl statt im Fließtext? Besonders: Aufrufer geteilter Funktionen,
deren Begleittext nicht mitgewandert ist (siehe CLAUDE.md → „Wer eine geteilte
Rechenfunktion ändert, prüft die BEGLEITTEXTE aller Aufrufer").

**Prüfer 3 — Modellprämissen.** Fragt für jeden Rechner: Welchen Fall bildet er
ab, und ist er in sich geschlossen? Kommt irgendwo ein Kostenblock aus einem
anderen Fall als der Rest? Rechnen zwei Rechner dieselbe Größe verschieden?
Steht eine Annahme im Code, die der Kommentar daneben verneint?

**Bei Rechtsbezug** zusätzlich ein Legal-Judge nach dem Gate (Zustand korrekt,
Fundstelle amtlich, Formulierung deckungsgleich, Pflicht mit ihren Ausnahmen).

## Apply-Politik

- **Bilanz-, Einheiten- und Kohärenzfehler mit eindeutiger Antwort: selbst fixen**
  (Worktree, Test dazu, `[auto]`-Commit, mergen). Es gibt genau eine richtige
  Antwort, wenn eine Summe nicht aufgeht oder eine Einheit falsch ist.
- **Jeder Fund wird zu einem Test**, bevor er gefixt wird — sonst kommt er wieder.
  Der Test gehört in `modell-kohaerenz.test.ts`, wenn er eine Klasse beschreibt,
  sonst in den Fach-Test des Moduls.
- **Modellprämissen (welchen Fall bilden wir ab?) sind Vorschlag an den Menschen.**
  Das ist die eine Frage, die dem Betreiber gehört: Sie hat mehrere vertretbare
  Antworten und verschiebt sichtbare Zahlen. Als `decisions`-Eintrag melden, mit
  Empfehlung und den Zahlen beider Varianten.
- **Schwellen aufweichen ist nie die Lösung.** Wenn ein Kohärenz-Test anschlägt,
  ist entweder das Modell kaputt oder die Regel hat sich geändert — dann ändert
  sich der Test MIT Begründung, nie nur damit er grün wird.

## Rhythmus

Monatlich (scheduled task `solar-check-rechenmodell-council`) und zusätzlich
**immer nach einer Änderung an einer geteilten Rechenfunktion** — die Tabelle in
CLAUDE.md („Geteilte Rechen-Basis") listet, welche das sind. Eine Änderung dort
wirkt sofort in allen Rechnern, und genau dabei sind heute drei der vier Fehler
entstanden.
