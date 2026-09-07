import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { FLOWS, flowTestTitel, flowGrep, FLOW_TITEL_MARKE } from "../../e2e/flows";
import { flowJobs } from "../../scripts/flow-matrix";

/**
 * WARUM ES DIESEN TEST GIBT (07.09.2026)
 *
 * Der nächtliche Flow-Lauf läuft seit heute je Flow in einem eigenen Job und
 * wählt seinen Teil über `--grep`. Damit hängt die ABDECKUNG an einer
 * Zeichenkette — und eine Zeichenkette, die nicht mehr trifft, macht den Job
 * nicht rot, sondern GRÜN: Playwright meldet „keine Tests" und der Job ist
 * durch. Ein grüner Lauf, der nichts sieht, ist schlimmer als gar keiner.
 *
 * Beim Bauen ist genau das einmal passiert und wurde von der Gegenprobe im
 * Matrix-Skript gefangen: Die Marke für den Sammel-Job war mit `^` verankert.
 * Playwright vergleicht `--grep` aber nicht mit dem Testtitel, sondern mit dem
 * ganzen Pfad davor („[flows] › e2e/flows.spec.ts:358:7 › Flow „…""). Der Anker
 * traf deshalb nie, und der Sammel-Job hätte alle neun Tests ein ZWEITES Mal
 * gelaufen — zwei Stunden Rechenzeit für nichts, und niemand hätte es gesehen.
 *
 * Dieser Test hält die Struktur fest. Ob die Ausdrücke wirklich treffen, kann
 * er nicht sagen — das beantwortet nur Playwright selbst, und deshalb ruft der
 * nächtliche Lauf `npm run flows:matrix -- --pruefen`, bevor er die Jobs
 * startet.
 */

const WURZEL = resolve(__dirname, "..", "..");
const workflow = readFileSync(resolve(WURZEL, ".github/workflows/flows-nightly.yml"), "utf8");
const spec = readFileSync(resolve(WURZEL, "e2e/flows.spec.ts"), "utf8");

describe("Aufteilung des nächtlichen Flow-Laufs", () => {
  it("gibt jedem Flow einen eigenen Job", () => {
    const jobs = flowJobs();
    for (const flow of FLOWS) {
      expect(jobs.map((j) => j.name)).toContain(flow.name);
    }
    // Ein Job je Flow plus genau EIN Sammel-Job.
    expect(jobs).toHaveLength(FLOWS.length + 1);
  });

  it("fängt alles Übrige mit genau einem Sammel-Job ein", () => {
    const sammler = flowJobs().filter((j) => j.flag === "--grep-invert");
    expect(sammler).toHaveLength(1);
    expect(sammler[0].muster).toBe(FLOW_TITEL_MARKE);
  });

  it("verankert die Marke des Sammel-Jobs NICHT", () => {
    // Der Fehlgriff vom 07.09.2026: `--grep` vergleicht mit dem ganzen Pfad
    // („[flows] › datei › Titel"), ein `^` am Titelanfang trifft deshalb nie —
    // und der Sammel-Job hätte still den gesamten Bestand doppelt gelaufen.
    expect(FLOW_TITEL_MARKE.startsWith("^")).toBe(false);
    // Und sie muss in einem echten Flow-Titel wirklich vorkommen, sonst
    // schliesst der Sammel-Job nichts aus.
    expect(flowTestTitel(FLOWS[0].name)).toContain(FLOW_TITEL_MARKE);
  });

  it("maskiert Sonderzeichen im Flow-Namen", () => {
    // Heute trägt kein Name eines; ein künftiger mit Klammer würde ohne
    // Maskierung entweder zu viel treffen oder gar nichts.
    expect(flowGrep("Ab (2027)")).toContain("\\(2027\\)");
    expect(new RegExp(flowGrep("Ab (2027)")).test(flowTestTitel("Ab (2027)"))).toBe(true);
  });

  it("erzeugt für jeden Job einen Ausdruck, der seinen eigenen Titel trifft", () => {
    for (const flow of FLOWS) {
      const job = flowJobs().find((j) => j.name === flow.name);
      expect(job, `kein Job für „${flow.name}"`).toBeDefined();
      const muster = new RegExp(job!.muster);
      expect(muster.test(flowTestTitel(flow.name))).toBe(true);
      // Und keinen anderen — sonst liefe ein Flow zweimal und ein anderer nie.
      for (const fremd of FLOWS.filter((f) => f.name !== flow.name)) {
        expect(muster.test(flowTestTitel(fremd.name))).toBe(false);
      }
    }
  });

  it("tippt den Testtitel nicht ein zweites Mal", () => {
    // Der Läufer muss den Titel aus derselben Funktion nehmen wie die
    // Aufteilung. Eine eigene Vorlage im Läufer würde beim ersten Umformulieren
    // dazu führen, dass jeder Job auf null Tests läuft.
    expect(spec).toContain("flowTestTitel(flow.name)");
    expect(spec).not.toMatch(/test\(`Flow /);
  });

  it("führt in der Workflow-Datei keine zweite Namensliste", () => {
    // Die Matrix kommt aus dem Skript. Stünde ein Flow-Name in einer WIRKSAMEN
    // Zeile des Workflows, wäre das die zweite Wahrheit, gegen die dieser ganze
    // Aufbau gebaut ist.
    //
    // Kommentarzeilen sind ausgenommen, und zwar bewusst: Dort steht die
    // datierte Messung, aus der die Aufteilung hervorging. Sie beschreibt eine
    // Nacht im September 2026 und darf altern — sie steuert nichts.
    const wirksam = workflow
      .split("\n")
      .filter((z) => !/^\s*#/.test(z))
      .join("\n");
    for (const flow of FLOWS) {
      expect(wirksam, `„${flow.name}" steht in einer wirksamen Zeile des Workflows`).not.toContain(
        flow.name,
      );
    }
    expect(wirksam).toContain("scripts/flow-matrix.ts");
  });

  it("prüft die Aufteilung, bevor sie Jobs startet", () => {
    // Ohne diesen Schritt merkt niemand, dass ein Ausdruck ins Leere greift.
    expect(workflow).toContain("--pruefen");
  });

  it("lässt höchstens drei Bauläufe gleichzeitig auf die Datenbank", () => {
    // Jeder Job baut die Seite vollständig und liest dafür die echte Datenbank.
    // Ohne Grenze ginge die nächtliche Bau-Last von einem auf acht gleichzeitige
    // Bauläufe. An Wanduhr gewinnt das nichts — der längste Flow bestimmt
    // ohnehin das Ende —, also gibt es keinen Grund, die Last zu verachtfachen.
    // VORSICHTSMASSNAHME, KEINE MESSUNG: Der Messversuch am 07.09.2026 lief aus
    // einem Arbeitsstand ohne Zugangsdaten und ist wertlos; die Begründung steht
    // ausführlich in der Workflow-Datei.
    const treffer = workflow.match(/max-parallel:\s*(\d+)/);
    expect(treffer, "keine Grenze für gleichzeitige Jobs").not.toBeNull();
    expect(Number(treffer![1])).toBeLessThanOrEqual(3);
  });

  it("lässt einen gerissenen Flow die anderen nicht abwürgen", () => {
    // Sonst enden die übrigen „cancelled", und das liest sich als „egal"
    // statt als „nicht geprüft" — dieselbe Lehre wie beim Job-Zeitlimit.
    expect(workflow).toMatch(/fail-fast:\s*false/);
  });
});
