import "server-only";

// Woraus die Redaktion ihre Beiträge nimmt: bundesweit oder aus dem nächsten
// Kommunen-Schub.
//
// EINE STELLE FÜR BEIDE ANSICHTEN. Die Wahl stand zuerst nur in der
// Templates-Ansicht; als die Ortsgeschichten auch in die Entwicklung sollten
// (Betreiber, 06.09.2026: „die müssen eigentlich in Entwicklung integriert
// werden"), wäre sie ein zweites Mal entstanden — mit eigener Schub-Erkennung,
// eigenem Deckel und eigener Zusammenfassung. Drei Wochen später hätten die
// beiden Ansichten verschiedene Beiträge gezeigt, und niemand hätte gewusst,
// welche stimmt.
//
// DIE ORTSGESCHICHTEN KOMMEN ALS TYP, nicht je Gemeinde: „Stichtag" sieht in
// jeder Gemeinde gleich aus, nur mit anderen Zahlen darin. Sechs Orte × sieben
// Geschichten wären zweiundvierzig Einträge für sieben Aussagen.

import { AKTUELLER_SCHUB, SCHUEBE } from "./kommunen-testballon";
import { ortsBeitraegeMehrere } from "./orts-beitraege-server";
import type { OrtsBeitrag } from "./orts-posts";
import { baueAllePosts, type SocialPost } from "./social-posts";
import { socialKennzahlen } from "./social-kennzahlen";
import { ladeFassungen } from "./social-vorlagen-db";
import { supabase } from "./supabase-server";

export type QuellenArt = "bund" | "kommunen";

/**
 * Wie viele Orte eines Schubs ohne Zutun angesehen werden.
 *
 * Sechs, weil die Formenwahl den Zahlen folgt und die über Orte hinweg ähnlich
 * sind: Sechs Gemeinden decken die Typen, die ein Schub hergibt, mit hoher
 * Wahrscheinlichkeit ab. Wer mehr sehen will, hebt es in der Adresse an — die
 * Ansicht sagt, wie viele es waren.
 *
 * Der Deckel ist keine Bequemlichkeit: Die Kette je Ort kostet ein halbes
 * Dutzend Abfragen, ein Schub sind hundert Gemeinden.
 */
export const ORTE_STANDARD = 6;

/** Eine Gemeinde eines Schubs, mit dem, was über ihren Versand bekannt ist. */
type SchubOrt = { regionId: string; charge: number | null; offen: boolean };

/** Die Gemeinden einer Kampagne, in der Reihenfolge ihrer Chargen. */
async function orteDesSchubs(kampagne: string): Promise<SchubOrt[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("kommunen_kontakt")
    .select("region_id, charge, outreach_status")
    .eq("kampagne", kampagne)
    .order("charge")
    .order("region_id");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => {
    const z = r as { region_id: string; charge: number | null; outreach_status: string | null };
    return {
      regionId: z.region_id,
      charge: z.charge,
      offen: !z.outreach_status || z.outreach_status === "offen",
    };
  });
}

/**
 * Welcher Schub ist WIRKLICH als Nächstes dran?
 *
 * GEMESSEN, NICHT ANGEMELDET. Die Markierung „aktueller Schub" im Code ist eine
 * Angabe, die jemand pflegen muss — und am 06.09.2026 zeigte sie auf einen
 * Schub, dessen 79 Gemeinden alle angeschrieben waren. Vier der fünf Schübe
 * waren durch.
 *
 * Dieselbe Systematik wie beim Sitzungs-Befehl des Projekts: nachsehen, statt
 * einer zweiten Wahrheit zu glauben.
 */
async function naechsterSchub(): Promise<{ schluessel: string; orte: SchubOrt[] }> {
  const staende = await Promise.all(
    Object.entries(SCHUEBE).map(async ([schluessel, s]) => {
      const orte = await orteDesSchubs(s.kampagne).catch(() => [] as SchubOrt[]);
      return { schluessel, orte, offen: orte.filter((o) => o.offen).length };
    }),
  );
  const beste = [...staende].sort((a, b) => b.offen - a.offen)[0];
  if (beste && beste.offen > 0) return { schluessel: beste.schluessel, orte: beste.orte };
  const rueckfall = staende.find((x) => x.schluessel === AKTUELLER_SCHUB) ?? staende[0];
  return { schluessel: rueckfall?.schluessel ?? AKTUELLER_SCHUB, orte: rueckfall?.orte ?? [] };
}

