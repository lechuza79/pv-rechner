import type { Metadata } from "next";
import EeAmpelWidget from "./client";

export const metadata: Metadata = {
  title: "EE-Ampel (Strommix live) — Solar Check Widget",
  description:
    "Ampel-Widget: Wie hoch ist der Anteil erneuerbarer Energien im deutschen Strommix gerade? Grün = guter Zeitpunkt für Stromverbrauch. Live-Daten via solar-check.io.",
  robots: { index: false, follow: false },
};

export default function EeAmpelEmbedPage() {
  return <EeAmpelWidget />;
}
