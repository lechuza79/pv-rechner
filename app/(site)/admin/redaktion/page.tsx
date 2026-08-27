import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminSession } from "../../../../lib/admin-guard";
import { socialKennzahlen } from "../../../../lib/social-kennzahlen";
import { baueAllePosts, type SocialPost } from "../../../../lib/social-posts";
import { KATEGORIEN, kategorieAusAdresse } from "../../../../lib/redaktions-kategorien";
import { KARTEN_STIL_NAME } from "../../../../lib/social-karten-stil";
import { ladeFassungen } from "../../../../lib/social-vorlagen-db";
import { ladePruefungen } from "../../../../lib/social-pruefung";
import { StoryTisch } from "../../../../components/social/StoryTisch";
import { v, space, pad } from "../../../../lib/theme";

// Das Design-Werkzeug: Kategorien oben, darunter ihre Beschreibung und ihre
// Stories.
//
// Eine Kategorie ist eine AUSSAGEFORM und damit die Einheit, für die ein Design
// gilt (lib/redaktions-kategorien.ts). Die Stories einer Kategorie sollen wie
// Geschwister aussehen; wo eine ausschert, sagt der Tisch das dazu.
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

      <h1 style={{ fontSize: v("--font-size-h1"), marginBottom: space.sm }}>{kat.name}</h1>
      <p style={{ color: v("--color-text-secondary"), maxWidth: 760, marginTop: 0 }}>{kat.beschreibung}</p>
      <p
        style={{
          fontSize: v("--font-size-small"),
          color: v("--color-text-muted"),
          marginTop: space.md,
          marginBottom: space.huge,
        }}
      >
        Design dieser Kategorie: {KARTEN_STIL_NAME[kat.stil]}.
      </p>

      {fehler && (
        <p style={{ color: v("--color-negative"), marginBottom: space.xxl }}>
          Die Zahlen sind gerade nicht abrufbar: {fehler}
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: space.huge * 1.5 }}>
        {dieser.map((p) => (
          <StoryTisch key={p.id} post={p} pruefungen={pruefungen[p.id] ?? []} kategorieStil={kat.stil} />
        ))}
      </div>
    </div>
  );
}
