import { Metadata } from "next";
import { Suspense } from "react";
import { pageMetadata } from "../../../lib/seo";
import LiveSimulation from "./simulation";

export const metadata: Metadata = pageMetadata({
  path: "/pv-simulation",
  title: "Live PV Simulation – Was produziert dein Dach gerade? | Solar Check",
  description: "Sieh in Echtzeit, was verschiedene PV-Anlagen an deinem Standort gerade produzieren würden. Basierend auf aktuellen Wetterdaten — kostenlos, ohne Anmeldung.",
  ogTitle: "Live PV Simulation – Was produziert dein Dach gerade?",
  ogDescription: "Sieh in Echtzeit, was verschiedene PV-Anlagen an deinem Standort gerade produzieren würden.",
  ogImageTitle: "Was produziert dein Dach gerade?",
  ogImageSubtitle: "Live PV-Leistung an deinem Standort — aus aktuellen Wetterdaten.",
});

export default function Page() {
  return (
    <Suspense>
      <LiveSimulation />
    </Suspense>
  );
}
