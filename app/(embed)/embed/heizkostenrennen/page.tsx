import WidgetPresentation from "../../../../components/dashboard/WidgetPresentation";
import {parseWidgetAppearance} from "../../../../lib/widget-appearance";
import type { Metadata } from "next";
import HeizkostenrennenEmbed from "./client";

export const metadata: Metadata = {
  title: "Das Heizkosten-Rennen: Gasheizung oder Wärmepumpe — Solar Check Widget",
  description:
    "Ein unsaniertes Einfamilienhaus, neue Gasheizung gegen Wärmepumpe über 20 Jahre: Wer hat bis wann mehr fürs Heizen bezahlt? Animiertes Rennen von solar-check.io.",
  robots: { index: false, follow: false },
};

export default async function HeizkostenrennenEmbedPage({searchParams}:{searchParams:Promise<Record<string,string>>}) {
  const appearance=parseWidgetAppearance(await searchParams);
  return <WidgetPresentation widgetId="heizkostenrennen" appearance={{...appearance,theme:appearance.theme??'light'}}><HeizkostenrennenEmbed /></WidgetPresentation>;
}
