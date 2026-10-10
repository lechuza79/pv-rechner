import { ATOMSTROM_RELEASE_READY } from '../../../lib/atomstrom-release';
import AtomstromPage, { generateMetadata as originalMetadata } from "./AtomstromPage";
import { atomstromMetadata } from "./seo-metadata";
export const revalidate = 3600;
type Props = { searchParams: Promise<{ variante?: string }> };
async function isSeoPreview(props: Props) {
  return ATOMSTROM_RELEASE_READY || (process.env.NODE_ENV === "development" && (await props.searchParams).variante !== "bisher");
}
export async function generateMetadata(props: Props) {
  if (!await isSeoPreview(props)) return originalMetadata();
  return atomstromMetadata();
}
export default async function Page(props: Props) { return <AtomstromPage seoVariant={await isSeoPreview(props)} />; }
