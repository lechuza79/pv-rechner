/**
 * Outreach-Auswertung: ALLE Quellen frisch, in einem Befehl.
 *
 *   npm run kommunen:auswertung
 *
 * WHY (26.09.2026): Asked for "the current outreach evaluation", a session ran
 * the status overview, which only READS what other runs had filed days ago —
 * and reported it as current. Missed in that answer: Trier (city press release,
 * linked on a regional portal), Meinersen (Facebook post), a second Berkenthin
 * article, a regional paper linking the district page — plus a "you may send
 * today" on a Saturday evening. Every one of those was findable with the tools
 * we had; they just were not run.
 *
 * So this command runs every source NOW, in parallel, and says per source
 * whether it came through. A source that fails or dies is a warning at the top,
 * never a silent "nothing new":
 *   - Postfach (IMAP, 30 Tage; trägt Rückläufer nach)
 *   - Besucherherkunft über die ganze Website (Vercel Web Analytics)
 *   - Websuche je Gemeinde + Quer-Suche (findet Presse und Facebook-Posts)
 *   - Suche je Gemeinde-Domain
 *   - danach die Übersicht (Stand, Bilanz, Abos, Versandampel)
 *
 * Costs ~1,50 $ web search per run, takes ~15 minutes.
 */
import { spawn } from "node:child_process";

type Quelle = { name: string; args: string[]; limitMin: number };

const QUELLEN: Quelle[] = [
  { name: "Postfach", args: ["run", "kommunen:ruecklauf", "--", "--tage=30", "--schreiben"], limitMin: 10 },
  { name: "Besucherherkunft", args: ["run", "kommunen:klicks"], limitMin: 15 },
  { name: "Websuche", args: ["run", "kommunen:presse"], limitMin: 40 },
  { name: "Gemeinde-Domains", args: ["run", "kommunen:verweise"], limitMin: 40 },
];

type Ergebnis = { name: string; code: number | null; sekunden: number; ausgabe: string; abgebrochen: boolean };

function lauf(q: Quelle): Promise<Ergebnis> {
  const start = Date.now();
  return new Promise((resolve) => {
    const kind = spawn("npm", q.args, { env: process.env });
    let ausgabe = "";
    kind.stdout.on("data", (d) => (ausgabe += d));
    kind.stderr.on("data", (d) => (ausgabe += d));
    let abgebrochen = false;
    const uhr = setTimeout(() => {
      abgebrochen = true;
      kind.kill("SIGTERM");
    }, q.limitMin * 60_000);
    kind.on("close", (code) => {
      clearTimeout(uhr);
      resolve({ name: q.name, code, sekunden: Math.round((Date.now() - start) / 1000), ausgabe, abgebrochen });
    });
  });
}

/** Strips npm's banner and the progress lines ("… 25 von 289 gesucht"). */
function bereinigt(ausgabe: string): string {
  return ausgabe
    .split("\n")
    .filter((z) => !/^> /.test(z) && !/^\s*… \d+ von \d+/.test(z))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function main() {
  console.log(`Outreach-Auswertung, alle Quellen frisch — Start ${new Date().toLocaleString("de-DE", { timeZone: "Europe/Berlin" })}\n`);
  const ergebnisse = await Promise.all(QUELLEN.map(lauf));

  console.log("QUELLEN");
  let kaputt = 0;
  for (const e of ergebnisse) {
    const ok = e.code === 0 && !e.abgebrochen;
    if (!ok) kaputt++;
    const grund = e.abgebrochen ? "ZEITLIMIT — Ergebnis unvollständig" : e.code === 0 ? "ok" : `FEHLGESCHLAGEN (Code ${e.code})`;
    console.log(`  ${ok ? "✓" : "✗"} ${e.name.padEnd(18)} ${grund} · ${e.sekunden} s`);
  }
  if (kaputt) console.log(`\n! ${kaputt} Quelle(n) nicht vollständig — „nichts gefunden" gilt dort NICHT.`);

  for (const e of ergebnisse) {
    console.log(`\n\n══════ ${e.name} ══════\n${bereinigt(e.ausgabe)}`);
  }

  // The overview last: it reads what the sources above have just written.
  const stand = await lauf({ name: "Übersicht", args: ["run", "kommunen:stand"], limitMin: 10 });
  console.log(`\n\n══════ Übersicht ══════\n${bereinigt(stand.ausgabe)}`);
  process.exitCode = kaputt || stand.code ? 1 : 0;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
