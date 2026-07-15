import { Metadata } from "next";
import { pageMetadata } from "../../../lib/seo";
import Balkon from "./balkon";

export const metadata: Metadata = pageMetadata({
  path: "/balkonkraftwerk-rechner",
  title: "Balkonkraftwerk-Rechner – lohnt sich Steckersolar? Ehrlich berechnet",
  description:
    "Lohnt sich ein Balkonkraftwerk? Für Miete und Eigentum ohne eigenes Dach: Ertrag, Stromersparnis, Amortisation und Autarkie aus echten Standortdaten. 800-Watt-Sets, kostenlos und ohne Anmeldung.",
  ogImageTitle: "Lohnt sich ein Balkonkraftwerk?",
  ogImageSubtitle: "Ertrag, Ersparnis & Amortisation — für Miete und Eigentum.",
});

export default function BalkonPage() {
  return <Balkon />;
}
