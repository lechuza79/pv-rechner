import { Metadata } from "next";
import { Suspense } from "react";
import { ErrorBoundary } from "../../../components/ErrorBoundary";
import Faq from "../../../components/Faq";
import { pvRechnerFaq } from "../../../lib/faq";
import { pageMetadata } from "../../../lib/seo";
import { standSeite } from "../../../lib/stand";
import { DIREKT_KEY } from "../../../lib/share-keys";
import { v } from "../../../lib/theme";
import Empfehlung from "./empfehlung";

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
 *
 * SEIT 21.09.2026 ZEIGT DIE NACKTE ADRESSE DEN EMPFEHLUNGSWEG, nicht mehr die
 * Direkteingabe. Er ist der Haupt-Rechner, und diese Adresse trägt den
 * Suchbegriff (Suchvolumen gemessen: „pv rechner" 1.900, „photovoltaik rechner"
 * 880 im Monat — die alte Adresse /pv-bedarf-berechnen lag auf einem Begriff
 * mit 30). Die Direkteingabe erreicht man über `?direkt=1`; sie läuft wie jedes
 * Ergebnis über die Umschreibung auf `./ergebnis`. Welche Parameter wohin
 * führen, entscheidet `traegtRechnung` in lib/share-keys.ts.
 *
 * Der Empfehlungsweg liest seine Antworten im Browser aus der Adresse und
 * braucht dafür eine Suspense-Grenze. Ihre Ersatzanzeige trägt die Überschrift:
 * Mit `fallback={null}` (so stand es unter der alten Adresse) lieferte der
 * Server eine Seite ganz ohne Überschrift aus.
 */
export const metadata: Metadata = pageMetadata({
  path: "/photovoltaik-rechner",
  title: "Photovoltaik-Rechner: Amortisation & Rendite berechnen",
  description:
    "Kostenloser Photovoltaik-Rechner: Amortisation, Rendite und Eigenverbrauch sofort berechnen — ohne Anmeldung, ohne Verkaufsanrufe. Alle Annahmen transparent editierbar.",
  ogTitle: "Photovoltaik-Rechner – Lohnt sich PV?",
  ogDescription: "Direktes Ergebnis. Ohne Anmeldung, ohne Verkaufsanrufe.",
});

const UEBERSCHRIFT = "PV-Rechner";
const UNTERZEILE = "Welche Anlage lohnt sich für dich? Wir empfehlen Größe und Speicher — mit Amortisation und Rendite.";

export default function RechnerPage() {
  return (
    <ErrorBoundary>
      <Suspense
        fallback={
          <div style={{ maxWidth: v("--page-max-width"), containerType: "inline-size", margin: "0 auto", padding: "0 16px", textAlign: "center" }}>
            <h1 style={{ color: v("--color-text-primary"), fontSize: v("--font-size-h2") }}>{UEBERSCHRIFT}</h1>
            <p style={{ fontSize: v("--font-size-small"), color: v("--color-text-muted"), marginTop: 6 }}>{UNTERZEILE}</p>
          </div>
        }
      >
        <Empfehlung
          stand={standSeite("/photovoltaik-rechner")}
          ueberschrift={UEBERSCHRIFT}
          unterzeile={UNTERZEILE}
          direktHref={`/photovoltaik-rechner?${DIREKT_KEY}=1`}
        />
      </Suspense>
      <div style={{ maxWidth: v("--page-max-width"), containerType: "inline-size", margin: "0 auto", padding: "0 16px 32px" }}>
        <Faq items={pvRechnerFaq()} currentPath="/photovoltaik-rechner" />
      </div>
    </ErrorBoundary>
  );
}
