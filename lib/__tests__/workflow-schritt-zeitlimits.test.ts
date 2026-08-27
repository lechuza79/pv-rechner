import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

/**
 * WARUM ES DIESEN TEST GIBT (gemessen am 27.08.2026)
 *
 * Ein Job, der sein Zeitlimit reißt, endet „cancelled". Rot sieht man —
 * „abgebrochen" liest man als „egal"; dieselbe Lehre wie beim Förder-Wächter,
 * der so vom 20. bis 23.08.2026 vier Tage lang stumm ausfiel. Reißt dagegen ein
 * einzelner SCHRITT sein eigenes Limit, endet er „failure": Der Lauf ist rot,
 * und die Schritte danach kommen trotzdem noch dran.
 *
 * Der Anlass war kein Gedankenspiel: Der Smoke-Job riss am 26.08.2026 wirklich
 * sein 15-Minuten-Limit (Lauf 32946344841, 15,3 min, „cancelled"), nachdem der
 * Testschritt binnen einer Woche von 5,4 auf 11,4 Minuten im Median gewachsen
 * war — gewollte Arbeit, der Ergebnis-Läufer kam am 24.08. dazu.
 *
 * Die zweite Hälfte ist die wichtigere und war der eigentliche Fallstrick:
 * Ein Schritt-Limit ist WIRKUNGSLOS, solange das Job-Limit darunter liegt. Dann
 * reißt wieder der Job zuerst, und der Ausgang ist erneut „cancelled" — die
 * Änderung sähe im Diff richtig aus und änderte nichts.
 */

const WURZEL = resolve(__dirname, "..", "..", ".github", "workflows");

/** Die Schritte, die wirklich Zeit fressen — Testläufe gegen einen Browser. */
const TEURE_SCHRITTE = /npm run test:(e2e|flows)\b/;

type Job = { datei: string; name: string; jobLimit: number | null; schrittLimits: number[]; text: string };

/**
 * Zerlegt eine Workflow-Datei in ihre Jobs.
 *
 * Bewusst über die EINRÜCKUNGSTIEFE der Job-Überschrift und nicht über einen
 * YAML-Parser: Den gibt es im Projekt nicht, und ein neuer Baustein für eine
 * Handvoll Zeilen wäre Overengineering. Geprüft werden ohnehin nur Zahlen und
 * Vorhandensein — nie Formatierung; ein Test, der Textzeilen vergleicht, wird
 * von jedem Aufräumlauf rot und lässt echte Defekte durch.
 */
function jobs(datei: string): Job[] {
  const text = readFileSync(resolve(WURZEL, datei), "utf8");
  const zeilen = text.split("\n");
  const start = zeilen.findIndex((z) => /^jobs:\s*$/.test(z));
  if (start < 0) return [];

  const gefunden: Job[] = [];
  let aktuell: { name: string; ab: number } | null = null;
  const schliesse = (bis: number) => {
    if (!aktuell) return;
    const block = zeilen.slice(aktuell.ab, bis).join("\n");
    const alle = [...block.matchAll(/^(\s*)timeout-minutes:\s*(\d+)/gm)].map((m) => ({
      tiefe: m[1].length,
      wert: Number(m[2]),
    }));
    // Das Job-Limit steht direkt unter dem Job-Namen (Tiefe 4), Schritt-Limits
    // tiefer im Block (Tiefe 8). Über die Tiefe unterscheidbar, nicht über die
    // Größe des Werts — ein Schritt darf größer sein als ein anderes Job-Limit.
    const flach = Math.min(...alle.map((a) => a.tiefe));
    gefunden.push({
      datei,
      name: aktuell.name,
      jobLimit: alle.find((a) => a.tiefe === flach)?.wert ?? null,
      schrittLimits: alle.filter((a) => a.tiefe > flach).map((a) => a.wert),
      text: block,
    });
    aktuell = null;
  };

  for (let i = start + 1; i < zeilen.length; i++) {
    const treffer = /^ {2}([A-Za-z0-9_-]+):\s*$/.exec(zeilen[i]);
    if (treffer) {
      schliesse(i);
      aktuell = { name: treffer[1], ab: i };
    }
  }
  schliesse(zeilen.length);
  return gefunden;
}

const ALLE_JOBS = readdirSync(WURZEL)
  .filter((d) => d.endsWith(".yml"))
  .flatMap(jobs);

const MIT_TESTSCHRITT = ALLE_JOBS.filter((j) => TEURE_SCHRITTE.test(j.text));

describe("Zeitlimits der Browser-Test-Workflows", () => {
  it("findet die Jobs überhaupt — sonst prüft der Test nichts und meldet trotzdem grün", () => {
    // Die Gegenprobe zum Test selbst: Eine Zerlegung, die leer ausgeht, vergleicht
    // „nichts" mit „nichts" und ist grün. Genau davor warnt die Projektanleitung.
    expect(ALLE_JOBS.length).toBeGreaterThan(3);
    expect(MIT_TESTSCHRITT.map((j) => `${j.datei}::${j.name}`).sort()).toEqual([
      "ci.yml::flows",
      "ci.yml::test",
      "flows-nightly.yml::flows-alle",
    ]);
  });

  it.each(MIT_TESTSCHRITT.map((j) => [`${j.datei} :: ${j.name}`, j] as const))(
    "%s — der Testschritt trägt ein eigenes Zeitlimit",
    (_beschriftung, job) => {
      const zeilen = job.text.split("\n");
      const testschritt = zeilen.findIndex((z) => TEURE_SCHRITTE.test(z));
      // Das Limit steht im selben Schritt, also in den wenigen Zeilen davor —
      // zwischen `- name:` und `run:`.
      const schrittAnfang = zeilen
        .slice(0, testschritt)
        .reduce((letzter, z, i) => (/^\s*- name:/.test(z) ? i : letzter), 0);
      const kopf = zeilen.slice(schrittAnfang, testschritt + 1).join("\n");
      expect(kopf).toMatch(/^\s*timeout-minutes:\s*\d+/m);
    },
  );

  it.each(MIT_TESTSCHRITT.map((j) => [`${j.datei} :: ${j.name}`, j] as const))(
    "%s — das Job-Limit liegt über der Summe der Schritt-Limits",
    (_beschriftung, job) => {
      // Ohne Angabe gilt GitHubs Vorgabe von 360 Minuten je Job.
      const jobLimit = job.jobLimit ?? 360;
      const summe = job.schrittLimits.reduce((a, b) => a + b, 0);
      expect(summe).toBeGreaterThan(0);
      expect(summe).toBeLessThan(jobLimit);
    },
  );
});
