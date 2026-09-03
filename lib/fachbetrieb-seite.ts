import "server-only";
import { createHmac } from "node:crypto";
import { supabase } from "./supabase-server";
import { withDbTimeout } from "./db-timeout";

/**
 * Die betriebseigene Rechner-Seite: Kennung, Laden, Zustand.
 *
 * Ein Fachbetrieb bekommt eine Adresse bei uns, unter der unser Rechner mit
 * SEINEM Kopf öffnet. Er verlinkt sie von seiner Website — kein Einbau, kein
 * Code, kein Zugriff auf sein System.
 *
 * ── Warum die Kennung ein Hash ist und nicht die Domain ────────────────────
 * Stünde die Domain im Pfad, könnte jeder eine beliebige Adresse aufrufen und
 * daran ablesen, ob wir diesen Betrieb erfasst haben — eine Auskunft über
 * unseren Datenbestand an jeden, der raten mag. Der Hash ist aus der Domain
 * abgeleitet (also stabil, ohne dass wir eine Spalte pflegen müssen) und ohne
 * das Geheimnis nicht zu erzeugen.
 *
 * ── Warum die Seite NICHT indexiert wird ───────────────────────────────────
 * Eine indexierte Seite mit seinem Firmennamen auf UNSERER Domain träte bei
 * Google gegen seine eigene Website an. Das ist ein Grund, nicht mitzumachen —
 * und im Anschreiben ist die Sperre umgekehrt ein Verkaufsargument. Dazu
 * tragen bereits zwei Seitenfamilien Ortsnamen (Atlas, Förderseiten); eine
 * dritte mit Firmennamen wäre die nächste Selbstkannibalisierung.
 *
 * ── Warum der Zustand im Inhalt steht und nicht im Pfad ────────────────────
 * Vor der Zusage ist die Seite ein VORSCHLAG. Sie dann „bereitgestellt für X"
 * zu nennen, wäre selbst eine unwahre Angabe über eine Geschäftsbeziehung
 * (§ 5 Abs. 2 Nr. 3 UWG, Legal-Judge 01.09.2026). Nach der Zusage ändert sich
 * die Beschriftung — die Adresse bleibt, damit ein gesetzter Link nicht bricht.
 */

/** Vor der Zusage: Vorschlag. Danach: laufende Zusammenarbeit. */
export type FachbetriebSeitenZustand = "vorschlag" | "partner";

export type FachbetriebSeite = {
  kennung: string;
  domain: string;
  firmenname: string | null;
  ort: string | null;
  plz: string | null;
  /** Nur nach ausdrücklicher Freigabe — siehe `logoFreigegeben`. */
  logoUrl: string | null;
  zustand: FachbetriebSeitenZustand;
};

/**
 * Das Geheimnis der Kennung. Wir benutzen den ohnehin vorhandenen
 * Cron-Schlüssel: Eine eigene Variable wäre eine weitere Stelle, an der ein
 * fehlender Eintrag auf der Produktion erst auffällt, wenn ein Link ins Leere
 * führt (Lehre „Umgebung ist nicht Code").
 */
function geheimnis(): string {
  const s = process.env.CRON_SECRET;
  if (!s) throw new Error("CRON_SECRET fehlt — ohne Geheimnis keine stabile Kennung");
  return s;
}

/** Erzeugt die Kennung einer Domain. Stabil, nicht ratbar, ohne Datenbankspalte. */
export function kennungFuer(domain: string): string {
  return createHmac("sha256", geheimnis())
    .update(`fachbetrieb:${domain.toLowerCase()}`)
    .digest("hex")
    .slice(0, 16);
}

/**
 * Löst eine Kennung zum Betrieb auf.
 *
 * Der Hash ist eine Einbahnstraße, also wird über alle erfassten Betriebe
 * gerechnet und verglichen. Das klingt teuer und ist es nicht: einige tausend
 * HMACs kosten Millisekunden, und das Ergebnis wird von der Seite ohnehin
 * zwischengespeichert. Die Alternative — eine Kennungs-Spalte — wäre eine
 * zweite Wahrheit, die gepflegt werden müsste.
 *
 * Gelesen wird SEITENWEISE: Ein einfaches select() liefert stumm nur 1.000
 * Zeilen (gemessene Falle dieses Projekts) — hier wäre der Fehler besonders
 * fies, weil er nur einen Teil der Betriebe unauffindbar machte.
 */
export async function seiteFuerKennung(kennung: string): Promise<FachbetriebSeite | null> {
  if (!/^[0-9a-f]{16}$/.test(kennung)) return null;
  if (!supabase) return null;
  const db = supabase;

  const SEITE = 1000;
  for (let von = 0; ; von += SEITE) {
    const { data, error } = await withDbTimeout(
      db
        .from("fachbetriebe")
        .select("domain, firmenname, ort, plz")
        .eq("art", "betrieb")
        .order("domain", { ascending: true })
        .range(von, von + SEITE - 1),
      "fachbetrieb-seite",
    );
    if (error) return null;
    const zeilen = (data ?? []) as { domain: string; firmenname: string | null; ort: string | null; plz: string | null }[];
    for (const z of zeilen) {
      if (kennungFuer(z.domain) === kennung) {
        return {
          kennung,
          domain: z.domain,
          firmenname: z.firmenname,
          ort: z.ort,
          plz: z.plz,
          // Das Logo bleibt leer, bis der Betrieb es freigegeben hat. Vor der
          // Zusage ist seine Verwendung markenrechtlich nicht gedeckt; der
          // Firmenname als Text trägt den Zweck ebenso (Legal-Judges,
          // 01.09.2026).
          logoUrl: null,
          // Solange es keinen Zusage-Vermerk gibt, ist jede Seite ein Vorschlag.
          // Der Zustand kommt später aus dem Arbeitsstand — ihn heute zu raten
          // hieße, eine Zusammenarbeit zu behaupten, die es nicht gibt.
          zustand: "vorschlag",
        };
      }
    }
    if (zeilen.length < SEITE) break;
  }
  return null;
}

/**
 * Wie der Betrieb auf der Seite genannt wird.
 *
 * Der Firmenname ist bei rund einem Fünftel der Einträge leer oder unbrauchbar
 * (gemessen bei der Erhebung). Dann trägt die Domain — sie stimmt immer. Eine
 * Seite mit „GmbH & Co. KG" im Kopf wäre peinlicher als eine mit der Adresse.
 */
export function anzeigename(s: FachbetriebSeite): string {
  const n = s.firmenname?.trim();
  return n && n.length > 2 ? n : s.domain;
}
