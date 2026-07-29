import { redirect } from "next/navigation";
import { isAdminSession } from "../../../../lib/admin-guard";
import VersorgerCockpit from "./client";

export const metadata = {
  title: "Stadtwerke & Energieversorger – Solar Check",
  robots: { index: false, follow: false },
};

// Admin-Cockpit für die Versorger-Erfassung. Guard wie die übrigen Admin-Seiten
// (das Admin-Layout guarded zusätzlich den ganzen Teilbaum — defense in depth).
export default async function VersorgerPage() {
  if (!(await isAdminSession())) redirect("/");
  return <VersorgerCockpit />;
}
