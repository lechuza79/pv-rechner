import {beforeEach,describe,expect,it,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import type {ReactNode} from 'react';
const mocks=vi.hoisted(()=>({prepare:vi.fn(async(_items:unknown[])=>({views:{},queries:{},snapshots:{},sources:{}}))}));
vi.mock('../admin-guard',()=>({isAdminSession:async()=>false}));
vi.mock('../../components/dashboard/WidgetDashboard.server',()=>({prepareWidgetDashboard:mocks.prepare}));
vi.mock('../../components/dashboard/WidgetDashboard',()=>({default:()=>null}));
vi.mock('../../components/DataSourcesSection',()=>({default:()=>null}));
vi.mock('../../components/PoweredBy',()=>({DataSourceNote:()=>null}));
vi.mock('next/link',()=>({default:({href,children}:{href:string;children:ReactNode})=><a href={href}>{children}</a>}));
import Page from '../../app/(site)/widget-galerie/dashboard-bestand/page';
describe('bounded widget inventory',()=>{
 beforeEach(()=>mocks.prepare.mockClear());
 it('loads disjoint bounded pages while preserving every energy variant and group filter',async()=>{
  const ids:string[]=[];
  for(let page=1;page<=6;page++){
   const html=renderToStaticMarkup(await Page({searchParams:Promise.resolve({gruppe:'energy',varianten:'alle',seite:String(page)})}));
   const items=mocks.prepare.mock.lastCall![0] as {id:string}[];
   expect(items.length).toBeGreaterThan(0);expect(items.length).toBeLessThanOrEqual(8);
   ids.push(...items.map(item=>item.id));
   expect(html).toContain(`Seite ${page} von 6`);
   if(page<6)expect(html).toContain(`gruppe=energy&amp;varianten=alle&amp;seite=${page+1}`);
  }
  expect(ids).toHaveLength(45);expect(new Set(ids).size).toBe(45);
  expect(ids.filter(id=>id.startsWith('strommix-radar-'))).toHaveLength(2);
  expect(ids.filter(id=>id.startsWith('atomstrom-jahr-'))).toHaveLength(4);
 });
 it('keeps malformed and out-of-range page requests within available results',async()=>{
  for(const seite of ['0','-5','nonsense','Infinity','99999']){
   await Page({searchParams:Promise.resolve({gruppe:'energy',varianten:'alle',seite})});
   expect(mocks.prepare.mock.lastCall![0].length).toBeGreaterThan(0);
   expect(mocks.prepare.mock.lastCall![0].length).toBeLessThanOrEqual(8);
  }
 });
});
