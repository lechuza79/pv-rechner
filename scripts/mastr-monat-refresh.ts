/**
 * Zubau je MONAT — die Auflösung, die der Jahresbestand nicht hat.
 *
 * Der Hauptimport fasst jede Anlage in ihrem Inbetriebnahme-JAHR zusammen. Für
 * die Frage „was ist da gerade passiert?" ist das zu grob: Ein Ort, in dem
 * innerhalb von drei Monaten 140 Balkonkraftwerke ans Netz gehen, sieht in der
 * Jahreszahl aus wie jeder andere.
 *
 * DIESER LAUF FASST DEN BESTAND NICHT AN. Er schreibt in eine eigene Tabelle
 * und liest dieselbe Datei, die der Hauptimport ohnehin lädt — ein Vollimport,
 * nur um eine Spalte zu ergänzen, würde 590.000 Zeilen des laufenden Betriebs
 * überschreiben, für einen Zusatz, den heute niemand liest.
 *
 * NUR DIE LETZTEN JAHRE: Eine Monatsachse über die ganze Historie
 * verzwölffachte den Bestand. Erzählenswert ist ohnehin nur das Frische.
 *
 *   npx tsx scripts/mastr-monat-refresh.ts            # rechnen und schreiben
 *   npx tsx scripts/mastr-monat-refresh.ts --trocken  # nur rechnen
 *   npx tsx scripts/mastr-monat-refresh.ts --verzug   # Meldeverzug messen
 */
import { createClient } from "@supabase/supabase-js";
import {
  UNIT_SPECS,
  buildActorMap,
  classifySolarSegment,
  findCachedZip,
  parseKwp,
  streamXmlRecords,
  listZipEntries,
} from "./mastr-bnetza-refresh";

const STATUS_IN_BETRIEB = "35";
const TABELLE = "mastr_monat_gem";

/** Wie viele Monate zurück gerechnet wird. Zwei Jahre plus Anlaufmonat. */
const MONATE_ZURUECK = 25;

type Wert = { count: number; kwp: number };

function monatsSchluessel(iso: string | undefined): string | null {
  if (!iso || iso.length < 7) return null;
  const jahr = Number(iso.slice(0, 4));
  const monat = Number(iso.slice(5, 7));
  if (!Number.isFinite(jahr) || !Number.isFinite(monat)) return null;
  if (monat < 1 || monat > 12) return null;
  // Dieselbe Untergrenze wie überall: Das Register trägt Fantasie-Jahrgänge aus
  // Tippfehlern (1900, 1923). Hier fallen sie ohnehin durch das Zeitfenster.
  if (jahr < 2000 || jahr > 2100) return null;
  return `${jahr}-${String(monat).padStart(2, "0")}`;
}

function fensterAb(): string {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() - MONATE_ZURUECK);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

async function eintraegeFuer(zipPath: string, muster: RegExp): Promise<string[]> {
  const alle = await listZipEntries(zipPath);
  return alle.map((e) => e.name).filter((n) => muster.test(n));
}

/**
 * Der MELDEVERZUG, und warum er vor der ersten Monatsaussage gemessen gehört.
 *
 * Eine Anlage geht ans Netz und wird danach registriert — dazwischen liegen
 * Wochen. Ein Monatswert wächst also nach seinem Monat noch nach. Wer im
 * September über den August schreibt, schreibt über eine Zahl, die im Oktober
 * eine andere ist; und das merkt niemand, weil beide Zahlen plausibel aussehen.
 *
 * Gemessen wird am Abstand zwischen Inbetriebnahme und Registrierung, beides
 * steht an derselben Anlage. Zurück kommt, welcher Anteil eines Monats nach
 * 30, 60 und 90 Tagen überhaupt im Register stand.
 */
async function messeVerzug(zipPath: string): Promise<void> {
  const spec = UNIT_SPECS.find((s) => s.et === "solar")!;
  const eintraege = await eintraegeFuer(zipPath, spec.filePattern);
  const abstaende: number[] = [];
  let ohneRegistrierung = 0;
  let gesehen = 0;
  const seit = Date.UTC(new Date().getUTCFullYear() - 2, 0, 1);

  for (const eintrag of eintraege) {
    await streamXmlRecords(zipPath, eintrag, spec.recordTag, (row) => {
      const inbetrieb = row.Inbetriebnahmedatum;
      if (!inbetrieb || inbetrieb.length < 10) return;
      const tIn = Date.parse(inbetrieb.slice(0, 10));
      if (!Number.isFinite(tIn) || tIn < seit) return;
      gesehen++;
      const reg = row.Registrierungsdatum ?? row.DatumLetzteAktualisierung;
      if (!reg || reg.length < 10) {
        ohneRegistrierung++;
        return;
      }
      const tReg = Date.parse(reg.slice(0, 10));
      if (!Number.isFinite(tReg)) {
        ohneRegistrierung++;
        return;
      }
      abstaende.push(Math.round((tReg - tIn) / 86_400_000));
    });
    if (abstaende.length > 400_000) break;
  }

  if (!abstaende.length) {
    console.log(
      `Kein Registrierungsdatum in den Daten (${gesehen.toLocaleString("de-DE")} Anlagen angesehen, ` +
        `${ohneRegistrierung.toLocaleString("de-DE")} ohne Datum). Der Verzug ist so nicht messbar — ` +
        `dann bleibt nur der Vergleich zweier Datenstände.`,
    );
    return;
  }

  abstaende.sort((a, b) => a - b);
  const anteilBis = (tage: number) =>
    (abstaende.filter((d) => d <= tage).length / abstaende.length) * 100;
  const median = abstaende[Math.floor(abstaende.length / 2)];

  console.log(`Meldeverzug, ${abstaende.length.toLocaleString("de-DE")} Anlagen der letzten zwei Jahre:`);
  console.log(`  Median: ${median} Tage`);
  for (const t of [0, 30, 60, 90, 180]) {
    console.log(`  nach ${String(t).padStart(3)} Tagen im Register: ${anteilBis(t).toFixed(1)} %`);
  }
  const negativ = abstaende.filter((d) => d < 0).length;
  if (negativ) {
    console.log(
      `  ${negativ.toLocaleString("de-DE")} vor der Inbetriebnahme registriert — ` +
        `angemeldet, bevor sie lief. Kein Fehler, aber sie gehören nicht in den Verzug.`,
    );
  }
}

