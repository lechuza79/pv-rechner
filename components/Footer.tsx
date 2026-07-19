import Link from "next/link";
import { v } from "../lib/theme";

const linkStyle: React.CSSProperties = {
  fontSize: 11,
  color: v("--color-text-faint"),
  textDecoration: "none",
};

const groupLabelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: v("--color-text-muted"),
  marginBottom: 8,
};

const GROUPS: { label: string; links: { href: string; label: string }[] }[] = [
  {
    label: "Tools",
    links: [
      { href: "/photovoltaik-rechner", label: "PV-Rechner" },
      { href: "/balkonkraftwerk-rechner", label: "Balkonkraftwerk" },
      { href: "/waermepumpe-rechner", label: "Wärmepumpe" },
      { href: "/klimaanlage-stromkosten", label: "Klimaanlage" },
      { href: "/pv-bedarf-berechnen", label: "PV-Bedarf" },
      { href: "/pv-simulation", label: "Live-Simulation" },
      { href: "/photovoltaik-foerderung", label: "Förderung" },
      { href: "/strommix-deutschland", label: "Strommix" },
      { href: "/atomstrom-import", label: "Atomstrom-Import" },
    ],
  },
  {
    label: "Mehr",
    links: [
      { href: "/methodik", label: "Methodik" },
      { href: "/datenstand", label: "Datenstand" },
      { href: "/glossar", label: "Glossar" },
      { href: "/energie-widgets", label: "Widgets" },
      { href: "/kontakt", label: "Kontakt" },
      { href: "/impressum", label: "Impressum" },
      { href: "/datenschutz", label: "Datenschutz" },
    ],
  },
];

export default function Footer() {
  return (
    <div style={{ padding: "16px 0" }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "20px 48px" }}>
        {GROUPS.map((g) => (
          <div key={g.label} style={{ textAlign: "center" }}>
            <div style={groupLabelStyle}>{g.label}</div>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 14 }}>
              {g.links.map((l) => (
                <Link key={l.href} href={l.href} style={linkStyle}>{l.label}</Link>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p
        style={{
          fontSize: 11,
          lineHeight: 1.6,
          color: v("--color-text-faint"),
          textAlign: "center",
          maxWidth: 560,
          margin: "16px auto 0",
        }}
      >
        Alle Berechnungen und Angaben sind unverbindliche Näherungswerte ohne Anspruch auf
        Richtigkeit, Aktualität oder Vollständigkeit und stellen keine Rechts-, Steuer- oder
        Anlageberatung dar.
      </p>
    </div>
  );
}
