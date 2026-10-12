import {afterEach,expect,it,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {WidgetDataProvider} from '../../components/dashboard/WidgetData';
import {CurrentPower} from '../../components/charts/CurrentPowerWidget';
// Inspect the timestamp passed to the canonical renderer without involving animation.
vi.mock('../../components/MastrLiveRadial',()=>({MastrLiveRadial:({highlightTs}:{highlightTs?:string})=><output>{highlightTs}</output>}));
afterEach(()=>vi.useRealTimers());
it('keeps the same selected reading when hydration crosses a quarter-hour boundary',()=>{
 vi.useFakeTimers();
 const endpoint='/api/gemeinde/solartag?ags=06440016';
 const points=[{time:'2026-10-11T17:15:00Z',powerPct:0},{time:'2026-10-11T17:30:00Z',powerPct:0}];
 const render=(fetchedAt:number)=>renderToStaticMarkup(<WidgetDataProvider snapshots={{[endpoint]:{data:{points},fetchedAt}}}><CurrentPower installedKwp={1000} frameless weatherSource={{endpoint,load:async()=>({points})}}/></WidgetDataProvider>);
 const observedAt=Date.parse('2026-10-11T17:29:59Z');
 vi.setSystemTime(observedAt);
 const server=render(observedAt);
 vi.setSystemTime(Date.parse('2026-10-11T17:30:10Z'));
 expect(render(observedAt)).toBe(server);
 expect(server).toContain('<output>2026-10-11T17:15:00Z</output>');
 expect(render(Date.now())).toContain('<output>2026-10-11T17:30:00Z</output>');
});
