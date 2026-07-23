import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase-server-component";
import InternalShell from "../../../components/InternalShell";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

// Guard + Shell für den gesamten Admin-Teilbaum (/admin, /admin/theme,
// /admin/prices). Die einzelnen Seiten prüfen zusätzlich selbst (defense in
// depth) — hier landet die Sidebar-Shell einmal für alle.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !ADMIN_EMAILS.includes(user.email?.toLowerCase() || "")) {
    redirect("/");
  }

  return <InternalShell isAdmin>{children}</InternalShell>;
}
