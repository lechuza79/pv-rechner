import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Wächter: waagerecht scrollende Atlas-Flächen sind mit der Tastatur bedienbar.
 *
 * DER ANLASS. Die Ranglisten-Tabelle hat zehn Spalten und braucht 826 px. Auf
 * einem Telefon scrollt sie waagerecht in ihrem eigenen Kasten — das ist richtig
 * so (die SEITE darf nicht scrollen). Nur: Ein Kasten mit `overflow-x` ist mit
 * der Tastatur nicht erreichbar. Wer nicht zeigen oder wischen kann, kommt an
 * die rechten Spalten also gar nicht heran; die Hälfte der Tabelle existiert für
 * ihn nicht. Das ist ein Verstoß gegen WCAG 2.1.1 (Keyboard), kein
 * Schönheitsfehler. Dieselbe Lücke stand in der Kachelreihe des
 * Größenklassen-Vergleichs: Die Klasse brachte einen `:focus-visible`-Rahmen mit,
 * aber nichts konnte den Fokus je bekommen — die Regel lief ins Leere.
 *
 * DIE REGEL. Wo im Atlas ein Container waagerecht scrollt, trägt er
 *   · `tabIndex` — damit er überhaupt anspringbar ist,
 *   · `role="region"` und
 *   · ein `aria-label`, das sagt, WAS dort scrollt.
 * Der Tab-Stopp gehört nur dorthin, wo wirklich etwas zu scrollen ist: Ein Stopp,
 * der nichts bewegt, ist Lärm (Pickering, „Inclusive Components — Data Tables").
 * Wo der Überlauf gemessen werden kann, hängt `tabIndex` deshalb an der Messung
 * (Ranglisten-Tabelle); wo er aus einer Media Query entsteht und die Seite
 * serverseitig rendert, steht er fest (Kachelreihe) — das ist im Aufrufer
 * begründet.
 *
 * SIE GILT FÜR JEDE KÜNFTIGE ATLAS-TABELLE, nicht nur für die beiden von heute.
 * Kommt eine neue dazu:
 *   1. Scrollt sie gar nicht (weil sie schmal genug ist)? Dann NICHTS tun — der
 *      Wächter verlangt nichts von ihr. Die Ranglisten-Seite unter
 *      app/(site)/solar-atlas/ranking ist genau dieser Fall: fünf Spalten, passt
 *      aufs Telefon, kein Scrollkasten, kein Tab-Stopp.
 *   2. Scrollt sie, bekommt ihr Kasten die Klasse `atlas-tabelle-scroller` und
 *      die drei Attribute. Die CSS-Regeln (Fokusrahmen, mitlaufende Spalten)
 *      stehen in lib/theme.ts.
 *
 * WARUM EIN TEST UND KEINE KOMPONENTE. Eine geteilte Scroll-Komponente wäre eine
 * Abstraktion mit einem Anwendungsfall — im Projekt ausdrücklich unerwünscht.
 * Träger der Konvention ist deshalb dieser Test: Er kennt die Regel, nicht der
 * Code. Eine Ausnahme kommt mit Begründung in die Liste unten, die Suche wird
 * dafür nicht aufgeweicht.
 */

const ROOT = join(__dirname, "..", "..");

/** Atlas-Oberflächen, die Tabellen und Kachelreihen zeigen. */
const VERZEICHNISSE = ["components/atlas", "app/(site)/solar-atlas"];

/**
 * Die Dateien, die heute einen Scrollkasten führen. Sie stehen hier NICHT als
 * zweiter Suchpfad (die Verzeichnisse decken sie ab), sondern als Quittung: Zieht
 * jemand eine davon aus dem Atlas heraus, fällt sie sonst still aus der Prüfung.
 */
const ERWARTETE_DATEIEN = [
  "components/atlas/RankingTable.tsx",
  "components/atlas/GemeindePeerTiles.tsx",
];

/**
 * Woran ein waagerecht scrollender Container zu erkennen ist: an einem
 * Inline-Stil oder an einer der Klassen, die das Scrollen in lib/theme.ts
 * mitbringen. Beides muss drinstehen — wer nur auf `overflowX` prüft, übersieht
 * genau die Fälle, die die Konvention richtig gemacht haben.
 */
const SCROLL_MERKMALE = [
  /overflowX:\s*["'](auto|scroll)["']/,
  /\batlas-tabelle-scroller\b/,
  /\bkpi-reihe\b/,
];

/** Was so ein Container tragen muss. */
const PFLICHT: { name: string; muster: RegExp }[] = [
  { name: "tabIndex", muster: /\btabIndex\b/ },
  { name: 'role="region"', muster: /\brole\b\s*[:=]\s*["']region["']/ },
  { name: "aria-label", muster: /aria-label/ },
];

/**
 * Begründete Ausnahmen. Jede Zeile ist eine Entscheidung, kein Versehen — z. B.
 * ein Container, der nachweislich nie überläuft. Leer ist der Normalzustand.
 */
const ERLAUBT: { datei: string; grund: string }[] = [];

function dateienUnter(rel: string): string[] {
  const abs = join(ROOT, rel);
  const out: string[] = [];
  const lauf = (p: string) => {
    for (const eintrag of readdirSync(p)) {
      const voll = join(p, eintrag);
      if (statSync(voll).isDirectory()) lauf(voll);
      else if (/\.tsx?$/.test(eintrag) && !eintrag.includes(".test.")) out.push(voll);
    }
  };
  if (statSync(abs).isDirectory()) lauf(abs);
  else out.push(abs);
  return out;
}

/**
 * Kommentare unschädlich machen, ohne die Zeichenpositionen zu verschieben:
 * Jedes Zeichen wird durch ein Leerzeichen ersetzt, Zeilenumbrüche bleiben.
 *
 * Nötig, weil die Regeln in den Kommentaren erklärt werden — und ein Kommentar,
 * der die Klasse `atlas-tabelle-scroller` NENNT, ist kein Scrollkasten. Ohne
 * diesen Schritt meldete der Wächter genau die Erklärung an, die ihn beschreibt.
 */
function ohneKommentare(quelle: string): string {
  return quelle
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/\/\/[^\n]*/g, (m) => " ".repeat(m.length));
}

/**
 * Der öffnende Tag, in dem `pos` steht — von seinem `<` bis zum `>`, das ihn
 * schließt.
 *
 * Von Hand gesucht statt mit einer Regex, weil JSX-Attribute selbst `>` enthalten
 * (`onScroll={(e) => …}`). Wer am ersten `>` abbricht, schneidet den Tag mitten
 * in der ersten Pfeilfunktion ab und findet die Attribute dahinter nicht mehr.
 */
function öffnenderTag(quelle: string, pos: number): string {
  let start = pos;
  while (start > 0 && !(quelle[start] === "<" && /[A-Za-z]/.test(quelle[start + 1] ?? ""))) start--;
  let tiefe = 0;
  for (let i = start; i < quelle.length; i++) {
    const c = quelle[i];
    if (c === "{") tiefe++;
    else if (c === "}") tiefe--;
    else if (c === ">" && tiefe === 0) return quelle.slice(start, i + 1);
  }
  return quelle.slice(start);
}

describe("Wächter: waagerecht scrollende Atlas-Flächen sind tastaturbedienbar", () => {
  const dateien = VERZEICHNISSE.flatMap(dateienUnter);

  it("hat die bekannten Tabellen-Dateien im Suchpfad", () => {
    expect(dateien.length).toBeGreaterThan(10);
    for (const erwartet of ERWARTETE_DATEIEN) {
      expect(dateien.map((d) => d.slice(ROOT.length + 1))).toContain(erwartet);
    }
  });

  it("gibt jedem Scrollkasten tabIndex, role und aria-label", () => {
    const funde: string[] = [];
    let geprüft = 0;

    for (const datei of dateien) {
      const rel = datei.slice(ROOT.length + 1);
      if (ERLAUBT.some((a) => a.datei === rel)) continue;
      const quelle = ohneKommentare(readFileSync(datei, "utf8"));

      for (const merkmal of SCROLL_MERKMALE) {
        const global = new RegExp(merkmal.source, "g");
        for (const treffer of quelle.matchAll(global)) {
          const tag = öffnenderTag(quelle, treffer.index ?? 0);
          geprüft++;
          const fehlt = PFLICHT.filter((p) => !p.muster.test(tag)).map((p) => p.name);
          if (fehlt.length > 0) {
            const zeile = quelle.slice(0, treffer.index).split("\n").length;
            funde.push(`${rel}:${zeile} — es fehlt: ${fehlt.join(", ")}`);
          }
        }
      }
    }

    // Ohne diese Zusicherung könnte die Suche ins Leere laufen und der Test
    // wäre still grün — der Fehler, gegen den es ihn gibt.
    expect(geprüft).toBeGreaterThan(0);
    expect(funde).toEqual([]);
  });
});
