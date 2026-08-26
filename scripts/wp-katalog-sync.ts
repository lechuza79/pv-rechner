// ─── Geräte-Katalog auffrischen ───────────────────────────────────────────────
//
//   npm run wp:katalog          — Katalog neu aufbauen
//   npm run wp:katalog -- --dry — nur messen, nichts schreiben
//
// Holt den Produktdatenstrom des Händlers über Awin und legt die Wärmepumpen ab,
// die sich einem Fall zuordnen lassen. Läuft täglich; der Händler aktualisiert
// seine Daten in derselben Taktung.
//
// Warum über die Feed-LISTE und nicht über eine feste Feed-Adresse: Die Liste
// nennt zu jedem Feed den Stand der letzten Aktualisierung und die aktuelle
// Download-Adresse. Eine fest eingetragene Adresse würde beim ersten Umbau auf
// Händlerseite stillschweigend eine alte Datei liefern — oder gar keine, und
// das fiele erst auf, wenn jemand die Preise nachrechnet.

import { createGunzip } from "node:zlib";
import { Readable } from "node:stream";
import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "csv-parse";
import { createClient } from "@supabase/supabase-js";
import { geraetAusZeile, WP_KATALOG_TABELLE, type FeedZeile, type WpGeraet } from "../lib/wp-katalog";

/**
 * Zugangsdaten aus `.env.local` nachladen — dasselbe Muster wie in den anderen
 * Skripten des Projekts. Next.js lädt die Datei von selbst, ein Skript aus der
 * Kommandozeile nicht. Vorhandene Umgebungswerte gewinnen, damit ein Lauf in
 * GitHub Actions die dortigen Werte behält.
 */
