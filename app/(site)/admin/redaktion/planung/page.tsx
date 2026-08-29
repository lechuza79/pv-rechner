import { redirect } from "next/navigation";
import { isAdminSession } from "../../../../../lib/admin-guard";
import { socialKennzahlen } from "../../../../../lib/social-kennzahlen";
import { baueAllePosts } from "../../../../../lib/social-posts";
import { FAMILIEN, PUFFER_VOR_START, REGELN, SLOTS } from "../../../../../lib/redaktionsplan";
import { fassungsAbdruck, ladeAllePruefungen } from "../../../../../lib/social-pruefung";
import { pruefeMechanisch } from "../../../../../lib/social-mechanik";
import { ladeVersand } from "../../../../../lib/social-versand-log";
import { ladeFassungen } from "../../../../../lib/social-vorlagen-db";
import { planen } from "../../../../../lib/social-plan";
import { baueKalender, deckung } from "../../../../../lib/social-kalender";
import { Wochenplan } from "../../../../../components/social/Wochenplan";
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

  // Der Tag wird EINMAL gelesen und überall hineingereicht — die Rechenmodule
  // haben bewusst keine Uhr, sonst ließe sich die Übersicht nicht gegen einen
  // Stichtag prüfen.
  const heuteIso = new Date().toISOString().slice(0, 10);

  let fertig = 0;
  let wochen: ReturnType<typeof baueKalender> = [];
  let gedeckt = { belegt: 0, offen: 0 };
  try {
    const kennzahlen = await socialKennzahlen();
    const posts = baueAllePosts(kennzahlen, await ladeFassungen());
    fertig = posts.length;

    const pruefungen = await ladeAllePruefungen();
    const versand = await ladeVersand();
    const plan = planen(
      posts.map((p) => ({
        post: p,
        abdruck: fassungsAbdruck({ text: p.text, bild: p.bild }),
        pruefungen: pruefungen[p.id] ?? [],
        befunde: pruefeMechanisch(p, kennzahlen),
      })),
      {
        gesendet: (id, abdruck) =>
          versand.some((x) => x.post_id === id && x.fassung_fingerabdruck === abdruck),
        // Noch nicht verdrahtet: Welche Gemeinden gerade ein Anschreiben
        // bekommen, steht in der Outreach-Ablage. Solange die Liste leer ist,
        // greift die Regel nicht — das ist sichtbar hier und nicht stillschweigend
        // im Rechenkern versteckt.
        orteMitAnschreiben: [],
      },
    );

    wochen = baueKalender(
      plan,
      versand.map((x) => ({
        postId: x.post_id,
        titel: posts.find((p) => p.id === x.post_id)?.titel ?? x.post_id,
        gesendetAmIso: x.gesendet_am.slice(0, 10),
      })),
      heuteIso,
    );
    gedeckt = deckung(wochen, heuteIso);
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

      {wochen.length > 0 && (
        <section style={{ marginBottom: space.xxxl }}>
          <h2 style={{ fontSize: v("--font-size-h3") }}>Die Wochen</h2>
          <p style={{ fontSize: v("--font-size-small"), color: v("--color-text-secondary"), marginTop: 0 }}>
            Kein zugesagter Termin, sondern der Vorrat auf die Plätze gelegt: Vergangenes kommt aus
            dem Versandprotokoll, Kommendes aus der Warteschlange. Verschiebt sich etwas, verschiebt
            sich die Anzeige mit — verstreichen kann hier nichts.{" "}
            {gedeckt.offen > 0
              ? `${gedeckt.belegt} der nächsten Plätze sind gedeckt, ${gedeckt.offen} nicht.`
              : `Alle ${gedeckt.belegt} kommenden Plätze sind gedeckt.`}
          </p>
          <Wochenplan wochen={wochen} heuteIso={heuteIso} />
        </section>
      )}

      <section style={{ ...karte, marginBottom: space.xxxl }}>
        <h2 style={{ fontSize: v("--font-size-h3"), marginTop: 0 }}>Vorrat</h2>
        <p style={{ fontSize: v("--font-size-body"), color: v("--color-text-secondary"), margin: 0 }}>
          {fertig} von {PUFFER_VOR_START} Posts fertig.{" "}
          {fehlend > 0
            ? `Es fehlen noch ${fehlend}. Ohne Puffer bricht die Kadenz beim ersten vollen Arbeitstag — und genau dann fällt es auf.`
            : "Der Puffer steht. Der erste Post kann raus."}
        </p>
      </section>

      {/* Dieselbe Liste, die in der Entwicklung die Kategorien bildet — hier mit
          dem Blick der Planung: was davon sich heute bauen ließe und was auf
          Daten wartet. Zwei Listen wären zwei Ordnungen für dieselbe Sache. */}
      <section style={{ marginBottom: space.xxxl }}>
        <h2 style={{ fontSize: v("--font-size-h3") }}>Der Vorrat an Themen</h2>
        <p style={{ fontSize: v("--font-size-small"), color: v("--color-text-secondary"), marginTop: 0 }}>
          {FAMILIEN.length} Geschichten-Familien — dieselbe Liste, die in der Entwicklung die
          Kategorien bildet. Was hier als „Daten da" steht, lässt sich ohne neuen Datenbestand
          bauen.
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
