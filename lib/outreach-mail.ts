// Der Versandweg für Kommunen-Anschreiben — Regeln, nicht nur Zugangsdaten.
//
// Reine Funktionen ohne Netzzugriff, damit die Regeln testbar sind. Das
// eigentliche Senden macht scripts/kommunen-versand.ts mit nodemailer.
//
// DREI DINGE STEHEN HIER, WEIL SIE SONST NIRGENDS STEHEN WÜRDEN:
//
// 1. ÜBER WELCHEN ANBIETER NICHT GESENDET WIRD. Resend ist der Dienst, über den
//    das Kontaktformular und alle Wächter-Meldungen laufen. Seine
//    Nutzungsbedingungen verbieten Kaltakquise wörtlich; eine Sperre träfe
//    dasselbe Konto und damit die Alarm-Mails. Das private Postfach des
//    Betreibers scheidet aus demselben Grund aus, nur schlimmer: Es ist eine
//    Privatadresse in einem Vorgang, der geschäftlich ist.
// 2. DASS DER ABSENDER ZUR DOMAIN PASSEN MUSS. Der SPF-Eintrag von
//    solar-check.io erlaubt ausschließlich die Mailserver von All-Inkl
//    (`include:spf.kasserver.com`). Eine Mail mit diesem Absender über einen
//    anderen Server scheitert SPF, verfehlt die DMARC-Ausrichtung und landet
//    bei jeder größeren Verwaltung im Spam — der teuerste denkbare Fehlschlag,
//    weil er unsichtbar ist: Das Skript meldet „versendet".
// 3. DASS EIN ANSCHREIBEN OHNE PFLICHTANGABEN NICHT HINAUSGEHT. Klarname,
//    Impressum und der Herkunftshinweis nach Art. 14 DSGVO stehen im Text der
//    Vorlage. Steht einer nicht drin — weil jemand einen Entwurf von Hand
//    bearbeitet hat —, ist das kein Schönheitsfehler, sondern eine
//    Informationspflicht, die verletzt wird.

/** Anbieter, über die niemals ein Anschreiben hinausgeht. */
/** Wer laut SPF-Eintrag der Domain überhaupt für uns senden darf. */
export const ERLAUBTE_MAIL_HOSTS = ["kasserver.com", "all-inkl.com"];

export const VERBOTENE_MAIL_HOSTS = [
  "resend.com",
  "smtp.resend.com",
  "gmail.com",
  "smtp.gmail.com",
  "googlemail.com",
];

export type SmtpKonfiguration = {
  host: string;
  port: number;
  user: string;
  pass: string;
  /** Absender, wie er im Kopf steht. */
  from: string;
  /** Wohin Antworten gehen sollen, falls abweichend. */
  replyTo?: string;
};

export type KonfigBefund = { ok: true; konfig: SmtpKonfiguration } | { ok: false; fehler: string[] };

/** Absender-Adresse aus einem „Name <adresse>"-Kopf herausziehen. */
export function adresseAus(from: string): string {
  const m = from.match(/<([^>]+)>/);
  return (m ? m[1] : from).trim().toLowerCase();
}

/**
 * Versandweg aus der Umgebung lesen und prüfen.
 *
 * Prüft nicht nur auf Vollständigkeit, sondern auf die zwei Fehler, die man
 * einer laufenden Konfiguration nicht ansieht: falscher Anbieter und ein
 * Absender, der nicht zur Domain gehört, für die SPF und DKIM eingerichtet
 * sind.
 */
