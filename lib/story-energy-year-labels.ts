import type {EnergyYear} from './story-energy-year';

export function energyYearHasWind(data:EnergyYear):boolean {
 return data.windKw>0 || data.days.some(day=>day.windMwh>0);
}

export function energyYearTitle(data:EnergyYear):string {
 return energyYearHasWind(data)
  ? `Solar und Wind: ${data.town} im Energiejahr ${data.year}`
  : `Solarerzeugung: ${data.town} im Solarjahr ${data.year}`;
}
