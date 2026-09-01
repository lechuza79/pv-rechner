import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// „Davon 1 mit Angabe Verwaltung" ist bei unseren Stückzahlen KEINE Statistik,
// sondern eine Angabe über einen bestimmten Menschen.
//
// Im Cockpit ist das vertretbar: kleiner Kreis, angemeldete Verwaltung, und die
// Zahl steht neben einer Gemeinde, die wir ohnehin angeschrieben haben. Sobald
// dieselbe Zahl woanders auftaucht — Wochenbericht, Ausfuhr, Sonntagsmail,
// öffentliche Seite —, ist sie eine Aussage über eine einzelne Person an einem
// Ort, an dem niemand mehr sieht, wie klein die Grundmenge ist.
//
// Die Regel als Merksatz zu hinterlegen hätte nichts genützt: Wer in einem
// halben Jahr einen Bericht baut, liest diesen Kommentar nicht. Deshalb eine
// Schranke, die anschlägt, sobald jemand die Zahl aus dem Cockpit herausreicht.
//
// WER SIE ERWEITERN WILL, trägt seine Stelle unten ein — mit ausgeschriebenem
// Grund und der Angabe, ab welcher Menge dort gezählt wird. Eine Untergrenze
// („erst ab 5 nennen") gehört zu jeder Verwendung außerhalb des Cockpits;
// ohne sie steht dort irgendwann „1" für einen namentlich erkennbaren Menschen.
//
// Vorbild: der Einheiten-Wächter und die Technik-Prüfung der Förderseiten —
// beide lesen den Quelltext und halten eine begründete Ausnahmeliste dagegen,
// statt sich auf Aufmerksamkeit zu verlassen.

const ERLAUBT: Record<string, string> = {
  "app/api/admin/kommunen/route.ts":
    "Liefert die Zahl an das Cockpit. Liest die Adressen nicht mit und gibt sie nicht aus.",
  "app/(site)/admin/kommunen/client.tsx":
    "Das Cockpit selbst — hinter Anmeldung, kleiner Kreis, Zahl steht neben der angeschriebenen Gemeinde.",
  "lib/kommunen-auswertung.ts":
    "Rechnet die Summe je Schub für die Auswertung im Cockpit. Sieht keine Eintragungen, " +
    "sondern bekommt fertige Zahlen je Gemeinde hereingereicht.",
  "app/api/admin/kommunen/bilanz/route.ts":
    "Liefert die Auswertung an dasselbe Cockpit — gleiche Anmeldung, gleicher Kreis. " +
    "Die Summe über alle Schübe ist bei kleiner Menge genauso identifizierend wie eine " +
    "einzelne Zeile; sie bleibt deshalb an dieselbe Ansicht gebunden und wird nicht " +
    "weitergereicht.",
  "lib/__tests__/kommunen-abo-spiegel.test.ts": "Die Tests der Zählregel.",
  "lib/__tests__/abo-zahl-bleibt-im-cockpit.test.ts": "Diese Schranke.",
};

const WURZEL = join(__dirname, "..", "..");
const ORDNER = ["app", "lib", "components", "scripts"];
const ENDUNGEN = [".ts", ".tsx"];

function dateien(pfad: string, treffer: string[] = []): string[] {
  for (const eintrag of readdirSync(pfad)) {
    if (eintrag === "node_modules" || eintrag.startsWith(".")) continue;
    const voll = join(pfad, eintrag);
    if (statSync(voll).isDirectory()) dateien(voll, treffer);
    else if (ENDUNGEN.some((e) => eintrag.endsWith(e))) treffer.push(voll);
  }
  return treffer;
}

describe("Die Abo-Zahl bleibt im Cockpit", () => {
  it("wird nirgends sonst gelesen", () => {
    const nutzer: string[] = [];
    for (const ordner of ORDNER) {
      for (const datei of dateien(join(WURZEL, ordner))) {
        if (!readFileSync(datei, "utf8").includes("kommunen-abo-spiegel")) continue;
        nutzer.push(datei.slice(WURZEL.length + 1));
      }
    }
    const unerlaubt = nutzer.filter((n) => !(n in ERLAUBT));
    expect(
      unerlaubt,
      "Die Zahl der Verwaltungs-Eintragungen verlässt das Cockpit. Außerhalb ist sie bei " +
        "unseren Stückzahlen eine Angabe über eine einzelne Person — dort braucht sie eine " +
        "Untergrenze. Stelle mit Begründung in ERLAUBT eintragen.",
    ).toEqual([]);
  });

  // Die Gegenrichtung: Eine Ausnahme, die es nicht mehr gibt, verwässert die
  // Liste, bis niemand mehr weiß, was sie eigentlich schützt.
  it("führt keine Ausnahme, die es nicht mehr gibt", () => {
    const alle = ORDNER.flatMap((o) => dateien(join(WURZEL, o))).map((d) => d.slice(WURZEL.length + 1));
    const verwaist = Object.keys(ERLAUBT).filter((e) => !alle.includes(e));
    expect(verwaist).toEqual([]);
  });
});
