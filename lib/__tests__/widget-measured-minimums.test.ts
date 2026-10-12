import {describe, expect, it} from 'vitest';
import {resolveComposition, withMeasuredMinimumHeights, type CompositionItem} from '../widget-composition';

describe('measured widget content minima', () => {
  const chart = (id: string): CompositionItem => ({id, kind: 'chart', minWidth: 320, minHeight: 560, sizing: 'allocated'});
  const group: CompositionItem = {id: 'group', kind: 'group', direction: 'column', children: [
    {id: 'nested', kind: 'group', direction: 'column', children: [chart('long-copy')]}, chart('sibling'),
  ]};

  it('grows every enclosing group and moves later siblings below wrapped content', () => {
    const allocation = resolveComposition(withMeasuredMinimumHeights(group, {'long-copy': 735}), 351, 1000);
    expect(allocation.height).toBe(735 + 24 + 560);
    expect(allocation.children![0].height).toBe(735);
    expect(allocation.children![0].children![0].height).toBe(735);
    expect(allocation.children![1].height).toBe(560);
    expect(resolveComposition(group, 351, 1000).height).toBe(560 * 2 + 24);
  });

  it('returns to the registered allocation when a wide layout releases its extra minimum', () => {
    const allocation = resolveComposition(withMeasuredMinimumHeights(group, {'long-copy': 0}), 1200, 1000);
    expect(allocation.children![0].height).toBe(560);
  });
});
