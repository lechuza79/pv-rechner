import { redirect } from "next/navigation";
import { isAdminSession } from "../../../../../lib/admin-guard";
import { socialKennzahlen } from "../../../../../lib/social-kennzahlen";
import { baueAllePosts } from "../../../../../lib/social-posts";
import { FAMILIEN, PUFFER_VOR_START, REGELN, SLOTS } from "../../../../../lib/redaktionsplan";
import { v, space, pad } from "../../../../../lib/theme";

// Planung: Was steht bereit, was fehlt, und welche Regeln gelten vor jedem Post.
//
// Die Seite behauptet KEINEN Kalender. Ein Datum je Post wäre eine Zusage, die
// niemand einhält, sobald eine Woche voll ist — und ein Plan, der reihenweise
// verstreicht, wird nicht mehr gelesen. Stattdessen: die Kadenz, der Vorrat und
// die Regeln, die vor der Veröffentlichung stehen.

export const metadata = {
  title: "Redaktion – Planung",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const ZUSTAND_TEXT: Record<string, string> = {
  gebaut: "gebaut",
  "daten-da": "Daten da",
  "fehlt-daten": "Daten fehlen",
  spaeter: "später",
};

export default async function RedaktionPlanung() {
  if (!(await isAdminSession())) redirect("/login?next=/admin/redaktion/planung");

  let fertig = 0;
  try {
    fertig = baueAllePosts(await socialKennzahlen()).length;
  } catch {
    fertig = 0;
  }
  const fehlend = Math.max(0, PUFFER_VOR_START - fertig);

  const karte = {
    background: v("--color-bg-muted"),
    borderRadius: v("--radius-md"),
    padding: pad("xxl", "xxl"),
  } as const;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: v("--font-size-h1"), marginBottom: space.sm }}>Planung</h1>
      <p style={{ color: v("--color-text-secondary"), marginBottom: space.huge, maxWidth: 720 }}>
        Kadenz, Vorrat und die Regeln vor jeder Veröffentlichung. Bewusst kein Kalender mit festen
        Daten — ein Plan, dessen Termine reihenweise verstreichen, wird nach dem dritten Mal nicht
        mehr gelesen.
      </p>

      <section style={{ ...karte, marginBottom: space.xxxl }}>
        <h2 style={{ fontSize: v("--font-size-h3"), marginTop: 0 }}>Vorrat</h2>
        <p style={{ fontSize: v("--font-size-body"), color: v("--color-text-secondary"), margin: 0 }}>
          {fertig} von {PUFFER_VOR_START} Posts fertig.{" "}
          {fehlend > 0
            ? `Es fehlen noch ${fehlend}. Ohne Puffer bricht die Kadenz beim ersten vollen Arbeitstag — und genau dann fällt es auf.`
            : "Der Puffer steht. Der erste Post kann raus."}
        </p>
      </section>

      {/* Die neunzehn Familien stehen HIER und nicht mehr im Design-Werkzeug.
          Sie sind Themen und schneiden quer zu den Kategorien dort:
          Balkonkraftwerke liefern sowohl einen Kontrast als auch eine Bewegung.
          Eine Zuordnung Familie → Kategorie wäre in beiden Richtungen falsch —
          und die Frage „was gibt es noch" ist ohnehin eine der Planung. */}
      <section style={{ marginBottom: space.xxxl }}>
        <h2 style={{ fontSize: v("--font-size-h3") }}>Der Vorrat an Themen</h2>
        <p style={{ fontSize: v("--font-size-small"), color: v("--color-text-secondary"), marginTop: 0 }}>
          Neunzehn Geschichten-Familien. Was hier als „Daten da" steht, lässt sich ohne neuen
          Datenbestand bauen.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: space.xs }}>
          {FAMILIEN.map((f) => (
            <div
              key={f.kuerzel}
              style={{
                background: v("--color-bg-muted"),
                borderRadius: v("--radius-sm"),
                padding: pad("sm", "md"),
                opacity: f.zustand === "spaeter" ? 0.6 : 1,
              }}
            >
              <div style={{ display: "flex", gap: space.sm, alignItems: "baseline" }}>
                <span style={{ fontSize: v("--font-size-body"), flex: 1 }}>{f.name}</span>
                <span
                  style={{
                    fontSize: v("--font-size-caption"),
                    color: f.zustand === "gebaut" ? v("--color-positive-text") : v("--color-text-muted"),
                    whiteSpace: "nowrap",
                  }}
                >
                  {ZUSTAND_TEXT[f.zustand]}
                </span>
              </div>
              {f.hinweis && (
                <div style={{ fontSize: v("--font-size-caption"), color: v("--color-text-muted") }}>{f.hinweis}</div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: space.xxxl }}>
        <h2 style={{ fontSize: v("--font-size-h3") }}>Drei Plätze pro Woche</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: space.md }}>
          {SLOTS.map((s) => (
            <div key={s.tag} style={{ ...karte, display: "flex", gap: space.lg, alignItems: "baseline" }}>
              <span style={{ fontWeight: 700, minWidth: 32 }}>{s.tag}</span>
              <span style={{ fontSize: v("--font-size-body") }}>{s.beschreibung}</span>
            </div>
          ))}
        </div>
        <p style={{ fontSize: v("--font-size-small"), color: v("--color-text-muted"), marginTop: space.md }}>
          Wichtiger als ein vierter Post: täglich eine halbe Stunde in fremden Kommentarspalten. Bei
          einem Account ohne bestehende Reichweite ist das in den ersten Monaten der eigentliche
          Hebel.
        </p>
      </section>

      <section>
        <h2 style={{ fontSize: v("--font-size-h3") }}>Vor jedem Post</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: space.md }}>
          {REGELN.map((r) => (
            <div key={r.regel} style={karte}>
              <div style={{ fontWeight: 600, marginBottom: space.xs }}>{r.regel}</div>
              <div style={{ fontSize: v("--font-size-small"), color: v("--color-text-secondary") }}>{r.grund}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
