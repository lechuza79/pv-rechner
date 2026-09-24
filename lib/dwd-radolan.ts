/**
 * Reading a RADOLAN composite from the German weather service (DWD).
 *
 * Only what the live weather needs: the 900x900 national composites (RY, 5-minute
 * precipitation), in both earth models DWD has used. Everything here is checked
 * against the format description, "RADOLAN/RADVOR – Beschreibung des
 * Kompositformats", Version 2.5.8 of 10.01.2024 (§ 1.1 header, § 1.2 binary
 * data, § 1.3 georeferencing), read in full on 18.09.2026.
 *
 * Unknown format versions are refused rather than guessed. DWD moved the grid
 * origin along with the earth model, so reading a file with the wrong model is
 * off by up to two pixels (2 km, measured across Germany on 18.09.2026) — and a
 * projection paired with the other model's origin by 13 km. Either way the rain
 * lands next door while the picture still looks entirely plausible.
 */

export type RadolanGrid = {
  product: string;
  /** Measurement time, UTC. */
  time: Date;
  /** Header key VS; 3/4 = spherical earth, 5 = WGS84. */
  formatVersion: number;
  /** Header key PR: multiply raw values by this to get the physical unit. */
  precision: number;
  /** Header key INT, minutes the value accumulates over. */
  intervalMinutes: number;
  rows: number;
  columns: number;
  /** Raw 16-bit words, starting bottom left (south-west), row by row. */
  words: Uint16Array;
};

/** Bit 14 of a word: no data for this pixel (§ 1.2). */
const NO_DATA = 0x2000;
/** Bit 16: clutter mark (§ 1.2). */
const CLUTTER = 0x8000;
/** Bits 1–12 carry the value (§ 1.2). */
const VALUE_MASK = 0x0fff;

function field(header: string, key: string, pattern: RegExp) {
  const at = header.indexOf(key);
  if (at < 0) return null;
  const match = header.slice(at + key.length).match(pattern);
  return match ? match[1] : null;
}

export function parseRadolan(buffer: Uint8Array): RadolanGrid {
  const end = buffer.indexOf(0x03);
  if (end < 0) throw new Error('RADOLAN: Kopfzeile ohne Endekennung.');
  const header = new TextDecoder('latin1').decode(buffer.subarray(0, end));
  const product = header.slice(0, 2);
  // Positions 2–7 ddhhmm, 8–12 WMO number, 13–16 MMYY (§ 1.1, table "Format").
  const day = Number(header.slice(2, 4));
  const hour = Number(header.slice(4, 6));
  const minute = Number(header.slice(6, 8));
  const month = Number(header.slice(13, 15));
  const year = 2000 + Number(header.slice(15, 17));
  if (![day, hour, minute, month, year].every(Number.isFinite) || month < 1 || month > 12) {
    throw new Error('RADOLAN: Zeitstempel im Kopf nicht lesbar.');
  }
  const formatVersion = Number(field(header, 'VS', /^\s*(\d+)/));
  const precisionExp = field(header, 'PR', /^\s*E-(\d{2})/);
  const intervalMinutes = Number(field(header, 'INT', /^\s*(\d+)/));
  const sizeMatch = header.includes('GP') ? header.slice(header.indexOf('GP') + 2).match(/^\s*(\d+)\s*x\s*(\d+)/) : null;
  if (!sizeMatch) throw new Error('RADOLAN: Rastergröße fehlt.');
  const rows = Number(sizeMatch[1]);
  const columns = Number(sizeMatch[2]);
  if (precisionExp === null) throw new Error('RADOLAN: Genauigkeit fehlt.');
  if (!Number.isFinite(intervalMinutes) || intervalMinutes <= 0) throw new Error('RADOLAN: Intervall fehlt.');

  const data = buffer.subarray(end + 1);
  if (data.byteLength !== rows * columns * 2) {
    throw new Error(`RADOLAN: ${data.byteLength} Byte Daten statt ${rows * columns * 2}.`);
  }
  // Little endian, copied so the view is aligned regardless of the header length.
  const words = new Uint16Array(rows * columns);
  for (let index = 0; index < words.length; index++) {
    words[index] = data[index * 2] | (data[index * 2 + 1] << 8);
  }
  return {
    product,
    time: new Date(Date.UTC(year, month - 1, day, hour, minute)),
    formatVersion,
    precision: 10 ** -Number(precisionExp),
    intervalMinutes,
    rows,
    columns,
    words,
  };
}

