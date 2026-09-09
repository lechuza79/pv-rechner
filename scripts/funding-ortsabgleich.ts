/**
 * Ortsnamen gegen den eigenen Katalog halten — der Hinweisgeber-Schritt.
 *
 *   npm run foerder:ortsabgleich -- Konstanz Fürth Oldenburg
 *   npm run foerder:ortsabgleich -- --datei orte.txt
 *   pbpaste | npm run foerder:ortsabgleich
 *
 * WOZU (09.09.2026): Fremde Förderlisten — Shops, Vergleichsportale,
 * Energieagenturen — führen fast immer nur die großen Städte, und genau dort
 * sind wir schwach. Eine solche Liste hat uns zwei Programme gezeigt, die uns
 * fehlten (Konstanz, Landkreis Oldenburg). Was sie NICHT kann: uns sagen, wie
 * viel ein Betrag ist. Von fünf Angaben derselben Liste waren drei schlicht
 * falsch, eine nannte den falschen Träger.
 *
 * DESHALB IST DIESER LAUF EIN HINWEISGEBER UND KEINE QUELLE. Er nimmt
 * ausschließlich ORTSNAMEN entgegen und beantwortet eine einzige Frage: Wo
 * müssen wir genauer hinsehen? Beträge, Bedingungen und Status kommen danach
 * ausschließlich von der Amtsseite — wie bei jedem anderen Fund auch.
 *
 * DER ABRUF DER FREMDEN SEITE IST KEIN TEIL DIESES LAUFS, und das ist eine
 * Entscheidung, keine Auslassung. Bei einer privaten Förderliste IST die
 * Auswahl die schützenswerte Leistung (§ 87b Abs. 1 S. 1 UrhG), und
 * wiederkehrende automatische Abgleichläufe lösen zusätzlich Satz 2 aus — so
 * haben zwei Legal-Judges es für dieses Projekt beurteilt. Einmal von Hand
 * ansehen und die Fundstelle selbst ermitteln bleibt vertretbar; ein Wächter,
 * der dieselbe Seite jede Nacht abklappert, nicht. Wer diesen Lauf um einen
 * Abruf erweitert, kippt genau diese Grenze.
 *
 * DER WERTVOLLSTE BEFUND IST NICHT „KENNEN WIR NICHT". Es ist „Seite längst
 * gefunden, nie gelesen": Konstanz lag seit dem 20.08.2026 als Treffer im
 * Arbeitsvorrat, eingeordnet als Wärmepumpe, während der Balkon-Zuschuss eine
 * Ebene tiefer auf derselben Seite stand. Zum Zeitpunkt dieses Befundes warteten
 * 275 solcher Treffer aufs Lesen, 144 davon als Balkonkraftwerk eingeordnet.
 * Der Engpass des Katalogs ist nicht die Suche.
 */

import { resolve } from "node:path";
import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { allFundingPrograms } from "../lib/funding-programs";

function loadEnvFile(): void {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
loadEnvFile();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_KEY fehlen.");
  process.exit(1);
}
const sb = createClient(url, key);

/**
 * Vergleichsform eines Ortsnamens.
 *
 * Umlaute werden ausgeschrieben, Zusätze in Klammern und die üblichen
 * Beinamen fallen weg: „Oldenburg (Oldb)" und „Oldenburg" sind derselbe Ort,
 * „Mühlhausen an der Sulz" und „Mühlhausen a. d. Sulz" auch. Bewusst NICHT
 * weggeworfen wird das Wort „Landkreis" — Landkreis Oldenburg und die Stadt
 * Oldenburg sind zwei verschiedene Träger, und genau die hat die Liste
 * verwechselt, die diesen Lauf ausgelöst hat.
 */
