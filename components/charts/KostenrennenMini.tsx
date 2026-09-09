"use client";

import { useMemo } from "react";
import { usePrices } from "../../lib/prices";
import { feedInRatesFor } from "../../lib/feedin-config";
import { kostenrennen, RENNEN_OHNE_MIT_PV } from "../../lib/kostenrennen";
import KostenrennenWidget from "./KostenrennenWidget";

// Die Kurzfassung des Stromkosten-Rennens für redaktionelle Seiten: nur das
// Chart, verlinkt auf den Ratgeber. Preise kommen live wie im Rechner
// (usePrices), damit Teaser, Rennen und Rechner dieselbe Zahl tragen — und die
// Seite, die den Teaser zeigt, bleibt statisch.
export default function KostenrennenMini() {
  const prices = usePrices();
  const rennen = useMemo(() => kostenrennen(RENNEN_OHNE_MIT_PV, { prices, feedIn: feedInRatesFor() }), [prices]);
  return <KostenrennenWidget rennen={rennen} variante="mini" onsite branding={false} preiseStandIso={prices.validFrom} />;
}
