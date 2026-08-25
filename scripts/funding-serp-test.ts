/**
 * Messlauf: Bringt die Suchmaschine Förderseiten, die unser eigener Crawler nicht findet?
 *
 *   npm run foerder:serp -- --trocken          # was gefragt würde, ohne Geld
 *   npm run foerder:serp -- --limit 200        # echter Lauf
 *   npm run foerder:serp -- --limit 200 --deckel 1.00
 *
 * DIE FRAGE, DIE DIESER LAUF BEANTWORTET (25.08.2026): Unser Crawler geht zwei
 * Klicks tief und sieht nur, was im Menü verlinkt ist; Google hat dieselbe
 * Website vollständig indexiert. Die Stadt Nidda hat uns ihre Förderseite selbst
 * geschickt — sechs Menü-Ebenen tief, für uns unsichtbar. Statt den Crawler
 * immer weiter zu vertiefen, kann man den fragen, der die Seite ohnehin kennt.
 *
 * WAS ER NICHT BEANTWORTET: ob eine gefundene Adresse wirklich eine Förderung
 * trägt. Das entscheidet unverändert das Screening und danach ein Mensch — eine
 * Adresse aus diesem Lauf ist eine Vermutung, wie jede aus der Linksuche auch.
 * Er schreibt deshalb NICHTS in die Datenbank; er misst nur und legt einen
 * Bericht ab.
 *
 * ZWEI BEGRIFFE, WEIL DIE ANTWORT NICHT FESTSTEHT: „balkonkraftwerk" ist das
 * Thema mit der Kaufabsicht, „photovoltaik" das mit der breiteren Abdeckung —
 * viele Gemeinden führen EIN Programm, das schlicht „Förderprogramm" heißt und
 * Steckersolar mit abdeckt. Ob der zweite Begriff seinen Preis wert ist, ist
 * genau die Frage; deshalb wird je Begriff getrennt gezählt und zusätzlich die
 * Überschneidung ausgewiesen.
 */

import { resolve } from "node:path";
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { bewerteLink, istEndergebnis } from "../lib/funding-url-suche";
import { programmDecktSeite } from "../lib/funding-seiten";
import { FUNDING_PROGRAMS } from "../lib/funding-programs";

function loadEnvFile(): void {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
loadEnvFile();

const trocken = process.argv.includes("--trocken");

function zahl(name: string, standard: number): number {
  const i = process.argv.indexOf(`--${name}`);
  const v = i >= 0 ? Number(process.argv[i + 1]) : NaN;
  return Number.isFinite(v) ? v : standard;
}

const LIMIT = zahl("limit", 200);

/**
 * Harte Kostenbremse — der Lauf bricht ab, statt weiterzuzahlen.
 *
 * Der SEO-Wächter arbeitet mit einem Deckel von 0,50 $ je Lauf. Dieser Lauf
 * liegt bewusst darüber und ist deshalb KEIN Wächter-Schritt, sondern ein
 * angeforderter Messlauf mit eigenem Deckel. Den Wächter-Deckel anzuheben, damit
 * dieser Lauf hineinpasst, wäre die falsche Richtung: Er ist die Bremse für das
 * Tägliche, nicht für das Einmalige.
 */
const DECKEL_USD = zahl("deckel", 1.0);

/** Preis je SERP-Abruf, belegt in scripts/seo-verify.md (Stand 08/2026). */
const PREIS_JE_ABRUF = 0.002;

/**
 * Was gefragt wird — ein Begriff je Abruf, die Domain als Einschränkung.
 *
 * `site:` beschränkt die Antwort auf die Domain der Gemeinde. Ohne die
 * Einschränkung bekämen wir KfW, BAFA und Vergleichsportale, also genau das,
 * was die Linksuche über ihren Host-Filter schon heraushält.
 */
const BEGRIFFE = [
  { name: "photovoltaik", frage: "förderung photovoltaik" },
  { name: "balkonkraftwerk", frage: "förderung balkonkraftwerk" },
] as const;

type BegriffName = (typeof BEGRIFFE)[number]["name"];

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;
const login = process.env.DATAFORSEO_LOGIN;
const passwort = process.env.DATAFORSEO_PASSWORD;

if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_KEY fehlen.");
  process.exit(1);
}
if (!trocken && (!login || !passwort)) {
  console.error(
    "DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD fehlen.\n" +
      "Der Befehl läuft dort, wo .env.local liegt:\n" +
      "  npm run foerder:serp -- --limit 200\n" +
      "Zum Ansehen ohne Netz und ohne Kosten: npm run foerder:serp -- --trocken",
  );
  process.exit(1);
}
const sb = createClient(url, key);

