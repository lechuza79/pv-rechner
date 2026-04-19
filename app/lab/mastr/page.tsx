import type { Metadata } from "next";
import { MastrLab } from "./client";

export const metadata: Metadata = {
  title: "MaStR Lab",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <MastrLab />;
}
