/**
 * Versorger-Erhebung: Erreichen wir den Vertrieb, und wie lösen sie ihre
 * Stromkennzeichnung nach § 42 EnWG?
 *
 * Zwei Fragen, EIN Abruf je Versorger. Getrennte Läufe hätten jede Website
 * zweimal geholt, ohne dass ein einziger Befund dadurch besser würde.
 *
 * Nutzung:
 *   tsx scripts/versorger-erhebung.ts --stichprobe=20        # nur messen, nichts schreiben
 *   tsx scripts/versorger-erhebung.ts --stichprobe=20 --schreiben
 *   tsx scripts/versorger-erhebung.ts --alle --schreiben     # nach abgenommener Stichprobe
 *
 * Voraussetzungen: SUPABASE_URL, SUPABASE_SERVICE_KEY aus .env.local.
 * Spalten kommen aus `tsx scripts/utilities-refresh.ts --setup`.
 *
 * DREI REGELN, die dieser Lauf einhält:
 *
 *  1. **Ein gescheiterter Abruf ist kein Befund.** Er stempelt kein Prüfdatum
 *     und schreibt keine Felder — sonst stünde nach einer Server-Störung
 *     "keine Stromkennzeichnung" in der Datenbank, und niemand sähe den
 *     Unterschied zur echten Lücke.
 *  2. **Die Auswertung urteilt nicht.** Sie sammelt Indizien; ob die
 *     Grafikpflicht erfüllt ist, entscheidet die Handprüfung.
 *  3. **Ein Host wird höchstens einmal gleichzeitig belastet**, und es werden
 *     höchstens vier Seiten je Versorger geholt.
 */

import { dirname, resolve } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { VERSORGER_VOKABULAR, domainOf, findImpressumUrl, findLinkUrl } from "../lib/kommunen-profil";
import {
  type Erhebung,
  KENNZEICHNUNG_MUSTER,
  KONTAKT_MUSTER,
  LEER,
  kennzeichnungFund,
  nahbereichKandidaten,
  pflichtjahr,
  werteAus,
} from "../lib/versorger-erhebung";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const UA = "solar-check.io versorger-erhebung/1.0 (+https://solar-check.io; hey@solar-check.io)";
const ABRUF_TIMEOUT_MS = 15000;
const PARALLEL = 4;

function log(msg: string, level: "info" | "ok" | "err" = "info"): void {
  const prefix = level === "ok" ? "✓ " : level === "err" ? "✗ " : "  ";
  // eslint-disable-next-line no-console
  console.log(prefix + msg);
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

async function holeSeite(url: string): Promise<{ html: string } | { fehler: string }> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ABRUF_TIMEOUT_MS);
    const res = await fetch(url, { headers: { "User-Agent": UA }, signal: ctrl.signal, redirect: "follow" });
    clearTimeout(t);
    if (!res.ok) return { fehler: `HTTP ${res.status}` };
    const typ = res.headers.get("content-type") ?? "";
    if (typ && !/text\/html|application\/xhtml/i.test(typ)) return { fehler: `Kein HTML (${typ.split(";")[0]})` };
    return { html: await res.text() };
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    return { fehler: /abort/i.test(m) ? "Zeitüberschreitung" : m.slice(0, 120) };
  }
}

type Kandidat = { id: string; name: string; website: string | null; einwohner: number };

/**
 * Die Grundgesamtheit der Erhebung — und die Regel dafür steht hier, nicht in
 * einer Notiz: ein integrierter Versorger (nicht erkennbar Netzgesellschaft),
 * mit Website, dessen Gebiet zwischen 10.000 und 150.000 Einwohnern liegt.
 *
 * Bewusst NICHT die Spitze der Rangfolge aus der Adressen-Recherche: Deren
 * Gewichte sind eine unkalibrierte Hypothese, und für die Frage "erreichen wir
 * den Vertrieb?" trägt eine begründete Auswahl plausibler Ziele genauso weit.
 * Die Rangfolge nach oben zu bestätigen wäre ein Zirkelschluss.
 */
