import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../../lib/supabase-server-component";
import { v } from "../../../../lib/theme";
import { allWidgets, brandLabel } from "../../../../lib/widget-registry";

export const metadata = {
  title: "Chart-Baukasten – Admin",
  robots: { index: false, follow: false },
};

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

// Lebende Übersicht über den Chart-Baukasten: was es gibt, woraus es besteht
// und in welcher Reihenfolge ein neues Chart entsteht. Die Tabelle liest das
// Register (lib/widget-registry) — sie kann also nicht veralten, solange neue
// Charts dort eingetragen werden. Genau das ist der Zweck: die Übersicht ist
// kein zweites Dokument, das gepflegt werden muss, sondern eine Ansicht auf die
// eine Quelle.

const SCHRITTE: { titel: string; text: string }[] = [
  {
    titel: "1. Eintrag ins Register",
    text: "lib/widget-registry.ts: Titel, Art (Werkzeug oder Chart), Teilen-Ziel, Datenquellen, ein nächster Schritt. Daraus kommen später Fußzeile, Bild-Fuß und Galerie — nichts davon wird ein zweites Mal getippt.",
  },
  {
    titel: "2. Karte bauen",
    text: "Das Chart selbst. Alles Interaktive (Umschalter, Knöpfe) bekommt die Markierung „nie im Bild“; Hilfetexte kommen als „?“ und melden sich von selbst am Bild-Fuß an.",
  },
  {
    titel: "3. Was nur das Bild braucht",
    text: "Skala, Legende und der gewählte Zustand (Zeitraum, Region, Variante) werden als „nur im Bild“ ergänzt. Online erklärt das Überfahren, im Bild niemand.",
  },
  {
    titel: "4. Die zwei Fußzeilen",
    text: "Auf der Seite die geteilte Fußzeile (nächster Schritt links, Aktionen rechts, Marke darunter), im Bild den Bild-Fuß (Legende, Fußnoten, Datenquelle links, Marke rechts). Beide bekommen den Register-Eintrag und sind damit automatisch einheitlich.",
  },
  {
    titel: "5. Am Bild prüfen, nicht am Bildschirm",
    text: "Herunterladen klicken und das PNG ansehen: Legende da? Skala da? Gewählter Zustand? Keine toten Knöpfe? Der Test e2e/widget-export.spec.ts prüft genau das automatisch.",
  },
];

export default async function AdminChartsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !ADMIN_EMAILS.includes(user.email?.toLowerCase() || "")) redirect("/");

  const widgets = allWidgets();
  const th: React.CSSProperties = {
    textAlign: "left",
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    color: v("--color-text-muted"),
    padding: "8px 10px",
    borderBottom: `1px solid ${v("--color-border")}`,
    whiteSpace: "nowrap",
  };
  const td: React.CSSProperties = {
    fontSize: 13,
    color: v("--color-text-secondary"),
    padding: "10px",
    borderBottom: `1px solid ${v("--color-border")}`,
    verticalAlign: "top",
  };

  return (
    <div style={{ maxWidth: 1000 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: v("--color-text-primary"), marginBottom: 6 }}>
        Chart-Baukasten
      </h1>
      <p style={{ fontSize: 14, color: v("--color-text-muted"), lineHeight: 1.6, marginBottom: 24, maxWidth: 640 }}>
        Alle einbettbaren Charts und Werkzeuge mit ihren Eckdaten. Die Tabelle liest dieselbe Quelle,
        aus der die Widgets ihre Fußzeile, ihr geteiltes Bild und die Galerie bauen — sie kann also
        nicht auseinanderlaufen.
      </p>

      <div style={{ overflowX: "auto", marginBottom: 32 }}>
        <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 760 }}>
          <thead>
            <tr>
              <th style={th}>Widget</th>
              <th style={th}>Art</th>
              <th style={th}>Zeile im Bild</th>
              <th style={th}>Nächster Schritt</th>
              <th style={th}>Datenquelle</th>
              <th style={th}>Bild</th>
            </tr>
          </thead>
          <tbody>
            {widgets.map((w) => (
              <tr key={w.id}>
                <td style={{ ...td, color: v("--color-text-primary"), fontWeight: 600 }}>
                  {w.title}
                  <div style={{ fontSize: 11, fontWeight: 400, color: v("--color-text-muted"), marginTop: 2 }}>
                    <Link href={`/embed/${w.id}`} style={{ color: v("--color-accent"), textDecoration: "none" }}>
                      /embed/{w.id}
                    </Link>
                  </div>
                </td>
                <td style={td}>{w.kind === "tool" ? "Werkzeug" : "Chart"}</td>
                <td style={td}>{brandLabel(w.kind)}</td>
                <td style={td}>{w.cta ? w.cta.label : <span style={{ color: v("--color-text-faint") }}>—</span>}</td>
                <td style={td}>{w.sources.map((s) => s.name).join(" · ")}</td>
                <td style={td}>
                  {w.exportable === false ? (
                    <span style={{ color: v("--color-text-faint") }}>kein Bild</span>
                  ) : (
                    "herunterladbar"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 style={{ fontSize: 17, fontWeight: 700, color: v("--color-text-primary"), marginBottom: 10 }}>
        So entsteht ein neues Chart
      </h2>
      <div style={{ display: "grid", gap: 10, maxWidth: 720 }}>
        {SCHRITTE.map((s) => (
          <div
            key={s.titel}
            style={{
              border: `1px solid ${v("--color-border")}`,
              borderRadius: v("--radius-md"),
              padding: "12px 14px",
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 700, color: v("--color-text-primary"), marginBottom: 4 }}>
              {s.titel}
            </div>
            <div style={{ fontSize: 13, color: v("--color-text-muted"), lineHeight: 1.6 }}>{s.text}</div>
          </div>
        ))}
      </div>

      <p style={{ fontSize: 12.5, color: v("--color-text-muted"), lineHeight: 1.6, marginTop: 20, maxWidth: 720 }}>
        Die ausführliche Fassung mit den Gründen steht in der Projektdoku unter „Das geteilte Bild“.
        Wer ein Chart baut, muss nur diese Seite und die geteilten Bausteine kennen.
      </p>
    </div>
  );
}
