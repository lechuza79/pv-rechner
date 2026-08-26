import { redirect } from "next/navigation";
import { isAdminSession } from "../../../../../lib/admin-guard";
import { socialKennzahlen } from "../../../../../lib/social-kennzahlen";
import { baueAllePosts } from "../../../../../lib/social-posts";
import { PUFFER_VOR_START, REGELN, SLOTS } from "../../../../../lib/redaktionsplan";
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
