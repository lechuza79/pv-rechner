import SimulationWidget from "./client";
import { WIDGET_METADATA } from "./meta";

// This address answers only requests without a valid `plz` and without
// `presentation=site`. Everything else is rewritten by the middleware onto the
// cached twin `[plz]/[darstellung]/page.tsx` (lib/embed-pfad-weiche.ts) —
// reading searchParams here would make the route dynamic, i.e. never cached.
export const metadata = WIDGET_METADATA;

export default function SimulationEmbedPage() {
  return <SimulationWidget plz="" sitePresentation={false} />;
}
