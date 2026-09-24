import { expect, it, vi } from 'vitest';
import { contactContentGap, contactLinks } from '../contact-discovery';
import { fetchContactPage } from '../../scripts/lib/contact-fetch';

const base = 'https://ort.de/kuemmerin/';
const embedded = '<h1>Kümmerin</h1><iframe src="/pdfjs/web/viewer.php?file=%2Fdokumente%2Fkontakt.pdf&amp;attachment_id=17"></iframe>';
it('follows published council and community coordinator links without inventing contact roles', () => {
  const html = '<a href="/gemeindevertreter/">Gemeindevertreter</a><a href="/kuemmerin/">Kümmerin</a><a href="/ehrenamtskoordination/">Ehrenamtskoordination</a>';
  expect(contactLinks(html, base, 'ort.de', 'kommunen').map(x => x.url)).toEqual([
    'https://ort.de/gemeindevertreter/', base, 'https://ort.de/ehrenamtskoordination/',
  ]);
});
it('retains the actual published PDF source and marks its HTML wrapper incomplete', () => {
  expect(contactLinks(embedded, base, 'ort.de', 'kommunen')).toContainEqual({url:'https://ort.de/dokumente/kontakt.pdf',priority:90});
  expect(contactContentGap(embedded)).toBe('embedded-document');
  expect(contactContentGap(`<p>${'Long article. '.repeat(200)}</p>${embedded}`)).toBe('embedded-document');
});
it('supports direct embedded PDFs, excludes unrelated frames and foreign document authority', () => {
  const html = '<object data="/telefon.pdf"></object><embed src="/organigramm.pdf"><iframe src="https://foreign.de/contact.pdf"></iframe><iframe src="/video.html"></iframe><a href="">Kontakt</a>';
  expect(contactLinks(html,base,'ort.de','kommunen')).toEqual([
    {url:'https://ort.de/telefon.pdf',priority:90},{url:'https://ort.de/organigramm.pdf',priority:90},
  ]);
  expect(contactContentGap('<iframe src="/video.html"></iframe>')).toBe(null);
  expect(contactLinks('<iframe src="/anything.php?file=/not-a-document.html"></iframe>',base,'ort.de','kommunen')).toEqual([]);
});
it('does not treat rendered parent HTML as proof of PDF content', async () => {
  const render = vi.fn(async () => '<p>Rendered wrapper only</p>');
  const result = await fetchContactPage(base,{render,fetcher:async()=>new Response(embedded,{headers:{'content-type':'text/html'}})});
  expect(result.observation.status).toBe('needs-rendering');
  expect(result.observation.error).toContain('embedded-document');
  expect(render).not.toHaveBeenCalled();
});
