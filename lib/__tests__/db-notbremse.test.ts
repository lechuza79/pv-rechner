import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Wächter gegen Datenbank-Reads ohne Zeitbudget im Seitenaufbau.
 *
 * Der Anlass ist ein gemessener Totalausfall bei einem Schwesterprojekt
 * (21.08.2026, dieselbe Kombination aus Vercel und Supabase): Ein fremder
 * Crawler fuhr zwanzig Stunden lang das Dreifache an Maschinen-Traffic, die
 * Datenbank ging in Speichermangel, normale Abfragen brauchten 10–30 s statt
 * Millisekunden. Umgeworfen hat das Projekt aber nicht die kranke Datenbank,
 * sondern die eigene Reaktion darauf: 2,08 Mio Anfragen in der Spitzenstunde
 * gegen eine Datenbank, die längst nicht mehr antwortete. Die Datenbank war um
 * 18:51 wieder schnell, der Endpunkt blieb bis 19:11 tot — der Ausfall hielt
 * sich zwanzig Minuten lang selbst am Leben.
 *
 * Zwei Bauweisen tragen das: ein Read ohne Zeitbudget (die Function wartet bis
 * zum 300-s-Limit und hält ihren Slot besetzt) und ein Fehlschlag ohne
 * Ruhepause (der nächste Aufbau feuert sofort wieder). Beides ist im Diff
 * unsichtbar und im Browser unauffällig, solange die Datenbank gesund ist —
 * also genau die Sorte Fehler, die ein Test halten muss und kein Merksatz.
 *
 * Geprüft wird die BAUWEISE, nicht das Verhalten: Jeder Supabase-Aufruf in den
 * unten genannten Lesepfaden läuft durch das Zeitbudget. Wo das im Einzelfall
 * nicht gilt, steht der Fall hier mit Grund — dann ist es eine Entscheidung.
 */

const ROOT = join(__dirname, "..", "..");

/**
 * Module, die im Seitenaufbau oder in einer öffentlichen Route aus der
 * Datenbank lesen. Wer hier ein Modul ergänzt, ergänzt auch das Zeitbudget.
 */
const LESEPFADE = [
  // Sitzt im Seitenrahmen und läuft damit bei JEDEM Aufbau JEDER Seite — die
  // teuerste Stelle der Liste, obwohl sie die kleinste Abfrage macht.
  "lib/theme-overrides-data.ts",
  "lib/funding-data.ts",
  "lib/funding-history.ts",
  "lib/prices-server.ts",
  "lib/solar-trend-data.ts",
  "lib/strommix-ytd.ts",
  "lib/pvgis.ts",
  // Nur Admin-Oberflächen, aber die schwersten Abfragen im Projekt: beide holen
  // über 20.000 Zeilen in Tausenderblöcken. Ohne Budget je Block hängt eine
  // einzige kränkelnde Abfrage die ganze Schleife bis zum Function-Limit.
  "lib/awards-server.ts",
  "lib/utilities-server.ts",
  // Seit den Ortsgeschichten (06.09.2026) im Aufbau JEDER Gemeindeseite
  // (`fundeFuerOrt`) — vorher nur Redaktionsansicht, deshalb stand es nicht
  // hier und las ohne Budget. Am 10.09.2026 warf genau dieser Read bei einem
  // kurzen Datenbankausfall eine Ortsseite in einen 500er.
  "lib/social-fundvorrat.ts",
];

/**
 * Benannte Ausnahmen: Zugriffe, die BEWUSST ohne Zeitbudget laufen.
 *
 * Der Grund ist immer derselbe und muss immer geprüft werden: Der Zugriff liegt
 * NICHT im Anfrageweg eines Besuchers, sondern in einem Lauf, der absichtlich
 * lange dauern darf. Ein Budget wäre dort keine Notbremse, sondern ein
 * Abbruch mitten in der Arbeit.
 *
 * Wer hier etwas einträgt, schreibt den Grund dazu — und prüft ihn, statt ihn
 * abzuschreiben. Eine Ausnahmeliste ohne geprüfte Gründe ist die bequemste Art,
 * einen Wächter abzuschalten.
 */
