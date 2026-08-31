import type { Metadata } from "next";
import AngebotPruefenClient from "./client";

export const metadata: Metadata = {
  title: "Wärmepumpen- und PV-Angebot prüfen lassen — kostenlos | Solar Check",
  description:
    "Lade dein Angebot vom Handwerker hoch und erfahre sofort, ob die Anlage zur Größe passt, ob die üblichen Positionen enthalten sind und wie der Preis im Vergleich liegt. Ohne Anmeldung, ohne Weitergabe an Betriebe.",
};

export default function Page() {
  return <AngebotPruefenClient />;
}
