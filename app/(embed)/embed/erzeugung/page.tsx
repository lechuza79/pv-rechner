import type { Metadata } from "next";
import ErzeugungEmbedAuto from "./auto";

export const metadata: Metadata = {
  title: "Stromerzeugung Deutschland — Solar Check Widget",
  description:
    "Aktuelle Stromerzeugung in Deutschland: Solar, Wind, Biomasse, Wasser. 24-Stunden-Verlauf als Radial-Chart, live aus solar-check.io.",
  robots: { index: false, follow: false },
};

// Static: `?auto=` is read in the browser (./auto.tsx), not from searchParams.
export default function ErzeugungEmbedPage() {
  return <ErzeugungEmbedAuto />;
}
