import Link from "next/link";
import Header from "../components/Header";
import { IconSun, IconBolt, IconSparkle, IconArrowRight, IconBattery } from "../components/Icons";
import { v } from "../lib/theme";

const tools = [
  {
    href: "/simulation",
    icon: IconSun,
    title: "Live Simulation",
    description: "Sieh in Echtzeit, was eine PV-Anlage an deinem Standort gerade produzieren würde — basierend auf aktuellen Wetterdaten.",
    cta: "Simulation starten",
  },
  {
    href: "/rechner",
    icon: IconBolt,
    title: "Anlage rechnen",
    description: "Berechne Kosten, Ersparnis und Rendite einer PV-Anlage — individuell für deinen Haushalt.",
    cta: "Jetzt berechnen",
  },
  {
    href: "/waermepumpe",
    icon: IconBattery,
    title: "Wärmepumpe rechnen",
    description: "Einsparung, Amortisation und CO₂ einer Wärmepumpe vs. Gas/Öl — mit BEG-Förderung, transparent nach Fraunhofer ISE & BWP.",
    cta: "Prognose starten",
  },
  {
    href: "/energie",
    icon: IconSparkle,
    title: "Energiedaten Deutschland",
    description: "Deutschlands Strommix live: Solar, Wind, Gas, Kohle — transparent und aktuell.",
    cta: "Charts ansehen",
  },
];

export default function Home() {
  return (
    <div style={{ background: v('--color-bg'), fontFamily: v('--font-text'), color: v('--color-text-primary'), minHeight: "100vh", padding: "20px 16px" }}>

        <Header />

      <div style={{ maxWidth: v('--page-max-width'), margin: "0 auto" }}>

        {/* Hero */}
        <div style={{ textAlign: "center", marginBottom: 36, paddingTop: 10 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", color: v('--color-text-primary'), lineHeight: 1.2 }}>Energie ehrlich berechnet.</h1>
          <p style={{ fontSize: 14, color: v('--color-text-muted'), marginTop: 8, lineHeight: 1.5 }}>Vier Tools. Ohne Anmeldung, ohne Leadfunnel.</p>
        </div>

        {/* Tool Cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link key={tool.href} href={tool.href} style={{ textDecoration: "none" }}>
                <div style={{
                  background: v('--color-bg'),
                  borderRadius: v('--radius-lg'),
                  padding: "24px 20px",
                  cursor: "pointer",
                  border: `1px solid ${v('--color-border')}`,
                }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: "50%",
                    background: v('--color-bg-accent'),
                    border: `1px solid ${v('--color-border-accent')}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    marginBottom: 14,
                  }}>
                    <Icon size={22} color={v('--color-accent')} />
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: v('--color-text-primary'), marginBottom: 6 }}>
                    {tool.title}
                  </div>
                  <div style={{ fontSize: 13, color: v('--color-text-secondary'), lineHeight: 1.5 }}>
                    {tool.description}
                  </div>
                  <div style={{
                    marginTop: 14, display: "inline-block", padding: "8px 16px", borderRadius: v('--radius-md'),
                    fontSize: 13, fontWeight: 700, background: v('--color-accent'), color: v('--color-text-on-accent'),
                  }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      {tool.cta} <IconArrowRight size={12} />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Trust Badge */}
        <div style={{
          textAlign: "center", marginBottom: 24, padding: "12px 16px",
          borderRadius: v('--radius-md'), background: v('--color-bg-accent'),
          border: `1px solid ${v('--color-border-accent')}`,
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: v('--color-accent') }}>
            🔒 Keine Anmeldung nötig
          </div>
          <div style={{ fontSize: 11, color: v('--color-text-muted'), marginTop: 4 }}>
            Keine Datensammlung · Keine Werbung · Kein Vertriebskontakt
          </div>
        </div>

        {/* Footer Links */}
        <div style={{ display: "flex", justifyContent: "center", gap: 16, padding: "16px 0" }}>
          <Link href="/methodik" style={{ fontSize: 11, color: v('--color-text-faint'), textDecoration: "none" }}>Methodik</Link>
          <Link href="/impressum" style={{ fontSize: 11, color: v('--color-text-faint'), textDecoration: "none" }}>Impressum</Link>
          <Link href="/datenschutz" style={{ fontSize: 11, color: v('--color-text-faint'), textDecoration: "none" }}>Datenschutz</Link>
          <Link href="/kontakt" style={{ fontSize: 11, color: v('--color-text-faint'), textDecoration: "none" }}>Kontakt</Link>
        </div>
      </div>
    </div>
  );
}
