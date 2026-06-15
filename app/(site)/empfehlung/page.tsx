import { Metadata } from "next";
import { Suspense } from "react";
import { pageMetadata } from "../../../lib/seo";
import Empfehlung from "./empfehlung";

export const metadata: Metadata = pageMetadata({
  path: "/empfehlung",
  title: "PV-Anlage Empfehlung – Welche Photovoltaikanlage passt zu mir?",
  description: "Beschreibe deinen Haushalt und dein Dach — wir empfehlen dir die optimale PV-Anlage mit Speicher. Kostenlos, ohne Anmeldung, ohne Leadfunnel.",
  ogImageTitle: "Welche PV-Anlage passt zu mir?",
  ogImageSubtitle: "Haushalt + Dach beschreiben — wir empfehlen Anlage & Speicher.",
});

export default function EmpfehlungPage() {
  // useSearchParams in the client component requires a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <Empfehlung />
    </Suspense>
  );
}
