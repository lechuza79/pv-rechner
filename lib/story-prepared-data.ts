import type {SolarMonth} from './story-monthly-solar';
import type {EnergyYear} from './story-energy-year';
export type PreparedValue={euro:number;feedInEuro:number;totalMwh:number;unitCount:number;approximateTariffCount:number;unknownModeCount:number;commercialSelfUseUnknownCount:number;privateSelfConsumption:number;sourceDate:string;valuationDate:string;month:string;model:string;assumptionSourceDate:string};
export type PreparedStoryData={sourceDate:string;weatherSourceUrl?:string;monthly?:SolarMonth;annual?:EnergyYear;values?:Record<string,PreparedValue>;availability:{topic:string;status:'ready'|'missing';reason:string}[];preparedAt:string};
