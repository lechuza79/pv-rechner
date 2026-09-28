import type { Metadata } from "next";

// Shared by the page at its own address and its cached path twin.
export const WIDGET_METADATA: Metadata = {
  title: "Solarleistung der Gemeinde (simuliert) — Solar Check Widget",
  description:
    "Tagesverlauf der Solarleistung einer Gemeinde, simuliert aus dem Wetter am Standort und dem Anlagenbestand. Cookiefrei einbettbar via solar-check.io.",
  robots: { index: false, follow: false },
};
