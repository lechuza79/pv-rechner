import type { Metadata } from "next";
import PasswortSetzen from "./client";

export const metadata: Metadata = {
  title: "Passwort setzen – Solar Check",
  robots: { index: false, follow: false },
};

export default function PasswortSetzenPage() {
  return <PasswortSetzen />;
}
