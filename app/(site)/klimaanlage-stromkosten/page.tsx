import { Metadata } from "next";
import { pageMetadata } from "../../../lib/seo";
import { standSeite } from "../../../lib/stand";
import Klimaanlage from "./klimaanlage";

export const metadata: Metadata = pageMetadata({
  path: "/klimaanlage-stromkosten",
  title: "Klimaanlagen-Rechner – Stromkosten & Verbrauch ehrlich berechnet",
  description:
    "Was kostet eine Klimaanlage im Betrieb? Monoblock, mobile Split oder fest installiert — Stromverbrauch, Kosten und CO₂ aus echten Wetterdaten. Auch als Heizung in der Übergangszeit, plus wie viel deine Solaranlage übernimmt. Kostenlos, ohne Anmeldung.",
  ogImageTitle: "Was kostet deine Klimaanlage?",
  ogImageSubtitle: "Stromverbrauch, Kosten & CO₂ — und wie viel die Sonne übernimmt.",
});

// Die „Stand:"-Zeile sitzt im Rechner selbst (siehe klimaanlage.tsx), nicht
// hier: Der Rechner-Rahmen ist mindestens bildschirmhoch, ein Absatz dahinter
// stünde hinter einer leeren Fläche. Nachgeschlagen wird sie trotzdem HIER, auf
// dem Server — `lib/stand.ts` hängt an sieben Config-Modulen, die im Browser
// nichts zu suchen haben.
export default function KlimaanlagePage() {
  return <Klimaanlage stand={standSeite("/klimaanlage-stromkosten")} />;
}
