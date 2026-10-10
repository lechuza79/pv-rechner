import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import LandkreisSeite from '../../../../../../../components/landkreis/LandkreisSeite';
import {loadAssociationReference} from '../../../../../../../lib/verband-reference-server';
import {isAssociationSlug} from '../../../../../../../lib/verband-reference';

export const revalidate=86400;
export async function generateMetadata({params}:{params:Promise<{bundesland:string;kreis:string;verband:string}>}):Promise<Metadata> {
 const route=await params;
 if(!isAssociationSlug(route.verband))return {};
 const data=await loadAssociationReference(route.verband);
 if(!data||data.districtPath!==`/solar-atlas/${route.bundesland}/${route.kreis}`)return {};
 return {title:`${data.association.name} – Solar-Atlas`,description:`Solarenergie in den ${data.towns.length} Gemeinden der ${data.association.name}: Anlagen, Ausbau und Stromerzeugung.`,alternates:{canonical:`https://solar-check.io${data.basePath}`}};
}

export default async function AssociationPage({params}:{params:Promise<{bundesland:string;kreis:string;verband:string}>}) {
  const route=await params;
  if(!isAssociationSlug(route.verband))notFound();
  const data=await loadAssociationReference(route.verband);
  if(!data || data.districtPath!==`/solar-atlas/${route.bundesland}/${route.kreis}`)notFound();
  const state=data.ancestors.find(parent=>parent.level==='bundesland');
  if(!state)notFound();
  return <LandkreisSeite variant="dark" region={data.region} children={data.towns} ranking={data.ranking} stand={data.stand}
    basePath={data.basePath} memberBasePath={data.districtPath} state={{id:state.region_id,name:state.name}}
    association={{districtId:data.district.region_id,members:data.association.members,content:data.content}}
    crumbs={[{label:'Solar-Atlas',href:'/solar-atlas'},{label:state.name,href:`/solar-atlas/${state.slug}`},{label:data.district.name,href:data.districtPath}]}
    intro={<>Die {data.towns.length} Mitgliedsgemeinden der {data.association.name} im Vergleich. Alle Bestandszahlen stammen aus dem Marktstammdatenregister.</>}
    einordnung={<>Die Gebietszuordnung folgt dem amtlichen Gemeindeverzeichnis vom 31. August 2026.</>}/>;
}