export function leseSmtpKonfig(env: Record<string, string | undefined>): KonfigBefund {
  const fehler: string[] = [];
  const host = (env.OUTREACH_SMTP_HOST ?? "").trim();
  const user = (env.OUTREACH_SMTP_USER ?? "").trim();
  const pass = env.OUTREACH_SMTP_PASS ?? "";
  const from = (env.OUTREACH_MAIL_FROM ?? "").trim();
  const port = parseInt(env.OUTREACH_SMTP_PORT ?? "465", 10);

  if (!host) fehler.push("OUTREACH_SMTP_HOST fehlt");
  if (!user) fehler.push("OUTREACH_SMTP_USER fehlt");
  if (!pass) fehler.push("OUTREACH_SMTP_PASS fehlt");
  if (!from) fehler.push("OUTREACH_MAIL_FROM fehlt (Format: \"Name <adresse@solar-check.io>\")");
  if (!Number.isFinite(port) || port <= 0) fehler.push(`OUTREACH_SMTP_PORT ist keine Portnummer: ${env.OUTREACH_SMTP_PORT}`);

  const hostKlein = host.toLowerCase();
  if (VERBOTENE_MAIL_HOSTS.some((h) => hostKlein === h || hostKlein.endsWith(`.${h}`))) {
    fehler.push(
      `Über ${host} wird kein Anschreiben versendet — dieser Anbieter trägt die Alarm- und Formular-Mails ` +
        "und verbietet Kaltakquise (siehe Kopf von lib/outreach-mail.ts).",
    );
  }
  // ERLAUBNISLISTE, nicht nur die Sperrliste: Der SPF-Eintrag der Domain
  // erlaubt genau einen Anbieter. Eine Sperrliste mit drei Einträgen lässt
  // jeden vierten durch, und der Fehlschlag wäre unsichtbar — die Mail geht
  // raus, verfehlt die Ausrichtung und landet im Spam, während das Skript
  // „versendet" meldet.
  if (host && !ERLAUBTE_MAIL_HOSTS.some((h) => hostKlein === h || hostKlein.endsWith(`.${h}`))) {
    fehler.push(
      `${host} steht nicht im SPF-Eintrag von solar-check.io (erlaubt: ${ERLAUBTE_MAIL_HOSTS.join(", ")}) — ` +
        "die Mail würde die DMARC-Ausrichtung verfehlen.",
    );
  }

  const absender = adresseAus(from);
  if (from && !absender.endsWith("@solar-check.io")) {
    fehler.push(
      `Absender ${absender} gehört nicht zu solar-check.io — SPF und DKIM gelten nur für diese Domain, ` +
        "die Mail würde die Ausrichtung verfehlen.",
    );
  }
  // Der Mailserver schreibt den Envelope-Absender auf das angemeldete Konto um.
  // Gehört das nicht zur Absenderadresse, ist die SPF-Ausrichtung weg — und
  // zwar unsichtbar, weil im sichtbaren Kopf weiter der richtige Name steht.
  if (from && user && absender !== user.toLowerCase()) {
    fehler.push(`Absender (${absender}) und SMTP-Konto (${user.toLowerCase()}) sind verschieden.`);
  }

  if (fehler.length) return { ok: false, fehler };
  return { ok: true, konfig: { host, port, user, pass, from, replyTo: env.OUTREACH_MAIL_REPLY_TO?.trim() || undefined } };
}

// ─── Wer darf überhaupt Empfänger sein ───────────────────────────────────────
//
// Die Outreach-Leitplanke lautet: Rollen-Postfächer statt Klarnamen. Sie hat
// zwei Gründe — der datenschutzrechtliche (an ein Funktionspostfach geht keine
// Nachricht an eine bestimmte Person) und der praktische (ein Funktionspostfach
// wird gelesen, auch wenn jemand im Urlaub ist).
//
// Die Erkennung beim Einsammeln war zu großzügig: Ihr Muster erlaubte hinter
// dem Rollenwort einen beliebigen Zusatz, und damit galt
// `buergermeister-klein@badem.de` als Rollen-Postfach. Das ist der Nachname
// einer natürlichen Person, und die Datenschutzerklärung sagt zu, es würden
// „ausschließlich öffentlich zugängliche Kontaktdaten der Verwaltung" genutzt.
//
// Deshalb prüft der VERSAND noch einmal, und zwar strenger als der Sammler:
// Was nicht eindeutig ein Funktionspostfach ist, geht nicht hinaus. Der
// Datenbestand wird davon nicht angefasst — er wird nur nicht benutzt.

/** Wörter, die eine Funktion bezeichnen und keine Person. */
export const ROLLEN_WORTE = [
  "info",
  "rathaus",
  "poststelle",
  "post",
  "gemeinde",
  "gemeindeverwaltung",
  "ortsgemeinde",
  "stadt",
  "stadtverwaltung",
  "stadtkommunikation",
  "markt",
  "verwaltung",
  "hauptamt",
  "postfach",
  "buergermeister",
  "bürgermeister",
  // Die weibliche Form ist eine eigene Zeichenfolge, keine Ableitung: Wer sie
  // per Regel aus der männlichen bildet, baut sich eine Falle für den nächsten
  // Fall („buergermeisterin" wurde als Personenname abgewiesen).
  "buergermeisterin",
  "bürgermeisterin",
  "buergerbuero",
  "kontakt",
  "presse",
  "pressestelle",
  "redaktion",
  "oeffentlichkeitsarbeit",
  "klimaschutz",
  "klima",
  "umwelt",
  "energie",
  "verbandsgemeinde",
  "vg",
  "amt",
];