/** Die Beiträge nach ihrem Story-Typ; ein Beitrag ohne Typ steht für sich. */
export function nachTyp(posts: SocialPost[]): Map<string, SocialPost[]> {
  const gruppen = new Map<string, SocialPost[]>();
  for (const p of posts) {
    const schluessel = p.storyArt ?? p.id;
    const vorhanden = gruppen.get(schluessel);
    if (vorhanden) vorhanden.push(p);
    else gruppen.set(schluessel, [p]);
  }
  return gruppen;
}

/**
 * Was ein Beitrag braucht, um in seiner SEITEN-Fassung zu erscheinen.
 *
 * Nur bei Ortsgeschichten: Sie stehen auf der Gemeindeseite als Teaser, hinter
 * dem die Bildkarte im Fenster liegt. Ortsname, Adresse und Datenstand sind
 * dafür keine Zierde — sie stehen in der Karte und in ihrem Teilen-Ziel.
 */
export type Seitenform = {
  beitrag: OrtsBeitrag;
  ortName: string;
  /** Leer, wo sich die Adresse der Ortsseite nicht bilden lässt. */
  liveUrl: string;
  standIso: string;
};

/** Womit die Karten ihr Teilen-Ziel bilden. */
const BASIS_ADRESSE = "https://solar-check.io";

export type Quellenstand = {
  art: QuellenArt;
  posts: SocialPost[];
  /** Je Beitrag seine Seiten-Fassung, wo es eine gibt. */
  seitenform?: Record<string, Seitenform>;
  /** Nur bei „kommunen": welcher Schub, und wie viel davon angesehen wurde. */
  schub?: { schluessel: string; angesehen: number; vorhanden: number; offen: number };
  fehler?: string;
};

/**
 * Die Beiträge der gewählten Quelle.
 *
 * Wirft nicht: Eine Redaktionsansicht, die wegen einer kränkelnden Datenbank
 * gar nichts zeigt, wäre der schlechtere Tausch — der Fehler steht im Ergebnis
 * und die Ansicht sagt ihn an.
 */
export async function quellenstand(opts: {
  art: QuellenArt;
  /** Ausdrücklich gewählter Schub; ohne ihn der, der wirklich dran ist. */
  schub?: string;
  hoechstensOrte?: number;
}): Promise<Quellenstand> {
  try {
    if (opts.art === "kommunen") {
      const gewuenscht = opts.schub && SCHUEBE[opts.schub] ? opts.schub : null;
      const { schluessel, orte } = gewuenscht
        ? { schluessel: gewuenscht, orte: await orteDesSchubs(SCHUEBE[gewuenscht].kampagne) }
        : await naechsterSchub();
      // OFFENE ZUERST. Ein Schub ist nach Chargen sortiert, und die vorderen
      // sind längst raus — die ersten sechs Orte wären sonst die, an denen sich
      // nichts mehr ändern lässt.
      const sortiert = [...orte].sort((a, b) => Number(b.offen) - Number(a.offen));
      const gesammelt = await ortsBeitraegeMehrere(sortiert, {
        hoechstens: opts.hoechstensOrte ?? ORTE_STANDARD,
      });
      // Je Typ EIN Beitrag — samt dem, was seine Ortsseite braucht. Die
      // Seitenfassung ohne Ortsnamen, Adresse und Datenstand zu zeigen hieße,
      // sie mit erfundenen Angaben zu zeigen; sie wandern deshalb mit.
      const alle: { post: SocialPost; seite: Seitenform }[] = gesammelt.seiten.flatMap((s) =>
        s.beitraege.map((b) => ({
          post: b.post,
          seite: {
            beitrag: b,
            ortName: s.name,
            liveUrl: s.pfad ? `${BASIS_ADRESSE}${s.pfad}` : "",
            standIso: s.standIso,
          },
        })),
      );
      const jeTyp = [...nachTyp(alle.map((x) => x.post)).values()].map((g) => g[0]);
      const seitenform: Record<string, Seitenform> = {};
      for (const p of jeTyp) {
        const treffer = alle.find((x) => x.post.id === p.id);
        if (treffer) seitenform[p.id] = treffer.seite;
      }
      return {
        art: "kommunen",
        posts: jeTyp,
        seitenform,
        schub: {
          schluessel,
          angesehen: gesammelt.angesehen,
          vorhanden: gesammelt.vorhanden,
          offen: orte.filter((o) => o.offen).length,
        },
      };
    }
    const [kennzahlen, fassungen] = await Promise.all([socialKennzahlen(), ladeFassungen()]);
    return { art: "bund", posts: baueAllePosts(kennzahlen, fassungen) };
  } catch (e) {
    return { art: opts.art, posts: [], fehler: (e as Error).message };
  }
}
