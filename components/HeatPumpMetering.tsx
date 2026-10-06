"use client";
import { useMemo, useState } from "react";
import InfoTooltip from "./InfoTooltip";
import InlineEdit from "./InlineEdit";
import { simulatePvYear } from "../lib/pv-sim";
import type { HouseholdProfile } from "../lib/consumption";
import { DEFAULT_HEATPUMP_CONFIG } from "../lib/heatpump-config";
import { HEATING_YEARS } from "../lib/fossil-reference";
import { empfiehlMesskonzept, PARAGRAF_14A, type MesskonzeptId } from "../lib/wp-messkonzept";

const OPTIONEN: Record<MesskonzeptId, { name: string; plus: string; minus: string }> = {
  gemeinsam: {
    name: "Gemeinsamer Zähler",
    plus: "Kein Umbau, und dein Solarstrom versorgt die Wärmepumpe mit.",
    minus: `Nur ein pauschaler Netzentgelt-Rabatt von ${PARAGRAF_14A.modul1EuroProJahr.min} bis ${PARAGRAF_14A.modul1EuroProJahr.max} € im Jahr, je nach Netzgebiet.`,
  },
  getrennt: {
    name: "Eigener Zähler",
    plus: "Die Wärmepumpe bezieht Netzstrom zum günstigeren Wärmepumpentarif.",
    minus: "Zweiter Zähler mit Grundpreis und Umbau. In der üblichen Schaltung fließt kein Solarstrom in die Wärmepumpe.",
  },
  kaskade: {
    name: "Eigener Zähler mit Kaskade",
    plus: "Günstiger Wärmepumpentarif, und dein Solarstrom versorgt die Wärmepumpe trotzdem.",
    minus: "Aufwendigste Verschaltung: Ein Elektrofachbetrieb muss den Zählerplatz umbauen.",
  },
};

const euro = (value: number) => `${Math.round(value).toLocaleString("de-DE")} €`;

