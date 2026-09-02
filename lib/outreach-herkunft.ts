/**
 * Woher kommt ein Besucher auf einer angeschriebenen Gemeindeseite?
 *
 * DAS IST DIE ANTWORT AUF „ein Aufruf ist kein Empfänger". Die verweisende
 * Adresse sagt, was passiert ist — und sie sagt es schärfer als jede
 * Backlink-Erhebung: Heringen kam über Facebook UND über die eigene
 * Gemeinde-Website, Aue-Bad Schlema über Facebook, Urmitz über LinkedIn. Die
 * Verweis-Suche kannte davon EINEN Fall, weil ein Beitrag in einem sozialen
 * Netz kein Backlink ist, den ein Verzeichnis crawlt.
 *
 * NICHT GERATEN: Eingeordnet wird nur, was hier beim Namen genannt ist. Alles
 * andere heißt „andere Seite" und will angesehen werden — eine unbekannte
 * Domain als Veröffentlichung zu zählen wäre dieselbe Erfindung wie ein
 * Prüfdatum ohne Prüfung.
 *
 * OHNE VERWEIS IST MEHRDEUTIG und wird deshalb nicht gedeutet: Darin stecken
 * der Klick in der Mail, der Aufruf aus einer App (die schickt bewusst keinen
 * Verweis — so kam Wallertheim) und der direkt eingetippte Aufruf. Wie viele
 * davon aus dem Brief kamen, sagen allein die Herkunfts-Ereignisse.
 */

export type Herkunft =
  /** Soziales Netz oder die eigene Website der Gemeinde: jemand hat es veröffentlicht. */
  | "veroeffentlichung"
  /** Aus einem Postfach heraus geklickt — also aus unserem Brief. */
  | "brief"
  /** Eine Maschine, die Links in eingehenden Mails abklopft. Kein Mensch. */
  | "pruefdienst"
  /** Suchmaschine oder KI-Antwort. */
  | "suche"
  /** Unsere eigene Auswertung. */
  | "intern"
  /** Steht auf einer fremden Seite — angesehen, nicht gezählt. */
  | "andere"
  /** Kein Verweis mitgeschickt: Mail, App oder direkt. Nicht deutbar. */
  | "ohne";

/** Soziale Netze samt ihrer Mobil- und Weiterleitungs-Hostnamen. */
const SOZIAL = [
  "facebook.com", "fb.com", "fb.me", "instagram.com", "linkedin.com", "lnkd.in",
  "x.com", "twitter.com", "t.co", "threads.net", "threads.com", "mastodon.social",
  "nebenan.de", "nextdoor.de", "whatsapp.com", "t.me", "youtube.com", "bsky.app",
];

/** Postfächer und Mail-Programme. Ein Klick von hier kam aus unserem Brief. */
const POSTFACH = [
  "com.google.android.gm", "mail.google.com", "gmail.com",
  "outlook.com", "outlook.live.com", "outlook.office.com", "outlook.office365.com",
  "email.t-online.de", "t-online.de", "web.de", "gmx.net", "gmx.de",
  "mail.yahoo.com", "mail.zoho.com", "roundcube.", "webmail.", "owa.",
];

/** Sicherheitsdienste, die Links in eingehenden Mails vorab öffnen. */
const PRUEFDIENST = [
  "trendmicro.com", "proofpoint.com", "urldefense.com", "mimecast.com",
  "barracudanetworks.com", "safelinks.protection.outlook.com", "clean.mail",
  "retarus.com", "hornetsecurity.com", "eset.com", "sophos.com",
];

/** Suchmaschinen und KI-Antwortdienste. */
const SUCHE = [
  "google.", "bing.com", "duckduckgo.com", "ecosia.org", "startpage.com",
  "search.brave.com", "yandex.", "chatgpt.com", "perplexity.ai", "claude.ai",
  "copilot.microsoft.com", "gemini.google.com",
];

/** Unsere eigenen Oberflächen. */
const INTERN = ["vercel.com", "solar-check.io"];

function trifft(host: string, liste: string[]): boolean {
  return liste.some((m) => (m.endsWith(".") || m.includes("/") ? host.includes(m) : host === m || host.endsWith(`.${m}`)));
}

/**
 * Ordnet eine verweisende Adresse ein.
 *
 * `gemeindeWebsite` ist die Adresse der Gemeinde aus unserer Erhebung — ein
 * Verweis von dort ist der stärkste Beleg einer Veröffentlichung, den es gibt.
 */
export function ordneHerkunft(verweis: string, gemeindeWebsite?: string | null): Herkunft {
  const host = verweis.trim().toLowerCase().replace(/^www\./, "");
  if (!host) return "ohne";
  if (trifft(host, PRUEFDIENST)) return "pruefdienst";
  if (trifft(host, INTERN)) return "intern";
  if (trifft(host, SOZIAL)) return "veroeffentlichung";
  if (trifft(host, POSTFACH)) return "brief";
  if (trifft(host, SUCHE)) return "suche";

  const eigene = gemeindeDomain(gemeindeWebsite);
  if (eigene && (host === eigene || host.endsWith(`.${eigene}`))) return "veroeffentlichung";
  return "andere";
}

/** Blanker Hostname aus einer gespeicherten Website-Adresse, ohne „www.". */
export function gemeindeDomain(website?: string | null): string | null {
  if (!website) return null;
  try {
    const u = new URL(website.includes("://") ? website : `https://${website}`);
    return u.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** Wortlaut für die Ausgabe — je Einordnung ein Satzteil, nie eine Abkürzung. */
export const HERKUNFT_TEXT: Record<Herkunft, string> = {
  veroeffentlichung: "veröffentlicht",
  brief: "aus dem Postfach",
  pruefdienst: "Mail-Prüfdienst",
  suche: "Suchmaschine",
  intern: "eigene Auswertung",
  andere: "andere Seite",
  ohne: "ohne Verweis",
};
