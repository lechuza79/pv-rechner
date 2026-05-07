import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase-server-component";
import { supabase } from "../../../lib/supabase-server";
import PricesClient from "./client";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase()).filter(Boolean);

export const metadata = {
  title: "Marktpreise – Solar Check Admin",
  robots: { index: false, follow: false },
};

export default async function PricesPage() {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();

  if (!user || !ADMIN_EMAILS.includes(user.email?.toLowerCase() || "")) {
    redirect("/");
  }

  // Load price history
  let history: Array<{
    id: string;
    pv_price_small: number;
    pv_price_large: number;
    pv_threshold_kwp: number;
    battery_base: number;
    battery_per_kwh: number;
    valid_from: string;
    source: string | null;
    notes: string | null;
    updated_by: string | null;
    created_at: string;
  }> = [];

  let feedInHistory: Array<{
    id: string;
    teil_under_10: number;
    teil_over_10: number;
    voll_under_10: number;
    voll_over_10: number;
    threshold_kwp: number;
    valid_from: string;
    source: string | null;
    notes: string | null;
    updated_by: string | null;
    created_at: string;
  }> = [];

  if (supabase) {
    const [priceRes, feedInRes] = await Promise.all([
      supabase.from("market_prices").select("*").order("valid_from", { ascending: false }).limit(20),
      supabase.from("feed_in_rates").select("*").order("valid_from", { ascending: false }).limit(20),
    ]);
    if (priceRes.data) history = priceRes.data;
    if (feedInRes.data) feedInHistory = feedInRes.data;
  }

  return <PricesClient history={history} feedInHistory={feedInHistory} />;
}
