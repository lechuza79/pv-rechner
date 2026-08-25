/**
 * Haelt CLAUDE.md gegen den Code.
 *
 * Am 25.08.2026 standen ELF Stellen in CLAUDE.md, die dem Code widersprachen:
 * Kopfzeilenbreite (960 statt 1040), Umschaltpunkt (768 statt 1080), Framework-
 * Hauptversionen zwei Generationen zurueck, zwei Textfarben, drei Eckenradien,
 * die Schrittzahl von drei Flows, zwei verschiedene Zaehlungen derselben
 * Weiterleitungen. Gefunden hat sie ein einmaliger Pruefdurchgang, nicht die
 * taegliche Arbeit — und genau das ist das Problem: Eine Anleitung, die an elf
 * Stellen die Unwahrheit sagt, faellt niemandem auf, weil niemand sie gegen den
 * Code liest. Sie fuehrt nur still zu falschen Entscheidungen.
 *
 * Gemessen wurde ausserdem (Pruefdurchgang 25.08.2026): Von 17 belegten
 * Regelbruechen waere KEINER durch eine kuerzere Datei verhindert worden.
 * Das Problem dieser Datei ist nicht ihre Laenge, sondern ihre Aktualitaet.
 * Deshalb dieser Lauf und nicht eine weitere Kuerzungsrunde.
 *
 * Zwei Teile:
 *
 *   A) ABLEITBAR, ohne Register. Jede in der Anleitung genannte Datei, jede
 *      genannte Testdatei und jeder genannte npm-Befehl muss existieren.
 *      Braucht keine Pflege: Die Prueflinge stehen in der Datei selbst.
 *
 *   B) REGISTER fuer Zahlen. Eine Zahl laesst sich nicht aus der Prosa
 *      ableiten — welche Zahl im Text welche Konstante meint, weiss nur ein
 *      Mensch. Das Register ist bewusst klein und deckt die Groessen ab, bei
 *      denen ein falscher Wert real vorgekommen ist.
 *
 * Exit 1 = Widerspruch gefunden. Der Lauf DARF rot werden; das ist sein Zweck.
 */
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const WURZEL = process.cwd();
const claudeMd = readFileSync(join(WURZEL, "CLAUDE.md"), "utf8");

type Befund = { was: string; sagt: string; stimmt: string; wo: string };
const befunde: Befund[] = [];
let geprueft = 0;

function lies(datei: string): string {
  return readFileSync(join(WURZEL, datei), "utf8");
}

/** Erster Treffer einer Gruppe, oder null. */
function greif(text: string, muster: RegExp): string | null {
  return text.match(muster)?.[1]?.trim() ?? null;
}

// ---------------------------------------------------------------------------
// A) Genannte Dateien, Tests und Befehle existieren
// ---------------------------------------------------------------------------

/**
 * Backtick-Inhalte, die wie ein Pfad aussehen. Bewusst eng: mit Schraegstrich
 * UND bekannter Endung. Funktionsnamen, Tabellennamen und CSS-Tokens stehen
 * ebenfalls in Backticks und sind keine Dateien.
 */
