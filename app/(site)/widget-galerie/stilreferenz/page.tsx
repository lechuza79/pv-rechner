import type {CSSProperties} from 'react';
import NuclearDailyWidget from '../../../../components/energy/NuclearDailyWidget';
import WidgetPresentation from '../../../../components/dashboard/WidgetPresentation';
import {nuclearEnergyPreviewData} from '../../../../lib/nuclear-preview-server';
import styles from './reference.module.css';
export const dynamic='force-dynamic';
export const metadata={title:'Chart-Stilreferenz · Solar Check',robots:{index:false,follow:false}};
export default async function Page(){
 const asOf=new Date().toISOString();
 const data=await nuclearEnergyPreviewData(new Date(asOf));
 return <main className={styles.page}>
  <a href="/widget-galerie?gruppe=energy">Zur Widgetgalerie</a>
  <h1>Sparkline + Kennzahl</h1>
  <p>Gestaltungsreferenz · Entwurf zur Abstimmung</p>
  <p>Ein Baustein, dieselben echten Daten. Die Breiten prüfen den verfügbaren Platz im Widget; sie legen kein Seitenraster fest.</p>
  <div className={styles.examples}>{([{width:270,height:220},{width:330,height:300},{width:560,height:240}] as const).map(({width,height})=><section key={width} style={{width,maxWidth:'100%','--widget-min-height':`${height}px`} as CSSProperties}>
   <h2>{width} × {height} px</h2>
   <WidgetPresentation appearance={{theme:'dark'}}><NuclearDailyWidget data={data} metric="energy" asOf={asOf}/></WidgetPresentation>
  </section>)}</div>
  <h2>Helle Darstellung</h2>
  <div style={{width:330,maxWidth:'100%'}}><WidgetPresentation appearance={{theme:'light'}}><NuclearDailyWidget data={data} metric="energy" asOf={asOf}/></WidgetPresentation></div>
  <h2>Regeln dieses Bausteins</h2>
  <ul><li>Vergangene Balken im gemeinsamen inaktiven Farbton. Letzter Balken und Kennzahl im Akzent.</li><li>Strommenge in GWh rechts vom Verlauf; Einheit kleiner und direkt unter dem Wert.</li><li>Feine Nulllinie, keine Achsenbeschriftung und keine Schraffuren. Datum, Wert und Datenlücken erscheinen bei Hover, Fokus oder Berührung.</li><li>Die Balkenhöhe nutzt die verfügbare Kartenhöhe. Breite, Abstände und Eckenradius bleiben begrenzt.</li><li>Update bezeichnet den letzten Messpunkt. Ein zusätzlicher Abrufzeitpunkt steht, sofern belegt, in der Hilfe.</li></ul>
 </main>;
}
