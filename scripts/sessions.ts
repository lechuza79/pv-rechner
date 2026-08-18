/**
 * `npm run sessions` — wer arbeitet gerade wo, und was liegt herum?
 *
 * GEMESSEN, NICHT ANGEMELDET. Es gibt bewusst keine Liste, in die sich eine
 * Sitzung einträgt: Eine solche Liste ist eine zweite Wahrheit, sie veraltet in
 * dem Moment, in dem jemand vergisst sie zu pflegen, und sie erzeugt
 * ausgerechnet in der Datei Konflikte, die Konflikte verhindern soll. Alles hier
 * kommt aus dem, was ohnehin da ist: git und die laufenden Prozesse.
 *
 * Warum es das braucht (18.08.2026): An diesem Tag liefen bis zu elf
 * Arbeitsstände parallel. Schaden entstand nicht durch Kollisionen — es gab an
 * dem Tag keine einzige —, sondern durch Unsichtbarkeit:
 *   · Eine Sitzung fing Arbeit neu an, die längst fertig und eingecheckt war.
 *   · Zwei liegengebliebene Stände enthielten Arbeit, die inzwischen jemand
 *     anders noch einmal gemacht hatte — beide Male unbemerkt doppelt bezahlt.
 *   · Ein Dev-Server lief aus einem fremden Verzeichnis und lieferte fremden
 *     Code; die Sitzung suchte den Fehler im eigenen Zweig.
 * Jede dieser drei Fragen beantwortet dieser Befehl in zwei Sekunden. Ich habe
 * sie an dem Tag dreimal von Hand beantwortet, jedes Mal in fünf Minuten.
 *
 * Was der Befehl NICHT kann: Er sieht keine Absichten. Zwei Sitzungen, die
 * dieselbe Aufgabe bekommen haben und noch keine Zeile geschrieben haben, sind
 * hier nicht zu unterscheiden — das bleibt eine Frage an den Auftraggeber.
 */
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { basename, resolve } from "node:path";

const WURZEL = resolve(__dirname, "..");

