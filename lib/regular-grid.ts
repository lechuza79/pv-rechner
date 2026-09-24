/**
 * Regular latitude/longitude grids and the grid-cell choice of the Open-Meteo API.
 *
 * One implementation for every model we read from the open archive (ERA5 for
 * the monthly charts, DWD ICON-D2 for live weather), because the hosted API
 * uses one: `RegularGrid` and `findPointTerrainOptimised` in
 * `Sources/App/Domains/RegularGrid.swift` and `Gridable.swift`, read 17.09.2026.
 * Measured for ERA5: this reproduces the provider's cell for 1,723 of 1,723
 * cached answers, where nearest-cell alone manages 97.45 %.
 */
export type RegularGrid = {
  nx: number;
  ny: number;
  latMin: number;
  lonMin: number;
  dx: number;
  dy: number;
  /** `searchRadius` in the Swift source; 1 means the 3x3 block around the centre. */
  searchRadius: number;
};

/** "correct temperature by 0.65° per 100 m elevation" (GenericReader.swift). */
export const LAPSE_RATE_PER_M = 0.0065;
/** Cells at or below this carry no land height; the Swift code treats them as sea. */
export const SEA_MARKER = -999;

/** Height of one grid cell, sea marked with -999. */
export type Orography = (row: number, column: number) => number;

export type GridCell = {
  row: number;
  column: number;
  latitude: number;
  longitude: number;
  /** Model surface height, or null where the cell carries none. */
  modelElevation: number | null;
  /** A sea cell is a known height (zero), not a missing one. */
  isSea: boolean;
};

/**
 * The Swift source computes in single precision (`Float`), and that decides
 * cells: Berlin's postcode 10115 lies at 52.53°N, which on the 0.02° grid is
 * row 467.4999… in single precision and 467.5 in double — one cell apart.
 * Measured against the hosted API on 18.09.2026. Every step is therefore
 * rounded to single precision exactly where the Swift code would be.
 */
const f = Math.fround;
/** `roundf`: halves away from zero, unlike Math.round for negatives. */
const roundf = (value: number) => (value < 0 ? -Math.round(-value) : Math.round(value));

export const gridRow = (grid: RegularGrid, latitude: number) => roundf(f(f(f(latitude) - f(grid.latMin)) / f(grid.dy)));
export const gridColumn = (grid: RegularGrid, longitude: number) => roundf(f(f(f(longitude) - f(grid.lonMin)) / f(grid.dx)));
export const gridLatitude = (grid: RegularGrid, row: number) => f(f(grid.latMin) + f(f(row) * f(grid.dy)));
export const gridLongitude = (grid: RegularGrid, column: number) => f(f(grid.lonMin) + f(f(column) * f(grid.dx)));

/**
 * The cell the hosted API would use for this place.
 *
 * `targetElevation` is the height of the place itself. The nearest cell is kept
 * when its model height is within 100 m of it; otherwise the search block is
 * walked with 30 m of height penalty per kilometre, falling back to the centre.
 */
export function selectCell(grid: RegularGrid, latitude: number, longitude: number, targetElevation: number, orography: Orography): GridCell {
  const centreRow = clamp(gridRow(grid, latitude), 0, grid.ny - 1);
  const centreColumn = clamp(gridColumn(grid, longitude), 0, grid.nx - 1);
  const rowFrom = Math.max(0, centreRow - grid.searchRadius);
  const rowTo = Math.min(grid.ny, centreRow + grid.searchRadius + 1);
  const columnFrom = Math.max(0, centreColumn - grid.searchRadius);
  const columnTo = Math.min(grid.nx, centreColumn + grid.searchRadius + 1);
  const width = columnTo - columnFrom;

  const block: number[] = [];
  for (let row = rowFrom; row < rowTo; row++) {
    for (let column = columnFrom; column < columnTo; column++) block.push(orography(row, column));
  }
  const centreElevation = block[Math.floor(block.length / 2)];
  const centreDelta = f(Math.abs(f(centreElevation - f(targetElevation))));
  if (centreDelta <= 100) return cell(grid, centreRow, centreColumn, centreElevation);

  let bestDelta = centreDelta;
  let bestRow = centreRow;
  let bestColumn = centreColumn;
  let bestElevation = Number.NaN;
  for (let index = 0; index < block.length; index++) {
    const elevation = block[index];
    if (Number.isNaN(elevation) || elevation <= SEA_MARKER) continue;
    const row = rowFrom + Math.floor(index / width);
    const column = columnFrom + (index % width);
    const dLat = f(gridLatitude(grid, row) - f(latitude));
    const dLon = f(gridLongitude(grid, column) - f(longitude));
    const distanceKm = f(f(Math.sqrt(f(f(dLat * dLat) + f(dLon * dLon)))) * 111);
    // Satellite products mark land without a height as 9999; take it at face value.
    const delta = f((elevation >= 9999 ? 0 : f(Math.abs(f(elevation - f(targetElevation))))) + f(distanceKm * 30));
    if (delta < bestDelta && distanceKm < 50) {
      bestDelta = delta;
      bestRow = row;
      bestColumn = column;
      bestElevation = elevation;
    }
  }
  if (Number.isNaN(bestElevation) || bestDelta > 1500) return cell(grid, centreRow, centreColumn, centreElevation);
  return cell(grid, bestRow, bestColumn, bestElevation);
}

/**
 * Height correction for temperature, in kelvin; positive where the place sits
 * below its cell. A sea cell counts as sea level: the Swift source maps
 * `ElevationOrSea.sea` to 0, and skipping it put the North Frisian islands 0.2 K
 * off for every hour of the year. Radiation and wind are never corrected.
 */
export function temperatureOffset(cell: GridCell, targetElevation: number) {
  if (!Number.isFinite(targetElevation)) return 0;
  const modelElevation = cell.modelElevation ?? (cell.isSea ? 0 : Number.NaN);
  if (!Number.isFinite(modelElevation)) return 0;
  return (modelElevation - targetElevation) * LAPSE_RATE_PER_M;
}

function cell(grid: RegularGrid, row: number, column: number, elevation: number): GridCell {
  const sea = elevation <= SEA_MARKER && !Number.isNaN(elevation);
  return {
    row,
    column,
    latitude: gridLatitude(grid, row),
    longitude: gridLongitude(grid, column),
    modelElevation: sea || Number.isNaN(elevation) ? null : elevation,
    isSea: sea,
  };
}
function clamp(value: number, low: number, high: number) {
  return Math.min(high, Math.max(low, value));
}
