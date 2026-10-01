import {notFound} from 'next/navigation';
import RegionMapWidget from '../../../../components/landkreis/RegionMapWidget';
import {loadRegionMap} from '../../../../lib/region-map-server';

export const metadata={title:'3D-Regionalkarte · Solar Check',robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<{ags?:string;selected?:string}>}) {
  const {ags='06440',selected}=await searchParams;
  if(!/^(de|\d{2}|\d{5})$/.test(ags))notFound();
  const data=await loadRegionMap(ags);
  if(!data)return <p>Für dieses Gebiet liegt derzeit keine Karte vor.</p>;
  const selectedPlace=data.metrics[0].values.some(value=>value.id===selected)?selected:undefined;
  return <RegionMapWidget name={data.region.name} stand={data.stand} shapes={data.shapes} metrics={data.metrics} selectedPlace={selectedPlace}/>;
}
