// ─── Wächter-Gesundheit: die drei Signale an einem Ort ───────────────────────
//
// Diese Datei baut NICHTS Neues. Sie führt zusammen, was es schon gibt:
//
//   • `lib/waechter-register.ts` — wer sollte laufen, und woran sieht man es
//   • `waechter_reports`          — wer hat gemeldet (Ablage, `/admin/waechter`)
//   • `lib/pruefstand.ts`         — welches Prüfdatum bewegt sich (nicht)
//   • Supabase (`market_prices`, `funding_programs`) — die Stände, die nicht im
//     Code stehen
//
// KEIN DATUM AUS `new Date()` WIRD ALS „GEPRÜFT" AUSGEGEBEN. Der Stichtag geht
// in die Bewertung ein, sonst nirgends. Ausgegeben wird entweder ein Prüfdatum
// aus dem Code, ein Schreibzeitpunkt aus der Ablage oder ein Stand aus der
// Datenbank — und jedes trägt seinen Namen. Ein Zeitstempel aus der Ablage
// ist ausdrücklich KEIN Prüfdatum: Auch der Lauf, der an einer Paywall
// gescheitert ist, legt einen Bericht ab (dieselbe Verwechslung wie `updated_at`
// als Förder-Prüfdatum, siehe scripts/waechter-gate.md, Regel 9).
//
// DER AUSGANG IST EIN BEFEHL, KEINE SEITE (Betreiber, 26.08.2026). Die erste
// Fassung hing an einer Admin-Seite hinter Login — die kann der Betreiber lesen,
// aber genau der, der die Wächter betreut, nicht: „ich brauch die Übersicht
// nicht, wenn du da nicht rankommst." Wer den Zustand braucht, ist derselbe, der
// ihn behebt. Deshalb `npm run waechter:gesundheit`, wie `npm run stand:faellig`
// — kein `server-only`, damit ein Skript das Modul laden kann.

import { supabase } from "./supabase-server";
import { faelligkeiten, tageZwischen, type PruefEintrag } from "./pruefstand";
import {
  WAECHTER,
  beurteile,
  pruefEintraege,
  sortiere,
  type Beobachtung,
  type Urteil,
  type WaechterJob,
} from "./waechter-register";

/** Was der letzte Lauf bewegt hat — aus seinem Bericht, nicht aus einer Uhr. */
export interface Bewegung {
  berichtId: string;
  betreff: string;
  /** Was er selbst erledigt hat (die `done`-Zeilen). */
  erledigt: string[];
  entscheidungen: number;
  /** Tage zwischen diesem und dem vorletzten Bericht — `null`, wenn es keinen gibt. */
  abstandTage: number | null;
}

export interface PruefZeile {
  was: string;
  feld: string;
  geprueftIso: string;
  alterTage: number;
  /** Aus `faelligkeiten()` — Termin überzogen, Stillstand oder beides. */
  faellig: "termin" | "stillstand" | "beides" | null;
  /** Der Stand liegt in der Datenbank; das Datum im Eintrag misst ihn nicht. */
  standAusDb: boolean;
}

export interface Zeile {
  job: WaechterJob;
  urteil: Urteil;
  /** Der jüngste Bericht seines Tags — auch dort, wo er nichts entscheidet. */
  letzteMeldungIso: string | null;
  bewegung: Bewegung | null;
  /** Wie viele Berichte insgesamt unter seinem Tag liegen. */
  berichteGesamt: number;
  pruefzeilen: PruefZeile[];
}

export interface Gesundheit {
  zeilen: Zeile[];
  /** Stichtag der Bewertung (ISO-Datum) — nur Bewertung, nie als Prüfdatum ausgewiesen. */
  stichtagIso: string;
  ablageLesbar: boolean;
  /** Warum die Ablage nicht gelesen werden konnte. */
  problem: string | null;
  marktpreiseStand: string | null;
  foerderPruefungStand: string | null;
  kostenwacheStand: string | null;
}

type ReportZeile = {
  id: string;
  created_at: string;
  subject: string;
  decisions: unknown;
  done: unknown;
};

function strListe(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((s): s is string => typeof s === "string") : [];
}

/**
 * Die letzten beiden Berichte je Tag — je Tag eine eigene, indizierte Abfrage
 * mit `limit 2`. Bewusst nicht „die letzten 500 Zeilen holen und in JS
 * gruppieren": Der Gesundheitscheck allein legt alle drei Stunden ab und würde
 * ein solches Fenster füllen, bevor der erste quartalsweise Lauf darin
 * auftaucht — die seltenen Läufe, um die es hier geht, fielen als Erstes heraus.
 */
async function letzteBerichte(tag: string): Promise<{ zeilen: ReportZeile[]; gesamt: number }> {
  if (!supabase) return { zeilen: [], gesamt: 0 };
  const { data, error, count } = await supabase
    .from("waechter_reports")
    .select("id, created_at, subject, decisions, done", { count: "exact" })
    .eq("tag", tag)
    .order("created_at", { ascending: false })
    .limit(2);
  if (error) throw new Error(error.message);
  return { zeilen: (data ?? []) as ReportZeile[], gesamt: count ?? (data?.length ?? 0) };
}

/** Jüngster Preisstand in der Datenbank — das Lebenszeichen der Preis-Pipeline. */
async function marktpreiseStand(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from("market_prices")
    .select("valid_from")
    .order("valid_from", { ascending: false })
    .limit(1);
  return data?.[0]?.valid_from ?? null;
}

