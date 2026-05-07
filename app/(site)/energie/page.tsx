import type { Metadata } from "next";
import Header from "../../components/Header";
import { v } from "../../lib/theme";
import EnergieClient from "./client";

export const metadata: Metadata = {
  title: "Energiedaten Deutschland — Live & Transparent | Solar Check",
  description:
    "Deutschlands Strommix in Echtzeit: Solar, Wind, Gas, Kohle. Datenquelle: Fraunhofer ISE / Energy-Charts (CC BY 4.0).",
};

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
