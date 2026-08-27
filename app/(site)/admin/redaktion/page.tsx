import { redirect } from "next/navigation";
import { isAdminSession } from "../../../../lib/admin-guard";
import { socialKennzahlen } from "../../../../lib/social-kennzahlen";
import { baueAllePosts } from "../../../../lib/social-posts";
import { FAMILIEN } from "../../../../lib/redaktionsplan";
import { FeedVorschau } from "../../../../components/social/FeedVorschau";
import { VorlagenEditor } from "../../../../components/social/VorlagenEditor";
import { ladeVorlagen } from "../../../../lib/social-vorlagen-db";
import { v, space, pad } from "../../../../lib/theme";

// Entwicklung: Der Post so, wie er im Feed erscheint — Bild oben, Text darunter
// eingeklappt.
//
// Die Anordnung ist der Kern dieser Seite. Wer einen Beitrag mit vollständigem
// Text neben einem großen Bild beurteilt, beurteilt eine Ansicht, die niemand
// zu sehen bekommt: Im Feed kommt das Bild zuerst, der Text steht darunter nach
// wenigen Zeilen abgeschnitten, und in dieser Ansicht entscheidet sich, ob
// jemand stehenbleibt.
//
// Rechts daneben der Vorrat an Geschichten-Familien, damit beim Entwickeln
// sichtbar ist, was es sonst noch gibt und woran es jeweils hängt.

export const metadata = {
  title: "Redaktion – Entwicklung",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const ZUSTAND_TEXT: Record<string, string> = {
  gebaut: "gebaut",
  "daten-da": "Daten da",
  "fehlt-daten": "Daten fehlen",
  spaeter: "später",
};

export default async function RedaktionEntwicklung() {
  if (!(await isAdminSession())) redirect("/login?next=/admin/redaktion");

  let posts;
  let fehler: string | null = null;
  try {
    const [kennzahlen, vorlagen] = await Promise.all([socialKennzahlen(), ladeVorlagen()]);
    posts = baueAllePosts(kennzahlen, vorlagen);
  } catch (e) {
    fehler = (e as Error).message;
  }

  return (
    <div style={{ maxWidth: 1240, margin: "0 auto" }}>
      <h1 style={{ fontSize: v("--font-size-h1"), marginBottom: space.sm }}>Entwicklung</h1>
      <p style={{ color: v("--color-text-secondary"), marginBottom: space.huge, maxWidth: 760 }}>
        Text und Bild kommen aus derselben Berechnung — ein Post kann hier keine Zahl behaupten, die
        das Bild widerlegt. Die Vorschau zeigt den Beitrag so, wie er im Feed steht: Bild zuerst,
        Text darunter eingeklappt.
      </p>

      {fehler && (
        <p style={{ color: v("--color-negative"), marginBottom: space.xxl }}>
          Die Zahlen sind gerade nicht abrufbar: {fehler}
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: space.huge * 1.5 }}>
          {posts?.map((p) => (
            <section key={p.id} style={{ borderTop: `1px solid ${v("--color-border-muted")}`, paddingTop: space.xxl }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: space.md,
                  marginBottom: space.md,
                  flexWrap: "wrap",
                  maxWidth: 500,
                }}
              >
                <h2 style={{ fontSize: v("--font-size-h3"), margin: 0 }}>{p.titel}</h2>
                <span style={{ fontSize: v("--font-size-caption"), color: v("--color-text-muted") }}>
                  {p.kanal.join(" · ")} · {p.bild?.art === "kennzahl" ? "Einzelkennzahl" : "Vergleich"} ·{" "}
                  {p.text.length} Zeichen
                </span>
              </div>

              {/* Vorschau links, Bearbeitung rechts: Wer eine Formulierung
                  ändert, will die Wirkung sehen, ohne zu scrollen. */}
              <div style={{ display: "flex", gap: space.xxxl, alignItems: "flex-start", flexWrap: "wrap" }}>
                <div style={{ flex: "0 0 auto" }}>
                  <FeedVorschau bild={p.bild!} text={p.text} breite={440} />
                </div>
                <div style={{ flex: "1 1 460px", minWidth: 340 }}>
                  {p.vorlage && p.platzhalter ? (
                    <VorlagenEditor postId={p.id} vorlage={p.vorlage} platzhalter={p.platzhalter} />
                  ) : (
                    <p style={{ fontSize: v("--font-size-caption"), color: v("--color-text-muted") }}>
                      Noch nicht auf Vorlagen umgestellt — hier nur lesbar.
                    </p>
                  )}
                </div>
              </div>

              <details style={{ marginTop: space.md, maxWidth: 500 }}>
                <summary
                  style={{ cursor: "pointer", fontSize: v("--font-size-small"), color: v("--color-text-secondary") }}
                >
                  Belege ({p.belege.length})
                </summary>
                <ul
                  style={{
                    fontSize: v("--font-size-small"),
                    color: v("--color-text-secondary"),
                    marginTop: space.sm,
                    paddingLeft: space.lg,
                  }}
                >
                  {p.belege.map((b) => (
                    <li key={b} style={{ marginBottom: space.xs }}>
                      {b}
                    </li>
                  ))}
                </ul>
              </details>
            </section>
          ))}

        <aside style={{ maxWidth: 700 }}>
          <h2 style={{ fontSize: v("--font-size-h3"), marginTop: 0 }}>Der Vorrat</h2>
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
                      color: f.zustand === "gebaut" ? v("--color-positive") : v("--color-text-muted"),
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
        </aside>
      </div>
    </div>
  );
}
