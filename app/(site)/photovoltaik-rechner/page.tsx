import { Metadata } from "next";
import { ErrorBoundary } from "../../../components/ErrorBoundary";
import Faq from "../../../components/Faq";
import StandNote from "../../../components/StandNote";
import { pvRechnerFaq } from "../../../lib/faq";
import { pageMetadata } from "../../../lib/seo";
import { v } from "../../../lib/theme";
import PVRechner from "./rechner";

/**
 * DIE NACKTE RECHNER-ADRESSE IST FÜR ALLE GLEICH — und darf deshalb aus dem
 * CDN kommen. Sie liest bewusst NICHTS aus dem Abfrageteil.
 *
 * Steht doch ein Parameter in der Adresse (geteiltes Ergebnis, Vorbefüllung von
 * einer Förderseite, Rücksprung aus dem Empfehlungs-Flow), schiebt die
 * Middleware die Anfrage auf `./ergebnis` — dieselbe Seite, dort am Server
 * gebaut, mit persönlichem Vorschaubild. Die Adresse im Browser ändert sich
 * dabei nicht.
 *
 * WER HIER `searchParams` WIEDER EINBAUT, macht die Seite in dem Moment
 * vollständig dynamisch (`no-store`, voller Aufbau bei JEDEM Aufruf) — ohne
 * dass irgendetwas kaputt aussähe. Genau so stand sie bis zum 05.09.2026 und
 * kostete 2.612 Aufbauten am Tag bei neun Besuchern. Ein Test hält das fest.
 */
export const metadata: Metadata = pageMetadata({
  path: "/photovoltaik-rechner",
  title: "Photovoltaik-Rechner – Amortisation & Rendite sofort berechnen",
  description:
    "Kostenloser Photovoltaik-Rechner: Amortisation, Rendite und Eigenverbrauch sofort berechnen — ohne Anmeldung, ohne Verkaufsanrufe. Alle Annahmen transparent editierbar.",
  ogTitle: "Photovoltaik-Rechner – Lohnt sich PV?",
  ogDescription: "Direktes Ergebnis. Ohne Anmeldung, ohne Verkaufsanrufe.",
});

export default function RechnerPage() {
  return (
    <ErrorBoundary>
      <PVRechner />
      <div style={{ maxWidth: v("--page-max-width"), margin: "0 auto", padding: "0 16px 32px" }}>
        <Faq items={pvRechnerFaq()} currentPath="/photovoltaik-rechner" />
        <StandNote pfad="/photovoltaik-rechner" />
      </div>
    </ErrorBoundary>
  );
}