async function main() {
  const trocken = process.argv.includes("--trocken");
  const zipPath = findCachedZip();
  console.log(`Lese ${zipPath}`);

  if (process.argv.includes("--verzug")) {
    await messeVerzug(zipPath);
    return;
  }

  const ab = fensterAb();
  console.log(`Zeitfenster ab ${ab}`);
  const actorMap = await buildActorMap(zipPath);

  const agg = new Map<string, Wert>();
  for (const spec of UNIT_SPECS) {
    // Nur Solar: Die Anomalie-Geschichte fragt nach Balkonkraftwerken und
    // Dachanlagen. Wind und Wasser gehen nicht in Schüben ans Netz, und
    // Speicher haben im Register kein eigenes Segment.
    if (spec.et !== "solar") continue;
    const eintraege = await eintraegeFuer(zipPath, spec.filePattern);
    for (const eintrag of eintraege) {
      await streamXmlRecords(zipPath, eintrag, spec.recordTag, (row) => {
        if (row.EinheitBetriebsstatus !== STATUS_IN_BETRIEB) return;
        const gks = (row.Gemeindeschluessel ?? "").trim();
        if (gks.length < 8) return;
        const monat = monatsSchluessel(row.Inbetriebnahmedatum);
        if (!monat || monat < ab) return;
        const kwp = parseKwp(row.Bruttoleistung);
        if (!kwp || kwp <= 0) return;
        const segment = classifySolarSegment(row, actorMap, kwp);
        const key = `${gks.slice(0, 8)}|${segment}|${monat}`;
        const vorhanden = agg.get(key);
        if (vorhanden) {
          vorhanden.count++;
          vorhanden.kwp += kwp;
        } else {
          agg.set(key, { count: 1, kwp });
        }
      });
    }
  }
  actorMap.clear();

  const zeilen = Array.from(agg.entries()).map(([key, v]) => {
    const [region_id, segment, monat] = key.split("|");
    return {
      region_id,
      segment,
      monat: `${monat}-01`,
      count: v.count,
      kwp: Math.round(v.kwp * 100) / 100,
    };
  });
  console.log(`${zeilen.length.toLocaleString("de-DE")} Monatswerte`);

  if (trocken) {
    console.log("Trockenlauf, nichts geschrieben.");
    console.log(JSON.stringify(zeilen.slice(0, 5), null, 2));
    return;
  }

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("Datenbank-Zugang fehlt");
  const db = createClient(url, key, { auth: { persistSession: false } });

  let n = 0;
  for (let i = 0; i < zeilen.length; i += 1000) {
    const teil = zeilen.slice(i, i + 1000);
    const { error } = await db
      .from(TABELLE)
      .upsert(teil, { onConflict: "region_id,segment,monat" });
    if (error) throw new Error(`Schreiben fehlgeschlagen: ${error.message}`);
    n += teil.length;
    process.stderr.write(`\r  ${n.toLocaleString("de-DE")} geschrieben`);
  }
  process.stderr.write("\n");

  // WAS AUS DEM FENSTER FÄLLT, WIRD GELÖSCHT. Der Lauf schreibt nur die Monate
  // seines Fensters; ohne dieses Aufräumen bliebe alles Ältere mit dem Stand
  // liegen, den es beim letzten Schreiben hatte. Nach einem Jahr enthielte die
  // Tabelle ein Dutzend Monate, die niemand mehr aktualisiert — und die
  // Anomalie-Suche bildet ihren Vergleichsmedian über ALLE Fenster. Eingefrorene
  // Monate sind dabei systematisch zu niedrig (sie wurden abgelegt, als sie noch
  // unvollständig gemeldet waren): Der Median sinkt, der Faktor steigt, und es
  // erscheinen Ausschläge, die keine sind.
  //
  // Ebenso verschwindet damit eine Zeile, deren Anlagen alle abgemeldet wurden —
  // sie stünde sonst für immer mit ihrer alten Zahl da.
  const { error: aufraeumFehler, count } = await db
    .from(TABELLE)
    .delete({ count: "exact" })
    .lt("monat", `${ab}-01`);
  if (aufraeumFehler) throw new Error(`Aufräumen fehlgeschlagen: ${aufraeumFehler.message}`);
  if (count) console.log(`${count.toLocaleString("de-DE")} Monatswerte außerhalb des Fensters gelöscht.`);

  console.log("Fertig.");
}

main().catch((err) => {
  console.error(String(err instanceof Error ? err.message : err));
  process.exit(1);
});
