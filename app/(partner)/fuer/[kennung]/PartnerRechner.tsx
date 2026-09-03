"use client";

import dynamic from "next/dynamic";

/**
 * Der volle PV-Rechner auf der betriebseigenen Seite.
 *
 * `sharePfad` ist Pflicht und nicht Kosmetik: Der Rechner baut seinen
 * Teilen-Link sonst aus der Adresse der Seite, auf der er gerade steht. Hier
 * wäre das die Partner-Adresse — ein geteilter Link führte dann auf eine
 * Seite, die für Suchmaschinen gesperrt ist und einen fremden Firmennamen im
 * Kopf trägt. Dieselbe Falle war beim Rechner im Fenster schon einmal offen.
 */
const PVRechner = dynamic(() => import("../../../(site)/photovoltaik-rechner/rechner"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        padding: "48px 0",
        textAlign: "center",
        color: "var(--color-text-muted)",
        fontSize: "var(--font-size-small)",
      }}
    >
      Rechner wird geladen …
    </div>
  ),
});

export default function PartnerRechner({
  kennung,
  name,
  initialParams,
}: {
  kennung: string;
  name: string;
  initialParams?: Record<string, string | string[] | undefined>;
}) {
  return (
    <PVRechner
      sharePfad={`/fuer/${kennung}`}
      partner={{ kennung, name }}
      initialParams={initialParams}
    />
  );
}
