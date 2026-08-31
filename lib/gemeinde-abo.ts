import "server-only";

// Die Ablage der Gemeinde-Abos.
//
// Ein Abo ist: diese Adresse möchte hören, wenn sich in diesem Ort etwas tut.
// Mehr steht nicht drin — kein Name, keine Anrede, keine Kennung des Geräts,
// keine IP.
//
// ─── WARUM KEINE IP-ADRESSE GESPEICHERT WIRD ────────────────────────────────
//
// Die übliche Bauform eines Double-Opt-Ins legt IP und Zeitpunkt von Anmeldung
// UND Bestätigung ab, als Nachweis der Einwilligung. Wir legen nur die
// ZEITPUNKTE ab. Begründung: Der Nachweis, um den es geht, ist „an diese
// Adresse ging eine Bestätigungsmail, und aus dieser Adresse kam die
// Bestätigung zurück" — das belegen die beiden Zeitstempel zusammen mit dem
// signierten Token, das nur wir erzeugen können. Die IP belegt daran nichts
// zusätzlich: Sie sagt, aus welchem Netz der Klick kam, nicht, wem die Adresse
// gehört.
//
// Das ist eine bewusste Abweichung von dem, was Anleitungen empfehlen, und sie
// hat einen Preis: Bestreitet jemand die Anmeldung, haben wir einen
// Zeitstempel weniger vorzuweisen. Der Gegenwert ist, dass die Zusage neben dem
// Anmeldeknopf — „kein Spam, jederzeit abmeldbar" — nicht daneben steht,
// während wir Verkehrsdaten sammeln.
//
// OFFEN, NICHT ENTSCHIEDEN: Diese Abwägung ist eine Rechtsaussage und hat die
// Council-Prüfung mit zwei Legal-Judges noch NICHT durchlaufen (Projektregel
// Faktenprüfung, Punkt 8). Sie gehört dorthin, bevor die erste Mail rausgeht.
// Fällt die Prüfung anders aus, kommen zwei Spalten dazu — die Ablage ist
// dafür vorbereitet, die Entscheidung ist es noch nicht.
//
// ─── Zugriff ────────────────────────────────────────────────────────────────
//
// Zeilenschutz an, KEINE Freigabe-Regel: Damit kommt ausschließlich der
// Dienstschlüssel heran, so wie bei den Wächter-Berichten und den
// Kontaktdaten der Kommunen. Für eine Tabelle voller E-Mail-Adressen ist das
// die Absicht und kein Versehen — sie wird nie im Browser gelesen.

import { supabase } from "./supabase-server";
import { techniken, type AboTechnik } from "./abo-technik";

export { ABO_TECHNIKEN, ABO_TECHNIK_LABEL, techniken, type AboTechnik } from "./abo-technik";
import { DB_READ_TIMEOUT_MS, DB_SOFT_READ_TIMEOUT_MS, withDbTimeout } from "./db-timeout";

export type AboStatus = "ausstehend" | "bestaetigt" | "abgemeldet";

/**
 * Wo hat sich jemand eingetragen?
 *
 * WOFÜR: Die beiden Seitengattungen tragen denselben Ortsnamen und sprechen
 * verschiedene Leute an — die Atlas-Seite jemanden, der den Bestand ansieht,
 * die Förderseite jemanden, der Geld sucht. Ohne diese Angabe lässt sich nach
 * dem ersten Schub nicht sagen, welcher der beiden Einstiege überhaupt trägt,
 * und die Entscheidung „bauen wir das aus" hinge an einem Gefühl.
 *
 * BEWUSST GROB: Nur die Gattung, nicht die Adresse. Die Adresse stünde für
 * eine Auswertung, die niemand braucht, und sie ist über den Ort ohnehin
 * bekannt.
 */
export type AboQuelle = "gemeinde" | "foerderung";

export type GemeindeAbo = {
  id: string;
  regionId: string;
  email: string;
  status: AboStatus;
  /** Auf welcher Seitengattung wurde angemeldet. */
  quelle: AboQuelle;
  /**
   * Kam der Aufruf über ein Kommunen-Anschreiben?
   *
   * Die Kennung im Brief ist in JEDEM Brief dieselbe — sie sagt „über ein
   * Anschreiben", nicht welche Gemeinde. Welcher Ort es war, steht ohnehin
   * daneben. Damit ist das hier keine zusätzliche Auskunft über die Person,
   * sondern die Antwort auf „hat der Versand Abos gebracht".
   */
  ueberBrief: boolean;
  /**
   * Welche Techniken interessieren. Beim Bestands-Abo bedeutungslos und dort
   * immer alle — die Spalte trägt dann keine Aussage, sondern nur den
   * Ausgangszustand.
   */
  technikenGewaehlt: AboTechnik[];
  erstelltAm: string;
  bestaetigtAm: string | null;
  letzteMailAm: string | null;
};

