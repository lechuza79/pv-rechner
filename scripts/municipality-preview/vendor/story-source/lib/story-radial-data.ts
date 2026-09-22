import monthly from './story-monthly-solar-data.json';
import annual from './story-energy-year-data.json';
import cities from './story-radial-city-data.json';
import type {SolarMonth} from './story-monthly-solar';
import type {EnergyYear} from './story-energy-year';
const registry:Record<string,{monthly?:SolarMonth;annual?:EnergyYear}>={
 '07211000':{monthly:{...monthly,town:'Trier'}},
 '06440016':{annual},
 ...cities,
};
export const radialDataForCity=(regionId:string)=>registry[regionId];
