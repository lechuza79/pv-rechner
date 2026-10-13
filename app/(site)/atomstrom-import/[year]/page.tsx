import { ATOMSTROM_RELEASE_READY } from '../../../../lib/atomstrom-release';
import { notFound } from 'next/navigation';
import AtomstromPage from '../AtomstromPage';
import { ARCHIVE_YEARS } from '../annual-variant';
import { atomstromMetadata } from '../seo-metadata';
export const revalidate = 86400;
type Props = { params: Promise<{ year: string }> };
async function archiveYear(props: Props) {
  const { year } = await props.params;
  // Keep the unapproved archive local, just like the SEO preview.
  if ((!ATOMSTROM_RELEASE_READY && process.env.NODE_ENV !== 'development') || !ARCHIVE_YEARS.some(value => String(value) === year)) notFound();
  return Number(year);
}
export async function generateMetadata(props: Props) { return atomstromMetadata(await archiveYear(props)); }
export default async function Page(props: Props) { return <AtomstromPage seoVariant year={await archiveYear(props)} />; }
