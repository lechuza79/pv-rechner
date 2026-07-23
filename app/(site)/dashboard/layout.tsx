import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase-server-component";
import InternalShell from "../../../components/InternalShell";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

// Guard + Shell fürs Dashboard. Jeder eingeloggte Nutzer sieht die Sidebar;
// die Admin-Sektion darin nur, wenn die Mail in ADMIN_EMAILS steht.
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const isAdmin = ADMIN_EMAILS.includes(user.email?.toLowerCase() || "");
  return <InternalShell isAdmin={isAdmin}>{children}</InternalShell>;
}
