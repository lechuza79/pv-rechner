import {notFound} from 'next/navigation';
import {widgetPartner, parseWidgetHeader, parsePartnerWidgetHeight} from '../../../../../../lib/widget-brand';
import {MUNICIPAL_WIDGET_VIEWS} from '../../../../../../lib/municipal-widget-views';
import {ladeGemeindePaket} from '../../../../../../lib/gemeinde-paket-server';
import {paketFuer} from '../../../../../../components/gemeinde/paket-teile';
import GemeindeAnsicht from '../../../../../../components/gemeinde/GemeindeAnsicht';
import WidgetPresentation from '../../../../../../components/dashboard/WidgetPresentation';

// The finite path includes all server-side identity. No request-time query parsing.
export const revalidate = 86400;
export default async function Page({params}: {params: Promise<{partner: string; widget: string[]}>}) {
  const {partner: id, widget: segments} = await params;
  const partner = widgetPartner(id);
  const [widget, mode, height] = segments;
  const widgetHeight = parsePartnerWidgetHeight(height);
  const header = parseWidgetHeader(mode);
  const single = Object.hasOwn(MUNICIPAL_WIDGET_VIEWS, widget) ? MUNICIPAL_WIDGET_VIEWS[widget as keyof typeof MUNICIPAL_WIDGET_VIEWS] : undefined;
  if (!partner || !single || !header || !widgetHeight || segments.length > 3 || (height !== undefined && widget !== 'regional-annual-growth')) notFound();
  const paket = await ladeGemeindePaket(partner.ags);
  if (!paket) return <p role="status">Für diesen Ort liegen noch keine Daten vor.</p>;
  return <WidgetPresentation appearance={{theme: 'light', sharing: 'primary', partner: {brand: partner.brand, header, widgetHeight}}}>
    <GemeindeAnsicht ansicht="monitor" paket={paketFuer('monitor', paket)} single={single}/>
  </WidgetPresentation>;
}
