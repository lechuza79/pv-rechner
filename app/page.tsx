import Link from "next/link";

export default function Home() {
  return (
    <div style={{ background: "#0c0c0c", fontFamily: "'DM Sans',system-ui,sans-serif", color: "#f0f0f0", minHeight: "100vh", padding: "20px 16px" }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 36, paddingTop: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#22c55e", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>PV Rechner</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", color: "#fff", lineHeight: 1.2 }}>Lohnt sich Photovoltaik?</h1>
          <p style={{ fontSize: 14, color: "#666", marginTop: 8, lineHeight: 1.5 }}>Ehrlich berechnet. Ohne Leadfunnel.</p>
        </div>

        {/* Flow-Auswahl */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
          <Link href="/empfehlung" style={{ textDecoration: "none" }}>
            <div style={{
              background: "#151515", borderRadius: 16, padding: "20px", cursor: "pointer",
              border: "2px solid #22c55e",
            }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#f0f0f0", marginBottom: 6 }}>
                Was passt zu mir?
              </div>
              <div style={{ fontSize: 13, color: "#888", lineHeight: 1.5 }}>
                Beschreibe deinen Haushalt und dein Dach — wir empfehlen dir die passende Anlage.
              </div>
              <div style={{
                marginTop: 12, display: "inline-block", padding: "8px 16px", borderRadius: 10,
                fontSize: 13, fontWeight: 700, background: "#22c55e", color: "#000",
              }}>
                Empfehlung starten →
              </div>
            </div>
          </Link>

          <Link href="/rechner" style={{ textDecoration: "none" }}>
            <div style={{
              background: "#151515", borderRadius: 16, padding: "20px", cursor: "pointer",
              border: "2px solid #2a2a2a",
            }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#f0f0f0", marginBottom: 6 }}>
                Ich kenne meine Anlage
              </div>
              <div style={{ fontSize: 13, color: "#888", lineHeight: 1.5 }}>
                Du weißt schon wie groß deine Anlage wird? Gib kWp und Speicher ein und rechne direkt.
              </div>
              <div style={{
                marginTop: 12, display: "inline-block", padding: "8px 16px", borderRadius: 10,
                fontSize: 13, fontWeight: 600, background: "transparent", color: "#999",
                border: "1px solid #333",
              }}>
                Direkt rechnen →
              </div>
            </div>
          </Link>
        </div>

        {/* Keine Daten */}
        <div style={{ textAlign: "center", fontSize: 12, color: "#555", marginBottom: 24, lineHeight: 1.6 }}>
          Keine Datensammlung · Keine Werbung · Keine Anmeldung nötig
        </div>

        {/* Footer Links */}
        <div style={{ display: "flex", justifyContent: "center", gap: 16, padding: "16px 0" }}>
          <Link href="/methodik" style={{ fontSize: 11, color: "#555", textDecoration: "none" }}>Methodik</Link>
          <Link href="/impressum" style={{ fontSize: 11, color: "#555", textDecoration: "none" }}>Impressum</Link>
          <Link href="/datenschutz" style={{ fontSize: 11, color: "#555", textDecoration: "none" }}>Datenschutz</Link>
        </div>
      </div>
    </div>
  );
}
