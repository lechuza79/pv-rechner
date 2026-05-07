import type { Metadata } from "next";
import EmbedDemoClient from "./client";

export const metadata: Metadata = {
  title: "Embed-Demo: Strommix-Widget",
  description: "Test-Sandbox für das einbettbare Strommix-Widget mit Whitelabel-Theming.",
  robots: { index: false, follow: false },
};

export default function EmbedDemoPage() {
  return <EmbedDemoClient />;
}
