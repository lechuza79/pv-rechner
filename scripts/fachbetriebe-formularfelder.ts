/**
 * Welche Angaben fragen PV-Fachbetriebe in ihren eigenen Anfrageformularen ab?
 *
 * Anlass (03.09.2026): Die Frage, welche Zusatzfragen ein Betrieb an eine
 * Online-Anfrage hängen können soll, war zuvor an acht handverlesenen
 * Formularen beantwortet — davon nur vier von einzelnen Fachbetrieben, der Rest
 * Portal, Versorger und Großhändler. Wir haben 3.114 Websites im Bestand; daran
 * lässt sich dieselbe Frage breiter beantworten, statt sie zu schätzen.
 *
 * ── Was gemessen wird ──────────────────────────────────────────────────────
 * Die FELDER, nicht die Formulare: Ein Betrieb kann drei Formulare haben, für
 * die Frage zählt, welche Angabe wie oft verlangt wird. Gezählt wird je Betrieb
 * höchstens einmal je Merkmal — sonst gewichtet eine Seite mit fünf Formularen
 * fünfmal so schwer.
 *
 * ── Warum Merkmale und nicht Feldnamen ─────────────────────────────────────
 * Dasselbe Feld heißt „Dacheindeckung", „Dachbedeckung", „Art der Eindeckung"
 * oder steht nur im Auswahlfeld als „Ziegel / Trapezblech / Bitumen". Gezählt
 * wird deshalb gegen eine Liste von Merkmalen mit mehreren Schreibweisen —
 * dieselbe Bauform wie beim Förder-Screener.
 *
 * ── Was der Lauf NICHT kann ────────────────────────────────────────────────
 * Formulare, die erst per Skript entstehen, sieht er nicht (der Rechner läuft
 * ohne Browser). Das ist eine bekannte Untergrenze und wird im Ergebnis
 * ausgewiesen, nicht verschwiegen.
 *
 * Aufruf: npm run fachbetriebe:formulare -- [--n 400]
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { heuteInBerlin } from "../lib/zeit";

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

/**
 * Die Merkmale, nach denen gesucht wird.
 *
 * Bewusst ENG: „Dach" allein träfe jede Seite eines Dachdeckers. Jedes Muster
 * muss ein Wort treffen, das in einem FORMULAR steht und nicht im Fließtext
 * daneben — deshalb wird ohnehin nur innerhalb von Formularen gesucht.
 */
