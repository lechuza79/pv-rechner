import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminSession } from "../../../../../lib/admin-guard";
import { socialKennzahlen } from "../../../../../lib/social-kennzahlen";
import { baueAllePosts, moeglicheFormen, templateVon, type PostBild, type SocialPost } from "../../../../../lib/social-posts";
import { BILDFORMEN, TEMPLATES } from "../../../../../lib/social-bildformen";
import { TemplateGalerie, type GalerieZeile } from "../../../../../components/social/TemplateGalerie";
import { ladeFassungen } from "../../../../../lib/social-vorlagen-db";
import { v, space, pad } from "../../../../../lib/theme";

// Die Templates als eigener Bereich der Redaktion — vorher lag diese Ansicht als
// lose Datei neben der App (Betreiber, 28.08.2026: „wieso sind die eigentlich
// wieder irgendwo im Äther?").
//
// Zwei Ansichten, und die Trennung ist der Arbeitszustand:
//
//   BIBLIOTHEK — was abgenommen ist. Die Referenz: So sieht ein fertiges Design
//   aus, daran misst sich das nächste.
//
//   NEU ENTWICKELN — die Stories, für die es noch kein abgenommenes Design gibt.
//   Das ist der Arbeitsvorrat, nicht der Bestand.
//
// „Abgenommen" ist dabei kein Häkchen, sondern folgt aus der Template-Liste im
// Code: Ein Beitrag ist gestaltet, wenn seine Kombination aus Bildform und
// Farbschema dort steht.

