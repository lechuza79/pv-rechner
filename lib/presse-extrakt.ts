/**
 * Was aus der Website eines Mediums herauszulesen ist — die reine Logik.
 *
 * Kein Netzzugriff, keine Datenbank; `scripts/presse-refresh.ts` holt die Seiten
 * und schreibt das Ergebnis. Dieselbe Trennung wie bei den Fachbetrieben, aus
 * demselben Grund: Die Muster SIND die Datenqualität und müssen einzeln prüfbar
 * sein.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WARUM DIESE ERHEBUNG EINE HÖHERE TREFFERQUOTE HAT ALS DIE DREI VORIGEN
 *
 * Bei Gemeinden, Versorgern und Fachbetrieben ist der Ansprechpartner eine
 * Fundsache: Er steht irgendwo oder nirgends. Bei einem journalistisch-
 * redaktionellen Angebot ist er GESETZLICH VERLANGT — § 18 Abs. 2 MStV
 * („Verantwortlicher") nennt eine natürliche Person mit Namen und Anschrift,
 * zusätzlich zu § 5 DDG. Das ist der Anker dieser Erhebung: nicht die
 * persönliche Mailadresse (die fehlt oft), sondern die Funktionsbezeichnung, die
 * das Recht erzwingt.
 *
 * DARAUS FOLGT DIE ZWEITE ANKERART. `personenAus` (geteilt mit der
 * Versorger-Erhebung) findet Menschen über ihre PERSÖNLICHE Adresse. Auf
 * Redaktionsseiten steht der Mensch aber oft mit Namen und Funktion da, während
 * als Kontakt nur `redaktion@` angeboten wird. Beide Anker laufen deshalb
 * nebeneinander; welcher gegriffen hat, steht am Fund (`anker`).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WAS HIER NICHT PASSIERT
 *
 * - KEINE geratenen Adressen. Kein `vorname.nachname@domain` aus einem Namen.
 *   Eine Adresse entsteht nur, wenn sie im ausgelieferten Text steht.
 * - KEINE Reichweite ohne Beschriftung. Eine Zahl auf einer Mediadaten-Seite
 *   ist nur dann eine Auflage, wenn das Wort danebensteht.
 * - KEINE Anzeigenkontakte, solange ein redaktioneller Weg da ist.
 */

import { entities, sichtbarerText, hostVon } from "./fachbetrieb-extrakt";
import { entwirreAdressen, istPersonenAdresse, istPlausiblerName } from "./personen-fund";

// ─── Seiten, die ein Medium führt ────────────────────────────────────────────

/**
 * Welche Unterseiten die Kontakte tragen — nach Punkten, nicht geraten.
 *
 * Die Reihenfolge ist gemessen an der Bauart redaktioneller Angebote: Das
 * Impressum trägt den Verantwortlichen nach § 18 Abs. 2 MStV (Pflicht), die
 * Redaktions-/Teamseite die einzelnen Ressorts (freiwillig, aber der eigentliche
 * Ertrag), die Kontaktseite den Weg dorthin.
 */
export const SEITENARTEN = [
  {
    art: "impressum",
    muster: /impressum|imprint|anbieterkennzeichnung/,
    // Das Impressum ist die einzige Seite, die es per Gesetz geben MUSS.
    pflicht: true,
  },
  {
    art: "redaktion",
    muster: /redaktion|editorial-?team|unsere-?redaktion|wer-wir-sind/,
    pflicht: false,
  },
  {
    art: "team",
    muster: /\bteam\b|ansprechpartner|mitarbeiter|autor(?:en|innen)?|kolleg/,
    pflicht: false,
  },
  {
    art: "ueber-uns",
    muster: /ueber-uns|über-uns|about|wir-ueber-uns|portrait|profil/,
    pflicht: false,
  },
  {
    art: "kontakt",
    muster: /kontakt|contact/,
    pflicht: false,
  },
  {
    art: "mediadaten",
    // Mediadaten sind die einzige Stelle, an der eine Reichweite BESCHRIFTET
    // steht. Sie werden gelesen, aber ihre Anzeigenkontakte nicht übernommen.
    muster: /mediadaten|mediakit|media-?daten|werben|anzeigen|preisliste/,
    pflicht: false,
  },
] as const;

export type Seitenart = (typeof SEITENARTEN)[number]["art"];

/**
 * Die Unterseiten eines Mediums, je Art höchstens eine.
 *
 * Wie bei den Fachbetrieben gilt: NICHT raten. `/impressum` traf dort in zwei
 * von drei Fällen daneben; bei Verlagen ist es noch bunter (`/impressum-2`,
 * `/service/impressum`, `/rechtliches/impressum.html`). Gelesen wird, was
 * verlinkt ist.
 */
