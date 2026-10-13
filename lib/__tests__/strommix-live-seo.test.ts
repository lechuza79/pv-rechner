import {describe,it,expect} from 'vitest';
import {strommixLiveSeo} from '../strommix-live-seo';
import {pageContentFingerprint} from '../page-content-version';
import type {GenerationData} from '../energy';
const sample:GenerationData={country:'de',source:'Energy-Charts',license:'CC BY 4.0',resolution:'15min',data:[{ts:'2026-10-10T10:15:00Z',solar:3000,wind_onshore:600,fossil_gas:400}]};
describe('Live Strommix SEO snapshot',()=>{
 it('uses the hero percentage, output and observation in the share image',()=>{
  const result=strommixLiveSeo(sample);
  const url=new URL(result.jsonLd.primaryImageOfPage.url);
  expect(url.searchParams.get('share')).toBe('90');
  expect(url.searchParams.get('gw')).toBe('4');
  expect(url.searchParams.get('ts')).toBe(sample.data[0].ts);
  expect(result.metadata.description).toContain('90 %');
  expect(result.metadata.robots).toEqual({index:true,follow:true});
  expect(result.metadata.alternates?.canonical).toBe('/strommix-deutschland');
 });
 it('excludes storage discharge just like the radar hero',()=>{
  const result=strommixLiveSeo({...sample,data:[{...sample.data[0],hydro_pumped_storage:1000}]});
  const url=new URL(result.jsonLd.primaryImageOfPage.url);
  expect(url.searchParams.get('share')).toBe('90');
  expect(url.searchParams.get('gw')).toBe('4');
 });
 it('does not advance content identity for a retrieval alone',()=>{
  const a=strommixLiveSeo({...sample,retrievedAt:'2026-10-10T11:00:00Z'});
  const b=strommixLiveSeo({...sample,retrievedAt:'2026-10-10T11:15:00Z'});
  expect(pageContentFingerprint(a.content)).toBe(pageContentFingerprint(b.content));
  const changed=strommixLiveSeo({...sample,data:[{...sample.data[0],solar:2000}]});
  expect(pageContentFingerprint(a.content)).not.toBe(pageContentFingerprint(changed.content));
 });
 it('credits the fallback source and never invents a zero when data is missing',()=>{
  expect(new URL(strommixLiveSeo({...sample,fallback:'smard'}).jsonLd.primaryImageOfPage.url).searchParams.get('source')).toBe('smard');
  const empty=strommixLiveSeo();
  expect(empty.content).toBeNull();
  expect(empty.jsonLd).not.toHaveProperty('dateModified');
  expect(new URL(empty.jsonLd.primaryImageOfPage.url).searchParams.has('share')).toBe(false);
 });
 it('uses a persisted modification timestamp independently of the data timestamp',()=>{
  expect(strommixLiveSeo(sample,'2026-10-10T12:00:00Z').jsonLd.dateModified).toBe('2026-10-10T12:00:00Z');
 });
});