type Zeile = {
  id: string;
  region_id: string;
  email: string;
  status: string;
  quelle: string | null;
  ueber_brief: boolean | null;
  techniken: string[] | null;
  erstellt_am: string;
  bestaetigt_am: string | null;
  letzte_mail_am: string | null;
};

function ausZeile(r: Zeile): GemeindeAbo {
  return {
    id: r.id,
    regionId: r.region_id,
    email: r.email,
    status: (["ausstehend", "bestaetigt", "abgemeldet"] as const).includes(r.status as AboStatus)
      ? (r.status as AboStatus)
      : "abgemeldet",
    // Unbekannte Herkunft gilt als Gemeindeseite — dort gab es das Abo zuerst,
    // und die Altzeilen tragen nichts. Ein Rateweg wäre hier schlimmer als
    // eine benannte Annahme.
    quelle: r.quelle === "foerderung" ? "foerderung" : "gemeinde",
    ueberBrief: r.ueber_brief === true,
    technikenGewaehlt: techniken(r.techniken),
    erstelltAm: r.erstellt_am,
    bestaetigtAm: r.bestaetigt_am,
    letzteMailAm: r.letzte_mail_am,
  };
}

const SPALTEN = "id,region_id,email,status,quelle,ueber_brief,techniken,erstellt_am,bestaetigt_am,letzte_mail_am";

/**
 * Adresse vereinheitlichen, bevor sie irgendwo hingeschrieben wird.
 *
 * Kleinschreibung und Leerzeichen weg — sonst sind „Anna@…" und „anna@…" zwei
 * Abos für dieselbe Person, und wer sich über das eine abmeldet, bekommt
 * weiter Post über das andere. Genau das würde die Zusage „jederzeit
 * abmeldbar" brechen, ohne dass irgendwo ein Fehler sichtbar wäre.
 *
 * BEWUSST NICHT WEITER NORMALISIERT: Punkte im örtlichen Teil zu entfernen
 * oder alles hinter einem Pluszeichen abzuschneiden ist bei einem Anbieter
 * richtig und beim nächsten falsch — dann landet Post bei jemand anderem.
 */
export function normalisiereEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Sieht das nach einer Adresse aus?
 *
 * Absichtlich grob. Eine strenge Prüfung nach der Norm weist echte Adressen ab,
 * und die eigentliche Prüfung ist ohnehin eine andere: Ob es die Adresse gibt,
 * beantwortet allein die Bestätigungsmail. Was hier abgefangen wird, sind
 * Tippfehler und offensichtlicher Unsinn.
 */
export function siehtNachEmailAus(email: string): boolean {
  return /^[^\s@]+@[^\s@.]+\.[^\s@]{2,}$/.test(email) && email.length <= 254;
}

/**
 * Ein Abo anlegen oder ein vorhandenes wieder aufwecken.
 *
 * DREI FÄLLE, und der zweite ist der, den man leicht falsch baut:
 *
 *   neu           → Zeile anlegen, Status „ausstehend", Bestätigung schicken.
 *   ausstehend    → NICHT eine zweite Zeile anlegen. Die Bestätigung wird neu
 *                   geschickt (der alte Link kann abgelaufen sein), aber es
 *                   bleibt EIN Abo. Ohne diesen Zweig legt jeder erneute Klick
 *                   auf „Anmelden" eine weitere Zeile an, und der Ort schickt
 *                   später fünf gleiche Mails an dieselbe Adresse.
 *   bestaetigt    → nichts tun und das auch sagen. Wer schon angemeldet ist,
 *                   bekommt keine zweite Bestätigungsmail — sonst ließe sich
 *                   über das Formular jede fremde Adresse mit Mails belegen.
 *   abgemeldet    → wieder auf „ausstehend" und erneut bestätigen lassen. Eine
 *                   frühere Abmeldung ist ein Widerspruch; ihn ohne neue
 *                   Bestätigung zu übergehen wäre der schwerste Fehler hier.
 */
export type AnlageErgebnis =
  | { art: "bestaetigung-noetig"; abo: GemeindeAbo }
  | { art: "schon-angemeldet" }
  | { art: "keine-db" };

