/**
 * Model surface heights of the German ERA5 window, as a lookup.
 *
 * Committed rather than fetched, because the choice of grid cell must be
 * reproducible without network access — tests, reviews and a rebuild years from
 * now all need the same answer. A cell outside the window throws instead of
 * quietly answering "sea", which would put a place on the wrong cell.
 */
import data from './era5-orography-de.json';
import { ERA5_SEA_MARKER, type Era5Orography } from './era5-grid';

export const ERA5_OROGRAPHY_SOURCE = data.sourceUrl;
export const ERA5_OROGRAPHY_RETRIEVED_AT = data.retrievedAt;

export const era5Orography: Era5Orography = (row, column) => {
  const r = row - data.rowFrom;
  const c = column - data.columnFrom;
  if (r < 0 || r >= data.rows || c < 0 || c >= data.columns) {
    throw new Error(`Rasterzelle ${row}/${column} liegt außerhalb des deutschen Ausschnitts.`);
  }
  return data.heights[r * data.columns + c];
};

/** True where the model has no land height for this cell. */
export const era5IsSea = (row: number, column: number) => era5Orography(row, column) <= ERA5_SEA_MARKER;
