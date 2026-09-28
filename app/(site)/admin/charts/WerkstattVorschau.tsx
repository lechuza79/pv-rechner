"use client";

import Script from "next/script";
import type { ComponentProps, ReactNode } from "react";
import { WidgetActionsPresentation } from "../../../../components/dashboard/ExportableWidgetFrame";
import { EnergyMonitor } from "../../../../components/dashboard/EnergyMonitor";
import LandkreisMonitor, { useRegionalMonitorWidgets } from "../../../../components/landkreis/LandkreisMonitor";
import { gemeindeMonitorWidgets } from "../../../../components/gemeinde/GemeindeMonitor";
import DistrictRaceWidget, { type RaceWording } from "../../../../components/landkreis/DistrictRaceWidget";
import type { GemeindePaket } from "../../../../lib/gemeinde-paket";
import type { DistrictPrepared } from "../../../../lib/district-monitor-server";
import { v } from "../../../../lib/theme";
import type { MonitorSchluessel } from "./werkstatt-bestand";

export type VorschauDaten =
  | {
      art: "region";
      name: string;
      stand: string;
      prepared: DistrictPrepared;
      monitor: ComponentProps<typeof LandkreisMonitor>;
      race: { wording: RaceWording; rows: ComponentProps<typeof DistrictRaceWidget>["rows"]; history: ComponentProps<typeof DistrictRaceWidget>["history"] } | null;
    }
  | { art: "gemeinde"; name: string; stand: string; paket: GemeindePaket };

const ENERGIE = ["electricity-value", "feed-in-value", "radial", "energy-year"] as const;
type EnergieSchluessel = (typeof ENERGIE)[number];
const istEnergie = (s: MonitorSchluessel): s is EnergieSchluessel => (ENERGIE as readonly string[]).includes(s);

function Fehlt({ text }: { text: string }) {
  return <p role="status" style={{ margin: "12px 0", padding: "10px 12px", borderRadius: 10, border: `1px solid ${v("--color-border")}`, fontSize: v("--font-size-small"), color: v("--color-text-secondary") }}>{text}</p>;
}

type Knoten = {
  currentPower: ReactNode;
  growth: ReactNode;
  categories: ReactNode;
  composition: ReactNode;
  energy?: Partial<Record<EnergieSchluessel, ReactNode>>;
  energyNotice?: ReactNode;
};

/**
 * Places the chosen widget in the shared monitor composition (EnergyMonitor),
 * so section, grid and theme are the page's — only the other slots stay empty.
 */
function ImMonitor({ schluessel, knoten, name }: { schluessel: MonitorSchluessel; knoten: Knoten; name: string }) {
  const nicht = (was: string) => <Fehlt text={`${was} liegt für ${name} nicht vor. Die Seite zeigt es dort ebenfalls nicht.`} />;
  if (schluessel === "currentPower") return knoten.currentPower ? <EnergyMonitor currentPower={knoten.currentPower} /> : nicht("„Solarleistung heute“ (keine installierte Solarleistung)");
  if (schluessel === "growth") return knoten.growth ? <EnergyMonitor growth={knoten.growth} /> : nicht("„Zubau pro Jahr“ (keine Inbetriebnahmen im Register)");
  if (schluessel === "categories") return knoten.categories ? <EnergyMonitor stock={knoten.categories} /> : nicht("„Solarleistung nach Anlagentyp“");
  if (schluessel === "composition") return knoten.composition ? <EnergyMonitor stock={knoten.composition} /> : nicht("„Anteil an Anzahl und Solarleistung“");
  if (istEnergie(schluessel)) {
    const node = knoten.energy?.[schluessel];
    return <>
      {!node && nicht("Dieses Energie-Widget")}
      {(node || knoten.energyNotice) && <EnergyMonitor energy={node ? { [schluessel]: node } : undefined} energyNotice={knoten.energyNotice} />}
    </>;
  }
  return null;
}

function RegionKnoten({ daten, schluessel }: { daten: Extract<VorschauDaten, { art: "region" }>; schluessel: MonitorSchluessel }) {
  const w = useRegionalMonitorWidgets(daten.monitor);
  return <ImMonitor schluessel={schluessel} name={daten.name} knoten={{ ...w, composition: w.composition.length ? w.composition : null }} />;
}

function GemeindeKnoten({ daten, schluessel }: { daten: Extract<VorschauDaten, { art: "gemeinde" }>; schluessel: MonitorSchluessel }) {
  const w = gemeindeMonitorWidgets(daten.paket);
  const nach = (template: string) => {
    const treffer = w.stock.filter((s) => s.template === template);
    return treffer.length ? treffer.map((s) => s.node) : null;
  };
  return <ImMonitor schluessel={schluessel} name={daten.name} knoten={{ ...w, categories: nach("anteilsdonut"), composition: nach("anlagenraster"), energy: w.energy }} />;
}

/** One real widget, with the chosen action presentation applied to every shared frame below. */
export default function WerkstattVorschau({ schluessel, daten, aktionen }: { schluessel: MonitorSchluessel; daten: VorschauDaten; aktionen: "menu" | "primary" }) {
  let inhalt: ReactNode;
  if (schluessel === "race") {
    inhalt = daten.art === "region" && daten.race ? <>
      {/* The race engine is a classic script (as on the regional page, GemeindeSkripte). */}
      <Script src="/gemeinde/landkreis-rennen.js" strategy="afterInteractive" onReady={() => { window.dispatchEvent(new Event("district-race-ready")); }} />
      <DistrictRaceWidget name={daten.name} stand={daten.stand} wording={daten.race.wording} rows={daten.race.rows} history={daten.race.history} />
    </> : <Fehlt text={`Für ${daten.name} gibt es kein Rennen: es braucht mindestens zwei Teilgebiete.`} />;
  } else inhalt = daten.art === "region" ? <RegionKnoten daten={daten} schluessel={schluessel} /> : <GemeindeKnoten daten={daten} schluessel={schluessel} />;
  return <WidgetActionsPresentation.Provider value={aktionen}>
    <div style={{ marginTop: 12, maxWidth: 1100 }}>{inhalt}</div>
  </WidgetActionsPresentation.Provider>;
}
