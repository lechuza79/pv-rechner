import { describe, it, expect, vi, beforeEach } from 'vitest';
const state = vi.hoisted(() => ({ rows: [] as any[], requests: [] as any[], writes: [] as any[] }));
vi.mock('../supabase-server', () => ({ supabase: { from: () => {
  const filters: ((r: any) => boolean)[] = []; let from = 0; let to = 499;
  const request = { filters: [] as string[], from, to }; state.requests.push(request);
  const q: any = {
    select: () => q, order: () => q,
    upsert: (rows: any[]) => { state.writes.push(rows); return Promise.resolve({error: null}); },
    range: (a: number, b: number) => { from = a; to = b; request.from = a; request.to = b; return q; },
    eq: (key: string, value: any) => { filters.push(r => r[key] === value); return q; },
    contains: (key: string, values: string[]) => { request.filters.push(key); filters.push(r => values.every(v => r[key]?.includes(v))); return q; },
    overlaps: (key: string, values: string[]) => { request.filters.push(key); filters.push(r => values.some(v => r[key]?.includes(v))); return q; },
    then: (resolve: any) => Promise.resolve({ data: state.rows.filter(r => filters.every(f => f(r))).sort((a,b) => a.kennung.localeCompare(b.kennung)).slice(from, to + 1), error: null }).then(resolve),
  }; return q;
} } }));
import { leseFunde, schreibeFunde, fundeFuerOrt, zaehleFunde, orteImVorrat } from '../social-fundvorrat';
const row = (i: number, extra = {}) => ({ kennung: String(i).padStart(5, '0'), muster: 'anomalie', kategorie: 'g10', satz: 'Fact', staerke: i, werte: [], grundlage: '', stand: 'offen', orte: ['Elsewhere'], laender: [], evergreen: false, ...extra });
beforeEach(() => { state.rows = []; state.requests = []; state.writes = []; });
describe('complete legacy story inventory', () => {
  it('reads beyond server limits and does not hide a smaller pattern behind global strengths', async () => {
    state.rows = Array.from({ length: 1200 }, (_, i) => row(i));
    state.rows.push(row(1200, { muster: 'kontrast', staerke: 0 }));
    expect(await leseFunde({})).toHaveLength(1201);
    const preview = await leseFunde({ grenze: 2 });
    expect(new Set(preview.map(f => f.muster)).size).toBe(2);
    expect(state.requests.every(q => q.to - q.from === 499)).toBe(true);
  });
  it('filters municipalities at the source, preserves every own finding and ranks locality before context', async () => {
    state.rows = Array.from({ length: 1200 }, (_, i) => row(i));
    for (let i = 1200; i < 1255; i++) state.rows.push(row(i, { orte: ['Trier'], staerke: 0 }));
    state.rows.push(row(1255, { orte: ['Neighbour'] }), row(1256, { orte: [], laender: ['Rheinland-Pfalz'] }));
    const found = await fundeFuerOrt({ ort: 'Trier', kreisOrte: ['Neighbour'], land: 'Rheinland-Pfalz' });
    expect(found).toHaveLength(57);
    expect(found.slice(0,55).every(f => f.orte?.includes('Trier'))).toBe(true);
    expect(state.requests.every(q => q.filters.length > 0)).toBe(true);
    expect(await fundeFuerOrt({ ort: 'Trier', grenze: 3 })).toHaveLength(3);
  });
  it('counts and location filters cover the same complete inventory', async () => {
    state.rows = Array.from({ length: 1001 }, (_, i) => row(i));
    state.rows.push(row(1001, { orte: ['Trier'], muster: 'kontrast' }));
    expect((await zaehleFunde()).reduce((n, r) => n + r.zahl, 0)).toBe(1002);
    expect((await orteImVorrat()).kommunen).toContainEqual({ name: 'Trier', zahl: 1 });
  });
});


describe('write identity protection', () => {
  it('rejects conflicting observations before writing any row', async () => {
    const first = row(1) as any;
    await expect(schreibeFunde([first, {...first, staerke: 999, werte: [{name: 'Other metric', wert: 20, einheit: 'kWp'}]}], '2026-09-14')).rejects.toThrow('Conflicting story identities');
    expect(state.writes).toHaveLength(0);
  });
  it('deduplicates genuinely identical findings and preserves editorial fields', async () => {
    const first = row(1) as any;
    expect(await schreibeFunde([first, {...first}], '2026-09-14')).toBe(1);
    expect(state.writes[0]).toHaveLength(1);
    expect(state.writes[0][0]).not.toHaveProperty('stand');
    expect(state.writes[0][0]).not.toHaveProperty('notiz');
  });
});
