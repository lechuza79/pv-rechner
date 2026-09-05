import { redirect } from "next/navigation";
import { isAdminSession } from "../../../../lib/admin-guard";
import FachbetriebeAnsicht from "./client";

export const metadata = {
  title: "PV-Fachbetriebe – Solar Check",
  robots: { index: false, follow: false },
};

// Ansicht für die erhobenen Fachbetriebe. Guard wie die übrigen Admin-Seiten
// (das Admin-Layout schützt zusätzlich den ganzen Teilbaum).
export default async function FachbetriebePage() {
  if (!(await isAdminSession())) redirect("/");
  return <FachbetriebeAnsicht />;
}
