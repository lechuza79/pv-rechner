/**
 * Welches Content-Management-System benutzen die erfassten PV-Fachbetriebe?
 *
 * Anlass (01.09.2026): Die Frage, ob ein WordPress-Plugin die Einbett-Hürde
 * senken würde, hängt an einer Zahl, die niemand kennt — wie viele der Betriebe
 * überhaupt WordPress fahren. Raten wäre hier besonders teuer: Ein Plugin ist
 * Bau- und Pflegeaufwand, und die Antwort liegt in unserem eigenen Bestand.
 *
 * Bauweise:
 * - STICHPROBE statt Vollerhebung. Für einen Anteil genügen einige hundert
 *   Abrufe; 3.114 wären Lärm auf fremden Servern für dieselbe Aussage.
 *   Die Auswahl ist deterministisch (alphabetisch, gleichmäßig verteilt),
 *   damit ein zweiter Lauf dieselbe Menge trifft und vergleichbar bleibt.
 * - Erkannt wird an MEHREREN Merkmalen je System, nicht an einem. Ein einziges
 *   Muster erzeugt sonst Fehlgriffe wie beim Firmennamen-Extraktor: gute Quote,
 *   falsche Werte.
 * - "unbekannt" ist ein Befund und wird ausgewiesen, nicht weggerundet. Wer
 *   "nicht erkannt" still als "kein WordPress" zählt, misst seine eigene
 *   Musterliste statt den Markt.
 *
 * Aufruf: npm run fachbetriebe:cms -- [--n 400] [--json <pfad>]
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// ─── Zugang ──────────────────────────────────────────────────────────────────
// Gleiche Bauform wie scripts/fachbetriebe-refresh.ts: die Datei wird vom
// Skript geladen, nie ausgegeben.

function loadEnvFile(): void {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = any;

async function makeClient(): Promise<SupabaseLike> {
  loadEnvFile();
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_KEY fehlen (.env.local)");
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(url, key, { auth: { persistSession: false } });
}

// ─── Erkennung ───────────────────────────────────────────────────────────────
// Je System mehrere unabhängige Merkmale. Ein Treffer genügt, aber die Liste
// ist bewusst eng: Wortbestandteile fremder Wörter dürfen nicht auslösen
// (dieselbe Falle wie "Beförderung" enthält "Förderung" im Förder-Screener).

type Regel = { name: string; muster: RegExp[] };

const REGELN: Regel[] = [
  {
    name: "WordPress",
    muster: [
      /\/wp-content\//i,
      /\/wp-includes\//i,
      /\/wp-json\//i,
      /content=["']WordPress/i,
    ],
  },
  { name: "TYPO3", muster: [/\/typo3temp\//i, /\/typo3conf\//i, /content=["']TYPO3/i] },
  { name: "Joomla", muster: [/content=["']Joomla/i, /\/media\/jui\//i, /\/media\/system\/js\//i] },
  { name: "Drupal", muster: [/content=["']Drupal/i, /\/sites\/default\/files\//i, /drupal-settings-json/i] },
  { name: "Contao", muster: [/content=["']Contao/i, /\/files\/contao\//i] },
  { name: "Wix", muster: [/static\.wixstatic\.com/i, /content=["']Wix\.com/i, /_wixCIDX/i] },
  { name: "Jimdo", muster: [/\.jimdo(site|static|cdn)?\.com/i, /content=["']Jimdo/i] },
  { name: "Squarespace", muster: [/static1\.squarespace\.com/i, /squarespace\.com\/universal/i] },
  { name: "Webflow", muster: [/content=["']Webflow/i, /assets\.website-files\.com/i, /cdn\.prod\.website-files\.com/i] },
  { name: "Shopify", muster: [/cdn\.shopify\.com/i, /Shopify\.theme/i] },
  { name: "IONOS MyWebsite", muster: [/mywebsite-editor/i, /\.ionos\.(space|de)\/static/i, /content=["']IONOS/i] },
  { name: "Weebly", muster: [/content=["']Weebly/i, /cdn\d?\.editmysite\.com/i] },
  { name: "Duda", muster: [/content=["']Duda/i, /irp-cdn\.multiscreensite\.com/i] },
  { name: "Strato", muster: [/content=["']STRATO/i, /strato-editor/i] },
];

/** Erkennt das System an der ausgelieferten Startseite. Mehrfachtreffer werden
 *  gemeldet — sie sind ein Hinweis auf ein zu weites Muster, nicht auf zwei
 *  Systeme. */
function erkenne(html: string): { system: string; mehrdeutig: string[] } {
  const treffer = REGELN.filter((r) => r.muster.some((m) => m.test(html))).map((r) => r.name);
  if (treffer.length === 0) return { system: "unbekannt", mehrdeutig: [] };
  return { system: treffer[0], mehrdeutig: treffer.length > 1 ? treffer : [] };
}

// ─── Abruf ───────────────────────────────────────────────────────────────────