// KEIN führendes \b: Die Firmen heißen "Energienetze Weimar",
// "Elektrizitätsnetze Allgäu", "Kommunale Energienetze Inn-Salzach" — das Wort
// steht als hinterer Teil eines zusammengesetzten Worts, und davor gibt es
// keine Wortgrenze. Mit \b davor rutschten in der ersten Stichprobe DREI von
// zwanzig durch (gemessen 23.08.2026). Sie sind hier keine Randnotiz: Ein
// Netzbetreiber beliefert niemanden und schuldet deshalb gar keine
// Stromkennzeichnung — wer sie mitzählt, misst eine Lücke, die keine ist.
const NETZGESELLSCHAFT = /netze?\b|netzbetrieb|verteilnetz|hochspannungsnetz|netzgesellschaft/i;

async function kandidaten(db: SupabaseLike): Promise<Kandidat[]> {
  const versorger: { id: string; name: string; website: string | null }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from("utilities").select("id,name,website").range(from, from + 999);
    if (error) throw new Error(error.message);
    versorger.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }

  const zuordnung: { utility_id: string; commune_id: string }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from("utility_communes").select("utility_id,commune_id").range(from, from + 999);
    if (error) throw new Error(error.message);
    zuordnung.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }

  const einwohnerJeGemeinde = new Map<string, number>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from("mastr_regions").select("region_id,population").range(from, from + 999);
    if (error) throw new Error(error.message);
    for (const r of data ?? []) einwohnerJeGemeinde.set(r.region_id, Number(r.population) || 0);
    if (!data || data.length < 1000) break;
  }

  const summe = new Map<string, number>();
  for (const z of zuordnung) {
    summe.set(z.utility_id, (summe.get(z.utility_id) ?? 0) + (einwohnerJeGemeinde.get(z.commune_id) ?? 0));
  }

  return versorger
    .map((v) => ({ ...v, einwohner: summe.get(v.id) ?? 0 }))
    .filter((v) => !!v.website && !NETZGESELLSCHAFT.test(v.name) && v.einwohner >= 10_000 && v.einwohner <= 150_000)
    .sort((a, b) => a.id.localeCompare(b.id)); // stabil, damit ein zweiter Lauf dieselbe Stichprobe trifft
}

/** Roher Text einer Datei (Sitemaps sind XML, nicht HTML — `holeSeite` würde sie
 *  wegen des Inhaltstyps verwerfen). */
async function holeRoh(url: string): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ABRUF_TIMEOUT_MS);
    const res = await fetch(url, { headers: { "User-Agent": UA }, signal: ctrl.signal, redirect: "follow" });
    clearTimeout(t);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/**
 * Das Seitenverzeichnis der Website aus ihrer eigenen Sitemap.
 *
 * WARUM DAS SEIN MUSS (gemessen 23.08.2026 an stadtwerke-lingen.de): Die
 * Hauptnavigation wird dort per JavaScript aufgebaut. Ein Abruf der Startseite
 * sieht 10 beschriftete Verweise — die Fußzeile — und keine einzige
 * Produktseite. Ein Crawl von der Startseite aus ist auf solchen Websites
 * strukturell blind, und er meldet das nicht, sondern liefert „nichts gefunden".
 * Dieselbe Lehre wie bei der Förder-Suche, die von der Startseite aus nur 13 %
 * der Förderseiten fand.
 *
 * Die Adresse der Sitemap kommt aus robots.txt — kein Rateweg über bekannte
 * CMS-Pfade, sondern die Stelle, an der die Website sie selbst nennt.
 */
async function sitemapAdressen(basis: string): Promise<string[]> {
  const robots = await holeRoh(new URL("/robots.txt", basis).toString());
  const erste = robots
    ? Array.from(robots.matchAll(/^\s*sitemap:\s*(\S+)/gim)).map((m) => m[1])
    : [new URL("/sitemap.xml", basis).toString()];
  const adressen = new Set<string>();
  // Eine Ebene Sitemap-Index auflösen, höchstens drei Teil-Sitemaps. Mehr wäre
  // bei großen Websites ein eigener Crawl, und den wollen wir hier nicht.
  const offen = erste.slice(0, 2);
  const gesehen = new Set<string>();
  for (let runde = 0; runde < 2 && offen.length; runde++) {
    const jetzt = offen.splice(0, 3);
    for (const sm of jetzt) {
      if (gesehen.has(sm)) continue;
      gesehen.add(sm);
      const xml = await holeRoh(sm);
      if (!xml) continue;
      const istIndex = /<sitemapindex/i.test(xml);
      for (const m of Array.from(xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi))) {
        const u = m[1].replace(/&amp;/g, "&");
        if (istIndex) offen.push(u);
        else adressen.add(u);
      }
    }
  }
  return [...adressen];
}

