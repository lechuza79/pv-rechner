import type { Metadata } from "next";
import { verlaufJahre } from "../../../(site)/einspeiseverguetung-tabelle/VerlaufsChart";
import VerlaufEmbed from "./client";

// Einbettbares Widget: Einspeisevergütung für kleine Dachanlagen seit 2000
// (Jahresbalken bis 2011, Monatslinie ab 2012) mit interaktiver Ereignis-
// Timeline. Alle Werte aus den geprüften Modulen (BNetzA-Archiv + gesetzliche
// Kette); ISR hält den aktuellen Rand an den Stichtagen 1.2./1.8. frisch.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Einspeisevergütung seit 2000 — Solar Check Widget",
  description:
    "Der Verlauf der EEG-Einspeisevergütung für kleine Dachanlagen seit 2000 mit den politischen Weichenstellungen. Cookiefrei einbettbar via solar-check.io.",
  robots: { index: false, follow: false },
};

export default function VerlaufEmbedPage() {
  // Serverseitig berechnet und als Prop gereicht (statt im Client neu):
  // so sind SSR-HTML und Hydration garantiert derselbe Datenstand.
  const jahre = verlaufJahre();
  return <VerlaufEmbed jahre={jahre} />;
}
