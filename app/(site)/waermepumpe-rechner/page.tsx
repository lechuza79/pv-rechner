import { Metadata } from "next";
import StandNote from "../../../components/StandNote";
import { pageMetadata } from "../../../lib/seo";
import { v } from "../../../lib/theme";
import Waermepumpe from "./waermepumpe";

export const metadata: Metadata = pageMetadata({
  path: "/waermepumpe-rechner",
  title: "Wärmepumpen-Rechner – Stromverbrauch, Kosten & Ersparnis berechnen",
  description: "Wie viel Strom verbraucht eine Wärmepumpe? Berechne Stromverbrauch, Kosten und Ersparnis im Vergleich zur Gas- oder Ölheizung. BEG-Förderung eingerechnet, transparent nach Fraunhofer ISE & BWP. Kostenlos, ohne Anmeldung.",
  ogTitle: "Wärmepumpen-Rechner – Lohnt sich eine Wärmepumpe?",
  ogImageTitle: "Lohnt sich eine Wärmepumpe?",
  ogImageSubtitle: "Kosten, Einsparung & Förderung vs. Gas und Öl — transparent gerechnet.",
});

export default function WaermepumpePage() {
  return (
    <>
      <Waermepumpe />
      <div style={{ maxWidth: v("--page-max-width"), margin: "0 auto", padding: "0 16px 32px" }}>
        <StandNote pfad="/waermepumpe-rechner" />
      </div>
    </>
  );
}
