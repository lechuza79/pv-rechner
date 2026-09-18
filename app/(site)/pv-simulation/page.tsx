import { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import Faq from "../../../components/Faq";
import NeonFlaeche from "../../../components/NeonFlaeche";
import RelatedLinks from "../../../components/RelatedLinks";
import StandNote from "../../../components/StandNote";
import { pvSimulationFaq } from "../../../lib/faq";
import { pageMetadata } from "../../../lib/seo";
import StartseiteHero from "../_startseite/StartseiteHero";
import RueckblickSchritt from "../_startseite/RueckblickSchritt";
import { OrteAbschnitt, Person, Ratgeber, Rennen, Werkzeuge } from "../_startseite/Abschnitte";
import "../_startseite/simulation.css";
import LiveSimulation from "./simulation";

// Metadata unchanged (baseline 2026-09-18): the live output stays on this page
// below the retrospective, so the "live" promise in title and description
// remains true. The retrospective is the new entry, not a replacement.
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

const RENNEN_ANKER = "simulation-rennen";

export default function Page() {
  return (
    <NeonFlaeche className="sc-simulation">
      <StartseiteHero simulation={<RueckblickSchritt rennenAnker={RENNEN_ANKER} />}>
        <Rennen id={RENNEN_ANKER} />
        <section className="hs-simulation-content hs-section">
          <div className="hs-wrap">
            <div className="hs-simulation-lightbox">
              <p className="hs-kicker">DEINE SIMULATION VERSTEHEN</p>
              <h2>So entsteht deine Solar-Bilanz.</h2>
              <p>
                Der Rückblick rechnet mit dem Wetter, das an deinem Ort von 2016 bis 2025 tatsächlich war, und mit den
                damaligen Strompreisen. Die Live-Leistung weiter unten ist eine Modellberechnung für Beispielanlagen aus
                aktuellen Wetterdaten, keine Messung auf deinem Dach.
              </p>
              <div className="hs-simulation-calculator">
                {/* eslint-disable-next-line @next/next/no-img-element -- static illustration */}
                <img className="is-loaded" src="/startseite/house-v20.webp" alt="" width={160} height={160} loading="lazy" />
                <div>
                  <h3>Was beeinflusst deinen Ertrag?</h3>
                  <p>
                    Standort, Ausrichtung, Dachneigung und Verschattung entscheiden mit. Für deine Wirtschaftlichkeit
                    kommen Verbrauch, Anschaffungskosten und Eigenverbrauch hinzu.
                  </p>
                </div>
                <Link className="sc-btn sc-btn-primary" href="/photovoltaik-rechner">
                  Für deinen Haushalt berechnen
                </Link>
              </div>
            </div>
          </div>
        </section>
        <Werkzeuge />
        <OrteAbschnitt />
        <Ratgeber />
        <Person />
      </StartseiteHero>

      <section className="sc-simulation-live" aria-labelledby="simulation-live-titel">
        <h2 id="simulation-live-titel" className="sc-section-title">Was produziert eine PV-Anlage gerade?</h2>
        <p className="sc-copy">
          Live aus aktuellen Wetterdaten: die Leistung verschiedener Beispielanlagen an deinem Standort, Stunde für Stunde.
        </p>
        <Suspense>
          <LiveSimulation />
        </Suspense>
      </section>

      <section className="sc-startseite-faq" aria-label="Häufige Fragen">
        <div>
          <Faq items={pvSimulationFaq()} title="Häufige Fragen zur PV-Simulation" currentPath="/pv-simulation" />
          <StandNote pfad="/pv-simulation" />
          <RelatedLinks
            currentPath="/pv-simulation"
            links={[
              { href: "/photovoltaik-rechner", label: "Photovoltaik-Rechner", desc: "Amortisation, Rendite und Eigenverbrauch für deine Anlage — alle Annahmen transparent und anpassbar." },
              { href: "/pv-bedarf-berechnen", label: "Welche Anlage passt zu mir?", desc: "In wenigen Fragen zur passenden Anlagengröße — mit Empfehlung und Begründung." },
              { href: "/photovoltaik-neigungswinkel", label: "Neigungswinkel & Ausrichtung", desc: "Die Ertrags-Tabelle für jede Dachneigung — und warum ein vermeintlich falsches Dach fast nie ein Ausschlusskriterium ist." },
              { href: "/ratgeber/lohnt-sich-pv-mit-speicher", label: "Lohnt sich PV mit Speicher?", desc: "Die ehrliche Rechnung mit aktuellen Marktpreisen — und wann sich ein Speicher wirklich rechnet." },
              { href: "/strommix-deutschland", label: "Strommix Deutschland live", desc: "Wie viel Solar, Wind und Kohle gerade im deutschen Netz stecken." },
            ]}
          />
        </div>
      </section>
    </NeonFlaeche>
  );
}
