import {it,expect,vi} from 'vitest';
vi.mock('../atlas',()=>({getRegionById:vi.fn(async()=>({name:'Deutschland',slug:null})),atlasPathForRegionId:vi.fn(async()=>null)}));
vi.mock('../verband-reference-server',()=>({readAssociationReference:vi.fn()}));
import {aboRegionPath} from '../abo-region';
import {newsletterLink} from '../newsletter-metrics';
it('uses the published Atlas root for a country subscription without a slug',async()=>{expect(await aboRegionPath('de')).toBe('/solar-atlas');const context={campaign:'september-2026' as const,variant:'allgemein' as const,placement:'ort' as const};expect(newsletterLink('https://solar-check.io/solar-atlas',context)).toContain('/solar-atlas?nl=');expect(()=>newsletterLink('https://solar-check.io/solar-atlas-fake',context)).toThrow();});