async function holeStartseite(domain: string): Promise<string | null> {
  for (const url of [`https://${domain}/`, `http://${domain}/`]) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 12_000);
      const res = await fetch(url, {
        signal: ctrl.signal,
        redirect: "follow",
        headers: {
          // Ein ehrlicher Bezeichner: Wer wissen will, wer da abruft, soll es
          // sehen können. Tarnung wäre bei einem Messlauf ohnehin sinnlos.
          "user-agent": "solar-check.io CMS-Erhebung (einmalige Stichprobe)",
          accept: "text/html",
        },
      });
      clearTimeout(t);
      if (!res.ok) continue;
      const typ = res.headers.get("content-type") ?? "";
      if (!typ.includes("html")) continue;
      // Die Merkmale stehen im Kopf und in den ersten Skript-Einbindungen.
      // 400 kB reichen dafür weit und deckeln den Speicher.
      return (await res.text()).slice(0, 400_000);
    } catch {
      // nächster Versuch bzw. nächste Domain
    }
  }
  return null;
}

// ─── Lauf ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const nArg = args.indexOf("--n");
  const stichprobe = nArg >= 0 ? Number(args[nArg + 1]) : 400;
  const jsonArg = args.indexOf("--json");
  const jsonPfad = jsonArg >= 0 ? args[jsonArg + 1] : null;

  const db = await makeClient();

  // Nur echte Betriebe. Die Klassen "unklar", "kein-betrieb" und
  // "ueberregional" gehören nicht in die Aussage — ein Vergleichsportal sagt
  // nichts über die Website eines Handwerksbetriebs.
  //
  // SEITENWEISE lesen: Ein einfaches select() liefert stumm nur 1.000 Zeilen,
  // ganz gleich welches limit() danebensteht (CLAUDE.md, gemessene Falle). Der
  // erste Lauf dieses Skripts ist genau darauf hereingefallen und hat seine
  // Stichprobe aus dem Alphabet-Anfang gezogen — eine verzerrte Grundmenge, die
  // im Ergebnis völlig plausibel aussah.
  const alle: string[] = [];
  const SEITE = 1000;
  for (let von = 0; ; von += SEITE) {
    const { data, error } = await db
      .from("fachbetriebe")
      .select("domain")
      .eq("art", "betrieb")
      .order("domain", { ascending: true })
      .range(von, von + SEITE - 1);
    if (error) throw new Error(`Datenbank: ${error.message}`);
    const teil: string[] = (data ?? []).map((r: { domain: string }) => r.domain);
    alle.push(...teil);
    if (teil.length < SEITE) break;
  }
  if (alle.length === 0) throw new Error("Keine Betriebe gefunden");

  // Gleichmäßig über die alphabetisch sortierte Liste ziehen. Deterministisch,
  // damit ein Wiederholungslauf vergleichbar ist, und ohne Ballung auf einen
  // Namensanfang.
  const schritt = Math.max(1, Math.floor(alle.length / stichprobe));
  const probe = alle.filter((_, i) => i % schritt === 0).slice(0, stichprobe);

  console.log(`Bestand: ${alle.length} Betriebe · Stichprobe: ${probe.length} (jeder ${schritt}.)`);

  const zaehler = new Map<string, number>();
  const mehrdeutige: string[] = [];
  let nichtErreichbar = 0;
  let fertig = 0;

  const GLEICHZEITIG = 8;
  let naechster = 0;

  async function arbeiter(): Promise<void> {
    for (;;) {
      const i = naechster++;
      if (i >= probe.length) return;
      const domain = probe[i];
      const html = await holeStartseite(domain);
      if (html === null) {
        nichtErreichbar++;
      } else {
        const { system, mehrdeutig } = erkenne(html);
        zaehler.set(system, (zaehler.get(system) ?? 0) + 1);
        if (mehrdeutig.length) mehrdeutige.push(`${domain}: ${mehrdeutig.join(" + ")}`);
      }
      fertig++;
      if (fertig % 50 === 0) console.log(`  ${fertig}/${probe.length} …`);
    }
  }

  await Promise.all(Array.from({ length: GLEICHZEITIG }, () => arbeiter()));

  const erreicht = probe.length - nichtErreichbar;
  const sortiert = [...zaehler.entries()].sort((a, b) => b[1] - a[1]);

  console.log(`\nErreicht: ${erreicht} von ${probe.length} (${nichtErreichbar} ohne Antwort)\n`);
  console.log("System            Zahl   Anteil der erreichten");
  for (const [system, n] of sortiert) {
    const anteil = ((n / erreicht) * 100).toFixed(1);
    console.log(`${system.padEnd(18)}${String(n).padStart(4)}   ${anteil.padStart(5)} %`);
  }

  if (mehrdeutige.length) {
    console.log(`\nMehrfachtreffer (Muster prüfen), ${mehrdeutige.length} Stück:`);
    mehrdeutige.slice(0, 15).forEach((z) => console.log(`  ${z}`));
  }

  const unbekannt = zaehler.get("unbekannt") ?? 0;
  console.log(
    `\nHinweis: "unbekannt" (${((unbekannt / erreicht) * 100).toFixed(1)} %) heißt NICHT ` +
      `"kein CMS" — es heißt, dass keines unserer Muster griff. Eigenbau, Baukästen ` +
      `kleiner Agenturen und statische Seiten landen hier.`,
  );

  if (jsonPfad) {
    writeFileSync(
      jsonPfad,
      JSON.stringify(
        {
          erhoben_am: new Date().toISOString().slice(0, 10),
          bestand: alle.length,
          stichprobe: probe.length,
          erreicht,
          nicht_erreichbar: nichtErreichbar,
          systeme: Object.fromEntries(sortiert),
          mehrdeutige,
        },
        null,
        2,
      ),
      "utf8",
    );
    console.log(`\nAbgelegt: ${jsonPfad}`);
  }
}

main().catch((e) => {
  console.error(`✗ ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
