/**
 * Welche Fläche enthält diesen Punkt? — gelesen direkt aus einem GeoPackage.
 *
 * WARUM OHNE FREMDBIBLIOTHEK: Gebraucht wird genau eine Frage („in welcher
 * Gemeinde liegt diese Koordinate"), und zwar in einem Datenlauf, nicht im
 * Seitenaufbau. Eine Geometrie-Bibliothek dafür einzuführen wäre eine
 * Abhängigkeit für eine Funktion — der Rest des Projekts hält es genauso
 * (kein Chart-Framework, kein CSS-Framework). Ein Strahlentest über einen Ring
 * sind fünfzehn Zeilen.
 *
 * DIE Z-KOORDINATE IST ALS +1000 KODIERT, NICHT ALS BITFLAG — BLOCKER.
 * Die Schweizer Grenzen liegen als MultiPolygon mit Höhe vor, und ISO-WKB
 * schreibt das als Typ 1006. Die aus OGC-WKB bekannte Bitmaske liefert dort
 * `1006 & 0xFF = 238`, also einen Typ, den es nicht gibt — gemessen beim Bauen,
 * und der Fehler sieht wie eine kaputte Datei aus statt wie ein Lesefehler.
 *
 * Geprüft an drei Punkten mit bekannter Antwort (Bundeshaus Bern → 351,
 * Zürich → 261, Genf → 6621) und anschließend als Gegenprobe gegen die
 * amtliche Gebäude-Zuordnung über alle 337.455 Anlagen des Registers: zwei
 * Abweichungen bei 329.493 Vergleichen.
 */
import { readFileSync } from "node:fs";

export type Flaeche = {
  /** Schlüssel der Fläche, z. B. die Gemeindenummer. */
  id: string;
  name: string;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  /** Erster Ring ist außen, die übrigen sind Löcher. */
  ringe: Array<Array<[number, number]>>;
};

/** Ein Ring: Strahlentest nach Westen. */
function imRing(x: number, y: number, ring: Array<[number, number]>): boolean {
  let drin = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y) {
      const xk = xi + ((y - yi) * (xj - xi)) / (yj - yi);
      if (x < xk) drin = !drin;
    }
  }
  return drin;
}

export function imPolygon(x: number, y: number, f: Flaeche): boolean {
  if (x < f.minX || x > f.maxX || y < f.minY || y > f.maxY) return false;
  if (!imRing(x, y, f.ringe[0])) return false;
  for (let i = 1; i < f.ringe.length; i++) if (imRing(x, y, f.ringe[i])) return false;
  return true;
}

/** Ein Polygon aus WKB; gibt die Ringe und die Leseposition danach zurück. */
function leseRinge(
  buf: Buffer,
  pos: number,
  little: boolean,
  mitZ: boolean,
): { ringe: Array<Array<[number, number]>>; pos: number } {
  const u32 = (o: number) => (little ? buf.readUInt32LE(o) : buf.readUInt32BE(o));
  const f64 = (o: number) => (little ? buf.readDoubleLE(o) : buf.readDoubleBE(o));
  const anzahl = u32(pos);
  pos += 4;
  const ringe: Array<Array<[number, number]>> = [];
  const dim = mitZ ? 3 : 2;
  for (let r = 0; r < anzahl; r++) {
    const punkte = u32(pos);
    pos += 4;
    const ring: Array<[number, number]> = [];
    for (let p = 0; p < punkte; p++) {
      ring.push([f64(pos), f64(pos + 8)]);
      pos += dim * 8;
    }
    ringe.push(ring);
  }
  return { ringe, pos };
}

function leseKopf(buf: Buffer, pos: number): { little: boolean; basis: number; mitZ: boolean; pos: number } {
  const little = buf[pos] === 1;
  const typ = little ? buf.readUInt32LE(pos + 1) : buf.readUInt32BE(pos + 1);
  // ISO-WKB: Z als +1000 (1006 = MultiPolygonZ). Die OGC-Bitmaske ergaebe hier 238.
  const basis = typ >= 1000 ? typ % 1000 : typ & 0xff;
  const mitZ = typ >= 1000 ? Math.floor(typ / 1000) === 1 || Math.floor(typ / 1000) === 3 : (typ & 0x80000000) !== 0;
  return { little, basis, mitZ, pos: pos + 5 };
}

