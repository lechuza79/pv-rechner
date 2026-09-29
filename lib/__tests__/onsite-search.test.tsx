import {describe,expect,it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import OnsiteSearch from '../../components/OnsiteSearch';
import RegionNavigation from '../../components/landkreis/RegionNavigation';

describe('Shared onsite search and regional directory',()=>{
  it('renders an accessible local search without initial autofocus or visible suggestions',()=>{
    const html=renderToStaticMarkup(<OnsiteSearch items={[{id:'a',label:'Annaburg'}]} ariaLabel="Gemeinde suchen"/>);
    expect(html).toContain('role="combobox"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-label="Gemeinde suchen"');
    expect(html).not.toContain('autofocus');
  });
  it('keeps both region search consumers on the shared interaction',()=>{
    for(const path of ['components/atlas/RegionSearch.tsx','components/landkreis/RegionNavigation.tsx']){
      const source=readFileSync(path,'utf8');
      expect(source).toContain('<OnsiteSearch');
      expect(source).not.toContain('role="combobox"');
      expect(source).not.toContain('role="listbox"');
    }
  });
  it.each([
    ['Gemeindeübersicht','im Landkreis Wittenberg','Gemeinde suchen'],
    ['Kreisübersicht','in Sachsen-Anhalt','Kreis oder kreisfreie Stadt suchen'],
    ['Länderübersicht','in Deutschland','Bundesland suchen'],
  ])('adapts %s and preserves one direct link with accessible energy and share', (title,locationPhrase,label)=>{
    const html=renderToStaticMarkup(<RegionNavigation title={title} locationPhrase={locationPhrase} parentName="Parent"
      places={[{id:'a',name:'Annaburg',href:'/annaburg'}]} energy={{month:'2026-08',totalMwh:4359,values:[{regionId:'a',mwh:4359}]}}/>);
    expect(html).toContain(`Energiedaten ${locationPhrase}`);
    expect(html).toContain(`aria-label="${label}"`);
    expect(html).toContain('href="/annaburg"');
    expect(html).toContain('4,4 GWh');
    expect(html).toContain('100 %');
    expect(html).not.toContain('Anteil anzeigen');
  });
});
