import Header from "../../../components/Header";
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
      <Header />
      <main style={{ padding: "24px 16px" }}>
        <LaendervergleichClient />
      </main>
    </div>
  );
}
