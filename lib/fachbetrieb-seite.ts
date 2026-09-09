import "server-only";
import { createHmac } from "node:crypto";
import { supabase } from "./supabase-server";
import { unstable_cache } from "next/cache";
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

/**
 * Zeigt die Seite das Zeichen des Betriebs schon VOR seiner Zusage?
 *
 * Entscheidung des Betreibers am 01.09.2026, gegen den Rat zweier
 * Legal-Judges — die Begründung steht an der Verwendungsstelle unten. Als
 * Schalter, damit ein Schub ohne fremde Zeichen ein Handgriff bleibt und keine
 * Umbauarbeit.
 */
const LOGO_VOR_ZUSAGE = true;

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
 * gerechnet und verglichen. Die Alternative — eine Kennungs-Spalte — wäre eine
 * zweite Wahrheit, die gepflegt werden müsste.
 *
 * ── Das Ergebnis wird ZWISCHENGESPEICHERT, und zwar hier ───────────────────
 * Bis zum 05.09.2026 stand an dieser Stelle, die Seite speichere ohnehin
 * zwischen. Sie tat es nie: Sie ist ausdrücklich auf „bei jedem Aufruf neu"
 * gestellt und fragt die Auflösung ZWEIMAL — einmal für den Seitentitel,
 * einmal für den Inhalt. Bei rund 3.100 Betrieben waren das acht
 * Datenbankabfragen und bis zu 6.200 Hash-Berechnungen je Seitenaufruf; beim
 * geplanten Schub an mehrere hundert Betriebe genau das Lastmuster, das im
 * Juli 2026 den Atlas in die Datenbank-Notbremse getrieben hat.
 *
 * Eine Stunde, nicht fünf Minuten: Kürzere Fristen sind in diesem Projekt
 * verboten, weil ein solcher Zwischenspeicher, sobald er im Seitenrahmen
 * landet, die Haltbarkeit JEDER Seite der Domain auf seinen Wert deckelt — der
 * teure, von außen unsichtbare Schaden vom 26.08.2026. Aktualität kommt hier
 * über den Marker `fachbetrieb-seiten`: Wer Betriebe nacherfasst und die
 * Seiten sofort erreichbar braucht, frischt ihn auf, statt die Frist zu
 * verkürzen.
 *
 * Gelesen wird SEITENWEISE: Ein einfaches select() liefert stumm nur 1.000
 * Zeilen (gemessene Falle dieses Projekts) — hier wäre der Fehler besonders
 * fies, weil er nur einen Teil der Betriebe unauffindbar machte.
 */
