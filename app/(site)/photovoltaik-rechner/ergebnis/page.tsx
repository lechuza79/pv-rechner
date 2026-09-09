import { Metadata } from "next";
import { ErrorBoundary } from "../../../../components/ErrorBoundary";
import Faq from "../../../../components/Faq";
import StandNote from "../../../../components/StandNote";
import { pvRechnerFaq } from "../../../../lib/faq";
import { pageMetadata } from "../../../../lib/seo";
import { v } from "../../../../lib/theme";
import PVRechner from "../rechner";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://solar-check.io";

/**
 * DIESELBE SEITE, NUR MIT RECHNUNG IM GEPÄCK — und niemand sieht diese Adresse.
 *
 * Der Rechner wohnt unter `/photovoltaik-rechner`. Steht dort ein Parameter in
 * der Adresse (ein geteiltes Ergebnis oder eine Vorbefüllung von einer
 * Förderseite), schiebt die Middleware die Anfrage hierher — als Umschreibung,
 * nicht als Weiterleitung: Die Adresse im Browser bleibt unverändert, geteilte
 * Links behalten ihre Form, und der Teilen-Knopf baut seinen Link weiterhin aus
 * `window.location.pathname`.
 *
 * WARUM DIE TRENNUNG (05.09.2026, gemessen): Weil `generateMetadata` und die
 * Seite selbst den Abfrageteil lasen, war der Rechner VOLLSTÄNDIG dynamisch —
 * `no-store`, bei jedem Aufruf ein voller Serverless-Aufbau. Gemessen über
 * 24 h: 2.612 Aufbauten für EINE Adresse, 19 % aller Aufbauten der Domain, bei
 * neun menschlichen Besuchen am Tag. Der Rest waren Maschinen; die nackte
 * Adresse ist die einzige Seite, die ein Crawler beliebig oft zum vollen Preis
 * holen konnte.
 *
 * WAS HIER NICHT GESPART WIRD: Diese Route bleibt dynamisch, und das ist ihr
 * Zweck. Der Rechner braucht den geteilten Zustand schon im ersten
 * ausgelieferten Bild (er springt sonst sichtbar von der Fragestrecke ins
 * Ergebnis), und das persönliche Vorschaubild im Chat hängt am Abfrageteil.
 * Wer sie „auch noch" statisch macht, zerlegt genau das.
 */
export async function generateMetadata(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}): Promise<Metadata> {
  const searchParams = await props.searchParams;
  // Shared result links carry the calculation in query params — the OG route
  // renders a personalized preview card from them. Without params, /api/og
  // falls back to the generic brand card. This dynamic image is why the page
  // uses generateMetadata instead of a static export.
  const ogParams = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string") ogParams.set(key, value);
  }
  const ogQuery = ogParams.toString();
  const ogUrl = ogQuery ? `${BASE_URL}/api/og?${ogQuery}` : `${BASE_URL}/api/og`;

  // Kanonisch ist und bleibt die nackte Rechner-Adresse — nicht diese hier.
  // Sonst stünden Dutzende geteilter Rechnungen als eigene Seiten im Index, und
  // die interne Umschreib-Adresse tauchte in Suchergebnissen auf.
  return pageMetadata({
    path: "/photovoltaik-rechner",
    title: "Photovoltaik-Rechner – Amortisation & Rendite sofort berechnen",
    description:
      "Kostenloser Photovoltaik-Rechner: Amortisation, Rendite und Eigenverbrauch sofort berechnen — ohne Anmeldung, ohne Verkaufsanrufe. Alle Annahmen transparent editierbar.",
    ogTitle: "Photovoltaik-Rechner – Lohnt sich PV?",
    ogDescription: "Direktes Ergebnis. Ohne Anmeldung, ohne Verkaufsanrufe.",
    ogImage: ogUrl,
  });
}

export default async function RechnerErgebnisPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  return (
    <ErrorBoundary>
      <PVRechner initialParams={searchParams} />
      <div style={{ maxWidth: v("--page-max-width"), margin: "0 auto", padding: "0 16px 32px" }}>
        <Faq items={pvRechnerFaq()} currentPath="/photovoltaik-rechner" />
        <StandNote pfad="/photovoltaik-rechner" />
      </div>
    </ErrorBoundary>
  );
}
