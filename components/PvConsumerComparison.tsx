"use client";
import {useState,type ReactNode} from "react";
import OptionalDisclosure from "./OptionalDisclosure";
import InlineEdit from "./InlineEdit";
import {CategoryBarChart} from "./charts/CategoryBarChart";
import HeatPumpRunningComparison from "./HeatPumpRunningComparison";
import type {PvConsumerValues,PvConsumerKind} from "./PvConsumerFields";
import {calcWpAnnualElectricity,calcJAZ,flowTempForSystem,heatPumpScenarioAdj} from "../lib/heatpump";
import {HAUSTYP_WP,PERSONEN,NUTZUNG} from "../lib/constants";
import {calcEaAnnual,EA_KWH_PER_KM,KLIMA_DEFAULT_M2} from "../lib/consumption";
import {simulatePvYear} from "../lib/pv-sim";

function ComparisonFrame({standalone,label,children}:{standalone:boolean;label:string;children:ReactNode}) {
  return standalone ? <div className="pv-technical-block">{children}</div> : <OptionalDisclosure label={label}>{children}</OptionalDisclosure>;
}

/** Consumer comparisons stay separate from the PV investment benefit. */
export default function PvConsumerComparison({standalone=false,fuelType,setFuelType,kind,values:v,personen,baseKwh,kwp,speicherKwh,ertragKwp,monthly,klimaKwh,strompreis,scenario,fullFeedIn}:{standalone?:boolean;fuelType:"gas"|"oil";setFuelType:(value:"gas"|"oil")=>void;kind:PvConsumerKind;values:PvConsumerValues;personen:number;baseKwh:number;kwp:number;speicherKwh:number;ertragKwp:number;monthly:number[]|null;klimaKwh:number;strompreis:number;scenario:string;fullFeedIn:boolean}) {
  const [litres,setLitres]=useState(7);
  const [fuelPrice,setFuelPrice]=useState(1.8);
  const heat=calcWpAnnualElectricity({situation:"bestand",wohnflaeche:v.wpWohnflaeche,insulationIdx:v.wpInsulation,personen:PERSONEN[personen].count,heizsystem:v.wpHeizsystem,wpType:"lwwp",haustypFaktor:HAUSTYP_WP[v.wpHaustyp].faktor});
  const sim=simulatePvYear({kwp,speicherKwh,ertragKwp,monthlyYieldPerKwp:monthly,household:{baseKwh,tagQuote:NUTZUNG[v.nutzung].tagQuote,wpActive:v.wp!=="nein",eaActive:v.ea!=="nein",klimaActive:v.klima!=="nein",wpAnnualKwh:heat,eaAnnualKwh:calcEaAnnual(v.eaKm),klimaM2:KLIMA_DEFAULT_M2,klimaAnnualKwh:klimaKwh}});
  if(kind === "klima") return <ComparisonFrame standalone={standalone} label="Klimaanlage">

    <OptionalDisclosure descriptionAsHelp label="Details" heading="Kühlkosten im Vergleich" description="Stromkosten pro Jahr"><p>Geschätzter Strombedarf für {v.klimaRooms} gekühlte Räume. Verglichen wird derselbe Kühlbedarf mit und ohne Solarstrom. Gegenüber einem Haushalt ohne Klimaanlage entstehen zusätzliche Kühlkosten.</p></OptionalDisclosure>    <CategoryBarChart orientation="horizontal" paired unit="€" label="Kühlstromkosten pro Jahr" rows={[{id:"cooling",label:"Klimaanlage ohne PV",value:klimaKwh*strompreis},{id:"solar-cooling",label:"Klimaanlage mit PV",value:klimaKwh*strompreis*(1-(fullFeedIn?0:sim.klimaAutarky)/100)}]}/>
  </ComparisonFrame>;
  if(kind === "ea") {
    const fuelCost=v.eaKm/100*litres*fuelPrice;
    const electricCost=calcEaAnnual(v.eaKm)*strompreis*(1-(fullFeedIn?0:sim.eaAutarky)/100);
    return <ComparisonFrame standalone={standalone} label="Mit Verbrenner vergleichen">


      <OptionalDisclosure descriptionAsHelp label="Details" heading="Fahrkosten im Vergleich" description="Energiekosten pro Jahr · ohne Anschaffung und Wartung">
      <p>{v.eaKm.toLocaleString("de-DE")} km/Jahr. Beispielannahmen für deinen Verbrenner – bitte anpassen:</p>
      <p>Verbrauch: <InlineEdit value={litres} onCommit={setLitres} min={1} max={30} unit=" l/100 km"/></p>
      <p>Kraftstoffpreis: <InlineEdit value={fuelPrice} onCommit={setFuelPrice} min={0.1} max={5} unit=" €/l"/></p>
      <p>E-Auto mit {EA_KWH_PER_KM*100} kWh/100 km und {(strompreis*100).toLocaleString("de-DE",{maximumFractionDigits:1})} ct/kWh Netzstrom zuhause. Öffentliche Ladetarife, Anschaffung, Wartung, Versicherung und Steuern sind nicht enthalten. {Math.round(fullFeedIn?0:sim.eaAutarky)} % des Ladestroms kommen in der Stundensimulation aus PV und Speicher. Die Einsparung hier betrifft Energiekosten; entgangene Einspeiseerlöse und die PV-Anschaffung berücksichtigt die globale PV-Rechnung.</p>
      </OptionalDisclosure>      <CategoryBarChart orientation="horizontal" paired unit="€" label="Fahrenergiekosten pro Jahr" rows={[{id:"fuel",label:"Verbrenner",value:fuelCost},{id:"electric",label:"E-Auto mit PV",value:electricCost,highlighted:true}]}/>
    </ComparisonFrame>;
  }
  const inflation=heatPumpScenarioAdj(scenario);
  return <ComparisonFrame standalone={standalone} label="Mit Gasheizung vergleichen">
    <HeatPumpRunningComparison strompreis={strompreis} fuelType={fuelType} setFuelType={setFuelType} wpKwh={heat} jaz={calcJAZ("lwwp",flowTempForSystem(v.wpHeizsystem))} wpAutarky={fullFeedIn?0:sim.wpAutarky} stromSteigerung={inflation.stromInflation} gasSteigerung={inflation.gasInflation}/>
  </ComparisonFrame>;
}
