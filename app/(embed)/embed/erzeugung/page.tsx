import type { Metadata } from "next";
import ErzeugungWidget from "./client";

export const metadata: Metadata = {
  title: "Stromerzeugung Deutschland — Solar Check Widget",
  description:
    "Aktuelle Stromerzeugung in Deutschland: Solar, Wind, Biomasse, Wasser. 24-Stunden-Verlauf als Radial-Chart, live aus Solar-Check.io.",
  robots: { index: false, follow: false },
};

export default function ErzeugungEmbedPage({
  searchParams,
}: {
  searchParams?: { auto?: string };
}) {
  return <ErzeugungWidget autoswitchMs={parseAuto(searchParams?.auto)} />;
}

// Akzeptiert "1" (= 6000 ms Default-Intervall) oder eine Ganzzahl in ms.
// Werte unter 1000 oder über 60000 werden geclamped.
function parseAuto(raw: string | undefined): number {
  if (!raw) return 0;
  if (raw === "1") return 6000;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(60_000, Math.max(1000, n));
}
