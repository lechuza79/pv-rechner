import { v } from "../../../lib/theme";
import LaendervergleichClient from "./client";

// Prototyp — Ländervergleich zur "Sonderweg"-Einordnung. Nach visueller Abnahme
// in ein Embed-Widget überführbar.
export const metadata = {
  title: "Energiewende im Ländervergleich – Sonderweg? | Solar Check",
  robots: { index: false, follow: false },
};

export default function LaendervergleichPage() {
  return (
    <div style={{ background: v("--color-bg"), minHeight: "100vh", fontFamily: v("--font-text") }}>
      <main style={{ padding: "0 16px 24px" }}>
        <LaendervergleichClient />
      </main>
    </div>
  );
}