/** PostgREST liefert stumm höchstens 1.000 Zeilen. */
async function alleZeilen<T>(tabelle: string, spalten: string, filter?: (q: any) => any): Promise<T[]> {
  const out: T[] = [];
  const schritt = 1000;
  for (let von = 0; ; von += schritt) {
    let q = sb.from(tabelle).select(spalten).range(von, von + schritt - 1);
    if (filter) q = filter(q);
    const { data, error } = await q;
    if (error) throw new Error(`${tabelle}: ${error.message}`);
    out.push(...((data ?? []) as T[]));
    if (!data || data.length < schritt) break;
  }
  return out;
}

/**
 * Die Gemeinden, bei denen unser eigener Weg nichts gefunden hat.
 *
 * Genau sie sind die Stichprobe: Bei einer Gemeinde mit Fund wüssten wir nicht,
 * ob die Suchmaschine etwas Neues liefert oder dasselbe noch einmal. Ein Treffer
 * hier ist dagegen per Konstruktion einer, den wir sonst nicht hätten.
 *
 * VORBEHALT, der in den Bericht gehört: Das Verdikt „keine-seite" stammt aus dem
 * Suchstand, mit dem es abgelegt wurde. Wurde der Crawler seither repariert,
 * misst dieser Lauf gegen die ALTE Reichweite und schreibt der Suchmaschine
 * Treffer gut, die der reparierte Crawler inzwischen selbst fände. Deshalb wird
 * der Stand je Gemeinde mitgeführt und im Bericht ausgewiesen.
 */
async function stichprobe(limit: number) {
  const kontakte = await alleZeilen<{ region_id: string; website: string | null }>(
    "kommunen_kontakt",
    "region_id, website",
    (q) => q.not("website", "is", null),
  );
  const abgelegt = await alleZeilen<{ region_id: string; verdikt: string; such_version: number | null }>(
    "funding_url_suche",
    "region_id, verdikt, such_version",
  );
  const zeileVon = new Map(abgelegt.map((r) => [r.region_id, r]));

  const ohneFund = kontakte.filter((k) => zeileVon.get(k.region_id)?.verdikt === "keine-seite");

  const ids = ohneFund.map((r) => r.region_id);
  const pop = new Map<string, number>();
  const namen = new Map<string, string>();
  for (let i = 0; i < ids.length; i += 500) {
    const { data } = await sb
      .from("mastr_regions")
      .select("region_id, name, population")
      .in("region_id", ids.slice(i, i + 500));
    for (const r of (data ?? []) as { region_id: string; name: string | null; population: number | null }[]) {
      pop.set(r.region_id, r.population ?? 0);
      if (r.name) namen.set(r.region_id, r.name);
    }
  }

  // ZWEI HÄLFTEN, und das ist keine Feinheit der Statistik.
  //
  // Die erste Fassung nahm schlicht die größten zuerst — dieselbe Reihenfolge
  // wie die Linksuche. Der Trockenlauf lieferte daraufhin Hamburg, München,
  // Düsseldorf, Nürnberg, Hannover: Städte, deren Programme teilweise längst im
  // Katalog stehen. Ein Treffer dort beweist nichts, weil wir die Antwort schon
  // kennen; gemessen worden wäre die bequemste Teilmenge statt der Frage.
  //
  // Die eigentliche Lücke ist der lange Schwanz — die Gemeinden, über die
  // niemand schreibt und die keine Presseabteilung hat. Deshalb: eine Hälfte
  // die größten (dort ist die Gegenprobe zum Katalog möglich), eine Hälfte
  // gleichmäßig über den Rest verteilt.
  //
  // Verteilt statt zufällig gezogen, damit derselbe Aufruf dieselbe Stichprobe
  // liefert. Eine Messung, die sich bei jeder Wiederholung selbst verschiebt,
  // lässt sich mit keiner späteren vergleichen.
  const nachGroesse = ohneFund.sort((a, b) => (pop.get(b.region_id) ?? 0) - (pop.get(a.region_id) ?? 0));
  const halb = Math.floor(limit / 2);
  const kopf = nachGroesse.slice(0, halb);
  const rest = nachGroesse.slice(halb);
  const schritt = Math.max(1, Math.floor(rest.length / Math.max(1, limit - halb)));
  const schwanz = rest.filter((_, i) => i % schritt === 0).slice(0, limit - halb);

  return {
    gesamtOhneFund: ohneFund.length,
    auswahl: [...kopf, ...schwanz].map((r) => ({
      regionId: r.region_id,
      name: namen.get(r.region_id) ?? r.region_id,
      website: r.website!,
      einwohner: pop.get(r.region_id) ?? 0,
      teil: (kopf.includes(r) ? "gross" : "schwanz") as "gross" | "schwanz",
      standDerPruefung: zeileVon.get(r.region_id)?.such_version ?? 1,
    })),
  };
}