const MERKMALE: { name: string; muster: RegExp }[] = [
  { name: "Dacheindeckung", muster: /(dach(ein|be)deckung|art der (ein|be)deckung|dachziegel|trapezblech|bitumen|schiefer|biberschwanz)/i },
  { name: "Dachneigung", muster: /(dachneigung|neigung.{0,12}(grad|°)|dachwinkel)/i },
  { name: "Dachfläche / Maße", muster: /(dachfl[äa]che|nutzbare fl[äa]che|first(l[äa]nge)?|traufe|dachma[ßs])/i },
  { name: "Dachausrichtung", muster: /(dachausrichtung|ausrichtung des daches|himmelsrichtung|s[üu]d.{0,3}(ost|west)?ausrichtung)/i },
  { name: "Verschattung / Störobjekte", muster: /(verschattung|beschattung|st[öo]robjekt|schornstein|gaube|dachfenster|dachluke|satellitensch[üu]ssel)/i },
  { name: "Gebäudehöhe", muster: /(geb[äa]udeh[öo]he|traufh[öo]he|firsth[öo]he|anzahl.{0,10}(geschoss|stockwerk)|vollgeschoss)/i },
  { name: "Sparren / Unterkonstruktion", muster: /(sparren|unterkonstruktion|dachstuhl|konterlatt)/i },
  { name: "Baujahr", muster: /(baujahr|bj\.?\s*des geb|errichtungsjahr)/i },
  { name: "Zählerschrank / Hausanschluss", muster: /(z[äa]hlerschrank|z[äa]hlerkasten|hausanschluss|potenzialausgleich|z[äa]hlerplatz)/i },
  { name: "Leitungsweg zum Zähler", muster: /(leitungsweg|kabelweg|kabell[äa]nge|entfernung.{0,20}z[äa]hler)/i },
  { name: "Foto-Upload", muster: /(type=["']file["']|foto hochladen|bilder? hochladen|dateien? anh[äa]ngen|fotos? (des|vom) dach)/i },
  { name: "Speicher gewünscht", muster: /(stromspeicher|batteriespeicher|speicher gew[üu]nscht|mit speicher)/i },
  { name: "Notstrom / Ersatzstrom", muster: /(notstrom|ersatzstrom|inself[äa]hig|blackout)/i },
  { name: "Wallbox / E-Auto", muster: /(wallbox|ladestation|e-?auto|elektroauto)/i },
  { name: "Wärmepumpe", muster: /(w[äa]rmepumpe)/i },
  { name: "Stromverbrauch", muster: /(stromverbrauch|jahresverbrauch|verbrauch.{0,10}kwh|kwh.{0,10}(pro|im) jahr)/i },
  { name: "Anlagengröße (kWp)", muster: /(kwp|anlagengr[öo][ßs]e|gew[üu]nschte leistung|modulleistung)/i },
  { name: "Eigentümer / Mieter", muster: /(eigent[üu]mer|mieter|eigentumsverh[äa]ltnis)/i },
  { name: "Denkmalschutz", muster: /(denkmalschutz|denkmalgesch[üu]tzt)/i },
  { name: "Blitzschutz", muster: /(blitzschutz|blitzableiter|[üu]berspannungsschutz)/i },
  { name: "Gerüst / Zufahrt", muster: /(ger[üu]st|zufahrt|stellfl[äa]che|kranaufstellung)/i },
  { name: "Wunschtermin", muster: /(wunschtermin|zeitraum.{0,20}umsetzung|geplanter (bau|umsetzungs)beginn|wann.{0,15}umgesetzt)/i },
  { name: "Finanzierung / Budget", muster: /(finanzierung|budget|ratenzahlung|leasing)/i },
  { name: "Asbest", muster: /(asbest|eternit)/i },
  { name: "Netzbetreiber", muster: /(netzbetreiber|verteilnetzbetreiber|vnb\b)/i },
];

/** Schneidet den HTML-Text auf die Formularbereiche zusammen. */
function formularTeile(html: string): string[] {
  const teile: string[] = [];
  const re = /<form\b[\s\S]{0,60000}?<\/form>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) teile.push(m[0]);
  return teile;
}

/** Verrät ein Formular, dass es um eine Anlagen-Anfrage geht? */
function istAnfrageFormular(teil: string): boolean {
  // Ein bloßes Suchfeld oder ein Newsletter-Kästchen zählt nicht. Verlangt wird
  // ein Bezug zur Sache UND mehr als zwei Eingaben — sonst wäre jede
  // Kontaktzeile ein „Anfrageformular".
  const felder = (teil.match(/<(input|select|textarea)\b/gi) ?? []).length;
  if (felder < 4) return false;
  return /(photovoltaik|solaranlage|pv-?anlage|solarstrom|dach)/i.test(teil);
}

async function holeSeite(url: string): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12_000);
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        "user-agent": "solar-check.io Erhebung (einmalige Stichprobe)",
        accept: "text/html",
      },
    });
    clearTimeout(t);
    if (!res.ok) return null;
    if (!(res.headers.get("content-type") ?? "").includes("html")) return null;
    return (await res.text()).slice(0, 600_000);
  } catch {
    return null;
  }
}

