import type { Metadata } from "next";
import AngebotPruefenClient from "./client";

export const metadata: Metadata = {
  // NOCH NICHT FREIGEGEBEN: Die Prüfung ist gebaut und getestet, aber die
  // Redesign-Sitzung des Wärmepumpen-Rechners entscheidet, wo sie im Produkt
  // sitzt. Bis dahin existiert die Adresse, damit an ihr gearbeitet werden
  // kann — sie ist nirgends verlinkt, steht nicht in der Sitemap und wird
  // nicht indexiert. Wer sie freigibt, nimmt diese Zeile heraus UND trägt die
  // Seite in Menü und Fußzeile ein.
  robots: { index: false, follow: false },
  title: "Wärmepumpen- und PV-Angebot prüfen lassen — kostenlos | Solar Check",
  description:
    "Lade dein Angebot vom Handwerker hoch und erfahre sofort, ob die Anlage zur Größe passt, ob die üblichen Positionen enthalten sind und wie der Preis im Vergleich liegt. Ohne Anmeldung, ohne Weitergabe an Betriebe.",
};

export default function Page() {
  return <AngebotPruefenClient />;
}
