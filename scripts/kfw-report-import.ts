/**
 * KfW-Förderreport einlesen und ablegen.
 *
 *   npm run kfw:import               # alle Jahrgänge in docs/quellen/kfw-foerderreport/
 *   npm run kfw:import -- --jahr 2025
 *   npm run kfw:import -- --trocken  # nur messen, nichts schreiben
 *
 * ────────────────────────────────────────────────────────────────────────────
 * WAS GESCHRIEBEN WIRD, HAT DIE KONTROLLE BESTANDEN — UND NUR DAS
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Der Lauf legt kein Programm ab, dessen Kreissumme den Bundeswert verfehlt.
 * Das ist der Unterschied zwischen einem Wächter, der meldet, und einem, der
 * wirkt: Eine Warnung im Protokoll liest niemand mehr, wenn die Zahlen schon
 * auf der Seite stehen.
 *
 * Beim ersten scharfen Lauf (26.08.2026) hat genau das gegriffen. Gemessen:
 *
 *   • BEG WG – Heizungsförderung Priv. – Zuschuss  2025: Bund 375.475 Zusagen /
 *     5.225,8 Mio €, Summe über 400 Kreise identisch, keine unterdrückte Zelle.
 *     Abgelegt.
 *   • KFN Wohngebäude Selbstnutzung 2025: Die Kreissumme liegt mit 692,8 um
 *     6,8 Mio € ÜBER dem Bundeswert von 686,0 — und zwar in vier Bundesländern
 *     verteilt, nicht an einer Stelle. Der Bericht selbst ist in sich nicht
 *     deckungsgleich: Die Summe seiner sechzehn Landeswerte trifft den
 *     Bundeswert auf die Nachkommastelle, die Summe seiner Kreiswerte nicht.
 *     Das Programm hat mit 152 von 379 Kreiszellen unter einer Million die
 *     kleinsten Zellen des Vergleichs; eine Ursache ist damit NICHT belegt,
 *     nur der Verdacht auf Rundung. Nicht abgelegt.
 *
 * Die zweite Zeile ist der eigentliche Ertrag dieser Bauweise: Ohne die
 * Kontrolle stünde dort eine plausible Zahl, die um ein Prozent danebenliegt,
 * und niemand hätte einen Anlass, sie nachzurechnen.
 *
 * Voraussetzung: `pdftotext` (poppler). Der Bericht ist ein PDF von rund 1.230
 * Seiten; ein Auslesen ohne Spaltentreue verliert die Tabellen. Das ist eine
 * Abhängigkeit des Einlese-Laufs, nicht der Website — die Zahlen liegen danach
 * in der Datenbank.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { leseReport, kontrolliere, type Kontrolle, type ReportDaten } from "../lib/kfw-report-parse";
import { ordneKreiseZu, type Kreisregion } from "../lib/kfw-kreis-zuordnung";
import { BUNDESLAENDER } from "../lib/mastr-regions";
import { HEIZUNGSFOERDERUNG, KFW_REPORT_STAND } from "../lib/kfw-format";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const WURZEL = resolve(SCRIPT_DIR, "..");
const QUELLEN = resolve(WURZEL, "docs/quellen/kfw-foerderreport");

/**
 * Die Programme, die dieser Lauf überhaupt anfasst.
 *
 * Bewusst eine kurze, benannte Liste statt „alles, was im Bericht steht": Der
 * Bericht führt 65 Programme, von denen uns eines wirklich betrifft. Die
 * beiden anderen stehen dabei, weil sie im selben Abschnitt geprüft werden und
 * ihre Kontrolle damit sichtbar macht, wie gut das Auslesen insgesamt war —
 * ein Programm, das durchfällt, ist ein Befund über den Parser, nicht nur über
 * das Programm.
 */
const PROGRAMME = [
  HEIZUNGSFOERDERUNG,
  "BEG Wohngebäude - Kredit Effizienzhaus",
  "KFN Wohngebäude Selbstnutzung",
];

