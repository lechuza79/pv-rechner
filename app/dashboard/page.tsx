import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase-server-component";
import type { CalculationRow } from "../../lib/types";
import DashboardClient from "./client";

export const metadata = {
  title: "Meine Berechnungen – Solar Check",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: calculations } = await supabase
    .from("calculations")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  return (
    <DashboardClient
      calculations={(calculations as CalculationRow[]) || []}
      userEmail={user.email || ""}
    />
  );
}
