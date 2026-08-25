import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { INFLOWS, RECHNER_DATEIEN, betroffeneDateien } from "../inflows";
import { WP_M2_MIN, WP_M2_MAX, WP_M2_PRESETS } from "../constants";

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
      // BEIDE Textfelder, nicht nur die Ausnahmen: Ein „OFFEN" in der
      // Begründung eines Einbauorts wurde bis 25.08.2026 nicht geprüft — die
      // Regel galt breiter als ihr Test, also war sie dort eine Bombe ohne
      // Wecker. Genau die Lücke, die diese Datei sonst bei anderen anmahnt.
      const texte: Array<{ wo: string; text: string }> = [
        ...inflow.ausgenommen.map((a) => ({ wo: a.datei, text: a.grund })),
        ...inflow.einbau
          .filter((e) => e.begruendung)
          .map((e) => ({ wo: e.datei, text: e.begruendung! })),
      ];
      for (const aus of texte) {
        const treffer = aus.text.match(/OFFEN \(bis (\d{2})\/(\d{4})\)/);
        if (!aus.text.includes("OFFEN")) continue;
        expect(treffer, `${inflow.id} → ${aus.wo}: "OFFEN" ohne Frist im Format OFFEN (bis MM/JJJJ)`).not.toBeNull();
        const [, monat, jahr] = treffer!;
        const frist = new Date(Number(jahr), Number(monat), 0);
        expect(
          frist >= heute,
          `${inflow.id} → ${aus.wo}: Frist ${monat}/${jahr} abgelaufen — entscheiden statt verlängern`,
        ).toBe(true);
      }
    }
  });

  // ─── Was der dritte Review-Durchgang gefunden hat ─────────────────────────
  it("Werte mit Nachkommastelle werden auch als solche gelesen", () => {
    // Die Anlagengröße ist in Halbschritten editierbar (step 0,5), wurde aber
    // mit paramInt aus dem Teilen-Link gelesen: 12,5 kWp kamen beim Empfänger
    // als 12 an, mit abweichender Investition und Amortisation. Der Speicher
    // daneben machte es von Anfang an richtig.
    const quelle = lies("app/(site)/photovoltaik-rechner/rechner.tsx");
    for (const [param, feld] of [["ck", "Anlagengröße"], ["sk", "Speichergröße"]] as const) {
      const zeile = quelle.split("\n").find(z => z.includes(`initialParams, "${param}"`));
      expect(zeile, `Parameter ${param} (${feld}) wird nicht gelesen`).toBeTruthy();
      expect(
        zeile,
        `${feld} ist in Halbschritten editierbar — Parameter ${param} muss mit paramFloat gelesen werden, nicht mit paramInt (verschluckt die Nachkommastelle)`,
      ).toContain("paramFloat");
    }
  });

  // ─── Was der zweite Review-Durchgang gefunden hat ─────────────────────────
  it("eine Größe hat überall dieselben Grenzen", () => {
    // Die Wohnfläche wurde im Ergebnis mit 20–1000 m² angeboten, im Flow des
    // Wärmepumpen-Rechners aber nur mit 30–500 geprüft: Ein im Ergebnis
    // eingetragener Wert von 800 wurde eingerechnet und im Flow abgelehnt.
    // Beide Stellen lesen jetzt WP_M2_MIN/MAX — der Test hält das fest, indem
    // er nach hart getippten Grenzen in den Aufrufern sucht.
    const stellen = [
      "components/GebaeudeField.tsx",
      "app/(site)/waermepumpe-rechner/waermepumpe.tsx",
    ];
    // Positiv geprüft: beide Stellen MÜSSEN die geteilten Grenzen nennen. Eine
    // Suche nach hart getippten Zahlen greift hier zu weit — im
    // Wärmepumpen-Rechner stehen daneben die Grenzen der Heizwärme (1.000 bis
    // 80.000 kWh), die nichts mit der Wohnfläche zu tun haben.
    for (const datei of stellen) {
      const quelle = lies(datei);
      expect(quelle, `${datei} nennt WP_M2_MIN nicht`).toContain("WP_M2_MIN");
      expect(quelle, `${datei} nennt WP_M2_MAX nicht`).toContain("WP_M2_MAX");
    }
    expect(WP_M2_MIN).toBeLessThan(WP_M2_MAX);
    // Die Vorschläge müssen innerhalb der Grenzen liegen, sonst bietet die
    // Oberfläche einen Wert an, den die Prüfung ablehnt.
    for (const preset of WP_M2_PRESETS) {
      expect(preset, `Preset ${preset} liegt außerhalb ${WP_M2_MIN}–${WP_M2_MAX}`).toBeGreaterThanOrEqual(WP_M2_MIN);
      expect(preset).toBeLessThanOrEqual(WP_M2_MAX);
    }
  });
});
