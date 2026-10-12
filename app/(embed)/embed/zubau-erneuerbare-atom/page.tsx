import WidgetPresentation from '../../../../components/dashboard/WidgetPresentation';
import {parseWidgetAppearance} from '../../../../lib/widget-appearance';
import type { Metadata } from "next";
import ZubauWidget from "./client";

export const metadata: Metadata = {
  title: "Zubau: Erneuerbare vs. Atomkraft je Land — Solar Check Widget",
  description:
    "Jährlicher Zubau von Wind + Solar gegenüber Atomkraft, wählbar je Land, plus Vergleich Deutschland ↔ China. Quelle: Ember (CC BY 4.0).",
  robots: { index: false, follow: false },
};

export default async function ZubauEmbedPage({searchParams}:{searchParams:Promise<Record<string,string>>}) {
  const appearance = parseWidgetAppearance(await searchParams);
  return <WidgetPresentation widgetId="zubau-erneuerbare-atom" appearance={{...appearance,theme:appearance.theme ?? 'light'}}><ZubauWidget /></WidgetPresentation>;
}
