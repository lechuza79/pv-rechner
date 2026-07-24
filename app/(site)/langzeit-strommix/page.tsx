import { v } from "../../../lib/theme";
import LangzeitStrommixClient from "./client";

// Prototyp — Ansichtsseite für den Langzeit-Strommix-Chart. Wird nach
// visueller Abnahme in ein Embed-Widget (app/(embed)/...) überführt.
export const metadata = {
  title: "Der deutsche Strommix 1990–2025 – Solar Check",
  robots: { index: false, follow: false },
};

export default function LangzeitStrommixPage() {
  return (
    <div style={{ background: v("--color-bg"), minHeight: "100vh", fontFamily: v("--font-text") }}>
      <main style={{ padding: "0 16px 24px" }}>
        <LangzeitStrommixClient />
      </main>
    </div>
  );
}
