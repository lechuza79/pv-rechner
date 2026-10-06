import React from 'react';
import {describe,expect,it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {load} from 'cheerio';
import {readFileSync} from 'node:fs';
import DataSourcesSection from '../../components/DataSourcesSection';
import {siteFussHtml} from '../site-fuss';

describe('Shared sources placement',()=>{
 it('keeps source links and anchor between trust and footer in document hosts',()=>{
  const sources=renderToStaticMarkup(<DataSourcesSection id="landscape-sources"><p>Data: <a href="https://example.org/source">Original source</a></p></DataSourcesSection>);
  const $=load(siteFussHtml(sources));
  expect($('.sc-trust').next().attr('id')).toBe('landscape-sources');
  expect($('#landscape-sources').next().hasClass('sc-footer')).toBe(true);
  expect($('#landscape-sources h2').text()).toBe('Daten & Quellen');
  expect($('#landscape-sources a').attr('href')).toBe('https://example.org/source');
  expect($('.sc-data-sources')).toHaveLength(1);
 });
 it('keeps the footer unchanged for pages without sources',()=>{
  const $=load(siteFussHtml());
  expect($('.sc-trust').next().hasClass('sc-footer')).toBe(true);
 });
 it('requires municipal and regional consumers to import the shared section',()=>{
  for(const path of ['components/gemeinde/GemeindeSeite.tsx','components/landkreis/LandkreisSeite.tsx','docs/design/kommunen/shared.tsx']){
   const code=readFileSync(path,'utf8');
   expect(code).toMatch(/import DataSourcesSection from/);
   expect(code).toContain('<DataSourcesSection');
  }
  const template=readFileSync('docs/design/kommunen/scroll-template.ts','utf8');
  expect(template).not.toContain('landscape-sources-title');
  expect(readFileSync('docs/design/kommunen/kommunen.css','utf8')).not.toContain('#landscape-sources');
  const client=readFileSync('docs/design/kommunen/client.tsx','utf8');
  expect(client).toContain('components/data-sources-section.css');
 });
});