/** Which metering for the heat pump costs least with this PV system. */
export default function HeatPumpMetering({ kwp, speicherKwh, ertragKwp, monthly, household, strompreis, einspeiseSatzCt }: {
  kwp: number;
  speicherKwh: number;
  ertragKwp: number;
  monthly: number[] | null;
  household: HouseholdProfile;
  strompreis: number;
  einspeiseSatzCt: number;
}) {
  const [umbau, setUmbau] = useState(0);
  const cfg = DEFAULT_HEATPUMP_CONFIG;
  const sims = useMemo(() => ({
    mit: simulatePvYear({ kwp, speicherKwh, ertragKwp, monthlyYieldPerKwp: monthly, household }),
    ohne: simulatePvYear({ kwp, speicherKwh, ertragKwp, monthlyYieldPerKwp: monthly, household: { ...household, wpActive: false } }),
  }), [kwp, speicherKwh, ertragKwp, monthly, household]);
  const ergebnis = empfiehlMesskonzept({
    mitWp: sims.mit,
    ohneWp: sims.ohne,
    haushaltsPreis: strompreis,
    wpTarif: cfg.wpTarif,
    wpZaehlerGrundpreis: cfg.wpFixCostPerYear,
    einspeiseSatz: einspeiseSatzCt / 100,
    umbauKosten: umbau,
  }, HEATING_YEARS);
  if (sims.mit.wpLoadKwh <= 0) return null;

  // Without an entered conversion cost, a second meter must not be recommended
  // outright: its advantage is stated as the conversion cost it can carry.
  const kosten = Object.fromEntries(ergebnis.kosten.map(k => [k.id, k])) as Record<MesskonzeptId, (typeof ergebnis.kosten)[number]>;
  const zweiterZaehler = (["kaskade", "getrennt"] as const)
    .map(id => ({ id, vorteilMin: kosten.gemeinsam.min - kosten[id].max, vorteilMax: kosten.gemeinsam.max - kosten[id].min }))
    .sort((a, b) => b.vorteilMax - a.vorteilMax)[0];
  const empfehlung = umbau === 0 && Math.round(zweiterZaehler.vorteilMax) >= 1
    ? Math.round(zweiterZaehler.vorteilMin) >= 1
      ? `Mit „${OPTIONEN[zweiterZaehler.id].name}" sparst du rund ${euro(zweiterZaehler.vorteilMin)} bis ${euro(zweiterZaehler.vorteilMax)} im Jahr gegenüber dem gemeinsamen Zähler. Das lohnt sich, wenn der Umbau weniger als ${euro(Math.round(zweiterZaehler.vorteilMin) * HEATING_YEARS)} bis ${euro(Math.round(zweiterZaehler.vorteilMax) * HEATING_YEARS)} kostet (über ${HEATING_YEARS} Jahre). Trag dein Angebot ein, dann rechnen wir es genau.`
      : `Ob sich „${OPTIONEN[zweiterZaehler.id].name}" lohnt, hängt vom Pauschalrabatt deines Netzbetreibers ab: Im besten Fall sparst du rund ${euro(zweiterZaehler.vorteilMax)} im Jahr, im ungünstigsten bleibt der gemeinsame Zähler günstiger. Den Umbau musst du dann noch abziehen.`
    : ergebnis.empfohlen
      ? `Bei deinen Angaben ist der Weg „${OPTIONEN[ergebnis.empfohlen].name}" am günstigsten.`
      : `Das hängt von deinem Netzbetreiber ab: Je nach Höhe seines Pauschalrabatts ist „${OPTIONEN[ergebnis.kandidaten[0]].name}" oder „${OPTIONEN[ergebnis.kandidaten[1]].name}" günstiger.`;
  const markiert = umbau === 0 && Math.round(zweiterZaehler.vorteilMax) >= 1 ? null : ergebnis.empfohlen;

  return (
    <div className="pv-technical-block" data-testid="wp-messkonzept">
      <div className="sc-disclosure-heading"><div className="sc-disclosure-title"><h3>Stromzähler für die Wärmepumpe</h3><InfoTooltip ariaLabel="Informationen: Stromzähler für die Wärmepumpe" size={16}>
        Stromkosten pro Jahr für Haushalt und Wärmepumpe zusammen, abzüglich Einspeisevergütung, zu heutigen Preisen.
        Angenommener Wärmepumpentarif {(cfg.wpTarif * 100).toLocaleString("de-DE")} ct/kWh, Grundpreis des zweiten Zählers {cfg.wpFixCostPerYear} € im Jahr.
        Die Netzentgelt-Rabatte nach der Festlegung der Bundesnetzagentur (Stand {PARAGRAF_14A.modul1Stand}) gelten für steuerbare Wärmepumpen mit mehr als 4,2 kW Netzanschlussleistung, die seit 2024 angeschlossen wurden; ältere können wechseln, ein Zurück ist dann nicht möglich.
        Der Umbau des Zählerplatzes ist nicht enthalten, solange du keinen Betrag einträgst. Das PV-Ergebnis oben rechnet mit dem gemeinsamen Zähler.
      </InfoTooltip></div></div>
      <p>{empfehlung}</p>
      <ul className="pv-metering-options">
        {ergebnis.kosten.map(k => {
          const option = OPTIONEN[k.id];
          const betrag = k.min === k.max ? euro(k.max) : `${euro(k.min)} bis ${euro(k.max)}`;
          const empfohlen = markiert === k.id;
          return (
            <li key={k.id} data-messkonzept={k.id} aria-current={empfohlen ? "true" : undefined}>
              <strong>{option.name}{empfohlen && " · empfohlen"}</strong>
              <span>{betrag} pro Jahr{k.umbau > 0 && `, dazu ${euro(k.umbau)} Umbau`}</span>
              <span>+ {option.plus}</span>
              <span>− {option.minus}</span>
            </li>
          );
        })}
      </ul>
      <p>
        Umbau für einen zweiten Zähler laut Angebot: <InlineEdit value={umbau} onCommit={value => setUmbau(Math.max(0, Math.round(value)))} min={0} max={10000} step={50} unit=" €" />
        {umbau > 0 && <> (verteilt auf {HEATING_YEARS} Jahre)</>}
      </p>
    </div>
  );
}
