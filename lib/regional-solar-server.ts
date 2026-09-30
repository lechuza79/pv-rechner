import "server-only";
import {getRegionById,getChildren} from "./atlas";
import {getMastrDataAsOf} from "./mastr-data";
import {isDistrictMember} from "./district-package";
import {loadDistrictContent,loadRegionContent} from "./district-monitor-server";

export async function loadRegionalSolar(id:string) {
 const region=await getRegionById(id);
 if(!region || !["landkreis","bundesland","de"].includes(region.level)) return null;
 const [children,stand]=await Promise.all([getChildren(region),getMastrDataAsOf()]);
 if(!stand)return null;
 const members=(region.level==="landkreis"?children.filter(c=>isDistrictMember(c,id)):children).map(c=>c.region_id);
 const content=await (region.level==="landkreis"?loadDistrictContent(id,members,stand):loadRegionContent(id,members,stand));
 if(!content.monitor.energy?.monthly.length)return null;
 return {region,data:content.monitor.energy,version:JSON.stringify(content.prepared)};
}