export function redaktionsSeiten(html: string, basis: string): Partial<Record<Seitenart, string>> {
  const beste = new Map<Seitenart, { url: string; punkte: number }>();
  const basisHost = hostVon(basis) ?? "";
  const re = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const href = entities(m[1]);
    if (/^(mailto:|tel:|javascript:|#)/i.test(href)) continue;
    const text = entities(m[2].replace(/<[^>]+>/g, " "))
      .trim()
      .toLowerCase();
    // Ein Menü mit hundert Ressorts erzeugt sonst hundert Fehltreffer: Nur
    // kurze Linktexte sind Navigationsbeschriftungen, lange sind Artikeltitel.
    if (text.length > 40) continue;
    let abs: string;
    try {
      abs = new URL(href, basis).toString();
    } catch {
      continue;
    }
    // Eine fremde Domain ist hier fast immer der Verlag eines Portals oder ein
    // Formulardienst. Nicht verwerfen (Verlagsimpressen sind echt), aber
    // abwerten, damit die eigene Seite gewinnt.
    const host = hostVon(abs) ?? "";
    const fremd = host !== basisHost;
    const pfad = abs.slice(abs.indexOf(host) + host.length).toLowerCase();

    for (const s of SEITENARTEN) {
      let p = 0;
      if (s.muster.test(pfad)) p = 100;
      else if (s.muster.test(text)) p = 80;
      if (!p) continue;
      if (fremd) p -= 40;
      const vorher = beste.get(s.art);
      if (!vorher || p > vorher.punkte) beste.set(s.art, { url: abs, punkte: p });
    }
  }
  const out: Partial<Record<Seitenart, string>> = {};
  for (const [art, v] of beste) if (v.punkte >= 40) out[art] = v.url;
  return out;
}

/**
 * Übliche Adressen für Impressum, Redaktion und Kontakt — NUR als Rückfallebene.
 *
 * Bei den Fachbetrieben ist festgehalten, dass `/impressum` in zwei von drei
 * Fällen danebentraf; das galt dem Raten ANSTELLE des Linklesens. Als Rückfall
 * DANACH ist es etwas anderes, und es hat eine Bedingung: Was dabei herauskommt,
 * wird am Inhalt geprüft (`siehtNachImpressumAus`). Eine beliebige Seite, die
 * unter `/impressum` antwortet, wird nicht übernommen, nur weil sie 200 liefert
 * — sonst landet eine 404-Seite mit Menü als „Impressum" im Katalog.
 */
export const PFAD_RUECKFALL: Record<string, string[]> = {
  impressum: ["/impressum", "/impressum/", "/impressum.html", "/de/impressum", "/service/impressum", "/rechtliches/impressum", "/ueber-uns/impressum", "/imprint"],
  redaktion: ["/redaktion", "/redaktion/", "/ueber-uns/redaktion", "/unsere-redaktion", "/autoren"],
  team: ["/team", "/team/", "/ueber-uns/team", "/ansprechpartner"],
  kontakt: ["/kontakt", "/kontakt/", "/contact"],
};

/**
 * Trägt diese Seite wirklich Impressumsangaben?
 *
 * Zwei Fliegen: Sie weist eine falsch geratene Adresse ab UND erkennt den Fall,
 * dass ein Verlag seine Seite erst per Skript aufbaut. Gemessen am 03.09.2026 an
 * ew-magazin.de und energie-und-management.de: Beide liefern 51 bzw. 134 kB
 * HTML mit vollständigem Menü — und darin kein „Verantwortlich", kein „@" und
 * keine Anschrift. Ohne diese Prüfung sähe der Lauf aus, als habe er das
 * Impressum gelesen und nichts gefunden; in Wahrheit hat er es nie gesehen.
 */
export function siehtNachImpressumAus(text: string): boolean {
  const treffer = [
    /verantwortlich/i,
    /vertreten\s+durch/i,
    /ust[.\s-]*id|umsatzsteuer-?identifikations/i,
    /registergericht|handelsregister|\bHRB\b/i,
    /\b\d{5}\s+[A-ZÄÖÜ][\p{L}-]+/u,
    /@[\w-]+\.[a-z]{2,}/i,
  ].filter((m) => m.test(text)).length;
  return treffer >= 2;
}

// ─── Verschleierte Adressen entschlüsseln ────────────────────────────────────

/**
 * Cloudflares Adress-Verschleierung rückgängig machen — GRÖSSTER EINZELHEBEL
 * dieser Erhebung.
 *
 * Gemessen bei der Eichung am 03.09.2026 an pv-magazine.de: Die Teamseite trägt
 * 27 Redakteurinnen und Redakteure mit Adresse — im ausgelieferten HTML steht an
 * jeder Stelle `[email protected]`, die echte Adresse liegt hexcodiert im
 * Attribut `data-cfemail`. Ohne diesen Schritt findet die Erhebung dort **null**
 * Adressen und hält die Seite für eine ohne Kontaktweg.
 *
 * DAS IST KEIN UMGEHEN EINER SCHUTZMASSNAHME und kein Raten: Die Adresse ist
 * veröffentlicht, jeder Browser zeigt sie ohne Zutun an; verschleiert wird sie
 * gegen Sammler, die kein JavaScript ausführen. Wir setzen sie in denselben
 * Klartext zurück, den ein Mensch auf der Seite sieht — und führen als Quelle
 * genau diese Seite. Was wir NICHT tun: eine Adresse erfinden, die dort nicht
 * steht.
 *
 * Das Verfahren ist eine XOR-Verknüpfung mit dem ersten Byte, mehr nicht.
 */
export function cfAdresseKlartext(hex: string): string | null {
  if (!/^[0-9a-f]{6,}$/i.test(hex) || hex.length % 2 !== 0) return null;
  const schluessel = parseInt(hex.slice(0, 2), 16);
  let out = "";
  for (let i = 2; i < hex.length; i += 2) {
    out += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16) ^ schluessel);
  }
  return /^[\w.+-]+@[\w-]+(?:\.[\w-]+)+$/.test(out) ? out.toLowerCase() : null;
}

/**
 * Alle verschleierten Adressen einer Seite in den Klartext zurücksetzen.
 *
 * Läuft VOR jeder Textextraktion, damit Rollen-, Personen- und Postfachsuche
 * dieselbe Seite sehen wie ein Mensch. Zwei Bauarten sind abgedeckt: das
 * Anker-Element mit `data-cfemail` und der Verweis auf `/cdn-cgi/l/email-protection#<hex>`.
 */
