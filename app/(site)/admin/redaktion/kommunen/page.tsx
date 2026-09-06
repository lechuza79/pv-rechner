import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminSession } from "../../../../../lib/admin-guard";
import { supabase } from "../../../../../lib/supabase-server";
import { AKTUELLER_SCHUB, SCHUEBE } from "../../../../../lib/kommunen-testballon";
import { ortsBeitraegeFuerId } from "../../../../../lib/orts-beitraege-server";
import { ortsPostTeile } from "../../../../../lib/orts-posts";
import type { GespeicherteFassung } from "../../../../../lib/social-posts";
import { ladeFassungen } from "../../../../../lib/social-vorlagen-db";
import { fassungsAbdruck, ladeAllePruefungen } from "../../../../../lib/social-pruefung";
import { pruefeMechanisch } from "../../../../../lib/social-mechanik";
import { ladeVersand } from "../../../../../lib/social-versand-log";
import { templateVon } from "../../../../../lib/social-bildformen";
import { StoryListe } from "../../../../../components/social/StoryListe";
import { OrtWaehler, type OrtEintrag } from "../../../../../components/social/OrtWaehler";
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
// (Bestand, Zubau nach Monat, Wohnungen, Platzierungen, Funde); hundert davon
// auf einer Seite wären genau die Kopplung „teurer mit den Daten", an der im
// September der Produktionsbau zerbrochen ist.
//
// DIE ORTSWAHL IST EIN SUCHFELD, KEINE KACHELWAND (Betreiber, 06.09.2026, an
// einem Bildschirmfoto: „das ist hoffentlich nicht dein ernst"). Die erste
// Fassung rasterte alle hundert Gemeinden einer Kampagne als gleich aussehende
// Kacheln, jede mit ihrem VERSANDstatus, und die Geschichten lagen dahinter.
// Damit war der Tisch eine Adressliste — und der Versandstatus gehört ohnehin
// ins Kommunen-Cockpit, das ihn setzt. Hier zählt eine andere Frage: Hat an
// diesem Ort schon jemand etwas eingestellt?
//
// OHNE AUSWAHL ÖFFNET SICH DER ERSTE OFFENE ORT. Eine leere Seite mit der
// Aufforderung, erst einmal etwas auszuwählen, ist ein Klick, der nichts
// entscheidet: Es gibt immer einen Ort, der als Nächstes dran ist.

export const metadata = {
  title: "Redaktion – Kommunen",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Zeile = { region_id: string; name: string; charge: number | null; status: string | null };

/**
 * Wurde an diesem Ort schon etwas eingestellt?
 *
 * Aus den gespeicherten Fassungen — EINE Abfrage für alle Orte. Die Alternative
 * wäre, je Ort die Geschichten zu bauen und nachzusehen, und das sind hundert
 * Ketten für eine Ja/Nein-Frage.
 */
function angefassteOrte(fassungen: Record<string, unknown>): Set<string> {
  const orte = new Set<string>();
  for (const id of Object.keys(fassungen)) {
    const teile = ortsPostTeile(id);
    if (teile) orte.add(teile.regionId);
  }
  return orte;
}

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
  let fassungen: Record<string, GespeicherteFassung> = {};
  let fehler: string | null = null;
  try {
    [orte, fassungen] = await Promise.all([orteDesSchubs(schub.kampagne), ladeFassungen()]);
  } catch (e) {
    fehler = (e as Error).message;
  }

  const angefasst = angefassteOrte(fassungen);
  const eintraege: OrtEintrag[] = orte.map((o) => ({
    regionId: o.region_id,
    name: o.name,
    angefasst: angefasst.has(o.region_id),
    // „kontaktiert" heißt: Der Brief ist raus, die Ortsseite ist verlinkt. Das
    // ändert an der Arbeit nichts, sortiert sie aber: Was noch nicht draußen
    // ist, lässt sich noch ändern, bevor es jemand liest.
    raus: !!o.status && o.status !== "offen",
  }));
  // Noch nicht angefasst zuerst, davon die noch nicht verschickten — das ist
  // die Reihenfolge, in der jemand hier arbeitet. Innerhalb dessen die
  // Charge-Ordnung der Abfrage.
  const sortiert = [...eintraege].sort((a, b) => {
    if (a.angefasst !== b.angefasst) return a.angefasst ? 1 : -1;
    if (a.raus !== b.raus) return a.raus ? 1 : -1;
    return 0;
  });

  // Ohne Auswahl der erste, der dran ist. Eine leere Seite mit „bitte wählen"
  // wäre ein Klick, der nichts entscheidet.
  const gewaehltId = ags ?? sortiert[0]?.regionId;
  const gewaehlt = gewaehltId ? orte.find((o) => o.region_id === gewaehltId) : undefined;
  const basisPfad = `/admin/redaktion/kommunen?schub=${schluessel}`;

  return (
    <div style={{ maxWidth: 1240, margin: "0 auto" }}>
      <AdminSeitenkopf
        titel="Kommunen"
        hilfe={
          `Die Ortsgeschichten der Gemeinden eines Versandschubs — dieselben Beiträge, die auf der ` +
          `verlinkten Ortsseite stehen. Text, Farbschema und Bildform lassen sich hier je ORT ` +
          `einstellen; die Beitrags-Kennung trägt den Gemeindeschlüssel, deshalb bleibt eine ` +
          `Einstellung an diesem Ort und wandert nicht zu allen anderen. Gerechnet wird trotzdem ` +
          `überall dasselbe: Wer eine Zahl ändern wollte, könnte es hier so wenig wie sonst. ` +
          `Der Punkt neben einem Ort heißt: Dort hat noch niemand etwas eingestellt.`
        }
      />

      <nav style={S.schuebe}>
        {Object.entries(SCHUEBE).map(([k, sch]) => (
          <Link
            key={k}
            href={`/admin/redaktion/kommunen?schub=${k}`}
            style={{ ...S.schub, ...(k === schluessel ? S.schubAktiv : null) }}
          >
            {sch.kampagne}
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

      {sortiert.length > 0 && (
        <OrtWaehler orte={sortiert} aktiv={gewaehltId} basisPfad={basisPfad} />
      )}

      {gewaehlt && (
        <Beitraege regionId={gewaehlt.region_id} name={gewaehlt.name} fassungen={fassungen} />
      )}
    </div>
  );
}

/** Die Geschichten EINER Gemeinde, im selben Tisch wie die bundesweiten Beiträge. */
async function Beitraege({
  regionId,
  name,
  fassungen,
}: {
  regionId: string;
  name: string;
  // Hereingereicht, nicht ein zweites Mal geladen: Die Übersicht braucht sie
  // ohnehin für die Frage, an welchen Orten schon etwas eingestellt wurde.
  fassungen: Record<string, GespeicherteFassung>;
}) {
  const [beitraege, pruefungen, versand] = await Promise.all([
    ortsBeitraegeFuerId(regionId, fassungen),
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
