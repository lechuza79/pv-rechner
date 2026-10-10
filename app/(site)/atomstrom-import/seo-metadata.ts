import { ATOMSTROM_RELEASE_READY } from '../../../lib/atomstrom-release';
import { pageMetadata } from '../../../lib/seo';
import { getSeoVariant } from './seo-variant';
import { getAnnualVariant } from './annual-variant';
/** Both routes derive their search and sharing answer from the rendered period. */
export async function atomstromMetadata(year?: number) {
  const data = year ? getAnnualVariant(year) : await getSeoVariant();
  const periodYear = year ?? data.ytd?.year ?? new Intl.DateTimeFormat('de-DE', { year: 'numeric', timeZone: 'Europe/Berlin' }).format(new Date());
  const path = year ? `/atomstrom-import/${year}` : '/atomstrom-import';
  return {
    ...pageMetadata({ path, title: `Atomstrom-Import Deutschland ${periodYear}: ${year ? 'Jahresrückblick und Herkunft' : 'aktuelle Zahlen'}`, description: `${data.yearAnswer} ${year ? data.dayAnswer : 'Aktuelle Tagesmengen, Herkunftsländer und Methodik.'}`, keywords: ['Atomstrom Import', 'Stromimport Deutschland', 'Kernenergie'], ogImage: `${process.env.NODE_ENV === 'development' ? 'http://localhost:4298' : 'https://solar-check.io'}${data.ogPath}` }),
    robots: { index: ATOMSTROM_RELEASE_READY && process.env.NODE_ENV === 'production', follow: true },
  };
}