/** Sucht die Adressen, unter denen eine Anfrage stehen könnte. */
function kandidaten(html: string, basis: string): string[] {
  const gefunden = new Set<string>();
  const re = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]{0,120}?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const text = m[2].replace(/<[^>]+>/g, " ");
    if (!/(anfrage|angebot|kontakt|beratung|konfigurator|rechner|check)/i.test(text + " " + m[1])) continue;
    try {
      const u = new URL(m[1], basis);
      if (u.hostname.replace(/^www\./, "") !== new URL(basis).hostname.replace(/^www\./, "")) continue;
      u.hash = "";
      gefunden.add(u.toString());
    } catch { /* ungültige Adresse */ }
  }
  return [...gefunden].slice(0, 4);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const nArg = args.indexOf("--n");
  const stichprobe = nArg >= 0 ? Number(args[nArg + 1]) : 400;
  const jsonArg = args.indexOf("--json");
  const jsonPfad = jsonArg >= 0 ? args[jsonArg + 1] : null;

  const db = await makeClient();
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

  const schritt = Math.max(1, Math.floor(alle.length / stichprobe));
  const probe = alle.filter((_, i) => i % schritt === 0).slice(0, stichprobe);
  console.log(`Bestand: ${alle.length} · Stichprobe: ${probe.length} (jeder ${schritt}.)`);

  const zaehler = new Map<string, number>();
  let mitFormular = 0;
  let erreicht = 0;
  let fertig = 0;
  let naechster = 0;

  async function arbeiter(): Promise<void> {
    for (;;) {
      const i = naechster++;
      if (i >= probe.length) return;
      const domain = probe[i];
      const start = `https://${domain}/`;
      const html = await holeSeite(start);
      if (html === null) { fertig++; continue; }
      erreicht++;

      // Startseite plus bis zu vier verdächtige Unterseiten. Mehr wäre Lärm auf
      // fremden Servern für dieselbe Aussage.
      const seiten = [html];
      for (const url of kandidaten(html, start)) {
        const h = await holeSeite(url);
        if (h) seiten.push(h);
      }

      // Je Betrieb höchstens einmal je Merkmal.
      const beiDiesem = new Set<string>();
      let hatFormular = false;
      for (const seite of seiten) {
        for (const teil of formularTeile(seite)) {
          if (!istAnfrageFormular(teil)) continue;
          hatFormular = true;
          for (const { name, muster } of MERKMALE) if (muster.test(teil)) beiDiesem.add(name);
        }
      }
      if (hatFormular) mitFormular++;
      beiDiesem.forEach((n) => zaehler.set(n, (zaehler.get(n) ?? 0) + 1));

      fertig++;
      if (fertig % 25 === 0) console.log(`  ${fertig}/${probe.length} …`);
    }
  }

  await Promise.all(Array.from({ length: 8 }, () => arbeiter()));

  const sortiert = [...zaehler.entries()].sort((a, b) => b[1] - a[1]);
  console.log(`\nErreicht: ${erreicht} von ${probe.length}`);
  console.log(`Davon mit erkanntem Anfrageformular: ${mitFormular}\n`);
  console.log("Merkmal                          Betriebe   Anteil der Formulare");
  for (const [name, n] of sortiert) {
    const anteil = mitFormular ? ((n / mitFormular) * 100).toFixed(0) : "—";
    console.log(`${name.padEnd(33)}${String(n).padStart(6)}   ${String(anteil).padStart(5)} %`);
  }
  console.log(
    `\nUntergrenze, nicht Wahrheit: Formulare, die erst per Skript entstehen,\n` +
      `sieht dieser Lauf nicht — die Anteile sind eher zu niedrig als zu hoch.`,
  );

  if (jsonPfad) {
    writeFileSync(
      jsonPfad,
      JSON.stringify({ erhoben_am: heuteInBerlin(), stichprobe: probe.length, erreicht, mitFormular, merkmale: Object.fromEntries(sortiert) }, null, 2),
      "utf8",
    );
    console.log(`\nAbgelegt: ${jsonPfad}`);
  }
}

main().catch((e) => {
  console.error(`✗ ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
