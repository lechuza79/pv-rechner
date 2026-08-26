import { redirect } from "next/navigation";
import { isAdminSession } from "../../../../lib/admin-guard";
import { socialKennzahlen } from "../../../../lib/social-kennzahlen";
import { baueAllePosts } from "../../../../lib/social-posts";
import { SocialKarte } from "../../../../components/social/SocialKarte";
import { v, space, pad } from "../../../../lib/theme";

// Redaktionstisch: Text und Bild eines Posts nebeneinander, so wie sie im Feed
// erscheinen.
//
// Der Zweck ist die gemeinsame Abnahme. Ein Post entsteht hier nicht aus einer
// Textdatei plus einer Grafik, sondern aus EINER Funktion, die beides ausgibt —
// deshalb zeigt diese Seite auch beides zusammen. Wer nur den Text abnimmt und
// das Bild später baut, bekommt irgendwann zwei verschiedene Zahlen für
// dieselbe Aussage.
//
// Die Belege stehen unter jedem Post, weil eine abgenommene Zahl nachrechenbar
// sein muss, bevor sie öffentlich steht.

export const metadata = {
  title: "Redaktionstisch – Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function SocialVorschau() {
  if (!(await isAdminSession())) redirect("/login?next=/admin/social");

  let posts;
  let fehler: string | null = null;
  try {
    posts = baueAllePosts(await socialKennzahlen());
  } catch (e) {
    fehler = (e as Error).message;
  }

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto" }}>
      <h1 style={{ fontSize: v("--font-size-h1"), marginBottom: space.sm }}>Redaktionstisch</h1>
      <p style={{ color: v("--color-text-secondary"), marginBottom: space.huge, maxWidth: 720 }}>
        Text und Bild kommen aus derselben Berechnung. Ändert sich der Datenstand, ändern sich beide
        gemeinsam — ein Post kann hier also nicht eine Zahl behaupten, die das Bild widerlegt.
      </p>

      {fehler && (
        <p style={{ color: v("--color-negative"), marginBottom: space.xxl }}>
          Die Zahlen sind gerade nicht abrufbar: {fehler}
        </p>
      )}

      {posts?.map((p) => (
        <section
          key={p.id}
          style={{
            marginBottom: space.huge * 2,
            paddingBottom: space.huge,
            borderBottom: `1px solid ${v("--color-border-muted")}`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: space.md,
              marginBottom: space.lg,
              flexWrap: "wrap",
            }}
          >
            <h2 style={{ fontSize: v("--font-size-h2"), margin: 0 }}>{p.titel}</h2>
            <span style={{ fontSize: v("--font-size-small"), color: v("--color-text-muted") }}>
              {p.kanal.join(" · ")}
            </span>
          </div>

          <div style={{ display: "flex", gap: space.xxxl, alignItems: "flex-start", flexWrap: "wrap" }}>
            {/* Feed-Vorschau: dieselbe Zeilenbreite wie im echten Beitrag, damit
                man sieht, wo abgeschnitten wird. LinkedIn kürzt nach wenigen
                Zeilen — was danach kommt, liest nur, wer aufklappt. */}
            <div
              style={{
                flex: "1 1 420px",
                minWidth: 320,
                maxWidth: 560,
                background: v("--color-bg-muted"),
                borderRadius: v("--radius-md"),
                padding: pad("xxl", "xxl"),
                whiteSpace: "pre-wrap",
                fontSize: v("--font-size-body"),
                lineHeight: 1.55,
              }}
            >
              {p.text}
            </div>

            <div style={{ flex: "0 0 auto" }}>
              <SocialKarte bild={p.bild!} skala={0.36} />
              <div
                style={{
                  fontSize: v("--font-size-caption"),
                  color: v("--color-text-muted"),
                  marginTop: space.sm,
                  textAlign: "center",
                }}
              >
                1080 × 1350 (4:5), hier auf 36 % verkleinert
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
      ))}
    </div>
  );
}
