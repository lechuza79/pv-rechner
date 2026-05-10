import Link from "next/link";
import { v } from "../lib/theme";

const linkStyle: React.CSSProperties = {
  fontSize: 11,
  color: v("--color-text-faint"),
  textDecoration: "none",
};

export default function Footer() {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: 16,
        padding: "16px 0",
      }}
    >
      <Link href="/methodik" style={linkStyle}>Methodik</Link>
      <Link href="/embed-demo" style={linkStyle}>Widgets</Link>
      <Link href="/impressum" style={linkStyle}>Impressum</Link>
      <Link href="/datenschutz" style={linkStyle}>Datenschutz</Link>
      <Link href="/kontakt" style={linkStyle}>Kontakt</Link>
    </div>
  );
}
