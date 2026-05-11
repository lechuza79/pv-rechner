import { Metadata } from "next";
import { Suspense } from "react";
import Empfehlung from "./empfehlung";

export const metadata: Metadata = {
  title: "PV-Anlage Empfehlung – Welche Photovoltaikanlage passt zu mir?",
  description: "Beschreibe deinen Haushalt und dein Dach — wir empfehlen dir die optimale PV-Anlage mit Speicher. Kostenlos, ohne Anmeldung, ohne Leadfunnel.",
};

export default function EmpfehlungPage() {
  // useSearchParams in the client component requires a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <Empfehlung />
    </Suspense>
  );
}
