import { redirect } from "next/navigation";
import { createClient } from "../../../../lib/supabase-server-component";
import KommunenCockpit from "./client";

export const metadata = {
  title: "Kommunen-Outreach – Solar Check",
  robots: { index: false, follow: false },
};

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

// Admin-Cockpit für den Kommunen-Outreach. Guard wie die übrigen Admin-Seiten
// (das Admin-Layout guarded zusätzlich den ganzen Teilbaum — defense in depth).
export default async function KommunenOutreachPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !ADMIN_EMAILS.includes(user.email?.toLowerCase() || "")) {
    redirect("/");
  }

  return <KommunenCockpit />;
}
