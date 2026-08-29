import { SocialKarte } from "./SocialKarte";
import { v, space, pad } from "../../lib/theme";
import { TEMPLATES, variantenKennung, type Bildform } from "../../lib/social-bildformen";
import { KARTEN_STILE, KARTEN_STIL_NAME } from "../../lib/social-karten-stil";
import type { PostBild, SocialPost } from "../../lib/social-posts";

// Die Ansicht auf die DESIGNS: je Bildform eine Zeile, darin ihre drei
// Farbvarianten.
//
// Eine Story ist der Inhalt. Sie verwendet ein Template. Ein Template gibt es in
// drei Varianten (hell, dunkel, highlight) — das ist die Einheit, die abgenommen
// wird, und die Zeile ist die Ansicht, in der man sieht, ob ein Design in allen
// drei Schemata trägt. Genau dort saßen die Fehler der letzten Runden: der helle
// Klecks am Bogenende nur im Highlight, zwei ununterscheidbare Segmente nur im
// Highlight.
//
// KEINE Client-Komponente: Sie wird sowohl von der Redaktionsansicht gerendert
// als auch von der Werkbank auf der Kommandozeile. Zwei Fassungen derselben
// Ansicht würden driften, und dann sieht man beim Entwickeln etwas anderes als
// in der App.

/**
 * Die Bühne zeigt die Karte in AUSGABEGRÖSSE, verkleinert.
 *
 * Nicht kleiner gerechnet: Mit kleinerem Maßstab gerendert bricht der Text an
 * anderen Stellen um als im ausgelieferten Bild — der Lizenzvermerk brach so
 * mitten im Kürzel („dl-/by-2-0"), im echten Bild dagegen sauber dahinter. Wer
 * eine verkleinert gerechnete Karte beurteilt, beurteilt eine, die es nicht
 * gibt.
 */
function Buehne({ bild, zoom }: { bild: PostBild; zoom: number }) {
  return (
    <div
      style={{
        width: 1080 * zoom,
        height: 1350 * zoom,
        overflow: "hidden",
        borderRadius: 4,
        boxShadow: "0 1px 6px rgba(0,0,0,0.16)",
        flex: "0 0 auto",
      }}
    >
      <div style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}>
        <SocialKarte bild={bild} skala={1} />
      </div>
    </div>
  );
}

export type GalerieZeile = {
  form: Bildform;
  /** Der Beitrag, mit dem die Form gefüllt wird — Zahlen, die sie trägt. */
  post: SocialPost;
  /**
   * ALLE Beiträge, die diese Form tragen — zum Durchschalten.
   *
   * Ein Design an einem einzigen Beitrag zu beurteilen heißt, es für den
   * Referenzfall abzunehmen und für die übrigen zu hoffen. Genau diese
   * Fehlerklasse hat das Projekt schon einmal bezahlt: Eine Ratgeber-Aussage
   * galt am Standard-Set und kippte an der größeren Konfiguration, und der Test
   * sah es nicht, weil er nur den Referenzfall kannte.
   *
   * Die Formen scheitern an verschiedenen Beiträgen verschieden: Ein langer
   * Ländername sprengt die Namensspur, eine enge Verteilung macht sechzehn
   * gleich lange Balken, ein winziger Anteil verschwindet. Das sieht man nur,
   * wenn man wechseln kann.
   */
  auswahl?: { id: string; titel: string; href: string; aktiv: boolean }[];
  /** Wie viele Beiträge diese Form überhaupt tragen. */
  traeger: number;
  gesamt: number;
};

