import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { CHART_KATALOG, NOCH_IN_DER_ROUTE } from "../chart-katalog";

// Dieser Test hält den Katalog ehrlich. Ohne ihn wäre er eine Liste, die beim
// ersten neuen Chart veraltet — und dann baut die nächste Session wieder nach,
// was es längst gibt (genau so entstand am 08.08.2026 ein zweites
// Erneuerbaren-Radial).

const ROOT = join(__dirname, "..", "..");
const KOMPONENTEN = join(ROOT, "components");
const EMBEDS = join(ROOT, "app", "(embed)", "embed");

/** Dateien, die zwar „Chart" im Namen tragen, aber keine Darstellung sind. */
const KEINE_CHARTS = new Set(["WidgetExport", "WidgetAutoHeight", "ChartActionBar", "ChartExportBar", "Chart"]);

function tsxDateien(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith(".tsx")).map((f) => f.replace(/\.tsx$/, ""));
}

describe("Chart-Katalog", () => {
  it("jede Datei in components/charts/ steht im Katalog", () => {
    const verzeichnet = new Set(CHART_KATALOG.map((e) => e.datei));
    const fehlend = tsxDateien(join(KOMPONENTEN, "charts"))
      .filter((f) => !KEINE_CHARTS.has(f))
      .filter((f) => !verzeichnet.has(`charts/${f}`));
    expect(
      fehlend,
      `Nicht im Katalog (lib/chart-katalog.ts): ${fehlend.join(", ")}. ` +
        "Eintragen — sonst findet die nächste Session den Baustein nicht und baut ihn nach.",
    ).toEqual([]);
  });

  it("kein Katalog-Eintrag zeigt auf eine Datei, die es nicht gibt", () => {
    const tot = CHART_KATALOG.filter((e) => !existsSync(join(KOMPONENTEN, `${e.datei}.tsx`)));
    expect(tot.map((e) => e.datei), "Katalog nennt Dateien, die es nicht (mehr) gibt").toEqual([]);
  });

  it("jeder Eintrag sagt in einem ganzen Satz, wofür er da ist", () => {
    for (const e of CHART_KATALOG) {
      expect(e.wofuer.length, `${e.datei}: zu knapp`).toBeGreaterThan(25);
      expect(e.wofuer.endsWith("."), `${e.datei}: kein ganzer Satz`).toBe(true);
    }
  });

  // Der eigentliche Fehler war nicht die fehlende Liste, sondern der Ort: Das
  // Erzeugungs-Widget lag in seiner Einbett-Route. Wer in components/ sucht,
  // findet so etwas nie.
  it("Einbett-Routen sind Hüllen — die Implementierung liegt in components/", () => {
    if (!existsSync(EMBEDS)) return;
    const dick: string[] = [];
    for (const name of readdirSync(EMBEDS)) {
      const client = join(EMBEDS, name, "client.tsx");
      if (!existsSync(client)) continue;
      const quelle = readFileSync(client, "utf8");
      // Das Maß ist NICHT die Länge — eine Hülle darf ruhig Theme und Flags
      // auswerten (Grüngas: 52 Zeilen und trotzdem vorbildlich). Es zählt, ob
      // die Darstellung aus components/ kommt oder in der Route steckt.
      const holtAusComponents = /from "(\.\.\/)+components\//.test(quelle);
      if (!holtAusComponents && !NOCH_IN_DER_ROUTE.includes(name)) {
        dick.push(`${name} (${quelle.split("\n").length} Zeilen, kein Import aus components/)`);
      }
    }
    expect(
      dick,
      `Widget-Logik steckt in der Route statt in components/: ${dick.join(", ")}. ` +
        "Komponente nach components/ ziehen, Route re-exportiert sie nur.",
    ).toEqual([]);
  });

  it("die Schuldenliste wird nur kürzer, nie länger", () => {
    // Sie war am 08.08.2026 sieben Einträge lang (sechs bekannte plus eine,
    // die dieser Test selbst gefunden hat). Wer eine Route umzieht, nimmt sie
    // hier raus; wer eine neue dicke Route baut, kommt hier nicht durch.
    expect(NOCH_IN_DER_ROUTE.length).toBeLessThanOrEqual(7);
    for (const name of NOCH_IN_DER_ROUTE) {
      expect(existsSync(join(EMBEDS, name)), `${name} steht auf der Schuldenliste, existiert aber nicht mehr`).toBe(true);
    }
  });
});
