import type { Metadata } from "next";

// Shared by the page at its own address and its cached path twin.
export const WIDGET_METADATA: Metadata = {
  title: "PV-Ertrag jetzt — Solar Check Widget",
  description:
    "Live-Photovoltaikertrag nach Postleitzahl: was eine PV-Anlage gerade beim aktuellen Wetter liefert. Von solar-check.io.",
  robots: { index: false, follow: false },
};
