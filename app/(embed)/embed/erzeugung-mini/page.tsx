import type { Metadata } from "next";
import ErzeugungWidget from "../erzeugung/client";

export const metadata: Metadata = {
  title: "Stromerzeugung Deutschland (kompakt) — Solar Check Widget",
  description:
    "Kompakte Variante der Stromerzeugung-Live: Radial-Chart der letzten 24h ohne Auslastungs-Footer. Zum Einbetten in schmale Spalten.",
  robots: { index: false, follow: false },
};

export default function ErzeugungMiniPage({
  searchParams,
}: {
  searchParams?: { auto?: string };
}) {
  return <ErzeugungWidget compact autoswitchMs={parseAuto(searchParams?.auto)} />;
}

function parseAuto(raw: string | undefined): number {
  if (!raw) return 0;
  if (raw === "1") return 6000;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(60_000, Math.max(1000, n));
}