async function erhebe(k: Kandidat, stichtag: Date): Promise<Erhebung> {
  const basis = k.website!;
  const start = await holeSeite(basis);
  if ("fehler" in start) return { ...LEER, fehler: start.fehler };

  const weitere: { url: string; html: string }[] = [];
  const geholt = new Set<string>([basis]);
  const hole = async (url: string) => {
    if (geholt.has(url)) return;
    geholt.add(url);
    const seite = await holeSeite(url);
    if ("html" in seite) weitere.push({ url, html: seite.html });
  };

  // Stufe 1 — von der Startseite aus. Trägt dort, wo die Navigation im HTML steht.
  for (const u of [
    findImpressumUrl(start.html, basis),
    findLinkUrl(start.html, basis, KONTAKT_MUSTER),
    findLinkUrl(start.html, basis, KENNZEICHNUNG_MUSTER),
  ]) {
    if (u) await hole(u);
  }

  // Stufe 2 — über das eigene Seitenverzeichnis der Website, sobald Stufe 1
  // etwas offen gelassen hat. Beide Lücken haben dieselbe Ursache (die
  // Navigation steht nicht im HTML) und werden deshalb zusammen geschlossen:
  // Bei Stadtwerke Lingen fehlten so BEIDE Befunde — die Kennzeichnung UND das
  // Kontaktformular, das auf /kontakt sehr wohl steht.
  const bisher = () => [start.html, ...weitere.map((w) => w.html)].join("\n");
  const kennzeichnungOffen = !kennzeichnungFund(bisher(), basis);
  const kontaktOffen = !findLinkUrl(bisher(), basis, KONTAKT_MUSTER);

  if (kennzeichnungOffen || kontaktOffen) {
    const alleAdressen = await sitemapAdressen(basis);
    const ziele: string[] = [];
    if (kennzeichnungOffen) {
      const direkt = alleAdressen.filter((u) => {
        try {
          return KENNZEICHNUNG_MUSTER.test(decodeURIComponent(u));
        } catch {
          return KENNZEICHNUNG_MUSTER.test(u);
        }
      });
      ziele.push(...direkt.slice(0, 2), ...nahbereichKandidaten(alleAdressen, 5));
    }
    if (kontaktOffen) {
      const kontakt = alleAdressen.filter((u) => KONTAKT_MUSTER.test(u)).sort((a, b) => a.length - b.length);
      ziele.push(...kontakt.slice(0, 1));
    }
    for (const u of ziele) await hole(u);
  }

  return werteAus(
    { start: { url: basis, html: start.html }, weitere },
    domainOf(basis),
    VERSORGER_VOKABULAR.rolle,
    stichtag,
  );
}

