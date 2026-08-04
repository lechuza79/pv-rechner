import { Metadata } from "next";
import { Suspense } from "react";
import Faq from "../../../components/Faq";
import RelatedLinks from "../../../components/RelatedLinks";
import { pvSimulationFaq } from "../../../lib/faq";
import { pageMetadata } from "../../../lib/seo";
import { v } from "../../../lib/theme";
import LiveSimulation from "./simulation";

export const metadata: Metadata = pageMetadata({
  path: "/pv-simulation",
  // Leading keyword "PV-Simulation" — the page ranks for exactly that query.
  title: "PV-Simulation – live: Was produziert dein Dach gerade?",
  description: "PV-Simulation in Echtzeit: Sieh, was verschiedene Photovoltaik-Anlagen an deinem Standort gerade produzieren würden. Aus aktuellen Wetterdaten — kostenlos, ohne Anmeldung.",
  ogTitle: "PV-Simulation – Was produziert dein Dach gerade?",
  ogDescription: "Sieh in Echtzeit, was verschiedene PV-Anlagen an deinem Standort gerade produzieren würden.",
  ogImageTitle: "Was produziert dein Dach gerade?",
  ogImageSubtitle: "Live PV-Leistung an deinem Standort — aus aktuellen Wetterdaten.",
});

export default function Page() {
  return (
    <>
      <Suspense>
        <LiveSimulation />
      </Suspense>
      <div style={{ maxWidth: v("--page-max-width"), margin: "0 auto", padding: "0 16px 32px" }}>
        <Faq items={pvSimulationFaq()} title="Häufige Fragen zur PV-Simulation" currentPath="/pv-simulation" />
        <RelatedLinks
          currentPath="/pv-simulation"
          links={[
            { href: "/photovoltaik-rechner", label: "Photovoltaik-Rechner", desc: "Amortisation, Rendite und Eigenverbrauch für deine Anlage — alle Annahmen transparent und anpassbar." },
            { href: "/pv-bedarf-berechnen", label: "Welche Anlage passt zu mir?", desc: "In wenigen Fragen zur passenden Anlagengröße — mit Empfehlung und Begründung." },
            { href: "/ratgeber/lohnt-sich-pv-mit-speicher", label: "Lohnt sich PV mit Speicher?", desc: "Die ehrliche Rechnung mit aktuellen Marktpreisen — und wann sich ein Speicher wirklich rechnet." },
            { href: "/strommix-deutschland", label: "Strommix Deutschland live", desc: "Wie viel Solar, Wind und Kohle gerade im deutschen Netz stecken." },
          ]}
        />
      </div>
    </>
  );
}
