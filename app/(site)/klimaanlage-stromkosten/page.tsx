import { Metadata } from "next";
import { pageMetadata } from "../../../lib/seo";
import Klimaanlage from "./klimaanlage";

export const metadata: Metadata = pageMetadata({
  path: "/klimaanlage-stromkosten",
  title: "Klimaanlagen-Rechner – Stromkosten & Verbrauch ehrlich berechnet",
  description:
    "Was kostet eine Klimaanlage im Betrieb? Monoblock, mobile Split oder fest installiert — Stromverbrauch, Kosten und CO₂ aus echten Wetterdaten. Und wie viel davon deine Solaranlage übernimmt. Kostenlos, ohne Anmeldung.",
  ogImageTitle: "Was kostet deine Klimaanlage?",
  ogImageSubtitle: "Stromverbrauch, Kosten & CO₂ — und wie viel die Sonne übernimmt.",
});

export default function KlimaanlagePage() {
  return <Klimaanlage />;
}
