import {eigenverbrauchAnteilRegion,stromwertCtFuerSegment,einspeiseSatz} from './atlas-impact';
export type ValueCell={region_id:string;segment:string;year:number;count:number;kwp:number;kwh:number};
/** Freeze current Atlas valuation assumptions; never claim this is paid revenue. */
export function monthlyElectricityValue(regionId:string,totalMwh:number,cells:ValueCell[]){
 if(!Number.isFinite(totalMwh)||totalMwh<0||!cells.length||cells.some(c=>c.region_id!==regionId))throw Error('Invalid local valuation inputs');
 const stock={dachCount:0,dachKwp:0,batterieCount:0,batterieKwh:0};
 for(const c of cells){if(c.segment==='privat_dach'){stock.dachCount+=c.count;stock.dachKwp+=c.kwp;}if(c.segment==='batterie_privat'){stock.batterieCount+=c.count;stock.batterieKwh+=c.kwh;}}
 const ev=eigenverbrauchAnteilRegion(stock,regionId);
 let kwp=0,weighted=0;
 const feedInParts:{segment:string;year:number;kwp:number;exportShare:number;ct:number;eligible:boolean;basis:string}[]=[];
 for(const c of cells){if(c.segment.startsWith('batterie'))continue;if(!['privat_dach','gewerbe_dach','freiflaeche','steckersolar'].includes(c.segment))throw Error('Unsupported valuation segment');if(!Number.isFinite(c.kwp)||c.kwp<0)throw Error('Invalid capacity');const rate=einspeiseSatz(c.segment,c.year,c.count>0?c.kwp/c.count:null);
 const exportShare=c.segment==='privat_dach'?1-(ev??0):c.segment==='steckersolar'?0:1;
 if(c.segment==='privat_dach'&&ev===null)throw Error('Missing private self-consumption assumption');
 feedInParts.push({segment:c.segment,year:c.year,kwp:c.kwp,exportShare,ct:rate.ct,eligible:!rate.hinweis.startsWith('Börsenwert')&&c.segment!=='steckersolar',basis:rate.hinweis});
 kwp+=c.kwp;weighted+=c.kwp*stromwertCtFuerSegment(c.segment,c.year,c.count>0?c.kwp/c.count:null,ev);}
 if(kwp<=0)throw Error('No solar stock');
 const ctPerKwh=weighted/kwp;
 const feedIn=feedInParts.map(part=>({...part,mwh:totalMwh*part.kwp/kwp*part.exportShare,euro:part.eligible?totalMwh*1000*part.kwp/kwp*part.exportShare*part.ct/100:0}));
 const feedInEuro=feedIn.reduce((sum,part)=>sum+part.euro,0);
 return {feedInEuro,feedIn,euro:totalMwh*1000*ctPerKwh/100,ctPerKwh,referenceKwp:kwp,roofSelfConsumption:ev};
}