/**
 * Rollenwörter, die zwar Funktionen sind, aber NICHT die Verwaltung meinen.
 *
 * `webmaster@` und Verwandte gehören bei kleinen Ortsgemeinden regelmäßig
 * ehrenamtlich Betreuenden der Website — technisch ein Funktionspostfach,
 * inhaltlich die falsche Stelle für eine Pressemeldung. Sie fallen aus dem
 * Versand, nicht aus dem Datenbestand.
 */
export const ROLLEN_WORTE_TECHNISCH = ["webmaster", "webteam", "web", "online", "internet"];

/** Postfächer, an die grundsätzlich nichts geht. */
export const POSTFACH_UNGEEIGNET = ["datenschutz", "dsb", "abuse", "noreply", "no-reply", "postmaster", "mailer-daemon"];

const ohneUmlaute = (s: string) =>
  s
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss");

/** Ortsname auf den Kern reduzieren: „Langen (Hessen)" → „langen", „Ilbesheim
 *  bei Landau in der Pfalz" → „ilbesheim". */
export function ortKern(name: string): string {
  return ohneUmlaute(name)
    .replace(/\(.*?\)/g, " ")
    .split(/\s+bei\s+|\s+a\.|\s+am\s+|\s+an\s+der\s+|\s+i\.|\s+\//)[0]
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

/** Merkmale, an denen eine Verwaltungs-Domain als solche erkennbar ist. */
const VERWALTUNGS_MARKER = /(^|[.-])(vg|vgv|vgem|verbandsgemeinde|amt|samtgemeinde|verwaltung)([.-]|$)|land$|kreis$/;

export type PostfachBefund = { ok: true } | { ok: false; grund: string };

/**
 * Darf an dieses Postfach ein Anschreiben gehen?
 *
 * Zwei Fragen, beide aus echten Fehlfällen:
 *
 * 1. IST ES EINE FUNKTION ODER EIN MENSCH? Ein Rollenwort mit angehängtem
 *    Zusatz ist nur dann eine Funktion, wenn der Zusatz selbst eine ist oder
 *    den Ort nennt („buergermeister-immert@"), nicht wenn er ein Nachname ist
 *    („buergermeister-klein@").
 * 2. GEHÖRT DIE DOMAIN ÜBERHAUPT ZU DIESEM ORT? `stadtbuergermeister@bad-
 *    sobernheim.de` als Adresse für Daubach ist ein gültiges Amtspostfach —
 *    nur das einer anderen Kommune. Eine fremde Domain ist erlaubt, wenn sie
 *    sich als gemeinsame Verwaltung zu erkennen gibt („vg-", „-land", „amt-");
 *    trägt sie schlicht einen anderen Ortsnamen, ist die Zuordnung geraten.
 */
export function postfachBefund(
  email: string,
  ortsname: string,
  /**
   * Die im Impressum BELEGTE Domain der gemeinsamen Verwaltung, falls bekannt.
   *
   * Ohne sie ist ein Verwaltungs-Kennzeichen in der Domain nur ein Indiz und
   * kein Beleg: Gemessen am 19.08.2026 akzeptierte die Prüfung
   * `info@saarland.de` für Wadgassen und `rathaus@amt-nordsee.de` für
   * Kirchheim — jede Domain, die irgendwo „vg", „amt" oder „land" trägt, galt
   * für jeden beliebigen Ort. Das ist genau der Fall, gegen den diese Funktion
   * geschrieben wurde.
   */
  verwaltungDomain?: string | null,
): PostfachBefund {
  const adresse = email.trim().toLowerCase();
  const [lokal, domain] = adresse.split("@");
  if (!lokal || !domain) return { ok: false, grund: `keine gültige Adresse: ${email}` };

  const teile = ohneUmlaute(lokal).split(/[.\-_]+/).filter(Boolean);
  if (POSTFACH_UNGEEIGNET.includes(teile[0])) {
    return { ok: false, grund: `${teile[0]}@ ist kein Postfach für Anschreiben` };
  }
  const kern = ortKern(ortsname);
  const domainStamm = domain.split(".").slice(0, -1).join(".");

  const istRollenwort = (t: string) =>
    ROLLEN_WORTE.map(ohneUmlaute).includes(t) ||
    // Zusammengesetzte Formen wie „stadtbuergermeister" oder „ortsbuergermeister".
    ROLLEN_WORTE.map(ohneUmlaute).some((r) => r.length >= 4 && t.endsWith(r));

  if (ROLLEN_WORTE_TECHNISCH.includes(teile[0])) {
    return { ok: false, grund: `${teile[0]}@ betreut die Website, nicht die Verwaltung` };
  }
  if (!istRollenwort(teile[0])) {
    return { ok: false, grund: `„${teile[0]}" ist kein Funktionsname — sieht nach einer Person aus` };
  }
  for (const t of teile.slice(1)) {
    const passtZumOrt = kern.length >= 4 && (t.includes(kern.slice(0, 5)) || kern.includes(t) || domainStamm.includes(t));
    if (!istRollenwort(t) && !/^\d+$/.test(t) && !passtZumOrt) {
      return { ok: false, grund: `„${t}" im Postfachnamen ist vermutlich ein Personenname` };
    }
  }

  // Domain: entweder der Ort selbst oder eine erkennbare gemeinsame Verwaltung.
  const domainOhne = ohneUmlaute(domainStamm).replace(/[^a-z0-9.-]/g, "");
  const passt =
    kern.length >= 4 && (domainOhne.includes(kern.slice(0, Math.min(kern.length, 6))) || kern.includes(domainOhne.replace(/[.-]/g, "")));
  // Eine fremde Domain ist erlaubt, wenn sie für DIESE Gemeinde als gemeinsame
  // Verwaltung belegt ist. Das Kennzeichen allein reicht nicht mehr — es sagt
  // nur, dass die Domain nach Verwaltung aussieht, nicht, dass sie zu diesem
  // Ort gehört.
  const belegt =
    !!verwaltungDomain && domain.toLowerCase().endsWith(verwaltungDomain.trim().toLowerCase().replace(/^www\./, ""));
  if (!passt && !belegt) {
    return {
      ok: false,
      grund: VERWALTUNGS_MARKER.test(domainOhne)
        ? `Domain ${domain} sieht nach einer gemeinsamen Verwaltung aus, ist für diesen Ort aber nicht belegt — Zuordnung ungeprüft`
        : `Domain ${domain} trägt weder den Ortsnamen noch eine belegte Verwaltungs-Domain — Zuordnung ungeprüft`,
    };
  }
  return { ok: true };
}

/** Pflichtangaben, die in JEDEM Anschreiben stehen müssen. */
export const PFLICHTANGABEN: { was: string; pruefe: (text: string) => boolean }[] = [
  { was: "Klarname des Absenders", pruefe: (t) => t.includes("Sebastian Schäder") },
  { was: "Impressum-Link", pruefe: (t) => t.includes("solar-check.io/impressum") },
  { was: "Datenschutz-Link", pruefe: (t) => t.includes("solar-check.io/datenschutz") },
  { was: "Herkunftshinweis nach Art. 14 DSGVO", pruefe: (t) => t.includes("Art. 14 DSGVO") },
];

export function fehlendePflichtangaben(body: string): string[] {
  return PFLICHTANGABEN.filter((p) => !p.pruefe(body)).map((p) => p.was);
}

/**
 * Kopfzeilen einer Anschreiben-Mail.
 *
 * `List-Unsubscribe` ist bewusst dabei, obwohl es für eine einzelne
 * Geschäftsmail nicht vorgeschrieben ist: Es gibt dem Empfänger den
 * Widerspruch als Ein-Klick statt als Suchaufgabe, und es ist das Signal, an
 * dem große Mailsysteme eine ordentliche von einer unerwünschten Aussendung
 * unterscheiden. Der `mailto:`-Weg ohne One-Click-POST ist hier der richtige:
 * Ein Widerspruch soll bei einem Menschen ankommen und die Gemeinde dauerhaft
 * sperren, nicht in einem automatischen Endpunkt verschwinden.
 *
 * KEINE Kennung des Empfängers in irgendeinem Header oder Link — die
 * Datenschutzerklärung sagt zu, dass ein Aufruf sich keiner angeschriebenen
 * Kommune zuordnen lässt.
 */
export function mailKopfzeilen(_o: { widerspruchAn: string }): Record<string, string> {
  // LEER — UND DAS IST DAS ERGEBNIS EINER MESSUNG, KEINE NACHLÄSSIGKEIT.
  //
  // Hier standen nacheinander drei Kopfzeilen, alle gut gemeint, alle wieder
  // entfernt:
  //
  // `Precedence: bulk` — Google hat den Header aus seinen Absenderrichtlinien
  // gestrichen, und bei Microsoft fließt er in die Massen-Einstufung ein. Er
  // half nichts und schadete möglicherweise.
  //
  // `Auto-Submitted: no` — wirkungslos: Eine Mail ohne dieses Feld gilt nach
  // RFC 3834 ohnehin als von Hand verfasst.
  //
  // `List-Unsubscribe` — der teuerste. Am 19.08.2026 an der ersten Probemail
  // gemessen: Apple Mail setzt daraufhin ein Banner ÜBER den Brief, „Diese
  // E-Mail ist von einer Mailing-Liste", mit einem „Abo beenden"-Knopf. Der
  // Empfänger liest also „Massenpost", bevor er die Anrede sieht — und der
  // ganze Brief ist darauf gebaut, dass ein Mensch einem anderen schreibt.
  // Outlook und Gmail zeigen dasselbe Muster.
  //
  // Der Widerspruch geht dadurch nicht verloren, im Gegenteil: Eine Antwort an
  // den Absender genügt, sie kommt bei einem Menschen an und führt zum
  // dauerhaften Sperrvermerk. Der Ein-Klick-Endpunkt nach RFC 8058 ist erst ab
  // 5.000 Mails am Tag gefordert; wir senden zwanzig.
  //
  // WER HIER WIEDER ETWAS EINTRÄGT, misst vorher an einer echten Probemail
  // nach, wie es beim Empfänger aussieht. Kopfzeilen sind unsichtbar, ihre
  // Wirkung nicht.
  return {};
}

/**
 * Wartezeit zwischen zwei Mails, in Millisekunden.
 *
 * Nicht Höflichkeit, sondern Zustellbarkeit: 25 Mails in einer Minute aus einem
 * Postfach, das vorher nichts versendet hat, ist das Muster, auf das jeder
 * Spamfilter anspringt. Über eine Vormittagsstunde verteilt ist es das Muster
 * eines Menschen, der Mails schreibt.
 */
export const PAUSE_MS = 90_000;

/**
 * Tagespensum — GEMESSEN ANGEHOBEN, nicht geraten (26.08.2026: 25 → 40).
 *
 * Die 25 stammten aus dem Briefing, und dessen Quelle waren Ratgeber von
 * Anbietern, die Aufwärm-Dienste verkaufen. Unsere eigene Messung sagt etwas
 * anderes: 79 Mails in sechs Läufen, **kein einziger Bounce**, zwei Rathäuser
 * antworteten automatisch, und die Probemail bestand alle drei Echtheitsprüfungen
 * mit gutem Spam-Wert. Die Fachliteratur der Versanddienste beginnt ihre
 * Aufwärmpläne bei tausend Mails am Tag — der Unterschied zwischen 25 und 40 ist
 * dort kein Ereignis.
 *
 * WARUM ÜBERHAUPT ANHEBEN: 3.453 Gemeinden haben ein Rollen-Postfach und sind
 * noch nicht angeschrieben. Bei 20 Mails an drei Versandtagen je Woche dauert
 * das ein Jahr. Die Grenze ist damit nicht die Vorsicht, sondern der Engpass.
 *
 * DIE STUFE IST EINE STUFE, kein Endzustand. Vor der nächsten Anhebung muss die
 * Zustellungsprobe (`ZUSTELLPROBE`) aus mindestens drei Läufen sauber sein —
 * Bounces zeigen sich erst, wenn es längst zu spät ist, die Einsortierung in den
 * Spam-Ordner dagegen sofort.
 */
export const MAX_JE_LAUF = 50;
// 50 statt 40 am 26.08.2026, damit der Schub Niedersachsen/Bremen (48 Gemeinden)
// an einem Tag durchgeht statt an zwei. Der Sprung ist damit 20 → 48 in einem
// Schritt; die Messung deckt bisher 20 ab. Was ihn trotzdem trägt, ist der
// Befund aus sechs Läufen — kein Bounce, bestandene Echtheitsprüfungen — und die
// Zustellungsprobe, die ab jetzt mitläuft und den leisen Fehler zeigen würde.

/**
 * Empfänger der Zustellungsprobe: je Versandlauf eine zusätzliche Mail an ein
 * Postfach bei einem großen Anbieter, um zu sehen, WO sie landet.
 *
 * Der Grund für diese Messung: Ein Bounce sagt „die Adresse gibt es nicht" und
 * kommt sofort. Die teurere Fehlentwicklung ist leise — die Mail wird
 * angenommen, landet aber im Spam-Ordner, und niemand merkt es, weil ein Rathaus
 * uns nicht schreibt, dass es unsere Nachricht nicht gesehen hat. Ohne diese
 * Probe würde eine steigende Menge erst auffallen, wenn der Ruf der Domain
 * beschädigt ist.
 *
 * Leer = keine Probe. Der Versand läuft dann trotzdem, meldet die Lücke aber.
 *
 * FUNKTION, NICHT KONSTANTE — und das ist kein Stilfrage. Eine Konstante wird
 * beim Laden des Moduls ausgewertet, die Datei mit den Zugangsdaten liest das
 * Versandskript aber erst beim Start seiner Hauptfunktion. Die Liste wäre also
 * ausnahmslos leer gewesen, und der Lauf hätte brav „keine Zustellungsprobe
 * gesetzt" gemeldet — eine Messung, die sich selbst abschaltet und dabei
 * ordentlich aussieht.
 */
export function zustellprobeAdressen(): string[] {
  return (process.env.OUTREACH_PROBE_ADRESSEN ?? "")
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean);
}

// ─── Nimmt das Postfach die Zugangsdaten überhaupt an? ───────────────────────
//
// DER ANLASS (02.09.2026, aus der Fehler-Triage): Die Bereitschaftsprüfung des
// Abos meldete „Versandweg und Signatur sind in der Produktion gesetzt",
// während noch nie eine Mail hinausgegangen war. Sie fragt, ob die
// Zugangsdaten GESETZT sind — ein falsch getipptes Passwort ist gesetzt.
//
// Die Gegenprobe dazu ist eine Anmeldung am Postfach OHNE Versand: Der
// Mailserver sagt beim Anmelden, ob er das Konto akzeptiert. Damit ist die
// Kette bis zum letzten Glied gemessen, das ohne einen echten Empfänger
// messbar ist — die Zustellung selbst beweist erst eine echte Mail.
//
// DIE EINORDNUNG DES FEHLSCHLAGS IST DER GANZE PUNKT und steht deshalb als
// eigene, reine Funktion hier: „Passwort abgelehnt" ist ein Befund, „Server
// gerade nicht erreichbar" ist keiner. Dieselbe Trennung wie beim
// Förder-Wächter zwischen „hat sich geändert" und „Abruf kam nicht durch".
// Wer beides zusammenwirft, meldet bei jeder Netzstörung eine
// Fehlkonfiguration — und an eine Warnung, die regelmäßig grundlos angeht,
// gewöhnt man sich ab.

export type AnmeldeBefund =
  /** Der Mailserver hat das Konto angenommen. */
  | "ok"
  /** Er hat die Zugangsdaten zurückgewiesen. Ein Befund. */
  | "abgelehnt"
  /** Kein Urteil möglich (Netz, Zeitüberschreitung, Namensauflösung). Kein Befund. */
  | "unerreichbar"
  /** Es gibt gar keine vollständigen Zugangsdaten — der Grund steht dann schon anderswo. */
  | "nicht-konfiguriert";

/**
 * Einen fehlgeschlagenen Anmeldeversuch einordnen.
 *
 * UNBEKANNTE FEHLER GELTEN ALS „UNERREICHBAR", nicht als „abgelehnt" — die
 * vorsichtige Richtung. Ein zurückgewiesenes Konto meldet der Mailserver
 * eindeutig (SMTP-Antwortcode 535, in der Mail-Bibliothek als `EAUTH`); alles
 * andere ist mit größerer Wahrscheinlichkeit die Leitung als das Passwort. Der
 * Preis dieser Wahl ist benannt: Ein Anbieter, der eine Ablehnung anders
 * verpackt, würde hier als „nicht nachgesehen" durchgehen — dann meldet die
 * Prüfung kein Ergebnis statt eines falschen.
 */
export function anmeldeBefundAus(fehler: unknown): "abgelehnt" | "unerreichbar" {
  const f = fehler as { code?: unknown; responseCode?: unknown } | null | undefined;
  if (f && typeof f.code === "string" && f.code.toUpperCase() === "EAUTH") return "abgelehnt";
  // 535 ist „Authentication credentials invalid"; 534/538 sind Varianten
  // desselben Falls (Mechanismus zu schwach, Verschlüsselung verlangt) und
  // bedeuten ebenfalls: so, wie es eingetragen ist, kommt niemand hinein.
  if (f && typeof f.responseCode === "number" && [534, 535, 538].includes(f.responseCode)) return "abgelehnt";
  return "unerreichbar";
}
