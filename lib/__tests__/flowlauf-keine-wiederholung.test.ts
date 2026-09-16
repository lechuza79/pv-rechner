import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * WARUM ES DIESEN TEST GIBT (gemessen 16.09.2026)
 *
 * Der nächtliche Flow-Läufer war fünf Nächte in Folge rot (09. bis 15.09.2026),
 * und die Meldung führte jedes Mal in die Irre: „timed out after 200 minutes",
 * also scheinbar ein zu knappes Zeitlimit. Der Gesundheitscheck riet dreimal,
 * nachzusehen, „was gewachsen ist". Nichts war gewachsen — die Wegezahlen sind
 * seit der Aufteilung am 07.09.2026 unverändert (1.728 und 1.120).
 *
 * Gewachsen war die ZAHL DER DURCHLÄUFE. Im Protokoll jeder roten Nacht steht
 * vor dem Zeitlimit die Zeile „(retry #1)": Der erste Versuch war fehlgeschlagen,
 * und Playwright begann den ganzen Test von vorn. Bei einem Test von 174 bis 182
 * Minuten kann der zweite Durchlauf ein 200-Minuten-Limit PER BAUART nie
 * einhalten — und auch kein größeres, denn GitHubs Job-Obergrenze liegt bei 360
 * Minuten, während zwei Durchläufe des PV-Rechners rund 360 brauchen.
 *
 * DER SCHADEN IST NICHT DER ROTE LAUF, SONDERN DAS VERLORENE URTEIL. Der
 * gebrochene Weg, den der erste Versuch gefunden hatte, wurde vom Zeitlimit
 * überschrieben und stand nirgends mehr. Am 13.09. meldete die Wärmepumpe um
 * 09:24 ihre 1.120 Wege und scheiterte an einer Prüfung; danach lief der
 * Wiederholungslauf 98 Minuten ins Limit, und was er gefunden hatte, ist fort.
 * Dieselbe Lehre wie beim abgebrochenen CI-Lauf: Ein Lauf ohne Urteil ist
 * schlimmer als ein roter.
 *
 * GEPRÜFT WIRD DIE VERWENDUNG, NICHT DAS VORHANDENSEIN: Der Test lädt die
 * Konfiguration mit gesetzten Umgebungsvariablen und liest den Wert, der wirklich
 * herauskommt. Eine Suche nach dem Namen der Variablen im Quelltext wäre die
 * Prüfung, die sich selbst belegt.
 */

const WURZEL = resolve(__dirname, "..", "..");

async function retriesBei(env: Record<string, string | undefined>): Promise<number | undefined> {
  const alt = { ...process.env };
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  vi.resetModules();
  try {
    const mod = await import(resolve(WURZEL, "playwright.config.ts"));
    return (mod.default as { retries?: number }).retries;
  } finally {
    process.env = alt;
  }
}

describe("Der nächtliche Flow-Lauf wiederholt sich nicht", () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => vi.resetModules());

  it("Alle-Kombinationen-Lauf im CI: keine Wiederholung", async () => {
    const r = await retriesBei({ CI: "true", FLOW_ALLE_KOMBINATIONEN: "1" });
    expect(
      r,
      "Ein Test von ~3 Stunden darf nicht wiederholt werden: Der zweite Durchlauf " +
        "passt in kein Zeitlimit und überschreibt dabei den echten Fehlschlag des ersten.",
    ).toBe(0);
  });

  it("Der schnelle Lauf im CI wiederholt weiterhin", async () => {
    const r = await retriesBei({ CI: "true", FLOW_ALLE_KOMBINATIONEN: undefined });
    expect(
      r,
      "Die Wiederholung ist gegen Flattern kurzer Tests gebaut und bleibt dort, " +
        "wo sie hingehört — abgeschaltet wird sie nur für den stundenlangen Nachtlauf.",
    ).toBe(1);
  });

  it("Lokal wird nie wiederholt", async () => {
    expect(await retriesBei({ CI: undefined, FLOW_ALLE_KOMBINATIONEN: undefined })).toBe(0);
    expect(await retriesBei({ CI: undefined, FLOW_ALLE_KOMBINATIONEN: "1" })).toBe(0);
  });

  /**
   * Die Gegenprobe gegen eine Prüfung, die ins Leere greift: Die Abschaltung
   * hängt an einer Umgebungsvariablen, die der nächtliche Workflow setzen MUSS.
   * Setzte er sie nicht (oder schriebe er sie eines Tages anders), wären die
   * Prüfungen oben weiterhin grün und die Wiederholung im Nachtlauf trotzdem an.
   */
  it("Der Nachtlauf setzt die Variable wirklich, an der die Abschaltung hängt", () => {
    const yml = readFileSync(resolve(WURZEL, ".github", "workflows", "flows-nightly.yml"), "utf8");
    expect(
      /FLOW_ALLE_KOMBINATIONEN:\s*["']?1["']?/.test(yml),
      "Ohne diese Variable im Nachtlauf greift die Abschaltung der Wiederholung nie.",
    ).toBe(true);
  });

  /**
   * Und die Begründung selbst, als Zahl festgehalten: Ein zweiter Durchlauf
   * passt nicht ins Schritt-Limit. Wer das Limit künftig anhebt, um die
   * Wiederholung doch zu bezahlen, wird hier rot — und muss dann ausrechnen,
   * dass 2 × 182 Minuten auch über GitHubs Job-Obergrenze von 360 liegen.
   */
  it("Ein zweiter Durchlauf passt nicht in das Schritt-Limit", () => {
    const yml = readFileSync(resolve(WURZEL, ".github", "workflows", "flows-nightly.yml"), "utf8");
    const limits = [...yml.matchAll(/^\s{8}timeout-minutes:\s*(\d+)/gm)].map((m) => Number(m[1]));
    const schrittLimit = Math.max(...limits);
    // Gemessen an den erfolgreichen Einzeljobs vom 08. bis 15.09.2026: der
    // längste erste Versuch des PV-Rechners lag bei 182 Minuten.
    const LAENGSTER_ERSTVERSUCH_MIN = 182;
    expect(
      schrittLimit,
      "Das Schritt-Limit trägt genau EINEN Durchlauf. Wer es über zwei hebt, " +
        "bezahlt eine Wiederholung, die den echten Fehler verdeckt.",
    ).toBeLessThan(2 * LAENGSTER_ERSTVERSUCH_MIN);
    expect(schrittLimit).toBeGreaterThan(LAENGSTER_ERSTVERSUCH_MIN);
  });
});
