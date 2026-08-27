import { redirect } from "next/navigation";
import { isAdminSession } from "../../../../../lib/admin-guard";
import { socialKennzahlen } from "../../../../../lib/social-kennzahlen";
import { baueAllePosts, type SocialPost } from "../../../../../lib/social-posts";
import { kategorie } from "../../../../../lib/redaktions-kategorien";
import { ladeFassungen } from "../../../../../lib/social-vorlagen-db";
import { ladeAllePruefungen } from "../../../../../lib/social-pruefung";
import { StoryTisch } from "../../../../../components/social/StoryTisch";
import { v, space } from "../../../../../lib/theme";

// Alle fertigen Beiträge untereinander, ungefiltert.
//
// Dieselben Karten wie in der Entwicklung, nur ohne Kategorie-Filter. Die
// Entwicklung zeigt immer eine Kategorie — richtig, solange man an ihr
// arbeitet. Vor einer Woche will man dagegen sehen, was insgesamt bereitsteht,
// und ob die Beiträge nebeneinander noch wie eine Handschrift aussehen. Das
// entscheidet sich nicht an einer Karte, sondern an der Reihe.
//
// Keine Tabelle: Beurteilt wird hier das Aussehen, und eine Zeile mit Titel und
// Zeichenzahl sagt darüber nichts.

export const metadata = {
  title: "Redaktion – Alle Beiträge",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function RedaktionUebersicht() {
  if (!(await isAdminSession())) redirect("/login?next=/admin/redaktion/uebersicht");

  let posts: SocialPost[] = [];
  let fehler: string | null = null;
  try {
    const [kennzahlen, fassungen] = await Promise.all([socialKennzahlen(), ladeFassungen()]);
    posts = baueAllePosts(kennzahlen, fassungen);
  } catch (e) {
    fehler = (e as Error).message;
  }
  const pruefungen = await ladeAllePruefungen();

  return (
    <div style={{ maxWidth: 1240, margin: "0 auto" }}>
      <h1 style={{ fontSize: v("--font-size-h1"), marginBottom: space.sm }}>Alle Beiträge</h1>
      <p style={{ color: v("--color-text-secondary"), maxWidth: 760, marginTop: 0, marginBottom: space.huge }}>
        {posts.length} fertige Beiträge, ungefiltert und in einer Reihe — so sieht man, ob sie
        nebeneinander noch wie eine Handschrift wirken. Jede Karte verweist auf ihre Kategorie;
        dort wird sie gestaltet.
      </p>

      {fehler && (
        <p style={{ color: v("--color-negative"), marginBottom: space.xxl }}>
          Die Zahlen sind gerade nicht abrufbar: {fehler}
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: space.huge * 1.5 }}>
        {posts.map((p) => {
          const kat = kategorie(p.kategorie);
          return (
            <StoryTisch
              key={p.id}
              post={p}
              pruefungen={pruefungen[p.id] ?? []}
              kategorieHinweis={{ name: kat.name, href: `/admin/redaktion?k=${p.kategorie}` }}
            />
          );
        })}
      </div>
    </div>
  );
}
