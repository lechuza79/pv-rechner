import type { Metadata } from "next";

// Shared by the page at its own address and its cached path twin.
export const WIDGET_METADATA: Metadata = {
  title: "Solarleistung des Bundeslands (simuliert) — Solar Check Widget",
  description:
    "Momentanleistung des Solar-Anlagenbestands eines Bundeslands, simuliert aus dem Wetter und dem Bestand. Cookiefrei einbettbar via solar-check.io.",
  robots: { index: false, follow: false },
};
