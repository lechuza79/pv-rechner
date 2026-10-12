import {afterEach,describe,expect,it,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import LocationSearch,{searchLocations} from '../../components/LocationSearch';
afterEach(()=>vi.unstubAllGlobals());
describe('Shared simulation location field',()=>{
  it('retains county hits without inventing a postcode',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({hits:[{ags:'09679',name:'Würzburg',plz:'',kind:'Landkreis',context:'Bayern'}]})}));
    const hits=await searchLocations('Landkreis Würzburg',new AbortController().signal);
    expect(hits).toHaveLength(1);
    expect(JSON.parse(hits[0].id)).toMatchObject({ags:'09679',plz:''});
    expect(hits[0].description).toContain('Landkreis');
  });
  it('reports an unavailable search instead of an empty result',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:false}));
    await expect(searchLocations('Höchberg',new AbortController().signal)).rejects.toThrow('nicht erreichbar');
  });
  it('scopes municipality suggestions to the selected county',async()=>{
    const fetch=vi.fn().mockResolvedValue({ok:true,json:async()=>({hits:[]})});vi.stubGlobal('fetch',fetch);
    await searchLocations('Höch',new AbortController().signal,'09679');
    expect(fetch.mock.calls[0][0]).toContain('kreis=09679');
  });
  it('uses the same field in both page hosts and keeps the clear action after the value',()=>{
    for(const file of ['scripts/location-search/simulation.jsx','components/FundingPageShell.tsx']) expect(readFileSync(file,'utf8')).toContain('<LocationSearch');
    const html=renderToStaticMarkup(<LocationSearch selected={{ags:'09679447',name:'Höchberg',plz:'97204'}} onPick={()=>{}} onClear={()=>{}}/>);
    expect(html.indexOf('value="97204 Höchberg"')).toBeLessThan(html.indexOf('aria-label="Standort löschen"'));
    expect(html).not.toContain('<circle cx="11"');
  });
});
