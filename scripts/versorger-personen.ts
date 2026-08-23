/**
 * Schritt 1 der Kontakt-Erfassung: Einsammeln, welche FUNKTIONSBEZEICHNUNGEN es
 * bei deutschen Versorgern real gibt — und wie viele überhaupt eine
 * Personenseite haben.
 *
 * Dieser Lauf ordnet NICHTS ein und schreibt NICHTS in die Datenbank. Er zählt.
 *
 * Warum diese Reihenfolge: Weder der Betreiber noch ich wissen, welche Funktion
 * bei einem Stadtwerk über ein Website-Werkzeug entscheidet. Eine erfundene
 * Rollen-Rangfolge wäre auch für einen Fachmann ein schlechter Prüfgegenstand.
 * Aus der offenen Frage („wer entscheidet?") wird durch diesen Lauf eine
 * geschlossene („diese Bezeichnungen kommen real vor — welche davon
 * entscheidet?").
 *
 * Die zweite Zahl ist genauso wichtig: **Wie viele Versorger haben überhaupt
 * eine Personenseite?** Sind es nur 30 %, deckelt das den ganzen Ansatz, und
 * die Ansprache läuft über Telefon statt über Adressen. Das will man vor dem
 * Bau wissen, nicht danach.
 *
 * Nutzung:
 *   tsx scripts/versorger-personen.ts                 # 60, geschichtet
 *   tsx scripts/versorger-personen.ts --anzahl=120
 *   tsx scripts/versorger-personen.ts --ablage=<pfad> # Rohfunde als JSON
 */

import { dirname, resolve } from "node:path";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { domainOf, findLinkUrl } from "../lib/kommunen-profil";
import { type Person, personenAus } from "../lib/personen-fund";
import { PARALLEL, holeSeite, inHaeppchen, sitemapAdressen } from "../lib/website-abruf";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));

function log(msg = "", level: "info" | "ok" | "err" = "info"): void {
  const prefix = level === "ok" ? "✓ " : level === "err" ? "✗ " : "  ";
  // eslint-disable-next-line no-console
  console.log(msg ? prefix + msg : "");
}

