"use client";
import InlineEdit from './InlineEdit';
export interface PvPlantValues {kwp:number;spKwh:number;invest:number;strom:number;verbrauch:number;ertrag:number;ev:number}
/** The same plant fields in result settings and editorial examples. */
export default function PvPlantFields({values:draft,update,ertragMin,ertragMax,showSelfConsumption=true}:{values:PvPlantValues;update:(patch:Partial<PvPlantValues>)=>void;ertragMin:number;ertragMax:number;showSelfConsumption?:boolean}) {
  return <>
                  <div>Anlagenleistung: <InlineEdit value={draft.kwp} onCommit={kwp => update({kwp})} unit=" kWp" min={1} max={50} step={0.5} /></div>
                  <div>Speichergröße: <InlineEdit value={draft.spKwh} onCommit={spKwh => update({spKwh})} unit=" kWh" min={0} max={30} step={0.5} /></div>
                  <div>Anschaffung vor Förderung: <InlineEdit value={draft.invest} onCommit={invest => update({invest})} unit=" €" min={500} max={200000} step={500} /></div>
                  <p>Bei einer anderen Anlagen- oder Speichergröße schätzen wir die Kosten neu, sofern du keinen neuen Preis einträgst.</p>
                  <div>Strompreis: <InlineEdit value={draft.strom * 100} onCommit={strom => update({strom:strom / 100})} unit=" ct/kWh" min={5} max={100} step={1} /></div>
                  <div>Haushaltsverbrauch ohne Großverbraucher: <InlineEdit value={draft.verbrauch} onCommit={verbrauch => update({verbrauch})} unit=" kWh/Jahr" min={500} max={30000} step={100} /></div>
                  <div>Ertrag deines Dachs: <InlineEdit value={draft.ertrag} onCommit={ertrag => update({ertrag})} unit=" kWh/kWp" min={ertragMin} max={ertragMax} step={10} /></div>
                  {showSelfConsumption && <div>Eigenverbrauch: <InlineEdit value={draft.ev} onCommit={ev => update({ev})} unit=" %" min={5} max={95} step={1} /></div>}
  </>;
}
