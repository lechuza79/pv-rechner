import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { laufStumm, LAUF_STUMM_AB, GEPLANTE_LAEUFE } from "../../scripts/health-check";

// GEMESSEN AM 23.08.2026: Der Förder-Seiten-Wächter endete vom 20. bis 23.08.
// viermal in Folge mit `cancelled` — das Job-Zeitlimit von 35 Minuten reichte
// dem gewachsenen Seitenbestand nicht mehr. Vier Tage lang fielen damit die
// Schritte am Ende des Laufs aus: Technik-Einordnung, Screening und Leseliste,
// also die Arbeit an der Katalog-Vollständigkeit.
//
// Gemeldet hat das NICHTS. Der Prüfstand (`stand:faellig`) war vollständig grün,
// und das zu Recht: Er merkt einen Ausfall daran, dass ein Prüfdatum sich nicht
// mehr bewegt — ein GitHub-Workflow stempelt aber keins. Der Ausfall eines
// geplanten Laufs war dort strukturell unsichtbar.
//
// Dazu kommt, dass `cancelled` sich harmlos liest. Rot sieht man; „abgebrochen"
// liest man als „egal" — dabei ist ein Lauf ohne Urteil der schlechtere Fall,
// weil niemand weiß, wie weit er kam.
describe("Geplante Läufe, die nicht mehr durchkommen", () => {
  it("meldet nichts, solange ein Lauf zuletzt erfolgreich war", () => {
    expect(laufStumm(["success", "cancelled", "cancelled", "cancelled"]).stumm).toBe(false);
    // Auch mittendrin: ein Erfolg in den jungen Läufen heißt, er kommt durch.
    expect(laufStumm(["cancelled", "success", "cancelled"]).stumm).toBe(false);
  });

  it("meldet den Anlassfall: viermal abgebrochen in Folge", () => {
    const befund = laufStumm(["cancelled", "cancelled", "cancelled", "cancelled", "success"]);
    expect(befund.stumm).toBe(true);
    // Die Endung wird BENANNT, nicht zu „nicht erfolgreich" verallgemeinert —
    // „cancelled" sagt Zeitlimit und führt zur richtigen Frage (welcher Schritt
    // frisst die Zeit, kommen die danach noch dran?).
    expect(befund.wie).toBe("cancelled");
  });

  it("meldet auch dauerhaft rote Läufe, mit ihrer eigenen Endung", () => {
    expect(laufStumm(["failure", "failure", "failure"])).toEqual({ stumm: true, wie: "failure" });
  });

  it("behauptet nichts, wenn wir gar nicht nachsehen konnten", () => {
    // Ohne Token liefert die GitHub-Abfrage eine leere Liste. Daraus „der Lauf
    // ist stumm" zu machen wäre dieselbe Fehlerklasse wie ein Prüfdatum ohne
    // Prüfung: eine Behauptung über etwas, das niemand gesehen hat.
    expect(laufStumm([]).stumm).toBe(false);
    expect(laufStumm(["cancelled"]).stumm).toBe(false);
    expect(laufStumm(["cancelled", "cancelled"]).stumm).toBe(false);
  });

  it("beobachtet die geplanten Läufe — und ausdrücklich nicht die push-getriebenen", () => {
    const dateien = GEPLANTE_LAEUFE.map((l) => l.datei);
    expect(dateien).toContain("foerder-watch.yml");
    // CI und Autofix hängen an einem Push. Ihr Ausbleiben heißt „niemand hat
    // etwas geschoben", nicht „der Lauf ist kaputt" — sie hier zu beobachten
    // erzeugte einen Fehlalarm an jedem ruhigen Wochenende.
    expect(dateien).not.toContain("ci.yml");
    expect(dateien).not.toContain("claude-autofix.yml");
    // Und der Gesundheitscheck selbst gehört nicht in die Liste: Wenn DER nicht
    // läuft, läuft auch diese Prüfung nicht. Dafür gibt es die Eskalation nach
    // drei roten Läufen an anderer Stelle.
    expect(dateien).not.toContain("health-check.yml");
  });

  // Diese Prüfung ist aus einem Fehler beim Schreiben der Liste entstanden:
  // `gsc-sitemap.yml` stand darin, weil ich seinen Zeitplan ANGENOMMEN habe. Sie
  // hat nur `workflow_dispatch` — der Melder hätte also gemeldet, dass ein Lauf
  // nicht läuft, den niemand angestoßen hat. Deshalb liest der Test die Zeitpläne
  // aus den Dateien, statt sie in einer zweiten Liste zu wiederholen.
  it("jeder Eintrag hat wirklich einen TÄGLICHEN Zeitplan", () => {
    const wurzel = resolve(__dirname, "..", "..");
    for (const lauf of GEPLANTE_LAEUFE) {
      const pfad = resolve(wurzel, ".github", "workflows", lauf.datei);
      expect(existsSync(pfad), `${lauf.datei} gibt es nicht`).toBe(true);

      const text = readFileSync(pfad, "utf8");
      const crons = [...text.matchAll(/^\s*-\s*cron:\s*["']([^"']+)["']/gm)].map((m) => m[1]);
      expect(crons.length, `${lauf.datei} hat keinen Zeitplan — dann kann sein Ausbleiben kein Befund sein`).toBeGreaterThan(0);

      // Täglich heißt: Tag-des-Monats und Monat stehen auf "*". Ein monatlicher
      // Lauf ("0 5 6 * *") bräuchte bei drei Läufen ein Vierteljahr, bis dieser
      // Melder anschlägt — zu spät, um noch nützlich zu sein.
      for (const cron of crons) {
        const [, , tag, monat] = cron.trim().split(/\s+/);
        expect(
          `${tag}${monat}`,
          `${lauf.datei} läuft nicht täglich (${cron}) — drei erfolglose Läufe wären hier Monate`,
        ).toBe("**");
      }
    }
  });

  it("die Schwelle ist drei Läufe — darunter ist es ein Ausrutscher", () => {
    expect(LAUF_STUMM_AB).toBe(3);
    const knappDrunter = Array.from({ length: LAUF_STUMM_AB - 1 }, () => "cancelled");
    expect(laufStumm(knappDrunter).stumm).toBe(false);
    const genau = Array.from({ length: LAUF_STUMM_AB }, () => "cancelled");
    expect(laufStumm(genau).stumm).toBe(true);
  });
});
