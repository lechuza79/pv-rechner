import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminSession } from "../../../../../lib/admin-guard";
import { socialKennzahlen } from "../../../../../lib/social-kennzahlen";
import { baueAllePosts, type PostBild, type SocialPost } from "../../../../../lib/social-posts";
import { kategorie } from "../../../../../lib/redaktions-kategorien";
import { BEREICHE } from "../../../../../lib/redaktionsplan";
import { KARTEN_STIL_NAME } from "../../../../../lib/social-karten-stil";
import { ladeAllePruefungen } from "../../../../../lib/social-pruefung";
import { urteil } from "../../../../../lib/social-pruefung-kern";
import { v, space, pad } from "../../../../../lib/theme";

// Alle fertigen Beiträge auf einer Seite: was es gibt, wo es hingehört, ob es
// raus darf.
//
// Die Entwicklung zeigt immer nur EINE Kategorie — das ist dort richtig, weil
// dort gestaltet wird. Was fehlte, war der Blick über alles: Wie viel steht
// bereit, wie verteilt es sich, und was hängt an einer fehlenden Prüfung. Genau
// die Frage stellt man vor einer Woche, nicht während man an einer Karte
// arbeitet.
//
// Der Freigabestand wird HIER gerechnet, aus derselben Funktion wie im
// Redaktionstisch. Eine zweite Beurteilung wäre eine zweite Wahrheit — und die
// gefährlichste Sorte, weil eine Übersicht wie eine Bilanz gelesen wird.

export const metadata = {
  title: "Redaktion – Übersicht",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const BILDFORM: Record<PostBild["art"], string> = {
  vergleich: "Balken",
  kennzahl: "Einzelkennzahl",
  donut: "Ringpaar",
  saeule: "Säule",
};

export default async function RedaktionUebersicht() {
  if (!(await isAdminSession())) redirect("/login?next=/admin/redaktion/uebersicht");

  let posts: SocialPost[] = [];
  let fehler: string | null = null;
  try {
    posts = baueAllePosts(await socialKennzahlen());
  } catch (e) {
    fehler = (e as Error).message;
  }
  const pruefungen = await ladeAllePruefungen();

  const zelle = { padding: pad("md", "md"), verticalAlign: "top" as const, textAlign: "left" as const };
  const kopf = {
    ...zelle,
    fontSize: v("--font-size-caption"),
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    color: v("--color-text-muted"),
    fontWeight: 400,
    borderBottom: `1px solid ${v("--color-border")}`,
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ fontSize: v("--font-size-h1"), marginBottom: space.sm }}>Übersicht</h1>
      <p style={{ color: v("--color-text-secondary"), maxWidth: 720, marginTop: 0 }}>
        {posts.length} fertige Beiträge. Der Freigabestand kommt aus derselben Prüfung wie im
        Redaktionstisch — er verfällt, sobald sich Text oder Bild ändern.
      </p>

      {fehler && (
        <p style={{ color: v("--color-negative"), marginTop: space.xl }}>
          Die Zahlen sind gerade nicht abrufbar: {fehler}
        </p>
      )}

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: space.xxl }}>
        <thead>
          <tr>
            <th style={kopf}>Beitrag</th>
            <th style={kopf}>Kategorie</th>
            <th style={kopf}>Bild</th>
            <th style={kopf}>Kanal</th>
            <th style={kopf}>Zeichen</th>
            <th style={kopf}>Freigabe</th>
          </tr>
        </thead>
        <tbody>
          {posts.map((p) => {
            const kat = kategorie(p.kategorie);
            const bereich = BEREICHE.find((b) => b.schluessel === kat.bereich);
            const stand = urteil({ text: p.text, bild: p.bild }, pruefungen[p.id] ?? []);
            return (
              <tr key={p.id} style={{ borderBottom: `1px solid ${v("--color-border-muted")}` }}>
                <td style={zelle}>
                  {/* Der Link geht auf die KATEGORIE, nicht auf den Beitrag: Dort
                      wird gestaltet, und dort steht er zwischen seinen
                      Geschwistern — allein betrachtet sieht jede Karte gut aus. */}
                  <Link
                    href={`/admin/redaktion?k=${p.kategorie}`}
                    style={{ color: v("--color-accent"), textDecoration: "none", fontWeight: 600 }}
                  >
                    {p.titel}
                  </Link>
                  <div style={{ fontSize: v("--font-size-caption"), color: v("--color-text-muted") }}>{p.id}</div>
                </td>
                <td style={{ ...zelle, fontSize: v("--font-size-small") }}>
                  {kat.name}
                  <div style={{ fontSize: v("--font-size-caption"), color: v("--color-text-muted") }}>
                    {kat.kuerzel} · {bereich?.name}
                  </div>
                </td>
                <td style={{ ...zelle, fontSize: v("--font-size-small") }}>
                  {p.bild ? BILDFORM[p.bild.art] : "ohne Bild"}
                  {p.bild && (
                    <div style={{ fontSize: v("--font-size-caption"), color: v("--color-text-muted") }}>
                      {KARTEN_STIL_NAME[p.bild.stil]}
                    </div>
                  )}
                </td>
                <td style={{ ...zelle, fontSize: v("--font-size-small") }}>{p.kanal.join(" · ")}</td>
                <td style={{ ...zelle, fontSize: v("--font-size-small") }}>{p.text.length}</td>
                <td
                  style={{
                    ...zelle,
                    fontSize: v("--font-size-small"),
                    color: stand.ok ? v("--color-positive-text") : v("--color-text-muted"),
                    maxWidth: 260,
                  }}
                >
                  {stand.ok ? "freigegeben" : stand.grund}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
