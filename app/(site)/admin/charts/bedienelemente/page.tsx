import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminSession } from "../../../../../lib/admin-guard";
import { v, space } from "../../../../../lib/theme";
import Bedienelemente from "../Bedienelemente";

export const metadata = { title: "Bedienelemente – Admin", robots: { index: false, follow: false } };

export default async function BedienelementeSeite() {
  if (!(await isAdminSession())) redirect("/login?next=/admin/charts/bedienelemente");
  return (
    <div style={{ maxWidth: 1400, margin: "0 auto" }}>
      <p style={{ fontSize: v("--font-size-small"), marginBottom: space.md }}>
        <Link href="/admin/charts" style={{ color: v("--color-accent") }}>← Widget-Galerie</Link>
      </p>
      <Bedienelemente />
    </div>
  );
}
