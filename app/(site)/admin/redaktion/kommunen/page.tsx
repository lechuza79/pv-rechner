import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminSession } from "../../../../../lib/admin-guard";
import { supabase } from "../../../../../lib/supabase-server";
import { AKTUELLER_SCHUB, SCHUEBE } from "../../../../../lib/kommunen-testballon";
import { ortsBeitraegeFuerId } from "../../../../../lib/orts-beitraege-server";
import { ladeFassungen } from "../../../../../lib/social-vorlagen-db";
import { fassungsAbdruck, ladeAllePruefungen } from "../../../../../lib/social-pruefung";
import { pruefeMechanisch } from "../../../../../lib/social-mechanik";
import { ladeVersand } from "../../../../../lib/social-versand-log";
import { templateVon } from "../../../../../lib/social-bildformen";
import { StoryListe } from "../../../../../components/social/StoryListe";
import AdminSeitenkopf from "../../../../../components/admin/AdminSeitenkopf";
import { v, space, pad } from "../../../../../lib/theme";

// Die Ortsgeschichten eines VERSANDSCHUBS — der Tisch vor dem Anschreiben.
//
// WOFÜR (Betreiber, 06.09.2026): „damit wir die stories zu jeder kommune
// innerhalb eines batches vor versand pimpen können." Der Brief verlinkt die
// Ortsseite; was dort steht, soll vorher jemand gesehen haben.
//
// DER ORT IST KEINE KATEGORIE, sondern eine zweite Dimension. Die sieben
// Familien, aus denen eine Ortsgeschichte kommen kann, stehen im
// Redaktionstisch weiter unter ihren eigenen Reitern; hier wird nach ORT
// gefiltert. Eine 21. Familie „Kommune" hätte sieben Familien unter einem
// Reiter zusammengeworfen.
//
// EIN ORT AUF EINMAL. Die Kette je Ort kostet ein halbes Dutzend Abfragen
// (Bestand, Zubau nach Monat, Wohnungen, Platzierungen, Funde); fünfundzwanzig
// davon auf einer Seite wären genau die Kopplung „teurer mit den Daten", an der
// im September der Produktionsbau zerbrochen ist. Die Übersicht listet
// deshalb nur Namen und lädt nichts.

export const metadata = {
  title: "Redaktion – Kommunen",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Zeile = { region_id: string; name: string; charge: number | null; status: string | null };

async function orteDesSchubs(kampagne: string): Promise<Zeile[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("kommunen_kontakt")
    .select("region_id, charge, outreach_status, mastr_regions!inner(name)")
    .eq("kampagne", kampagne)
    .order("charge")
    .order("region_id");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => {
    const roh = r as unknown as {
      region_id: string;
      charge: number | null;
      outreach_status: string | null;
      mastr_regions: { name: string } | { name: string }[];
    };
    const reg = Array.isArray(roh.mastr_regions) ? roh.mastr_regions[0] : roh.mastr_regions;
    return { region_id: roh.region_id, name: reg?.name ?? roh.region_id, charge: roh.charge, status: roh.outreach_status };
  });
}

export default async function RedaktionKommunen({
  searchParams,
}: {
  searchParams: Promise<{ schub?: string; ags?: string }>;
}) {
  if (!(await isAdminSession())) redirect("/login?next=/admin/redaktion/kommunen");

  const sp = await searchParams;
  const schluessel = sp.schub && SCHUEBE[sp.schub] ? sp.schub : AKTUELLER_SCHUB;
  const schub = SCHUEBE[schluessel];
  const ags = sp.ags;

  let orte: Zeile[] = [];
  let fehler: string | null = null;
  try {
    orte = await orteDesSchubs(schub.kampagne);
  } catch (e) {
    fehler = (e as Error).message;
  }

  const gewaehlt = ags ? orte.find((o) => o.region_id === ags) : undefined;

  return (
    <div style={{ maxWidth: 1240, margin: "0 auto" }}>
      <AdminSeitenkopf
        titel="Kommunen"
        hilfe={
          `Die Ortsgeschichten der Gemeinden eines Versandschubs — dieselben Beiträge, die auf der ` +
          `verlinkten Ortsseite stehen. Text, Farbschema und Bildform lassen sich hier je ORT ` +
          `einstellen; die Beitrags-Kennung trägt den Gemeindeschlüssel, deshalb bleibt eine ` +
          `Einstellung an diesem Ort und wandert nicht zu allen anderen. Gerechnet wird trotzdem ` +
          `überall dasselbe: Wer eine Zahl ändern wollte, könnte es hier so wenig wie sonst.`
        }
      />

      <nav style={S.schuebe}>
        {Object.entries(SCHUEBE).map(([k, s]) => (
          <Link
            key={k}
            href={`/admin/redaktion/kommunen?schub=${k}`}
            style={{ ...S.schub, ...(k === schluessel ? S.schubAktiv : null) }}
          >
            {s.kampagne}
          </Link>
        ))}
      </nav>

      {fehler && <p style={S.fehler}>Die Gemeindeliste ist gerade nicht abrufbar: {fehler}</p>}

      {!fehler && orte.length === 0 && (
        <p style={S.leer}>
          In diesem Schub steht noch keine Gemeinde. Die Auswahl entsteht im Kommunen-Cockpit;
          hier wird sie nur redaktionell durchgesehen.
        </p>
      )}

      {orte.length > 0 && (
        <div style={S.orte}>
          {orte.map((o) => (
            <Link
              key={o.region_id}
              href={`/admin/redaktion/kommunen?schub=${schluessel}&ags=${o.region_id}`}
              style={{ ...S.ort, ...(o.region_id === ags ? S.ortAktiv : null) }}
            >
              <span>{o.name}</span>
              {/* Die Charge sagt, wann der Ort dran ist — ohne sie ist eine
                  Liste von hundert Namen keine Reihenfolge. */}
              <span style={S.ortZusatz}>
                {o.charge != null ? `Charge ${o.charge}` : "ohne Charge"}
                {o.status ? ` · ${o.status}` : ""}
              </span>
            </Link>
          ))}
        </div>
      )}

      {gewaehlt && <Beitraege regionId={gewaehlt.region_id} name={gewaehlt.name} />}

      {!gewaehlt && orte.length > 0 && (
        <p style={S.leer}>Eine Gemeinde wählen, um ihre Geschichten zu sehen.</p>
      )}
    </div>
  );
}

