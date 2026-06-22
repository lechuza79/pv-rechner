import type { Metadata } from "next";
import StrommixWidget from "./client";

export const metadata: Metadata = {
  title: "Strommix Deutschland — Solar Check Widget",
  description:
    "Aktueller Strommix in Deutschland: Solar, Wind, Gas, Kohle, Sonstige. Live-Daten via solar-check.io.",
  robots: { index: false, follow: false },
};

export default function StrommixEmbedPage() {
  return <StrommixWidget />;
}
