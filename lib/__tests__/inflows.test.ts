import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { INFLOWS, RECHNER_DATEIEN, betroffeneDateien } from "../inflows";

// Der Mechanismus hinter lib/inflows.ts: Die Liste sagt, welche Frage in welchen
// Rechner gehört und an welchen Ort. Dieser Test liest die Rechner-Dateien und
// prüft sie dagegen — in BEIDE Richtungen.
//
// Er ersetzt das, was bisher nur im Kopf stand und deshalb dreimal danebenging:
// eine Angabe im Flow gefragt, im Ergebnis nicht erreichbar; eine Angabe
// erfragt, aber nicht durchgereicht; eine Zahl im Vorschaubild anders gerechnet
// als auf der Seite. Ein Test kann das dritte nicht sehen, die ersten beiden
// sehr wohl.

const wurzel = join(__dirname, "..", "..");
const lies = (datei: string) => readFileSync(join(wurzel, datei), "utf8");

/** Name des Bausteins aus seinem Pfad — "components/DachField.tsx" → "DachField". */
const bausteinName = (pfad: string) => pfad.split("/").pop()!.replace(/\.tsx?$/, "");

describe("Inflows: jede Frage steht dort, wo sie stehen muss", () => {
  it.each(INFLOWS.map(i => [i.id, i] as const))("%s ist in jedem vorgesehenen Rechner eingebaut", (_id, inflow) => {
    const name = bausteinName(inflow.komponente);
    for (const einbau of inflow.einbau) {
      const quelle = lies(einbau.datei);
      // Import + je Ort eine Verwendung. Der Import allein zählt nicht — genau
      // so sah der Empfehlungs-Flow aus, als er den Haustyp erfragte und dann
      // nicht weitergab.
      expect(quelle, `${einbau.datei} importiert ${name} nicht`).toContain(`from "../../../components/${name}"`);
      const verwendungen = quelle.split(`<${name}`).length - 1;
      expect(
        verwendungen,
        `${einbau.datei} verwendet <${name}> ${verwendungen}×, erwartet ${einbau.orte.length} (${einbau.orte.join(" + ")})`,
      ).toBe(einbau.orte.length);
    }
  });

  it.each(INFLOWS.map(i => [i.id, i] as const))("%s taucht nicht auf, wo es ausgenommen ist", (_id, inflow) => {
    const name = bausteinName(inflow.komponente);
    for (const aus of inflow.ausgenommen) {
      const quelle = lies(aus.datei);
      expect(
        quelle.includes(`<${name}`),
        `${aus.datei} verwendet ${name}, ist aber als ausgenommen geführt — Eintrag in lib/inflows.ts anpassen`,
      ).toBe(false);
    }
  });

  it.each(INFLOWS.map(i => [i.id, i] as const))("%s trifft eine Aussage über JEDEN Rechner", (_id, inflow) => {
    // Ein neuer Rechner darf nicht stillschweigend durchs Raster fallen: er
    // muss entweder eingebaut oder mit Grund ausgenommen sein.
    const abgedeckt = new Set(betroffeneDateien(inflow));
    const fehlend = RECHNER_DATEIEN.filter(d => !abgedeckt.has(d));
    expect(
      fehlend,
      `lib/inflows.ts sagt nichts über: ${fehlend.join(", ")} — einbauen oder mit Grund ausnehmen`,
    ).toEqual([]);
  });

  it("jede Ausnahme und jeder fehlende Ort trägt eine Begründung", () => {
    for (const inflow of INFLOWS) {
      for (const aus of inflow.ausgenommen) {
        expect(aus.grund.length, `${inflow.id} → ${aus.datei}`).toBeGreaterThan(30);
      }
      for (const einbau of inflow.einbau) {
        // Wer nur an einem Ort steht, muss sagen warum — sonst ist „nur im Flow"
        // von „im Ergebnis vergessen" nicht zu unterscheiden.
        if (einbau.orte.length < 2) {
          expect(
            einbau.begruendung?.length ?? 0,
            `${inflow.id} → ${einbau.datei} steht nur in ${einbau.orte.join("/")}, ohne Begründung`,
          ).toBeGreaterThan(30);
        }
      }
    }
  });

  it("der Folge-Text kommt aus dem Rechenkern, nicht aus der Oberfläche", () => {
    for (const inflow of INFLOWS) {
      expect(inflow.folgeText, inflow.id).toMatch(/ in lib\//);
    }
  });

  it("offene Punkte tragen eine Frist", () => {
    // Gleiche Regel wie in den Wächter-Configs: ein „OFFEN" ohne Datum ist eine
    // Bombe ohne Wecker. Der Test schlägt an, sobald die Frist abgelaufen ist.
    const heute = new Date();
    for (const inflow of INFLOWS) {
      for (const aus of inflow.ausgenommen) {
        const treffer = aus.grund.match(/OFFEN \(bis (\d{2})\/(\d{4})\)/);
        if (!aus.grund.includes("OFFEN")) continue;
        expect(treffer, `${inflow.id} → ${aus.datei}: "OFFEN" ohne Frist im Format OFFEN (bis MM/JJJJ)`).not.toBeNull();
        const [, monat, jahr] = treffer!;
        const frist = new Date(Number(jahr), Number(monat), 0);
        expect(
          frist >= heute,
          `${inflow.id} → ${aus.datei}: Frist ${monat}/${jahr} abgelaufen — entscheiden statt verlängern`,
        ).toBe(true);
      }
    }
  });
});
