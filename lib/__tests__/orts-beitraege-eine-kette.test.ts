import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const WURZEL = join(__dirname, "..", "..");
const lies = (...teile: string[]) => readFileSync(join(WURZEL, ...teile), "utf8");

/**
 * Die Module, die eine Datei zur LAUFZEIT importiert.
 *
 * `import type` und `import { type X }` fallen heraus: Sie verschwinden beim
 * Übersetzen und dürfen deshalb auf alles zeigen.
 */
function laufzeitImporte(datei: string): string[] {
  let quelle: string;
  try {
    quelle = lies("lib", datei);
  } catch {
    return [];
  }
  const ziele: string[] = [];
  for (const treffer of quelle.matchAll(/^import\s+([\s\S]*?)from\s+"([^"]+)";/gm)) {
    const was = treffer[1];
    if (/^\s*type\s/.test(was)) continue;
    // Eine Klausel, in der JEDER Name ein Typ ist, ist ebenfalls folgenlos.
    const namen = was.match(/\{([\s\S]*)\}/)?.[1];
    if (namen && namen.split(",").every((n) => !n.trim() || /^type\s/.test(n.trim()))) continue;
    ziele.push(treffer[2]);
  }
  // Nebenwirkungs-Importe („import 'server-only';") tragen kein `from`.
  for (const treffer of quelle.matchAll(/^import\s+"([^"]+)";/gm)) ziele.push(treffer[1]);
  return ziele;
}

/** Baut dieses Modul einen Datenbank-Zugang auf oder markiert es sich als Server-Modul? */
function istServerModul(inhalt: string): boolean {
  return (
    inhalt.startsWith('import "server-only"') ||
    inhalt.includes("SUPABASE_SERVICE_KEY") ||
    inhalt.includes("unstable_cache")
  );
}

/**
 * Sucht TRANSITIV nach einem Server-Modul unter den Laufzeit-Importen.
 *
 * Transitiv, weil die direkte Ebene den Fall nicht fängt, um den es geht: Ein
 * harmlos benanntes Hilfsmodul, das seinerseits die Ablage anfasst, zieht die
 * Server-Grenze genauso herein.
 */
function serverModulUnter(start: string): { weg: string[] } | null {
  const gesehen = new Set<string>();
  const warteschlange: { datei: string; weg: string[] }[] = [{ datei: start, weg: [start] }];
  while (warteschlange.length > 0) {
    const { datei, weg } = warteschlange.shift()!;
    if (gesehen.has(datei)) continue;
    gesehen.add(datei);
    let inhalt: string;
    try {
      inhalt = lies("lib", datei);
    } catch {
      continue; // keine .ts-Datei in lib/ — außerhalb der Betrachtung
    }
    if (weg.length > 1 && istServerModul(inhalt)) return { weg };
    for (const ziel of laufzeitImporte(datei)) {
      if (ziel === "server-only" || ziel.startsWith("next/")) return { weg: [...weg, ziel] };
      if (!ziel.startsWith("./")) continue;
      warteschlange.push({ datei: `${ziel.slice(2)}.ts`, weg: [...weg, ziel] });
    }
  }
  return null;
}

const ORTSSEITE = ["app", "(site)", "solar-atlas", "[bundesland]", "[kreis]", "[gemeinde]", "page.tsx"];
// Die geteilte Quelle, aus der BEIDE Redaktionsansichten füllen.
const REDAKTION = ["lib", "redaktions-quelle.ts"];

// Ortsseite und Redaktionstisch bauen dieselben Beiträge — aus EINER Kette.
//
// Die Kette (Bestand, Zubau nach Monat, Wohnungsbestand, Platzierungen, Funde
// des Suchlaufs, dann Geschichten und Beiträge) stand bis zum 06.09.2026 inline
// auf der Ortsseite. Solange nur sie sie brauchte, war das in Ordnung. Der
// Redaktionstisch stellt jetzt die Beiträge eines Versandschubs ein — und eine
// zweite Zusammenstellung hieße: Was der Betreiber dort einstellt, ist nicht,
// was auf der verlinkten Seite steht.
//
// DIESER FEHLER IST VON AUSSEN UNSICHTBAR. Beide Seiten funktionieren, beide
// zeigen plausible Geschichten, und der Unterschied fällt frühestens auf, wenn
// jemand beide nebeneinanderhält. Dieselbe Klasse wie „Brief und Seite
// getrennt formuliert" — dort hat sie das Projekt schon einmal bezahlt.

describe("Ortsseite und Redaktionstisch teilen eine Kette", () => {
  it("beide bauen die Beiträge über das geteilte Modul", () => {
    expect(lies(...ORTSSEITE)).toContain("lib/orts-posts");
    expect(lies(...REDAKTION)).toContain("orts-beitraege-server");
    // Und beide Ansichten holen sie von dort, statt selbst zu sammeln.
    for (const seite of [
      ["app", "(site)", "admin", "redaktion", "page.tsx"],
      ["app", "(site)", "admin", "redaktion", "templates", "page.tsx"],
    ]) {
      expect(lies(...seite)).toContain("redaktions-quelle");
    }
  });

  it("der Redaktionstisch stellt die Geschichten NICHT selbst zusammen", () => {
    // Er darf `ortsStories` nicht aufrufen: Dann hätte er eine eigene Auswahl
    // von Funden und Platzierungen — und genau die entscheidet, welche
    // Geschichten es überhaupt gibt.
    const quelle = lies(...REDAKTION);
    for (const eigen of ["ortsStories(", "fundeFuerOrt(", "vergleichsPlaetze(", "monatsZubau("]) {
      expect(quelle, `Der Redaktionstisch ruft „${eigen}" selbst auf`).not.toContain(eigen);
    }
  });

  it("die Ortsseite reicht ihre schon geladenen Zahlen herein, statt sie zweimal zu holen", () => {
    // Sie hat Bestand und Speicher ohnehin für ihre Kacheln. Über den
    // Schlüssel-Einstieg zu gehen wäre bequemer und kostete ein zweites Mal
    // dieselben Abfragen auf 11.000 Seiten — eine Seite darf nicht mit den
    // Daten teurer werden.
    expect(lies(...ORTSSEITE)).not.toContain("ortsBeitraegeFuerId");
  });

  it("die Geschichten-Rechnung bleibt frei von Server-Modulen", () => {
    // Sie läuft auf 11.000 Ortsseiten und wird von Tests ohne Datenbank
    // aufgerufen. Ein einziger LAUFZEIT-Import aus der Ablage zöge die
    // Server-Grenze mit hinein — Typ-Importe verschwinden beim Übersetzen und
    // sind erlaubt.
    //
    // GEPRÜFT WIRD DAS AUFGELÖSTE MODUL, TRANSITIV. Zwei Fassungen sind bei der
    // Gegenprobe grün geblieben, und beide sahen beim Lesen richtig aus:
    //  · Die erste suchte die Präfixe „supabase" und „next/" im Importpfad —
    //    der echte Import heißt „./supabase-server", kein Präfix traf ihn.
    //  · Die zweite prüfte auf `import "server-only"` im importierten Modul —
    //    der Datenbank-Zugang trägt diese Zeile gar nicht, er ist nur so
    //    BENANNT.
    // Ein Wächter, der nichts sieht und trotzdem grün meldet, ist schlimmer als
    // keiner.
    for (const modul of ["orts-stories.ts", "orts-posts.ts"]) {
      const gefunden = serverModulUnter(modul);
      expect(
        gefunden,
        gefunden ? `${modul} zieht über ${gefunden.weg.join(" → ")} ein Server-Modul herein` : "",
      ).toBeNull();
    }
  });
});
