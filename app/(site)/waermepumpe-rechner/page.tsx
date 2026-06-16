import { Metadata } from "next";
import { pageMetadata } from "../../../lib/seo";
import Waermepumpe from "./waermepumpe";

export const metadata: Metadata = pageMetadata({
  path: "/waermepumpe-rechner",
  title: "Wärmepumpen-Rechner – Lohnt sich eine Wärmepumpe?",
  description: "Berechne Kosten, Einsparung und CO₂-Bilanz einer Wärmepumpe im Vergleich zur Gas- oder Ölheizung. BEG-Förderung eingerechnet, transparent nach Fraunhofer ISE & BWP. Kostenlos, ohne Anmeldung.",
  ogImageTitle: "Lohnt sich eine Wärmepumpe?",
  ogImageSubtitle: "Kosten, Einsparung & Förderung vs. Gas und Öl — transparent gerechnet.",
});

export default function WaermepumpePage() {
  return <Waermepumpe />;
}
