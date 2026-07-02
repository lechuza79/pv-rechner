import type { Metadata } from "next";
import { getStrommixYtd } from "../../../../lib/strommix-ytd";
import StrommixAnteilWidget from "./client";

export const metadata: Metadata = {
  title: "Kernenergie im deutschen Strommix — Solar Check Widget",
  description:
    "Anteil der Kernenergie (inkl. importiertem Atomstrom) am deutschen Strommix des laufenden Jahres.",
  robots: { index: false, follow: false },
};

// ISR: stündlich neu rechnen, damit der Anteil aktuell bleibt (Datenquelle
// energy_weekly aktualisiert sich wöchentlich).
export const revalidate = 3600;

export default async function StrommixAnteilEmbedPage() {
  const ytd = await getStrommixYtd(new Date());
  return <StrommixAnteilWidget ytd={ytd} />;
}
