import 'server-only';
import {parseStateElectricity} from './state-electricity';
import {jahrInBerlin} from './zeit';
/** One cached provider request per year; no third-party requests from the browser. */
export async function loadStateElectricity(year=jahrInBerlin()) {
 if(!Number.isInteger(year)||year<2015||year>jahrInBerlin())throw new Error('Unsupported generation year');
 const response=await fetch(`https://www.energy-charts.info/charts/energy/data/de_bl/year_${year}.json`,{next:{revalidate:21600},signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw new Error(`Regional generation unavailable: ${response.status}`);
 return parseStateElectricity(await response.json(),year);
}
