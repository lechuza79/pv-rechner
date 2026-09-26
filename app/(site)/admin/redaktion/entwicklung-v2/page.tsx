import { redirect } from "next/navigation";
import { isAdminSession } from "../../../../../lib/admin-guard";
import StoryConceptLab from "../../../../../components/social/StoryConceptLab";
export const dynamic = "force-dynamic";
export const metadata = { title: "Redaktion · Entwicklung V2", robots: { index: false, follow: false } };
export default async function Page() {
  if (!(await isAdminSession())) redirect("/login?next=/admin/redaktion/entwicklung-v2");
  return <StoryConceptLab />;
}
