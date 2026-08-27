import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminSession } from "../../../../lib/admin-guard";
import { socialKennzahlen } from "../../../../lib/social-kennzahlen";
import { baueAllePosts, type SocialPost } from "../../../../lib/social-posts";
import { KATEGORIEN, kategorieAusAdresse } from "../../../../lib/redaktions-kategorien";
import { ladeFassungen } from "../../../../lib/social-vorlagen-db";
import { ladePruefungen } from "../../../../lib/social-pruefung";
import { StoryTisch } from "../../../../components/social/StoryTisch";
import { v, space, pad } from "../../../../lib/theme";

// Das Design-Werkzeug: Kategorien oben, darunter ihre Beschreibung und ihre
// Stories.
//
// Eine Kategorie ist eine AUSSAGEFORM (lib/redaktions-kategorien.ts), keine
// Ablagestruktur — sie sagt, was ein Beitrag dieser Art behauptet und woran er
// scheitert. Das Farbschema gehört dagegen an den einzelnen Post.
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

  const kat = kategorieAusAdresse((await searchParams).k);

  let posts: SocialPost[] | undefined;
  let fehler: string | null = null;
  try {
    const [kennzahlen, fassungen] = await Promise.all([socialKennzahlen(), ladeFassungen()]);
    posts = baueAllePosts(kennzahlen, fassungen);
  } catch (e) {
    fehler = (e as Error).message;
  }

  const dieser = posts?.filter((p) => p.kategorie === kat.schluessel) ?? [];
  // Die Prüfungen kommen je Story mit: Das Urteil rechnet der Tisch selbst, weil
  // es sich mit jeder Änderung dort bewegen muss.
  const pruefungen = Object.fromEntries(
    await Promise.all(dieser.map(async (p) => [p.id, await ladePruefungen(p.id)] as const)),
  );

  return (
    <div style={{ maxWidth: 1240, margin: "0 auto" }}>
      <nav
        aria-label="Kategorien"
        style={{
          display: "flex",
          gap: space.xs,
          flexWrap: "wrap",
          borderBottom: `1px solid ${v("--color-border-muted")}`,
          paddingBottom: space.md,
          marginBottom: space.xl,
        }}
      >
        {KATEGORIEN.map((k) => {
          const aktiv = k.schluessel === kat.schluessel;
          const anzahl = posts?.filter((p) => p.kategorie === k.schluessel).length ?? 0;
          return (
            <Link
              key={k.schluessel}
              href={`/admin/redaktion?k=${k.schluessel}`}
              aria-current={aktiv ? "page" : undefined}
              style={{
                padding: pad("sm", "lg"),
                borderRadius: v("--radius-sm"),
                background: aktiv ? v("--color-accent-dim") : "transparent",
                color: aktiv ? v("--color-accent") : v("--color-text-secondary"),
                fontSize: v("--font-size-body"),
                fontWeight: aktiv ? 600 : 400,
                textDecoration: "none",
              }}
            >
              {k.kurz}{" "}
              <span style={{ color: v("--color-text-muted"), fontWeight: 400 }}>{anzahl}</span>
            </Link>
          );
        })}
      </nav>

      {/* Keine Überschrift: Die Leiste darüber sagt bereits, wo man ist, und der
          Name stünde zweimal untereinander. */}
      <p style={{ color: v("--color-text-secondary"), maxWidth: 760, marginTop: 0, marginBottom: space.huge }}>
        {kat.beschreibung}
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

      <div style={{ display: "flex", flexDirection: "column", gap: space.huge * 1.5 }}>
        {dieser.map((p) => (
          <StoryTisch key={p.id} post={p} pruefungen={pruefungen[p.id] ?? []} />
        ))}
      </div>
    </div>
  );
}