function git(befehl: string, cwd: string): string {
  try {
    return execSync(`git ${befehl}`, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
}

/** Wie `git`, aber OHNE den Ausgabe-Trim. Bei `status --porcelain` ist die
 *  führende Spalte bedeutungstragend (` M datei` = geändert, `M  datei` =
 *  vorgemerkt); ein Trim frisst sie in der ersten Zeile und verschiebt jeden
 *  Dateinamen um ein Zeichen — in der ersten Fassung stand hier „ackage.json". */
function gitRoh(befehl: string, cwd: string): string {
  try {
    return execSync(`git ${befehl}`, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return "";
  }
}

/** Das Haupt-Arbeitsverzeichnis steht immer an erster Stelle der Liste — es aus
 *  dem eigenen Pfad abzuleiten geht schief, sobald der Befehl (wie hier) selbst
 *  aus einer Worktree heraus läuft. */
const HAUPT = git("worktree list --porcelain", WURZEL).match(/^worktree (.+)$/m)?.[1]
  ?? git("rev-parse --show-toplevel", WURZEL)
  ?? WURZEL;

/** Der Vergleichspunkt ist `origin/main`, nicht das lokale `main`: Ein lokales
 *  main kann Tage hinterherhängen, und dann sieht fremde Arbeit wie offene
 *  Arbeit aus. Fällt origin/main aus (kein Netz), tut es das lokale. */
const BASIS = git("rev-parse --verify origin/main", HAUPT) ? "origin/main" : "main";

interface Stand {
  pfad: string;
  name: string;
  zweig: string;
  eigene: number;        // Commits, die es auf der Hauptlinie noch nicht gibt
  schonOben: number;     // davon inhaltlich schon oben (anderer Weg, gleicher Inhalt)
  offen: string[];       // nie eingecheckte Dateien
  offenSchonOben: number; // davon inhaltsgleich mit der Hauptlinie
  letzter: string;       // Datum des letzten eigenen Commits
  tageStill: number;
  bereiche: string[];
  server: { pid: number; port: string }[];
}

/** Läuft in diesem Verzeichnis ein Dev-Server? Erkannt am Pfad in der
 *  Prozesszeile — genau die Verwechslung, die am 18.08.2026 zwei Sitzungen je
 *  mehrere Stunden gekostet hat (Playwright übernimmt einen fremden Server auf
 *  dem Zielport ungefragt). */
function alleServer(): { pid: number; port: string; cwd: string }[] {
  let zeilen: string[] = [];
  try {
    zeilen = execSync("ps -eo pid=,command=", { encoding: "utf8" }).split("\n");
  } catch {
    return [];
  }
  const out: { pid: number; port: string; cwd: string }[] = [];
  for (const z of zeilen) {
    if (!z.includes("next dev") && !z.includes("next start")) continue;
    const pid = Number(z.trim().split(/\s+/)[0]);
    if (!pid) continue;
    // Das ARBEITSVERZEICHNIS des Prozesses entscheidet, nicht sein Pfad in der
    // Kommandozeile: Der Pfad des Haupt-Repos ist ein Präfix jeder Worktree, ein
    // Textvergleich ordnet damit jeden Worktree-Server zusätzlich dem Haupt-Repo
    // zu — die erste Fassung meldete daraufhin drei Port-Kollisionen, die es
    // nicht gab.
    let cwd = "";
    try {
      cwd = execSync(`lsof -a -p ${pid} -d cwd -Fn`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })
        .split("\n").find((l) => l.startsWith("n"))?.slice(1) ?? "";
    } catch {
      cwd = "";
    }
    const port = z.match(/(?:-p|--port)[= ](\d+)/)?.[1] ?? "3000";
    out.push({ pid, port, cwd });
  }
  return out;
}

const SERVER = alleServer();

function serverFuer(pfad: string): { pid: number; port: string }[] {
  return SERVER.filter((s) => s.cwd === pfad).map(({ pid, port }) => ({ pid, port }));
}

/** Zwei Ebenen tief: „app/(site)/photovoltaik-rechner" sagt etwas, „app" nicht. */
function bereich(datei: string): string {
  const teile = datei.split("/");
  return teile.length <= 2 ? teile.join("/") : teile.slice(0, 2).join("/");
}

function tageSeit(iso: string): number {
  if (!iso) return Infinity;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

function lies(pfad: string, zweig: string): Stand {
  const basisPunkt = git(`merge-base ${BASIS} HEAD`, pfad);
  const eigeneCommits = basisPunkt
    ? git(`rev-list --count ${basisPunkt}..HEAD`, pfad)
    : "0";

  // `git cherry` markiert mit „-", was inhaltlich schon oben ist (gleicher
  // Patch, anderer Commit) — genau der Fall „das hat inzwischen jemand anders
  // gemacht", der sonst nur beim Lesen auffällt.
  const cherry = basisPunkt ? git(`cherry ${BASIS} HEAD`, pfad).split("\n").filter(Boolean) : [];
  const schonOben = cherry.filter((z) => z.startsWith("-")).length;

  const roh = gitRoh("status --porcelain", pfad)
    .split("\n")
    .filter(Boolean)
    // `XY name`, bei Umbenennung `R  alt -> neu` — dann zählt der neue Name.
    .map((z) => {
      const name = z.slice(3);
      return {
        datei: (name.includes(" -> ") ? name.split(" -> ")[1] : name).replace(/^"|"$/g, ""),
        neu: z.startsWith("??"),
      };
    })
    .filter((e) => e.datei && !e.datei.startsWith("node_modules") && !e.datei.startsWith(".next"));
  const offen = roh.map((e) => e.datei);

  // Eine nie eingecheckte Änderung, die zeichengleich mit der Hauptlinie ist,
  // ist keine offene Arbeit mehr — sie wurde woanders erledigt.
  //
  // GAR NICHT ERFASSTE Dateien sind davon ausgenommen: `git diff` vergleicht
  // nur, was git kennt, und meldet für sie brav „kein Unterschied". Die erste
  // Fassung erklärte damit acht unverfolgte Dateien im Haupt-Repo für erledigt,
  // von denen keine einzige irgendwo eingecheckt war.
  let offenSchonOben = 0;
  for (const e of roh) {
    if (e.neu) continue;
    if (!existsSync(resolve(pfad, e.datei))) continue;
    const gleich = git(`diff --quiet ${BASIS} -- "${e.datei}" && echo gleich`, pfad);
    if (gleich === "gleich") offenSchonOben++;
  }

  const dateien = basisPunkt
    ? git(`diff --name-only ${basisPunkt}..HEAD`, pfad).split("\n").filter(Boolean)
    : [];
  const bereiche = [...new Set([...dateien, ...offen].map(bereich))].sort();

  const letzter = git("log -1 --format=%cs HEAD", pfad);

  return {
    pfad,
    name: pfad === HAUPT ? "· Haupt-Repo ·" : basename(pfad),
    zweig: zweig || "(losgelöst)",
    eigene: Number(eigeneCommits),
    schonOben,
    offen,
    offenSchonOben,
    letzter,
    tageStill: tageSeit(letzter),
    bereiche,
    server: serverFuer(pfad),
  };
}

function staende(): Stand[] {
  const roh = git("worktree list --porcelain", HAUPT).split("\n\n").filter(Boolean);
  const out: Stand[] = [];
  for (const block of roh) {
    const pfad = block.match(/^worktree (.+)$/m)?.[1];
    if (!pfad) continue;
    const zweig = block.match(/^branch refs\/heads\/(.+)$/m)?.[1] ?? "";
    out.push(lies(pfad, zweig));
  }
  return out;
}

// ─── Ausgabe ────────────────────────────────────────────────────────────────

const AKTIV_TAGE = 2;
const ALT_TAGE = 7;
/** Ab wann liegengebliebene, nie eingecheckte Arbeit gemeldet wird. Zwei Tage,
 *  nicht sieben: Die beiden Stände, die am 18.08.2026 doppelt gemacht wurden,
 *  waren drei und vier Tage alt — eine Wochenfrist hätte beide durchgelassen. */
const LIEGT_TAGE = 2;

/** „1 Datei" statt „1 Dateien". Grammatik gehört zur Richtigkeit (CLAUDE.md,
 *  „Aussagen zählen wie Zahlen") — auch in einem Hilfsbefehl. */
const anz = (n: number, ein: string, viele: string) => `${n} ${n === 1 ? ein : viele}`;

function zeile(s: Stand): string[] {
  const zeilen: string[] = [];
  const marke = s.server.length ? "▶" : s.tageStill > ALT_TAGE ? "·" : " ";
  const alter = s.tageStill === 0 ? "heute"
    : s.tageStill === 1 ? "gestern"
    : s.tageStill === Infinity ? "—"
    : `vor ${s.tageStill} Tagen`;

  zeilen.push(`${marke} ${s.name}  [${s.zweig}]  ${alter}`);

  const fakten: string[] = [];
  if (s.eigene > 0) {
    const c = anz(s.eigene, "Commit", "Commits");
    fakten.push(
      s.schonOben > 0
        ? `${c} nicht auf der Hauptlinie (${s.schonOben} davon inhaltlich schon oben)`
        : `${c} nicht auf der Hauptlinie`,
    );
  }
  if (s.offen.length > 0) {
    const d = anz(s.offen.length, "Datei", "Dateien");
    fakten.push(
      s.offenSchonOben > 0
        ? `${d} nie eingecheckt (${s.offenSchonOben} davon inhaltsgleich mit der Hauptlinie)`
        : `${d} nie eingecheckt`,
    );
  }
  for (const srv of s.server) fakten.push(`Dev-Server läuft, Port ${srv.port} (PID ${srv.pid})`);
  if (!fakten.length) fakten.push("nichts Offenes");
  for (const f of fakten) zeilen.push(`    ${f}`);

  if (s.bereiche.length) {
    const zeigen = s.bereiche.slice(0, 6).join(" · ");
    const rest = s.bereiche.length > 6 ? ` … +${s.bereiche.length - 6}` : "";
    zeilen.push(`    fasst an: ${zeigen}${rest}`);
  }
  return zeilen;
}

function befunde(alle: Stand[]): string[] {
  const out: string[] = [];
  for (const s of alle) {
    if (s.pfad === HAUPT) continue;
    if (s.eigene > 0 && s.eigene === s.schonOben) {
      out.push(`${s.name}: alle ${anz(s.eigene, "Commit ist", "Commits sind")} inhaltlich schon auf der Hauptlinie — der Stand kann weg.`);
    }
    if (s.offen.length > 0 && s.offen.length === s.offenSchonOben) {
      out.push(`${s.name}: die nie eingecheckten Änderungen sind inhaltsgleich mit der Hauptlinie — erledigt, der Stand kann weg.`);
    } else if (s.offen.length > 0 && !s.server.length && s.tageStill >= LIEGT_TAGE) {
      out.push(
        `${s.name}: ${anz(s.offen.length, "Datei", "Dateien")} nie eingecheckt, seit ${s.tageStill} Tagen nichts passiert — ` +
        `nachsehen, ob es noch gebraucht wird, bevor es jemand ein zweites Mal baut.`,
      );
    }
    if (s.eigene > s.schonOben && s.tageStill > ALT_TAGE) {
      out.push(`${s.name}: ${anz(s.eigene - s.schonOben, "Commit", "Commits")} nirgends gemergt, letzte Bewegung vor ${s.tageStill} Tagen.`);
    }
  }
  const server = alle.flatMap((s) => s.server.map((v) => ({ ...v, name: s.name })));
  const ports = new Map<string, string[]>();
  for (const v of server) ports.set(v.port, [...(ports.get(v.port) ?? []), v.name]);
  for (const [port, wer] of ports) {
    if (wer.length > 1) out.push(`Port ${port} wird von mehreren beansprucht: ${wer.join(", ")}.`);
  }
  return out;
}

const alle = staende().sort((a, b) => {
  if (a.pfad === HAUPT) return -1;
  if (b.pfad === HAUPT) return 1;
  if (!!b.server.length !== !!a.server.length) return b.server.length - a.server.length;
  return a.tageStill - b.tageStill;
});

const jetzt = git(`log -1 --format=%cs ${BASIS}`, HAUPT);
console.log(`\nArbeitsstände am Repo — verglichen mit ${BASIS} (zuletzt ${jetzt})\n`);
console.log(`  ▶ = Dev-Server läuft    · = seit über ${ALT_TAGE} Tagen unberührt\n`);
for (const s of alle) {
  for (const z of zeile(s)) console.log(z);
  console.log("");
}

const b = befunde(alle);
if (b.length) {
  console.log("Was auffällt:\n");
  for (const z of b) console.log(`  — ${z}`);
  console.log("");
  console.log("  Fremde Stände nie selbst löschen: Ein laufender Dev-Server oder frische");
  console.log("  Commits heißen, da sitzt jemand. Melden, nicht aufräumen.\n");
}

const aktive = alle.filter((s) => s.pfad !== HAUPT && (s.server.length || s.tageStill <= AKTIV_TAGE));
if (aktive.length > 1) {
  console.log(`Vor dem Anfangen: ${aktive.length} Stände sind gerade in Bewegung. Überschneidet sich`);
  console.log(`dein Auftrag mit einem der oben genannten Bereiche, erst die Sitzung fragen.\n`);
}
