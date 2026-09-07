import { redirect } from "next/navigation";
import { isAdminSession } from "../../../../lib/admin-guard";
import { socialKennzahlen } from "../../../../lib/social-kennzahlen";
import { templateVon, type SocialPost } from "../../../../lib/social-posts";
import { quellenstand, ORTE_STANDARD } from "../../../../lib/redaktions-quelle";
import { QuellenLeiste } from "../../../../components/social/QuellenLeiste";
import { KATEGORIEN, kategorieAusAdresse } from "../../../../lib/redaktions-kategorien";
import { BEREICHE } from "../../../../lib/redaktionsplan";
import { KategorieNav } from "../../../../components/social/KategorieNav";
import { fassungsAbdruck, ladeAllePruefungen } from "../../../../lib/social-pruefung";
import { pruefeMechanisch } from "../../../../lib/social-mechanik";
import { ladeVersand } from "../../../../lib/social-versand-log";
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
  searchParams: Promise<{ k?: string; quelle?: string; schub?: string; orte?: string }>;
}) {
  if (!(await isAdminSession())) redirect("/login?next=/admin/redaktion");

  const params = await searchParams;
  const gewaehlt = params.k;
  // Ohne Kategorie in der Adresse: das Raster über alles. Das ist der Einstieg —
  // erst sehen, was es gibt, dann in eine Kategorie gehen, um daran zu arbeiten.
  const uebersicht = !gewaehlt;
  const kat = kategorieAusAdresse(gewaehlt);

  // WORAUS die Beiträge kommen — dieselbe Wahl wie in der Templates-Ansicht,
  // aus derselben Quelle. Die Ortsgeschichten gehören hierher, weil sie
  // dieselben Katalog-Familien tragen wie die bundesweiten Beiträge: Sie
  // stehen damit unter denselben Reitern, statt in einer eigenen Ansicht
  // daneben (Betreiber, 06.09.2026).
  const stand = await quellenstand({
    art: params.quelle === "kommunen" ? "kommunen" : "bund",
    schub: params.schub,
    hoechstensOrte: Math.max(1, Math.min(Number(params.orte) || ORTE_STANDARD, 24)),
  });
  const posts: SocialPost[] | undefined = stand.posts;
  let fehler: string | null = stand.fehler ?? null;

  // Die Bundeskennzahlen NUR für die mechanische Prüfung — und nur, wo es sie
  // gibt. Zwei ihrer neun Regeln messen gegen den bundesweiten Bestand; bei
  // Ortsgeschichten laufen sie nicht, und die Prüfung sagt das selbst.
  let kennzahlen: Awaited<ReturnType<typeof socialKennzahlen>> | undefined;
  if (stand.art === "bund" && !fehler) {
    try {
      kennzahlen = await socialKennzahlen();
    } catch (e) {
      fehler = (e as Error).message;
    }
  }

  // Die mechanische Prüfung läuft SERVERSEITIG und bei jedem Aufruf, nicht auf
  // Knopfdruck. Sie ist billig (reine Rechnung, keine Datenbank) und soll dort
  // stehen, wo gearbeitet wird — ein Befund, den man erst beim Senden erfährt,
  // kommt zwei Schritte zu spät.
  const befundeJePost = new Map<string, ReturnType<typeof pruefeMechanisch>>();
  if (posts) {
    for (const p of posts) befundeJePost.set(p.id, pruefeMechanisch(p, kennzahlen));
  }

  const dieser = uebersicht ? (posts ?? []) : (posts?.filter((p) => p.kategorie === kat.schluessel) ?? []);
  // Die Prüfungen kommen je Story mit: Das Urteil rechnet die Oberfläche selbst,
  // weil es sich mit jeder Änderung dort bewegen muss. Eine Abfrage für alle
  // statt einer je Story — die Tabelle ist klein, die Roundtrips sind es nicht.
  const pruefungen = await ladeAllePruefungen();
  // Das Versandprotokoll: Welche FASSUNG ging schon raus. Am Beitrag zu hängen
  // wäre falsch — nach einer echten Überarbeitung darf er wieder laufen.
  const versand = await ladeVersand();
  // JE KANAL, nicht je Beitrag. Ein Beitrag, der auf LinkedIn draußen ist, ist
  // auf Instagram noch gar nicht gesendet — die Sperre gilt der Wiederholung,
  // nicht der Verbreitung. Ohne die Trennung hätte der erste Versand den
  // zweiten Kanal stillschweigend gesperrt.
  const gesendetAm = (postId: string, abdruck: string): Record<string, string> => {
    const treffer: Record<string, string> = {};
    for (const x of versand) {
      if (x.post_id !== postId || x.fassung_fingerabdruck !== abdruck) continue;
      // Der früheste Versand je Kanal zählt: Er ist der, der wirklich stattfand.
      if (!treffer[x.kanal] || x.gesendet_am < treffer[x.kanal]) treffer[x.kanal] = x.gesendet_am;
    }
    return treffer;
  };

  /** Eine Adresse dieser Seite mit geänderten Angaben — der Rest bleibt stehen. */
  const adresse = (aenderung: Record<string, string | undefined>): string => {
    const q = new URLSearchParams();
    for (const k of ["k", "quelle", "schub", "orte"] as const) {
      const w = k in aenderung ? aenderung[k] : params[k];
      if (typeof w === "string" && w) q.set(k, w);
    }
    return `/admin/redaktion${q.toString() ? `?${q}` : ""}`;
  };

  return (
    <div style={{ maxWidth: 1240, margin: "0 auto" }}>
      <KategorieNav
        aktiv={kat.schluessel}
        uebersicht={uebersicht}
        behalte={{ quelle: params.quelle, schub: params.schub, orte: params.orte }}
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

      <QuellenLeiste stand={stand} adresse={adresse} />

      {/* Keine Überschrift und in der Übersicht auch kein Einleitungssatz: Die
          Leiste darüber sagt, wo man ist, und die Zahl steht dort schon. „Alle
          14 fertigen Beiträge. Bearbeiten öffnet denselben Tisch …" beschrieb
          eine Bedienung, die man nach dem ersten Klick kennt, und stand danach
          jedes Mal im Weg. In einer KATEGORIE bleibt der Satz: Dort sagt er,
          was die Familie behauptet und woran sie scheitert — das ist Inhalt,
          keine Bedienungsanleitung. */}
      {!uebersicht && (
        <p style={{ color: v("--color-text-secondary"), maxWidth: 760, marginTop: 0, marginBottom: space.huge }}>
          {kat.beschreibung}
        </p>
      )}

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
              // Der Abdruck wird HIER gerechnet, auf dem Server. Der Browser
              // bekommt ihn fertig — er soll nicht hashen können müssen.
              abdruck: fassungsAbdruck({ text: p.text, bild: p.bild }),
              befunde: befundeJePost.get(p.id) ?? [],
              gesendetAm: gesendetAm(p.id, fassungsAbdruck({ text: p.text, bild: p.bild })),
              orts: stand.seitenform?.[p.id],
              kategorie: { name: k.name, schluessel: k.schluessel },
              // Gestaltet heißt: Der Beitrag verwendet ein abgenommenes Template.
              bearbeitet: !!p.bild && !!templateVon(p.bild),
            };
          })}
        />
      ) : (
        <StoryListe
          eintraege={dieser.map((p) => ({
            post: p,
            pruefungen: pruefungen[p.id] ?? [],
            abdruck: fassungsAbdruck({ text: p.text, bild: p.bild }),
            befunde: befundeJePost.get(p.id) ?? [],
            gesendetAm: gesendetAm(p.id, fassungsAbdruck({ text: p.text, bild: p.bild })),
            orts: stand.seitenform?.[p.id],
          }))}
        />
      )}
    </div>
  );
}