/** Wenige Aufgaben gleichzeitig, Reihenfolge egal. */
async function inHaeppchen<T, R>(items: T[], groesse: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += groesse) {
    out.push(...(await Promise.all(items.slice(i, i + groesse).map(fn))));
  }
  return out;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const schreiben = argv.includes("--schreiben");
  const alle = argv.includes("--alle");
  const nArg = argv.find((a) => a.startsWith("--stichprobe="));
  const n = alle ? Infinity : Number(nArg?.split("=")[1] ?? 20);
  const stichtag = new Date();

  const db = await makeClient();
  const liste = (await kandidaten(db)).slice(0, n === Infinity ? undefined : n);
  log(`${liste.length} Versorger in der Erhebung (Pflichtjahr nach § 42: ${pflichtjahr(stichtag)})`);
  log(schreiben ? "Modus: messen UND schreiben" : "Modus: nur messen (--schreiben zum Speichern)");
  log("");

  const ergebnisse = await inHaeppchen(liste, PARALLEL, async (k) => {
    const e = await erhebe(k, stichtag);
    const kurz =
      e.abruf === "unerreichbar"
        ? `Abruf fehlgeschlagen: ${e.fehler}`
        : [
            e.vertriebEmail ? `Vertrieb ${e.vertriebEmail}` : "kein Vertriebspostfach",
            e.netzEmail ? `Netz ${e.netzEmail}` : null,
            e.kontaktformular ? "Formular" : "kein Formular",
            e.kennzeichnungUrl
              ? `Kennzeichnung ${e.kennzeichnungJahr ?? "Jahr?"}${
                  e.kennzeichnungForm?.grafik ? " Grafik" : ""
                }${e.kennzeichnungForm?.tabelle ? " Tabelle" : ""}${e.kennzeichnungForm?.pdf ? " PDF" : ""}`
              : "keine Kennzeichnungsseite",
          ]
            .filter(Boolean)
            .join(" · ");
    log(`${k.name} (${k.einwohner.toLocaleString("de-DE")} Ew.) — ${kurz}`, e.abruf === "ok" ? "ok" : "err");
    return { k, e };
  });

  // ─── Zusammenfassung ────────────────────────────────────────────────────────
  const erreicht = ergebnisse.filter((r) => r.e.abruf === "ok");
  const z = (f: (e: Erhebung) => boolean) => erreicht.filter((r) => f(r.e)).length;
  const mitSeite = erreicht.filter((r) => !!r.e.kennzeichnungUrl);
  const mitJahr = mitSeite.filter((r) => r.e.kennzeichnungJahr !== null);

  log("");
  log("── Ergebnis ───────────────────────────────────────────");
  log(`abgerufen                  : ${erreicht.length} von ${ergebnisse.length}`);
  log(`  Vertriebs-/Kommunikationspostfach : ${z((e) => !!e.vertriebEmail)}`);
  log(`  nur Netz-Postfach gefunden        : ${z((e) => !e.vertriebEmail && !!e.netzEmail)}`);
  log(`  Kontaktformular vorhanden         : ${z((e) => e.kontaktformular)}`);
  log(`  irgendein Weg zum Vertrieb        : ${z((e) => !!e.vertriebEmail || e.kontaktformular)}`);
  log("");
  log(`  Stromkennzeichnungsseite gefunden : ${mitSeite.length}`);
  log(`    davon mit Grafik-Indiz          : ${mitSeite.filter((r) => r.e.kennzeichnungForm?.grafik).length}`);
  log(`    davon nur Tabelle, keine Grafik : ${mitSeite.filter((r) => r.e.kennzeichnungForm && !r.e.kennzeichnungForm.grafik && r.e.kennzeichnungForm.tabelle).length}`);
  log(`    davon mit PDF-Verweis           : ${mitSeite.filter((r) => r.e.kennzeichnungForm?.pdf).length}`);
  log(`    Bezugsjahr erkannt              : ${mitJahr.length}`);
  log(`      aktuell (>= ${pflichtjahr(stichtag)})            : ${mitJahr.filter((r) => r.e.kennzeichnungAktuell).length}`);
  log(`      veraltet                      : ${mitJahr.filter((r) => r.e.kennzeichnungAktuell === false).length}`);

  const fehler = ergebnisse.filter((r) => r.e.abruf === "unerreichbar");
  if (fehler.length) {
    log("");
    log(`nicht erreicht (KEIN Befund, nur kein Abruf): ${fehler.length}`);
    for (const r of fehler) log(`  ${r.k.name} — ${r.e.fehler}`);
  }

  if (!schreiben) {
    log("");
    log("Nichts geschrieben. Mit --schreiben in die Datenbank übernehmen.");
    return;
  }

  // Nur erreichte Versorger schreiben — ein gescheiterter Abruf darf weder ein
  // Prüfdatum stempeln noch einen alten Befund überschreiben.
  const jetzt = stichtag.toISOString();
  let geschrieben = 0;
  for (const { k, e } of erreicht) {
    const { error } = await db
      .from("utilities")
      .update({
        vertrieb_email: e.vertriebEmail,
        netz_email: e.netzEmail,
        kontaktformular: e.kontaktformular,
        kontaktseite_url: e.kontaktseiteUrl,
        stromkennzeichnung_url: e.kennzeichnungUrl,
        stromkennzeichnung_form: e.kennzeichnungForm,
        stromkennzeichnung_jahr: e.kennzeichnungJahr,
        erhebung_geprueft_am: jetzt,
        erhebung_fehler: null,
      })
      .eq("id", k.id);
    if (error) log(`${k.name}: ${error.message}`, "err");
    else geschrieben++;
  }
  // Der Fehlgrund wird festgehalten, das Prüfdatum ausdrücklich nicht.
  for (const { k, e } of fehler) {
    await db.from("utilities").update({ erhebung_fehler: e.fehler }).eq("id", k.id);
  }
  log("");
  log(`${geschrieben} Zeilen aktualisiert, ${fehler.length} Fehlgründe vermerkt.`, "ok");
}

main().catch((e) => {
  log(e instanceof Error ? e.message : String(e), "err");
  process.exit(1);
});
