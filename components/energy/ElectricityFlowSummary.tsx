'use client';
import {type GenerationDataPoint} from '../../lib/energy';
import {PumpedStorageWidget,PhysicalTradeWidget} from './ElectricityFlowWidgets';
import stage from '../EnergyEditorialStage.module.css';
/** Same units for both directions; missing data remains missing, never zero. */
export function ElectricityFlowSummary({editorial=false,point,stale=false,fallback,retrievedAt,renderedAt}:{editorial?:boolean;point?:GenerationDataPoint;stale?:boolean;fallback?:"smard";retrievedAt?:string;renderedAt:string}){
 const storage=<PumpedStorageWidget surface="plain" point={point} stale={stale} fallback={fallback} retrievedAt={retrievedAt} renderedAt={renderedAt}/>;
 const trade=<PhysicalTradeWidget surface="plain" renderedAt={renderedAt}/>;
 if(!editorial)return <>{storage}{trade}</>;
 return <>
 <section className={stage.flowTopic} aria-label="Pumpspeicher in Deutschland">{storage}<p>Pumpspeicherkraftwerke speichern Energie, indem sie Wasser in ein höher gelegenes Becken pumpen. Fließt es zurück, treiben Turbinen Generatoren an. So können sie Strom zeitversetzt bereitstellen. Die Grafik zeigt die aktuelle Leistung beim Laden und bei der Abgabe in Gigawatt – nicht den Füllstand der Speicher. Verschiedene Anlagen können gleichzeitig laden und Strom abgeben.</p></section>
 <section className={stage.flowTopic} aria-label="Stromimporte und Stromexporte">{trade}<p>Deutschland tauscht über das europäische Verbundnetz Strom mit seinen Nachbarländern aus. Importe und Exporte können gleichzeitig stattfinden, etwa an unterschiedlichen Grenzen. Die Gesamtbalken zeigen die physikalischen Stromflüsse; ihre Aufteilung nach Energieträgern wird aus dem jeweiligen Strommix geschätzt. Sämtliche Balken nutzen dieselbe Skala, damit Kategorien und Gesamtleistung direkt vergleichbar bleiben.</p></section>
 </>;
}