function loadEnvFile(): void {
  const envPath = resolve(SCRIPT_DIR, "..", ".env.local");
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
  if (!url || !key) throw new Error("SUPABASE_URL oder SUPABASE_SERVICE_KEY fehlt in .env.local");
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Seiten, auf denen Menschen stehen — als Gattung, nicht als geratener Pfad.
 *
 * `kontakt` steht bewusst mit drin, obwohl dort meist nur Abteilungspostfächer
 * stehen: Bei Stadtwerke Lingen führt von der Kontaktseite ein Verweis auf die
 * eigentliche Personenseite, und die steht in keiner Menüleiste.
 */
const PERSONENSEITE =
  /ansprechpartner|ihr-team|unser-team|\bteam\b|abteilung|mitarbeiter|wir-ueber-uns|ueber-uns|über-uns|unternehmen\b|vorstand|geschaeftsfuehrung|geschäftsführung|organisation|kontakt|presse/i;

type Kandidat = { id: string; name: string; website: string; einwohner: number; land: string | null };

/**
 * Grobe Himmelsrichtung aus den ersten beiden Stellen des Gemeindeschlüssels,
 * damit die Stichprobe nicht aus einer Ecke stammt.
 *
 * Die Tabelle führt kein Bundesland-Feld, aber der Schlüssel trägt es: 01
 * Schleswig-Holstein bis 16 Thüringen. Das ist die verlässlichere Quelle als
 * ein Textfeld — sie kann nicht anders geschrieben sein.
 */
const LANDESTEIL: Record<string, string> = {
  "01": "Nord", "02": "Nord", "03": "Nord", "04": "Nord", "13": "Nord",
  "05": "West", "06": "West", "07": "West", "10": "West",
  "08": "Sued", "09": "Sued",
  "11": "Ost", "12": "Ost", "14": "Ost", "15": "Ost", "16": "Ost",
};

function landesteil(gemeindeschluessel: string | null): string {
  return LANDESTEIL[(gemeindeschluessel ?? "").slice(0, 2)] ?? "Unbekannt";
}

function groessenband(ew: number): string {
  if (ew < 20_000) return "klein";
  if (ew <= 100_000) return "mittel";
  return "gross";
}

async function alleZeilen(db: SupabaseLike, tabelle: string, spalten: string): Promise<Record<string, unknown>[]> {
  const out: Record<string, unknown>[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from(tabelle).select(spalten).range(from, from + 999);
    if (error) throw new Error(`${tabelle}: ${error.message}`);
    out.push(...((data ?? []) as Record<string, unknown>[]));
    if (!data || data.length < 1000) break;
  }
  return out;
}

/**
 * Geschichtete Stichprobe über Größenband × Landesteil.
 *
 * Der Betreiber hat zu Recht eingewandt, dass drei Fälle zu wenig sind und sich
 * die Websites bundesweit stark unterscheiden. Eine reine Zufallsauswahl träfe
 * überproportional Bayern (215 der 937). Die Schichtung erzwingt Streuung; die
 * Auswahl innerhalb einer Schicht ist stabil sortiert, damit ein zweiter Lauf
 * dieselben trifft und Unterschiede am Code liegen, nicht an der Auswahl.
 */
async function stichprobe(db: SupabaseLike, anzahl: number): Promise<Kandidat[]> {
  const versorger = await alleZeilen(db, "utilities", "id,name,website,sitz_gemeinde_id");
  const zuordnung = await alleZeilen(db, "utility_communes", "utility_id,commune_id");
  const regionen = await alleZeilen(db, "mastr_regions", "region_id,population");

  const ew = new Map<string, number>();
  for (const r of regionen) ew.set(String(r.region_id), Number(r.population) || 0);

  const summe = new Map<string, number>();
  // Der Landesteil kommt vom ERSTEN zugeordneten Gemeindeschluessel. Bei einem
  // Netz ueber eine Landesgrenze hinweg ist das eine Vereinfachung — fuer eine
  // Streuungs-Schichtung reicht sie, fuer eine Aussage ueber das Land nicht.
  const erstesLand = new Map<string, string>();
  for (const z of zuordnung) {
    const uid = String(z.utility_id);
    const cid = String(z.commune_id);
    summe.set(uid, (summe.get(uid) ?? 0) + (ew.get(cid) ?? 0));
    if (!erstesLand.has(uid)) erstesLand.set(uid, cid);
  }

  const alle: Kandidat[] = versorger
    .filter((v) => !!v.website)
    .map((v) => ({
      id: String(v.id),
      name: String(v.name),
      website: String(v.website),
      einwohner: summe.get(String(v.id)) ?? 0,
      land: erstesLand.get(String(v.id)) ?? null,
    }))
    .filter((v) => v.einwohner > 0)
    .sort((a, b) => a.id.localeCompare(b.id));

  const schichten = new Map<string, Kandidat[]>();
  for (const k of alle) {
    const schluessel = `${groessenband(k.einwohner)}/${landesteil(k.land)}`;
    if (!schichten.has(schluessel)) schichten.set(schluessel, []);
    schichten.get(schluessel)!.push(k);
  }

  // Reihum aus jeder Schicht ziehen, bis die Zahl erreicht ist.
  const namen = [...schichten.keys()].sort();
  const gezogen: Kandidat[] = [];
  for (let runde = 0; gezogen.length < anzahl; runde++) {
    let etwasGezogen = false;
    for (const s of namen) {
      const topf = schichten.get(s)!;
      if (runde >= topf.length) continue;
      gezogen.push(topf[runde]);
      etwasGezogen = true;
      if (gezogen.length >= anzahl) break;
    }
    if (!etwasGezogen) break;
  }
  return gezogen;
}

type Befund = {
  versorger: string;
  einwohner: number;
  schicht: string;
  abruf: "ok" | "unerreichbar";
  seiten: string[];
  personen: Person[];
};

/** Höchstens so viele Unterseiten je Versorger — fremde Server schonen. */
const MAX_SEITEN = 5;

async function erhebe(k: Kandidat): Promise<Befund> {
  const grund: Befund = {
    versorger: k.name,
    einwohner: k.einwohner,
    schicht: `${groessenband(k.einwohner)}/${landesteil(k.land)}`,
    abruf: "unerreichbar",
    seiten: [],
    personen: [],
  };

  const start = await holeSeite(k.website);
  if ("fehler" in start) return grund;
  grund.abruf = "ok";

  const geholt = new Map<string, string>([[k.website, start.html]]);
  const hole = async (url: string) => {
    if (geholt.has(url) || geholt.size > MAX_SEITEN) return;
    const s = await holeSeite(url);
    if ("html" in s) geholt.set(url, s.html);
  };

  // Stufe 1: von der Startseite aus.
  const vonStart = findLinkUrl(start.html, k.website, PERSONENSEITE);
  if (vonStart) await hole(vonStart);

  // Stufe 2: aus dem eigenen Seitenverzeichnis. Kürzeste Adressen zuerst — sie
  // liegen höher im Baum und sind eher die Übersicht als ein Einzelprofil.
  const verzeichnis = await sitemapAdressen(k.website);
  const kandidaten = verzeichnis
    .filter((u) => {
      try {
        return PERSONENSEITE.test(decodeURIComponent(u));
      } catch {
        return PERSONENSEITE.test(u);
      }
    })
    .sort((a, b) => a.length - b.length)
    .slice(0, MAX_SEITEN);
  for (const u of kandidaten) await hole(u);

  // Stufe 3: eine Ebene unter der Kontaktseite. Genau dort liegt sie bei
  // Stadtwerke Lingen — verlinkt als „unsere anSPRECHPARTNER", in keinem Menü.
  for (const [url, html] of [...geholt]) {
    if (grund.personen.length) break;
    const tiefer = findLinkUrl(html, url, /ansprechpartner|ihr-team|unser-team|mitarbeiter|abteilung/i);
    if (tiefer) await hole(tiefer);
  }

  const eigene = domainOf(k.website);
  for (const [url, html] of geholt) {
    const gefunden = personenAus(html).filter((p) => {
      const dom = p.mail.split("@")[1];
      return !eigene || dom === eigene || dom.endsWith(`.${eigene}`);
    });
    if (!gefunden.length) continue;
    grund.seiten.push(url);
    for (const p of gefunden) if (!grund.personen.some((q) => q.mail === p.mail)) grund.personen.push(p);
  }
  return grund;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const anzahl = Number(argv.find((a) => a.startsWith("--anzahl="))?.split("=")[1] ?? 60);
  const ablage = argv.find((a) => a.startsWith("--ablage="))?.split("=")[1];

  const db = await makeClient();
  const liste = await stichprobe(db, anzahl);
  log(`${liste.length} Versorger in der Stichprobe, geschichtet nach Größe × Landesteil`);
  log("Dieser Lauf ordnet nichts ein und schreibt nichts. Er zählt.");
  log();

  const befunde = await inHaeppchen(liste, PARALLEL, async (k) => {
    const b = await erhebe(k);
    const kurz =
      b.abruf === "unerreichbar"
        ? "nicht erreicht"
        : b.personen.length
          ? `${b.personen.length} Personen, ${b.personen.filter((p) => p.funktion).length} mit Funktion`
          : "keine Personenseite gefunden";
    log(`${k.name} [${b.schicht}] — ${kurz}`, b.personen.length ? "ok" : "info");
    return b;
  });

  const erreicht = befunde.filter((b) => b.abruf === "ok");
  const mitPersonen = erreicht.filter((b) => b.personen.length > 0);
  const allePersonen = befunde.flatMap((b) => b.personen);

  log();
  log("── Abdeckung ──────────────────────────────────────────");
  log(`abgerufen                    : ${erreicht.length} von ${befunde.length}`);
  log(`mit mindestens einer Person  : ${mitPersonen.length}  (${anteil(mitPersonen.length, erreicht.length)})`);
  log(`Personen insgesamt           : ${allePersonen.length}`);
  log(`davon mit Funktionsangabe    : ${allePersonen.filter((p) => p.funktion).length}`);
  log(`davon mit Durchwahl          : ${allePersonen.filter((p) => p.telefon).length}`);

  log();
  log("── Abdeckung je Schicht ───────────────────────────────");
  const schichten = [...new Set(befunde.map((b) => b.schicht))].sort();
  for (const s of schichten) {
    const inS = befunde.filter((b) => b.schicht === s && b.abruf === "ok");
    const mit = inS.filter((b) => b.personen.length > 0);
    log(`${s.padEnd(16)} ${String(mit.length).padStart(3)} von ${String(inS.length).padStart(3)}  ${anteil(mit.length, inS.length)}`);
  }

  log();
  log("── Funktionsbezeichnungen, wörtlich, nach Häufigkeit ──");
  const zaehler = new Map<string, number>();
  for (const p of allePersonen) {
    for (const wert of [p.funktion, p.abschnitt]) {
      if (!wert) continue;
      zaehler.set(wert, (zaehler.get(wert) ?? 0) + 1);
    }
  }
  const sortiert = [...zaehler.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  log(`${sortiert.length} verschiedene Bezeichnungen`);
  log();
  for (const [wort, n] of sortiert) log(`${String(n).padStart(3)} × ${wort}`);

  if (ablage) {
    writeFileSync(ablage, JSON.stringify({ erhobenAm: new Date().toISOString(), befunde }, null, 2), "utf8");
    log();
    log(`Rohfunde abgelegt: ${ablage}`, "ok");
  }
}

function anteil(teil: number, ganz: number): string {
  return ganz ? `${Math.round((teil / ganz) * 100)} %` : "—";
}

main().catch((e) => {
  log(e instanceof Error ? e.message : String(e), "err");
  process.exit(1);
});
