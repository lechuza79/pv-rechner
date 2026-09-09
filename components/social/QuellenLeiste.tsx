import Link from "next/link";
import { SCHUEBE } from "../../lib/kommunen-testballon";
import type { Quellenstand } from "../../lib/redaktions-quelle";
import { v, space, pad } from "../../lib/theme";

// Woraus die Redaktionsansicht ihre Beiträge nimmt — bundesweit oder aus dem
// nächsten Kommunen-Schub.
//
// EIN BAUSTEIN FÜR BEIDE ANSICHTEN (Entwicklung und Templates). Die Leiste
// stand zuerst nur bei den Templates; als die Ortsgeschichten auch in die
// Entwicklung sollten, wäre sie ein zweites Mal entstanden — und zwei Leisten
// für dieselbe Wahl sehen nach zwei Wochen verschieden aus.
//
// Die Entscheidung steht ÜBER der Ansicht, nicht in ihr: Sie bestimmt, an
// welchen Zahlen gearbeitet wird.

export function QuellenLeiste({
  stand,
  adresse,
}: {
  stand: Quellenstand;
  /** Baut eine Adresse dieser Seite mit geänderten Angaben. */
  adresse: (aenderung: Record<string, string | undefined>) => string;
}) {
  const quellen = [
    { text: "Bundesweit", href: adresse({ quelle: undefined }), aktiv: stand.art === "bund" },
    {
      text: "Nächster Kommunen-Schub",
      href: adresse({ quelle: "kommunen" }),
      aktiv: stand.art === "kommunen",
    },
  ];

  return (
    <>
      <nav aria-label="Füllung" style={S.leiste}>
        {quellen.map((q) => (
          <Link
            key={q.href}
            href={q.href}
            aria-current={q.aktiv ? "true" : undefined}
            style={{ ...S.pille, ...(q.aktiv ? S.pilleAktiv : null) }}
          >
            {q.text}
          </Link>
        ))}
        {stand.art === "kommunen" &&
          Object.entries(SCHUEBE).map(([k, sch]) => {
            const an = k === stand.schub?.schluessel;
            return (
              <Link
                key={k}
                href={adresse({ quelle: "kommunen", schub: k })}
                style={{ ...S.schub, ...(an ? S.schubAktiv : null) }}
              >
                {sch.kampagne}
              </Link>
            );
          })}
      </nav>

      {/* DER AUSSCHNITT STEHT DA. Eine Ansicht, die sechs von hundert Orten
          zeigt und aussieht wie das Ganze, behauptet eine Vollständigkeit, die
          sie nicht hat — dieselbe Regel wie „Weggelassenes sichtbar erklären". */}
      {stand.schub && (
        <p style={S.hinweis}>
          {stand.posts.length} {stand.posts.length === 1 ? "Story-Typ" : "Story-Typen"} aus dem
          Schub „{stand.schub.schluessel}", je einer beispielhaft an einer Gemeinde. Angesehen:{" "}
          {stand.schub.angesehen} von {stand.schub.vorhanden} Gemeinden ({stand.schub.offen} davon
          noch nicht angeschrieben, die zuerst). Ein Typ sieht in jeder Gemeinde gleich aus, nur
          mit anderen Zahlen darin.{" "}
          {stand.schub.angesehen < stand.schub.vorhanden && (
            <Link
              href={adresse({
                quelle: "kommunen",
                orte: String(Math.min(stand.schub.angesehen * 2, 24)),
              })}
            >
              Mehr Orte ansehen
            </Link>
          )}
        </p>
      )}
    </>
  );
}

const S: Record<string, React.CSSProperties> = {
  leiste: { display: "flex", gap: space.sm, flexWrap: "wrap", marginBottom: space.lg },
  pille: {
    padding: pad("xs", "md"),
    borderRadius: v("--radius-sm"),
    border: `1px solid ${v("--color-border")}`,
    // Eine Fläche, kein Rand allein: Der Rand trägt gegen den Seitengrund nur
    // 1,3:1 und zeigt die Pille auf den dunklen Tagesstufen nicht als Element.
    background: v("--color-bg-muted"),
    color: v("--color-text-secondary"),
    fontSize: v("--font-size-small"),
    textDecoration: "none",
  },
  pilleAktiv: {
    background: v("--color-accent"),
    borderColor: v("--color-accent"),
    // Eigenes Token für Text auf Akzentfläche — der Seitenhintergrund ist auf
    // den dunklen Stufen dunkel.
    color: v("--color-text-on-accent"),
    fontWeight: 600,
  },
  schub: {
    padding: pad("xs", "md"),
    borderRadius: v("--radius-sm"),
    border: `1px solid ${v("--color-border")}`,
    background: v("--color-bg-muted"),
    color: v("--color-text-secondary"),
    fontSize: v("--font-size-small"),
    textDecoration: "none",
  },
  schubAktiv: { borderColor: v("--color-accent"), color: v("--color-accent"), fontWeight: 600 },
  hinweis: {
    fontSize: v("--font-size-small"),
    color: v("--color-text-secondary"),
    marginTop: 0,
    marginBottom: space.lg,
    maxWidth: 900,
    lineHeight: 1.5,
  },
};
