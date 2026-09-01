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
// GEPRÜFT AM 01.09.2026 (Council, Legal-Judge mit Volltext-Fundstellen). Das
// Ergebnis war nicht das erwartete: Der IP-Verzicht ist RICHTIG und keine
// Abweichung von irgendetwas — er ist die Linie der Aufsicht selbst. Die DSK
// sagt wörtlich, das Abspeichern einer IP genüge „auch nach der Rechtsprechung
// des BGH zum UWG nicht" (Orientierungshilfe Direktwerbung, Februar 2022,
// Ziff. 3.3 S. 11), und das VG Düsseldorf hat einen Versender abgewiesen, der
// genau die empfohlenen zwei IPs vorlegte (27.07.2026, 29 K 9714/24, Rn. 38,
// 41). Weder BGH I ZR 164/09 noch OLG München 29 U 1682/12 verlangen die IP;
// „beim Double-Opt-in ist die IP Pflicht" ist Ratgeber-Literatur ohne
// Fundstelle. Abweichend war unsere Beschreibung, nicht unsere Praxis.
//
// FALSCH WAR DAGEGEN, WORAUF SICH DIESER KOMMENTAR STÜTZTE. Hier stand, das
// signierte Token belege die Einwilligung mit — es belegt gar nichts, weil es
// nach der Bestätigung verworfen und nirgends aufbewahrt wird. Der Preis lag
// nie bei der IP, sondern an zwei Stellen, die niemand angesehen hatte:
//
//   1. WOZU eingewilligt wurde. Der Nachweis umfasst den Wortlaut (DSK
//      Ziff. 3.3), und der stand als Konstante im Code der Oberfläche, die
//      sich mit dem nächsten Commit ändert. Behoben: `einwilligung_version`
//      am Abo, Wortlaute datiert in `lib/abo-einwilligung.ts`.
//   2. DASS eine Bestätigungsmail hinausging. Der BGH verlangt die Erklärung
//      speicher- und ausdruckbar (I ZR 164/09 Rn. 38); genau daran scheiterte
//      der Düsseldorfer Fall (Rn. 46). Behoben: `versand_beleg` — die Kennung,
//      die der Mailserver zurückgibt, ohne eine zweite Kopie der Mail.
//
// OFFEN und dem Betreiber vorgelegt: Die Löschzusage von zwölf Monaten nimmt
// uns den Nachweis in genau dem Fenster, in dem er gebraucht würde — die DSK
// nennt drei Jahre (Ziff. 3.7 S. 14), und Beschwerden kommen typischerweise
// NACH der Abmeldung. Beide Wege sind vertretbar; die stillschweigende Fassung
// ist es nicht.
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
  /**
   * Arbeitet die Person für die Stadt- oder Gemeindeverwaltung?
   *
   * SELBSTAUSKUNFT, nicht geprüft und nicht prüfbar — und genau deshalb
   * harmlos: Sie steuert den TON einer künftigen Meldung, nie den Zugang zu
   * etwas. Wer sie falsch setzt, bekommt einen anders formulierten Text und
   * sonst nichts.
   *
   * Der Grund, sie überhaupt zu erheben: Für eine Verwaltung ist dieselbe Zahl
   * eine andere Nachricht als für einen Hausbesitzer — sie kann sie
   * veröffentlichen, er kann danach handeln. Ohne die Angabe schreiben wir
   * beiden dasselbe und treffen keinen von beiden.
   */
  ausVerwaltung: boolean;
  /**
   * Unter welcher Fassung des Einwilligungstexts diese Anmeldung zustande kam.
   *
   * Der Nachweis nach Art. 7 Abs. 1 DSGVO umfasst den WORTLAUT, nicht nur den
   * Zeitpunkt (DSK Ziff. 3.3: nachweisbar „auch hinsichtlich ihres Wortlauts";
   * EDSA 05/2020 Rn. 108). Ohne diese Angabe stützte sich der Nachweis auf die
   * Bauart des Systems — und genau die erklärt der EDSA für nicht ausreichend.
   */
  einwilligungVersion: string | null;
  /**
   * Beleg des Mailservers für die Bestätigungsmail.
   *
   * Der BGH verlangt „Speicherung und die jederzeitige Möglichkeit, sie
   * auszudrucken" (I ZR 164/09 Rn. 38). Am Düsseldorfer Fall (VG Düsseldorf,
   * 29 K 9714/24, Rn. 46) ist ein Versender genau daran gescheitert: Er konnte
   * keine Bestätigungsmail vorlegen — „lässt nur den Schluss zu, dass es keine
   * Bestätigungsmail gibt."
   *
   * WIR LEGEN KEINE KOPIE AN, sondern nur den Beleg, DASS versendet wurde. Der
   * Inhalt lässt sich aus der Fassung oben wortgleich neu erzeugen; eine
   * zweite Kopie jeder Mail wäre mehr Daten für denselben Nachweis und liefe
   * der Datenminimierung zuwider (EDSA Rn. 106).
   */
  versandBeleg: string | null;
  erstelltAm: string;
  /**
   * Wann abgemeldet wurde.
   *
   * Wurde geschrieben, aber bis zum 01.09.2026 nirgends gelesen — die Spalte
   * fehlte in der Leseliste und im Typ. Die Datenschutzerklärung sagt zu, dass
   * „dass und wann du dich … wieder abgemeldet hast" als Nachweis aufbewahrt
   * wird; ein Nachweis, den die Leseschicht nicht herausgibt, ist aber keiner.
   */
  abgemeldetAm: string | null;
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
  aus_verwaltung: boolean | null;
  einwilligung_version: string | null;
  versand_beleg: string | null;
  erstellt_am: string;
  abgemeldet_am: string | null;
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
    // Fehlt die Angabe (Altzeile oder nicht angehakt), gilt "nein". Die
    // vorsichtige Richtung: Wer nicht gesagt hat, dass er dort arbeitet,
    // bekommt den Text für alle anderen.
    ausVerwaltung: r.aus_verwaltung === true,
    einwilligungVersion: r.einwilligung_version,
    versandBeleg: r.versand_beleg,
    erstelltAm: r.erstellt_am,
    abgemeldetAm: r.abgemeldet_am,
    bestaetigtAm: r.bestaetigt_am,
    letzteMailAm: r.letzte_mail_am,
  };
}

