import type { ReactNode } from "react";
import FundingPageShell from "../../../../../components/FundingPageShell";
import { ATLAS_CITIES, isCityPublished, slugify } from "../../../../../lib/atlas-cities";

// Municipal presentation stays out of the root bundle and unrelated page payloads.
const routes = ATLAS_CITIES.filter(isCityPublished).map(city => ({
  href: `/photovoltaik-foerderung/${slugify(city.bundesland)}/${city.slug}`,
  name: city.name, breadcrumbName: city.kreis ? `${city.name} (${city.kreis})` : city.name, ags: city.ags, bundesland: city.bundesland,
}));
export default function FundingCityLayout({ children }: { children: ReactNode }) {
  return <FundingPageShell localRoutes={routes}>{children}</FundingPageShell>;
}
