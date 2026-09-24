"use client";

import InlineEdit from "./InlineEdit";
import { HEATING_INVESTMENT } from "../lib/heating-investment";
import type { HeatPumpResult } from "../lib/heatpump";

type CostCase = Pick<HeatPumpResult, "investNetto" | "gasInvest" | "tcoEinsparung" | "amortisationsJahre">;
interface Props {
  wpInvestment: number;
  referenceInvestment: number;
  referenceLabel: string;
  fuelKind: "gas" | "oil";
  wpType: "lwwp" | "swwp";
  heatLoadKw: number;
  costClassKw: number;
  wpInvestmentEntered: boolean;
  referenceInvestmentEntered: boolean;
  onWpInvestmentChange: (value: number) => void;
  onReferenceInvestmentChange: (value: number) => void;
  sensitivity?: { central: CostCase; favorable: CostCase; adverse: CostCase };
}

/** Values and stress cases must come from the displayed calculator inputs. */
export default function HeatPumpInvestmentAssumptions({
  wpInvestment, referenceInvestment, referenceLabel, fuelKind, wpType,
  heatLoadKw, costClassKw, wpInvestmentEntered, referenceInvestmentEntered,
  onWpInvestmentChange, onReferenceInvestmentChange, sensitivity,
}: Props) {
  const euro = (n: number) => `${Math.round(n).toLocaleString("de-DE")} €`;
  const payback = (n: number | null) => n === null ? "nicht im Rechenzeitraum"
    : n === 0 ? "ohne Mehrpreis" : `${n} ${n === 1 ? "Jahr" : "Jahre"}`;
  const varies = !wpInvestmentEntered || (!referenceInvestmentEntered && referenceInvestment > 0);
  const estimateLabel = wpInvestmentEntered || referenceInvestmentEntered
    ? (varies ? "Kostenschätzung mit eigenen Preisangaben" : "Eigene Preisangaben")
    : "Marktpreisbasierte Kostenschätzung";
  return <div className="wp-building-comparison-note" data-testid="wp-investment-assumptions">
    <p>
      <strong>{estimateLabel}:</strong>{" "}
      Wärmepumpe nach Förderung{" "}
      <InlineEdit value={wpInvestment} onCommit={onWpInvestmentChange} unit=" €" min={0} max={100000} />;
      {" "}{referenceInvestment === 0 ? `Weiterbetrieb deiner ${referenceLabel}` : `neue ${referenceLabel}`}{" "}
      <InlineEdit value={referenceInvestment} onCommit={onReferenceInvestmentChange} unit=" €" min={0} max={40000} />.
    </p>
    <p>
      {wpInvestmentEntered
        ? "Dein eingetragener Wärmepumpenpreis bleibt für alle Dämmvarianten gleich."
        : wpType === "lwwp"
          ? "Bei der Wärmepumpe ändern sich die Kosten für Anlage und Basismontage mit der Größe. Für die übrigen Arbeiten rechnen wir einen festen Betrag."
          : "Für Erdwärme rechnen wir weiterhin mit einer eigenen Kostenschätzung einschließlich Erschließung."}{" "}
      {referenceInvestment === 0
        ? "Für die vorhandene Heizung rechnen wir ohne Neuanschaffung."
        : referenceInvestmentEntered
          ? `Dein eingetragener Preis für die ${referenceLabel} bleibt für alle Dämmvarianten gleich.`
          : fuelKind === "gas"
            ? `Der Anschaffungspreis der Gasheizung einschließlich Einbau folgt dem Leistungsbedarf.${heatLoadKw < HEATING_INVESTMENT.gas.minKw ? " Unter 10 kW verwenden wir dieselbe kleine Kostenreferenz." : ""}`
            : "Für Öl bleibt die eigene Kostenreferenz einer Komplettanlage mit Tank angesetzt."}{" "}
      Ersparnis und Amortisation gelten unter diesen Annahmen. Die Beträge lassen sich anhand vergleichbarer Angebote anpassen.
    </p>
    <details>
      <summary>Preisannahmen und Einfluss auf das Ergebnis</summary>
      {!wpInvestmentEntered && wpType === "lwwp" && <p>
        Grundlage sind ausgewertete Wärmepumpenangebote der Verbraucherzentrale und veröffentlichte KWW-Planungskosten.
        Für die Übertragung auf dein Haus ergänzen wir Annahmen zu Anlagengröße und Einbauaufwand.
      </p>}
      <p>
        Gas: veröffentlichte KWW-Kostenkurve mit Einbau. Unter 10 kW ist der gleiche
        Referenzpreis eine Modellannahme, keine technische Mindestleistung.
        Luft-Wasser-Wärmepumpe: KWW-Kosten für Anlage und Basismontage, am
        Angebotsniveau der Verbraucherzentrale ausgerichtet. Unter 5 kW verwenden
        wir dieselbe kleine Kostenreferenz.
      </p>
      <p>
        Die geschätzte Wärmepumpengröße ({costClassKw.toLocaleString("de-DE")} kW)
        dient hier zur Preiszuordnung. Sie ersetzt keine Geräteauslegung.
        Warmwasserspeicher und Einbauaufwand sind pauschal berücksichtigt;
        besondere Anforderungen können den Preis verändern. Ein gewählter
        Heizkörpertausch wird zusätzlich angesetzt.
        {" "}<a href={HEATING_INVESTMENT.kwwSource} target="_blank" rel="noopener noreferrer">KWW-Kostendaten</a>
        {" · "}<a href={HEATING_INVESTMENT.vzSource} target="_blank" rel="noopener noreferrer">Verbraucherzentrale: Angebotsauswertung</a>
      </p>
      {sensitivity && varies && <>
        <p>
          Was wäre bei anderen Anschaffungspreisen? Wir variieren geschätzte
          Investitionen vor Förderung um 20 % in Gegenrichtungen und berechnen
          Zuschüsse neu. Eigene Preisangaben bleiben fest. Das sind Rechenbeispiele,
          keine zugesicherte Preisspanne; die Energieannahmen bleiben gleich.
        </p>
        {([
          ["Günstiger für die Wärmepumpe", sensitivity.favorable],
          [estimateLabel, sensitivity.central],
          ["Ungünstiger für die Wärmepumpe", sensitivity.adverse],
        ] as const).map(([label, r]) => <p key={label} data-testid="wp-investment-case">
          <strong>{label}:</strong>{" "}
          Wärmepumpe {euro(r.investNetto)} nach Förderung; {referenceLabel} {euro(r.gasInvest)}.
          {" "}{r.tcoEinsparung >= 0 ? "Ersparnis" : "Mehrkosten"} im Rechenzeitraum: {euro(Math.abs(r.tcoEinsparung))}.
          {" "}Amortisation: {payback(r.amortisationsJahre)}.
        </p>)}
      </>}
    </details>
    <p>Kosten und Förderung der Dämmung sind nicht enthalten.</p>
  </div>;
}
