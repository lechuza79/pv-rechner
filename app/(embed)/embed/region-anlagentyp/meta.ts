import type { Metadata } from "next";

// Shared by the page at its own address and its cached path twin.
export const WIDGET_METADATA: Metadata = {
  title: "Solarleistung nach Anlagentyp (Bundesland) — Solar Check Widget",
  description:
    "Installierte Solarleistung eines Bundeslands nach Anlagentyp aus dem Marktstammdatenregister. Cookiefrei einbettbar via solar-check.io.",
  robots: { index: false, follow: false },
};
