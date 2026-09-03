import { redirect } from "next/navigation";
import { createClient } from "../../../../../lib/supabase-server-component";
import VersandAuswertung from "./client";

export const metadata = {
  title: "Übersicht – Kommunen-Outreach",
  robots: { index: false, follow: false },
};

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

// Auswertung des Kommunen-Outreach: was hinausging und was daraus wurde.
//
// EIGENE SEITE, nicht ein Abschnitt im Cockpit (Betreiber, 01.09.2026). Das
// Cockpit ist die Arbeitsfläche — filtern, Status pflegen, Brief ansehen. Die
// Auswertung ist die Gegenfrage dazu und wird selten, aber dann in Ruhe
// gelesen. Beides auf einer Seite hieß: Wer arbeiten will, scrollt an Zahlen
// vorbei, und wer die Zahlen sucht, findet sie über einer Tabelle mit 11.000
// Zeilen.
//
// Guard wie die übrigen Admin-Seiten (das Admin-Layout guarded zusätzlich den
// ganzen Teilbaum — defense in depth).
export default async function VersandPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !ADMIN_EMAILS.includes(user.email?.toLowerCase() || "")) {
    redirect("/");
  }

  return <VersandAuswertung />;
}
