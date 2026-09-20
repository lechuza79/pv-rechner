/**
 * ERA5 0.25° grid: `RegularGrid(nx: 1440, ny: 721, latMin: -90, lonMin: -180,
 * dx: 0.25, dy: 0.25)` with the default search radius 1, from
 * `Sources/App/Era5/Era5Domain.swift`. The cell choice itself is shared with
 * every other model in `regular-grid.ts`.
 */
import {
  LAPSE_RATE_PER_M,
  SEA_MARKER,
  gridColumn,
  gridLatitude,
  gridLongitude,
  gridRow,
  selectCell,
  temperatureOffset,
  type GridCell,
  type Orography,
  type RegularGrid,
} from './regular-grid';

export const ERA5_GRID: RegularGrid = { nx: 1440, ny: 721, latMin: -90, lonMin: -180, dx: 0.25, dy: 0.25, searchRadius: 1 };
export const ERA5_NX = ERA5_GRID.nx;
export const ERA5_NY = ERA5_GRID.ny;
export const ERA5_STEP = ERA5_GRID.dx;
export const ERA5_LAT_MIN = ERA5_GRID.latMin;
export const ERA5_LON_MIN = ERA5_GRID.lonMin;
export const ERA5_SEARCH_RADIUS = ERA5_GRID.searchRadius;
export const ERA5_LAPSE_RATE_PER_M = LAPSE_RATE_PER_M;
export const ERA5_SEA_MARKER = SEA_MARKER;

export type Era5Cell = GridCell;
export type Era5Orography = Orography;

/** Row index of a latitude, south to north. Row 0 is the south pole. */
export const era5Row = (latitude: number) => gridRow(ERA5_GRID, latitude);
export const era5Column = (longitude: number) => gridColumn(ERA5_GRID, longitude);
export const era5Latitude = (row: number) => gridLatitude(ERA5_GRID, row);
export const era5Longitude = (column: number) => gridLongitude(ERA5_GRID, column);

export const era5SelectCell = (latitude: number, longitude: number, targetElevation: number, orography: Orography) =>
  selectCell(ERA5_GRID, latitude, longitude, targetElevation, orography);
export const era5TemperatureOffset = temperatureOffset;
