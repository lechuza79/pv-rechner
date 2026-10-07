import {notFound} from 'next/navigation';
import {widgetPartner} from '../../../../../lib/widget-brand';
import PartnerWidgetConfigurator from '../../../../../components/PartnerWidgetConfigurator';

import {globalStyles} from '../../../../../lib/theme';

export const metadata = {title: 'Widget einbetten – Solar Check', robots: {index: false, follow: false}};
export default async function Page({params}: {params: Promise<{partner: string}>}) {
  const {partner: id} = await params;
  const partner = widgetPartner(id);
  if (!partner) notFound();
  return <><style>{globalStyles}</style><PartnerWidgetConfigurator partner={id} label={partner.brand.label}/></>;
}
