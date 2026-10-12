import WidgetPresentation from "../../../../components/dashboard/WidgetPresentation";
import {parseWidgetAppearance,widgetVariantFromQuery} from "../../../../lib/widget-appearance";
import type { Metadata } from "next";
import KostenrennenEmbed from "./client";

export const metadata: Metadata = {
  title: "Das Stromkosten-Rennen: mit oder ohne PV — Solar Check Widget",
  description:
    "Zwei gleiche Haushalte über 25 Jahre, einer ohne und einer mit PV-Anlage: Wer hat bis wann mehr für Strom bezahlt? Animiertes Rennen von solar-check.io.",
  robots: { index: false, follow: false },
};

export default async function KostenrennenEmbedPage({searchParams}:{searchParams:Promise<Record<string,string>>}) {
  const query=await searchParams;
  const appearance=parseWidgetAppearance(query);
  const variant=widgetVariantFromQuery('pv-kostenrennen',new URLSearchParams(query));
  return <WidgetPresentation widgetId="pv-kostenrennen" variant={variant} appearance={{...appearance,theme:appearance.theme??'light'}}><KostenrennenEmbed preview={variant==='hero'} /></WidgetPresentation>;
}
