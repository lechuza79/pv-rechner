import Link from "next/link";
import Logo from "../components/Logo";
import { v } from "../lib/theme";

export default function Home() {
  return (
    <div style={{ background: v('--color-bg'), fontFamily: v('--font-text'), color: v('--color-text-primary'), minHeight: "100vh", padding: "20px 16px" }}>
      <div style={{ maxWidth: v('--page-max-width'), margin: "0 auto" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 36, paddingTop: 20 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}><Logo height={28} /></div>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", color: v('--color-text-primary'), lineHeight: 1.2 }}>Lohnt sich Photovoltaik?</h1>
          <p style={{ fontSize: 14, color: v('--color-text-muted'), marginTop: 8, lineHeight: 1.5 }}>Ehrlich berechnet. Ohne Leadfunnel.</p>
        </div>

        {/* Flow-Auswahl */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
          <Link href="/empfehlung" style={{ textDecoration: "none" }}>
            <div style={{
              background: v('--color-bg'), borderRadius: v('--radius-lg'), padding: "20px", cursor: "pointer",
              border: `2px solid ${v('--color-accent')}`,
            }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: v('--color-text-primary'), marginBottom: 6 }}>
                Was passt zu mir?
              </div>
              <div style={{ fontSize: 13, color: v('--color-text-secondary'), lineHeight: 1.5 }}>
                Beschreibe deinen Haushalt und dein Dach — wir empfehlen dir die passende Anlage.
              </div>
              <div style={{
                marginTop: 12, display: "inline-block", padding: "8px 16px", borderRadius: v('--radius-md'),
                fontSize: 13, fontWeight: 700, background: v('--color-accent'), color: v('--color-text-on-accent'),
              }}>
                Empfehlung starten →
              </div>
            </div>
          </Link>

          <Link href="/rechner" style={{ textDecoration: "none" }}>
            <div style={{
              background: v('--color-bg'), borderRadius: v('--radius-lg'), padding: "20px", cursor: "pointer",
              border: `2px solid ${v('--color-border')}`,
            }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: v('--color-text-primary'), marginBottom: 6 }}>
                Ich kenne meine Anlage
              </div>
              <div style={{ fontSize: 13, color: v('--color-text-secondary'), lineHeight: 1.5 }}>
                Du weißt schon wie groß deine Anlage wird? Gib kWp und Speicher ein und rechne direkt.
              </div>
              <div style={{
                marginTop: 12, display: "inline-block", padding: "8px 16px", borderRadius: v('--radius-md'),
                fontSize: 13, fontWeight: 600, background: "transparent", color: v('--color-text-muted'),
                border: `1px solid ${v('--color-border-muted')}`,
              }}>
                Direkt rechnen →
              </div>
            </div>
          </Link>
        </div>

        {/* Keine Daten */}
        <div style={{ textAlign: "center", fontSize: 12, color: v('--color-text-faint'), marginBottom: 24, lineHeight: 1.6 }}>
          Keine Datensammlung · Keine Werbung · Keine Anmeldung nötig
        </div>

        {/* Footer Links */}
        <div style={{ display: "flex", justifyContent: "center", gap: 16, padding: "16px 0" }}>
          <Link href="/methodik" style={{ fontSize: 11, color: v('--color-text-faint'), textDecoration: "none" }}>Methodik</Link>
          <Link href="/impressum" style={{ fontSize: 11, color: v('--color-text-faint'), textDecoration: "none" }}>Impressum</Link>
          <Link href="/datenschutz" style={{ fontSize: 11, color: v('--color-text-faint'), textDecoration: "none" }}>Datenschutz</Link>
        </div>
      </div>
    </div>
  );
}