/**
 * Kennen wir für diese Gemeinde bereits ein Programm?
 *
 * Die Gegenprobe zum Trefferwert: Findet die Suchmaschine eine Förderseite in
 * einer Stadt, deren Programm längst im Katalog steht, ist das kein neuer Fund,
 * sondern eine bekannte Antwort. Beim ersten Trockenlauf betraf das die halbe
 * Stichprobe — ohne diese Spalte hätte der Bericht die Trefferquote deutlich zu
 * gut ausgewiesen.
 *
 * Zugeordnet wird über das FÖRDERGEBIET, nie über gleiche Schlüssel: Ein
 * Landes- oder Kreisprogramm trägt zwei oder fünf Stellen, die Gemeinde acht.
 * Die Richtung ist der Punkt — das Gebiet enthält die Gemeinde, nie umgekehrt.
 */
const KATALOG_GEBIETE = Object.values(FUNDING_PROGRAMS)
  .map((p) => p.agsCode)
  .filter((a): a is string => !!a);

function imKatalog(regionId: string): boolean {
  return KATALOG_GEBIETE.some((gebiet) => programmDecktSeite(gebiet, regionId));
}

/** Die blanke Domain einer Adresse, ohne Schema und ohne Pfad. */
function domainVon(website: string): string | null {
  try {
    return new URL(website.startsWith("http") ? website : `https://${website}`).host;
  } catch {
    return null;
  }
}

let ausgegeben = 0;

/**
 * Ein SERP-Abruf. Gibt die organischen Adressen zurück, sonst nichts.
 *
 * Bewusst ohne Wiederholung bei Fehlern: Ein zweiter Versuch kostet ein zweites
 * Mal, und für eine Messung ist eine unbeantwortete Gemeinde ein Ergebnis
 * („kam nicht durch"), das im Bericht sichtbar bleiben muss statt still
 * nachgekauft zu werden.
 */
