import { notFound } from "next/navigation";
import AtomstromPage from "../AtomstromPage";
export const metadata = { title: "Atomstrom – bisheriger Entwurf", robots: { index: false, follow: false } };
export default function PreviousDraft() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <AtomstromPage hero={false} />;
}
