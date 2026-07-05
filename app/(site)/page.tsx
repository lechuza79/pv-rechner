import type { Metadata } from "next";
import Link from "next/link";
import Header from "../../components/Header";
import { IconSun, IconBolt, IconSparkle, IconArrowRight, IconBattery, IconUser, IconSnowflake, IconEuro } from "../../components/Icons";
import { MastrHeroSection } from "../../components/MastrHeroSection";
import { v } from "../../lib/theme";
import { pageMetadata, energyOgImage } from "../../lib/seo";

export const metadata: Metadata = pageMetadata({
  path: "/",
  title: "Solar Check – Lohnt sich Photovoltaik? Ehrlich berechnet.",
  description:
    "Kostenloser PV-Rentabilitätsrechner mit direktem Ergebnis — ohne Anmeldung, ohne Verkaufsanrufe. Amortisation, Rendite und Szenarien für deine Photovoltaikanlage mit oder ohne Speicher.",
  ogImage: energyOgImage(),
});

const tools = [
  {
    href: "/pv-simulation",
    icon: IconSun,
    title: "Live Simulation",
    description: "Sieh in Echtzeit, was eine PV-Anlage an deinem Standort gerade produzieren würde — basierend auf aktuellen Wetterdaten.",
    cta: "Simulation starten",
  },
  {
    href: "/pv-bedarf-berechnen",
    icon: IconUser,
    title: "Was passt zu mir?",
    description: "Beschreibe Haus, Haushalt und Verbrauch — wir empfehlen dir die optimale PV-Anlage mit Speicher. Für alle, die nicht wissen, wo sie anfangen sollen.",
    cta: "Empfehlung starten",
  },
  {
    href: "/photovoltaik-rechner",
    icon: IconBolt,
    title: "Anlage rechnen",
    description: "Berechne Kosten, Ersparnis und Rendite einer PV-Anlage — individuell für deinen Haushalt. Wenn du schon weißt, was du planst.",
    cta: "Jetzt berechnen",
  },
  {
    href: "/waermepumpe-rechner",
    icon: IconBattery,
    title: "Wärmepumpe rechnen",
    description: "Einsparung, Amortisation und CO₂ einer Wärmepumpe vs. Gas/Öl — mit BEG-Förderung, transparent nach Fraunhofer ISE & BWP.",
    cta: "Prognose starten",
  },
  {
    href: "/klimaanlage-stromkosten",
    icon: IconSnowflake,
    title: "Klimaanlage rechnen",
    description: "Was kostet eine Klimaanlage im Betrieb? Stromverbrauch, Kosten und CO₂ aus echten Wetterdaten — und wie viel deine Solaranlage davon übernimmt.",
    cta: "Kosten berechnen",
  },
  {
    href: "/photovoltaik-foerderung",
    icon: IconEuro,
    title: "PV-Förderung finden",
    description: "Welche Zuschüsse gibt es in deinem Bundesland und deiner Stadt? Kommunale Programme, Landesförderung und der aktuelle Anlagenbestand vor Ort.",
    cta: "Förderung finden",
  },
  {
    href: "/strommix-deutschland",
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

        {/* Hero Text */}
        <div style={{ textAlign: "center", marginBottom: 20, paddingTop: 10 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", color: v('--color-text-primary'), lineHeight: 1.2 }}>Energie ehrlich berechnet.</h1>
          <p style={{ fontSize: 14, color: v('--color-text-muted'), marginTop: 8, lineHeight: 1.5 }}>Sieben Tools. Ohne Anmeldung, ohne Verkaufsanrufe.</p>
        </div>
      </div>

      {/* MaStR Hero Map — wider container, breaks out of the 480px column */}
      <div style={{ maxWidth: 760, margin: "0 auto 36px" }}>
        <MastrHeroSection />
      </div>

      {/* Tool Cards — breiter Container, 2-spaltig auf Desktop */}
      <div style={{ maxWidth: 760, margin: "0 auto 32px" }}>
        <div className="tool-cards-grid">
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
                  height: "100%",
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
      </div>

      <div style={{ maxWidth: v('--page-max-width'), margin: "0 auto" }}>

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
      </div>
    </div>
  );
}