const OHNE_BUDGET_MIT_GRUND: { muster: RegExp; grund: string }[] = [
  {
    // Der Aufbau der Auszeichnungs-Liste läuft im Atlas-Datenlauf (monatlich,
    // über die Revalidate-Route), nicht im Seitenaufbau. Er schreibt 4.596
    // Zeilen in Blöcken; ein Zeitbudget würde ihn mitten im Schreiben abbrechen
    // und die Liste halb leer zurücklassen — genau der Zustand, den die
    // Reihenfolge „erst schreiben, dann aufräumen" verhindern soll.
    muster: /from\("atlas_auszeichnungen"\)\.(upsert|delete)\(/,
    grund: "Aufbau im Datenlauf, nicht im Seitenaufbau",
  },
  {
    // Der Story-Suchlauf schreibt seine Funde (wöchentliche Action, in Blöcken
    // zu 500). Kein Seitenaufbau, kein Besucher wartet; ein Budget bräche den
    // Lauf zwischen zwei Blöcken ab.
    muster: /from\("social_funde"\)\.upsert\(/,
    grund: "Suchlauf der Datenstories, nicht im Seitenaufbau",
  },
];

/**
 * Zeichenketten, Vorlagen-Literale und Kommentare neutralisieren.
 *
 * Die Prüfung unten zählt Klammern, und eine Klammer in einem Text ist keine.
 * Konkret im Bestand: `` `awards: ${table} ab ${from}` `` trägt zwei geschweifte
 * Klammerpaare, die mit dem Aufbau des Codes nichts zu tun haben. Ersetzt wird
 * zeichengleich (Zeilenumbrüche bleiben), damit jede Fundstelle weiterhin ihre
 * echte Zeilennummer trägt.
 */
function maskiere(quelle: string): string {
  const out = quelle.split("");
  const n = quelle.length;
  const leeren = (von: number, bis: number) => {
    for (let k = von; k < Math.min(bis, n); k++) if (out[k] !== "\n") out[k] = " ";
  };
  let i = 0;
  while (i < n) {
    const c = quelle[i];
    const zwei = quelle.slice(i, i + 2);
    if (zwei === "//") {
      const j = quelle.indexOf("\n", i);
      leeren(i, j < 0 ? n : j);
      i = j < 0 ? n : j;
      continue;
    }
    if (zwei === "/*") {
      const j = quelle.indexOf("*/", i + 2);
      const ende = j < 0 ? n : j + 2;
      leeren(i, ende);
      i = ende;
      continue;
    }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < n && quelle[j] !== c && quelle[j] !== "\n") {
        if (quelle[j] === "\\") j++;
        j++;
      }
      leeren(i, j + 1);
      i = j + 1;
      continue;
    }
    if (c === "`") {
      // Samt Einsetzungen `${…}` — sonst verschieben deren Klammern die Bilanz.
      let j = i + 1;
      let tiefe = 0;
      while (j < n) {
        if (quelle[j] === "\\") {
          j += 2;
          continue;
        }
        if (quelle.slice(j, j + 2) === "${") {
          tiefe++;
          j += 2;
          continue;
        }
        if (quelle[j] === "}" && tiefe > 0) {
          tiefe--;
          j++;
          continue;
        }
        if (quelle[j] === "`" && tiefe === 0) break;
        j++;
      }
      leeren(i, j + 1);
      i = j + 1;
      continue;
    }
    i++;
  }
  return out.join("");
}

const KLAMMER_AUF = "([{";
const KLAMMER_ZU = ")]}";

/** Der Bezeichner unmittelbar vor Position `i` — der Name des Aufrufs davor. */
function bezeichnerVor(code: string, i: number): string {
  let j = i - 1;
  while (j >= 0 && /\s/.test(code[j])) j--;
  const ende = j + 1;
  while (j >= 0 && /[A-Za-z0-9_$]/.test(code[j])) j--;
  return code.slice(j + 1, ende);
}

