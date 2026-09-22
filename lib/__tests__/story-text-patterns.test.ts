import {it,expect} from 'vitest';
import {renderStoryText,DEFAULT_STORY_TEXT} from '../story-text-patterns';
import {formatStoryValue} from '../story-format';
import {conceptFromFinding} from '../story-finding-concept';
import {buildStoryPool} from '../story-pool';
import reports from '../story-discovery-reports.json';
import type {DiscoveryReport} from '../story-discovery';
it('reuses the same pattern with current numbers for different municipalities',()=>{
 const template='{ort}: {titel}\n{werte}\n{vergleich}\n{einordnung}\n{quelle}';
 for(const report of reports as DiscoveryReport[]){const c=conceptFromFinding(report,buildStoryPool(report).topics[0]);const text=renderStoryText(c,template);expect(text).toContain(report.name);for(const value of c.values)expect(text).toContain(formatStoryValue(value.value));}
});
it('rejects unknown placeholders rather than publishing a broken template',()=>{
 const report=reports[0] as DiscoveryReport;const c=conceptFromFinding(report,buildStoryPool(report).topics[0]);expect(()=>renderStoryText(c,DEFAULT_STORY_TEXT+'{unknown}')).toThrow();
 expect(formatStoryValue(150.325)).toBe('150,33');
});
