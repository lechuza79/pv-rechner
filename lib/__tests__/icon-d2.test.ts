import { describe, expect, it } from 'vitest';
import { ICON_D2_GRID, ICON_D2_VARIABLE_NAMES, ICON_D2_VARIABLES, modelWeatherAt, type IconD2Shard } from '../icon-d2';
import { gridColumn, gridLatitude, gridRow } from '../regular-grid';

/** One postcode, six hours, every variable constant except where a test sets it. */
function shard(set: Partial<Record<string, number[]>> = {}): IconD2Shard {
  const hours = 6;
  return {
    version: 1, model: 'dwd_icon_d2', runInit: '2026-09-18T03:00:00.000Z', generatedAt: '2026-09-18T05:20:00.000Z',
    firstHour: '2026-09-18T04:00:00.000Z', hours, variables: ICON_D2_VARIABLE_NAMES, scale: { ...ICON_D2_VARIABLES },
    points: {
      '10115': {
        cell: [52.52, 13.38], elevation: 46,
        values: ICON_D2_VARIABLE_NAMES.map((v) => (set[v] ?? Array(hours).fill(0)).map((x) => Math.round(x * ICON_D2_VARIABLES[v]))),
      },
    },
  };
}

describe('Wettermodell für jetzt', () => {
  it('interpoliert stetige Größen zwischen den Stunden', () => {
    const s = shard({ cloud_cover: [0, 20, 60, 60, 60, 60], temperature_2m: [10, 12, 14, 14, 14, 14] });
    const w = modelWeatherAt(s, '10115', new Date('2026-09-18T05:30:00Z'))!;
    expect(w.cloudCover).toBeCloseTo(40, 6);
    expect(w.temperature).toBeCloseTo(13, 6);
  });

  it('nimmt Stundensummen aus der Stunde, die gerade läuft', () => {
    // "average/sum of the preceding hour": the value stamped 06:00 covers 05:00–06:00.
    const s = shard({ precipitation: [0, 0, 1.5, 0, 0, 0] });
    expect(modelWeatherAt(s, '10115', new Date('2026-09-18T05:30:00Z'))!.precipitation).toBeCloseTo(1.5, 6);
    expect(modelWeatherAt(s, '10115', new Date('2026-09-18T06:30:00Z'))!.precipitation).toBeCloseTo(0, 6);
  });

  it('gibt die Windrichtung als Herkunft an', () => {
    // Air moving towards the east (u > 0) comes FROM the west: 270°.
    const s = shard({ wind_u_component_10m: Array(6).fill(3), wind_v_component_10m: Array(6).fill(0) });
    const w = modelWeatherAt(s, '10115', new Date('2026-09-18T05:00:00Z'))!;
    expect(w.windDirection).toBeCloseTo(270, 6);
    expect(w.windSpeed).toBeCloseTo(3, 6);
  });

  it('antwortet außerhalb des Schnappschusses nicht mit einem alten Himmel', () => {
    expect(modelWeatherAt(shard(), '10115', new Date('2026-09-18T11:00:00Z'))).toBeNull();
    expect(modelWeatherAt(shard(), '10115', new Date('2026-09-18T03:00:00Z'))).toBeNull();
    expect(modelWeatherAt(shard(), '99999', new Date('2026-09-18T05:00:00Z'))).toBeNull();
  });
});

describe('Rasterzelle wie beim Anbieter', () => {
  it('rechnet in einfacher Genauigkeit', () => {
    // 52.53°N is row 467.4999… in single precision and 467.5 in double; the
    // hosted API answered 52.52 for postcode 10115 (measured 18.09.2026).
    expect(gridRow(ICON_D2_GRID, 52.53)).toBe(467);
    expect(gridLatitude(ICON_D2_GRID, gridRow(ICON_D2_GRID, 52.53))).toBeCloseTo(52.52, 4);
    expect(gridColumn(ICON_D2_GRID, 13.38)).toBe(866);
  });
});
