"use client";

import dynamic from "next/dynamic";
import type { GemeindePaket } from "../../lib/gemeinde-paket";

/**
 * The embedded views render in the browser only. Their charts compute SVG
 * geometry that differs by the last digit between server and browser (React
 * reported hydration mismatches in the story strip), and they carry no text
 * a crawler needs — the page renders that itself.
 */
const Insights = dynamic(() => import("./GemeindeInsights"), { ssr: false });

export default function GemeindeAnsicht({ ansicht, paket }: { ansicht: "insights"; paket: GemeindePaket }) {
  if (ansicht === "insights")
    return <Insights stories={paket.stories as never} name={paket.name} surfaceScheme="dark" showHeader={false} embedded />;
  return null;
}
