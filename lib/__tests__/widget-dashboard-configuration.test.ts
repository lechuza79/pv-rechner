import {describe,it,expect,vi,beforeEach,afterEach} from 'vitest';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {widgetDataSourceKey} from '../widget-appearance';
import {applyDashboardSelection,dashboardLeaves,type DashboardConfiguration} from '../widget-dashboard';
vi.mock('server-only',()=>({}));
vi.mock('../supabase-server',()=>({supabase:null}));
import {saveWidgetDashboard,loadWidgetDashboard} from '../widget-dashboard-store.server';
const configuration=():DashboardConfiguration=>({version:1,appearance:{theme:'dark'},sections:[{id:'test',title:'Test',root:{id:'group',label:'Test',direction:'row',children:[{id:'first',label:'First',widgetId:'stromhandel',presentation:'compact'},{id:'second',label:'Second',widgetId:'stromhandel',presentation:'compact'}]}}],sources:{first:'/embed/stromhandel?presentation=compact',second:'/embed/stromhandel?presentation=compact&period=seven'}});
describe('dashboard selection isolation',()=>{
 it('does not reload for appearance or explicit defaults, but recognizes changed data',()=>{
  const key=widgetDataSourceKey('stromhandel','/embed/stromhandel?presentation=compact');
  expect(widgetDataSourceKey('stromhandel','/embed/stromhandel?presentation=compact&onsite=1&theme=light&layout=allocated&period=year&year=2026')).toBe(key);
  expect(widgetDataSourceKey('stromhandel','/embed/stromhandel?presentation=compact&period=seven')).not.toBe(key);
 });
 it('changes one instance and preserves its sibling and original configuration',()=>{
  const before=configuration();const sibling=dashboardLeaves(before.sections[0].root)[1];
  const after=applyDashboardSelection(before,'first',{src:'/embed/stromhandel?presentation=compact&period=seven',presentation:'compact',appearance:{theme:'light'}});
  expect(dashboardLeaves(after.sections[0].root)[1]).toEqual(sibling);
  expect(after.sources.second).toBe(before.sources.second);
  expect(before.sources.first).not.toBe(after.sources.first);
  expect(after.appearance).toEqual({theme:'dark'});
 });
 it('rejects mismatching renderers, formats and unknown instances',()=>{
  expect(()=>applyDashboardSelection(configuration(),'first',{src:'/embed/strommix',presentation:'compact'})).toThrow();
  expect(()=>applyDashboardSelection(configuration(),'missing',{src:'/embed/stromhandel',presentation:'full'})).toThrow();
  expect(()=>applyDashboardSelection(configuration(),'first',{src:'/embed/stromhandel?presentation=compact',presentation:'compact',gridSize:'strip'})).toThrow();
 });
});
describe('durable local versions',()=>{
 let dir:string;
 beforeEach(async()=>{dir=await mkdtemp(join(tmpdir(),'widget-save-test-'));vi.spyOn(process,'cwd').mockReturnValue(dir);vi.stubEnv('NODE_ENV','development');vi.stubEnv('VERCEL','');});
 afterEach(async()=>{vi.restoreAllMocks();vi.unstubAllEnvs();await rm(dir,{recursive:true,force:true});});
 it('restores configuration after a fresh module load and leaves prior versions unchanged',async()=>{
  const original=configuration();const id=await saveWidgetDashboard(original);
  const next=applyDashboardSelection(original,'first',{src:'/embed/stromhandel?presentation=compact&period=seven',presentation:'compact',appearance:{theme:'light'}});
  const second=await saveWidgetDashboard(next);expect(second).not.toBe(id);
  vi.resetModules();const reader=await import('../widget-dashboard-store.server');
  expect(await reader.loadWidgetDashboard(id)).toEqual(original);expect(await reader.loadWidgetDashboard(second)).toEqual(next);
  expect(await loadWidgetDashboard('../secret')).toBeNull();
 });
 it('persists county comparison settings and independent view overrides',async()=>{
  const before=configuration();
  before.sections[0].root={id:'race',label:'Regionalvergleich',widgetId:'regional-race',presentation:'full'};
  before.sources={race:'/embed/regional-race/12063'};
  const src='/embed/regional-race/12063?comparison=district&toggle=off&view=municipalities&metric=count&segment=all&municipalitiesMetric=per-capita&municipalitiesSegment=balcony';
  const next=applyDashboardSelection(before,'race',{src,presentation:'full'});
  const id=await saveWidgetDashboard(next);
  expect((await loadWidgetDashboard(id))?.sources.race).toBe(src);
  expect(before.sources.race).toBe('/embed/regional-race/12063');
  expect(applyDashboardSelection(before,'race',{src:'/embed/regional-race/de?metric=kwp',presentation:'full'}).sources.race).toContain('/de?');
 });
 it('fails closed in production when the database is unavailable',async()=>{vi.stubEnv('NODE_ENV','production');await expect(saveWidgetDashboard(configuration())).rejects.toThrow('storage unavailable');});
});
