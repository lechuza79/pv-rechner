"use client";
import type {RefObject} from 'react';
import ResultOverview from '../../../../components/calculator/ResultOverview';
import StatCard from '../../../../components/calculator/ResultStatCard';
import PvResultRace from './PvResultRace';
import {YEARS} from '../../../../lib/constants';
import type {calc} from '../../../../lib/calc';
import '../pv-flow.css';
import '../../../../components/calculator/result-design.css';

/** Complete PV result, shared by the calculator and presentations. */
export default function PvResultOverview({id='pv-ueberblick',result,scenarioLabel,progress,anchor,heroRef,onScenario,onDetails,onSettings,resultRevision=0,consumption,price,rate,monthlyConsumption,autoplay,autarkie,presentation=false,showChart=true}:{
 id?:string;result:ReturnType<typeof calc>;scenarioLabel:string;progress:number;anchor:RefObject<HTMLDivElement|null>;heroRef?:RefObject<HTMLDivElement|null>;
 onScenario:()=>void;onDetails:()=>void;onSettings:()=>void;resultRevision?:number;consumption:number;price:number;rate:number;monthlyConsumption:number[];autoplay:boolean;autarkie:number;presentation?:boolean;showChart?:boolean;
}) {
 const be=result.be;
 return (<ResultOverview id={id} saving={Math.round(result.total)} years={YEARS}
              scenarioLabel={scenarioLabel} progress={progress} anchor={anchor} heroRef={heroRef}

              onScenario={onScenario}
              onDetails={onDetails} onSettings={onSettings}
              presentation={presentation} chart={showChart ? <PvResultRace key={resultRevision} result={result} consumption={consumption} price={price} rate={rate} monthlyConsumption={monthlyConsumption} autoplay={autoplay} /> : null}
              stats={<>
                <StatCard label="Amortisation" value={be ? String(be.i) : `>${YEARS}`} unit="Jahre" help="Zeit, bis Stromersparnis und Einspeiseerlöse die Anschaffung nach Förderung ausgeglichen haben." />
                <StatCard label="Vorteil im 1. Jahr" value={Math.round(result.years[1].j).toLocaleString("de-DE")} unit="€" help="Vermiedene Stromkosten plus Einspeiseerlöse im ersten Jahr." />
                <StatCard label="Autarkie" value={String(autarkie)} unit="%" help="Anteil deines Stromverbrauchs, den deine Anlage selbst deckt." />
              </>}>
              <p className="wp-result-summary">Deine PV-Anlage amortisiert sich {be ? <>in <strong>{be.i} Jahren</strong></> : <>nicht innerhalb von {YEARS} Jahren</>}. Über {YEARS} Jahre zahlst du insgesamt <strong>{Math.round(Math.abs(result.total)).toLocaleString("de-DE")} € {result.total >= 0 ? "weniger" : "mehr"}</strong> als nur mit Netzstrom. Anschaffung nach Förderung, Reststrom, Einspeiseerlöse und gegebenenfalls Speichertausch sind eingerechnet.</p>
            </ResultOverview>);
}