/**
 * Steht dieser Zugriff SYNTAKTISCH innerhalb eines `withDbTimeout(…)`?
 *
 * Von der Fundstelle aus nach außen: jede Klammer, die sich nicht schließt, ist
 * eine, die den Fund umschließt. Trägt eine davon `withDbTimeout` als Aufruf vor
 * sich, läuft der Zugriff durch das Zeitbudget — auch verschachtelt, etwa in
 * einem `Promise.all([…])`. Ein Semikolon oder der Anfang des Blocks beendet die
 * Suche: weiter draußen steht eine ANDERE Anweisung.
 *
 * Genau das ist der Unterschied zum früheren Zeilenfenster (−4 bis +8): Standen
 * zwei Zugriffe dicht hintereinander und hatte nur der zweite ein Budget, sah
 * das Fenster dessen `withDbTimeout` und sprach den ersten frei. Am 09.09.2026
 * in `auszeichnungsStand()` nachgestellt — die Notbremse war weg, der Wächter
 * blieb grün.
 */
function imBudget(code: string, fund: number): boolean {
  let tiefe = 0;
  for (let i = fund - 1; i >= 0; i--) {
    const c = code[i];
    if (KLAMMER_ZU.includes(c)) {
      tiefe++;
      continue;
    }
    if (KLAMMER_AUF.includes(c)) {
      if (tiefe > 0) {
        tiefe--;
        continue;
      }
      // Eine Klammer, die sich nicht schließt: Sie umschließt den Fund.
      if (c === "{") return false; // Blockanfang — hier endet die Anweisung.
      if (bezeichnerVor(code, i) === "withDbTimeout") return true;
      continue; // weiter nach außen
    }
    if (c === ";" && tiefe === 0) return false;
  }
  return false;
}

/** Anfang des umschließenden Blocks (`{`), oder −1. */
function blockAnfang(code: string, fund: number): number {
  let tiefe = 0;
  for (let i = fund - 1; i >= 0; i--) {
    const c = code[i];
    if (KLAMMER_ZU.includes(c)) tiefe++;
    else if (KLAMMER_AUF.includes(c)) {
      if (tiefe > 0) tiefe--;
      else if (c === "{") return i;
    }
  }
  return -1;
}

/** Ende des Blocks, der bei `anfang` beginnt. */
function blockEnde(code: string, anfang: number): number {
  let tiefe = 0;
  for (let i = anfang; i < code.length; i++) {
    const c = code[i];
    if (KLAMMER_AUF.includes(c)) tiefe++;
    else if (KLAMMER_ZU.includes(c)) {
      tiefe--;
      if (tiefe === 0) return i;
    }
  }
  return code.length;
}

/**
 * Die Bauform „Abfrage erst in einer Variablen bauen, dann übergeben".
 *
 * So arbeitet die Seitenschleife der Award-Daten: `let q = supabase.from(…)`,
 * danach ein `refine(q)`, und erst dann `withDbTimeout(q, …)`. Das Budget steht
 * zwangsläufig NACH dem Zugriff, und zwar durch eine beliebige Zahl von Zeilen
 * getrennt — ein Fenster fester Größe kann diese Form nicht sauber von einer
 * echten Lücke trennen, ein Blick auf die Variable schon: Verlangt wird, dass
 * genau die Variable, in der die Abfrage steht, im selben Block als erstes
 * Argument an `withDbTimeout` geht.
 */
