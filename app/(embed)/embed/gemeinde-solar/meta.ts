import type { Metadata } from "next";

// Shared by the page at its own address and its cached path twin.
export const WIDGET_METADATA: Metadata = {
  title: "Solaranlagen in der Gemeinde — Solar Check Widget",
  description:
    "Anlagenbestand einer Gemeinde aus dem Marktstammdatenregister. Cookiefrei einbettbar via solar-check.io.",
  robots: { index: false, follow: false },
};
