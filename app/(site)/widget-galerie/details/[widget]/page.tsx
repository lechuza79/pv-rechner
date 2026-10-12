import Link from 'next/link';
import {notFound} from 'next/navigation';
import {galleryPlace} from '../../../../../lib/widget-gallery-place';
import {widgetConfiguration} from '../../../../../lib/widget-appearance';
import {curatedGalleryEntries} from '../../../../../lib/widget-gallery';
import WidgetPreviewCard from '../../../../../components/dashboard/WidgetPreviewCard';
import styles from '../../gallery.module.css';
export const metadata={title:'Widget-Varianten — Solar Check',robots:{index:false,follow:false}};
export default async function Page({params,searchParams}:{params:Promise<{widget:string}>;searchParams:Promise<{ags?:string;compact?:string;period?:string}>}){
 const [{widget},query]=await Promise.all([params,searchParams]);
 const place=await galleryPlace(query.ags??'06440016');
 if(!place)return <p>Ortsdaten sind gerade nicht verfügbar.</p>;
 const entry=curatedGalleryEntries(place).find(item=>item.id===widget);
 if(!entry)notFound();
 const initialDataSettings:Record<string,string>={};
 const periodField=widgetConfiguration(widget)?.dataSettings?.find(field=>field.key==='period');
 if(query.period&&periodField?.options.some(option=>option.value===query.period))initialDataSettings.period=query.period;
 return <div className={styles.page}>
  <Link href="/widget-galerie/layout-referenz">← Zur Raster-Testfläche</Link>
  <p style={{margin:'24px 0'}}>Verfügbare Darstellungen auswählen und im Einstellungsdialog anpassen.</p>
  <WidgetPreviewCard entry={entry} initialCompact={query.compact==='1'} initialDataSettings={initialDataSettings} settingsModal defaults={{theme:'dark',autoplay:false}}/>
 </div>;
}
