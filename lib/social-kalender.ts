// Die Wochenübersicht: was rausging, was ansteht, was fehlt.
//
// ABGELEITET, NICHT GEPFLEGT — und darin liegt der ganze Unterschied zu dem
// Kalender, den die Planungsansicht seit ihrem Bau ablehnt. Ihr Einwand war:
// „Ein Datum je Post ist eine Zusage, die niemand einhält, sobald eine Woche
// voll ist, und ein Plan, dessen Termine reihenweise verstreichen, wird nach dem
// dritten Mal nicht mehr gelesen."
//
// Der Einwand trifft ZUGESAGTE Termine. Diese Übersicht sagt nichts zu: Die
// Vergangenheit kommt aus dem Versandprotokoll und ist damit Tatsache, die
// Zukunft wird aus der Warteschlange gefüllt und ist damit eine Aussage über den
// VORRAT, nicht über einen Beitrag. Verschiebt sich etwas, verschiebt sich die
// Anzeige mit — sie kann gar nicht verstreichen.
//
// Was sie dafür kann, und weswegen der Betreiber sie wollte: Sie zeigt, ob die
// kommende Woche gedeckt ist, und macht aus einer Lücke eine Aufgabe.
//
// KEINE UHR IN DIESEM MODUL. Der Tag wird hereingereicht — sonst ließe sich die
// Übersicht nicht gegen einen Stichtag prüfen, und das ist im Projekt schon
// einmal teuer geworden.

import { SLOTS, type Wochentag } from "./redaktionsplan";
import type { PlanEintrag } from "./social-plan";
import type { SocialPost } from "./social-posts";

/** Was für einen Tag geplant ist — die reine Form, ohne Datenbank. */
export type PlatzZuweisung = {
  datum: string;
  art: "post" | "datenstory" | "individuell" | "artikel";
  /** Bei „artikel": die Adresse des Ratgebers. */
  slug?: string | null;
  post_id: string | null;
  familie: string | null;
  kategorie: string | null;
  titel: string | null;
};

/** Ein Platz in einer Woche — vergangen oder kommend. */
export type KalenderPlatz = {
  /** Kalendertag dieses Platzes, ISO. */
  iso: string;
  tag: Wochentag;
  /** Wofür der Platz gedacht ist (Substanz, operativ, leicht). */
  art: string;
  beschreibung: string;
} & (
  | { zustand: "gesendet"; postId: string; titel: string }
  /** Von Hand belegt — schlägt jeden Vorschlag. */
  | { zustand: "geplant"; zuweisung: PlatzZuweisung; post?: SocialPost }
  /**
   * Der Tag ist verstrichen, das Geplante ging nicht raus.
   *
   * Das ist der Zustand, den der alte Einwand gegen Kalender meint: eine Zusage,
   * die niemand eingehalten hat. Er wird ausgewiesen statt verschwiegen — ein
   * Plan, dessen Verstreichen man sieht, ist etwas anderes als einer, der es
   * für sich behält.
   */
  | { zustand: "verstrichen"; zuweisung: PlatzZuweisung }
  /** Kein Plan, aber Vorrat da — ein Vorschlag, keine Zusage. */
  | { zustand: "bereit"; post: SocialPost }
  | { zustand: "leer"; grund: string }
  | { zustand: "vergangen-leer" }
);

/**
 * Ein Ratgeber-Ereignis an diesem Tag: erschienen oder überarbeitet.
 *
 * BEIDES SIND TATSACHEN, und sie werden auseinandergehalten. Als der Kalender
 * gebaut wurde, führte die Registry nur EIN Datum — den letzten inhaltlichen
 * Eingriff —, und es als Erscheinungsdatum auszugeben wäre eine erfundene Angabe
 * gewesen. Deshalb trägt jeder Ratgeber jetzt beide Daten; der Bestand wurde
 * einmalig aus der Historie der Hauptlinie nachgetragen.
 *
 * Wofür der Betreiber es wollte: Ein frisch erschienener oder überarbeiteter
 * Ratgeber ist der beste Anlass, ihn auf Social aufzugreifen.
 */