export const metadata = {
  title: "Redaktion – Templates",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Welcher Beitrag füllt eine Form?
 *
 * Erste Wahl: einer, dessen EINGEBAUTE Form es ist — dort ist die Form für diese
 * Zahlen gedacht und nicht bloß zulässig. Sonst der erste, für den sie trägt.
 * Gibt es keinen, hat die Form im Bestand nichts zu zeigen — eine Form ohne
 * Beitrag ist Zierde, und die Zeile entfällt.
 */
function fuellung(posts: SocialPost[], art: PostBild["art"]): SocialPost | undefined {
  return (
    posts.find((p) => p.bild?.art === art) ??
    posts.find((p) => p.bild && moeglicheFormen(p.bild).includes(art))
  );
}

export default async function RedaktionTemplates({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!(await isAdminSession())) redirect("/login?next=/admin/redaktion/templates");

  const params = await searchParams;
  const neu = params.ansicht === "neu";
  // Die Füllung wird JE FORM gewählt und steht in der Adresse: „welche Form mit
  // welchem Beitrag" ist der Zustand, den man teilen und wiederfinden können
  // muss („sieh dir rangliste-hell mit dem Speicher-Beitrag an"). Ein Zustand im
  // Browser wäre nach dem Neuladen weg.
  const gewaehlt = (art: string): string | undefined => {
    const w = params[`f_${art}`];
    return typeof w === "string" ? w : undefined;
  };
  const adresseMit = (art: string, postId: string): string => {
    const q = new URLSearchParams();
    if (neu) q.set("ansicht", "neu");
    // Die Wahl der ANDEREN Formen bleibt stehen — sonst springt die halbe Seite
    // zurück, sobald man eine Zeile umschaltet.
    for (const [k, w] of Object.entries(params)) {
      if (k.startsWith("f_") && k !== `f_${art}` && typeof w === "string") q.set(k, w);
    }
    q.set(`f_${art}`, postId);
    return `/admin/redaktion/templates?${q.toString()}#${art}`;
  };

  let posts: SocialPost[] = [];
  let fehler: string | null = null;
  try {
    const [kennzahlen, fassungen] = await Promise.all([socialKennzahlen(), ladeFassungen()]);
    posts = baueAllePosts(kennzahlen, fassungen);
  } catch (e) {
    fehler = (e as Error).message;
  }

  // Die Bibliothek zeigt die Formen, von denen mindestens eine Variante
  // abgenommen ist. Die übrigen sind Entwicklungsstand.
  const abgenommeneArten = new Set(TEMPLATES.map((t) => t.art));
  const zeilen = (arten: PostBild["art"][]): GalerieZeile[] =>
    arten
      .map((art): GalerieZeile | null => {
        const form = BILDFORMEN.find((f) => f.art === art)!;
        // Wählbar ist NUR, was die Form wirklich trägt — dieselbe Bedingung wie
        // im Umschalter des Redaktionstischs. Hier etwas anbieten, das dort
        // verboten wäre, hieße ein Design an einem Fall abzunehmen, den es nie
        // geben wird.
        const traeger = posts.filter((p) => p.bild && moeglicheFormen(p.bild).includes(art));
        const wunsch = traeger.find((p) => p.id === gewaehlt(art));
        const post = wunsch ?? fuellung(posts, art);
        if (!post?.bild) return null;
        return {
          form,
          post,
          auswahl: traeger.map((p) => ({
            id: p.id,
            titel: p.titel,
            href: adresseMit(art, p.id),
            aktiv: p.id === post.id,
          })),
          traeger: traeger.length,
          gesamt: posts.length,
        };
      })
      .filter((z): z is GalerieZeile => z !== null);

  const bibliothek = zeilen(BILDFORMEN.filter((f) => abgenommeneArten.has(f.art)).map((f) => f.art));
  const inArbeit = zeilen(BILDFORMEN.filter((f) => !abgenommeneArten.has(f.art)).map((f) => f.art));

  // Die Beiträge ohne abgenommenes Design — der eigentliche Arbeitsvorrat. Sie
  // stehen als Liste dabei, nicht als Karten: Was ihnen fehlt, ist ein Design,
  // und das entsteht an der Form, nicht am einzelnen Beitrag.
  const ohneDesign = posts.filter((p) => p.bild && !templateVon(p.bild));

  const reiter = [
    { text: "Bibliothek", href: "/admin/redaktion/templates", aktiv: !neu, zahl: bibliothek.length },
    { text: "Neu entwickeln", href: "/admin/redaktion/templates?ansicht=neu", aktiv: neu, zahl: inArbeit.length },
  ];

  return (
    <div style={{ maxWidth: 1240, margin: "0 auto" }}>
      <nav
        aria-label="Ansicht"
        style={{
          display: "flex",
          gap: space.sm,
          borderBottom: `1px solid ${v("--color-border-muted")}`,
          paddingBottom: space.lg,
          marginBottom: space.xl,
        }}
      >
        {reiter.map((r) => (
          <Link
            key={r.href}
            href={r.href}
            aria-current={r.aktiv ? "page" : undefined}
            style={{
              padding: pad("sm", "lg"),
              borderRadius: v("--radius-md"),
              border: `1px solid ${r.aktiv ? v("--color-accent") : v("--color-border")}`,
              background: r.aktiv ? v("--color-accent-dim") : v("--color-bg-muted"),
              color: r.aktiv ? v("--color-accent") : v("--color-text-secondary"),
              fontSize: 14,
              textDecoration: "none",
            }}
          >
            {r.text} <span style={{ opacity: 0.7 }}>{r.zahl}</span>
          </Link>
        ))}
      </nav>

      <p style={{ color: v("--color-text-secondary"), maxWidth: 760, marginTop: 0, marginBottom: space.xxl }}>
        {neu
          ? `Formen ohne abgenommene Variante — der Arbeitsvorrat. Jede Zeile zeigt die drei Farbvarianten; abgenommen wird eine Variante, nicht die Form.`
          : `Was abgenommen ist. Eine Story verwendet ein Template, ein Template gibt es in drei Varianten — die Variante ist die Einheit, die abgenommen wird.`}
      </p>

      {fehler && (
        <p style={{ color: v("--color-negative"), marginBottom: space.xxl }}>
          Die Zahlen sind gerade nicht abrufbar: {fehler}
        </p>
      )}

      <TemplateGalerie zeilen={neu ? inArbeit : bibliothek} />

      {neu && ohneDesign.length > 0 && (
        <section style={{ marginTop: space.huge, borderTop: `1px solid ${v("--color-border-muted")}`, paddingTop: space.xl }}>
          <h2 style={{ fontSize: v("--font-size-h3"), margin: 0 }}>
            Beiträge ohne abgenommenes Design ({ohneDesign.length})
          </h2>
          <p style={{ fontSize: v("--font-size-small"), color: v("--color-text-secondary"), maxWidth: 760, marginTop: space.xs }}>
            Sie verwenden eine Kombination, die noch niemand durchgesehen hat. Das Design entsteht an
            der Form darüber, nicht am einzelnen Beitrag — hier steht, wen es betrifft.
          </p>
          <ul style={{ marginTop: space.md, paddingLeft: space.lg, fontSize: v("--font-size-small") }}>
            {ohneDesign.map((p) => (
              <li key={p.id} style={{ marginBottom: space.xs, color: v("--color-text-secondary") }}>
                {p.titel}{" "}
                <code style={{ fontFamily: v("--font-mono"), fontSize: 11, color: v("--color-text-muted") }}>
                  {p.id}
                </code>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