async function serp(domain: string, frage: string): Promise<{ adressen: string[]; fehler: string | null }> {
  const auth = Buffer.from(`${login}:${passwort}`).toString("base64");
  try {
    const res = await fetch("https://api.dataforseo.com/v3/serp/google/organic/live/advanced", {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      // Nur EIN Task je Aufruf — mehrere quittiert die Schnittstelle mit
      // „You can set only one task at a time" (in seo-verify.md festgehalten).
      body: JSON.stringify([
        { keyword: `site:${domain} ${frage}`, location_code: 2276, language_code: "de", depth: 10 },
      ]),
    });
    ausgegeben += PREIS_JE_ABRUF;
    if (!res.ok) return { adressen: [], fehler: `HTTP ${res.status}` };
    const daten: any = await res.json();
    const aufgabe = daten?.tasks?.[0];
    // „No Search Results" ist ein ERGEBNIS, kein Fehlschlag: Google kennt auf
    // dieser Domain nichts zu diesem Begriff. Die Schnittstelle meldet es als
    // Statuscode im Fehlerbereich, und die erste Fassung zählte es entsprechend
    // — der Lauf wies daraufhin „Abruf kam nicht durch: 127" aus, wo in
    // Wahrheit 127-mal sauber „nichts vorhanden" geantwortet wurde. Die
    // Trefferquoten stimmten, die Beschriftung log: genau die Fehlerklasse
    // „die Zahl misst etwas anderes, als daneben steht".
    if (/no search results/i.test(String(aufgabe?.status_message ?? ""))) {
      return { adressen: [], fehler: null };
    }
    if (aufgabe?.status_code && aufgabe.status_code >= 40000) {
      return { adressen: [], fehler: String(aufgabe.status_message ?? aufgabe.status_code) };
    }
    const posten: any[] = aufgabe?.result?.[0]?.items ?? [];
    const adressen = posten
      .filter((p) => p?.type === "organic" && typeof p.url === "string")
      .map((p) => String(p.url));
    return { adressen, fehler: null };
  } catch (e) {
    ausgegeben += PREIS_JE_ABRUF;
    return { adressen: [], fehler: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Taugt eine der gelieferten Adressen als Förderseite?
 *
 * Dieselbe Bewertung wie in der Linksuche — nicht, weil sie perfekt wäre,
 * sondern weil ein anderer Maßstab die Messung wertlos machte: Verglichen wird,
 * was die Suchmaschine liefert, nicht wie großzügig wir es bewerten. Ohne
 * Linktext, weil eine SERP-Überschrift nicht der Linktext der Seite ist.
 */
function bestesErgebnis(adressen: string[], domain: string): { url: string; punkte: number } | null {
  let bestes: { url: string; punkte: number } | null = null;
  for (const roh of adressen) {
    let u: URL;
    try {
      u = new URL(roh);
    } catch {
      continue;
    }
    // Die Einschränkung auf die Domain ist Teil der Frage, aber Google hält sich
    // nicht immer daran — und ein Treffer auf fremder Domain ist genau das, was
    // die Linksuche zu Recht heraushält.
    if (u.host !== domain && u.host !== `www.${domain}` && `www.${u.host}` !== domain) continue;
    const w = bewerteLink(u.origin + u.pathname);
    if (!istEndergebnis(w)) continue;
    if (!bestes || w.punkte > bestes.punkte) bestes = { url: u.origin + u.pathname, punkte: w.punkte };
  }
  return bestes;
}

type Zeile = {
  regionId: string;
  name: string;
  domain: string;
  einwohner: number;
  teil: "gross" | "schwanz";
  /** Steht für diese Gemeinde schon ein Programm im Katalog? */
  imKatalog: boolean;
  standDerPruefung: number;
  treffer: Partial<Record<BegriffName, string>>;
  fehler: Partial<Record<BegriffName, string>>;
};

async function main(): Promise<void> {
  const { gesamtOhneFund, auswahl } = await stichprobe(LIMIT);
  const mitDomain = auswahl
    .map((a) => ({ ...a, domain: domainVon(a.website) }))
    .filter((a): a is typeof a & { domain: string } => !!a.domain);

  const abrufe = mitDomain.length * BEGRIFFE.length;
  const kosten = abrufe * PREIS_JE_ABRUF;

  const anzahlGross = mitDomain.filter((a) => a.teil === "gross").length;
  const imKatalogSchon = mitDomain.filter((a) => imKatalog(a.regionId)).length;

  console.log(`Gemeinden ohne eigenen Fund insgesamt: ${gesamtOhneFund.toLocaleString("de-DE")}`);
  console.log(
    `Stichprobe: ${mitDomain.length} — ${anzahlGross} große Städte, ` +
      `${mitDomain.length - anzahlGross} aus dem langen Schwanz`,
  );
  console.log(`Davon mit bereits bekanntem Programm: ${imKatalogSchon}`);
  console.log(`Geplante Abrufe: ${abrufe} × ${PREIS_JE_ABRUF} $ = ${kosten.toFixed(2)} $\n`);

  if (trocken) {
    console.log("Trockenlauf — es wird nichts abgefragt und nichts bezahlt.\n");
    // Aus BEIDEN Hälften zeigen: Die ersten fünf sind immer Großstädte, und an
    // denen sieht man dem Lauf nicht an, ob der Schwanz überhaupt greift.
    const probe = [...mitDomain.filter((a) => a.teil === "gross").slice(0, 3), ...mitDomain.filter((a) => a.teil === "schwanz").slice(0, 3)];
    for (const a of probe) {
      const marke = a.teil === "gross" ? "groß" : "Schwanz";
      const kat = imKatalog(a.regionId) ? ", Programm bekannt" : "";
      console.log(`  ${a.name} (${marke}, ${a.einwohner.toLocaleString("de-DE")} Einw.${kat})`);
      for (const b of BEGRIFFE) console.log(`      site:${a.domain} ${b.frage}`);
    }
    console.log(`\n  … insgesamt ${abrufe} Abrufe`);
    return;
  }

  if (kosten > DECKEL_USD) {
    console.error(
      `Abbruch: ${kosten.toFixed(2)} $ überschreiten den Deckel von ${DECKEL_USD.toFixed(2)} $.\n` +
        `Entweder --limit senken oder --deckel bewusst anheben.`,
    );
    process.exit(1);
  }

  const zeilen: Zeile[] = [];
  for (const [i, a] of mitDomain.entries()) {
    if (ausgegeben >= DECKEL_USD) {
      console.log(`\nDeckel erreicht — Lauf endet nach ${i} von ${mitDomain.length} Gemeinden.`);
      break;
    }
    const zeile: Zeile = {
      regionId: a.regionId,
      name: a.name,
      domain: a.domain,
      einwohner: a.einwohner,
      teil: a.teil,
      imKatalog: imKatalog(a.regionId),
      standDerPruefung: a.standDerPruefung,
      treffer: {},
      fehler: {},
    };
    for (const b of BEGRIFFE) {
      const { adressen, fehler } = await serp(a.domain, b.frage);
      if (fehler) {
        zeile.fehler[b.name] = fehler;
        continue;
      }
      const bestes = bestesErgebnis(adressen, a.domain);
      if (bestes) zeile.treffer[b.name] = bestes.url;
    }
    zeilen.push(zeile);
    if ((i + 1) % 25 === 0) console.log(`   … ${i + 1} von ${mitDomain.length} (${ausgegeben.toFixed(2)} $)`);
  }

  // ── Auswertung ──────────────────────────────────────────────────────────
  const mitTreffer = (n: BegriffName) => zeilen.filter((z) => z.treffer[n]).length;
  const nurPv = zeilen.filter((z) => z.treffer.photovoltaik && !z.treffer.balkonkraftwerk).length;
  const nurBkw = zeilen.filter((z) => !z.treffer.photovoltaik && z.treffer.balkonkraftwerk).length;
  const beide = zeilen.filter((z) => z.treffer.photovoltaik && z.treffer.balkonkraftwerk).length;
  const gleicheAdresse = zeilen.filter(
    (z) => z.treffer.photovoltaik && z.treffer.photovoltaik === z.treffer.balkonkraftwerk,
  ).length;
  const irgendeiner = zeilen.filter((z) => z.treffer.photovoltaik || z.treffer.balkonkraftwerk).length;
  const fehlgeschlagen = zeilen.filter((z) => Object.keys(z.fehler).length).length;
  const alterStand = zeilen.filter((z) => z.standDerPruefung < 3).length;

  const quote = (n: number) => `${((n / Math.max(1, zeilen.length)) * 100).toFixed(1)} %`;

  console.log(`\n── Ergebnis (${zeilen.length} Gemeinden, ${ausgegeben.toFixed(2)} $) ──`);
  console.log(`Mindestens ein Treffer:        ${irgendeiner} (${quote(irgendeiner)})`);
  console.log(`  über „photovoltaik":         ${mitTreffer("photovoltaik")} (${quote(mitTreffer("photovoltaik"))})`);
  console.log(`  über „balkonkraftwerk":      ${mitTreffer("balkonkraftwerk")} (${quote(mitTreffer("balkonkraftwerk"))})`);
  console.log(`Nur der eine Begriff fand es:  photovoltaik ${nurPv} · balkonkraftwerk ${nurBkw}`);
  console.log(`Beide fanden etwas:            ${beide} (davon dieselbe Adresse: ${gleicheAdresse})`);
  console.log(`Abruf kam nicht durch:         ${fehlgeschlagen}`);

  // Getrennt nach den beiden Hälften — die große Stadt ist der leichte Fall.
  // Zusammengezählt sähe der lange Schwanz besser aus, als er ist, und genau
  // ihn müssen wir erreichen.
  for (const teil of ["gross", "schwanz"] as const) {
    const t = zeilen.filter((z) => z.teil === teil);
    if (!t.length) continue;
    const tTreffer = t.filter((z) => z.treffer.photovoltaik || z.treffer.balkonkraftwerk).length;
    const wort = teil === "gross" ? "Große Städte" : "Langer Schwanz";
    const median = t.map((z) => z.einwohner).sort((a, b) => a - b)[Math.floor(t.length / 2)] ?? 0;
    console.log(
      `\n${wort} (${t.length}, Median ${median.toLocaleString("de-DE")} Einwohner): ` +
        `${tTreffer} Treffer (${((tTreffer / t.length) * 100).toFixed(1)} %)`,
    );
  }

  // Was davon wirklich NEU ist. Ein Treffer in einer Stadt, deren Programm wir
  // längst führen, ist eine bekannte Antwort und kein Fund.
  const neu = zeilen.filter((z) => (z.treffer.photovoltaik || z.treffer.balkonkraftwerk) && !z.imKatalog).length;
  const bekannt = irgendeiner - neu;
  console.log(
    `\nDavon in Gemeinden OHNE bekanntes Programm: ${neu} (${quote(neu)}) — ` +
      `${bekannt} Treffer entfallen auf Gebiete, die der Katalog schon abdeckt.`,
  );
  if (alterStand) {
    console.log(
      `\nVORBEHALT: ${alterStand} dieser Gemeinden tragen ein Verdikt aus einem älteren\n` +
        `Suchstand. Deren Treffer beweisen nicht, dass die Suchmaschine mehr findet als\n` +
        `unser Crawler — nur mehr als der Crawler von damals. Für die saubere Messung\n` +
        `zuerst „npm run foerder:suche" über dieselben Gemeinden laufen lassen.`,
    );
  }

  console.log(`\nWas der zweite Begriff zusätzlich brachte: ${nurBkw} Gemeinden für ${(zeilen.length * PREIS_JE_ABRUF).toFixed(2)} $.`);

  const bericht = {
    gelaufenAm: new Date().toISOString().slice(0, 10),
    stichprobe: zeilen.length,
    gesamtOhneFund,
    kostenUsd: Number(ausgegeben.toFixed(3)),
    quoten: {
      irgendeiner,
      neuOhneKatalogProgramm: neu,
      photovoltaik: mitTreffer("photovoltaik"),
      balkonkraftwerk: mitTreffer("balkonkraftwerk"),
      nurPhotovoltaik: nurPv,
      nurBalkonkraftwerk: nurBkw,
      beide,
      gleicheAdresse,
      fehlgeschlagen,
      ausAelteremSuchstand: alterStand,
      grosseStaedte: zeilen.filter((z) => z.teil === "gross").length,
      langerSchwanz: zeilen.filter((z) => z.teil === "schwanz").length,
    },
    funde: zeilen.filter((z) => z.treffer.photovoltaik || z.treffer.balkonkraftwerk),
    // Die Fehlschläge gehören in den Bericht, nicht nur in eine Zählung.
    // Der erste Lauf meldete 127 betroffene Gemeinden und ließ offen, WORAN es
    // lag — dieselbe Sorte Verlust, gegen die dieser ganze Strang gebaut wird:
    // die Zahl behalten, den Inhalt wegwerfen.
    fehlschlaege: zeilen
      .filter((z) => Object.keys(z.fehler).length)
      .map((z) => ({ name: z.name, domain: z.domain, fehler: z.fehler })),
  };
  const ziel = resolve(process.cwd(), "docs/foerder-serp-test.json");
  writeFileSync(ziel, JSON.stringify(bericht, null, 2));
  console.log(`\nBericht: ${ziel}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