function genanntePfade(): string[] {
  const treffer = claudeMd.match(/`([^`\s]+\.(?:ts|tsx|md|json|js|yml|txt|pdf))`/g) ?? [];
  return [
    ...new Set(
      treffer
        .map((t) => t.slice(1, -1))
        .filter((p) => p.includes("/"))
        // Platzhalter und Muster sind keine echten Pfade
        .filter((p) => !/[*<>{}\[\]…]/.test(p))
        .filter((p) => !p.includes("node_modules")),
    ),
  ];
}

/**
 * Die Anleitung nennt Dateien manchmal verkuerzt, weil der volle Pfad im
 * Erklaertext nichts hilft. Ein Treffer irgendwo im Baum zaehlt deshalb — es
 * geht darum, ob die Datei EXISTIERT, nicht ob der Pfad vollstaendig ist.
 */
function findetSichImBaum(pfad: string): boolean {
  if (existsSync(join(WURZEL, pfad))) return true;
  const treffer = execFileSync(
    "git",
    ["ls-files", `*${pfad.split("/").pop()}`],
    { cwd: WURZEL, encoding: "utf8" },
  )
    .split("\n")
    .filter(Boolean);
  return treffer.some((t: string) => t.endsWith(pfad));
}

for (const pfad of genanntePfade()) {
  geprueft++;
  if (!findetSichImBaum(pfad)) {
    befunde.push({
      was: "genannte Datei fehlt",
      sagt: pfad,
      stimmt: "weder im Baum noch in der Versionsverwaltung",
      wo: "CLAUDE.md",
    });
  }
}

/** `npm run xyz` — jeder genannte Befehl muss in package.json stehen. */
const paket = JSON.parse(lies("package.json")) as { scripts?: Record<string, string> };
const skripte = Object.keys(paket.scripts ?? {});
for (const treffer of new Set(claudeMd.match(/npm run ([a-z0-9:-]+)/g) ?? [])) {
  const name = treffer.replace("npm run ", "");
  geprueft++;
  if (!skripte.includes(name)) {
    befunde.push({
      was: "genannter Befehl fehlt",
      sagt: `npm run ${name}`,
      stimmt: "steht nicht in package.json",
      wo: "CLAUDE.md",
    });
  }
}

// ---------------------------------------------------------------------------
// B) Register: Zahlen, die schon einmal falsch dastanden
// ---------------------------------------------------------------------------

type Zahlenpruefung = {
  /** Worum geht es, in Klartext. */
  was: string;
  /** Wie die Wahrheit aus dem Code kommt. */
  wahrheit: () => string | null;
  /** Wie die Behauptung aus CLAUDE.md kommt. Null = steht (nicht mehr) drin. */
  behauptung: () => string | null;
};

const ZAHLEN: Zahlenpruefung[] = [
  {
    was: "Maximale Breite der Kopfzeile",
    wahrheit: () => greif(lies("lib/theme.ts"), /'--header-max-width':\s*'(\d+)px'/),
    behauptung: () => greif(claudeMd, /`--header-max-width`\s*\((\d+)\s*px\)/),
  },
  {
    was: "Umschaltpunkt Kopfzeile (Menue statt Burger)",
    wahrheit: () => greif(lies("components/Header.tsx"), /matchMedia\("\(min-width:\s*(\d+)px\)"\)/),
    behauptung: () => greif(claudeMd, /NICHT gegen den Umschaltpunkt \((\d+)\s*px\)/),
  },
  {
    was: "Weiterleitungen gesamt in der Routen-Konfiguration",
    wahrheit: () => String((lies("next.config.js").match(/source:/g) ?? []).length),
    behauptung: () => greif(claudeMd, /der (\d+) Weiterleitungen in `next\.config\.js`/),
  },
  {
    was: "Davon Foerderseiten",
    wahrheit: () =>
      String(
        (lies("next.config.js")
          .split("\n")
          .filter((z) => z.includes("source:") && z.includes("foerderung")) ?? []).length,
      ),
    behauptung: () => greif(claudeMd, /(\d+) der \d+ Weiterleitungen in `next\.config\.js`/),
  },
  {
    was: "Zeitlimit der Datenbank-Notbremse",
    wahrheit: () => {
      const ms = greif(lies("lib/db-timeout.ts"), /DB_READ_TIMEOUT_MS\s*=\s*(\d+)/);
      return ms ? String(Number(ms) / 1000) : null;
    },
    behauptung: () => greif(claudeMd, /am (\d+)-s-Fast-Fail/),
  },
];

for (const p of ZAHLEN) {
  geprueft++;
  let wahr: string | null = null;
  try {
    wahr = p.wahrheit();
  } catch (e) {
    befunde.push({
      was: p.was,
      sagt: "—",
      stimmt: `Quelle nicht lesbar: ${(e as Error).message}`,
      wo: "Code",
    });
    continue;
  }
  const behauptet = p.behauptung();

  // Steht die Aussage nicht mehr in der Datei, ist das kein Fehler — sie darf
  // umformuliert oder gestrichen werden. Fehlt dagegen die QUELLE, ist das einer:
  // dann zeigt das Register auf Code, den es nicht mehr gibt.
  if (wahr === null) {
    befunde.push({
      was: p.was,
      sagt: behauptet ?? "—",
      stimmt: "im Code nicht mehr auffindbar — Register veraltet",
      wo: "scripts/claude-md-verify.ts",
    });
    continue;
  }
  if (behauptet === null) continue;

  if (behauptet !== wahr) {
    befunde.push({ was: p.was, sagt: behauptet, stimmt: wahr, wo: "CLAUDE.md" });
  }
}

// ---------------------------------------------------------------------------
// Ausgabe
// ---------------------------------------------------------------------------

if (befunde.length === 0) {
  console.log(`CLAUDE.md gegen den Code: ${geprueft} Angaben geprueft, keine Abweichung.`);
  process.exit(0);
}

console.log(`CLAUDE.md gegen den Code: ${befunde.length} Abweichung(en) von ${geprueft} Angaben.\n`);
for (const b of befunde) {
  console.log(`  ${b.was}`);
  console.log(`    Anleitung sagt : ${b.sagt}`);
  console.log(`    Tatsaechlich   : ${b.stimmt}`);
  console.log(`    Zu aendern in  : ${b.wo}\n`);
}
console.log(
  "Eine Anleitung, die dem Code widerspricht, fuehrt still zu falschen Entscheidungen.\n" +
    "Korrigieren, nicht die Pruefung aufweichen.",
);
process.exit(1);
