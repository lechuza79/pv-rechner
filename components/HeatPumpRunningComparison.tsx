"use client";
import Link from "next/link";
import {FUEL} from "../lib/constants";
import {fuelKwhForWpHeat,calcWpGridCost} from "../lib/calc";
import {calcFossilReference,HEATING_YEARS} from "../lib/fossil-reference";
import {DEFAULT_HEATPUMP_CONFIG} from "../lib/heatpump-config";
import {CategoryBarChart} from "./charts/CategoryBarChart";
import OptionalDisclosure from "./OptionalDisclosure";
import {ChoiceButtons} from "./AccordionField";

/** Shared running-cost comparison; excludes both heating investments. */
export default function HeatPumpRunningComparison({strompreis,wpKwh,jaz,wpAutarky,stromSteigerung,gasSteigerung,fuelType="gas",setFuelType}:{strompreis:number;wpKwh:number;jaz:number;wpAutarky:number;stromSteigerung:number;gasSteigerung:number;fuelType?:"gas"|"oil";setFuelType?:(value:"gas"|"oil")=>void}) {
        // WP-spezifische PV-Deckung aus der Stunden-Jahressimulation (pv-sim), NICHT
        // die Haushalts-Jahres-Autarkie: Die WP zieht ~80 % ihres Stroms im dunklen
        // Winterhalbjahr, wo die reale PV-Deckung weit unter dem Jahresmittel liegt.
        // Die Jahres-Autarkie hätte die WP-Deckung grob verdoppelt und die 25-J-
        // Ersparnis geschönt. Wärme = wpKwh × JAZ (gebäudebasiert, konsistent zum
        // WP-Strom oben) statt fixer COP 3,5; Strompreis-Anstieg folgt dem gewählten
        // Szenario (±1/3/5 %) statt fixer +3 %.
        const wpCoverage = Math.min(wpAutarky / 100, 1);
        // Dieser Block vergleicht LAUFENDE Kosten: Hier steht keine Kaufentscheidung
        // an — die Wärmepumpe ist im Rechner-Flow vorhanden oder geplant, und über die
        // fossile Heizung wird gar nichts ausgesagt. Deshalb trägt keine der beiden
        // Seiten eine Anschaffung (fossilInvest: 0), und deshalb greift auch die
        // Beimischungspflicht nicht: § 43 Abs. 1 GModG gilt nur für Heizungen, die neu
        // eingebaut werden. Bis 28.07.2026 rechnete der Block den Grüngas-Aufschlag
        // trotzdem — Pflicht ohne Neueinbau, also zwei Hälften verschiedener Fälle.
        //
        // Die Regel schreiben wir hier NICHT aus, sondern fragen sie: greenGas wird
        // angefragt, calcFossilReference entscheidet über greenGasApplies(). Bekäme
        // der Block eines Tages doch eine Anschaffung, käme der Aufschlag von selbst
        // wieder — und der Hinweistext unten hängt am Ergebnis-Flag, nicht an einer
        // zweiten Formulierung derselben Regel.
        //
        // Grundpreis und Wartung stehen auf BEIDEN Seiten (Quelle für beide:
        // lib/fossil-reference.ts) — eine Seite damit zu belasten und die andere nicht
        // war genau der Fehler, den der Wärmepumpen-Rechner am 28.07.2026 korrigiert hat.
        const ref = calcFossilReference({
          fuelKind: fuelType,
          fuelKwh: fuelKwhForWpHeat(wpKwh, fuelType, jaz),
          years: HEATING_YEARS,
          pricePerKwh: FUEL[fuelType].price,
          co2PerKwh: FUEL[fuelType].co2PerKwh,
          inflation: gasSteigerung,
          fossilInvest: 0,
          greenGas: true,
        });
        const fuelCost = ref.total;
        // Match the PV calculation's shared household meter and electricity price.
        // A separate heat-pump tariff needs an explicit metering model; do not
        // assume it while valuing the same solar electricity at household prices.
        const wpGridCost = calcWpGridCost(wpKwh, wpCoverage, strompreis, stromSteigerung, HEATING_YEARS)
          + DEFAULT_HEATPUMP_CONFIG.wpMaintenance * HEATING_YEARS;
        return (
          <div className="pv-technical-block">
            <OptionalDisclosure descriptionAsHelp label="Details" heading="Heizkosten im Vergleich" description={<>Laufende Kosten über {HEATING_YEARS} Jahre · ohne Anschaffung und Förderung</>}>
            <p>{Math.round(wpKwh * jaz).toLocaleString("de-DE")} kWh Wärmebedarf pro Jahr · {Math.round(wpCoverage * 100)} % des Heizstroms aus PV. Netzstrom zum Haushaltsstrompreis von {(strompreis * 100).toLocaleString("de-DE", {maximumFractionDigits:1})} ct/kWh am gemeinsamen Hauszähler, wie in deiner PV-Rechnung. Die Wartung der Wärmepumpe ist enthalten; ein zusätzlicher Zählergrundpreis fällt hier nicht an. Ein separater Wärmepumpentarif mit passendem Messkonzept ist nicht vorausgesetzt.</p>
            <p>{!ref.greenGasApplied && "Ohne Aufschläge für einen neu eingebauten fossilen Heizkessel. "}Den vollständigen Heizungstausch mit Anschaffung und Förderung vergleicht der <Link href="/waermepumpe-rechner">Wärmepumpen-Rechner</Link>.</p>
            </OptionalDisclosure>
            <CategoryBarChart orientation="horizontal" paired unit="€" label="Heizkosten im Vergleich" rows={[{id:"fossil",label:FUEL[fuelType].refLabel,labelContent:setFuelType?<ChoiceButtons segmented options={["gas","oil"] as const} selected={fuelType==="gas"?0:1} onSelect={i=>setFuelType(i===0?"gas":"oil")} render={fuel=>FUEL[fuel].label}/>:undefined,value:fuelCost},{id:"heatpump",label:"Wärmepumpe mit PV",value:wpGridCost,highlighted:true}]}/>
          </div>
        );

}
