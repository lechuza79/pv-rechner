import { Metadata } from "next";
import { pageMetadata } from "../../../lib/seo";
import { standSeite } from "../../../lib/stand";
import Waermepumpe from "./waermepumpe";

export const metadata: Metadata = pageMetadata({
  path: "/waermepumpe-rechner",
  title: "Wärmepumpen-Rechner – Stromverbrauch, Kosten & Ersparnis berechnen",
  description: "Wie viel Strom verbraucht eine Wärmepumpe? Berechne Stromverbrauch, Kosten und Ersparnis im Vergleich zur Gas- oder Ölheizung. BEG-Förderung eingerechnet, transparent nach Fraunhofer ISE & BWP. Kostenlos, ohne Anmeldung.",
  ogTitle: "Wärmepumpen-Rechner – Lohnt sich eine Wärmepumpe?",
  ogImageTitle: "Lohnt sich eine Wärmepumpe?",
  ogImageSubtitle: "Kosten, Einsparung & Förderung vs. Gas und Öl — transparent gerechnet.",
});

// Die „Stand:"-Zeile sitzt im Rechner selbst (siehe waermepumpe.tsx), nicht
// hier: Der Rechner-Rahmen ist mindestens bildschirmhoch, ein Absatz dahinter
// stünde hinter einer leeren Fläche. Nachgeschlagen wird sie trotzdem HIER, auf
// dem Server — `lib/stand.ts` hängt an sieben Config-Modulen, die im Browser
// nichts zu suchen haben.
export default function WaermepumpePage() {
  return <Waermepumpe stand={standSeite("/waermepumpe-rechner")} />;
}