export function form(name: string): string {
  return name
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\b(stadt|gemeinde|markt|bad)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

type Befund = {
  eingabe: string;
  /** Programm im Katalog? Dann sind wir fertig. */
  imKatalog?: string;
  /** Gemeindeschlüssel und amtlicher Name, falls der Ort auflösbar war. */
  schluessel?: string;
  amtlich?: string;
  /** Wie viele Förderseiten dieses Orts kennen wir — und wie viele davon hat
   *  nie jemand gelesen? Der zweite Wert ist der eigentliche Befund. */
  seiten?: number;
  treffer?: number;
  ungelesen?: number;
};

async function alleZeilen<T>(tabelle: string, spalten: string): Promise<T[]> {
  const out: T[] = [];
  for (let von = 0; ; von += 1000) {
    const { data, error } = await sb.from(tabelle).select(spalten).order("region_id").range(von, von + 999);
    if (error) throw new Error(`${tabelle}: ${error.message}`);
    if (!data?.length) break;
    out.push(...(data as unknown as T[]));
    if (data.length < 1000) break;
  }
  return out;
}

/**
 * Orte, deren amtlicher Name mit der Eingabe BEGINNT — „Freiburg" trifft so
 * auch „Freiburg im Breisgau". Nur am Wortanfang, sonst zöge „Essen" halb
 * Niedersachsen herein; und nur, wenn die Eingabe mindestens vier Zeichen hat,
 * weil kürzere Namen sonst zu breit greifen.
 */
export function kandidatenMitZusatz(
  f: string,
  nachForm: Map<string, { region_id: string; name: string }[]>,
): { region_id: string; name: string }[] {
  if (f.length < 4) return [];
  const out: { region_id: string; name: string }[] = [];
  for (const [k, v] of nachForm) {
    if (k !== f && k.startsWith(`${f} `)) out.push(...v);
  }
  return out;
}

/**
 * Fasst Gemeinde- und Kreiszeile desselben Orts zu einer zusammen.
 *
 * Eine kreisfreie Stadt steht zweimal im Register: fünfstellig als
 * Kreisebene, achtstellig als Gemeinde. Beide als „zwei Orte dieses Namens"
 * auszuweisen wäre eine Mehrdeutigkeit, die es nicht gibt — und sie hat beim
 * ersten Lauf Bielefeld, Ingolstadt und Oldenburg unnötig als unklar gemeldet.
 * Gewinnt die Gemeindezeile: Auf ihr liegen die Förderseiten.
 */
export function einOrt(kandidaten: { region_id: string; name: string }[]): { region_id: string; name: string }[] {
  const jePraefix = new Map<string, { region_id: string; name: string }[]>();
  for (const k of kandidaten) {
    const p = k.region_id.slice(0, 5);
    if (!jePraefix.has(p)) jePraefix.set(p, []);
    jePraefix.get(p)!.push(k);
  }
  const out: { region_id: string; name: string }[] = [];
  for (const gruppe of jePraefix.values()) {
    // Nur zusammenfassen, wenn es wirklich derselbe Ort ist: eine Kreiszeile
    // plus genau eine Gemeinde darunter. Ein Landkreis mit mehreren gleich
    // benannten Gemeinden bleibt mehrdeutig.
    const gemeinden = gruppe.filter((g) => g.region_id.length === 8);
    if (gemeinden.length === 1) out.push(gemeinden[0]);
    else out.push(...gruppe);
  }
  return out;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const dateiFlag = argv.indexOf("--datei");
  let eingaben: string[] = [];
  if (dateiFlag >= 0) {
    eingaben = readFileSync(resolve(process.cwd(), argv[dateiFlag + 1]), "utf8").split("\n");
  } else {
    eingaben = argv.filter((a) => !a.startsWith("--"));
  }
  if (!eingaben.length && !process.stdin.isTTY) {
    eingaben = readFileSync(0, "utf8").split("\n");
  }
  eingaben = eingaben.map((z) => z.trim()).filter(Boolean);
  if (!eingaben.length) {
    console.error(
      "Ortsnamen fehlen.\n" +
        "  npm run foerder:ortsabgleich -- Konstanz Fürth \"Landkreis Oldenburg\"\n" +
        "  npm run foerder:ortsabgleich -- --datei orte.txt\n\n" +
        "Erwartet werden NUR Ortsnamen. Beträge und Status kommen von der Amtsseite,\n" +
        "nie aus der Liste, aus der die Namen stammen.",
    );
    process.exit(1);
  }

  // Amtliche Namen — die einzige zulässige Quelle für einen Gemeindeschlüssel.
  const regionen = await alleZeilen<{ region_id: string; name: string; level: string }>(
    "mastr_regions", "region_id, name, level",
  );
  const nachForm = new Map<string, { region_id: string; name: string }[]>();
  for (const r of regionen) {
    if (r.level !== "gemeinde" && r.level !== "landkreis") continue;
    const f = form(r.name);
    if (!nachForm.has(f)) nachForm.set(f, []);
    nachForm.get(f)!.push({ region_id: r.region_id, name: r.name });
  }

  // Der Katalog wird über den SCHLÜSSEL abgeglichen, nicht über den Namen: Ein
  // Programm trägt sein Fördergebiet als Präfix (zwei, fünf oder acht Stellen),
  // und das Gebiet enthält die Gemeinde — nie umgekehrt. Über den Namen ginge
  // es schief, sobald der Katalog den amtlichen Namen führt und die fremde
  // Liste den kurzen: „Freiburg" gegen „Freiburg im Breisgau" meldete beim
  // ersten Lauf eine Lücke, die es nicht gibt. Landesprogramme (zwei Stellen)
  // bleiben draußen — sie deckten sonst jeden Ort ihres Landes und die Frage
  // „fehlt uns hier etwas Kommunales" wäre nie mit Ja zu beantworten.
  const katalogGebiete = allFundingPrograms()
    .filter((p) => p.level !== "bund" && p.agsCode && p.agsCode.length >= 5)
    .map((p) => ({ praefix: p.agsCode!, id: p.id }));
  const katalogFuer = (schluessel: string): string | undefined =>
    katalogGebiete.find((g) => schluessel.startsWith(g.praefix))?.id;

  const seiten = await alleZeilen<{ region_id: string; screen_verdikt: string | null; gelesen_am: string | null }>(
    "funding_seiten", "region_id, screen_verdikt, gelesen_am",
  );

  const befunde: Befund[] = [];
  for (const eingabe of eingaben) {
    const f = form(eingabe);
    const b: Befund = { eingabe };

    // Ein Ort ist erst dann eindeutig, wenn ihn NICHTS anderes tragen kann —
    // und das entscheidet nicht der exakte Name allein. Beim ersten Lauf löste
    // „Freiburg" auf Freiburg/Elbe in Niedersachsen auf: Der einzige Ort mit
    // exakt diesem Namen, während die gemeinte Stadt amtlich „Freiburg im
    // Breisgau" heißt und deshalb gar nicht erst verglichen wurde. Ein
    // geratener Gemeindeschlüssel sieht von außen aus wie ein richtiger — genau
    // die Fehlerklasse, wegen der Schlüssel nur aus dem Melderegister kommen
    // dürfen. Deshalb zählen auch Orte mit Namenszusatz als Kandidat.
    const exakt = nachForm.get(f) ?? [];
    const mitZusatz = kandidatenMitZusatz(f, nachForm);
    const kandidaten = [...exakt, ...mitZusatz.filter((k) => !exakt.some((e) => e.region_id === k.region_id))];

    // Gemeinde- und Kreisebene desselben Orts sind KEINE Mehrdeutigkeit: Eine
    // kreisfreie Stadt steht mit fünf und mit acht Stellen im Register
    // (Bielefeld 05711 und 05711000). Zusammengefasst wird über das Präfix; die
    // Gemeindezeile gewinnt, weil auf ihr die Förderseiten liegen.
    const orte = einOrt(kandidaten);
    // Bei einem mehrdeutigen Namen bleiben nur die Kandidaten übrig, die der
    // Katalog NICHT deckt — „Göttingen" ist Stadt und Landkreis, und die Stadt
    // führen wir längst. Ohne diese Kürzung meldete jeder Doppelname eine
    // Lücke, die es zur Hälfte nicht gibt; ohne den Rest fiele der ungedeckte
    // Träger still unter den Tisch.
    const offen = orte.filter((o) => !katalogFuer(o.region_id));
    if (orte.length && !offen.length) {
      b.imKatalog = katalogFuer(orte[0].region_id);
    } else if (offen.length === 1) {
      b.schluessel = offen[0].region_id;
      b.amtlich = offen[0].name;
      const meine = seiten.filter((s) => s.region_id === offen[0].region_id);
      b.seiten = meine.length;
      b.treffer = meine.filter((s) => s.screen_verdikt === "treffer").length;
      b.ungelesen = meine.filter((s) => s.screen_verdikt === "treffer" && !s.gelesen_am).length;
    } else if (offen.length > 1) {
      b.amtlich = `mehrdeutig: ${offen.map((o) => `${o.name} (${o.region_id})`).join(", ")}`;
    }
    befunde.push(b);
  }

  const imKatalog = befunde.filter((b) => b.imKatalog);
  const ungelesen = befunde.filter((b) => !b.imKatalog && (b.ungelesen ?? 0) > 0);
  const gefundenUnklar = befunde.filter((b) => !b.imKatalog && !ungelesen.includes(b) && (b.seiten ?? 0) > 0);
  const nichts = befunde.filter((b) => !b.imKatalog && (b.seiten ?? 0) === 0);

  console.log(`\n${befunde.length} Ortsnamen abgeglichen.\n`);

  if (ungelesen.length) {
    console.log(`ZUERST ANSEHEN — Seite gefunden, aber nie gelesen (${ungelesen.length}):`);
    for (const b of ungelesen) {
      console.log(`  ${b.eingabe}${b.amtlich && b.amtlich !== b.eingabe ? ` → ${b.amtlich}` : ""} (${b.schluessel}) — ${b.ungelesen} von ${b.treffer} Treffern ungelesen`);
    }
    console.log("");
  }
  if (nichts.length) {
    console.log(`KEINE SEITE ERFASST — hier lohnt die eigene Suche (${nichts.length}):`);
    for (const b of nichts) {
      console.log(`  ${b.eingabe}${b.schluessel ? ` (${b.schluessel})` : b.amtlich ? ` — ${b.amtlich}` : " — im Melderegister nicht gefunden"}`);
    }
    console.log("");
  }
  if (gefundenUnklar.length) {
    console.log(`SEITEN BEKANNT, KEIN OFFENER TREFFER (${gefundenUnklar.length}):`);
    for (const b of gefundenUnklar) console.log(`  ${b.eingabe} (${b.schluessel}) — ${b.seiten} Seiten, ${b.treffer} Treffer`);
    console.log("");
  }
  if (imKatalog.length) {
    console.log(`SCHON IM KATALOG (${imKatalog.length}): ${imKatalog.map((b) => b.eingabe).join(", ")}\n`);
  }

  console.log(
    "Nächster Schritt: Für jeden Ort der ersten beiden Blöcke die AMTSSEITE lesen.\n" +
      "Aus der Liste, aus der die Namen stammen, wird kein Betrag und kein Status übernommen.",
  );
}

// Nur beim direkten Aufruf laufen — der Test importiert die Hilfsfunktionen
// und darf dabei keine Datenbankabfrage auslösen.
if (process.argv[1]?.includes("funding-ortsabgleich")) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