async function seiteAusDatenbank(kennung: string): Promise<FachbetriebSeite | null> {
  if (!supabase) return null;
  const db = supabase;

  const SEITE = 1000;
  for (let von = 0; ; von += SEITE) {
    const { data, error } = await withDbTimeout(
      db
        .from("fachbetriebe")
        .select("domain, firmenname, ort, plz, email, favicon_url")
        .eq("art", "betrieb")
        .order("domain", { ascending: true })
        .range(von, von + SEITE - 1),
      "fachbetrieb-seite",
    );
    if (error) return null;
    const zeilen = (data ?? []) as {
      domain: string;
      firmenname: string | null;
      ort: string | null;
      plz: string | null;
      email: string | null;
      favicon_url: string | null;
    }[];
    for (const z of zeilen) {
      if (kennungFuer(z.domain) === kennung) {
        // OHNE Mailadresse gibt es keine Seite — aus einem einfachen Grund: Wir
        // koennen diesen Betrieb ohnehin nicht anschreiben (Betreiber,
        // 01.09.2026). Eine Seite ohne Empfaenger haette einen Anfrage-Knopf,
        // der ins Leere liefe, sobald jemand ihn drueckt. Rund 15 % der
        // erfassten Betriebe haben nur ein Formular oder eine Telefonnummer.
        if (!z.email?.includes("@")) return null;
        return {
          kennung,
          domain: z.domain,
          firmenname: z.firmenname,
          ort: z.ort,
          plz: z.plz,
          // Das Zeichen des Betriebs — sein Favicon, aus dem HTML seiner
          // Startseite GELESEN, nicht geraten.
          //
          // RECHTLICHER VORBEHALT, bewusst hier und nicht nur im Konzept: Zwei
          // Legal-Judges haben am 01.09.2026 festgestellt, dass die Verwendung
          // eines fremden Zeichens VOR der Zusage markenrechtlich nicht gedeckt
          // ist (§ 14 Abs. 2 MarkenG verbietet die Benutzung „ohne Zustimmung";
          // nach der Zusage ist die Frage weg). Der Betreiber hat sich am
          // 01.09.2026 dennoch dafür entschieden, weil die Seite ohne Zeichen
          // nicht wie seine aussieht.
          //
          // Der Schalter macht das umkehrbar, ohne die Seite umzubauen: Wer den
          // Testschub ohne fremde Zeichen fahren will, setzt ihn auf false.
          logoUrl: LOGO_VOR_ZUSAGE ? z.favicon_url : null,
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
 * Löst eine Kennung auf — mit Zwischenspeicher, siehe oben.
 *
 * Die Formprüfung steht VOR dem Zwischenspeicher: Sonst legte jede erfundene
 * Adresse einen eigenen Eintrag an, und ein Aufruf mit Zufallszeichen wäre ein
 * Weg, den Speicher vollzuschreiben.
 */
export async function seiteFuerKennung(kennung: string): Promise<FachbetriebSeite | null> {
  if (!/^[0-9a-f]{16}$/.test(kennung)) return null;
  const geladen = unstable_cache(
    () => seiteAusDatenbank(kennung),
    ["fachbetrieb-seite", kennung],
    { revalidate: 3600, tags: ["fachbetrieb-seiten"] },
  );
  return geladen();
}

/**
 * Wie der Betrieb auf der Seite genannt wird — der volle Name.
 *
 * Der Firmenname ist bei rund einem Fünftel der Einträge leer oder unbrauchbar
 * (gemessen bei der Erhebung). Dann trägt die Domain — sie stimmt immer. Eine
 * Seite mit „GmbH & Co. KG" im Kopf wäre peinlicher als eine mit der Adresse.
 */
export function anzeigename(s: FachbetriebSeite): string {
  const n = s.firmenname?.trim();
  return n && n.length > 2 ? n : s.domain;
}

/**
 * Rechtsformen und ihre üblichen Schreibweisen. Die längeren stehen VORNE:
 * Sonst schneidet „KG" aus „GmbH & Co. KG" nur die letzten zwei Zeichen weg
 * und lässt „GmbH & Co." stehen.
 */
const RECHTSFORMEN = [
  "gmbh & co\\. kg",
  "gmbh & co\\.? ?kg",
  "gmbh u\\. co\\. kg",
  "ag & co\\. kg",
  "gmbh",
  "mbh",
  "ug \\(haftungsbeschränkt\\)",
  "ug",
  "ohg",
  "kgaa",
  "kg",
  "gbr",
  "e\\. ?k\\.",
  "e\\. ?kfm\\.",
  "eg",
  "e\\. ?v\\.",
  "ag",
  "se",
  "gmbh & co\\. kgaa",
  "inh\\..*",
  "& co\\.",
];

/**
 * Der KURZNAME für Knöpfe und Fließtext: „2H-Solar GmbH" wird zu „2H-Solar".
 *
 * Warum überhaupt: „Ergebnis an Elektro Mustermann GmbH & Co. KG schicken" ist
 * als Knopfbeschriftung unbrauchbar — und im Gespräch sagt niemand die
 * Rechtsform mit. Der volle Name bleibt dort, wo es um die Firma als
 * Rechtsträger geht.
 *
 * **Was NICHT gekürzt wird:** alles außer der Rechtsform. Ein Versuch, auch
 * Branchenwörter wegzuschneiden („Elektro", „Solar"), wäre derselbe Fehlgriff
 * wie beim Firmennamen-Extraktor — dort machte eine zu breite Regel aus „Welt
 * in Elbe-Elster e.V." ein „Welt".
 *
 * **Und die Untergrenze ist Absicht:** Bleibt weniger als drei Zeichen übrig
 * („Solar GmbH" → „Solar" ist noch gut, „PV GmbH" → „PV" wird knapp), gilt der
 * volle Name. Lieber eine Rechtsform zu viel als ein Name, der niemanden mehr
 * bezeichnet.
 */
export function kurzname(voll: string): string {
  // Die Wortgrenze steht NUR vor Buchstaben-Formen. Bei „& Co." greift `\b`
  // nicht — das kaufmännische Und ist kein Wortzeichen, und „Hansen & Co. KG"
  // behielt dadurch ein einsames „& Co.".
  const muster = new RegExp(`[\\s,]*(?:\\b|(?=&))(${RECHTSFORMEN.join("|")})\\s*$`, "i");
  let kurz = voll.trim();
  // Mehrfach anwenden: „Muster GmbH & Co. KG" braucht zwei Durchgänge, wenn die
  // zusammengesetzte Form nicht greift.
  for (let i = 0; i < 3; i++) {
    const naechst = kurz.replace(muster, "").trim().replace(/[,\-–]\s*$/, "").trim();
    if (naechst === kurz) break;
    kurz = naechst;
  }
  return kurz.length >= 3 ? kurz : voll.trim();
}
