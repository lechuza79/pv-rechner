import { describe, it, expect } from "vitest";
import { dbProbeVerdict, dbProbeVerdictRelativ } from "../../scripts/health-check";

/**
 * Der Wächter misst die teuersten Atlas-Datenbankabfragen einzeln — als
 * Frühindikator VOR den Seitenzeiten.
 *
 * WARUM ER EXISTIERT (28.07.2026): Jede Gemeindeseite kostete zwei vollständige
 * Durchläufe über 591.024 Zeilen, weil der Präfix als Parameter statt als
 * Literal in der Abfrage stand und der Index dadurch unbenutzt blieb (Begründung
 * im Kopf von lib/mastr-region-sql.ts). Allein aufgerufen lud die Seite trotzdem
 * in ~1,2 s — grün. Erst wenn mehrere Seiten gleichzeitig aufgebaut wurden,
 * stauten sich die Durchläufe und rissen die 8-Sekunden-Notbremse. Die
 * Seitenmessung konnte das prinzipiell nicht sehen; die Abfragemessung schon.
 *
 * Diese Tests nageln die Schwellen fest. Sie hochzusetzen, damit ein Befund
 * verschwindet, ist ausdrücklich verboten (CLAUDE.md, Grenzen des Autofix) —
 * dann fällt hier der Test, und das ist Absicht.
 */
describe("Wächter: Bewertung der Atlas-Datenbankabfragen", () => {
  it("hält den gesunden Zustand für grün", () => {
    // Gemessen nach dem Fix: 76–94 ms, praktisch reine Netzlaufzeit.
    for (const ms of [40, 76, 94, 150, 249]) {
      expect(dbProbeVerdict(ms)).toBe("gruen");
    }
  });

  it("warnt im Zwischenbereich, ohne zu melden", () => {
    for (const ms of [250, 300, 399]) {
      expect(dbProbeVerdict(ms)).toBe("gelb");
    }
  });

  it("schlägt beim Rückfall auf den vollen Tabellendurchlauf an", () => {
    // Der kaputte Zustand lag bei 570–650 ms je Aufruf. Er MUSS rot sein,
    // sonst kommt genau der Ausfall zurück, der diesen Test veranlasst hat.
    for (const ms of [400, 570, 600, 650, 8000]) {
      expect(dbProbeVerdict(ms)).toBe("rot");
    }
  });

  it("lässt zwischen gesund und kaputt keine Lücke", () => {
    // Kein Wert darf unbewertet durchfallen — jede Millisekunde hat ein Urteil.
    for (let ms = 0; ms <= 1000; ms += 1) {
      expect(["gruen", "gelb", "rot"]).toContain(dbProbeVerdict(ms));
    }
  });
});

describe("Wächter: Last ist kein Rückfall", () => {
  /**
   * Am 28.07.2026 meldete der Check 562/576 ms und damit ROT, obwohl die
   * Datenbank-Funktionen unverändert richtig waren — parallel lief ein
   * Auswertungs-Skript gegen dieselbe Datenbank. Zehn Minuten später: 62–94 ms.
   * Ein Wächter, der bei jedem Analyse-Lauf anschlägt, wird nach zwei Wochen
   * weggefiltert, und dann geht auch der echte Befund unter.
   *
   * Die Schwellen bleiben, wo sie sind. Gewertet wird der Abstand zu einem
   * leichten Vergleichs-Read im selben Lauf.
   */
  it("meldet nicht, wenn die ganze Datenbank langsam ist", () => {
    // Beides langsam, die Abfrage kostet kaum mehr als der Vergleichs-Read:
    // beschäftigte Datenbank, kein struktureller Fehler.
    expect(dbProbeVerdictRelativ(562, 520)).toBe("gruen");
    expect(dbProbeVerdictRelativ(600, 540)).toBe("gruen");
  });

  it("meldet weiterhin, wenn NUR die Atlas-Abfrage langsam ist", () => {
    // Genau der behobene Fehler: Vergleichs-Read schnell, Abfrage ~600 ms.
    expect(dbProbeVerdictRelativ(620, 80)).toBe("rot");
    expect(dbProbeVerdictRelativ(562, 75)).toBe("rot");
    // Auch aus der GitHub-Action heraus (höhere Netzlaufzeit) muss es rot sein.
    expect(dbProbeVerdictRelativ(700, 150)).toBe("rot");
  });

  it("hält den gesunden Zustand grün — lokal wie in der Action", () => {
    expect(dbProbeVerdictRelativ(80, 75)).toBe("gruen");
    expect(dbProbeVerdictRelativ(150, 140)).toBe("gruen");
  });

  it("wird ohne Vergleichs-Read nicht milder", () => {
    // Scheitert der Vergleichs-Read (0 ms), gilt wieder die harte Schwelle.
    expect(dbProbeVerdictRelativ(620, 0)).toBe("rot");
    expect(dbProbeVerdictRelativ(80, 0)).toBe("gruen");
  });
});

/**
 * Messtreue: eine EINZELNE Messung trägt die Aussage nicht.
 *
 * Am 28.07.2026, direkt nach dem Einbau des Vergleichs-Reads, meldete der Check
 * erneut ROT („Gemeinde-Kennzahlen 553 ms gegen Vergleichs-Read 211 ms").
 * Vier Wiederholungen derselben Abfrage ergaben 297 / 102 / 368 / 83 ms —
 * Faktor 4 zwischen identischen Aufrufen. Der Vergleichs-Read fängt
 * gleichzeitige Last ab, aber nicht dieses Rauschen.
 *
 * Deshalb wird jede Abfrage mehrfach gemessen und die SCHNELLSTE gewertet:
 * Störungen machen eine Messung nur langsamer, nie schneller. Diese Tests
 * halten fest, dass das den echten Rückfall NICHT verdeckt.
 */
describe("Messtreue: schnellste aus mehreren Messungen", () => {
  const schnellste = (werte: number[]) => Math.min(...werte);

  it("schluckt Streuung, solange die schnellste Messung gesund ist", () => {
    // Die echte Messreihe vom 28.07.2026 gegen einen Vergleichs-Read von 100 ms.
    expect(dbProbeVerdictRelativ(schnellste([297, 102, 368, 83]), 100)).toBe("gruen");
  });

  it("meldet weiterhin, wenn ALLE Messungen langsam sind", () => {
    // Der echte Rückfall aus dem Juli: konstant ~600 ms, keine Ausreißer.
    expect(dbProbeVerdictRelativ(schnellste([612, 588, 640]), 80)).toBe("rot");
  });

  it("lässt sich von einem einzigen schnellen Treffer nicht beruhigen, wenn er trotzdem hoch ist", () => {
    // Streuung auf hohem Niveau: auch die schnellste Messung liegt weit über
    // dem Vergleichs-Read — das ist ein Befund, kein Rauschen.
    expect(dbProbeVerdictRelativ(schnellste([900, 780, 520]), 90)).toBe("rot");
  });
});
