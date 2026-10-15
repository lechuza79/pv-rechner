/**
 * Official municipal boundaries (BKG VG250, Ebene Gemeinden), for placing a
 * coordinate in a municipality during a data run.
 *
 * Downloaded on demand into scripts/.cache/vg250 (≈70 MB, checked against the
 * MD5 the BKG publishes next to it) — the monthly import runs on a fresh GitHub
 * runner, so a file that only lives on one machine would not be there.
 * Licence dl-de/by-2-0 (© GeoBasis-DE / BKG); used as a tool, never shipped.
 *
 * Coordinates are EPSG:25832 (UTM 32N, metres); convert points with
 * lib/utm32.ts before asking.
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { FlaechenIndex, flaechenAusGpkg, type Flaeche } from "../../lib/gpkg-punkt";
import { gemeindeFlaechen, type GemeindeFlaechen } from "../../lib/wind-standort";

const BASIS = "https://daten.gdz.bkg.bund.de/produkte/vg/vg250_ebenen_0101/aktuell";
const DATEI = "vg250_01-01.utm32s.gpkg.ebenen.zip";
const AGENT = "solar-check-health-check";

const CACHE = process.env.VG250_DIR ?? resolve(dirname(fileURLToPath(import.meta.url)), "..", ".cache", "vg250");
const GPKG = resolve(CACHE, "vg250_ebenen_0101", "DE_VG250.gpkg");

async function laden(url: string): Promise<Buffer> {
  let letzter: unknown;
  for (let versuch = 1; versuch <= 4; versuch++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": AGENT } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (e) {
      letzter = e;
      await new Promise((r) => setTimeout(r, versuch * 5000));
    }
  }
  throw new Error(`VG250 nicht ladbar (${url}): ${String(letzter)}`);
}

/** Path to DE_VG250.gpkg, downloading and verifying it if it is missing. */
export async function vg250Gpkg(): Promise<string> {
  if (existsSync(GPKG)) return GPKG;
  mkdirSync(CACHE, { recursive: true });
  const [zip, md5] = await Promise.all([laden(`${BASIS}/${DATEI}`), laden(`${BASIS}/${DATEI}.md5`)]);
  const erwartet = md5.toString("utf8").trim().split(/\s+/)[0];
  const ist = createHash("md5").update(zip).digest("hex");
  if (ist !== erwartet) throw new Error(`VG250: Prüfsumme stimmt nicht (${ist} statt ${erwartet})`);
  const zipPfad = resolve(CACHE, DATEI);
  writeFileSync(zipPfad, zip);
  execFileSync("unzip", ["-o", "-q", zipPfad, "vg250_ebenen_0101/DE_VG250.gpkg", "dokumentation/aktualitaet.txt", "-d", CACHE]);
  if (!existsSync(GPKG)) throw new Error("VG250: Geopackage nach dem Entpacken nicht gefunden");
  return GPKG;
}

/** Stand (Gebietsstand) of the boundaries, e.g. "01.01.2026". */
export function vg250Stand(): string {
  const p = resolve(CACHE, "dokumentation", "aktualitaet.txt");
  return existsSync(p) ? readFileSync(p, "utf8").trim() : "01.01.";
}

export type Vg250Gemeinden = GemeindeFlaechen & { name(ags: string): string | undefined; anzahl: number };

export async function ladeGemeindeflaechen(): Promise<Vg250Gemeinden> {
  const pfad = await vg250Gpkg();
  const flaechen: Flaeche[] = flaechenAusGpkg(pfad, { tabelle: "vg250_gem", idSpalte: "AGS", nameSpalte: "GEN" });
  const index = new FlaechenIndex(flaechen);
  const namen = new Map(flaechen.map((f) => [f.id, f.name]));
  const basis = gemeindeFlaechen(flaechen, (x, y) => index.finde(x, y));
  return { ...basis, name: (ags) => namen.get(ags), anzahl: namen.size };
}
