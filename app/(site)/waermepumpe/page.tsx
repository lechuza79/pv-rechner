import { Metadata } from "next";
import Waermepumpe from "./waermepumpe";

export const metadata: Metadata = {
  title: "Wärmepumpen-Rechner – Lohnt sich eine Wärmepumpe?",
  description: "Berechne Kosten, Einsparung und CO₂-Bilanz einer Wärmepumpe im Vergleich zur Gas- oder Ölheizung. BEG-Förderung eingerechnet, transparent nach Fraunhofer ISE & BWP. Kostenlos, ohne Anmeldung.",
};

export default function WaermepumpePage() {
  return <Waermepumpe />;
}
