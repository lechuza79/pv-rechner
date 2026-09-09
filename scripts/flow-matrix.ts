/**
 * Die Aufteilung des nächtlichen Flow-Laufs auf mehrere Jobs — abgeleitet, nie
 * getippt.
 *
 * WARUM ES DAS GIBT (gemessen 07.09.2026): Der nächtliche Lauf klickte alle
 * Flows nacheinander in EINEM Job durch und stand damit bei 258 von 280
 * erlaubten Minuten — 92 %. Am 05.09. hat er das Limit gerissen. Die Verteilung
 * war bis dahin unbekannt; sie ist es nicht mehr:
 *
 *   PV-Rechner              1.728 Wege   149 min   58 %
 *   Wärmepumpen-Rechner     1.120 Wege    71 min   28 %
 *   PV-Bedarf / Empfehlung    288 Wege    24 min    9 %
 *   Klimaanlagen-Rechner      144 Wege     5 min
 *   Förder-Check Frankfurt     90 Wege     3 min
 *   Einspeisevergütung         60 Wege     3 min
 *   Balkonkraftwerk-Rechner    32 Wege     1 min
 *
 * Zwei Flows tragen 86 % der Zeit. Je Flow ein eigener Job macht daraus einen
 * längsten Job von rund 150 Minuten — ohne einen einzigen Weg weniger zu
 * prüfen. Das ist der Unterschied zu den beiden Alternativen: Das Zeitlimit
 * anzuheben verschöbe den Abbruch nur (und das Gate verbietet genau diesen Zug),
 * und weniger Kombinationen zu gehen wäre weniger Abdeckung.
 *
 * MEHR ARBEITER IM SELBEN JOB WÄRE DER FALSCHE WEG und ist bereits gemessen
 * verworfen: Unter Parallellast erzeugte der Läufer am 18.08.2026 Fehlalarme
 * („Option ließ sich nicht wählen") gegen einen gemeinsamen Server. Getrennte
 * JOBS teilen nichts — jeder baut und startet seinen eigenen Server und bleibt
 * bei einem Arbeiter.
 *
 * DIE NAMEN STEHEN HIER NICHT. Sie kommen aus `FLOWS`, also aus derselben
 * Quelle, aus der der Läufer seine Tests erzeugt. Eine zweite Liste in der
 * Workflow-Datei wäre der Fehler, den dieses Projekt kennt: Sie driftet, und
 * ein Job mit einem veralteten Namen liefe auf null Tests — grün, ohne etwas
 * geprüft zu haben.
 *
 * GEGEN GENAU DAS PRÜFT `--pruefen`: Es fragt Playwright, wie viele Tests jeder
 * Ausdruck wirklich trifft, und verlangt, dass jeder Job mindestens einen Test
 * bekommt und alle Jobs zusammen exakt den ganzen Bestand abdecken — kein Test
 * doppelt, keiner vergessen.
 */
import { execFileSync } from "node:child_process";

import { FLOWS, flowGrep, FLOW_TITEL_MARKE } from "../e2e/flows";

export interface FlowJob {
  /** Klartext-Name des Jobs in der Actions-Oberfläche. */
  name: string;
  /** `--grep` oder `--grep-invert`. */
  flag: "--grep" | "--grep-invert";
  /**
   * Der Ausdruck dazu — als EIGENES Feld, nicht als fertige Kommandozeile.
   *
   * Der Workflow reicht beide über Umgebungsvariablen weiter und ruft
   * `… "$FLAG" "$MUSTER"`. Eine zusammengesetzte Zeichenkette direkt in die
   * `run:`-Zeile zu interpolieren hiesse, die Anführungszeichen der Shell zu
   * überlassen — und der Ausdruck enthält bereits welche. Zwei Felder haben
   * dieses Problem gar nicht erst.
   */
  muster: string;
}

/**
 * Ein Job je Flow, plus EIN Sammel-Job für alles andere.
 *
 * Der Sammel-Job wählt über `--grep-invert`, nicht über eine Aufzählung der
 * beiden Buchhaltungs-Tests: So läuft ein künftiger Test, der kein Flow ist,
 * automatisch mit, statt still liegenzubleiben.
 */
export function flowJobs(): FlowJob[] {
  const jeFlow: FlowJob[] = FLOWS.map((f) => ({
    name: f.name,
    flag: "--grep" as const,
    muster: flowGrep(f.name),
  }));
  return [
    ...jeFlow,
    { name: "Übrige Prüfungen", flag: "--grep-invert" as const, muster: FLOW_TITEL_MARKE },
  ];
}

/** Wie viele Tests trifft dieser Ausdruck? Playwright gefragt, nicht geraten. */
function trefferZahl(flag: string, muster: string): number {
  const argv = ["playwright", "test", "--project=flows", "--list", "--reporter=json", flag, muster];
  const roh = execFileSync("npx", argv, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const daten = JSON.parse(roh) as { suites?: unknown[] };
  return zaehleTests(daten);
}

function zaehleTests(knoten: unknown): number {
  if (!knoten || typeof knoten !== "object") return 0;
  const k = knoten as Record<string, unknown>;
  let summe = Array.isArray(k.specs) ? k.specs.length : 0;
  for (const kind of (Array.isArray(k.suites) ? k.suites : []) as unknown[]) summe += zaehleTests(kind);
  return summe;
}

function pruefe(): void {
  const jobs = flowJobs();
  const gesamt = trefferZahl("--grep-invert", "DIESEN-TITEL-GIBT-ES-NICHT");
  let summe = 0;
  const zeilen: string[] = [];
  for (const job of jobs) {
    const n = trefferZahl(job.flag, job.muster);
    summe += n;
    zeilen.push(`  ${n} Test(s)  ${job.name}`);
    if (n === 0) {
      console.error(zeilen.join("\n"));
      throw new Error(
        `Der Job „${job.name}" trifft KEINEN Test. Ein Job ohne Tests läuft grün durch und ` +
          `prüft nichts — vermutlich hat sich ein Flow-Name oder der Testtitel geändert.`,
      );
    }
  }
  console.error(zeilen.join("\n"));
  if (summe !== gesamt) {
    throw new Error(
      `Die Jobs decken ${summe} Tests ab, der Läufer hat ${gesamt}. ` +
        `Entweder läuft ein Test doppelt oder gar nicht.`,
    );
  }
  console.error(`OK — ${jobs.length} Jobs decken alle ${gesamt} Tests genau einmal ab.`);
}

if (require.main === module) {
  if (process.argv.includes("--pruefen")) pruefe();
  // Die Matrix selbst geht nach stdout, die Prüfausgabe nach stderr: So kann der
  // Workflow beides in einem Schritt tun, ohne dass die Meldungen in der
  // Matrix landen.
  else console.log(JSON.stringify(flowJobs()));
}
