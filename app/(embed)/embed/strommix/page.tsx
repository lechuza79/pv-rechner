import StrommixRadarPage from '../strommix-radar/page';
import WidgetPresentation from '../../../../components/dashboard/WidgetPresentation';
import {parseWidgetAppearance} from '../../../../lib/widget-appearance';
import { Suspense } from "react";
import { LoadingDots } from "../../../../components/LoadingDots";
import type { Metadata } from "next";
import StrommixWidget from "./client";

export const metadata: Metadata = {
  title: "Strommix Deutschland — Solar Check Widget",
  description:
    "Aktueller Strommix in Deutschland: Solar, Wind, Gas, Kohle, Sonstige. Live-Daten via solar-check.io.",
  robots: { index: false, follow: false },
};

export default async function StrommixEmbedPage({searchParams}:{searchParams:Promise<Record<string,string>>}) {
  const query=await searchParams;
  if(query.darstellung==='radar')return StrommixRadarPage({searchParams:Promise.resolve(query)});
  const appearance = parseWidgetAppearance(query);
  return <WidgetPresentation widgetId="strommix" appearance={{...appearance,theme:appearance.theme ?? 'light'}}><Suspense fallback={<LoadingDots />}><StrommixWidget /></Suspense></WidgetPresentation>;
}