export type ArtikelMarke = {
  iso: string;
  slug: string;
  titel: string;
  /**
   * „live" = an diesem Tag erschienen, „ueberarbeitet" = zuletzt inhaltlich
   * angefasst. Zwei verschiedene Tatsachen, und die Beschriftung muss sie
   * auseinanderhalten: Ein überarbeiteter Ratgeber ist ein Anlass, ein neu
   * erschienener ein anderer.
   */
  anlass: "live" | "ueberarbeitet";
};

export type KalenderWoche = {
  /** Montag dieser Woche, ISO. */
  beginnIso: string;
  /** Beschriftung: „diese Woche", „nächste Woche", sonst das Datum. */
  name: string;
  plaetze: KalenderPlatz[];
  /** Ratgeber-Änderungen in dieser Woche — an JEDEM Wochentag, nicht nur an Plätzen. */
  artikel: ArtikelMarke[];
};

const WOCHENTAG_INDEX: Record<Wochentag, number> = { Mo: 1, Di: 2, Mi: 3, Do: 4, Fr: 5 };

function ausIso(iso: string): Date {
  // Über UTC-Mittag, nicht über Mitternacht: Bei lokalen Mitternachtsdaten
  // verschiebt der Sommerzeit-Wechsel den Tag um eins, und das fällt einmal im
  // Jahr niemandem auf. Dieselbe Falle wie bei der Balkon-Anmeldefrist.
  return new Date(`${iso}T12:00:00Z`);
}

function alsIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Der Montag der Woche, in der dieser Tag liegt. */
export function montagVon(iso: string): string {
  const d = ausIso(iso);
  const wochentag = d.getUTCDay() === 0 ? 7 : d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - (wochentag - 1));
  return alsIso(d);
}

function tagInWoche(montagIso: string, tag: Wochentag): string {
  const d = ausIso(montagIso);
  d.setUTCDate(d.getUTCDate() + (WOCHENTAG_INDEX[tag] - 1));
  return alsIso(d);
}

function wochenName(montagIso: string, heuteMontagIso: string): string {
  if (montagIso === heuteMontagIso) return "Diese Woche";
  const diff =
    (ausIso(montagIso).getTime() - ausIso(heuteMontagIso).getTime()) / (7 * 24 * 60 * 60 * 1000);
  if (diff === 1) return "Nächste Woche";
  if (diff === -1) return "Letzte Woche";
  return `Woche ab ${ausIso(montagIso).toLocaleDateString("de-DE", { day: "numeric", month: "long", timeZone: "UTC" })}`;
}

export type Gesendetes = { postId: string; titel: string; gesendetAmIso: string };

/**
 * Die Übersicht über mehrere Wochen.
 *
 * Vergangene Plätze bekommen, was an dem Tag wirklich rausging. Kommende Plätze
 * bekommen der Reihe nach die Beiträge, die raus DÜRFEN — jeder nur einmal.
 * Reicht der Vorrat nicht, bleibt der Platz leer und trägt den Grund; das ist
 * die eigentliche Auskunft dieser Ansicht.
 */
