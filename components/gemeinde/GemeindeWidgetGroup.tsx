import WidgetConfigurationGroup from '../dashboard/WidgetConfigurationGroup';
import {curatedGalleryEntries, combinationGalleryEntries, type GalleryPlace} from '../../lib/widget-gallery';

/** The gallery and municipal landing page share the same configuration cards. */
export default function GemeindeWidgetGroup({place,title='Energie im Überblick',description,surfaceScheme}:{place:GalleryPlace;title?:string;description?:string;surfaceScheme?:'light'|'dark'}) {
  const available=curatedGalleryEntries(place);
  const entries=combinationGalleryEntries(available);
  return <div className="atlas-section atlas-wrap"><WidgetConfigurationGroup id="widget-settings" title={title} description={description} entries={entries} surfaceScheme={surfaceScheme}/></div>;
}
