import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase-server-component";
import ThemeClient from "./client";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase()).filter(Boolean);

export const metadata = {
  title: "Design System – Solar Check",
  robots: { index: false, follow: false },
};

export default async function ThemePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !ADMIN_EMAILS.includes(user.email?.toLowerCase() || "")) {
    redirect("/");
  }

  return <ThemeClient />;
}