export function ohneAdressVerschleierung(html: string): string {
  // Das verschleierte Element ist NICHT immer ein Verweis: Cloudflare setzt je
  // nach Einbau `<a class="__cf_email__">` oder `<span class="__cf_email__">`.
  // Die erste Fassung fasste nur den Verweis an — auf der Teamseite von pv
  // magazine blieben dadurch alle 27 Adressen verloren, während der Lauf
  // trotzdem 27 Personen meldete. Ein Fund ohne Kontaktweg sieht wie Arbeit aus.
  let s = html.replace(
    /<(\w+)\b[^>]*?data-cfemail=["']([0-9a-f]+)["'][^>]*>[\s\S]{0,200}?<\/\1>/gi,
    (ganz, _tag: string, hex: string) => {
      const klar = cfAdresseKlartext(hex);
      return klar ? ` <a href="mailto:${klar}">${klar}</a> ` : ganz;
    },
  );
  // Ohne schließendes Element (kommt bei fehlerhaftem HTML vor).
  s = s.replace(/<\w+\b[^>]*?data-cfemail=["']([0-9a-f]+)["'][^>]*>/gi, (ganz, hex: string) => {
    const klar = cfAdresseKlartext(hex);
    return klar ? ` <a href="mailto:${klar}">${klar}</a> ` : ganz;
  });
  // Der Verweis auf Cloudflares Entschlüsselungsseite trägt denselben Hexwert.
  s = s.replace(
    /<a\b[^>]*href=["'][^"']*\/cdn-cgi\/l\/email-protection#([0-9a-f]+)["'][^>]*>[\s\S]{0,200}?<\/a>/gi,
    (ganz, hex: string) => {
      const klar = cfAdresseKlartext(hex);
      return klar ? ` <a href="mailto:${klar}">${klar}</a> ` : ganz;
    },
  );
  // Übrig gebliebene Platzhalter entfernen — sie würden im Text als „E-Mail"
  // durchgehen, ohne eine zu sein.
  s = s.replace(/\[email(?:&#160;|&nbsp;|\s)*protected\]/gi, " ");
  return s;
}

// ─── Der Verantwortliche nach § 18 Abs. 2 MStV und die Redaktionsspitze ──────

/**
 * Was VOR einer Funktionsbezeichnung stehen darf, ohne dass es Teil des Namens
 * wird.
 *
 * Gemessen: Ohne diese Liste wurde aus „Lior Kahana / Junior Editor" der Name
 * „Lior Kahana Junior", und aus „Head of Editorial" blieb nur „Editorial" als
 * Funktion übrig. Beides ist von außen unsichtbar — es sieht nach einem Namen
 * und nach einer Funktion aus, nur eben nach der falschen.
 */
const ROLLE_MOD =
  "(?:stellv\\.?|stellvertretende[rn]?|leitende[rn]?|geschäftsführende[rn]?|senior|junior|deputy|managing|executive|features?|news|chief|head\\s+of|leiter(?:in)?\\s+(?:der|des)|verantwortliche[rn]?)\\s+";

/**
 * Was HINTER einer Funktionsbezeichnung noch dazugehört: das Ressort oder das
 * Land.
 *
 * Der Grund ist keine Kosmetik: „Editor, France" und „News Director, Germany"
 * sind für einen deutschen Presseverteiler zwei völlig verschiedene Adressaten,
 * und ohne den Zusatz sind sie nicht zu unterscheiden. Bei pv magazine standen
 * 27 Redakteurinnen und Redakteure aus einem Dutzend Ländern auf EINER Seite.
 */
const ROLLE_QUAL = "(?:\\s*[,–—-]\\s*[A-ZÄÖÜ][\\p{L}]+(?:\\s+[A-ZÄÖÜ][\\p{L}]+){0,2})?";

/** Länder, deren Redaktion NICHT über Deutschland berichtet. Ein Treffer senkt
 *  den Rang deutlich, statt den Eintrag zu verwerfen — die Person ist echt, sie
 *  ist nur die falsche für diesen Verteiler. */
const FREMDES_LAND =
  /\b(?:France|Australia|Brasil|Brazil|Italia|Italy|España|Spain|India|China|Japan|Mexico|Chile|Argentina|USA|U\.S\.|America|UK|Ireland|Poland|Polska|Nederland|Netherlands|Türkiye|Turkey|Frankreich|Australien|Brasilien|Italien|Spanien|Indien|Polen|Niederlande|Türkei)\b/i;

/** Wortlaut → Rang. Bewusst NACH dem Treffer ausgewertet und nicht als
 *  Musterliste: Ein Rollenname setzt sich aus Vorsatz, Kern und Zusatz zusammen,
 *  und der Rang hängt am ganzen Satz, nicht am Kern allein. */
export function rangFuerFunktion(roh: string): number {
  const s = roh.toLowerCase();
  let rang: number;
  if (/chefredakt|editor[\s-]?in[\s-]?chief/.test(s)) rang = 100;
  else if (/redaktionsleit|head\s+of\s+editorial|managing\s+editor|news\s+director|leiter(?:in)?\s+der\s+redaktion/.test(s)) rang = 95;
  else if (/ressortleit|stellv|deputy|senior\s+editor|head\s+of/.test(s)) rang = 85;
  else if (/v\.?\s?i\.?\s?s\.?\s?d\.?\s?p|im\s+sinne|i\.?\s?s\.?\s?d\.?|§\s?18|§\s?55/.test(s)) rang = 90;
  else if (/redakteur|redaktion|editor|autor|journalist|korrespondent|reporter/.test(s)) rang = 80;
  else if (/pressesprecher|pressestelle|pressekontakt|pressereferent|kommunikation/.test(s)) rang = 70;
  else if (/herausgeber|publisher/.test(s)) rang = 60;
  else if (/geschäftsführ|vorstand|inhaber|verlagsleit/.test(s)) rang = 20;
  else rang = 50;
  // Eine Auslandsredaktion ist für einen deutschen Verteiler der falsche
  // Adressat — erfasst wird sie trotzdem, sie steht nur hinten.
  if (FREMDES_LAND.test(roh)) rang = Math.max(5, rang - 45);
  return rang;
}

/**
 * Die Funktionsbezeichnungen, an denen ein Name hängt.
 *
 * Jeder Kern wird beim Suchen um Vorsatz und Zusatz erweitert (siehe
 * ROLLE_MOD / ROLLE_QUAL), damit „Head of Editorial" und „Editor, Germany"
 * vollständig als Funktion erkannt werden statt als „Editorial" bzw. „Editor".
 */
export const FUNKTIONS_KERNE: string[] = [
  // Der gesetzliche Anker (§ 18 Abs. 2 MStV, früher § 55 RStV).
  "verantwortlich(?:e[rn]?)?\\s+(?:redakteur(?:in)?\\s+)?(?:im\\s+sinne|i\\.?\\s?s\\.?\\s?d\\.?|gem(?:äß|\\.)|nach)\\s*§?\\s*(?:18|55|21)[^:.]{0,40}",
  "v\\.?\\s?i\\.?\\s?s\\.?\\s?d\\.?\\s?p\\.?",
  "chefredakt(?:eur|eurin|ion|orin)(?:in)?",
  "editor[\\s-]?in[\\s-]?chief",
  "redaktionsleit(?:er|erin|ung)",
  "ressortleit(?:er|erin|ung)",
  "redakteur(?:in|e|innen)?",
  "redaktion(?!s(?:schluss|adresse|anschrift|büro\\s+der))",
  "editor(?:ial)?(?:\\s+director)?",
  "director(?:\\s+of\\s+[A-Za-zÄÖÜäöü]+)?",
  "korrespondent(?:in)?",
  "reporter(?:in)?",
  "fachjournalist(?:in)?",
  "autor(?:in)?",
  "pressesprecher(?:in)?",
  "pressestelle",
  "presse(?:kontakt|referent(?:in)?)",
  "leiter(?:in)?\\s+(?:unternehmens)?kommunikation",
  "herausgeber(?:in)?",
  "publisher",
  "geschäftsführ(?:er|erin|ung)",
  "verlagsleit(?:er|erin|ung)",
];

/** Rechtsform- und Sammelwörter — was sie enthält, ist eine FIRMA oder eine
 *  Abteilung, kein Mensch. „Verantwortlich für den Inhalt: Muster Verlag GmbH"
 *  ist der häufigste Fehlgriff dieser Bauart. */
const FIRMA =
  /\b(?:gmbh|mbh|\bag\b|kg|ohg|gbr|e\.?\s?v\.?|ug|se|verlag|verlage|redaktion|gruppe|media|medien|holding|stiftung|gesellschaft|institut|agentur|gmbh & co)\b/i;

export interface Rolle {
  name: string;
  /** Die Funktionsbezeichnung, WÖRTLICH wie sie auf der Seite steht — samt
   *  Vorsatz und Land-/Ressortzusatz. */
  funktion: string;
  /** Eingeordneter Rang. Steuert die Auswahl, nicht die Anzeige. */
  rang: number;
  /** Die Textstelle als Beleg. Ohne sie ist der Fund nicht nachprüfbar. */
  fundstelle: string;
  /** Persönliche Adresse, falls unmittelbar dabei. Nie abgeleitet. */
  mail: string | null;
}

const ROLLEN_MUSTER = new RegExp(
  `(?:${ROLLE_MOD})?(?:${FUNKTIONS_KERNE.join("|")})${ROLLE_QUAL}`,
  "giu",
);

/**
 * Menschen mit Funktion aus einer Seite — Anker ist die FUNKTIONSBEZEICHNUNG.
 *
 * Der Gegenentwurf zu `personenAus`, das über die persönliche Adresse geht.
 * Beide braucht es: Ein Impressum nennt den Verantwortlichen fast nie mit
 * eigener Adresse (dort steht `redaktion@`), eine Teamseite dagegen oft.
 */
export function rollenAus(html: string): Rolle[] {
  const text = entwirreAdressen(sichtbarerText(ohneAdressVerschleierung(html)));
  const zeilen = text.split("\n");
  const gefunden = new Map<string, Rolle>();

  for (let i = 0; i < zeilen.length; i++) {
    const zeile = zeilen[i];
    if (!zeile || zeile.length > 300) continue;
    ROLLEN_MUSTER.lastIndex = 0;
    // ALLE Treffer der Zeile, nicht nur den ersten: „Chefredaktion (V.i.S.d.P.):
    // Klaus Hinkel, Redaktion: …" trägt zwei, und der zweite ist bei Impressen
    // regelmäßig der mit dem Namen daran.
    for (let m = ROLLEN_MUSTER.exec(zeile); m; m = ROLLEN_MUSTER.exec(zeile)) {
    // Ein generischer Zusatz („Redakteurin – Home") sagt nichts und sieht im
    // Katalog nach einem Ressort aus, das es nicht gibt.
    const treffer = m[0]
      .replace(/\s+/g, " ")
      .replace(/\s+([,–—-])/g, "$1")
      .replace(/[,–—-]\s*(?:Home|Start|Startseite|Übersicht|Alle|Mehr|News)\s*$/i, "")
      .trim();
    const davor = zeile.slice(0, m.index);
    const dahinter = zeile.slice(m.index + m[0].length);

    // Drei Bauarten, alle drei am echten Bestand gemessen:
    //   „Chefredakteur: Max Mustermann"   → Name hinter der Funktion
    //   „Max Mustermann, Chefredakteur"   → Name vor der Funktion
    //   „Max Mustermann\nNews Director"   → Name auf der Zeile DAVOR
    // Die dritte ist auf Teamseiten der Regelfall und war der Grund, warum die
    // erste Fassung Namen und Funktionen quer über Einträge hinweg vermischte:
    // Sie suchte in einem Zeichenfenster, und `\s` überspringt Zeilenumbrüche.
    let name = nameNachFunktion(dahinter) ?? nameVorFunktion(davor);
    let quellZeile = i;
    if (!name && restIstLeer(davor) && restIstLeer(dahinter)) {
      for (let k = i - 1; k >= 0 && k >= i - 3; k--) {
        if (!zeilen[k].trim()) continue;
        name = nameVorFunktion(zeilen[k]);
        quellZeile = k;
        break;
      }
    }
    if (!name) continue;

    const rang = rangFuerFunktion(treffer);
    const umfeld = zeilen
      .slice(Math.max(0, quellZeile - 1), i + 3)
      .join(" · ")
      .replace(/\s+/g, " ")
      .trim();
    // Die Adresse steht auf derselben oder einer der nächsten zwei Zeilen —
    // nie weiter weg, sonst gehört sie schon zum nächsten Eintrag.
    const mail = mailImUmfeld(zeilen.slice(i, i + 3).join(" "), name);

    const schluessel = name.toLowerCase();
    const vorher = gefunden.get(schluessel);
    if (vorher && vorher.rang >= rang) {
      if (!vorher.mail && mail) vorher.mail = mail;
      continue;
    }
    gefunden.set(schluessel, {
      name,
      funktion: treffer,
      rang,
      fundstelle: umfeld.slice(0, 300),
      mail: mail ?? vorher?.mail ?? null,
    });
    }
  }
  return [...gefunden.values()].sort((a, b) => b.rang - a.rang);
}

/** Trägt der Rest der Zeile noch etwas? Satzzeichen und Klammern zählen nicht —
 *  „(Redaktionsleitung)" ist eine Zeile, die nur die Funktion trägt. */
function restIstLeer(s: string): boolean {
  return s.replace(/[\s:;,.–—()\[\]|·-]/g, "").length === 0;
}

/** Der Name unmittelbar hinter der Funktionsbezeichnung.
 *  Trennzeichen dürfen davor stehen, Fließtext nicht — „Verantwortlich ist die
 *  Redaktion, die sich um …" darf keinen Namen ergeben. */
function nameNachFunktion(s: string): string | null {
  // Ein Klammerzusatz steht zwischen Funktion und Name („Chefredaktion
  // (V.i.S.d.P.): Klaus Hinkel") und darf den Namen nicht verdecken.
  const bereinigt = s
    .replace(/^[^\S\n]*\([^)\n]{0,40}\)/, "")
    .replace(/^[^\S\n]*[:;,–—\-·|>]*[^\S\n]*/, "");
  const m = bereinigt.match(
    /^((?:(?:Dr|Prof|Dipl)\.?(?:-Ing\.?)?[^\S\n]+){0,2}(?:[A-ZÄÖÜ][\p{L}'’-]+[^\S\n]+){1,3}[A-ZÄÖÜ][\p{L}'’-]+)/u,
  );
  if (!m) return null;
  return pruefeName(m[1]);
}

/** Der Name unmittelbar VOR der Funktionsbezeichnung (Teamseiten-Aufbau). */
function nameVorFunktion(s: string): string | null {
  const bereinigt = s.replace(/[^\S\n]*[:;,–—\-·|<]*[^\S\n]*$/, "");
  const m = bereinigt.match(
    /((?:(?:Dr|Prof|Dipl)\.?(?:-Ing\.?)?[^\S\n]+){0,2}(?:[A-ZÄÖÜ][\p{L}'’-]+[^\S\n]+){1,3}[A-ZÄÖÜ][\p{L}'’-]+)$/u,
  );
  if (!m) return null;
  return pruefeName(m[1]);
}

/**
 * Wörter, die in keinem Namen vorkommen — Menüpunkte und Rollenbezeichnungen.
 *
 * BEIDE Klassen sind gemessen, nicht ausgedacht: „Magazine Netiquette Impressum"
 * (energiezukunft.eu) ist ein Menü, „Chief Content Officer" (ikz.de) eine
 * Funktion — beide bestehen aus großgeschriebenen Wörtern und kamen deshalb als
 * Name durch. Ein falscher Name im Katalog ist teurer als ein fehlender: Er geht
 * in eine Anrede.
 */
const KEIN_NAMENSWORT =
  /\b(?:Impressum|Imprint|Netiquette|Datenschutz|Kontakt|Newsletter|Magazine?|Magazin|Startseite|Home|Übersicht|Aktuelles|Nachrichten|Archiv|Mediadaten|Anzeigen|Abo|Suche|Menü|Login|Anmelden|Registrieren|Cookies|Redaktion|Chefredaktion|Verlag|Team|Officer|Director|Manager|Managerin|Leitung|Leiter|Leiterin|Editor|Editorial|Content|Chief|Head|Senior|Junior|Reporter|Autor|Autorin|Volontär|Volontärin|Praktikant|Praktikantin|Sekretariat|Assistenz|Vertrieb|Marketing|Anzeigenleitung|Lead|Brand|Publishing|Sales|Business|Digital|Product|Chef|Chefin|Webseite|Website|Themen|Service|Verband|Presse|Kommunikation|Ansprechpartner|Geschäftsführer|Geschäftsführung|Vorstand|Vorstandsmitglied|Mitglied|Rolle|Development|Recherche|Akademie|Herausgeber|Ministerpräsident|Minister|Ministerin|Bundeskanzler|Kanzler|Bürgermeister|Bürgermeisterin|Landrat|Professor|Professorin|Sprecher|Sprecherin|Link|Profil|Monat|Woche|Ausgabe|Seite|Beitrag|Artikel|Podcast|Spende|Spenden|Mehr|Alle|Folgen|Abonnieren|Teilen|Drucken|Kultur|Sport|Lokales|Lokalredaktion|Politik|Wirtschaft|Panorama|Feuilleton|Ressort|Lokalsport|Nachrichtenredaktion|Onlineredaktion|Zentralredaktion)\b/i;

function pruefeName(roh: string): string | null {
  const name = roh.replace(/\s+/g, " ").trim();
  if (FIRMA.test(name)) return null;
  if (KEIN_NAMENSWORT.test(name)) return null;
  // Grade abziehen, bevor die Wortzahl geprüft wird: „Dr. Max Mustermann" sind
  // drei Wörter, aber zwei Namensteile.
  const ohneGrade = name.replace(/\b(?:Dr|Prof|Dipl)\.?(?:-Ing\.?)?\s+/g, "");
  if (!istPlausiblerName(ohneGrade)) return null;
  const artikel = /^(?:Der|Die|Das|Ein|Eine|Diese|Unser|Unsere|Alle|Für|Bei|Mit|Von|Im|Am|Zum|Und|Oder|Als|Nach|Zur|Sie|Wir|Ihre?)$/;
  const woerter = ohneGrade.split(/\s+/);
  // Ein Artikel am ANFANG oder am ENDE ist ein Satzrest, kein Name. GEMESSEN
  // auf finanztip.de: „Redaktionskodex Der" stand als Person im Katalog — der
  // Anfangs-Test allein hat das nicht gefangen.
  if (artikel.test(woerter[0]) || artikel.test(woerter[woerter.length - 1])) return null;
  // Ein Kürzel in Großbuchstaben ist ein Titelkopf, kein Nachname. GEMESSEN auf
  // haustec.de: „SBZ Monteur" (der Name einer Schwesterzeitschrift) stand als
  // Chefredakteur im Katalog.
  if (woerter.some((w) => /^[A-ZÄÖÜ]{2,4}$/.test(w))) return null;
  return name;
}

/** Eine Adresse im unmittelbaren Umfeld — nur übernommen, wenn ihr vorderer
 *  Teil zum Namen passt. Eine `redaktion@` neben einem Namen gehört NICHT der
 *  Person; sie als persönliche Adresse zu führen wäre eine erfundene Zuordnung. */
function mailImUmfeld(s: string, name: string): string | null {
  const m = s.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/);
  if (!m) return null;
  const lokal = m[0].split("@")[0].toLowerCase();
  const teile = name
    .toLowerCase()
    .replace(/\b(?:dr|prof|dipl)\.?(?:-ing\.?)?\s+/g, "")
    .split(/\s+/)
    .map((t) => t.replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss"));
  const nachname = teile[teile.length - 1];
  if (nachname.length >= 3 && lokal.includes(nachname)) return m[0].toLowerCase();
  // Auch die verbreitete Kurzform: erster Buchstabe des Vornamens + Nachname.
  const vorname = teile[0];
  if (vorname && nachname.length >= 3 && lokal.includes(vorname[0] + nachname)) {
    return m[0].toLowerCase();
  }
  return null;
}

// ─── Postfächer ──────────────────────────────────────────────────────────────

/**
 * Redaktionelle Postfächer — nach Eignung sortiert.
 *
 * Anzeigen- und Vertriebspostfächer stehen mit Absicht auf einer eigenen Liste
 * und werden nur als LETZTES genommen (Vorgabe: keine Werbekontakte erfassen,
 * sofern ein redaktioneller Weg da ist).
 */
export const POSTFACH_RANG: { rang: number; muster: RegExp }[] = [
  { rang: 100, muster: /^redaktion@|^editor(?:ial)?@|^newsroom@|^news@/i },
  { rang: 90, muster: /^presse@|^press@|^pressestelle@|^kommunikation@/i },
  { rang: 70, muster: /^kontakt@|^info@|^mail@|^office@|^hallo@|^team@/i },
  { rang: 40, muster: /^leserbriefe?@|^feedback@|^service@/i },
  // Bewusst niedrig: das ist ein Werbekontakt.
  { rang: 10, muster: /^anzeigen@|^media@|^werbung@|^sales@|^vertrieb@|^abo@|^marketing@|^affiliate@|^partner@|^kooperation|^werben@|^sponsoring@|^sponsor/i },
];

/** Adressen, die nie ein redaktioneller Kontakt sind. */
const MAIL_UNBRAUCHBAR =
  /^(?:datenschutz\w*|dsb|privacy|webmaster|admin|hostmaster|postmaster|noreply|no-reply|bewerbung|jobs|karriere|buchhaltung|rechnung|abuse|support@wordpress|example|name|vorname|ihre?)@|@(?:example\.|domain\.|ihredomain|musterfirma|sentry\.io|wixpress|w3\.org)/i;

export interface Postfach {
  mail: string;
  rang: number;
  /** Ist das ein Werbe-/Vertriebskontakt? Dann nur als Notnagel. */
  werblich: boolean;
  /**
   * Sieht die Adresse nach einer PERSON aus, obwohl kein Name daneben stand?
   *
   * GEMESSEN: `emiliano.bellini@pv-magazine.com` stand im Katalog als
   * „Redaktion (Postfach)". Das ist die Fehlerklasse „Beschriftung sagt etwas
   * anderes, als der Wert daneben ist" — der Empfänger ist ein Mensch, und wer
   * ihn wie ein Postfach anschreibt, merkt es erst an der Antwort.
   */
  persoenlich: boolean;
}

/** Alle brauchbaren Postfächer einer Seite, bestes zuerst. */
export function postfaecherAus(html: string, domain: string): Postfach[] {
  const klar = ohneAdressVerschleierung(html);
  const text = entwirreAdressen(sichtbarerText(klar) + " " + mailtoLinks(klar).join(" "));
  const out = new Map<string, Postfach>();
  for (const m of Array.from(text.matchAll(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g))) {
    const mail = m[0].toLowerCase().replace(/\.$/, "");
    if (MAIL_UNBRAUCHBAR.test(mail)) continue;
    // Eine Adresse auf fremder Domain ist der Dienstleister, nicht die
    // Redaktion — dieselbe Regel wie bei Gemeinden und Fachbetrieben, wo sie
    // zwei Agenturadressen abgefangen hat. Verlags-Dachdomains sind erlaubt,
    // wenn der Kern übereinstimmt (`redaktion@verlag.de` bei `magazin.de` nicht).
    const mailHost = mail.split("@")[1];
    if (!mailHost.endsWith(domain) && !domain.endsWith(mailHost)) continue;
    const treffer = POSTFACH_RANG.find((r) => r.muster.test(mail));
    const rang = treffer?.rang ?? 50;
    const werblich = (treffer?.rang ?? 50) <= 10;
    const vorher = out.get(mail);
    if (!vorher || vorher.rang < rang) {
      out.set(mail, { mail, rang, werblich, persoenlich: istPersonenAdresse(mail) });
    }
  }
  return [...out.values()].sort((a, b) => b.rang - a.rang);
}

function mailtoLinks(html: string): string[] {
  return Array.from(html.matchAll(/href=["']mailto:([^"'?]+)/gi)).map((m) => entities(m[1]));
}

/** Ein Kontaktformular als Weg, wenn keine Adresse dasteht.
 *  Erkannt am Formular selbst, nicht am Link — ein Link namens „Kontakt" führt
 *  genauso oft auf eine Seite mit bloßer Anschrift. */
export function hatKontaktformular(html: string): boolean {
  if (!/<form\b/i.test(html)) return false;
  return /<input[^>]+type=["']?email|<textarea|name=["']?(?:nachricht|message|betreff|anliegen)/i.test(
    html,
  );
}

// ─── Was für ein Medium ist das? ─────────────────────────────────────────────

/**
 * Medientyp aus MESSBAREN Merkmalen.
 *
 * Bewusst mehrere Treffer erlaubt: Ein Fachmagazin mit Podcast und Newsletter
 * ist alles drei, und genau das entscheidet, was man ihm anbietet. Ein einziger
 * Typ wäre eine Vereinfachung, die man später nicht mehr auflösen kann.
 */
export const MEDIENTYP: { name: string; muster: RegExp }[] = [
  { name: "Print", muster: /\b(?:printausgabe|heftausgabe|abonnement|einzelheft|jahresabo|auflage|erscheinungsweise|zeitschrift|magazin)\b/i },
  { name: "Online", muster: /\b(?:online-?magazin|nachrichtenportal|onlineausgabe|website|portal)\b/i },
  { name: "Newsletter", muster: /\bnewsletter\b/i },
  { name: "Podcast", muster: /\bpodcast\b|spotify\.com\/show|podcasts\.apple\.com/i },
  { name: "Video", muster: /youtube\.com\/(?:channel|c\/|@)|\bvideoformat\b|\bwebtv\b/i },
  { name: "Fachdienst", muster: /\b(?:fachdienst|branchendienst|informationsdienst|briefing)\b/i },
  { name: "Verband", muster: /\b(?:verband|bundesverband|e\.\s?V\.|interessenvertretung|mitgliederzeitschrift)\b/i },
];

export function medientypAus(text: string): string[] {
  return MEDIENTYP.filter((t) => t.muster.test(text)).map((t) => t.name);
}

/**
 * Thematische Passung — der eigentliche Bewertungsmaßstab.
 *
 * Vorgabe: „Bewerte nach thematischer Passung, nicht nur nach vermuteter
 * Reichweite." Deshalb wird gezählt, wie oft die Themen dieses Projekts auf der
 * Startseite vorkommen — auf der STARTSEITE, weil dort steht, worüber das Medium
 * gerade schreibt, nicht worüber es einmal geschrieben hat.
 *
 * Die Zuordnung zu Solar-Check-Geschichten hängt an genau diesen Themen. Sie ist
 * damit abgeleitet, nicht getippt: Wer die Muster ändert, ändert beide.
 */
export const THEMEN: { name: string; geschichte: string; muster: RegExp }[] = [
  {
    name: "photovoltaik",
    geschichte: "Solarzubau und Rankings",
    muster: /\b(?:photovoltaik|solaranlage|solarstrom|solarenergie|pv-anlage|solarpark|solarausbau)\b/gi,
  },
  {
    name: "balkonkraftwerk",
    geschichte: "Balkonkraftwerke",
    muster: /\b(?:balkonkraftwerk|steckersolar|balkon-?pv|mini-?pv|steckerfertige?)\b/gi,
  },
  {
    name: "speicher",
    geschichte: "Speicher",
    muster: /\b(?:stromspeicher|batteriespeicher|heimspeicher|speicherkapazität|hausspeicher)\b/gi,
  },
  {
    name: "foerderung",
    geschichte: "Kommunale Förderung",
    muster: /\b(?:förderprogramm|förderung|zuschuss|kfw|beg|einspeisevergütung)\b/gi,
  },
  {
    name: "strommix",
    geschichte: "Strommix und Energiepreise",
    muster: /\b(?:strommix|strompreis|börsenstrompreis|energiepreise|netzentgelt|erzeugungsmix)\b/gi,
  },
  {
    name: "kommunal",
    geschichte: "Regionale Daten",
    muster: /\b(?:kommune|stadtwerke|gemeinde|landkreis|kommunal|daseinsvorsorge)\b/gi,
  },
  {
    name: "waermepumpe",
    geschichte: "Regionale Daten",
    muster: /\b(?:wärmepumpe|heizungstausch|wärmewende|heizungsgesetz|geg)\b/gi,
  },
  {
    name: "verbraucher",
    geschichte: "Methoden-, Fehler- und Datenqualitätsgeschichten",
    muster: /\b(?:verbraucher|rechner|vergleich|kosten|test|ratgeber|lohnt sich)\b/gi,
  },
  {
    name: "daten",
    geschichte: "Methoden-, Fehler- und Datenqualitätsgeschichten",
    muster: /\b(?:datenanalyse|datenjournalismus|auswertung|statistik|marktstammdatenregister|studie)\b/gi,
  },
];

export interface Themenfund {
  name: string;
  treffer: number;
}

export function themenAus(text: string): Themenfund[] {
  return THEMEN.map((t) => ({
    name: t.name,
    treffer: (text.match(t.muster) ?? []).length,
  }))
    .filter((t) => t.treffer > 0)
    .sort((a, b) => b.treffer - a.treffer);
}

/** Welche unserer Geschichten zu den gemessenen Themen passen — abgeleitet,
 *  nie getippt. Ein Thema unter zwei Treffern zählt nicht: Ein einzelnes
 *  Vorkommen ist genauso oft ein Menüpunkt oder ein Werbebanner. */
export const THEMA_MINDESTTREFFER = 2;

export function geschichtenZu(funde: Themenfund[]): string[] {
  const out: string[] = [];
  for (const f of funde) {
    if (f.treffer < THEMA_MINDESTTREFFER) continue;
    const t = THEMEN.find((x) => x.name === f.name);
    if (t && !out.includes(t.geschichte)) out.push(t.geschichte);
  }
  return out;
}

// ─── Reichweite: nur mit Beschriftung ────────────────────────────────────────

/**
 * Ein Größenindikator, aber NUR wenn die Zahl beschriftet ist.
 *
 * Eine nackte Zahl auf einer Mediadaten-Seite ist genauso oft ein Preis, ein
 * Format in Millimetern oder eine Jahreszahl. Gesucht wird deshalb das Wort und
 * die Zahl daneben, in beiden Reihenfolgen — und das Ergebnis trägt seinen
 * Wortlaut mit, damit ein Mensch es nachlesen kann.
 */
export function reichweiteAus(text: string): { wert: string; fundstelle: string } | null {
  const muster = [
    /(?:druckauflage|verbreitete auflage|verkaufte auflage|auflage)[^.\n]{0,40}?([\d][\d.\s]{2,12})/i,
    /([\d][\d.\s]{2,12})\s*(?:exemplare|leser(?:innen)?|abonnenten|abonnements)/i,
    /(?:reichweite|leser(?:innen)?|abonnenten|empfänger)[^.\n]{0,40}?([\d][\d.\s]{2,12})/i,
    /([\d][\d.,]{2,12}\s*(?:mio\.?|millionen|tsd\.?|tausend))\s*(?:leser|nutzer|abonnenten|visits|page ?impressions)/i,
    /(?:visits|page ?impressions|unique user)[^.\n]{0,40}?([\d][\d.\s]{2,12})/i,
  ];
  for (const m of muster) {
    const t = text.match(m);
    if (!t) continue;
    const roh = t[1].replace(/\s+/g, "");
    // Eine Jahreszahl ist keine Auflage. Vier Stellen zwischen 1900 und 2100
    // sind zu oft ein Gründungsjahr, als dass man sie als Reichweite ausgeben
    // dürfte.
    const zahl = Number(roh.replace(/[.,]/g, ""));
    if (!Number.isFinite(zahl)) continue;
    if (zahl >= 1900 && zahl <= 2100 && /^\d{4}$/.test(roh)) continue;
    if (zahl < 100) continue;
    return {
      wert: t[0].replace(/\s+/g, " ").trim().slice(0, 120),
      fundstelle: t[0].replace(/\s+/g, " ").trim().slice(0, 200),
    };
  }
  return null;
}

// ─── Ist das überhaupt ein Medium? ───────────────────────────────────────────

/**
 * Was KEIN Medium ist — nach demselben Muster wie `KEIN_BETRIEB` bei den
 * Fachbetrieben. Der Katalog soll Redaktionen enthalten, keine Anbieter, die
 * einen Blog führen.
 */
export const KEIN_MEDIUM: { grund: string; muster: RegExp }[] = [
  { grund: "Shop", muster: /\b(?:in den warenkorb|zum warenkorb|jetzt kaufen|artikelnummer|lieferzeit|inkl\. mwst)\b/i },
  { grund: "Anbieter", muster: /\b(?:kostenloses angebot|angebot anfordern|jetzt beraten lassen|unverbindlich anfragen|termin vereinbaren)\b/i },
  { grund: "Geparkt", muster: /\b(?:diese domain|domain kaufen|website im aufbau|coming soon|parkingcrew|sedo)\b/i },
];

/** Merkmale, die für ein redaktionelles Angebot sprechen.
 *  Keines allein genügt — gezählt wird, wie viele zutreffen. */
export const MEDIUM_MERKMALE: { name: string; muster: RegExp }[] = [
  { name: "Impressum nennt Verantwortlichen", muster: /verantwortlich(?:e[rn]?)?\s+(?:im sinne|i\.?\s?s\.?\s?d\.?|redakteur)|v\.?\s?i\.?\s?s\.?\s?d\.?\s?p\.?/i },
  { name: "Redaktion benannt", muster: /\bredaktion\b|\bchefredakt/i },
  { name: "Artikel-Datierung", muster: /\b\d{1,2}\.\s*(?:januar|februar|märz|april|mai|juni|juli|august|september|oktober|november|dezember)\s*\d{4}\b/i },
  { name: "Nachrichtenrubriken", muster: /\b(?:aktuelles|nachrichten|meldungen|news|schlagzeilen|archiv|ausgaben)\b/i },
  { name: "Autorennennung", muster: /\bvon\s+[A-ZÄÖÜ][\p{L}-]+\s+[A-ZÄÖÜ][\p{L}-]+\b|\bautor(?:in)?:/u },
];

export interface Medienurteil {
  ist: "medium" | "unklar" | "kein-medium";
  grund: string;
  merkmale: string[];
}

export function medienurteil(html: string): Medienurteil {
  const text = sichtbarerText(html);
  const aus = KEIN_MEDIUM.find((k) => k.muster.test(text));
  const merkmale = MEDIUM_MERKMALE.filter((m) => m.muster.test(text)).map((m) => m.name);
  if (aus && merkmale.length < 3) {
    return { ist: "kein-medium", grund: aus.grund, merkmale };
  }
  // Zwei Merkmale sind die Schwelle, an der im Eichlauf kein Anbieter mehr
  // durchkam und kein Medium mehr durchfiel. Drei wären strenger und hätten
  // reine Newsletter-Angebote ausgeschlossen, die keine Rubriken führen.
  if (merkmale.length >= 2) return { ist: "medium", grund: "", merkmale };
  return { ist: "unklar", grund: "zu wenige Merkmale", merkmale };
}

// ─── Priorität ───────────────────────────────────────────────────────────────

/**
 * A, B oder C — abgeleitet aus zwei gemessenen Größen, nicht aus einem Gefühl.
 *
 * PASSUNG schlägt Reichweite (ausdrückliche Vorgabe). Der Kontaktweg ist die
 * zweite Größe, weil ein perfekt passendes Medium ohne erreichbare Redaktion
 * kein A-Kontakt sein kann — man kommt nicht hin.
 */
export function prioritaet(opts: {
  themen: Themenfund[];
  hatPerson: boolean;
  hatRedaktionsPostfach: boolean;
  hatIrgendeinenWeg: boolean;
}): "A" | "B" | "C" {
  const kern = opts.themen
    .filter((t) => ["photovoltaik", "balkonkraftwerk", "speicher", "strommix"].includes(t.name))
    .reduce((s, t) => s + t.treffer, 0);
  const rand = opts.themen
    .filter((t) => ["foerderung", "kommunal", "waermepumpe", "verbraucher", "daten"].includes(t.name))
    .reduce((s, t) => s + t.treffer, 0);

  if (!opts.hatIrgendeinenWeg) return "C";
  if (kern >= 5 && (opts.hatPerson || opts.hatRedaktionsPostfach)) return "A";
  if (kern >= 2 && rand >= 3 && (opts.hatPerson || opts.hatRedaktionsPostfach)) return "A";
  if (kern >= 2 || rand >= 6) return "B";
  return "C";
}

/**
 * Der persönliche Aufhänger — aus dem stärksten gemessenen Thema abgeleitet.
 *
 * Bewusst eine ABLEITUNG und keine freie Formulierung: Wer den Aufhänger tippt,
 * tippt ihn irgendwann neben die Zahlen, die er behauptet — genau der Fehler,
 * der beim Kommunen-Anschreiben schon passiert ist (ein Brief nannte einen Rang,
 * den die verlinkte Seite widerlegte). Was hier steht, ist der Vorschlag; der
 * echte Aufhänger entsteht beim Schreiben, aus derselben Rechnung.
 */
export function aufhaenger(themen: Themenfund[], rolle: Rolle | null): string {
  const stark = themen.filter((t) => t.treffer >= THEMA_MINDESTTREFFER);
  const oben = stark[0]?.name;
  const anrede = rolle ? `${rolle.name} (${rolle.funktion})` : "Redaktion";
  const nach: Record<string, string> = {
    photovoltaik:
      "Zubau je Gemeinde aus dem Anlagenregister — für jede Stadt im Verbreitungsgebiet eine eigene Zahl, mit Datenstand",
    balkonkraftwerk:
      "Balkonkraftwerke je Gemeinde plus die Rechnung, wann sich ein Speicher dazu lohnt (Ergebnis widerspricht der Faustregel)",
    speicher:
      "Speicher-Amortisation über Haushaltsgröße und Anwesenheit — kleine Haushalte schneiden besser ab als große",
    strommix:
      "Strommix und Börsenwert von Solarstrom, stündlich gerechnet statt über den Jahresmittelwert",
    foerderung:
      "Kommunale Förderprogramme mit Prüfdatum je Programm — inklusive der Frage, wie viele davon nicht mehr gelten",
    kommunal:
      "Solar-Rangliste der Gemeinden im Verbreitungsgebiet, je Einwohner statt absolut",
    waermepumpe:
      "Wärmepumpen-Förderpraxis je Landkreis aus dem KfW-Förderreport — was bewilligt wurde, nicht was möglich wäre",
    verbraucher:
      "Rechner ohne Anmeldung und ohne Leadweitergabe, alle Annahmen im Ergebnis editierbar",
    daten:
      "Wie oft eine veröffentlichte Energie-Zahl ihren Nenner verschweigt — Methodengeschichte mit Beispielen aus eigenen Fehlern",
  };
  const kern = oben ? nach[oben] : "Datenauswertungen zum Solarausbau je Gemeinde";
  return `${anrede}: ${kern}`;
}

/**
 * Taugt der Seitentitel als Name des Mediums?
 *
 * GEMESSEN am 03.09.2026: energate-messenger.de und ikz.de trugen im Katalog den
 * Namen „Startseite", weil genau das in ihrem Titel-Element steht. Ein Katalog,
 * in dem drei Zeilen „Startseite" heißen, ist an der Stelle unbenutzbar — und
 * der Fehler fällt nur auf, wenn jemand die Zeilen liest.
 */
const NICHTSSAGENDER_TITEL =
  /^(?:startseite|home|homepage|willkommen|welcome|übersicht|uebersicht|aktuelles|news|nachrichten|start|index|impressum|kontakt|themen|magazin|magazine|blog|portal)$/i;
/**
 * Auch als ANFANG eines Titels nichtssagend. Gemessen: „Startseite der Webseite"
 * (dstgb.de) stand als Name des Mediums im Katalog.
 *
 * Bewusst nur am Anfang und nicht irgendwo im Titel: „Kommunalpolitische
 * Übersicht 2026" ist ein brauchbarer Titel, der zufällig ein generisches Wort
 * enthält. Wer solche Titel mit verwirft, tauscht einen sichtbaren Fehler gegen
 * einen unsichtbaren — der Katalog fiele dann ohne Not auf die Saat zurück.
 */
const NICHTSSAGEND_ANFANG = /^(?:startseite|home|homepage|willkommen|welcome|übersicht|uebersicht)\b/i;

export function titelBrauchbar(titel: string | null | undefined): boolean {
  if (!titel) return false;
  const t = titel.trim();
  return (
    t.length >= 2 &&
    t.length <= 90 &&
    !NICHTSSAGENDER_TITEL.test(t) &&
    !NICHTSSAGEND_ANFANG.test(t)
  );
}

/**
 * Trägt der „Name" nur die Marke des Mediums?
 *
 * GEMESSEN am 03.09.2026: „Springer Professional", „National Geographic
 * Magazin" und „CORRECTIV CrowdNewsroom" standen als Personennamen im Katalog —
 * sie bestehen aus großgeschriebenen Wörtern und stehen neben einer
 * Funktionsbezeichnung, damit sind sie von einem Menschen nicht zu
 * unterscheiden. WOHL ABER an ihrer Herkunft: Ihre Wörter sind die Wörter des
 * Mediums selbst.
 *
 * Bewusst nur, wenn ALLE tragenden Wörter des Namens aus der Marke stammen. Ein
 * Mensch, der zufällig so heißt wie sein Blatt, ist selten; ein Mensch, dessen
 * Nachname zufällig ein Markenwort ist, kommt vor.
 */
export function istMarkeStattName(name: string, domain: string, titel: string | null): boolean {
  const marke = new Set(
    `${domain.replace(/\.[a-z.]+$/, "")} ${titel ?? ""}`
      .toLowerCase()
      .split(/[^a-zäöüß0-9]+/)
      .filter((w) => w.length >= 3),
  );
  if (!marke.size) return false;
  const woerter = name
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length >= 3);
  if (!woerter.length) return false;
  return woerter.every((w) => marke.has(w));
}
