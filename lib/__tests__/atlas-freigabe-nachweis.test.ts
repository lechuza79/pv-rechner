import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { FREIGABE_NACHWEIS, freigabeMoeglich, atlasLevelReleased, type AtlasLevel } from "../atlas-index";

/**
 * Keine Atlas-Ebene geht live, ohne dass zwei Fragen beantwortet sind.
 *
 * WARUM ES DIESEN TEST GIBT (18.08.2026): An einem einzigen Tag stand zweimal
 * eine Freigabe unmittelbar vor dem Livegang, für die alle vorhandenen Prüfungen
 * grün waren — und beide Male fehlte dieselbe Prüfung.
 *
 *   Vormittags empfahl der Wellen-Monitor die Kreisebene: Self-Check 17/17, alle
 *   Stichproben indexiert, Kaltrender mit 6,2 s Luft. Niemand hatte gefragt, ob
 *   auf dieser Ebene überhaupt gesucht wird. Antwort: nein — beim Wettbewerber
 *   trägt 1 von 139 Platzierungen das Wort „Kreis".
 *
 *   Abends zeigte ein adversarialer Prüfer, dass unsere Förder-Stadtseiten längst
 *   auf genau den Ortsanfragen stehen, auf die die Gemeindeseiten zielen. Die
 *   Ortswelle hätte die eigene Kollision freigeschaltet.
 *
 * Ein Merksatz im Runbook hätte das nicht verhindert: Der Wellen-Monitor HATTE
 * ein Runbook, und seine Freigabekriterien waren erfüllt. Ein Runbook beschreibt,
 * was jemand prüfen soll; dieser Test verhindert, dass die Freigabe ohne die
 * Prüfung überhaupt committet werden kann.
 *
 * Der Test bewertet NICHT, ob die Messung gut war — das kann er nicht. Er
 * erzwingt nur, dass sie stattgefunden hat und nachlesbar ist.
 */

/**
 * Ebenen, die vor Einführung dieser Regel live gingen (Welle 0a, Juli 2026).
 *
 * Bewusst als Ausnahmeliste und nicht als nachträglich eingetragener Nachweis:
 * Ein erfundenes Prüfdatum ist in diesem Projekt schon einmal teuer geworden
 * (Förderprogramme, „Zuletzt geprüft" aus `updated_at`). Die Liste darf nicht
 * wachsen — jede neue Ebene braucht den echten Nachweis.
 */
const VOR_DER_REGEL: AtlasLevel[] = ["de", "bundesland"];

const ALLE: AtlasLevel[] = ["de", "bundesland", "landkreis", "gemeinde"];

describe("Atlas-Freigabe: kein Livegang ohne Nachweis", () => {
  it("jede freigeschaltete Ebene hat einen Nachweis — oder steht auf der Altbestandsliste", () => {
    for (const level of ALLE) {
      if (!atlasLevelReleased(level)) continue;
      if (VOR_DER_REGEL.includes(level)) continue;
      const nachweis = FREIGABE_NACHWEIS[level];
      expect(
        nachweis,
        `Ebene „${level}" ist freigeschaltet, aber FREIGABE_NACHWEIS ist leer. ` +
          `Vor dem Livegang zu beantworten und dort einzutragen: (1) Wird auf dieser Ebene ` +
          `gesucht — Suchvolumen plus Wettbewerbs-Gegenprobe? (2) Steht auf denselben ` +
          `Anfragen schon eine andere eigene Seitenfamilie, insbesondere die Förderseiten?`,
      ).not.toBeNull();
    }
  });

  it("die Altbestandsliste wächst nicht", () => {
    // Wer eine weitere Ebene hier einträgt, statt sie zu messen, hebelt den Test
    // aus. Deshalb ist die Liste selbst festgenagelt.
    expect(VOR_DER_REGEL).toEqual(["de", "bundesland"]);
  });

  it("jeder hinterlegte Nachweis ist vollständig und datiert", () => {
    for (const level of ALLE) {
      const n = FREIGABE_NACHWEIS[level];
      if (!n) continue;
      expect(n.gemessenAm, `${level}: Datum fehlt`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      // Keine Platzhalter: Beide Antworten müssen etwas sagen, nicht nur „geprüft".
      expect(n.nachfrage.length, `${level}: Antwort zur Nachfrage zu dünn`).toBeGreaterThan(40);
      expect(
        n.kannibalisierung.length,
        `${level}: Antwort zur Kannibalisierung zu dünn`,
      ).toBeGreaterThan(40);
      expect(n.beleg, `${level}: Beleg fehlt`).toMatch(/^docs\//);
    }
  });

  it("die Belege existieren wirklich", () => {
    const root = join(__dirname, "..", "..");
    for (const level of ALLE) {
      const n = FREIGABE_NACHWEIS[level];
      if (!n) continue;
      expect(() => readFileSync(join(root, n.beleg), "utf8"), `${level}: ${n.beleg} fehlt`).not.toThrow();
    }
  });

  it("freigabeMoeglich nennt bei fehlendem Nachweis beide offenen Fragen", () => {
    const urteil = freigabeMoeglich("gemeinde");
    expect(urteil.ok).toBe(false);
    // Der Grund muss die Kannibalisierung ausdrücklich erwähnen — sie ist die
    // Frage, die am 18.08.2026 gefehlt hat, und die man am leichtesten vergisst.
    expect(urteil.grund.toLowerCase()).toContain("förderseiten");
    expect(urteil.grund.toLowerCase()).toContain("gesucht");
  });

  it("die Kreisebene bleibt gesperrt, solange ihr Nachweis mit Nein beginnt", () => {
    const n = FREIGABE_NACHWEIS.landkreis;
    expect(n).not.toBeNull();
    // Der hinterlegte Nachweis sagt ausdrücklich, dass dort NICHT gesucht wird.
    // Solange das so dokumentiert ist, darf die Ebene nicht live sein.
    if (n && /^nein/i.test(n.nachfrage)) {
      expect(
        atlasLevelReleased("landkreis"),
        "Der Nachweis für die Kreisebene beginnt mit 'Nein' (dort wird nicht gesucht), " +
          "die Ebene ist aber freigeschaltet. Entweder ist die Messung überholt — dann " +
          "gehört sie ersetzt — oder die Freischaltung ist ein Versehen.",
      ).toBe(false);
    }
  });
});
