/** Visual approximations, not manufacturer CAD or operating curves.
 * Ratios use rotor radius; registered hub height and rotor diameter always win.
 */
export type WindTurbineModel = {
 id:string; label:string; fidelity:'schematic';
 manufacturer:string|null; typePattern:RegExp|null; shell?:'rounded'|'egg'|'tapered'; source?:string;
 proportions:Readonly<{width:number;height:number;length:number;axis:number;hub:number;hubLength:number;towerRadius:number;nacelleOffset:number}>;
};
export const WIND_TURBINE_MODELS:readonly WindTurbineModel[]=[
 {id:'generic-three-blade',label:'Generic three-blade turbine',fidelity:'schematic',manufacturer:null,typePattern:null,
  proportions:{width:.125,height:.115,length:.27,axis:.16,hub:.055,hubLength:.072,towerRadius:.048,nacelleOffset:.03}},
 {id:'dewind-d4',label:'DeWind D4',fidelity:'schematic',manufacturer:'dewind',typePattern:/^d\s*4(?:\b|\/|-)/i,
  proportions:{width:.105,height:.105,length:.245,axis:.145,hub:.047,hubLength:.072,towerRadius:.048,nacelleOffset:.03}},
 {id:'dewind-d6',label:'DeWind D6',fidelity:'schematic',manufacturer:'dewind',typePattern:/^d\s*6(?:\b|\/|-)/i,
  proportions:{width:.11,height:.105,length:.245,axis:.145,hub:.047,hubLength:.072,towerRadius:.048,nacelleOffset:.03}},
 {id:'enercon-e101',label:'ENERCON E-101',fidelity:'schematic',manufacturer:'enercon',typePattern:/^e[-\s]*101(?:\b|\/|-)/i,shell:'egg',source:'https://www.enercon.de/de/news-media/publikationen',
  proportions:{width:.14,height:.16,length:.24,axis:.16,hub:.075,hubLength:.092,towerRadius:.057,nacelleOffset:.015}},
 {id:'enercon-e53',label:'ENERCON E-53',fidelity:'schematic',manufacturer:'enercon',typePattern:/^e[-\s]*53(?:\b|\/|-)/i,shell:'egg',source:'https://planningregister.cherwell.gov.uk/Document/Download?fileName=5894989.PDF&imageId=33&isPlan=False&module=PLA&planId=47143&recordNumber=36845',
  proportions:{width:.18,height:.19,length:.29,axis:.19,hub:.085,hubLength:.105,towerRadius:.064,nacelleOffset:.015}},
 {id:'enercon-e66',label:'ENERCON E-66',fidelity:'schematic',manufacturer:'enercon',typePattern:/^e[-\s]*66(?:\b|\/|-)/i,shell:'egg',source:'https://www.enercon.de/en/company/enercon-story',
  proportions:{width:.17,height:.18,length:.27,axis:.18,hub:.08,hubLength:.1,towerRadius:.06,nacelleOffset:.015}},
 {id:'vestas-v112',label:'Vestas V112',fidelity:'schematic',manufacturer:'vestas',typePattern:/^v[-\s]*112(?:\b|\/|-)/i,shell:'tapered',source:'https://www.vestas.com/en/media/company-news/2016/vestas-wins-53-mw-epc-order-and-20-year-service-contrac-c2963808',
  proportions:{width:.085,height:.09,length:.23,axis:.145,hub:.049,hubLength:.08,towerRadius:.046,nacelleOffset:.035}},
 {id:'vestas-v126',label:'Vestas V126',fidelity:'schematic',manufacturer:'vestas',typePattern:/^v[-\s]*126(?:\b|\/|-)/i,shell:'tapered',source:'https://www.vestas.com/en/energy-solutions/onshore-wind-turbines/4-mw-platform/V126-3-45-MW',
  proportions:{width:.075,height:.08,length:.205,axis:.135,hub:.044,hubLength:.071,towerRadius:.043,nacelleOffset:.035}},
 {id:'nordex-n149',label:'Nordex N149',fidelity:'schematic',manufacturer:'nordex',typePattern:/^n[-\s]*149(?:\b|\/|-)/i,shell:'tapered',source:'https://www.nordex-online.com/en/product/n149-5-x/',
  proportions:{width:.074,height:.075,length:.18,axis:.12,hub:.045,hubLength:.064,towerRadius:.041,nacelleOffset:.025}},
 {id:'suedwind-s77',label:'Südwind S77',fidelity:'schematic',manufacturer:'suedwind',typePattern:/^s[-\s]*77(?:\b|\/|-)/i,shell:'rounded',
  proportions:{width:.10,height:.11,length:.255,axis:.145,hub:.048,hubLength:.073,towerRadius:.05,nacelleOffset:.035}},
];
export function resolveWindTurbineModel(manufacturer?:string|null,type?:string|null):WindTurbineModel{
 const brand=(manufacturer??'').toLowerCase().replace(/ü/g,'ue').replace(/ö/g,'oe').replace(/ä/g,'ae').replace(/ß/g,'ss').replace(/[^a-z0-9]/g,'');
 return WIND_TURBINE_MODELS.find(model=>model.manufacturer!==null&&brand.startsWith(model.manufacturer)&&model.typePattern?.test((type??'').trim()))??WIND_TURBINE_MODELS[0];
}
