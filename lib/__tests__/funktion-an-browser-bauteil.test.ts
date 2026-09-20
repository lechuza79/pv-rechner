import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, dirname, join } from "node:path";

/**
 * EINE SERVER-SEITE DARF EINEM BROWSER-BAUTEIL KEINE FUNKTION ÜBERGEBEN.
 *
 * Am 07.09.2026 real passiert: Die Kategorie-Navigation der Redaktion bekam
 * eine Funktion mit, die aus einer Kategorie eine Adresse baut — damit die
 * Quellenwahl beim Klick erhalten bleibt. Die Navigation läuft im Browser,
 * und eine Funktion lässt sich dorthin nicht übergeben; die Seite antwortete
 * mit einem Serverfehler („Functions cannot be passed directly to Client
 * Components").
 *
 * DIE FEHLERKLASSE IST IM DIFF UNSICHTBAR: Die Typprüfung ist grün (die Typen
 * stimmen), die Tests sind grün (sie rendern nicht über die Grenze), und der
 * Fehler erscheint erst beim Aufruf der Seite. Genau so ist er gefunden
 * worden — vom Betreiber, nicht von mir. Admin-Seiten fängt der Rundgang
 * nicht, sie liegen hinter der Anmeldung.
 *
 * DIE LÖSUNG IST IMMER DIESELBE: Statt der Funktion die WERTE übergeben, aus
 * denen sie ihr Ergebnis baut — hier die Angaben, die in der Adresse stehen
 * bleiben sollen. Das Bauteil rechnet dann im Browser selbst.
 *
 * WAS ERLAUBT BLEIBT: ein Browser-Bauteil, das einem anderen Browser-Bauteil
 * eine Rückrufe-Funktion gibt. Die Grenze verläuft zwischen Server und
 * Browser, nicht zwischen Bauteilen.
 */

const WURZEL = resolve(__dirname, "..", "..");

function dateien(ordner: string): string[] {
  const treffer: string[] = [];
  const lauf = (pfad: string) => {
    for (const eintrag of readdirSync(pfad)) {
      if (eintrag === "node_modules" || eintrag.startsWith(".")) continue;
      const voll = join(pfad, eintrag);
      if (statSync(voll).isDirectory()) lauf(voll);
      else if (eintrag.endsWith(".tsx")) treffer.push(voll);
    }
  };
  lauf(resolve(WURZEL, ordner));
  return treffer;
}

const ALLE = [...dateien("app"), ...dateien("components")];

