import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it} from 'vitest';
import {YieldChart} from '../../components/social/YieldChart';
import type {DiscoveryReport} from '../story-discovery';
import type {StoryConcept} from '../story-konzepte';
it('paints all callouts after every bar and reference line',()=>{
 const story={kind:'yield',title:'Peak',period:'Juni 2023',values:[{label:'Spitzenwert',value:160},{label:'Mittel',value:135}],yieldSeries:[{period:'2022-06',value:140,highlight:false},{period:'2022-07',value:158,highlight:false},{period:'2023-06',value:160,highlight:true}]} as StoryConcept;
 const html=renderToStaticMarkup(<YieldChart story={story}/>);
 const at=html.indexOf('data-chart-layer="callouts"');
 expect(at).toBeGreaterThan(html.lastIndexOf('<line'));
 expect(html.slice(0,at)).not.toContain('fill="var(--story-picker-bg)"');
 expect(html.slice(at).match(/var\(--story-picker-bg\)/g)).toHaveLength(3);
 expect(html.slice(at)).not.toContain('<line');
});

it('keeps the complete monthly series and restrained axis labels for Trier',async()=>{
 const {default:reports}=await import('../story-discovery-reports.json');
 const report=(reports as unknown as DiscoveryReport[]).find(r=>r.regionId==='07211000')!;
 const claim=report.candidates.find(c=>c.family==='Ertragsspitze als Modell'&&c.period==='2023-06')!;
 const story={kind:'yield',title:claim.title,period:'Juni 2023',town:'Trier',sourceCaption:'Open-Meteo · ERA5',values:claim.evidence,yieldSeries:claim.yieldSeries} as StoryConcept;
 const html=renderToStaticMarkup(<YieldChart story={story}/>);
 expect(html.match(/<title>/g)).toHaveLength(120);
 for(const year of [2016,2018,2020,2022,2024])expect(html).toContain(`>${year}</text>`);
 for(const year of [2017,2019,2021,2023,2025])expect(html).not.toContain(`>${year}</text>`);
 expect(html.match(/Quelle:/g)).toHaveLength(1);
 expect(html.replace(/aria-label="[^"]*"/g,'')).not.toContain('Skala ab');
 expect(html).toContain('>Juni</text>');
 expect(html).toContain('aria-label="Durchschnitt"');
 const compact=renderToStaticMarkup(<YieldChart story={story} compact/>);
 expect(compact.match(/<title>/g)).toHaveLength(10);
 expect(compact).toContain('aria-label="Durchschnitt"');
 expect(compact).toContain('strokeWidth="1.2"'.replace('strokeWidth','stroke-width'));
 expect(compact).toContain('stroke="var(--story-paper)"');
 expect(compact).toContain('>2023</text>');
 expect(compact).not.toContain('>2022</text>');
 expect(compact.slice(compact.indexOf('data-chart-layer="callouts"')).match(/<rect/g)).toHaveLength(1);

});
