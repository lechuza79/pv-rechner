import { describe, expect, it } from 'vitest';
import { load } from 'cheerio';
import { kommunenMetadata, KOMMUNEN_PATH } from '../kommunen-seite';
import sections from '../startseite-sektionen.json';

describe('Municipal release metadata and discovery', () => {
  it('keeps all three modules in the title and one canonical organisation address', () => {
    const $ = load(`<html><head>${kommunenMetadata()}</head></html>`);
    expect($('title').text()).toBe('Energiemonitor, Checks & Rechner und Datenstories für Kommunen | Solar Check');
    expect($('link[rel="canonical"]').attr('href')).toBe(`https://solar-check.io${KOMMUNEN_PATH}`);
    expect($('meta[name="robots"]').attr('content')).toBe('index,follow');
    expect($('meta[name="description"]').attr('content')).toContain('Städte, Gemeinden und Landkreise');
  });
  it('links the server-visible homepage audience teaser to the offering', () => {
    expect(JSON.stringify(sections)).toContain(KOMMUNEN_PATH);
  });
});