export async function aboAnlegen(o: {
  regionId: string;
  email: string;
  jetztIso: string;
  quelle: AboQuelle;
  ueberBrief: boolean;
  technikenGewaehlt: AboTechnik[];
}): Promise<AnlageErgebnis> {
  if (!supabase) return { art: "keine-db" };
  const email = normalisiereEmail(o.email);

  const { data: vorhanden } = await withDbTimeout(
    supabase
      .from("gemeinde_abos")
      .select(SPALTEN)
      .eq("region_id", o.regionId)
      .eq("email", email)
      .maybeSingle(),
    "abo-lesen",
    DB_READ_TIMEOUT_MS,
  );

  if (vorhanden) {
    const abo = ausZeile(vorhanden as Zeile);
    if (abo.status === "bestaetigt") return { art: "schon-angemeldet" };

    // Ausstehend oder abgemeldet: auf Anfang, Bestätigung erneut schicken.
    const { data, error } = await withDbTimeout(
      supabase
        .from("gemeinde_abos")
        // Die Herkunft wird beim Aufwecken NEU gesetzt: Wer sich ein zweites Mal
      // einträgt, tut das dort, wo er gerade steht — die alte Angabe wäre ab
      // diesem Moment falsch.
      .update({
        status: "ausstehend",
        erstellt_am: o.jetztIso,
        bestaetigt_am: null,
        quelle: o.quelle,
        ueber_brief: o.ueberBrief,
        techniken: o.technikenGewaehlt,
      })
        .eq("id", abo.id)
        .select(SPALTEN)
        .single(),
      "abo-aufwecken",
      DB_READ_TIMEOUT_MS,
    );
    if (error || !data) throw new Error(`Abo konnte nicht aufgeweckt werden: ${error?.message}`);
    return { art: "bestaetigung-noetig", abo: ausZeile(data as Zeile) };
  }

  const { data, error } = await withDbTimeout(
    supabase
      .from("gemeinde_abos")
      .insert({
        region_id: o.regionId,
        email,
        status: "ausstehend",
        erstellt_am: o.jetztIso,
        quelle: o.quelle,
        ueber_brief: o.ueberBrief,
        techniken: o.technikenGewaehlt,
      })
      .select(SPALTEN)
      .single(),
    "abo-anlegen",
    DB_READ_TIMEOUT_MS,
  );
  if (error || !data) throw new Error(`Abo konnte nicht angelegt werden: ${error?.message}`);
  return { art: "bestaetigung-noetig", abo: ausZeile(data as Zeile) };
}

/**
 * Eine Anmeldung bestätigen.
 *
 * Gibt den Ortsschlüssel zurück, damit die Seite danach sagen kann, WOFÜR
 * bestätigt wurde. Ein „Danke, hat geklappt" ohne den Ortsnamen ist bei
 * jemandem, der drei Orte abonniert hat, keine Auskunft.
 *
 * Ein bereits bestätigtes Abo führt NICHT zu einem Fehler: Wer den Link
 * zweimal öffnet — weil das Postfach ihn vorab abruft, weil er zurückgeht —
 * soll dieselbe freundliche Seite sehen, nicht eine Fehlermeldung.
 */
export async function aboBestaetigen(
  aboId: string,
  jetztIso: string,
): Promise<{ ok: true; abo: GemeindeAbo } | { ok: false; grund: "unbekannt" | "keine-db" }> {
  if (!supabase) return { ok: false, grund: "keine-db" };

  const { data: vorhanden } = await withDbTimeout(
    supabase.from("gemeinde_abos").select(SPALTEN).eq("id", aboId).maybeSingle(),
    "abo-bestaetigen-lesen",
    DB_READ_TIMEOUT_MS,
  );
  if (!vorhanden) return { ok: false, grund: "unbekannt" };
  const abo = ausZeile(vorhanden as Zeile);
  if (abo.status === "bestaetigt") return { ok: true, abo };

  const { data, error } = await withDbTimeout(
    supabase
      .from("gemeinde_abos")
      .update({ status: "bestaetigt", bestaetigt_am: jetztIso })
      .eq("id", aboId)
      .select(SPALTEN)
      .single(),
    "abo-bestaetigen",
    DB_READ_TIMEOUT_MS,
  );
  if (error || !data) throw new Error(`Bestätigung fehlgeschlagen: ${error?.message}`);
  return { ok: true, abo: ausZeile(data as Zeile) };
}

/**
 * Abmelden.
 *
 * Die Zeile wird NICHT gelöscht, sondern auf „abgemeldet" gesetzt. Zwei
 * Gründe, beide praktisch: Eine gelöschte Zeile lässt sich beim nächsten
 * Anmelde-Versuch nicht von einer neuen unterscheiden, und der Widerspruch
 * wäre damit weg. Und wer später wiederkommt, soll erneut bestätigen müssen —
 * das geht nur, wenn wir wissen, dass er einmal abgemeldet war.
 *
 * Ein unbekanntes Abo ist hier KEIN Fehler nach außen: Die Seite sagt in
 * beiden Fällen „abgemeldet". Sonst verrät die Abmelde-Adresse, welche
 * Kennungen es gibt.
 */