function ladeEnv(): void {
  const p = resolve(WURZEL, ".env.local");
  if (!existsSync(p)) return;
  for (const zeile of readFileSync(p, "utf8").split("\n")) {
    const m = zeile.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

function flag(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const trocken = process.argv.includes("--trocken");

function zuText(pdf: string): string {
  try {
    return execFileSync("pdftotext", ["-layout", "-enc", "UTF-8", pdf, "-"], {
      maxBuffer: 300 * 1024 * 1024,
      stdio: ["ignore", "pipe", "ignore"],
    }).toString();
  } catch {
    throw new Error(
      "pdftotext nicht gefunden oder fehlgeschlagen. Der Einlese-Lauf braucht poppler " +
        "(macOS: brew install poppler). Die Website braucht es nicht — die Zahlen liegen danach in der Datenbank.",
    );
  }
}

function bericht(k: Kontrolle): string {
  return (
    `  ${k.bestanden ? "bestanden " : "DURCHGEFALLEN"}  ${k.programm}\n` +
    `      Bund ${k.bundAnzahl ?? "—"} Zusagen / ${k.bundVolumen} Mio €\n` +
    `      Kreise ${k.kreise}, davon ${k.unterdrueckt} mit unterdrückter Anzahl\n` +
    `      Summe ${k.summeAnzahlSichtbar} / ${k.summeVolumen} Mio €, Abweichung ${k.abweichungMio} Mio €` +
    (k.grund ? `\n      → ${k.grund}` : "")
  );
}

async function main() {
  ladeEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!trocken && (!url || !key)) {
    console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_KEY fehlen (.env.local).");
    process.exit(1);
  }
  const sb = trocken ? null : createClient(url!, key!);

  // Das Kreisverzeichnis kommt aus dem Register, nie aus einer Bildschirmliste.
  // Ein fünfstelliger Gebietsschlüssel ist eine Zahl ohne Aussehen: Vertippt
  // man sich um eine Stelle, bleibt er gültig und zeigt auf einen anderen Ort.
  let register: Kreisregion[] = [];
  if (sb) {
    const { data, error } = await sb
      .from("mastr_regions")
      .select("region_id,name,bezeichnung")
      .eq("level", "landkreis")
      .limit(1000);
    if (error || !data?.length) {
      console.error("Kreisverzeichnis nicht lesbar:", error?.message);
      process.exit(1);
    }
    register = data as Kreisregion[];
  } else {
    const zwischen = resolve(QUELLEN, "kreisregister.json");
    if (existsSync(zwischen)) register = JSON.parse(readFileSync(zwischen, "utf8"));
  }
  const landAgs = new Map(BUNDESLAENDER.map((b) => [b.name, b.ags]));

  const nurJahr = flag("jahr");
  const dateien = readdirSync(QUELLEN)
    .filter((f) => /^KfW-Foerderreport_\d{4}\.pdf$/.test(f))
    .filter((f) => !nurJahr || f.includes(nurJahr))
    .sort();
  if (!dateien.length) {
    console.error(`Keine Berichte in ${QUELLEN}. Erwartet: KfW-Foerderreport_JJJJ.pdf`);
    process.exit(1);
  }

  let alleGut = true;

  for (const datei of dateien) {
    console.log(`\n── ${datei}`);
    const daten: ReportDaten = leseReport(zuText(resolve(QUELLEN, datei)));
    console.log(
      `   Stichtag ${daten.stichtagIso} · ${daten.bund.size} Programme · ` +
        `${daten.kreise.length} Kreiszeilen · ${daten.verwendungszwecke.length} Verwendungszweck-Zeilen`,
    );

    const unbekannt = new Set(daten.kreise.filter((z) => !daten.bund.has(z.programm)).map((z) => z.programm));
    if (unbekannt.size) console.log(`   Programmnamen ohne Eintrag in der Bundestabelle: ${[...unbekannt].join(", ")}`);

    // Kreisnamen → Gebietsschlüssel.
    const paare = [...new Set(daten.kreise.map((z) => `${z.bundesland}|${z.kreis}`))].filter(
      (p) => !p.endsWith("|keine Angabe"),
    );
    const zo = register.length ? ordneKreiseZu(paare, register, landAgs) : null;
    if (zo) {
      console.log(`   Kreise: ${paare.length} Namen → ${new Set(zo.zuordnung.values()).size} Gebietsschlüssel`);
      if (zo.offen.length || zo.kollisionen.length) {
        console.error("   Zuordnung unvollständig:", JSON.stringify({ offen: zo.offen, kollisionen: zo.kollisionen }, null, 2));
        alleGut = false;
        continue;
      }
    }

    const kontrollen = kontrolliere(daten, PROGRAMME);
    kontrollen.forEach((k) => console.log(bericht(k)));
    const gut = kontrollen.filter((k) => k.bestanden);
    if (gut.length !== kontrollen.length) alleGut = false;
    if (!gut.some((k) => k.programm === HEIZUNGSFOERDERUNG)) {
      console.error("   Die Heizungsförderung hat die Kontrolle nicht bestanden — dieser Jahrgang wird nicht abgelegt.");
      alleGut = false;
      continue;
    }
    if (trocken || !sb || !zo) {
      console.log("   (Trockenlauf — nichts geschrieben.)");
      continue;
    }

    const behalten = new Set(gut.map((k) => k.programm));

    // Bundesebene: Programmzeile + Verwendungszwecke.
    const bundZeilen: { jahr: number; programm: string; verwendungszweck: string; anzahl: number | null; volumen_mio: number }[] = [];
    for (const p of behalten) {
      const z = daten.bund.get(p)!;
      bundZeilen.push({ jahr: daten.jahr, programm: p, verwendungszweck: "", anzahl: z.anzahl, volumen_mio: z.volumenMio });
    }
    for (const v of daten.verwendungszwecke) {
      // „Gesamt" ist die Programmsumme und steht schon als Programmzeile da.
      if (!behalten.has(v.programm) || v.verwendungszweck === "Gesamt") continue;
      if (v.anzahl === 0 && v.volumenMio === 0) continue;
      bundZeilen.push({
        jahr: daten.jahr,
        programm: v.programm,
        verwendungszweck: v.verwendungszweck,
        anzahl: v.anzahl,
        volumen_mio: v.volumenMio,
      });
    }

    // Kreisebene, aufaddiert je Gebietsschlüssel: Ein Kreis kann im Bericht
    // unter zwei Bundesländern auftauchen (Buchungen, deren Landeszuordnung
    // nicht zur Kreiszuordnung passt). Beim Aufaddieren gilt: eine unterdrückte
    // Anzahl steckt alles an, was sie berührt — aus „* plus 40" wird nicht 40,
    // sondern „unbekannt". Alles andere wäre eine untere Schranke, die wie eine
    // Zahl aussieht.
    const proKreis = new Map<string, { anzahl: number | null; volumen: number }>();
    for (const z of daten.kreise) {
      if (!behalten.has(z.programm)) continue;
      const id = zo.zuordnung.get(`${z.bundesland}|${z.kreis}`);
      if (!id) continue;
      const schluessel = `${z.programm}|${id}`;
      const da = proKreis.get(schluessel);
      if (!da) proKreis.set(schluessel, { anzahl: z.anzahl, volumen: z.volumenMio });
      else {
        da.anzahl = da.anzahl === null || z.anzahl === null ? null : da.anzahl + z.anzahl;
        da.volumen = Math.round((da.volumen + z.volumenMio) * 10) / 10;
      }
    }
    const kreisZeilen = [...proKreis].map(([k, v]) => {
      const [programm, region_id] = k.split("|");
      return { jahr: daten.jahr, programm, region_id, anzahl: v.anzahl, volumen_mio: v.volumen };
    });

    const jg = await sb.from("kfw_report_jahrgang").upsert(
      {
        jahr: daten.jahr,
        stichtag: daten.stichtagIso,
        eingelesen_at: new Date().toISOString(),
        kontrolle: { programme: kontrollen, abgelegt: [...behalten] },
      },
      { onConflict: "jahr" },
    );
    if (jg.error) { console.error("   Jahrgang:", jg.error.message); alleGut = false; continue; }

    for (const [tabelle, zeilen, konflikt] of [
      ["kfw_report_bund", bundZeilen, "jahr,programm,verwendungszweck"],
      ["kfw_report_kreis", kreisZeilen, "jahr,programm,region_id"],
    ] as const) {
      for (let i = 0; i < zeilen.length; i += 500) {
        const r = await sb.from(tabelle).upsert(zeilen.slice(i, i + 500) as never, { onConflict: konflikt });
        if (r.error) { console.error(`   ${tabelle}:`, r.error.message); alleGut = false; }
      }
    }
    console.log(`   abgelegt: ${bundZeilen.length} Bundeszeilen, ${kreisZeilen.length} Kreiszeilen`);
  }

  // Die „Stand:"-Zeile unter den Rechnern liest ihr Datum aus einer Konstante
  // im Code, nicht aus der Datenbank — sonst hinge jede Seite mit Stand-Zeile
  // an einem Read. Der Preis dafür ist ein möglicher Auseinanderlauf, und der
  // wird HIER abgefangen, also dort, wo er entstünde: Wer einen Jahrgang
  // ablegt, dessen Stichtag die Konstante nicht kennt, bekommt keinen stillen
  // Erfolg, sondern diese Meldung.
  if (!trocken && sb) {
    const { data } = await sb
      .from("kfw_report_jahrgang")
      .select("jahr,stichtag")
      .order("jahr", { ascending: false })
      .limit(1);
    const neuster = (data?.[0] as { jahr: number; stichtag: string } | undefined) ?? null;
    if (neuster && neuster.stichtag !== KFW_REPORT_STAND.wertIso) {
      console.error(
        `\nDer jüngste abgelegte Jahrgang (${neuster.jahr}) hat den Stichtag ${neuster.stichtag}, ` +
          `KFW_REPORT_STAND.wertIso sagt ${KFW_REPORT_STAND.wertIso}.\n` +
          `Bitte KFW_REPORT_STAND in lib/kfw-format.ts nachziehen (wertIso auf den Stichtag, ` +
          `geprueftIso auf heute) — sonst behauptet die Stand-Zeile einen Zeitraum, den die Zahlen nicht haben.`,
      );
      alleGut = false;
    }
  }

  if (!alleGut) {
    console.log("\nMindestens eine Kontrolle ist durchgefallen — siehe oben. Was durchgefallen ist, wurde nicht abgelegt.");
    process.exit(1);
  }
  console.log("\nAlles bestanden.");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
