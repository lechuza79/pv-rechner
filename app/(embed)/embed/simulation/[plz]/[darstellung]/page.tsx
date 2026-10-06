import { notFound } from "next/navigation";
import SimulationWidget from "../../client";
import { WIDGET_METADATA } from "../../meta";
import { SIMULATION_DARSTELLUNGEN, SIMULATION_OHNE_PLZ } from "../../../../../../lib/embed-pfad-weiche";

// Cached twin of `/embed/simulation?plz=…&presentation=…`. The middleware
// normalises the query (an invalid postcode becomes "ohne", exactly what the
// widget did with it before), so the key is a five-digit postcode plus one of
// two presentations. The page renders a client shell without any data read,
// so it is built once per key and kept until the next deployment.
export const metadata = WIDGET_METADATA;

export function generateStaticParams() {
  return [];
}

export default async function SimulationEmbedTwin(props: { params: Promise<{ plz: string; darstellung: string }> }) {
  const { plz, darstellung } = await props.params;
  if (plz !== SIMULATION_OHNE_PLZ && !/^\d{5}$/.test(plz)) notFound();
  if (!(SIMULATION_DARSTELLUNGEN as readonly string[]).includes(darstellung)) notFound();
  return (
    <SimulationWidget
      plz={plz === SIMULATION_OHNE_PLZ ? "" : plz}
      sitePresentation={darstellung === "site"}
    />
  );
}
