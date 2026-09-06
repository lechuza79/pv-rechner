import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminSession } from "../../../../../lib/admin-guard";
import { socialKennzahlen } from "../../../../../lib/social-kennzahlen";
import { baueAllePosts, moeglicheFormen, templateVon, type PostBild, type SocialPost } from "../../../../../lib/social-posts";
import { BILDFORMEN, TEMPLATES } from "../../../../../lib/social-bildformen";
import { TemplateGalerie, type GalerieZeile } from "../../../../../components/social/TemplateGalerie";
import { ladeFassungen } from "../../../../../lib/social-vorlagen-db";
import { ortsBeitraegeMehrere } from "../../../../../lib/orts-beitraege-server";
import { supabase } from "../../../../../lib/supabase-server";
import { AKTUELLER_SCHUB, SCHUEBE } from "../../../../../lib/kommunen-testballon";
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
 * Wie viele Orte eines Schubs die Ansicht ohne Zutun ansieht.
 *
 * Sechs, weil die Formenwahl den Zahlen folgt und die über Orte hinweg ähnlich
 * sind: Sechs Gemeinden decken die Formen, die ein Schub braucht, mit hoher
 * Wahrscheinlichkeit ab. Wer mehr sehen will, hebt es in der Adresse an — die
 * Ansicht sagt, wie viele es waren.
 */
const ORTE_STANDARD = 6;

/** Eine Gemeinde eines Schubs, mit dem, was über ihren Versand bekannt ist. */
type SchubOrt = { regionId: string; charge: number | null; offen: boolean };

/** Die Gemeinden einer Kampagne, in der Reihenfolge ihrer Chargen. */
async function orteDesSchubs(kampagne: string): Promise<SchubOrt[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("kommunen_kontakt")
    .select("region_id, charge, outreach_status")
    .eq("kampagne", kampagne)
    .order("charge")
    .order("region_id");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => {
    const z = r as { region_id: string; charge: number | null; outreach_status: string | null };
    return {
      regionId: z.region_id,
      charge: z.charge,
      offen: !z.outreach_status || z.outreach_status === "offen",
    };
  });
}

/**
 * Welcher Schub ist WIRKLICH als Nächstes dran?
 *
 * GEMESSEN, NICHT ANGEMELDET. Die Markierung „aktueller Schub" im Code ist eine
 * Angabe, die jemand pflegen muss — und am 06.09.2026 zeigte sie auf einen
 * Schub, dessen 79 Gemeinden alle angeschrieben waren. Vier der fünf Schübe
 * waren durch; offen war allein der geparkte, und genau dessen Geschichten
 * braucht die Templates-Arbeit.
 *
 * Dieselbe Systematik wie beim Sitzungs-Befehl des Projekts: Der Zustand wird
 * nachgesehen, statt einer zweiten Wahrheit zu glauben.
 *
 * Zurück kommt der Schub mit den meisten offenen Gemeinden. Gibt es keinen
 * offenen mehr, bleibt die Markierung — dann ist nichts dran, und die Ansicht
 * zeigt eben den zuletzt gelaufenen.
 */
