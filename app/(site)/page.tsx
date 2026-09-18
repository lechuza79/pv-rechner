import type { Metadata } from "next";
import Faq from "../../components/Faq";
import NeonFlaeche from "../../components/NeonFlaeche";
import { homeFaq } from "../../lib/faq";
import { pageMetadata, energyOgImage } from "../../lib/seo";
import StartseiteHero from "./_startseite/StartseiteHero";
import { OrteAbschnitt, Person, Ratgeber, Rennen, Werkzeuge } from "./_startseite/Abschnitte";

// Unchanged from the previous homepage: title, description and OG image are
// what the page ranks with (baseline 2026-09-18 in docs/seo/).
export const metadata: Metadata = pageMetadata({
  path: "/",
  title: "Solar Check – Lohnt sich Photovoltaik? Ehrlich berechnet.",
  description:
    "Kostenloser PV-Rentabilitätsrechner mit direktem Ergebnis — ohne Anmeldung, ohne Verkaufsanrufe. Amortisation, Rendite und Szenarien für deine Photovoltaikanlage mit oder ohne Speicher.",
  ogImage: energyOgImage(),
});

export default function Home() {
  return (
    <NeonFlaeche className="sc-startseite">
      <StartseiteHero>
        <Werkzeuge id="startseite-rechner" />
        <Rennen />
        <OrteAbschnitt />
        <Ratgeber />
        <Person />
      </StartseiteHero>
      <section className="sc-startseite-faq" aria-label="Häufige Fragen">
        <div>
          <Faq items={homeFaq()} currentPath="/" />
        </div>
      </section>
    </NeonFlaeche>
  );
}
