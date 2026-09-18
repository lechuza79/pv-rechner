import { readdirSync, readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * A page must never reach for weather while it renders.
 *
 * The prepared figures are written by a local run and read from a file; the
 * modules that talk to the archive, or that read the block store from disk,
 * have no business in a request. On the server they would find no blocks, and
 * the failure would show up as a broken page rather than as a missing download.
 *
 * This is also a LICENCE boundary, not only a performance one. The archive
 * reader `@openmeteo/file-reader` is GPL-2.0-only (checked in its own package
 * on 17.09.2026). As a build tool it stays between us and our machines and the
 * GPL asks nothing of us — v2 has no network clause. The moment it reaches the
 * shipped bundle, the WebAssembly goes out to every visitor, that is
 * distribution, and the licence reaches into whatever it is linked with. It
 * therefore lives in devDependencies and is named below.
 */
const FORBIDDEN = [
  'era5-archive',
  'era5-store',
  'era5-weather',
  'era5-grid',
  'story-weather-provider',
  '@openmeteo/file-reader',
];
/** The committed grid heights are plain data and may be read anywhere. */
const ALLOWED = ['era5-orography'];

function walk(directory: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(directory)) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue;
    const path = directory + '/' + entry;
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else if (/\.(ts|tsx)$/.test(entry)) out.push(path);
  }
  return out;
}

describe('Kein Wetterabruf beim Seitenaufruf', () => {
  it('bindet keine Archiv-Bausteine in Seiten oder Komponenten ein', () => {
    const files = [...walk('app'), ...walk('components')];
    expect(files.length).toBeGreaterThan(50);
    const offenders: string[] = [];
    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      for (const name of FORBIDDEN) {
        const matches = source.match(new RegExp(`from ['"]([^'"]*${name})['"]`, 'g')) ?? [];
        for (const match of matches) {
          if (ALLOWED.some((allowed) => match.includes(allowed))) continue;
          offenders.push(`${file} → ${match}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('greift im Lesepfad selbst nicht aufs Netz', () => {
    // era5-weather assembles from local blocks only. A fetch in here would turn
    // every prepared figure into a live request the moment someone reuses it.
    const source = readFileSync('lib/era5-weather.ts', 'utf8');
    expect(source).not.toMatch(/\bfetch\s*\(/);
    expect(source).not.toMatch(/OmHttpBackend/);
  });
});
