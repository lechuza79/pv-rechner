import AdminSeitenkopf from '../../../../components/admin/AdminSeitenkopf';
import PreviewCatalog from './PreviewCatalog';

export const metadata = { title: 'Vorschauen – Solar Check', robots: { index: false, follow: false } };

export default function PreviewsPage() {
  return <div><AdminSeitenkopf titel="Vorschauen" /><PreviewCatalog /></div>;
}