function ueberVariableImBudget(code: string, fund: number): boolean {
  // Kopf der Anweisung: bis zur nächsten Grenze zurück.
  let start = 0;
  for (let i = fund - 1; i >= 0; i--) {
    if (";{}".includes(code[i])) {
      start = i + 1;
      break;
    }
  }
  const kopf = code.slice(start, fund);
  const zuweisung = /(?:^|[(,\s])(?:const|let|var)?\s*([A-Za-z_$][\w$]*)\s*=\s*(?:await\s+)?$/.exec(kopf);
  if (!zuweisung) return false;
  const name = zuweisung[1];
  const anfang = blockAnfang(code, fund);
  const ende = anfang < 0 ? code.length : blockEnde(code, anfang);
  const bereich = code.slice(fund, ende);
  return new RegExp(`withDbTimeout\\s*\\(\\s*${name}\\s*[,)]`).test(bereich);
}

/**
 * Ein Aufruf auf dem Client (`supabase.auth.…`) oder eine Zeile, die nur den
 * Client durchreicht, ist kein Read. Erkannt wird der Read an `.from(`.
 */
function readsOhneBudget(quelle: string): string[] {
  // Über den GANZEN Quelltext suchen, nicht Zeile für Zeile: Ein umbrochener
  // Aufruf trägt `supabase` und `.from(` auf verschiedenen Zeilen, und genau
  // diese Bauform ist im Projekt die häufigste. Die erste Fassung dieses Tests
  // prüfte je Zeile — sie fand deshalb sechs der neun Lesestellen überhaupt
  // nicht und blieb grün, als zur Probe eine Notbremse entfernt wurde. Ein
  // Wächter, der die eigene Gegenprobe besteht, ohne etwas zu sehen, ist
  // schlimmer als keiner.
  const code = maskiere(quelle);
  const zeilen = quelle.split("\n");
  const treffer: string[] = [];

  for (const fund of code.matchAll(/\bsupabase\s*\.\s*from\s*\(/g)) {
    const at = fund.index;
    if (imBudget(code, at)) continue;
    if (ueberVariableImBudget(code, at)) continue;
    const zeilenNr = code.slice(0, at).split("\n").length;
    const zeile = zeilen[zeilenNr - 1] ?? "";
    if (OHNE_BUDGET_MIT_GRUND.some((a) => a.muster.test(zeile))) continue;
    treffer.push(`Zeile ${zeilenNr}: ${zeile.trim()}`);
  }

  return treffer;
}

describe("Notbremse für Datenbank-Reads", () => {
  it.each(LESEPFADE)("%s liest nicht ohne Zeitbudget", (pfad) => {
    const quelle = readFileSync(join(ROOT, pfad), "utf8");
    const offen = readsOhneBudget(quelle);

    expect(
      offen,
      `${pfad}: Datenbank-Read ohne withDbTimeout. Ohne Zeitbudget wartet die ` +
        `Function bis zum 300-s-Limit und hält ihren Slot besetzt — aus einem ` +
        `Datenbank-Schluckauf wird ein Rückstau, der sich selbst am Leben hält. ` +
        `Gehört der Read wirklich ohne Budget hierher, kommt er mit Grund in ` +
        `die Ausnahmeliste dieses Tests.\n${offen.join("\n")}`,
    ).toEqual([]);
  });

  it("das kurze Budget ist kürzer als das lange und beide sind gesetzt", async () => {
    const { DB_READ_TIMEOUT_MS, DB_SOFT_READ_TIMEOUT_MS } = await import("../db-timeout");
    expect(DB_SOFT_READ_TIMEOUT_MS).toBeGreaterThan(0);
    expect(DB_SOFT_READ_TIMEOUT_MS).toBeLessThan(DB_READ_TIMEOUT_MS);
  });

  it("bricht ab, statt auf einen hängenden Read zu warten", async () => {
    const { withDbTimeout } = await import("../db-timeout");
    const haengt = new Promise<never>(() => {});
    const start = Date.now();
    await expect(withDbTimeout(haengt, "test", 50)).rejects.toThrow(/timeout/i);
    expect(Date.now() - start).toBeLessThan(1000);
  });

  it("reicht einen schnellen Read unverändert durch", async () => {
    const { withDbTimeout } = await import("../db-timeout");
    await expect(withDbTimeout(Promise.resolve({ data: 1 }), "test", 50)).resolves.toEqual({
      data: 1,
    });
  });

  it("der Förderkatalog macht nach einem Fehlschlag eine Pause", () => {
    // Nicht das Verhalten, sondern die Bauweise: Ohne Ruhepause feuert jeder
    // Seitenaufbau sofort wieder gegen die kranke Datenbank — genau der
    // Verstärker aus dem Vorfall oben.
    const quelle = readFileSync(join(ROOT, "lib/funding-data.ts"), "utf8");
    expect(quelle).toMatch(/fehlerBis\s*=\s*Date\.now\(\)\s*\+/);
    expect(quelle).toMatch(/if\s*\(Date\.now\(\)\s*<\s*fehlerBis\)/);
    // Und die Pause muss aufhebbar sein, sonst zeigt das Cockpit nach einem
    // Resync bis zu einer halben Minute den alten Stand.
    expect(quelle).toMatch(/invalidateFundingCache[\s\S]{0,200}fehlerBis\s*=\s*0/);
  });
});

/**
 * Die Prüfung selbst unter Test.
 *
 * Der Wächter oben liest echte Dateien, und die sind alle in Ordnung — ein Lauf
 * über sie sagt deshalb nur „nichts gefunden", nie „ich kann etwas finden".
 * Diese Fälle prüfen die ABLEITUNG: was die Prüfung als geschützt durchlässt und
 * was sie meldet. Ohne sie wäre der Wächter genau die Sorte, gegen die es ihn
 * gibt — einer, der grün meldet, ohne hinzusehen.
 */
describe("die Prüfung selbst", () => {
  it("lässt den umschlossenen Aufruf durch", () => {
    const q = `async function f() {
  const { data } = await withDbTimeout(
    supabase.from("a").select("*").maybeSingle(),
    "a",
  );
}`;
    expect(readsOhneBudget(q)).toEqual([]);
  });

  it("meldet den ungeschützten Zugriff, auch wenn der NÄCHSTE ein Budget hat", () => {
    // Die gemessene Lücke (09.09.2026): Das frühere Zeilenfenster sah das
    // `withDbTimeout` des zweiten Zugriffs und sprach den ersten frei.
    const q = `async function f() {
  const { count } = await supabase
    .from("a")
    .select("id", { count: "exact", head: true });
  const { data } = await withDbTimeout(
    supabase.from("a").select("erneuert_am").limit(1).maybeSingle(),
    "a",
  );
}`;
    const offen = readsOhneBudget(q);
    expect(offen).toHaveLength(1);
    expect(offen[0]).toMatch(/const \{ count \}/);
  });

  it("lässt die Bauform Abfrage-in-Variable-bauen-dann-übergeben durch", () => {
    const q = `async function f() {
  for (let from = 0; ; from += size) {
    let q = supabase.from(table).select(select).range(from, from + size - 1);
    if (refine) q = refine(q);
    const { data, error } = await withDbTimeout(q, "x");
  }
}`;
    expect(readsOhneBudget(q)).toEqual([]);
  });

  it("meldet eine Variable, die NICHT an das Zeitbudget geht", () => {
    // Auch hier stünde ein `withDbTimeout` in Sichtweite — es gehört nur zu
    // einer anderen Abfrage. Der Unterschied ist die Variable, nicht die Nähe.
    const q = `async function f() {
  let q = supabase.from("a").select("*");
  const r = await q;
  const { data } = await withDbTimeout(supabase.from("b").select("*"), "b");
}`;
    const offen = readsOhneBudget(q);
    expect(offen).toHaveLength(1);
    expect(offen[0]).toMatch(/let q = supabase/);
  });

  it("erkennt das Budget auch verschachtelt, etwa in einem Promise.all", () => {
    const q = `async function f() {
  const [a, b] = await Promise.all([
    withDbTimeout(supabase.from("a").select("*"), "a"),
    withDbTimeout(supabase.from("b").select("*"), "b"),
  ]);
}`;
    expect(readsOhneBudget(q)).toEqual([]);
  });

  it("lässt sich von Klammern in Texten nicht täuschen", () => {
    // Die Klammer in der Vorlage gehört zu keinem Aufruf. Zählte sie mit, wäre
    // die Bilanz ab hier verschoben und das Urteil über alles Folgende Zufall.
    const q = `async function f() {
  const { d1 } = await withDbTimeout(supabase.from(t).select(s), \`a \${x}) b\`);
  const { d2 } = await supabase.from("b").select("*");
}`;
    const offen = readsOhneBudget(q);
    expect(offen).toHaveLength(1);
    expect(offen[0]).toMatch(/const \{ d2 \}/);
  });

  it.each(LESEPFADE)("%s bleibt nach dem Neutralisieren klammer-ausgeglichen", (pfad) => {
    // Der Wächter urteilt über Klammern. Geht die Bilanz nicht auf — etwa weil
    // ein künftiger regulärer Ausdruck eine einzelne Klammer trägt —, ist jedes
    // Urteil danach Zufall. Dann soll er rot werden statt still danebenzuliegen.
    const code = maskiere(readFileSync(join(ROOT, pfad), "utf8"));
    let tiefe = 0;
    let tiefstand = 0;
    for (const c of code) {
      if (KLAMMER_AUF.includes(c)) tiefe++;
      else if (KLAMMER_ZU.includes(c)) tiefe--;
      tiefstand = Math.min(tiefstand, tiefe);
    }
    expect({ pfad, tiefe, tiefstand }).toEqual({ pfad, tiefe: 0, tiefstand: 0 });
  });
});
