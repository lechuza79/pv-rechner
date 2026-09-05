// Die Einordnung der angesehenen Belege in die Datenbank übernehmen.
//
// Der Browser-Lauf sichert Belege und urteilt nicht; die Einordnung entsteht
// danach anhand dieser Belege. Dieses Skript trägt sie ein und setzt dabei die
// Sicherheit auf `angesehen` — das ist die Marke, an der später jede Auswertung
// erkennt, welche Zahlen belastbar sind und welche nur ein Verdacht aus dem
// Quelltext.
//
// WAS ES ZUSÄTZLICH BERECHNET: die Fehlerquote der Maschine, getrennt nach
// beiden Richtungen.
//
//   Falsch positiv — die Maschine meldete ein Werkzeug, es war keines.
//   Falsch negativ — die Maschine meldete nichts, es war eines da.
//
// Die zweite ist die wichtigere und wurde nie erhoben. Ohne sie ist „nur X von
// 861 haben eins" unbelegt: Niemand hat je nachgesehen, ob die anderen wirklich
// keines haben. Die Stichprobe aus den vermeintlich leeren beantwortet das, und
// aus ihr wird eine Spanne statt einer Scheingenauigkeit.
//
// Aufruf:  npx tsx scripts/versorger-werkzeuge-uebernehmen.ts <urteil.json …> [--schreiben]

import { readFileSync } from "node:fs";

import { alleZeilen, datenbank, log } from "../lib/skript-umgebung";
import type { Werkzeugbefund, WerkzeugThema, WerkzeugZustand } from "../lib/versorger-werkzeuge";

type Urteil = {
  id: string;
  name: string;
  zustand: WerkzeugZustand;
  thema: WerkzeugThema;
  anbieter: string | null;
  begruendung: string;
};

/** Zustände, die ein vorhandenes Werkzeug belegen. `tarifrechner`,
 *  `netz-pflichtprozess` und `kontaktformular` gehören ausdrücklich NICHT dazu
 *  — sie waren die drei Verwechslungen, an denen die alte Zählung scheiterte. */
const ZAEHLT_ALS_WERKZEUG: WerkzeugZustand[] = ["rechner", "rechner-mit-leadfunnel", "eingekauft", "gratis-kataster"];

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const schreiben = argv.includes("--schreiben");
  const dateien = argv.filter((a) => !a.startsWith("--"));
  if (!dateien.length) throw new Error("Keine Urteilsdatei angegeben");

  // Bei mehrfach eingeordneter Kennung gewinnt die SPÄTERE Datei. Grund: Ein
  // Nachfass-Durchgang (etwa dem Werkzeug-Link gefolgt statt der Seite mit dem
  // Verweis) liefert den besseren Beleg, und der soll den ersten ersetzen — nicht
  // beide nebeneinander gezählt werden.
  const jeKennung = new Map<string, Urteil>();
  for (const f of dateien) {
    for (const u of JSON.parse(readFileSync(f, "utf8")) as Urteil[]) jeKennung.set(u.id, u);
  }
  const urteile = [...jeKennung.values()];
  log(`${urteile.length} Einordnungen aus ${dateien.length} Dateien`);

  const db = datenbank();
  const zeilen = await alleZeilen<{ id: string; name: string; werkzeug: Werkzeugbefund | null }>(
    db,
    "utilities",
    "id, name, werkzeug",
  );
  const nachId = new Map(zeilen.map((z) => [z.id, z]));

  const kreuz = new Map<string, number>();
  let falschPositiv = 0;
  let falschNegativ = 0;
  let stichprobe = 0;
  let bestaetigt = 0;
  const abweichungen: string[] = [];

  let ok = 0;
  let fehler = 0;
  for (const u of urteile) {
    const z = nachId.get(u.id);
    if (!z) {
      log(`unbekannte Kennung: ${u.id}`, "err" as never);
      continue;
    }
    const alt = z.werkzeug?.zustand ?? "keins";
    kreuz.set(`${alt} → ${u.zustand}`, (kreuz.get(`${alt} → ${u.zustand}`) ?? 0) + 1);

    const altWerkzeug = ZAEHLT_ALS_WERKZEUG.includes(alt as WerkzeugZustand);
    const neuWerkzeug = ZAEHLT_ALS_WERKZEUG.includes(u.zustand);
    if (alt === "keins") {
      stichprobe++;
      if (neuWerkzeug) falschNegativ++;
    } else {
      if (altWerkzeug && !neuWerkzeug) falschPositiv++;
      if (altWerkzeug && neuWerkzeug) bestaetigt++;
    }
    if (alt !== u.zustand) abweichungen.push(`${z.name}: ${alt} → ${u.zustand} (${u.begruendung})`);

    if (schreiben) {
      const neu: Werkzeugbefund = {
        ...(z.werkzeug ?? ({} as Werkzeugbefund)),
        zustand: u.zustand,
        sicherheit: "angesehen",
        thema: u.thema,
        anbieter: u.anbieter,
        beleg: u.begruendung,
      };
      const { error } = await db.from("utilities").update({ werkzeug: neu }).eq("id", u.id);
      if (error) {
        fehler++;
        log(`${z.name}: NICHT gespeichert — ${error.message}`);
      } else ok++;
    }
  }

  console.log("\n── Wie die Maschine lag ──");
  for (const [k, v] of [...kreuz.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(v).padStart(4)}  ${k}`);
  }

  console.log("\n── Fehlerquoten ──");
  const gesehen = urteile.length - stichprobe;
  console.log(`  Kandidaten angesehen           : ${gesehen}`);
  console.log(`  davon als Werkzeug bestätigt   : ${bestaetigt}`);
  console.log(`  davon war keines               : ${falschPositiv}`);
  console.log(`  Stichprobe aus "kein Werkzeug" : ${stichprobe}`);
  console.log(`  davon war doch eines da        : ${falschNegativ}`);
  if (stichprobe > 0) {
    const quote = falschNegativ / stichprobe;
    console.log(`  → übersehen-Quote              : ${(quote * 100).toFixed(1)} %`);
    console.log(
      `  Wichtig: Die Stichprobe hat nur die STARTSEITE gesehen, nicht die ganze Website.\n` +
        `  Die Quote ist damit eine Untergrenze für das Übersehen und darf nicht als\n` +
        `  Hochrechnung auf alle 861 benutzt werden, ohne das dazuzuschreiben.`,
    );
  }

  console.log(`\n── Abweichungen von der Maschine: ${abweichungen.length} ──`);
  for (const a of abweichungen.slice(0, 40)) console.log(`  ${a}`);
  if (abweichungen.length > 40) console.log(`  … und ${abweichungen.length - 40} weitere`);

  if (!schreiben) {
    console.log("\nNur Bericht. Mit --schreiben in die Datenbank übernehmen.");
    return;
  }
  log(`geschrieben: ${ok}, fehlgeschlagen: ${fehler}`);
  if (fehler) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
