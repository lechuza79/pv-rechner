import {expect,it,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import Section from '../../components/StateElectricitySection';
import Embed from '../../app/(embed)/embed/regional-hourly-mix/page';

const {rendered,data}=vi.hoisted(()=>({rendered:[] as Record<string,unknown>[],data:{hours:[{ts:'2026-10-15T08:00:00Z',regions:[]}],retrievedAt:'2026-10-15T09:00:00Z'}}));
vi.mock('../district-geometry',()=>({stateElectricityGeometry:async()=>[],stateElectricityWater:async()=>({})}));
vi.mock('../co2map-server',()=>({loadRegionalHourly:async()=>data}));
vi.mock('../../components/RegionalHourlyMap',()=>({default:(props:Record<string,unknown>)=>{rendered.push(props);return <div>Shared regional chart</div>;}}));
vi.mock('../../components/dashboard/WidgetPresentation',()=>({default:({children}:{children:React.ReactNode})=>children}));

it('renders the same regional component and observation in the page and embed, including shared selection',async()=>{
 rendered.length=0;
 const time=data.hours[0].ts;
 const page=renderToStaticMarkup(await Section({nested:true,selected:'NI',time}));
 renderToStaticMarkup(await Embed({searchParams:Promise.resolve({selected:'NI',time})}));
 expect(rendered).toHaveLength(2);
 for(const props of rendered){expect(props.initialData).toBe(data);expect(props.initialSelected).toBe('NI');expect(props.initialTime).toBe(time);}
 expect(page).toContain('Stundenwerte');
 expect(page).not.toContain('Vergleiche die Jahresmengen');
 expect(rendered[0].nested).toBe(true);
 expect(rendered[1].standalone).toBe(true);
});
