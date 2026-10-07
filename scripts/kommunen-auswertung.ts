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
 *   - Fundstellen: jede verlinkende Seite aus dem Backlink-Index und die
 *     Websites aller Empfänger, gelesen nach einer Erwähnung (07.10.2026 — ohne
 *     diese Quelle fehlten an einem Tag sechs Veröffentlichungen, darunter drei,
 *     die der Index längst kannte und nur als Domainname ausgab)
 *   - danach die Übersicht: zuerst die Tabelle je Aussendung (feste Fenster
 *     nach dem Versandtag), dann Stand, Bilanz, Abos, Versandampel
 *
 * The paid web searches (kommunen:presse, kommunen:verweise) are NOT part of
 * this run any more (decision 28.09.2026): the search service is meant for
 * rating linking sites and competitor backlinks, not for a recurring search
 * across every contacted place. What the web search used to add — posts
 * nobody clicked on — is covered by a few cross-searches Claude runs with its
 * own web search tool after this command ("solar-check.io" next to "Platz 1").
 * Both scripts stay for a deliberate manual run. Free, takes ~2 minutes.
 */
import { spawn } from "node:child_process";

type Quelle = { name: string; args: string[]; limitMin: number };

const QUELLEN: Quelle[] = [
  { name: "Postfach", args: ["run", "kommunen:ruecklauf", "--", "--tage=30", "--schreiben"], limitMin: 10 },
  { name: "Besucherherkunft", args: ["run", "kommunen:klicks"], limitMin: 15 },
  // Exit code 2 = open findings, not a failure: the source came through.
  { name: "Fundstellen", args: ["run", "outreach:fundstellen"], limitMin: 45 },
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
    const ok = (e.code === 0 || (e.name === "Fundstellen" && e.code === 2)) && !e.abgebrochen;
    if (!ok) kaputt++;
    const grund = e.abgebrochen ? "ZEITLIMIT — Ergebnis unvollständig" : e.code === 0 ? "ok" : `FEHLGESCHLAGEN (Code ${e.code})`;
    console.log(`  ${ok ? "✓" : "✗"} ${e.name.padEnd(18)} ${grund} · ${e.sekunden} s`);
  }
  if (kaputt) console.log(`\n! ${kaputt} Quelle(n) nicht vollständig — „nichts gefunden" gilt dort NICHT.`);

  for (const e of ergebnisse) {
    console.log(`\n\n══════ ${e.name} ══════\n${bereinigt(e.ausgabe)}`);
  }

  // The overview last: it reads what the sources above have just written.
  // The per-sending table comes first: fair windows after each send day, so a
  // two-day-old sending can be compared with a month-old one.
  const [kennzahlen, stand] = await Promise.all([
    lauf({ name: "Je Aussendung", args: ["run", "outreach:kennzahlen"], limitMin: 10 }),
    lauf({ name: "Übersicht", args: ["run", "kommunen:stand"], limitMin: 10 }),
  ]);
  const kennzahlenText = kennzahlen.code === 0 && !kennzahlen.abgebrochen
    ? bereinigt(kennzahlen.ausgabe)
    : `! Tabelle je Aussendung nicht verfügbar (${kennzahlen.abgebrochen ? "Zeitlimit" : `Code ${kennzahlen.code}`}):\n${bereinigt(kennzahlen.ausgabe)}`;
  console.log(`\n\n══════ Übersicht ══════\n${kennzahlenText}\n\n${bereinigt(stand.ausgabe)}`);

  // The verdict. "Vollständig" only when every source came through and nothing
  // found is left unsorted — never because a summary looks plausible.
  const fund = ergebnisse.find((e) => e.name === "Fundstellen");
  const nichtLesbar = Number(/NICHT_LESBAR=(\d+)/.exec(fund?.ausgabe ?? "")?.[1] ?? 0);
  const offen = fund?.code === 2 && /offene Fundstellen —/.test(fund.ausgabe);
  const ungelesen = fund?.code === 2 && (nichtLesbar > 0 || /Backlink-Index: NICHT gelesen/.test(fund.ausgabe));
  console.log("\n\n══════ Urteil ══════");
  if (!kaputt && !offen && !ungelesen) {
    console.log("✓ VOLLSTÄNDIG für alles, was sich prüfen lässt.");
  } else {
    console.log("✗ NICHT VOLLSTÄNDIG:");
    if (kaputt) console.log(`  - ${kaputt} Quelle(n) nicht durchgekommen (siehe oben)`);
    if (offen) console.log("  - offene Fundstellen — erst lesen und eintragen oder verwerfen, dann berichten");
    if (nichtLesbar) console.log(`  - ${nichtLesbar} Websites nicht lesbar — dort kann eine Veröffentlichung stehen, die niemand gesehen hat`);
    if (/Backlink-Index: NICHT gelesen/.test(fund?.ausgabe ?? "")) console.log("  - Backlink-Index nicht gelesen");
  }
  console.log("  Grundsätzlich nicht sichtbar: Beiträge in sozialen Netzen ohne Klick zu uns, Druckausgaben,");
  console.log("  Seiten hinter Anmeldung oder Bezahlschranke, Websites, die oben als „nicht lesbar\" stehen.");
  process.exitCode = kaputt || stand.code || kennzahlen.code || offen || ungelesen ? 1 : 0;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
