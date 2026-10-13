"use client";

import { usePathname } from "next/navigation";
import DataSourcesSection from "./DataSourcesSection";
import { KFW_RENEWABLES_2025 } from "../lib/funding-overview-facts";

/** Source content for the funding overview in the shared footer slot. */
export default function FundingSources() {
  const pathname = usePathname();
  if (!["/photovoltaik-foerderung", "/balkonkraftwerk/foerderung", "/ratgeber/waermepumpe-foerderung"].includes(pathname)) return null;
  return <DataSourcesSection id="foerderung-quellen">
    {pathname === "/photovoltaik-foerderung" && <p><a href={KFW_RENEWABLES_2025.sourceUrl}>KfW: Inländische Förderung im Geschäftsjahr {KFW_RENEWABLES_2025.year}</a>.
      Kredit-Zusagen im Programm „Erneuerbare Energien – Standard“, über alle geförderten erneuerbaren Technologien.</p>}
    <p>Die offiziellen Quellen der einzelnen Förderprogramme stehen in den jeweiligen Programmdetails.</p>
  </DataSourcesSection>;
}
