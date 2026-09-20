import { redirect } from "next/navigation";
import { isAdminSession } from "../../../../lib/admin-guard";
import PresseAnsicht from "./client";

export const metadata = {
  title: "Presse & Creator – Solar Check",
  robots: { index: false, follow: false },
};

// Ansicht für den erhobenen Presse- und Creator-Katalog. Guard wie die übrigen
// Admin-Seiten (das Admin-Layout schützt zusätzlich den ganzen Teilbaum).
export default async function PressePage() {
  if (!(await isAdminSession())) redirect("/");
  return <PresseAnsicht />;
}
