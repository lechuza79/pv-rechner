import { redirect } from "next/navigation";
import { isAdminSession } from "../../../../lib/admin-guard";
import { socialKennzahlen } from "../../../../lib/social-kennzahlen";
import { baueAllePosts, FEED_ABSCHNITT_ZEICHEN } from "../../../../lib/social-posts";
import { SocialKarte } from "../../../../components/social/SocialKarte";
import { v, space, pad } from "../../../../lib/theme";

// Entwicklung: Hier wird ein Post so lange gedreht, bis er sitzt.
//
// Text und Bild stehen nebeneinander, weil sie aus derselben Berechnung kommen
// und nur gemeinsam beurteilt werden können. Zwei Dinge zeigt die Seite
// zusätzlich, die man sonst erst nach dem Veröffentlichen merkt: wo der Feed
// den Text abschneidet, und wie die Karte in Vorschaugröße aussieht — im Feed
// entscheidet sich in dieser Größe, ob jemand stehenbleibt, nicht in der
// Vollansicht.

export const metadata = {
  title: "Redaktion – Entwicklung",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function RedaktionEntwicklung() {
  if (!(await isAdminSession())) redirect("/login?next=/admin/redaktion");

  let posts;
  let fehler: string | null = null;
  try {
    posts = baueAllePosts(await socialKennzahlen());
  } catch (e) {
    fehler = (e as Error).message;
  }

  return (
    <div style={{ maxWidth: 1240, margin: "0 auto" }}>
      <h1 style={{ fontSize: v("--font-size-h1"), marginBottom: space.sm }}>Entwicklung</h1>
      <p style={{ color: v("--color-text-secondary"), marginBottom: space.huge, maxWidth: 760 }}>
        Text und Bild kommen aus derselben Berechnung. Ändert sich der Datenstand, ändern sich beide
        gemeinsam — ein Post kann hier keine Zahl behaupten, die das Bild widerlegt.
      </p>

      {fehler && (
        <p style={{ color: v("--color-negative"), marginBottom: space.xxl }}>
          Die Zahlen sind gerade nicht abrufbar: {fehler}
        </p>
      )}

      {posts?.map((p) => {
        const abgeschnitten = p.text.length > FEED_ABSCHNITT_ZEICHEN;
        const sichtbar = p.text.slice(0, FEED_ABSCHNITT_ZEICHEN);
        const rest = p.text.slice(FEED_ABSCHNITT_ZEICHEN);
        return (
          <section
            key={p.id}
            style={{
              marginBottom: space.huge * 2,
              paddingBottom: space.huge,
              borderBottom: `1px solid ${v("--color-border-muted")}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: space.md, marginBottom: space.lg, flexWrap: "wrap" }}>
              <h2 style={{ fontSize: v("--font-size-h2"), margin: 0 }}>{p.titel}</h2>
              <span style={{ fontSize: v("--font-size-small"), color: v("--color-text-muted") }}>
                {p.kanal.join(" · ")} · {p.bild?.art === "kennzahl" ? "Einzelkennzahl" : "Vergleich"} ·{" "}
                {p.text.length} Zeichen
              </span>
            </div>

            <div style={{ display: "flex", gap: space.xxxl, alignItems: "flex-start", flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 400px", minWidth: 300, maxWidth: 540 }}>
                <div style={{ fontSize: v("--font-size-caption"), color: v("--color-text-muted"), marginBottom: space.xs }}>
                  Im Feed sichtbar, bevor jemand aufklappt
                </div>
                <div
                  style={{
                    background: v("--color-bg-muted"),
                    borderRadius: v("--radius-md"),
                    padding: pad("xxl", "xxl"),
                    whiteSpace: "pre-wrap",
                    fontSize: v("--font-size-body"),
                    lineHeight: 1.55,
                  }}
                >
                  {sichtbar}
                  {abgeschnitten && (
                    <>
                      <span style={{ color: v("--color-text-faint") }}>{rest}</span>
                      <div
                        style={{
                          marginTop: space.md,
                          fontSize: v("--font-size-caption"),
                          color: v("--color-text-muted"),
                        }}
                      >
                        Der graue Teil steht hinter „mehr anzeigen". Die Aussage muss davor stehen.
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", gap: space.xxl, alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: v("--font-size-caption"), color: v("--color-text-muted"), marginBottom: space.xs }}>
                    Vorschaugröße im Feed
                  </div>
                  <SocialKarte bild={p.bild!} skala={0.19} />
                </div>
                <div>
                  <div style={{ fontSize: v("--font-size-caption"), color: v("--color-text-muted"), marginBottom: space.xs }}>
                    Aufgeklappt (1080 × 1350)
                  </div>
                  <SocialKarte bild={p.bild!} skala={0.34} />
                </div>
              </div>
            </div>

            <details style={{ marginTop: space.xxl }}>
              <summary style={{ cursor: "pointer", fontSize: v("--font-size-small"), color: v("--color-text-secondary") }}>
                Belege ({p.belege.length})
              </summary>
              <ul style={{ fontSize: v("--font-size-small"), color: v("--color-text-secondary"), marginTop: space.sm }}>
                {p.belege.map((b) => (
                  <li key={b} style={{ marginBottom: space.xs }}>
                    {b}
                  </li>
                ))}
              </ul>
            </details>
          </section>
        );
      })}
    </div>
  );
}