export function TemplateGalerie({ zeilen, zoom = 0.32 }: { zeilen: GalerieZeile[]; zoom?: number }) {
  if (zeilen.length === 0) {
    return (
      <p style={{ color: v("--color-text-muted"), padding: space.xxl, background: v("--color-bg-muted"), borderRadius: v("--radius-md") }}>
        Hier steht gerade nichts.
      </p>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: space.huge }}>
      {zeilen.map(({ form, post, traeger, gesamt, auswahl }) => (
        <section key={form.art} id={form.art} style={{ borderTop: `1px solid ${v("--color-border-muted")}`, paddingTop: space.xl }}>
          <h2 style={{ fontSize: v("--font-size-h3"), margin: 0 }}>{form.name}</h2>
          <p style={{ fontSize: v("--font-size-small"), color: v("--color-text-secondary"), margin: `${space.xs}px 0 0`, maxWidth: 760, lineHeight: 1.45 }}>
            {form.wofuer}
          </p>
          {/* Wie viele Beiträge die Form tragen, ist die Antwort auf „lohnt sich
              dieses Design" — eine Form, die nur ein Beitrag trägt, ist nicht
              falsch, aber sie muss sich das leisten können. */}
          <p style={{ fontSize: v("--font-size-caption"), color: v("--color-text-muted"), margin: `${space.xs}px 0 ${space.md}px` }}>
            {traeger} von {gesamt} Beiträgen tragen diese Form
            {!auswahl && ` · gefüllt mit „${post.titel}"`}
          </p>

          {/* Durchschalten: Ein Design ist erst beurteilt, wenn man es an mehr
              als einem Beitrag gesehen hat. Angeboten wird nur, was die Form
              wirklich trägt — dieselbe Bedingung wie im Umschalter des
              Redaktionstischs, damit hier nichts wählbar ist, was dort verboten
              wäre. */}
          {auswahl && auswahl.length > 1 && (
            <div
              style={{
                display: "flex",
                gap: space.xs,
                flexWrap: "wrap",
                marginBottom: space.lg,
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: v("--font-size-caption"), color: v("--color-text-muted") }}>
                Gefüllt mit
              </span>
              {auswahl.map((a) => (
                <a
                  key={a.id}
                  href={a.href}
                  aria-current={a.aktiv ? "true" : undefined}
                  style={{
                    padding: pad("xs", "md"),
                    borderRadius: v("--radius-sm"),
                    border: `1px solid ${a.aktiv ? v("--color-accent") : v("--color-border")}`,
                    background: a.aktiv ? v("--color-accent-dim") : "transparent",
                    color: a.aktiv ? v("--color-accent") : v("--color-text-secondary"),
                    fontSize: v("--font-size-small"),
                    textDecoration: "none",
                  }}
                >
                  {a.titel}
                </a>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: space.lg, flexWrap: "wrap", alignItems: "flex-start" }}>
            {KARTEN_STILE.map((stil) => {
              const abgenommen = TEMPLATES.some((t) => t.art === form.art && t.stil === stil);
              return (
                <figure key={stil} style={{ margin: 0 }}>
                  <figcaption
                    style={{
                      display: "flex",
                      gap: space.xs,
                      alignItems: "center",
                      marginBottom: space.xs,
                      fontSize: v("--font-size-caption"),
                      flexWrap: "wrap",
                    }}
                  >
                    <b>{KARTEN_STIL_NAME[stil]}</b>
                    {/* Die Kennung steht an JEDER Variante, nicht nur an den
                        abgenommenen: Man muss über eine Variante reden können,
                        bevor sie einen Template-Namen hat — sonst hat gerade
                        das, woran gearbeitet wird, keinen Namen. */}
                    <code
                      style={{
                        fontFamily: v("--font-mono"),
                        fontSize: 11,
                        background: v("--color-bg-muted"),
                        padding: "1px 6px",
                        borderRadius: 4,
                        userSelect: "all",
                      }}
                    >
                      {variantenKennung(form.art, stil)}
                    </code>
                    <span
                      style={{
                        fontSize: 10,
                        padding: "1px 6px",
                        borderRadius: 8,
                        background: abgenommen ? v("--color-accent") : v("--color-bg-muted"),
                        color: abgenommen ? v("--color-text-on-accent") : v("--color-text-muted"),
                      }}
                    >
                      {abgenommen ? "abgenommen" : "noch nicht abgenommen"}
                    </span>
                  </figcaption>
                  <Buehne bild={{ ...post.bild!, art: form.art, stil }} zoom={zoom} />
                </figure>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