/** Die Geschichten EINER Gemeinde, im selben Tisch wie die bundesweiten Beiträge. */
async function Beitraege({ regionId, name }: { regionId: string; name: string }) {
  const [beitraege, pruefungen, versand] = await Promise.all([
    ortsBeitraegeFuerId(regionId, await ladeFassungen()),
    ladeAllePruefungen(),
    ladeVersand(),
  ]);

  if (!beitraege) {
    return <p style={S.fehler}>Diesen Gemeindeschlüssel gibt es im Verzeichnis nicht: {regionId}</p>;
  }
  if (beitraege.length === 0) {
    return (
      <p style={S.leer}>
        Für {name} trägt gerade keine Geschichte. Das ist ein zulässiges Ergebnis — jede Familie
        prüft ihre eigenen Schranken und meldet sich ab, wenn sie nicht greift. Auf der Ortsseite
        steht dann ebenfalls nichts.
      </p>
    );
  }

  const gesendetAm = (postId: string, abdruck: string): Record<string, string> => {
    const treffer: Record<string, string> = {};
    for (const x of versand) {
      if (x.post_id !== postId || x.fassung_fingerabdruck !== abdruck) continue;
      if (!treffer[x.kanal] || x.gesendet_am < treffer[x.kanal]) treffer[x.kanal] = x.gesendet_am;
    }
    return treffer;
  };

  const ohneTemplate = beitraege.filter((b) => !b.post.bild || !templateVon(b.post.bild)).length;

  return (
    <section style={{ marginTop: space.huge }}>
      <p style={S.zusammenfassung}>
        {beitraege.length} {beitraege.length === 1 ? "Geschichte" : "Geschichten"} für {name}
        {ohneTemplate > 0 &&
          ` · ${ohneTemplate} ${ohneTemplate === 1 ? "steht" : "stehen"} auf einer Form ohne abgenommenes Template`}
      </p>
      <StoryListe
        eintraege={beitraege.map(({ post }) => {
          const abdruck = fassungsAbdruck({ text: post.text, bild: post.bild });
          return {
            post,
            pruefungen: pruefungen[post.id] ?? [],
            abdruck,
            // OHNE Bundeskennzahlen: Zwei der neun Regeln messen gegen den
            // bundesweiten Bestand und laufen hier nicht. Die Prüfung sagt das
            // selbst — ein Tisch, der sieben Regeln fährt und neun verspricht,
            // sieht grün aus wie einer, der alle bestanden hat.
            befunde: pruefeMechanisch(post),
            gesendetAm: gesendetAm(post.id, abdruck),
          };
        })}
      />
    </section>
  );
}

const S: Record<string, React.CSSProperties> = {
  schuebe: { display: "flex", flexWrap: "wrap", gap: space.sm, marginBottom: space.lg },
  schub: {
    padding: pad("xs", "md"),
    borderRadius: v("--radius-sm"),
    border: `1px solid ${v("--color-border")}`,
    fontSize: v("--font-size-small"),
    color: v("--color-text-secondary"),
    textDecoration: "none",
  },
  schubAktiv: {
    background: v("--color-accent"),
    borderColor: v("--color-accent"),
    color: v("--color-bg"),
    fontWeight: 600,
  },
  orte: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: space.sm,
    marginBottom: space.lg,
  },
  ort: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    padding: pad("sm", "md"),
    border: `1px solid ${v("--color-border")}`,
    borderRadius: v("--radius-md"),
    textDecoration: "none",
    color: v("--color-text-primary"),
    fontSize: v("--font-size-small"),
  },
  ortAktiv: { borderColor: v("--color-accent"), background: v("--color-bg-accent") },
  ortZusatz: { fontSize: v("--font-size-micro"), color: v("--color-text-muted") },
  zusammenfassung: {
    fontSize: v("--font-size-small"),
    color: v("--color-text-secondary"),
    margin: `0 0 ${space.lg}px`,
  },
  fehler: { color: v("--color-negative"), marginBottom: space.xxl },
  leer: {
    padding: pad("xxl", "xxl"),
    background: v("--color-bg-muted"),
    borderRadius: v("--radius-md"),
    color: v("--color-text-muted"),
    maxWidth: 760,
  },
};