export async function aboAbmelden(aboId: string, jetztIso: string): Promise<void> {
  if (!supabase) return;
  await withDbTimeout(
    supabase
      .from("gemeinde_abos")
      .update({ status: "abgemeldet", abgemeldet_am: jetztIso })
      .eq("id", aboId),
    "abo-abmelden",
    DB_READ_TIMEOUT_MS,
  );
}

// ─── Aufräumen ───────────────────────────────────────────────────────────────
//
// DIESE FRISTEN SIND ZUSAGEN, KEINE EINSTELLUNGEN. Beide stehen wörtlich in
// der Datenschutzerklärung (Abschnitt 16) und in der Bestätigungsmail. Wer sie
// ändert, ändert eine veröffentlichte Aussage — und wer den Lauf abschaltet,
// macht aus beiden eine Falschangabe, ohne dass irgendwo etwas rot wird.
//
// Genau diese Klasse ist im Projekt schon aufgetreten: „keine Nutzer-Accounts,
// keine Cookies" stand in der Erklärung, während es beides gab. Eine
// Datenschutzerklärung liest sich wie eine Bestandsaufnahme und ist in
// Wahrheit ein Versprechen.

/** Nie bestätigte Eintragungen verfallen. Die Bestätigungsmail sagt es zu. */
export const UNBESTAETIGT_MAX_TAGE = 7;

/**
 * Abgemeldete Einträge werden nach einem Jahr entfernt.
 *
 * NICHT sofort: Der Vermerk „abgemeldet" ist der Widerspruch. Wird die Zeile
 * gelöscht, ist er weg — und wer die Adresse danach erneut einträgt, käme ohne
 * erneute Bestätigung durch, weil nichts mehr von der früheren Abmeldung weiß.
 * Ein Jahr ist die Spanne, nach der ein Widerspruch praktisch keine Wirkung
 * mehr entfalten muss.
 */
export const ABGEMELDET_MAX_TAGE = 365;

export type AufraeumErgebnis = {
  unbestaetigtGeloescht: number;
  abgemeldetGeloescht: number;
};

/**
 * Verfallene Einträge löschen.
 *
 * `jetztMs` wird hereingereicht statt aus der Uhr gelesen — sonst lässt sich
 * die Frist nicht prüfen, ohne den Systemtakt zu verstellen.
 */
export async function aboAufraeumen(jetztMs: number): Promise<AufraeumErgebnis> {
  const leer = { unbestaetigtGeloescht: 0, abgemeldetGeloescht: 0 };
  if (!supabase) return leer;

  const grenze = (tage: number) => new Date(jetztMs - tage * 86_400_000).toISOString();

  const { data: a } = await withDbTimeout(
    supabase
      .from("gemeinde_abos")
      .delete()
      .eq("status", "ausstehend")
      .lt("erstellt_am", grenze(UNBESTAETIGT_MAX_TAGE))
      .select("id"),
    "abo-aufraeumen-ausstehend",
    DB_READ_TIMEOUT_MS,
  );

  const { data: b } = await withDbTimeout(
    supabase
      .from("gemeinde_abos")
      .delete()
      .eq("status", "abgemeldet")
      .lt("abgemeldet_am", grenze(ABGEMELDET_MAX_TAGE))
      .select("id"),
    "abo-aufraeumen-abgemeldet",
    DB_READ_TIMEOUT_MS,
  );

  return {
    unbestaetigtGeloescht: (a ?? []).length,
    abgemeldetGeloescht: (b ?? []).length,
  };
}

/**
 * Wie viele bestätigte Abos hat dieser Ort?
 *
 * Für die Gemeindeseite gedacht — sie darf die Zahl zeigen, sobald sie eine
 * Aussage ist. Weicher Zeitrahmen: Fällt die Antwort aus, fehlt eine Zierde,
 * nicht die Seite.
 */
export async function aboZahl(regionId: string): Promise<number | null> {
  if (!supabase) return null;
  try {
    const { count, error } = await withDbTimeout(
      supabase
        .from("gemeinde_abos")
        .select("id", { count: "exact", head: true })
        .eq("region_id", regionId)
        .eq("status", "bestaetigt"),
      "abo-zahl",
      DB_SOFT_READ_TIMEOUT_MS,
    );
    if (error) return null;
    return count ?? null;
  } catch {
    return null;
  }
}
