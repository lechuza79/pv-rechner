import {describe, it, expect} from 'vitest';
import {readFileSync} from 'fs';
import {join} from 'path';

// The default export palette for Atlas visuals (lib/export-markers.ts →
// EXPORT_BRIGHTEST_ATTR) is a selector exclusion on the dark scheme. Two ways it
// breaks silently, both measured on 25.09.2026:
//  • a bare :not(...) raises the dark rule's specificity; it then overrode a host
//    rule on the story teaser and changed the live page (253,000 pixels);
//  • the capture wrapper stops carrying the capture marker, and every image is
//    dark again while the page looks fine.
const root = join(__dirname, '..', '..');
const read = (p: string) => readFileSync(join(root, p), 'utf8');
const EXCLUSION = '[data-sc-export-capture] [data-sc-export-brightest]';

describe('export default palette for Atlas visuals', () => {
  for (const file of ['components/social/atlas-foundations.module.css', 'components/social/StoryConceptLab.module.css']) {
    it(`${file}: every dark-scheme rule yields to the export default without gaining specificity`, () => {
      const rules = read(file).split('}').filter((r) => /\[data-story-scheme=dark\][^{]*\{/.test(r));
      expect(rules.length).toBeGreaterThan(0);
      for (const rule of rules) {
        const selector = rule.slice(0, rule.indexOf('{'));
        expect(selector, selector).toContain(EXCLUSION);
        expect(selector, `${selector}: wrap the exclusion in :where()`).toMatch(/:where\(:not\(/);
      }
    });
  }

  it('the capture marks its wrapper, so the exclusion can apply', () => {
    const src = read('lib/chart-export.ts');
    const capture = src.slice(src.indexOf('export async function captureNodeToBlob'));
    expect(capture.slice(0, capture.indexOf('domToBlob'))).toMatch(/wrapper\.setAttribute\(EXPORT_CAPTURE_ATTR/);
  });
});
