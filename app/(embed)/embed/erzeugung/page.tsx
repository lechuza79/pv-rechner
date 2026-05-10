import type { Metadata } from "next";
import ErzeugungWidget from "./client";

export const metadata: Metadata = {
  title: "Stromerzeugung Deutschland — Solar Check Widget",
  description:
    "Aktuelle Stromerzeugung in Deutschland: Solar, Wind, Biomasse, Wasser. 24-Stunden-Verlauf als Radial-Chart, live aus Solar-Check.io.",
  robots: { index: false, follow: false },
};

export default function ErzeugungEmbedPage() {
  return <ErzeugungWidget />;
}
