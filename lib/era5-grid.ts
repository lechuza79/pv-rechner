/**
 * ERA5 0.25° grid geometry and the grid-cell choice used by the Open-Meteo archive.
 *
 * Both are reimplemented from the published Open-Meteo sources so that our own
 * archive reads land on the same cell the hosted API would have used:
 * `Sources/App/Era5/Era5Domain.swift` defines the grid as
 * `RegularGrid(nx: 1440, ny: 721, latMin: -90, lonMin: -180, dx: 0.25, dy: 0.25)`
 * with the default `searchRadius: 1`, and `Sources/App/Domains/Gridable.swift`
 * holds `findPointTerrainOptimised`. Read in full on 17.09.2026.
 *
 * Keeping the choice identical is not cosmetic: a plain nearest-cell lookup puts
 * coastal municipalities on a sea cell. Measured against 1,723 cached API
 * answers, nearest-cell alone reproduces 97.45 % of them, this port 100 %.
 */
export const ERA5_NX = 1440;
export const ERA5_NY = 721;
export const ERA5_STEP = 0.25;
export const ERA5_LAT_MIN = -90;
export const ERA5_LON_MIN = -180;
/** `searchRadius: 1` in the Swift source, i.e. the 3x3 block around the centre. */
export const ERA5_SEARCH_RADIUS = 1;
/** "correct temperature by 0.65° per 100 m elevation" (GenericReader.swift). */
export const ERA5_LAPSE_RATE_PER_M = 0.0065;
/** Cells below this marker carry no land height; the Swift code treats them as sea. */
export const ERA5_SEA_MARKER = -999;

/** Row index of a latitude, south to north. Row 0 is the south pole. */
export function era5Row(latitude: number) {
  return Math.round((latitude - ERA5_LAT_MIN) / ERA5_STEP);
}
/** Column index of a longitude, starting at 180° west. */
export function era5Column(longitude: number) {
  return Math.round((longitude - ERA5_LON_MIN) / ERA5_STEP);
}
export function era5Latitude(row: number) {
  return ERA5_LAT_MIN + row * ERA5_STEP;
}
export function era5Longitude(column: number) {
  return ERA5_LON_MIN + column * ERA5_STEP;
}

export type Era5Cell = {
  row: number;
  column: number;
  latitude: number;
  longitude: number;
  /** Model surface height of the chosen cell, or null where it carries none. */
  modelElevation: number | null;
  /** True for a sea cell, which is a known height (zero), not a missing one. */
  isSea: boolean;
};

/**
 * Surface height of one grid cell, with sea marked as -999.
 *
 * A lookup instead of a whole grid: Germany needs 1,435 of the 1,038,240 cells,
 * and passing the accessor keeps the choice testable without a data file.
 */
export type Era5Orography = (row: number, column: number) => number;

/**
 * Pick the grid cell the Open-Meteo API would use for this place.
 *
 * `targetElevation` is the height of the place itself, not of the cell. The
 * search first accepts the nearest cell when the two are within 100 m of each
 * other, which is why only a small minority of places ever leave their nearest
 * cell. Otherwise it walks the 3x3 block, charging 30 m of height penalty per
 * kilometre of distance, and falls back to the centre when nothing fits.
 */
export function era5SelectCell(
  latitude: number,
  longitude: number,
  targetElevation: number,
  orography: Era5Orography,
): Era5Cell {
  const centreRow = clamp(era5Row(latitude), 0, ERA5_NY - 1);
  const centreColumn = clamp(era5Column(longitude), 0, ERA5_NX - 1);
  const rowFrom = Math.max(0, centreRow - ERA5_SEARCH_RADIUS);
  const rowTo = Math.min(ERA5_NY, centreRow + ERA5_SEARCH_RADIUS + 1);
  const columnFrom = Math.max(0, centreColumn - ERA5_SEARCH_RADIUS);
  const columnTo = Math.min(ERA5_NX, centreColumn + ERA5_SEARCH_RADIUS + 1);
  const width = columnTo - columnFrom;

  const block: number[] = [];
  for (let row = rowFrom; row < rowTo; row++) {
    for (let column = columnFrom; column < columnTo; column++) {
      block.push(orography(row, column));
    }
  }
  const centreElevation = block[Math.floor(block.length / 2)];
  const centreDelta = Math.abs(centreElevation - targetElevation);
  if (centreDelta <= 100) return cell(centreRow, centreColumn, centreElevation);

  let bestDelta = centreDelta;
  let bestRow = centreRow;
  let bestColumn = centreColumn;
  let bestElevation = Number.NaN;
  for (let index = 0; index < block.length; index++) {
    const elevation = block[index];
    if (Number.isNaN(elevation) || elevation <= ERA5_SEA_MARKER) continue;
    const row = rowFrom + Math.floor(index / width);
    const column = columnFrom + (index % width);
    const distanceSquared =
      (era5Latitude(row) - latitude) ** 2 + (era5Longitude(column) - longitude) ** 2;
    const distanceKm = Math.sqrt(distanceSquared) * 111;
    // Satellite products mark land without a height as 9999; take it at face value.
    const heightDelta = elevation >= 9999 ? 0 : Math.abs(elevation - targetElevation);
    const delta = heightDelta + distanceKm * 30;
    if (delta < bestDelta && distanceKm < 50) {
      bestDelta = delta;
      bestRow = row;
      bestColumn = column;
      bestElevation = elevation;
    }
  }
  if (Number.isNaN(bestElevation) || bestDelta > 1500) {
    return cell(centreRow, centreColumn, centreElevation);
  }
  return cell(bestRow, bestColumn, bestElevation);
}

/**
 * Height correction applied to temperature, in kelvin.
 *
 * Positive where the place sits below its cell. Radiation and wind are left
 * untouched: measured across cached API answers, two places in one cell differ
 * only in temperature, never in radiation or wind.
 *
 * A sea cell counts as sea level, not as "no height". The Swift source maps
 * `ElevationOrSea.sea` to a numeric 0, and skipping the correction instead put
 * the North Frisian islands out by 0.2 K for every hour of the year — a small
 * number that no reader could have spotted, on exactly the places a coastal
 * comparison is supposed to cover.
 */
export function era5TemperatureOffset(cell: Era5Cell, targetElevation: number) {
  if (!Number.isFinite(targetElevation)) return 0;
  const modelElevation = cell.modelElevation ?? (cell.isSea ? 0 : Number.NaN);
  if (!Number.isFinite(modelElevation)) return 0;
  return (modelElevation - targetElevation) * ERA5_LAPSE_RATE_PER_M;
}

function cell(row: number, column: number, elevation: number): Era5Cell {
  const sea = elevation <= ERA5_SEA_MARKER && !Number.isNaN(elevation);
  return {
    row,
    column,
    latitude: era5Latitude(row),
    longitude: era5Longitude(column),
    modelElevation: sea || Number.isNaN(elevation) ? null : elevation,
    isSea: sea,
  };
}
function clamp(value: number, low: number, high: number) {
  return Math.min(high, Math.max(low, value));
}
