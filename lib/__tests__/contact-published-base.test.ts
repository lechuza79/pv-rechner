import {describe,it,expect} from 'vitest';
import {contactLinks,externalContactLinks} from '../contact-discovery';
describe('published HTML base for contact discovery',()=>{
 it('resolves Joomla contact links against the published root without growing the current path',()=>{
  const html='<base href="https://gemeinde.example/"><a href="index.php/impressum.html">Impressum</a><a href="index.php/kontakt.html">Kontakt</a>';
  expect(contactLinks(html,'https://gemeinde.example/index.php/index.php/impressum.html','gemeinde.example','kommunen').map(l=>l.url).sort()).toEqual(['https://gemeinde.example/index.php/impressum.html','https://gemeinde.example/index.php/kontakt.html']);
 });
 it('uses only the first published base and preserves legitimate directory paths',()=>{
  const html='<base href="../service/"><base href="https://other.example/"><a href="kontakt/team.html">Kontakt</a>';
  expect(contactLinks(html,'https://gemeinde.example/rathaus/seite.html','gemeinde.example','kommunen')[0].url).toBe('https://gemeinde.example/service/kontakt/team.html');
 });
 it('keeps an external base a separate published lead, not a municipal ownership claim',()=>{
  const html='<base href="https://amt.example/service/"><a href="kontakt.html">Kontakt</a>';
  expect(contactLinks(html,'https://gemeinde.example/','gemeinde.example','kommunen')).toEqual([]);
  expect(externalContactLinks(html,'https://gemeinde.example/','gemeinde.example','kommunen')[0].url).toBe('https://amt.example/service/kontakt.html');
 });
 it('rejects non-web bases and keeps document-relative fallback',()=>{
  const html='<base href="javascript:alert(1)"><a href="kontakt.html">Kontakt</a>';
  expect(contactLinks(html,'https://gemeinde.example/rathaus/index.html','gemeinde.example','kommunen')[0].url).toBe('https://gemeinde.example/rathaus/kontakt.html');
 });
});
