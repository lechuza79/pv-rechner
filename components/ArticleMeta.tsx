import { articleJsonLd, jsonLdHtml } from "../lib/json-ld";

// Einheitliche Meta-Zeile für redaktionelle Ratgeber: sichtbares „Aktualisiert:
// [Monat Jahr]" plus Article-JSON-LD (datePublished/dateModified). Die Daten sind
// bewusste Stichtage (kein rollierendes „heute") — ehrliche Freshness-Angabe.

const MONTHS = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

function monthYear(iso: string): string {
  const d = new Date(iso);
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export default function ArticleMeta({
  headline,
  description,
  path,
  published,
  modified,
}: {
  headline: string;
  description: string;
  /** Seitenpfad ohne Host, z. B. "/ratgeber/gasheizung-oder-waermepumpe". */
  path: string;
  /** ISO-Datum der Erstveröffentlichung, z. B. "2026-07-25". */
  published: string;
  /** ISO-Datum der letzten inhaltlichen Aktualisierung. */
  modified: string;
}) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://solar-check.io";
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdHtml(
            articleJsonLd({ headline, description, url: `${baseUrl}${path}`, datePublished: published, dateModified: modified, baseUrl }),
          ),
        }}
      />
      <div style={{ fontSize: "var(--font-size-small)", color: "var(--color-text-muted)", marginBottom: 12 }}>
        Aktualisiert: {monthYear(modified)}
      </div>
    </>
  );
}