const SPALTEN =
  "id,region_id,email,status,quelle,ueber_brief,techniken,aus_verwaltung,einwilligung_version,versand_beleg,erstellt_am,bestaetigt_am,abgemeldet_am,letzte_mail_am";

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
  /**
   * Es wird KEINE Mail geschickt — die Adresse hat zu viele offene Anmeldungen
   * oder gerade eben schon eine Bestätigung bekommen.
   *
   * Nach außen sieht das aus wie jeder andere Fall (der Aufrufer antwortet
   * gleich); der Unterschied ist nur, dass hier nichts hinausgeht. Wer hier
   * eine eigene Fehlermeldung ausgäbe, verriete, welche Adressen bereits
   * eingetragen sind.
   */
  | { art: "still" }
  | { art: "keine-db" };

export async function aboAnlegen(o: {
  regionId: string;
  email: string;
  jetztIso: string;
  quelle: AboQuelle;
  ueberBrief: boolean;
  technikenGewaehlt: AboTechnik[];
  ausVerwaltung: boolean;
  /** Fassung des Einwilligungstexts, vom Aufrufer gegen das Archiv geprüft. */
  einwilligungVersion: string;
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

    // Gerade eben schon eine Bestätigung geschickt? Dann keine zweite. Ohne
    // diese Sperre löst jeder erneute Klick eine weitere Mail an denselben
    // Empfänger aus.
    const zuletzt = Date.parse(abo.erstelltAm);
    if (Number.isFinite(zuletzt) && Date.parse(o.jetztIso) - zuletzt < BESTAETIGUNG_SPERRE_MS) {
      return { art: "still" };
    }

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
        aus_verwaltung: o.ausVerwaltung,
        // Beim Aufwecken NEU gesetzt: Wer sich ein zweites Mal einträgt, tut
        // das unter dem Text, der ihm JETZT vorliegt. Die alte Fassung wäre ab
        // diesem Moment die falsche Auskunft.
        einwilligung_version: o.einwilligungVersion,
        versand_beleg: null,
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

  // NUR VOR EINER NEUEN ZEILE geprüft, nicht vor dem Aufwecken: Wer einen
  // vorhandenen Eintrag erneuert, erhöht die Zahl der offenen Anmeldungen
  // nicht. Ihn hier abzuweisen träfe genau den Menschen, dessen Mail nicht
  // ankam.
  const { count } = await withDbTimeout(
    supabase
      .from("gemeinde_abos")
      .select("id", { count: "exact", head: true })
      .eq("email", email)
      .eq("status", "ausstehend"),
    "abo-offene-zaehlen",
    DB_READ_TIMEOUT_MS,
  );
  if ((count ?? 0) >= OFFENE_JE_ADRESSE_MAX) return { art: "still" };

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
        aus_verwaltung: o.ausVerwaltung,
        einwilligung_version: o.einwilligungVersion,
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
 * Den Versandbeleg der Bestätigungsmail nachtragen.
 *
 * Getrennt vom Anlegen, weil der Beleg erst NACH dem Versand existiert — und
 * versendet wird erst, wenn die Zeile steht (sonst stünde in einer Mail eine
 * Kennung, zu der es kein Abo gibt).
 *
 * Wirft nicht: Ein fehlender Beleg schwächt den Nachweis, aber eine
 * erfolgreiche Anmeldung deswegen zu verwerfen wäre der teurere Fehler.
 */
export async function versandBelegSetzen(aboId: string, beleg: string): Promise<void> {
  if (!supabase) return;
  await withDbTimeout(
    supabase.from("gemeinde_abos").update({ versand_beleg: beleg }).eq("id", aboId),
    "abo-versandbeleg",
    DB_READ_TIMEOUT_MS,
  );
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
 * Die Zeile wird NICHT gelöscht, sondern auf „abgemeldet" gesetzt — und der
 * Grund dafür ist ein anderer, als hier lange stand.
 *
 * FALSCH WAR: „damit die Adresse nicht versehentlich wieder auf die Liste
 * gerät". Das beschreibt eine Sperrliste, und eine Sperrliste hat in einem
 * einwilligungsbasierten Verteiler keine tragfähige Grundlage. Die DSK sagt es
 * ausdrücklich (Orientierungshilfe Direktwerbung 2/2022, Ziff. 5.1): „Ist die
 * werbliche Nutzung nur auf Basis einer Einwilligung zulässig, muss der
 * Verantwortliche ohnehin sicherstellen, dass in jedem Einzelfall eine
 * Einwilligung vorliegt" — eine Sperrdatei kann deshalb „letztlich nur
 * rechtmäßig sein, wenn die zu verhindernde Verarbeitung … auf Art. 6 Abs. 1
 * UAbs. 1 lit. f DS-GVO beruht". Bei uns beruht sie das nicht.
 *
 * Und die Sorge dahinter war ein Programmfehler, keine Rechtspflicht: Eine
 * erneute Anmeldung läuft IMMER durch eine neue Bestätigung, ob die Adresse
 * schon einmal da war oder nicht. Eine neue, gültige Einwilligung ist kein
 * Unfall, den man verhindern müsste.
 *
 * RICHTIG IST: Die Zeile bleibt als NACHWEIS der Einwilligung — auf anderer
 * Rechtsgrundlage (Art. 6 Abs. 1 lit. c i. V. m. Art. 5 Abs. 2, Art. 7 Abs. 1
 * DSGVO und lit. f) und mit eingeschränktem Zweck. Der Versandlauf darf sie
 * nicht mehr lesen; sichtbar gemacht wird das durch den Status selbst
 * (Erwägungsgrund 67: „Auf die Tatsache, dass die Verarbeitung … beschränkt
 * wurde, sollte in dem System unmissverständlich hingewiesen werden.").
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
 * Wie viele UNBESTÄTIGTE Anmeldungen eine Adresse gleichzeitig haben darf.
 *
 * Die wirksame Bremse gegen Listen-Bombing: Wer eine fremde Adresse für
 * hunderte Orte einträgt, erzeugt hunderte unbestätigte Zeilen, und der
 * Betroffene bekommt hunderte Bestätigungsmails, die er nie wollte. Der
 * Schaden trifft dabei UNS — die Beschwerden landen bei dem Postfach, über das
 * später die echten Meldungen laufen.
 *
 * Fünf ist großzügig für einen Menschen (Wohnort, Elternwohnort, Arbeitsort)
 * und deckelt den Schaden bei fünf Mails statt hunderten.
 *
 * WARUM NICHT ÜBER DIE HERKUNFTSADRESSE: Eine dauerhafte Zählung je
 * IP-Adresse müsste die IP speichern — und die Datenschutzerklärung sagt
 * ausdrücklich zu, dass wir das nicht tun. Die E-Mail-Adresse speichern wir
 * ohnehin, und sie ist hier auch die treffendere Größe: Geschützt werden soll
 * der Mensch, dessen Postfach zugeschüttet wird, nicht ein Anschluss.
 */
export const OFFENE_JE_ADRESSE_MAX = 5;

/**
 * Wie lange nach einer Bestätigungsmail keine zweite an dieselbe Adresse für
 * denselben Ort geht.
 *
 * Ohne diese Sperre löst jeder erneute Klick auf „Abonnieren" eine weitere
 * Mail aus — hundert Klicks, hundert Mails, alle an denselben Empfänger. Zwei
 * Minuten sind kurz genug, dass ein Mensch, dessen Mail wirklich nicht ankam,
 * nicht warten muss, und lang genug gegen ein Skript.
 */
export const BESTAETIGUNG_SPERRE_MS = 2 * 60 * 1000;

/**
 * Wann der Einwilligungsnachweis gelöscht wird.
 *
 * NICHT „zwölf Monate nach der Abmeldung" — das war zweimal falsch (Council mit
 * Legal-Judge, 01.09.2026, Fundstellen im Original gelesen):
 *
 *   FALSCHES EREIGNIS. Die Uhr startet am letzten VERSAND, nicht an der
 *   Abmeldung. Der Anspruch, gegen den der Nachweis schützt, entsteht mit der
 *   einzelnen Mail (§ 31 Abs. 3 S. 1 OWiG: „sobald die Handlung beendet ist";
 *   § 199 Abs. 1 BGB: mit dem Schluss des Jahres, in dem der Anspruch entstand).
 *   Wer sich nach drei Jahren Abo abmeldet, hätte bei einer Uhr ab Abmeldung
 *   drei Jahre zu viel; wer sich sofort abmeldet, ohne je eine Meldung bekommen
 *   zu haben, zu wenig.
 *
 *   FALSCHE LÄNGE. Die DSK verlangt Nachweisfähigkeit über die Verjährung
 *   hinaus — drei Jahre, § 31 Abs. 2 Nr. 1 OWiG bzw. § 195 BGB
 *   (Orientierungshilfe Direktwerbung 2/2022, Ziff. 3.7) — und ausdrücklich
 *   „auch nach einem Widerruf und der Löschung der personenbezogenen Daten aus
 *   der Werbe-Datenbank".
 *
 * Die zivilrechtliche Frist ist die längere und deckt die bußgeldrechtliche mit
 * ab: Ultimo-Regel aus § 199 Abs. 1 BGB, also der 31.12. des dritten Jahres
 * nach dem Jahr des letzten Versands. Je nach Versandmonat sind das 36 bis 48
 * Monate.
 */
export const NACHWEIS_JAHRE = 3;

/**
 * Der Tag, an dem der Nachweis zu einem Abo gelöscht werden darf.
 *
 * `letzterVersandIso` ist der Zeitpunkt der letzten Meldung. Gab es nie eine
 * (jemand meldet sich ab, bevor etwas kam), gibt es auch keinen Anspruch, gegen
 * den der Nachweis schützt — dann zählt die Bestätigung als Ereignis, denn sie
 * ist die Einwilligung, um die im Streit gestritten würde.
 */
export function nachweisLoeschbarAb(letzterVersandIso: string | null, bestaetigtIso: string | null): string | null {
  const anker = letzterVersandIso ?? bestaetigtIso;
  if (!anker) return null;
  const jahr = Number(anker.slice(0, 4));
  if (!Number.isFinite(jahr)) return null;
  // Der 1. Januar danach — gelöscht wird ab diesem Tag, die Frist endet also
  // mit dem 31.12. des dritten Jahres.
  return `${jahr + NACHWEIS_JAHRE + 1}-01-01T00:00:00.000Z`;
}

/**
 * ALT: zwölf Monate ab Abmeldung. Bleibt als Konstante stehen, weil ein Test
 * die veröffentlichte Zusage dagegen hält — er muss rot werden, wenn jemand
 * die alte Frist zurückbringt.
 *
 * @deprecated Ersetzt durch NACHWEIS_JAHRE, siehe dort.
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

  // Der Nachweis: gelöscht wird nach dem 31.12. des dritten Jahres nach der
  // letzten Meldung — nicht nach der Abmeldung (siehe NACHWEIS_JAHRE).
  //
  // ZWEI BEDINGUNGEN, weil zwei Ereignisse in Frage kommen. Wer nie eine
  // Meldung bekam, hat kein Versanddatum; dort zählt die Bestätigung. Beide
  // Fälle einzeln abzufragen ist umständlicher als eine Bedingung — aber eine
  // Bedingung über zwei Spalten würde in der Datenbank zum vollständigen
  // Durchlauf, und die Reihenfolge der Prüfung wäre nicht mehr abzulesen.
  const jahr = new Date(jetztMs).getUTCFullYear();
  const stichtag = `${jahr - NACHWEIS_JAHRE}-01-01T00:00:00.000Z`;

  const { data: b1 } = await withDbTimeout(
    supabase
      .from("gemeinde_abos")
      .delete()
      .eq("status", "abgemeldet")
      .not("letzte_mail_am", "is", null)
      .lt("letzte_mail_am", stichtag)
      .select("id"),
    "abo-aufraeumen-nachweis-versand",
    DB_READ_TIMEOUT_MS,
  );

  const { data: b2 } = await withDbTimeout(
    supabase
      .from("gemeinde_abos")
      .delete()
      .eq("status", "abgemeldet")
      .is("letzte_mail_am", null)
      .lt("bestaetigt_am", stichtag)
      .select("id"),
    "abo-aufraeumen-nachweis-ohne-versand",
    DB_READ_TIMEOUT_MS,
  );

  // DRITTER ZWEIG, und er fehlte (gefunden bei der Doku-Prüfung, 01.09.2026):
  // Wer nie bestätigt hat und dann per Abmeldelink abmeldet, steht auf
  // „abgemeldet" OHNE Bestätigungsdatum und ohne Versanddatum. Die beiden
  // Zweige darüber greifen bei ihm nicht — `NULL < stichtag` ist in Postgres
  // nicht wahr, sondern NULL. Die Zeile wäre für immer stehen geblieben,
  // während die Datenschutzerklärung zusagt: „Hast du deine Anmeldung nie
  // bestätigt, löschen wir sie ohne diese Frist."
  //
  // Und genau so ist es auch richtig: Ohne Bestätigung gibt es keine
  // Einwilligung, also nichts nachzuweisen. Es gilt die kurze Frist der
  // unbestätigten Eintragungen, gerechnet ab der Eintragung.
  const { data: b3 } = await withDbTimeout(
    supabase
      .from("gemeinde_abos")
      .delete()
      .eq("status", "abgemeldet")
      .is("letzte_mail_am", null)
      .is("bestaetigt_am", null)
      .lt("erstellt_am", grenze(UNBESTAETIGT_MAX_TAGE))
      .select("id"),
    "abo-aufraeumen-nie-bestaetigt",
    DB_READ_TIMEOUT_MS,
  );

  const b = [...(b1 ?? []), ...(b2 ?? []), ...(b3 ?? [])];

  return {
    unbestaetigtGeloescht: (a ?? []).length,
    abgemeldetGeloescht: (b ?? []).length,
  };
}

/**
 * Für welche Orte gibt es überhaupt bestätigte Abos?
 *
 * Der Versandlauf fragt zuerst danach, statt über alle Gemeinden zu gehen: Es
 * gibt über zehntausend, und Abonnenten hat anfangs eine Handvoll. Ein Lauf,
 * der jeden Ort durchrechnet, um in 99,9 % der Fälle „niemand da" zu
 * beantworten, ist kein Lauf, sondern eine Rechnung ohne Empfänger.
 */
export async function orteMitAbos(): Promise<string[]> {
  if (!supabase) return [];
  const { data, error } = await withDbTimeout(
    supabase.from("gemeinde_abos").select("region_id").eq("status", "bestaetigt"),
    "abo-orte",
    DB_READ_TIMEOUT_MS,
  );
  if (error || !data) return [];
  return [...new Set((data as { region_id: string }[]).map((r) => r.region_id))];
}

/**
 * Den Zeitpunkt der letzten Meldung setzen.
 *
 * VOR dem Versand aufgerufen, nicht danach. Bricht der Lauf zwischen zwei
 * Empfängern ab, darf der Neustart niemanden ein zweites Mal anschreiben — der
 * Preis ist, dass ein fehlgeschlagener Versand als „geschrieben" zählt, und das
 * ist die günstigere Richtung.
 *
 * Dieselbe Spalte trägt die Löschuhr des Nachweises: Sie rechnet ab der letzten
 * Meldung, nicht ab der Abmeldung (siehe NACHWEIS_JAHRE).
 */
export async function versandVermerken(aboId: string, jetztIso: string): Promise<void> {
  if (!supabase) return;
  const { error } = await withDbTimeout(
    supabase.from("gemeinde_abos").update({ letzte_mail_am: jetztIso }).eq("id", aboId),
    "abo-versand-vermerken",
    DB_READ_TIMEOUT_MS,
  );
  // WIRFT ABSICHTLICH: Der Aufrufer darf ohne gesetzten Merker nicht senden.
  // Ein stilles Scheitern hier wäre der Weg zum doppelten Versand.
  if (error) throw new Error(`Versandmerker nicht gesetzt: ${error.message}`);
}

/**
 * Wer bekommt eine Meldung zu diesem Ort?
 *
 * DIE EINZIGE TÜR ZUM VERSAND — und der Grund, warum es sie gibt, ist die
 * Zweckbeschränkung nach der Abmeldung. Ein abgemeldetes Abo bleibt als
 * NACHWEIS der Einwilligung stehen (siehe `aboAbmelden`), auf anderer
 * Rechtsgrundlage und für einen anderen Zweck. Läse der Versand dieselbe
 * Tabelle ohne Filter, wäre die Beschränkung eine Behauptung.
 *
 * Erwägungsgrund 67 verlangt, dass eine solche Beschränkung „in dem System
 * unmissverständlich" sichtbar ist. Sie ist es hier zweifach: am Status der
 * Zeile und daran, dass es genau eine Funktion gibt, die Empfänger liefert.
 *
 * Wer einen Versandlauf baut, nimmt DIESE Funktion. Ein zweiter Lesepfad auf
 * dieselbe Tabelle wäre kein Duplikat, sondern der Weg, auf dem eine
 * abgemeldete Adresse wieder Post bekommt — festgenagelt von
 * `lib/__tests__/abo-zweckbindung.test.ts`.
 */
export async function empfaengerFuerOrt(regionId: string): Promise<GemeindeAbo[]> {
  if (!supabase) return [];
  const { data, error } = await withDbTimeout(
    supabase
      .from("gemeinde_abos")
      .select(SPALTEN)
      .eq("region_id", regionId)
      .eq("status", "bestaetigt"),
    "abo-empfaenger",
    DB_READ_TIMEOUT_MS,
  );
  if (error || !data) return [];
  return (data as Zeile[]).map(ausZeile);
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
