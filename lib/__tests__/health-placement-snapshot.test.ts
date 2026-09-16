import { expect, it } from 'vitest';
import { placementSnapshotProblems, type PlacementSnapshot } from '../health-placement-snapshot';
const now = new Date('2026-09-16T12:00:00Z');
const good: PlacementSnapshot = {activeRuns:1,metadataRows:1,actual:10742,expected:10742,publishedCount:10742,renewedAt:'2026-09-16T10:00:00Z',sourceAt:'2026-09-09T00:00:00Z'};
it('accepts only a complete, fresh published generation', () => {
  expect(placementSnapshotProblems(good,now)).toEqual([]);
  for (const mutation of [{activeRuns:0},{metadataRows:0},{actual:10741},{expected:0},{publishedCount:10740},{renewedAt:null},{renewedAt:'2026-08-01T00:00:00Z'},{sourceAt:'2026-09-16T11:00:00Z'}]) expect(placementSnapshotProblems({...good,...mutation},now).length).toBeGreaterThan(0);
});

import { readCoherentPlacementSnapshot } from '../health-placement-snapshot';
it('retries a generation switch instead of comparing old metadata with new counts', async () => {
  const ids = ['old','new','new','new'];
  const snapshot = await readCoherentPlacementSnapshot({
    active: async()=>[{lauf_id:ids.shift()!}],
    metadata: async id=>[{orte:id==='old'?10:11,erneuert_am:good.renewedAt!}],
    actual:async()=>11,expected:async()=>11,
  },good.sourceAt);
  expect(snapshot.publishedCount).toBe(11);
  expect(placementSnapshotProblems(snapshot,now)).toEqual([]);
});
it('keeps rapidly changing generations unknown instead of asserting a broken snapshot',async()=>{
  let id=0;
  await expect(readCoherentPlacementSnapshot({active:async()=>[{lauf_id:String(++id)}],metadata:async()=>[],actual:async()=>1,expected:async()=>1},null)).rejects.toThrow('changed');
});
