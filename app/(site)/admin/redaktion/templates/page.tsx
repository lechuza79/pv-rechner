import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminSession } from "../../../../../lib/admin-guard";
import { moeglicheFormen, templateVon, type PostBild, type SocialPost } from "../../../../../lib/social-posts";
import { BILDFORMEN, TEMPLATES } from "../../../../../lib/social-bildformen";
import { TemplateGalerie, type GalerieZeile } from "../../../../../components/social/TemplateGalerie";
import { quellenstand, ORTE_STANDARD } from "../../../../../lib/redaktions-quelle";
import { QuellenLeiste } from "../../../../../components/social/QuellenLeiste";
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
//
// ZWEI QUELLEN FÜR DIE FÜLLUNG (Betreiber, 06.09.2026): die vierzehn
// bundesweiten Beiträge — oder die Geschichten des nächsten KOMMUNEN-SCHUBS.
// Das ist der Arbeitsrhythmus, den er gesetzt hat: pro Woche ein Batch planen
// und dabei die Templates fertigmachen, die dieser Batch braucht. Welche Form
// eine Ortsgeschichte bekommt, entscheiden ihre Zahlen; man muss also die
// echten Orte ansehen, statt am bundesweiten Bestand zu üben.
//
// MIT DECKEL, und er steht sichtbar an der Ansicht: Ein Schub sind hundert
// Gemeinden, und die Kette je Ort kostet ein halbes Dutzend Abfragen. Eine
// Ansicht, die einen Ausschnitt zeigt und wie das Ganze aussieht, behauptet
// eine Vollständigkeit, die sie nicht hat.

export const metadata = {
  title: "Redaktion – Templates",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Wie ein Ortsbeitrag im Wähler heißt — die Typbezeichnung ohne den Ort.
 *
 * Der Beitragstitel lautet „Musterdorf — Stichtag"; im Wähler steht der Ort
 * ohnehin dahinter, und zweimal derselbe Name in einer Zeile liest sich wie
 * ein Fehler.
 */
function beschriftung(p: SocialPost): string {
  const teil = p.titel.split(" — ");
  return teil.length > 1 ? teil.slice(1).join(" — ") : p.titel;
}

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
    // Quelle, Schub und Ortszahl bleiben stehen: Sonst springt die Ansicht beim
    // Durchschalten einer Zeile zurück auf die bundesweiten Beiträge, und man
    // beurteilt plötzlich ein anderes Design als das, das man ansehen wollte.
    for (const k of ["quelle", "schub", "orte"]) {
      const w = params[k];
      if (typeof w === "string") q.set(k, w);
    }
    // Die Wahl der ANDEREN Formen bleibt stehen — sonst springt die halbe Seite
    // zurück, sobald man eine Zeile umschaltet.
    for (const [k, w] of Object.entries(params)) {
      if (k.startsWith("f_") && k !== `f_${art}` && typeof w === "string") q.set(k, w);
    }
    q.set(`f_${art}`, postId);
    return `/admin/redaktion/templates?${q.toString()}#${art}`;
  };

  // Woraus die Formen gefüllt werden — dieselbe Wahl und dieselbe Quelle wie in
  // der Entwicklungs-Ansicht.
  const stand = await quellenstand({
    art: params.quelle === "kommunen" ? "kommunen" : "bund",
    schub: typeof params.schub === "string" ? params.schub : undefined,
    hoechstensOrte: Math.max(1, Math.min(Number(params.orte) || ORTE_STANDARD, 24)),
  });
  const posts: SocialPost[] = stand.posts;
  const fehler: string | null = stand.fehler ?? null;

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
        // JE TYP EIN EINTRAG, auch im Wähler. `posts` ist bereits auf ein
        // Beispiel je Typ zusammengefasst — dieselbe Liste hier zu benutzen ist
        // der ganze Punkt: Eine Gemeinde mit vier Einzelkennzahl-Geschichten
        // stand sonst viermal untereinander, jedes Mal mit demselben Namen,
        // weil die Beschriftung nur den Ort trug. Die Zusammenfassung galt für
        // die Zeilen und nicht für den Wähler — halb umgestellt ist schlimmer
        // als gar nicht, weil es aussieht, als wäre etwas doppelt gerechnet.
        const traeger = posts.filter((p) => p.bild && moeglicheFormen(p.bild).includes(art));
        const wunsch = traeger.find((p) => p.id === gewaehlt(art));
        const post = wunsch ?? fuellung(posts, art);
        if (!post?.bild) return null;
        return {
          form,
          post,
          auswahl: traeger.map((p) => ({
            id: p.id,
            // Der TYP ist die Beschriftung, der Beispielort steht dahinter:
            // Gewählt wird zwischen Aussagen, nicht zwischen Gemeinden.
            titel: p.ort ? `${beschriftung(p)} · ${p.ort.name}` : p.titel,
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

  /** Eine Adresse dieser Seite mit geänderten Angaben — der Rest bleibt stehen. */
  const adresse = (aenderung: Record<string, string | undefined>): string => {
    const q = new URLSearchParams();
    for (const k of ["ansicht", "quelle", "schub", "orte"]) {
      const w = k in aenderung ? aenderung[k] : params[k];
      if (typeof w === "string" && w) q.set(k, w);
    }
    return `/admin/redaktion/templates${q.toString() ? `?${q}` : ""}`;
  };

  const reiter = [
    { text: "Bibliothek", href: adresse({ ansicht: undefined }), aktiv: !neu, zahl: bibliothek.length },
    { text: "Neu entwickeln", href: adresse({ ansicht: "neu" }), aktiv: neu, zahl: inArbeit.length },
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
              fontSize: v("--font-size-body"),
              textDecoration: "none",
            }}
          >
            {r.text} <span style={{ opacity: 0.7 }}>{r.zahl}</span>
          </Link>
        ))}
      </nav>

      <QuellenLeiste stand={stand} adresse={adresse} />

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
                <code style={{ fontFamily: v("--font-mono"), fontSize: v("--font-size-caption"), color: v("--color-text-muted") }}>
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