export function baueKalender(
  plan: PlanEintrag[],
  gesendet: Gesendetes[],
  heuteIso: string,
  {
    wochenZurueck = 2,
    wochenVoraus = 2,
    zuweisungen = [],
    artikel = [],
  }: {
    wochenZurueck?: number;
    wochenVoraus?: number;
    zuweisungen?: PlatzZuweisung[];
    artikel?: ArtikelMarke[];
  } = {},
): KalenderWoche[] {
  const heuteMontag = montagVon(heuteIso);
  // Was schon einem Tag zugewiesen ist, taucht nicht noch einmal als Vorschlag
  // auf — sonst stünde derselbe Beitrag zweimal im Kalender.
  const belegtePosts = new Set(zuweisungen.map((z) => z.post_id).filter(Boolean));
  const vorrat = plan.filter((e) => e.hindernisse.length === 0 && !belegtePosts.has(e.post.id));
  // Was nicht raus darf, mit dem häufigsten Hindernis — das füllt die Lücken mit
  // einer Aufgabe statt mit einem Achselzucken.
  const blockiert = plan.filter((e) => e.hindernisse.length > 0);
  let naechster = 0;

  const wochen: KalenderWoche[] = [];
  for (let w = -wochenZurueck; w <= wochenVoraus; w++) {
    const montag = ausIso(heuteMontag);
    montag.setUTCDate(montag.getUTCDate() + w * 7);
    const beginnIso = alsIso(montag);

    const plaetze: KalenderPlatz[] = SLOTS.map((slot) => {
      const iso = tagInWoche(beginnIso, slot.tag);
      const kopf = { iso, tag: slot.tag, art: slot.art, beschreibung: slot.beschreibung };

      const raus = gesendet.find((g) => g.gesendetAmIso === iso);
      if (raus) return { ...kopf, zustand: "gesendet", postId: raus.postId, titel: raus.titel };

      // Eine Zuweisung schlägt jeden Vorschlag: Sie ist eine Entscheidung, der
      // Vorschlag nur die Reihenfolge der Warteschlange.
      const zugewiesen = zuweisungen.find((z) => z.datum === iso);
      if (zugewiesen) {
        if (iso < heuteIso) return { ...kopf, zustand: "verstrichen", zuweisung: zugewiesen };
        const belegt = plan.find((e) => e.post.id === zugewiesen.post_id)?.post;
        return { ...kopf, zustand: "geplant", zuweisung: zugewiesen, ...(belegt ? { post: belegt } : {}) };
      }

      // Vergangene Plätze werden NICHT aus dem Vorrat gefüllt. Ein leerer Tag
      // in der Vergangenheit ist eine Tatsache, kein Vorschlag — ihn nachträglich
      // zu belegen wäre eine Behauptung über etwas, das nicht passiert ist.
      if (iso < heuteIso) return { ...kopf, zustand: "vergangen-leer" };

      const kandidat = vorrat[naechster];
      if (kandidat) {
        naechster++;
        return { ...kopf, zustand: "bereit", post: kandidat.post };
      }
      return {
        ...kopf,
        zustand: "leer",
        grund: blockiert.length
          ? `Kein freigegebener Beitrag übrig. ${blockiert.length} warten auf: ${haeufigstesHindernis(blockiert)}`
          : "Kein Beitrag mehr im Vorrat.",
      };
    });

    // Ratgeber liegen an beliebigen Wochentagen, auch an solchen ohne Platz.
    // Deshalb hängen sie an der WOCHE, nicht am Platz.
    const endeIso = alsIso(
      (() => {
        const d = ausIso(beginnIso);
        d.setUTCDate(d.getUTCDate() + 6);
        return d;
      })(),
    );
    const wochenArtikel = artikel.filter((a) => a.iso >= beginnIso && a.iso <= endeIso);

    wochen.push({ beginnIso, name: wochenName(beginnIso, heuteMontag), plaetze, artikel: wochenArtikel });
  }
  return wochen;
}

function haeufigstesHindernis(blockiert: PlanEintrag[]): string {
  const zaehler = new Map<string, number>();
  for (const e of blockiert) {
    for (const h of e.hindernisse) zaehler.set(h.art, (zaehler.get(h.art) ?? 0) + 1);
  }
  const sortiert = [...zaehler.entries()].sort((a, b) => b[1] - a[1]);
  const name: Record<string, string> = {
    mechanik: "mechanische Sperren",
    freigabe: "fehlende Freigaben",
    "schon-gesendet": "bereits gesendet",
    "ort-kollision": "Anschreiben-Kollision",
  };
  return sortiert.map(([art, n]) => `${name[art] ?? art} (${n})`).join(", ");
}

/** Wie viele der kommenden Plätze gedeckt sind — die Zahl, die der Betreiber sucht. */
export function deckung(wochen: KalenderWoche[], heuteIso: string): { belegt: number; offen: number } {
  let belegt = 0;
  let offen = 0;
  for (const w of wochen) {
    for (const p of w.plaetze) {
      if (p.iso < heuteIso) continue;
      if (p.zustand === "bereit" || p.zustand === "geplant") belegt++;
      else if (p.zustand === "leer") offen++;
    }
  }
  return { belegt, offen };
}