function ladeUmgebung(): void {
  const pfad = resolve(dirname(fileURLToPath(import.meta.url)), "..", ".env.local");
  if (!existsSync(pfad)) return;
  for (const zeile of readFileSync(pfad, "utf8").split("\n")) {
    const m = zeile.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
ladeUmgebung();


const HAENDLER = "Heizungsdiscount24 DE";
const SCHREIB_BLOCK = 500;

const nurMessen = process.argv.includes("--dry");

function feedListeUrl(): string {
  const url = process.env.AWIN_FEED_LIST_URL;
  if (!url) {
    console.error(
      "AWIN_FEED_LIST_URL fehlt. Die Adresse steht in der Awin-Oberfläche unter\n" +
        "Tools → Create-a-Feed im Kasten „Feed-Übersicht“ und gehört in .env.local.",
    );
    process.exit(1);
  }
  return url;
}

/** Sucht in der Feed-Liste den Datenstrom des Händlers. */
async function feedAdresse(): Promise<{ url: string; produkte: number; stand: string }> {
  const antwort = await fetch(feedListeUrl());
  if (!antwort.ok) throw new Error(`Feed-Liste nicht abrufbar: HTTP ${antwort.status}`);

  const text = await antwort.text();
  const zeilen: string[][] = await new Promise((fertig, fehler) => {
    parse(text, { columns: false, relax_quotes: true }, (e, r: string[][]) =>
      e ? fehler(e) : fertig(r),
    );
  });

  const kopf = zeilen[0];
  const spalte = (name: string) => kopf.indexOf(name);
  const treffer = zeilen
    .slice(1)
    .find((z) => z[spalte("Advertiser Name")] === HAENDLER && z[spalte("Membership Status")] === "active");

  if (!treffer) {
    throw new Error(
      `Kein aktiver Datenstrom für ${HAENDLER}. Entweder ist die Partnerschaft beendet ` +
        `oder der Händler stellt keine Produktdaten mehr bereit — beides gehört gemeldet, ` +
        `nicht stillschweigend übergangen.`,
    );
  }

  return {
    url: treffer[spalte("URL")],
    produkte: Number(treffer[spalte("No of products")]) || 0,
    stand: treffer[spalte("Last Imported")] || "unbekannt",
  };
}

/** Lädt den Datenstrom und filtert die Geräte heraus. */
async function geraeteLaden(url: string): Promise<WpGeraet[]> {
  const antwort = await fetch(url);
  if (!antwort.ok || !antwort.body) throw new Error(`Datenstrom nicht abrufbar: HTTP ${antwort.status}`);

  const geraete: WpGeraet[] = [];
  let gesehen = 0;

  await new Promise<void>((fertig, fehler) => {
    Readable.fromWeb(antwort.body as never)
      .pipe(createGunzip())
      .pipe(parse({ columns: true, relax_quotes: true, skip_records_with_error: true }))
      .on("data", (zeile: FeedZeile) => {
        gesehen++;
        const g = geraetAusZeile(zeile);
        if (g) geraete.push(g);
      })
      .on("end", () => fertig())
      .on("error", fehler);
  });

  console.log(`  ${gesehen} Artikel gelesen, ${geraete.length} Geräte erkannt`);
  return geraete;
}

async function schreibe(geraete: WpGeraet[], abgerufenIso: string): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("Supabase-Zugang fehlt (URL oder Service-Key).");
  const db = createClient(url, key);

  const zeilen = geraete.map((g) => ({
    id: g.id,
    name: g.name,
    marke: g.marke,
    leistung_kw: g.leistungKw,
    herkunft: g.herkunft,
    bauart: g.bauart,
    preis_eur: g.preisEur,
    link: g.link,
    bild_url: g.bildUrl,
    lieferbar: g.lieferbar,
    vorlauf_max_c: g.vorlaufMaxC,
    kaeltemittel: g.kaeltemittel,
    aufbau: g.aufbau,
    umfang: g.umfang,
    abgerufen_am: abgerufenIso,
  }));

  for (let i = 0; i < zeilen.length; i += SCHREIB_BLOCK) {
    const block = zeilen.slice(i, i + SCHREIB_BLOCK);
    const { error } = await db.from(WP_KATALOG_TABELLE).upsert(block, { onConflict: "id" });
    if (error) throw new Error(`Schreiben fehlgeschlagen: ${error.message}`);
  }

  // Erst jetzt aufräumen, was dieser Lauf nicht mehr gesehen hat. In dieser
  // Reihenfolge gibt es keinen Moment, in dem die Tabelle leer ist — ein
  // Seitenaufbau währenddessen sieht den alten oder den neuen Stand, nie nichts.
  const { error, count } = await db
    .from(WP_KATALOG_TABELLE)
    .delete({ count: "exact" })
    .neq("abgerufen_am", abgerufenIso);
  if (error) throw new Error(`Aufräumen fehlgeschlagen: ${error.message}`);
  console.log(`  ${zeilen.length} Geräte geschrieben, ${count ?? 0} nicht mehr angebotene entfernt`);
}

async function main() {
  const abgerufenIso = new Date().toISOString();
  console.log(`Geräte-Katalog auffrischen${nurMessen ? " (Probelauf, es wird nichts geschrieben)" : ""}`);

  const feed = await feedAdresse();
  console.log(`  Datenstrom ${HAENDLER}: ${feed.produkte} Artikel, Stand ${feed.stand}`);

  const geraete = await geraeteLaden(feed.url);
  if (geraete.length === 0) {
    // Ein leeres Ergebnis ist nie ein gültiger Katalog. Es zu schreiben hieße,
    // den funktionierenden Bestand gegen nichts einzutauschen.
    throw new Error("Kein einziges Gerät erkannt — der Katalog wird NICHT überschrieben.");
  }

  const mitAngabe = geraete.filter((g) => g.herkunft === "ausgeschrieben").length;
  console.log(
    `  davon ${mitAngabe} mit ausgeschriebener Leistung, ${geraete.length - mitAngabe} über Typenschlüssel`,
  );

  if (nurMessen) {
    console.log("Probelauf beendet.");
    return;
  }
  await schreibe(geraete, abgerufenIso);
}

main().catch((e) => {
  console.error(`Abgebrochen: ${e instanceof Error ? e.message : e}`);
  process.exit(1);
});
