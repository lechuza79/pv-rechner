import {notFound} from "next/navigation";
import {loadRegionalSolar} from "../../../../../lib/regional-solar-server";
import {RegionalMonthlySolarWidget} from "../../../../../components/landkreis/DistrictEnergyWidgets";
export const metadata={title:"Solarerzeugung im Tagesverlauf",robots:{index:false,follow:false}};
export default async function RegionalSolarPage({params}:{params:Promise<{region:string}>}) {
 const {region}=await params;
 if(!/^(de|\d{2}|\d{5})$/.test(region))notFound();
 const solar=await loadRegionalSolar(region);
 if(!solar)notFound();
 return <main style={{maxWidth:640,margin:"0 auto",padding:24}}><RegionalMonthlySolarWidget data={solar.data} name={solar.region.name} regionId={region}/></main>;
}