function istBrowserBauteil(datei: string): boolean {
  return /^\s*["']use client["']/m.test(readFileSync(datei, "utf8"));
}

/** Pfad ohne Endung → so vergleichen sich Import und Datei. */
const ohneEndung = (p: string) => p.replace(/\.tsx?$/, "");

/** Die relativen Bauteil-Importe einer Datei, als Pfade ohne Endung. */
function bauteilImporte(datei: string): string[] {
  const inhalt = readFileSync(datei, "utf8");
  const ziele: string[] = [];
  for (const t of inhalt.matchAll(/import\s+(?!type\b)[^;]+?from\s+["'](\.[^"']+)["']/g)) {
    ziele.push(resolve(dirname(datei), t[1]));
  }
  return ziele;
}

/**
 * Alles, was im Browser landet: die Bauteile mit eigener Ansage UND alles, was
 * sie ihrerseits einbinden.
 *
 * Ohne die Vererbung wäre jedes geteilte Bauteil ohne eigene Ansage ein
 * Fehlalarm — es zieht die Grenze nicht selbst, sondern erbt sie von dem, der
 * es rendert. Genau so ist der Auswahl-Skipper gebaut, und der Wächter hätte
 * ihn beim ersten Lauf zu Unrecht gemeldet.
 */
const BROWSER_DATEIEN = (() => {
  const drin = new Set(ALLE.filter(istBrowserBauteil).map(ohneEndung));
  const nachPfad = new Map(ALLE.map((d) => [ohneEndung(d), d]));
  const offen = [...drin];
  while (offen.length) {
    const p = offen.pop()!;
    const datei = nachPfad.get(p) ?? nachPfad.get(join(p, "index"));
    if (!datei) continue;
    for (const ziel of bauteilImporte(datei)) {
      for (const kandidat of [ziel, join(ziel, "index")]) {
        if (nachPfad.has(kandidat) && !drin.has(kandidat)) {
          drin.add(kandidat);
          offen.push(kandidat);
        }
      }
    }
  }
  return drin;
})();

/** Namen, die in dieser Datei eine Server-Aktion bezeichnen — die darf hinüber. */
function serverAktionen(inhalt: string): Set<string> {
  const namen = new Set<string>();
  for (const t of inhalt.matchAll(
    /\b(?:async\s+function|function)\s+([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{\s*["']use server["']/g,
  ))
    namen.add(t[1]);
  for (const t of inhalt.matchAll(
    /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>\s*\{\s*["']use server["']/g,
  ))
    namen.add(t[1]);
  return namen;
}

/**
 * Die Namen, die eine Datei aus einem Browser-Bauteil importiert.
 *
 * Nur relative Importe: Ein Bauteil aus einem Paket kennt diese Grenze selbst.
 */
function importierteBrowserBauteile(datei: string, inhalt: string): Set<string> {
  const namen = new Set<string>();
  const muster = /import\s+(?!type\b)([^;]+?)\s+from\s+["'](\.[^"']+)["']/g;
  for (const treffer of inhalt.matchAll(muster)) {
    const ziel = resolve(dirname(datei), treffer[2]);
    const istBrowser =
      BROWSER_DATEIEN.has(ziel) || BROWSER_DATEIEN.has(join(ziel, "index"));
    if (!istBrowser) continue;
    // Nur die geschweifte Liste und der Standard-Name; `* as x` ist hier nicht in Gebrauch.
    const geschweift = treffer[1].match(/\{([^}]*)\}/);
    if (geschweift) {
      for (const teil of geschweift[1].split(",")) {
        const name = teil.split(/\s+as\s+/).pop()!.trim();
        if (name && !name.startsWith("type ")) namen.add(name);
      }
    }
    const standard = treffer[1].replace(/\{[^}]*\}/, "").replace(/,/g, "").trim();
    if (standard) namen.add(standard);
  }
  return namen;
}

/** Namen, die in dieser Datei als Funktion gebunden sind. */
function funktionsNamen(inhalt: string): Set<string> {
  const namen = new Set<string>();
  for (const t of inhalt.matchAll(/\bfunction\s+([A-Za-z_$][\w$]*)/g)) namen.add(t[1]);
  for (const t of inhalt.matchAll(
    /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*(?:async\s+)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*(?::[^=]+)?=>/g,
  ))
    namen.add(t[1]);
  return namen;
}

/**
 * Übergaben einer Funktion an eines der genannten Bauteile.
 *
 * Gesucht wird im Attribut-Bereich des Aufrufs — vom Namen bis zum ersten `>`
 * auf Klammertiefe null. Das reicht, weil verschachtelte Aufrufe erst danach
 * beginnen.
 */
function funktionsUebergaben(inhalt: string, bauteile: Set<string>, funktionen: Set<string>): string[] {
  const befunde: string[] = [];
  for (const name of bauteile) {
    const start = new RegExp(`<${name}(?=[\\s/>])`, "g");
    for (const treffer of inhalt.matchAll(start)) {
      let i = treffer.index! + treffer[0].length;
      let tiefe = 0;
      let ende = i;
      while (i < inhalt.length) {
        const z = inhalt[i];
        if (z === "{" || z === "(" || z === "[") tiefe++;
        else if (z === "}" || z === ")" || z === "]") tiefe--;
        else if (z === ">" && tiefe === 0) break;
        i++;
      }
      ende = i;
      const attribute = inhalt.slice(treffer.index! + treffer[0].length, ende);

      // Ein Pfeil oder ein `function` direkt im Attribut: die Inline-Form.
      for (const a of attribute.matchAll(/([A-Za-z_$][\w$]*)=\{\s*(?:async\s+)?(?:function\b|\([^)]*\)\s*(?::[^=]+)?=>|[A-Za-z_$][\w$]*\s*=>)/g)) {
        befunde.push(`<${name} ${a[1]}={…=>…}>`);
      }
      // Ein blanker Name, der in dieser Datei eine Funktion ist.
      for (const a of attribute.matchAll(/([A-Za-z_$][\w$]*)=\{\s*([A-Za-z_$][\w$]*)\s*\}/g)) {
        if (funktionen.has(a[2])) befunde.push(`<${name} ${a[1]}={${a[2]}}>`);
      }

    }
  }
  return befunde;
}

describe("Funktionen über die Server-Browser-Grenze", () => {
  it("keine Server-Seite übergibt einem Browser-Bauteil eine Funktion", () => {
    const verstoesse: string[] = [];
    for (const datei of ALLE) {
      // Was selbst im Browser landet, überquert keine Grenze.
      if (BROWSER_DATEIEN.has(ohneEndung(datei))) continue;
      const inhalt = readFileSync(datei, "utf8");
      const bauteile = importierteBrowserBauteile(datei, inhalt);
      if (bauteile.size === 0) continue;
      const aktionen = serverAktionen(inhalt);
      const funktionen = new Set([...funktionsNamen(inhalt)].filter((n) => !aktionen.has(n)));
      for (const b of funktionsUebergaben(inhalt, bauteile, funktionen)) {
        verstoesse.push(`${datei.slice(WURZEL.length + 1)}: ${b}`);
      }
    }
    expect(verstoesse, verstoesse.join("\n")).toEqual([]);
  });

  it("erkennt überhaupt Browser-Bauteile und ihre Verwendung auf Server-Seiten", () => {
    // Gegenprobe gegen einen Wächter, der nichts sieht und trotzdem grün meldet.
    expect(BROWSER_DATEIEN.size).toBeGreaterThan(20);
    const mitBauteilen = ALLE.filter((d) => {
      if (BROWSER_DATEIEN.has(ohneEndung(d))) return false;
      return importierteBrowserBauteile(d, readFileSync(d, "utf8")).size > 0;
    });
    expect(mitBauteilen.length).toBeGreaterThan(10);
  });
});
