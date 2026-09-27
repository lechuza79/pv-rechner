/** Register-backed clusters and explicit exploratory assumptions, not measured demand. */
export type CommercialCluster='full-feed-in'|'ground-mounted'|'industry'|'agriculture'|'food-retail'|'warehouse'|'office'|'public-building'|'commerce-unspecified'|'other-use'|'unknown-use'|'household'|'balcony';
export type ClusterUnit={art:string;usage:string;feedInMode:string;siteName?:string;verifiedActivity?:'food-retail'|'warehouse'|'office'};
export function commercialCluster(unit:ClusterUnit):{cluster:CommercialCluster;basis:string;reviewHint?:string}{
 if(unit.feedInMode==='688')return {cluster:'full-feed-in',basis:'Gemeldete Volleinspeisung'};
 if(unit.art==='2961')return {cluster:'balcony',basis:'Gemeldetes Balkonkraftwerk'};
 if(unit.art==='852')return {cluster:'ground-mounted',basis:'Gemeldete Freifläche; Nutzung getrennt prüfen'};
 if(unit.usage==='713')return {cluster:'household',basis:'Gemeldete Haushaltsnutzung'};
 const usage:Record<string,CommercialCluster>={'714':'commerce-unspecified','715':'industry','716':'agriculture','717':'public-building','718':'other-use'};
 const cluster=usage[unit.usage]??'unknown-use';
 if(unit.verifiedActivity&&cluster==='commerce-unspecified')return {cluster:unit.verifiedActivity,basis:'Geprüfte Standortnutzung'};
 let reviewHint:string|undefined;
 if(cluster==='commerce-unspecified'){
  const name=unit.siteName??'';
  if(/supermarkt|verbrauchermarkt|lebensmittelmarkt/i.test(name))reviewHint='food-retail';
  else if(/lagerhalle|logistikzentrum/i.test(name))reviewHint='warehouse';
  else if(/bürogebäude|verwaltungsgebäude/i.test(name))reviewHint='office';
 }
 return {cluster,basis:'Gemeldete Gebäudenutzung',...(reviewHint?{reviewHint}:{})};
}
/** Low / reference / high assumptions for sensitivity analysis only.
 * These are editorial scenarios, not confidence intervals or HTW-derived quotas.
 * Without annual demand and on-site meter topology no single share is defensible.
 */
export const COMMERCIAL_SCENARIOS={
 industry:{label:'Produktion / Industrie',shares:[.3,.6,.9],profile:'Werktäglicher Tagesbetrieb; Mehrschichtbetrieb als offene Alternative'},
 agriculture:{label:'Landwirtschaft',shares:[.15,.4,.75],profile:'Breite Spanne: Tierhaltung, Ackerbau und saisonale Trocknung nicht gleichsetzen'},
 'food-retail':{label:'Lebensmittelhandel',shares:[.4,.65,.9],profile:'Tagesbetrieb mit Kühlgrundlast; nur bei geprüfter Standortnutzung'},
 warehouse:{label:'Lager / Logistik',shares:[.1,.3,.65],profile:'Tagesbetrieb; Kühlung und Ladeinfrastruktur unbekannt'},
 office:{label:'Büro / Verwaltung',shares:[.25,.5,.75],profile:'Werktags tagsüber, geringerer Wochenendbedarf'},
 'public-building':{label:'Öffentliche Gebäude',shares:[.15,.45,.8],profile:'Schulen, Verwaltung und Kliniken zunächst nicht genauer bekannt'},
 'commerce-unspecified':{label:'Handel / Dienstleistungen, nicht näher bekannt',shares:[0,.5,1],profile:'Unbekannte Standortnutzung; volle Sensitivität'},
 'other-use':{label:'Sonstige Nutzung',shares:[0,.5,1],profile:'Keine belastbare Verbrauchszuordnung'},
 'unknown-use':{label:'Nutzung unbekannt',shares:[0,.5,1],profile:'Keine belastbare Verbrauchszuordnung'},
 'ground-mounted':{label:'Freifläche ohne gemeldete Volleinspeisung',shares:[0,.25,1],profile:'Eigenversorgung oder Netzverkauf nicht aus Anlagenart ableiten'},
 'full-feed-in':{label:'Gemeldete Volleinspeisung',shares:[0,0,0],profile:'Kein Eigenverbrauch'},
} as const;
export function commercialValueScenarios(cluster:keyof typeof COMMERCIAL_SCENARIOS,kwh:number,tariffEuro:number,avoidedWorkPriceEuro:number){
 if([kwh,tariffEuro,avoidedWorkPriceEuro].some(n=>!Number.isFinite(n)||n<0))throw Error('Invalid valuation input');
 const cases=COMMERCIAL_SCENARIOS[cluster].shares.map(selfUse=>({selfUse,selfConsumedKwh:kwh*selfUse,feedInKwh:kwh*(1-selfUse),feedInEuro:kwh*(1-selfUse)*tariffEuro,valueEuro:kwh*selfUse*avoidedWorkPriceEuro+kwh*(1-selfUse)*tariffEuro}));
 return {status:'exploratory-not-published' as const,cases,valueMin:Math.min(...cases.map(c=>c.valueEuro)),valueMax:Math.max(...cases.map(c=>c.valueEuro))};
}
