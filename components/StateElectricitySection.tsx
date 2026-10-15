import {stateElectricityGeometry,stateElectricityWater} from '../lib/district-geometry';
import {loadRegionalHourly} from '../lib/co2map-server';
import {CO2_REGIONS} from '../lib/co2map';
import RegionalHourlyMap from './RegionalHourlyMap';
import styles from './StateElectricityMap.module.css';
import foundation from './social/atlas-foundations.module.css';

export default async function StateElectricitySection({hero=false,nested=false,selected="",time="latest"}:{selected?:string;time?:string;nested?:boolean;hero?:boolean}){
 const [shapes,sceneContext,data]=await Promise.all([stateElectricityGeometry(),stateElectricityWater(),loadRegionalHourly().catch(()=>null)]);
 return <section id="bundeslaender" className={`${styles.section} ${hero?styles.heroSection:""} ${nested?styles.overlapAfter:""} ${foundation.foundation}`} data-story-scheme="dark" aria-labelledby="state-electricity-heading">
  <div className={styles.inner}>
   <header className={styles.heading}><h2 id="state-electricity-heading">Strommix nach Bundesland</h2>
    <p>Wie viel Strom erzeugt deine Region aus Wind, Solar und weiteren Energieträgern? Die Karte zeigt die zuletzt verfügbaren modellierten Stundenwerte in Gigawatt. Berlin und Brandenburg, Bremen und Niedersachsen sowie Hamburg und Schleswig-Holstein sind jeweils zusammengefasst.</p>
   </header>
   <RegionalHourlyMap nested initialSelected={CO2_REGIONS.some(([id])=>id===selected)?selected:""} initialTime={data?.hours.some(hour=>hour.ts===time)?time:"latest"} shapes={shapes} sceneContext={sceneContext} initialData={data}/>
  </div>
 </section>;
}
