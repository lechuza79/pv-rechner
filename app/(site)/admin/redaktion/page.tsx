import { redirect } from "next/navigation";
import { isAdminSession } from "../../../../lib/admin-guard";
import { socialKennzahlen } from "../../../../lib/social-kennzahlen";
import { baueAllePosts, templateVon, type SocialPost } from "../../../../lib/social-posts";
import { KATEGORIEN, kategorieAusAdresse } from "../../../../lib/redaktions-kategorien";
import { BEREICHE } from "../../../../lib/redaktionsplan";
import { KategorieNav } from "../../../../components/social/KategorieNav";
import { ladeFassungen } from "../../../../lib/social-vorlagen-db";
import { ladeAllePruefungen } from "../../../../lib/social-pruefung";
import { StoryListe } from "../../../../components/social/StoryListe";
import { StoryGrid } from "../../../../components/social/StoryGrid";
import { kategorie } from "../../../../lib/redaktions-kategorien";
import { v, space, pad } from "../../../../lib/theme";

// Das Design-Werkzeug: Kategorien oben, darunter ihre Beschreibung und ihre
// Stories.
//
// Eine Kategorie ist eine Geschichten-Familie aus dem Katalog
// (lib/redaktionsplan.ts) — sie sagt, was ein Beitrag dieser Art behauptet und
// woran er scheitert. Die vier Wähler oben gruppieren nach dem, WORAUS ein
// Beitrag entsteht; daran hängt, wer ihn bauen kann. Das Farbschema gehört
// dagegen an den einzelnen Post.
//
// Jede Story steht so, wie sie im Feed steht: Text zuerst, nach zwei Zeilen
// gekappt, Bild darunter. Bild und Text tragen gemeinsam — deshalb wird beides
// zusammen beurteilt und nicht nebeneinander in zwei Vorschauen.

export const metadata = {
  title: "Redaktion – Entwicklung",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function RedaktionEntwicklung({
  searchParams,
}: {
  searchParams: Promise<{ k?: string }>;
}) {
  if (!(await isAdminSession())) redirect("/login?next=/admin/redaktion");

  const gewaehlt = (await searchParams).k;
  // Ohne Kategorie in der Adresse: das Raster über alles. Das ist der Einstieg —
  // erst sehen, was es gibt, dann in eine Kategorie gehen, um daran zu arbeiten.
  const uebersicht = !gewaehlt;
  const kat = kategorieAusAdresse(gewaehlt);

  let posts: SocialPost[] | undefined;
  let fehler: string | null = null;
  try {
    const [kennzahlen, fassungen] = await Promise.all([socialKennzahlen(), ladeFassungen()]);
    posts = baueAllePosts(kennzahlen, fassungen);
  } catch (e) {
    fehler = (e as Error).message;
  }

  const dieser = uebersicht ? (posts ?? []) : (posts?.filter((p) => p.kategorie === kat.schluessel) ?? []);
  // Die Prüfungen kommen je Story mit: Das Urteil rechnet die Oberfläche selbst,
  // weil es sich mit jeder Änderung dort bewegen muss. Eine Abfrage für alle
  // statt einer je Story — die Tabelle ist klein, die Roundtrips sind es nicht.
  const pruefungen = await ladeAllePruefungen();

  return (
    <div style={{ maxWidth: 1240, margin: "0 auto" }}>
      <KategorieNav
        aktiv={kat.schluessel}
        uebersicht={uebersicht}
        bereiche={BEREICHE.map((b) => ({
          schluessel: b.schluessel,
          name: b.name,
          eintraege: KATEGORIEN.filter((k) => k.bereich === b.schluessel).map((k) => ({
            wert: k.schluessel,
            text: k.kurz,
            zusatz: String(posts?.filter((p) => p.kategorie === k.schluessel).length ?? 0),
          })),
        })).filter((b) => b.eintraege.length > 0)}
      />

      {/* Keine Überschrift: Die Leiste darüber sagt bereits, wo man ist, und der
          Name stünde zweimal untereinander. */}
      <p style={{ color: v("--color-text-secondary"), maxWidth: 760, marginTop: 0, marginBottom: space.huge }}>
        {uebersicht
          ? `Alle ${dieser.length} fertigen Beiträge. Bearbeiten öffnet denselben Tisch wie in der Kategorie; dort steht eine Story zwischen ihren Geschwistern.`
          : kat.beschreibung}
      </p>

      {fehler && (
        <p style={{ color: v("--color-negative"), marginBottom: space.xxl }}>
          Die Zahlen sind gerade nicht abrufbar: {fehler}
        </p>
      )}

      {!fehler && dieser.length === 0 && (
        <p
          style={{
            padding: pad("xxl", "xxl"),
            background: v("--color-bg-muted"),
            borderRadius: v("--radius-md"),
            color: v("--color-text-muted"),
            maxWidth: 760,
          }}
        >
          Noch keine Story in dieser Kategorie — der Platz ist benannt, gebaut ist hier nichts.
        </p>
      )}

      {uebersicht ? (
        <StoryGrid
          eintraege={dieser.map((p) => {
            const k = kategorie(p.kategorie);
            return {
              post: p,
              pruefungen: pruefungen[p.id] ?? [],
              kategorie: { name: k.name, schluessel: k.schluessel },
              // Gestaltet heißt: Der Beitrag verwendet ein abgenommenes Template.
              bearbeitet: !!p.bild && !!templateVon(p.bild),
            };
          })}
        />
      ) : (
        <StoryListe eintraege={dieser.map((p) => ({ post: p, pruefungen: pruefungen[p.id] ?? [] }))} />
      )}
    </div>
  );
}
