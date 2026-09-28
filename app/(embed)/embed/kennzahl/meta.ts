import type { Metadata } from "next";

// Shared by the page at its own address and its static path twin.
export const WIDGET_METADATA: Metadata = {
  title: "Kennzahl (Anlagenbestand) — Solar Check Widget",
  description:
    "Installierte Leistung bzw. Anzahl der EE-Anlagen in Deutschland aus dem Marktstammdatenregister. Live-Daten via solar-check.io.",
  robots: { index: false, follow: false },
};
