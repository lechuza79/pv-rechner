import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Wächter gegen offene Punkte ohne Wecker.
 *
 * Der Anlass (07/2026): In zwei wächter-gepflegten Configs stand je ein bewusst
 * vertagter Punkt als Kommentar — der Speicher-Wirkungsgrad im Balkon-Rechner
 * ("90 % ist eine Herstellerangabe, 85 % wäre ehrlicher") und die Heiz-Effizienz
 * im Klima-Rechner ("scop steht noch am Typenschild, seer schon nicht mehr").
 * Beide Male war das Vertagen richtig: die Werte verschieben Nutzer-Ergebnisse
 * und gehören nicht im Vorbeigehen geändert. Falsch war nur, dass nichts sie
 * wieder auf den Tisch gebracht hat. Der Quartals-Wächter meldete sie als
 * "weiterhin offen", das Runbook trug ein "beim nächsten Lauf entscheiden" —
 * und so hätte es beliebig lange weitergehen können.
 *
 * CLAUDE.md sagt dazu: kein "TODO 2027 anpassen", das ist eine tickende Bombe
 * ohne Wecker. Dieser Test IST der Wecker. Er verbietet den offenen Punkt nicht,
 * er verlangt nur eine Frist — und schlägt an, sobald sie verstreicht.
 *
 * Wer die Frist reißt, hat drei ehrliche Antworten:
 *   1. Punkt auflösen (Wert belegen, Kommentar durch die Herleitung ersetzen).
 *   2. Frist verlängern — sichtbar, mit Begründung, im selben Commit.
 *   3. Punkt schließen: "so gewollt" begründen und den Marker entfernen.
 * Was NICHT geht: den Marker still stehen lassen.
 */

const ROOT = join(__dirname, "..", "..");

/** Configs, deren Werte ein Wächter turnusmäßig prüft (alle mit validFrom/reviewBy). */
const CONFIGS = [
  "lib/aircon-config.ts",
  "lib/balkon-config.ts",
  "lib/co2-config.ts",
  "lib/feedin-config.ts",
  "lib/freiflaeche-config.ts",
  "lib/greengas-config.ts",
  "lib/marktwert-config.ts",
  "lib/heatpump-config.ts",
  "lib/prices-config.ts",
];

/**
 * Die Runbooks gehören genauso dazu — und zwar aus demselben Grund.
 *
 * Nachgesehen am 19.08.2026: Die Hälfte aller vertagten Punkte des Projekts steht
 * gar nicht in einer Config, sondern im Runbook des zuständigen Wächters (allein
 * `scripts/waermepumpe-verify.md` führt drei). Ein Marker dort war bis dahin von
 * nichts überwacht — er stand im selben Dokument, das der Lauf ohnehin liest, und
 * genau deshalb fiel er niemandem auf: Wer ihn liest, liest ihn jedes Quartal
 * wieder und hakt ihn jedes Quartal wieder nicht ab. Dieselbe Fehlerklasse wie
 * beim eingefrorenen Prüfdatum.
 *
 * Gelesen wird das Verzeichnis, nicht eine Liste: Ein neues Runbook soll unter
 * Beobachtung stehen, ohne dass jemand daran denken muss.
 */
const RUNBOOKS = "scripts/*-verify.md";

/** Alle überwachten Dateien, relativ zur Wurzel. */
function dateien(): string[] {
  const runbooks = readdirSync(join(ROOT, "scripts"))
    .filter(n => n.endsWith("-verify.md"))
    .sort()
    .map(n => `scripts/${n}`);
  // Ein Scan über ein leeres Verzeichnis meldet fälschlich „alles sauber".
  if (runbooks.length === 0) throw new Error(`keine Runbooks gefunden (${RUNBOOKS})`);
  return [...CONFIGS, ...runbooks];
}

/** Ein Marker, der einen unerledigten Punkt anzeigt. */
const MARKER = /\b(OFFEN|OFFENER PUNKT|TODO|FIXME)\b/;

/**
 * Pflicht-Form der Frist: `OFFEN (bis MM/JJJJ)`.
 * Bewusst monatsgenau statt taggenau — die Wächter laufen im Quartalsrhythmus,
 * ein Tagesdatum würde Genauigkeit vortäuschen, die es nicht gibt.
 */
const FRIST = /\b(?:OFFEN|OFFENER PUNKT|TODO|FIXME)\b[^)\n]*?\(bis (\d{2})\/(\d{4})\)/;

/**
 * Rückverweise auf einen anderswo geführten Punkt. Sie tragen selbst keine Frist,
 * weil sie keine eigene ist — die Frist steht an der Stelle, auf die sie zeigen.
 * Erkennbar am Verweis, nicht an einer Ausnahmeliste: wer `siehe "…"` schreibt,
 * sagt damit, wo der Punkt wirklich geführt wird.
 */
const RUECKVERWEIS = /siehe\s+["„»]?(?:OFFEN|TODO)/i;

/** Letzter Tag des Monats — eine Frist "bis 10/2026" läuft am 31.10.2026 ab. */
function fristEnde(monat: number, jahr: number): Date {
  return new Date(jahr, monat, 0, 23, 59, 59);
}

describe("Wächter: offene Punkte haben eine Frist", () => {
  it("jeder offene Punkt in Config oder Runbook nennt eine Frist (bis MM/JJJJ)", () => {
    const ohneFrist: string[] = [];

    for (const rel of dateien()) {
      readFileSync(join(ROOT, rel), "utf8").split("\n").forEach((zeile, i) => {
        if (!MARKER.test(zeile)) return;
        if (RUECKVERWEIS.test(zeile)) return;
        if (FRIST.test(zeile)) return;
        ohneFrist.push(`${rel}:${i + 1}  ${zeile.trim()}`);
      });
    }

    // Bei einem Treffer: Frist ergänzen — `OFFEN (bis 10/2026)` — oder den Punkt
    // auflösen. Die Regex aufweichen ist nie die Lösung; sie ist der einzige
    // Grund, warum ein vertagter Punkt überhaupt wiederkommt.
    expect(ohneFrist, "offener Punkt ohne Frist").toEqual([]);
  });

  it("keine Frist ist verstrichen", () => {
    const heute = new Date();
    const abgelaufen: string[] = [];

    for (const rel of dateien()) {
      readFileSync(join(ROOT, rel), "utf8").split("\n").forEach((zeile, i) => {
        const treffer = FRIST.exec(zeile);
        if (!treffer) return;
        const [, mm, jjjj] = treffer;
        const ende = fristEnde(Number(mm), Number(jjjj));
        if (ende >= heute) return;
        abgelaufen.push(`${rel}:${i + 1}  Frist ${mm}/${jjjj} abgelaufen — ${zeile.trim()}`);
      });
    }

    // Jetzt entscheiden: auflösen, Frist begründet verlängern oder Punkt schließen.
    expect(abgelaufen, "Frist eines offenen Punkts verstrichen").toEqual([]);
  });

  it("prüft Configs und Runbooks wirklich (Schutz gegen einen leerlaufenden Wächter)", () => {
    // Ein Scan-Test, der nichts findet, weil er nichts liest, meldet fälschlich
    // "alles sauber". Deshalb: die Dateien müssen existieren und Inhalt haben.
    for (const rel of dateien()) {
      expect(readFileSync(join(ROOT, rel), "utf8").length, `${rel} nicht lesbar`).toBeGreaterThan(200);
    }
  });
});
