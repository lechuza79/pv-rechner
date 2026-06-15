import Link from "next/link";
import { v } from "../lib/theme";

const linkStyle: React.CSSProperties = {
  fontSize: 11,
  color: v("--color-text-faint"),
  textDecoration: "none",
};

export default function Footer() {
  return (
    <div style={{ padding: "16px 0" }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 16,
        }}
      >
        <Link href="/methodik" style={linkStyle}>Methodik</Link>
        <Link href="/embed-demo" style={linkStyle}>Widgets</Link>
        <Link href="/impressum" style={linkStyle}>Impressum</Link>
        <Link href="/datenschutz" style={linkStyle}>Datenschutz</Link>
        <Link href="/kontakt" style={linkStyle}>Kontakt</Link>
      </div>
      <p
        style={{
          fontSize: 10,
          lineHeight: 1.6,
          color: v("--color-text-faint"),
          textAlign: "center",
          maxWidth: 560,
          margin: "12px auto 0",
        }}
      >
        Alle Berechnungen und Angaben sind unverbindliche Näherungswerte ohne Anspruch auf
        Richtigkeit, Aktualität oder Vollständigkeit und stellen keine Rechts-, Steuer- oder
        Anlageberatung dar.
      </p>
    </div>
  );
}