async function naechsterSchub(): Promise<{ schluessel: string; orte: SchubOrt[] }> {
  const stände = await Promise.all(
    Object.entries(SCHUEBE).map(async ([schluessel, s]) => {
      const orte = await orteDesSchubs(s.kampagne).catch(() => [] as SchubOrt[]);
      return { schluessel, orte, offen: orte.filter((o) => o.offen).length };
    }),
  );
  const beste = [...stände].sort((a, b) => b.offen - a.offen)[0];
  if (beste && beste.offen > 0) return { schluessel: beste.schluessel, orte: beste.orte };
  const rueckfall = stände.find((x) => x.schluessel === AKTUELLER_SCHUB) ?? stände[0];
  return { schluessel: rueckfall?.schluessel ?? AKTUELLER_SCHUB, orte: rueckfall?.orte ?? [] };
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

  // Woraus die Formen gefüllt werden. „bund" ist der Ausgangszustand: Er lädt
  // eine Abfrage, der Schub ein halbes Dutzend je Ort.
  const quelle = params.quelle === "kommunen" ? "kommunen" : "bund";
  const gewuenschterSchub =
    typeof params.schub === "string" && SCHUEBE[params.schub] ? params.schub : null;
  const orteDeckel = Math.max(1, Math.min(Number(params.orte) || ORTE_STANDARD, 24));

  let posts: SocialPost[] = [];
  let fehler: string | null = null;
  let ausschnitt: { angesehen: number; vorhanden: number; offen: number } | null = null;
  let schubSchluessel = gewuenschterSchub ?? AKTUELLER_SCHUB;
  try {
    if (quelle === "kommunen") {
      // Ohne ausdrückliche Wahl der Schub, der wirklich dran ist — nicht der,
      // den die Markierung im Code nennt.
      const { schluessel, orte } = gewuenschterSchub
        ? { schluessel: gewuenschterSchub, orte: await orteDesSchubs(SCHUEBE[gewuenschterSchub].kampagne) }
        : await naechsterSchub();
      schubSchluessel = schluessel;
      // OFFENE ZUERST. Ein Schub ist nach Chargen sortiert, und die vorderen
      // sind längst raus — die ersten sechs Orte wären dann die, an denen sich
      // nichts mehr ändern lässt.
      const sortiert = [...orte].sort((a, b) => Number(b.offen) - Number(a.offen));
      const gesammelt = await ortsBeitraegeMehrere(sortiert, { hoechstens: orteDeckel });
      posts = gesammelt.beitraege.map((b) => b.post);
      ausschnitt = {
        angesehen: gesammelt.angesehen,
        vorhanden: gesammelt.vorhanden,
        offen: orte.filter((o) => o.offen).length,
      };
    } else {
      const [kennzahlen, fassungen] = await Promise.all([socialKennzahlen(), ladeFassungen()]);
      posts = baueAllePosts(kennzahlen, fassungen);
    }
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

  const quellen = [
    { text: "Bundesweit", href: adresse({ quelle: undefined }), aktiv: quelle === "bund" },
    { text: "Nächster Kommunen-Schub", href: adresse({ quelle: "kommunen" }), aktiv: quelle === "kommunen" },
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

      {/* WORAUS gefüllt wird — die Entscheidung steht über der Ansicht, nicht
          in ihr: Sie bestimmt, an welchen Zahlen ein Design abgenommen wird. */}
      <nav aria-label="Füllung" style={{ display: "flex", gap: space.sm, flexWrap: "wrap", marginBottom: space.lg }}>
        {quellen.map((q) => (
          <Link
            key={q.href}
            href={q.href}
            aria-current={q.aktiv ? "true" : undefined}
            style={{
              padding: pad("xs", "md"),
              borderRadius: v("--radius-sm"),
              border: `1px solid ${q.aktiv ? v("--color-accent") : v("--color-border")}`,
              background: q.aktiv ? v("--color-accent") : v("--color-bg"),
              color: q.aktiv ? v("--color-bg") : v("--color-text-secondary"),
              fontSize: v("--font-size-small"),
              fontWeight: q.aktiv ? 600 : 400,
              textDecoration: "none",
            }}
          >
            {q.text}
          </Link>
        ))}
        {quelle === "kommunen" &&
          Object.entries(SCHUEBE).map(([k, sch]) => (
            <Link
              key={k}
              href={adresse({ quelle: "kommunen", schub: k })}
              style={{
                padding: pad("xs", "md"),
                borderRadius: v("--radius-sm"),
                border: `1px solid ${k === schubSchluessel ? v("--color-accent") : v("--color-border-muted")}`,
                background: v("--color-bg"),
                color: k === schubSchluessel ? v("--color-accent") : v("--color-text-muted"),
                fontSize: v("--font-size-small"),
                textDecoration: "none",
              }}
            >
              {sch.kampagne}
            </Link>
          ))}
      </nav>

      {/* DER AUSSCHNITT STEHT DA. Eine Ansicht, die sechs von hundert Orten
          zeigt und aussieht wie das Ganze, behauptet eine Vollständigkeit, die
          sie nicht hat — dieselbe Regel wie „Weggelassenes sichtbar erklären". */}
      {ausschnitt && (
        <p style={{ fontSize: v("--font-size-small"), color: v("--color-text-muted"), marginTop: 0, marginBottom: space.lg }}>
          Gefüllt aus {ausschnitt.angesehen} von {ausschnitt.vorhanden} Gemeinden des Schubs
          „{schubSchluessel}" ({posts.length}{" "}
          {posts.length === 1 ? "Geschichte" : "Geschichten"}) — noch nicht angeschrieben zuerst,
          davon gibt es {ausschnitt.offen}. Welche Form eine Geschichte bekommt, entscheiden ihre
          Zahlen; mehr Orte können also weitere Formen hinzubringen.{" "}
          {ausschnitt.angesehen < ausschnitt.vorhanden && (
            <Link href={adresse({ quelle: "kommunen", orte: String(Math.min(ausschnitt.angesehen * 2, 24)) })}>
              Mehr Orte ansehen
            </Link>
          )}
        </p>
      )}

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
