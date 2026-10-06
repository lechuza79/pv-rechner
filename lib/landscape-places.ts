/** Prepared locations only; preparation does not happen in a visitor request. */
export const landscapePlaces:Record<string,string>={'09679147':'H\u00f6chberg','07312000':'Kaiserslautern','07335':'Landkreis Kaiserslautern','03458':'Landkreis Oldenburg','09679':'Landkreis W\u00fcrzburg','06632009':'Heringen (Werra)','03458009':'Hatten','05774040':'Bad W\u00fcnnenberg','06440016':'Nidda'};

export function landscapeAttribution(id:string):string {
 return (id==='03458009'||id==='03458')?'LGLN (2026) | CC BY 4.0':(id==='09679147'||id==='09679')?'Bayerische Vermessungsverwaltung | CC BY 4.0':(id==='07312000'||id==='07335')?'GeoBasis-DE / LVermGeoRP2026 | dl-de/by-2-0':id==='05774040'?'Geobasis NRW | dl-de/zero-2-0':'HVBG Hessen | Geb\u00e4ude dl-de/by-2-0, Gel\u00e4nde dl-de/zero-2-0';
}
