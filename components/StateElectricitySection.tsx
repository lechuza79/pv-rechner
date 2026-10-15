import {stateElectricityGeometry,stateElectricityWater} from '../lib/district-geometry';
import {loadStateElectricity} from '../lib/state-electricity-server';
import RegionalElectricityViews from './RegionalElectricityViews';
import {loadRegionalHourly} from '../lib/co2map-server';
import StateElectricityMap from './StateElectricityMap';
import styles from './StateElectricityMap.module.css';
import foundation from './social/atlas-foundations.module.css';
export default async function StateElectricitySection({review=false,hero=false,nested=false}:{nested?:boolean;review?:boolean;hero?:boolean}){
 const [shapes,data,sceneContext,hourly]=await Promise.all([stateElectricityGeometry(),loadStateElectricity().catch(()=>null),stateElectricityWater(),review?loadRegionalHourly().catch(()=>null):null]);
 return <section id="bundeslaender" className={`${styles.section} ${hero?styles.heroSection:""} ${nested?styles.overlapAfter:""} ${foundation.foundation}`} data-story-scheme="dark" aria-labelledby="state-electricity-heading">
  <div className={styles.inner}>
   {!hero&&<header className={styles.heading}><h2 id="state-electricity-heading">Strommix nach Bundesland</h2>
   {hero&&<p>{data?.year} bisher · Stromerzeugung nach Energieträger. Wähle ein Bundesland auf der Karte.</p>}
   {review?<p>Wie erzeugt deine Region Strom? Vergleiche die modellierte stündliche Erzeugung in 13 Regionen oder die Jahresmengen der 16 Bundesländer. Beide Ansichten zeigen Erzeugung, nicht den Verbrauch inklusive Stromimporten.</p>:<p>Wie viel Strom erzeugen die Bundesländer aus Wind, Solar, Kohle und weiteren Energieträgern? Vergleiche die Jahresmengen {nested&&data?`für ${data.year} `:''}– im laufenden Jahr bis zum verfügbaren Datenstand. Die regionalen Werte sind teilweise modelliert; Wind auf See wird separat ausgewiesen.</p>}</header>}
   {hero&&<p id="state-electricity-heading" className={styles.period}>{data?.year} bisher · Jahresstrommengen nach Bundesland, teilweise modelliert. Wind auf See wird separat ausgewiesen.</p>}
   {review?<RegionalElectricityViews sceneContext={sceneContext} shapes={shapes} annual={data} hourly={hourly}/>:<StateElectricityMap nested={nested} hero={hero} sceneContext={sceneContext} shapes={shapes} initialData={data}/>}
  </div>
 </section>;
}
