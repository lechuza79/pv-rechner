import { Metadata } from "next";
import { Suspense } from "react";
import LiveSimulation from "./simulation";

export const metadata: Metadata = {
  title: "Live PV Simulation – Was produziert dein Dach gerade? | Solar Check",
  description: "Sieh in Echtzeit, was verschiedene PV-Anlagen an deinem Standort gerade produzieren würden. Basierend auf aktuellen Wetterdaten — kostenlos, ohne Anmeldung.",
  openGraph: {
    title: "Live PV Simulation – Was produziert dein Dach gerade?",
    description: "Sieh in Echtzeit, was verschiedene PV-Anlagen an deinem Standort gerade produzieren würden.",
    url: "https://solar-check.io/simulation",
    siteName: "Solar Check",
    type: "website",
  },
};

export default function Page() {
  return (
    <Suspense>
      <LiveSimulation />
    </Suspense>
  );
}
