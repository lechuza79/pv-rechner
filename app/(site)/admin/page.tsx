import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase-server-component";
import { v } from "../../../lib/theme";
import AdminSeitenkopf from "../../../components/admin/AdminSeitenkopf";

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
  { href: "/admin/theme", title: "Designsystem", desc: "Farben, Schriften, Abstände, Ecken — die eine Quelle, aus der die Oberfläche gebaut wird. Signalfarben je Helligkeitsstufe live anpassbar." },
  { href: "/admin/komponenten", title: "Komponenten", desc: "Die Bausteine als Galerie: jeder echt und bedienbar, mit seinen Zuständen und dem, woraus er besteht." },
  { href: "/admin/prices", title: "Marktpreise", desc: "PV-/Speicher-Preise scrapen, manuell überschreiben, Historie ansehen." },
  { href: "/admin/charts", title: "Chart-Baukasten", desc: "Alle Charts und Werkzeuge mit Art, Quelle und nächstem Schritt — plus die Reihenfolge für ein neues Chart." },
  { href: "/admin/kommunen", title: "Kommunen-Outreach", desc: "Kontaktdaten der ~11.000 Gemeinden: filtern, Status pflegen, Kontaktseite öffnen." },
  { href: "/admin/versorger", title: "Stadtwerke & Energieversorger", desc: "Versorger erfassen, Gemeinden zuordnen, Kennzahlen im Versorgungsgebiet ansehen." },
  { href: "/admin/fachbetriebe", title: "PV-Fachbetriebe", desc: "Erhobene Solarteure und Elektrobetriebe mit PV-Geschäft — filtern, ansehen, vormerken." },
  { href: "/admin/waechter", title: "Wächter-Berichte", desc: "Ablage aller Wächter-Läufe — auch der stummen, die keine Mail ausgelöst haben." },
  { href: "/admin/einbettungen", title: "Einbettungen", desc: "Fremde Seiten, auf denen unsere Widgets laufen — der Erfolg des Outreach, ohne auf eine Antwort zu warten." },
  { href: "/admin/herkunft", title: "Herkunft", desc: "Woher die Aufrufe unserer eigenen Seiten kommen — am Server gezählt, weil die Messung im Browser die Herkunft nach dem ersten Klick verliert." },
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
        <AdminSeitenkopf titel="Admin-Backend" />

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
                <div style={{ fontSize: v("--font-size-lead"), fontWeight: 700, color: v("--color-text-primary") }}>{t.title}</div>
                <span style={{ fontSize: v("--font-size-h3"), color: v("--color-accent") }} aria-hidden>→</span>
              </div>
              <div style={{ fontSize: v("--font-size-small"), color: v("--color-text-muted"), marginTop: 4, lineHeight: 1.5 }}>{t.desc}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
