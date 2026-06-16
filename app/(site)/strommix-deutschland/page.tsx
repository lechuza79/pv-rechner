import type { Metadata } from "next";
import Header from "../../../components/Header";
import { v } from "../../../lib/theme";
import { pageMetadata } from "../../../lib/seo";
import EnergieClient from "./client";

export const metadata: Metadata = pageMetadata({
  path: "/strommix-deutschland",
  title: "Strommix Deutschland – Live: Solar, Wind, Kohle & mehr | Solar Check",
  description:
    "Deutschlands Strommix in Echtzeit: Solar, Wind, Gas, Kohle. Datenquelle: Fraunhofer ISE / Energy-Charts (CC BY 4.0).",
  ogImageTitle: "Deutschlands Strommix — live",
  ogImageSubtitle: "Solar, Wind, Gas, Kohle in Echtzeit. Quelle: Fraunhofer ISE.",
});

export default function EnergiePage() {
  return (
    <div
      style={{
        background: v("--color-bg"),
        fontFamily: v("--font-text"),
        color: v("--color-text-primary"),
        minHeight: "100vh",
        padding: "20px 16px",
      }}
    >
      <Header />
      <EnergieClient />
    </div>
  );
}
