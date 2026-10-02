import { describe, it, expect } from 'vitest';
import { catalogProblems, merchantTimestamp, type CatalogStatus } from '../product-catalog';
const now = Date.parse('2026-10-02T10:00:00Z');
const rows: CatalogStatus[] = [
  {id:'wp', fetched_at:'2026-10-02T06:43:00Z',source_at:'2026-10-01T08:07:42Z',item_count:736},
  {id:'bkw',fetched_at:'2026-10-02T06:43:00Z',source_at:null,item_count:10},
];
describe('catalogue freshness',()=>{
 it('accepts fresh persisted imports without inventing a BKW source timestamp',()=>expect(catalogProblems(rows,now)).toEqual([]));
 it('detects absent schedules even when their last run was successful',()=>expect(catalogProblems(rows,now+37*3600000)).toHaveLength(2));
 it('does not refresh stale merchant data by fetching it again',()=>expect(catalogProblems([{...rows[0],source_at:'2026-09-28T00:00:00Z'},rows[1]],now)[0]).toContain('Händlerdatenstand'));
 it('flags missing and empty catalogues',()=>{expect(catalogProblems([],now)).toHaveLength(2);expect(catalogProblems([{...rows[0],item_count:0},rows[1]],now)).toHaveLength(1);});
 it('rejects invalid or future dates',()=>{expect(()=>merchantTimestamp('unbekannt',now)).toThrow();expect(()=>merchantTimestamp('2027-01-01T00:00:00Z',now)).toThrow();});
 it('checks the merchant date before allowing an import',()=>{expect(()=>merchantTimestamp('2026-09-28 08:00:00',now)).toThrow(/bisheriger Katalog/);expect(merchantTimestamp('2026-10-01 08:07:42',now)).toBe('2026-10-01T06:07:42.000Z');});
});