/* ---------- Georeferencing, § 1.3 ---------- */

const LAT_TS = (60 * Math.PI) / 180;
const LON_0 = (10 * Math.PI) / 180;

/** Spherical model, § 1.3.1: R = 6370.04 km, result in km. */
function sphere(latitude: number, longitude: number) {
  const phi = (latitude * Math.PI) / 180;
  const lambda = (longitude * Math.PI) / 180;
  const scale = (1 + Math.sin(LAT_TS)) / (1 + Math.sin(phi));
  const radius = 6370.04;
  return {
    x: radius * scale * Math.cos(phi) * Math.sin(lambda - LON_0),
    y: -radius * scale * Math.cos(phi) * Math.cos(lambda - LON_0),
  };
}

/** WGS84 ellipsoid, polar stereographic with true scale at 60°N, result in km. */
function wgs84(latitude: number, longitude: number) {
  const a = 6378137;
  const b = 6356752.3142451802;
  const e = Math.sqrt(1 - (b / a) ** 2);
  const t = (phi: number) =>
    Math.tan(Math.PI / 4 - phi / 2) / ((1 - e * Math.sin(phi)) / (1 + e * Math.sin(phi))) ** (e / 2);
  const mc = Math.cos(LAT_TS) / Math.sqrt(1 - e * e * Math.sin(LAT_TS) ** 2);
  const phi = (latitude * Math.PI) / 180;
  const lambda = (longitude * Math.PI) / 180;
  const rho = (a * mc * t(phi)) / t(LAT_TS);
  return { x: (rho * Math.sin(lambda - LON_0)) / 1000, y: (-rho * Math.cos(lambda - LON_0)) / 1000 };
}

/**
 * Lower-left outer corner of the 900x900 national grid, in km.
 *
 * Sphere: from the corner table in § 1.3.1. WGS84: projected from the corner
 * coordinates in § 1.3.2 — the four corners then form an exact 900 km square,
 * which is the check that this is the right projection (measured 18.09.2026).
 */
const ORIGIN = {
  sphere: { x: -523.4622, y: -4658.645 },
  wgs84: { x: -523.6968, y: -4672.0889 },
};

/**
 * Pixel under a coordinate, or null outside the grid.
 *
 * Row 0 is the southern edge (§ 1.2: the data block begins bottom left), and a
 * pixel covers one kilometre from its lower-left corner.
 */
export function radolanCell(grid: Pick<RadolanGrid, 'formatVersion' | 'rows' | 'columns'>, latitude: number, longitude: number) {
  if (grid.rows !== 900 || grid.columns !== 900) {
    throw new Error(`RADOLAN: Raster ${grid.rows}x${grid.columns} wird nicht unterstützt.`);
  }
  let point: { x: number; y: number };
  let origin: { x: number; y: number };
  if (grid.formatVersion === 3 || grid.formatVersion === 4) {
    point = sphere(latitude, longitude);
    origin = ORIGIN.sphere;
  } else if (grid.formatVersion === 5) {
    point = wgs84(latitude, longitude);
    origin = ORIGIN.wgs84;
  } else {
    throw new Error(`RADOLAN: Formatversion ${grid.formatVersion} unbekannt; Georeferenz nicht gesichert.`);
  }
  const column = Math.floor(point.x - origin.x);
  const row = Math.floor(point.y - origin.y);
  if (row < 0 || row >= grid.rows || column < 0 || column >= grid.columns) return null;
  return { row, column };
}

/**
 * Value at a coordinate in the product's own unit (for RY: mm per 5 minutes).
 *
 * `null` means the radar did not see this place — no data or clutter — which is
 * something other than "dry". Treating it as zero would draw a dry sky over a
 * place the radar simply could not look at.
 */
export function radolanValueAt(grid: RadolanGrid, latitude: number, longitude: number) {
  const cell = radolanCell(grid, latitude, longitude);
  if (!cell) return null;
  const word = grid.words[cell.row * grid.columns + cell.column];
  if (word & NO_DATA || word & CLUTTER) return null;
  return (word & VALUE_MASK) * grid.precision;
}

/** RY rate in mm/h: the 5-minute amount times twelve (RV format description, § 2.2). */
export function precipitationRatePerHour(grid: RadolanGrid, amount: number) {
  return (amount * 60) / grid.intervalMinutes;
}
