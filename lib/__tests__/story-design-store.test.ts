import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { readStoryDesignSnapshot, writeStoryDesignSnapshot, type StoryDesignSnapshot } from '../story-design-store';
let directory: string;
const draft = (): StoryDesignSnapshot => ({ schemaVersion: 1, sourceReportReference: 'report:07211000:2026-09-10:inputhash', sourceDate: '2026-09-10', scheme: 'light', concept: {
  id: 'solar-count-2025', label: 'Zubau', town: 'Trier', kind: 'bars', title: 'Neue Anlagen', teaser: 'Ein Vergleich', period: '2025', evidence: 'Register', values: [{label: '2025', value: 12, unit: 'Anlagen'}], unit: 'Anlagen', copy: [{heading: 'Zubau', text: '12 Anlagen'}], social: '12 Anlagen', widget: '', widgetCta: '', seo: '', beforeRelease: '',
} });
beforeEach(async () => { directory = await mkdtemp(path.join(tmpdir(), 'story-design-')); });
afterEach(async () => { await rm(directory, { recursive: true, force: true }); });
describe('immutable local story drafts', () => {
  it('is idempotent across key order and concurrent retries', async () => {
    const input = draft();
    const reverse = Object.fromEntries(Object.entries(input).reverse()) as StoryDesignSnapshot;
    const versions = await Promise.all([input, reverse, input].map(s => writeStoryDesignSnapshot(s, directory)));
    expect(new Set(versions.map(v => v.id)).size).toBe(1);
    expect(await readdir(directory)).toEqual([`${versions[0].id}.json`]);
    expect(await readStoryDesignSnapshot(versions[0].id, directory)).toEqual(input);
  });
  it('retains old text and values when edits and later source reports produce new versions', async () => {
    const input = draft(); const first = await writeStoryDesignSnapshot(input, directory);
    input.concept.title = 'Edited title';
    const second = await writeStoryDesignSnapshot(input, directory);
    input.concept.values[0].value = 20; input.sourceReportReference = 'next-report';
    const third = await writeStoryDesignSnapshot(input, directory);
    expect(new Set([first.id, second.id, third.id]).size).toBe(3);
    expect((await readStoryDesignSnapshot(first.id, directory))?.concept.values[0].value).toBe(12);
    expect((await readStoryDesignSnapshot(first.id, directory))?.concept.title).toBe('Neue Anlagen');
  });
  it('versions scheme and family template changes as part of the same frozen draft', async () => {
    const input = draft(); const first = await writeStoryDesignSnapshot(input, directory);
    input.scheme = 'highlight';
    const second = await writeStoryDesignSnapshot(input, directory);
    input.familyTemplate = { id: 'zubau', version: 2, text: '{value} neue Anlagen' };
    const third = await writeStoryDesignSnapshot(input, directory);
    expect(new Set([first.id, second.id, third.id]).size).toBe(3);
    expect((await readStoryDesignSnapshot(first.id, directory))?.scheme).toBe('light');
  });
  it('detects tampering and never replaces the existing file on a retry', async () => {
    const input = draft(); const first = await writeStoryDesignSnapshot(input, directory);
    const filename = path.join(directory, `${first.id}.json`);
    await writeFile(filename, '{}');
    await expect(readStoryDesignSnapshot(first.id, directory)).rejects.toThrow();
    await expect(writeStoryDesignSnapshot(input, directory)).rejects.toThrow();
    expect(await readFile(filename, 'utf8')).toBe('{}');
  });
  it('rejects path traversal, invalid dates and nonfinite values', async () => {
    await expect(readStoryDesignSnapshot('../secrets', directory)).rejects.toThrow();
    await expect(readStoryDesignSnapshot('a'.repeat(64), directory)).resolves.toBeNull();
    const input = draft(); input.sourceDate = '2026-02-30';
    await expect(writeStoryDesignSnapshot(input, directory)).rejects.toThrow();
    input.sourceDate = '2026-09-10'; input.concept.values[0].value = NaN;
    await expect(writeStoryDesignSnapshot(input, directory)).rejects.toThrow();
    expect(await readdir(directory)).toHaveLength(0);
  });
});