/**
 * Jüngste Träger-Prüfung im Förderkatalog.
 *
 * Bewusst das JÜNGSTE und nicht ein Mittel: Die Frage hier ist „arbeitet der
 * Lauf noch", nicht „ist der Katalog frisch". Ein gemeinsames Prüfdatum über
 * alle Programme gibt es nicht und darf es nicht geben — jedes trägt sein
 * eigenes, und eines zu erfinden wäre genau der Fehler, den die Förder-Regel
 * verbietet. Deshalb ist die Zeile auf der Seite auch so beschriftet.
 */
async function foerderPruefungStand(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from("funding_programs")
    .select("last_verified")
    .not("last_verified", "is", null)
    .order("last_verified", { ascending: false })
    .limit(1);
  return data?.[0]?.last_verified ?? null;
}

/**
 * Jüngster abgelegter Tageswert der Kostenwache — ihr Lebenszeichen.
 *
 * Bewusst über alle Projekte hinweg das jüngste Datum: Die Frage hier ist „läuft
 * die Erfassung noch", nicht „ist jedes Projekt erfasst". Fällt ein einzelnes
 * Projekt aus, meldet das der Gesundheitscheck selbst, mit Namen.
 */
async function kostenwacheStand(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from("kosten_tageswerte")
    .select("tag")
    .order("tag", { ascending: false })
    .limit(1);
  return data?.[0]?.tag ?? null;
}

function pruefzeilen(job: WaechterJob, heuteIso: string, offen: ReturnType<typeof faelligkeiten>): PruefZeile[] {
  return pruefEintraege(job).map((e: PruefEintrag) => ({
    was: e.was,
    feld: e.feld,
    geprueftIso: e.geprueftIso,
    alterTage: tageZwischen(e.geprueftIso, heuteIso, "prueftag"),
    faellig: offen.find((f) => f.feld === e.feld)?.grund ?? null,
    standAusDb: Boolean(e.standAusDb),
  }));
}

/**
 * Der Stichtag wird hereingereicht, damit die Seite (und ein Test) denselben Tag
 * bewerten können und nichts von einer Uhr im Inneren abhängt.
 */
export async function gesundheit(heuteIso: string): Promise<Gesundheit> {
  const offen = faelligkeiten(heuteIso);

  let ablageLesbar = Boolean(supabase);
  let problem: string | null = supabase ? null : "Keine Datenbank-Verbindung konfiguriert.";

  const tags = [...new Set(WAECHTER.map((j) => j.tag).filter((t): t is string => Boolean(t)))];
  const berichte = new Map<string, { zeilen: ReportZeile[]; gesamt: number }>();

  if (supabase) {
    try {
      const ergebnisse = await Promise.all(tags.map((t) => letzteBerichte(t)));
      tags.forEach((t, i) => berichte.set(t, ergebnisse[i]));
    } catch (err) {
      ablageLesbar = false;
      problem = err instanceof Error ? err.message : "Ablage nicht lesbar.";
    }
  }

  const [preise, foerder, kosten] = await Promise.all([
    marktpreiseStand().catch(() => null),
    foerderPruefungStand().catch(() => null),
    kostenwacheStand().catch(() => null),
  ]);

  const zeilen: Zeile[] = WAECHTER.map((job) => {
    const b = job.tag ? berichte.get(job.tag) : undefined;
    const letzte = b?.zeilen[0] ?? null;
    const vorletzte = b?.zeilen[1] ?? null;

    // Das jüngste Prüfdatum der Felder, die dieser Lauf bewegt. Für die Frage
    // „läuft er noch" ist das jüngste richtig: Ein einziger erreichter Lauf
    // genügt als Lebenszeichen. Ob ein EINZELNER Wert zu alt ist, beantwortet
    // daneben `faelligkeiten()` je Feld — das sind zwei verschiedene Fragen.
    const felder = pruefEintraege(job).filter((e) => !e.standAusDb);
    const pruefdatum = felder.length ? felder.map((e) => e.geprueftIso).sort().slice(-1)[0] : null;

    const beobachtung: Beobachtung = {
      letzteMeldung: letzte?.created_at ?? null,
      pruefdatum,
      datenbankStand:
        job.dbQuelle === "marktpreise"
          ? preise
          : job.dbQuelle === "foerderkatalog"
            ? foerder
            : job.dbQuelle === "kostenwache"
              ? kosten
              : null,
      ablageLesbar,
    };

    return {
      job,
      urteil: beurteile(job, beobachtung, heuteIso),
      letzteMeldungIso: letzte?.created_at ?? null,
      bewegung: letzte
        ? {
            berichtId: letzte.id,
            betreff: letzte.subject,
            erledigt: strListe(letzte.done),
            entscheidungen: strListe(letzte.decisions).length,
            abstandTage: vorletzte
              ? tageZwischen(vorletzte.created_at.slice(0, 10), letzte.created_at.slice(0, 10), "prueftag")
              : null,
          }
        : null,
      berichteGesamt: b?.gesamt ?? 0,
      pruefzeilen: pruefzeilen(job, heuteIso, offen),
    };
  });

  return {
    zeilen: sortiere(zeilen),
    stichtagIso: heuteIso,
    ablageLesbar,
    problem,
    marktpreiseStand: preise,
    foerderPruefungStand: foerder,
    kostenwacheStand: kosten,
  };
}