/** Alle Polygone eines GeoPackage-Geometrie-Feldes. */
export function leseGeometrie(blob: Buffer): Array<Array<Array<[number, number]>>> {
  // GeoPackage-Kopf: 'GP', Version, Flags, SRS (4 Byte), dann der Umschließungsrahmen.
  const flags = blob[3];
  const rahmen = (flags >> 1) & 7;
  const doubles = rahmen === 0 ? 0 : rahmen === 1 ? 4 : rahmen === 4 ? 8 : 6;
  let pos = 8 + doubles * 8;

  const kopf = leseKopf(blob, pos);
  pos = kopf.pos;
  const out: Array<Array<Array<[number, number]>>> = [];
  if (kopf.basis === 3) {
    out.push(leseRinge(blob, pos, kopf.little, kopf.mitZ).ringe);
  } else if (kopf.basis === 6) {
    const anzahl = kopf.little ? blob.readUInt32LE(pos) : blob.readUInt32BE(pos);
    pos += 4;
    for (let i = 0; i < anzahl; i++) {
      const k = leseKopf(blob, pos);
      const r = leseRinge(blob, k.pos, k.little, k.mitZ);
      out.push(r.ringe);
      pos = r.pos;
    }
  } else {
    throw new Error(`GeoPackage: unerwarteter Geometrie-Typ ${kopf.basis}`);
  }
  return out;
}

/**
 * Rasterindex über die Umschließungsrahmen.
 *
 * Ohne ihn wären es 2.235 Teilflächen je Punkt, also bei 337.000 Anlagen
 * 750 Millionen Vergleiche. Mit 5-km-Zellen läuft derselbe Lauf in 64 Sekunden.
 */
export class FlaechenIndex {
  private readonly zellen = new Map<string, number[]>();
  private static readonly KANTE = 5000;

  constructor(private readonly flaechen: Flaeche[]) {
    flaechen.forEach((f, i) => {
      const x0 = Math.floor(f.minX / FlaechenIndex.KANTE);
      const x1 = Math.floor(f.maxX / FlaechenIndex.KANTE);
      const y0 = Math.floor(f.minY / FlaechenIndex.KANTE);
      const y1 = Math.floor(f.maxY / FlaechenIndex.KANTE);
      for (let x = x0; x <= x1; x++) {
        for (let y = y0; y <= y1; y++) {
          const k = `${x}/${y}`;
          const liste = this.zellen.get(k);
          if (liste) liste.push(i);
          else this.zellen.set(k, [i]);
        }
      }
    });
  }

  /** Der Schlüssel der Fläche, die den Punkt enthält — oder null. */
  finde(x: number, y: number): string | null {
    const k = `${Math.floor(x / FlaechenIndex.KANTE)}/${Math.floor(y / FlaechenIndex.KANTE)}`;
    for (const i of this.zellen.get(k) ?? []) {
      if (imPolygon(x, y, this.flaechen[i])) return this.flaechen[i].id;
    }
    return null;
  }
}

/** Liest Flächen aus einer GeoPackage-Datei über `sqlite3` (keine Bindings nötig). */
export function flaechenAusGpkg(
  gpkgPfad: string,
  abfrage: { tabelle: string; idSpalte: string; nameSpalte: string; wo?: string },
): Flaeche[] {
  // Das Geometrie-Feld ist ein BLOB; sqlite3 gibt es als Hex aus, damit die
  // Ausgabe zeilenweise lesbar bleibt.
  const { execFileSync } = require("node:child_process") as typeof import("node:child_process");
  const sql =
    `SELECT ${abfrage.idSpalte}, ${abfrage.nameSpalte}, hex(geom) FROM ${abfrage.tabelle}` +
    (abfrage.wo ? ` WHERE ${abfrage.wo}` : "") +
    ";";
  const roh = execFileSync("sqlite3", ["-separator", "\u0001", gpkgPfad, sql], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 1024,
  });
  const out: Flaeche[] = [];
  for (const zeile of roh.split("\n")) {
    if (!zeile) continue;
    const [id, name, hex] = zeile.split("\u0001");
    if (!hex) continue;
    for (const ringe of leseGeometrie(Buffer.from(hex, "hex"))) {
      const xs = ringe[0].map((p) => p[0]);
      const ys = ringe[0].map((p) => p[1]);
      out.push({
        id,
        name,
        minX: Math.min(...xs),
        maxX: Math.max(...xs),
        minY: Math.min(...ys),
        maxY: Math.max(...ys),
        ringe,
      });
    }
  }
  if (out.length === 0) throw new Error(`GeoPackage ${gpkgPfad}: keine Flächen gelesen`);
  return out;
}

/** Nur als Hinweis, wenn jemand die Datei statt der Abfrage lesen will. */
export function gpkgVorhanden(pfad: string): boolean {
  try {
    return readFileSync(pfad, { encoding: null }).subarray(0, 15).toString("latin1").startsWith("SQLite format");
  } catch {
    return false;
  }
}
