import { describe, expect, it } from 'vitest';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { RESULT_SAVINGS_IMAGE } from '../../components/calculator/result-assets';

// Source assets can remain large; what the calculators actually reference must be compact.
const limit = 150 * 1024;
const bytes = (url: string) => statSync(resolve('public', url.replace(/^\//,''))).size;
describe('calculator decoration payload', () => {
 it('keeps the shared result illustration below 150 KB', () => {
  expect(bytes(RESULT_SAVINGS_IMAGE)).toBeLessThan(limit);
  for(const file of ['components/calculator/ResultOverview.tsx','app/(site)/waermepumpe-rechner/waermepumpe.tsx']) {
   const source=readFileSync(file,'utf8');
   expect(source).toContain('src={RESULT_SAVINGS_IMAGE}');
   expect(source).not.toContain('/illustrations/funding-check-neon.svg');
  }
 });
 it('checks every local image URL referenced by the shared result stylesheet', () => {
  const css=readFileSync('components/calculator/result-design.css','utf8');
  const urls=[...css.matchAll(/url\(['"]?(\/[^)'"\s]+)['"]?\)/g)].map(match=>match[1]);
  expect(urls.length).toBeGreaterThan(0);
  for(const url of urls) expect(bytes(url),url).toBeLessThan(limit);
 });
 it('would reject the original oversized assets', () => {
  expect(bytes('/illustrations/funding-check-neon.svg')).toBeGreaterThan(limit);
  expect(bytes('/design/trust/texture.png')).toBeGreaterThan(limit);
 });
});
