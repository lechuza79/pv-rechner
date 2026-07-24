import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase-server-component";
import { v } from "../../../lib/theme";

export const metadata = {
  title: "Admin – Solar Check",
  robots: { index: false, follow: false },
};

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

// The admin tools. Add a row here when a new admin page ships.
const TOOLS: { href: string; title: string; desc: string }[] = [
  { href: "/admin/theme", title: "Signalfarben-Theming", desc: "Grün, Rot und Energie-Farben pro Helligkeitsstufe anpassen — live vorschaubar." },
  { href: "/admin/prices", title: "Marktpreise", desc: "PV-/Speicher-Preise scrapen, manuell überschreiben, Historie ansehen." },
];

export default async function AdminHub() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !ADMIN_EMAILS.includes(user.email?.toLowerCase() || "")) {
    redirect("/");
  }

  return (
    <div style={{ fontFamily: v("--font-text"), color: v("--color-text-primary") }}>
      <div style={{ maxWidth: 640 }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: v("--color-accent"), letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>Admin</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: v("--color-text-primary"), marginBottom: 4 }}>Admin-Backend</h1>
          <p style={{ fontSize: 13, color: v("--color-text-muted") }}>Interne Werkzeuge. Nur für angemeldete Admins sichtbar.</p>
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          {TOOLS.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              style={{
                display: "block", textDecoration: "none",
                background: v("--color-bg"), border: `1px solid ${v("--color-border")}`,
                borderRadius: v("--radius-md"), padding: "16px 18px",
                boxShadow: v("--shadow-sm"),
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: v("--color-text-primary") }}>{t.title}</div>
                <span style={{ fontSize: 18, color: v("--color-accent") }} aria-hidden>→</span>
              </div>
              <div style={{ fontSize: 13, color: v("--color-text-muted"), marginTop: 4, lineHeight: 1.5 }}>{t.desc}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
