// Personen von einer Organisations-Website: Name, Funktion, Abschnitt, Adresse,
// Durchwahl.
//
// Reine Funktionen — kein Netz, kein DB-Zugriff. Das Abrufen macht der Aufrufer.
//
// WOFÜR DAS DA IST: Die Erhebung vom 23.08.2026 hat gemessen, dass ein Versorger
// im Impressum praktisch nie eine operative Stelle nennt (0 von 20 — dort steht
// die Geschäftsführung). Die Menschen stehen auf einer eigenen Seite, bei
// Stadtwerke Lingen unter „Ansprechpartner", eine Ebene unter der Kontaktseite
// und in keiner Menüleiste:
//
//   Geschäftsführung
//     Thorsten Schlamann · Geschäftsführung · 0591-91200-200 · thorsten.schlamann@…
//   Bereichsleitungen
//     Christian Kramer · Bereichsleitung Vertrieb & Energiebeschaffung · …
//
// DIESES MODUL ORDNET NICHT EIN. Es liest die Funktionsbezeichnungen wörtlich
// aus und zählt sie. Der Grund: Weder der Betreiber noch ich wissen, welche
// Funktion bei einem Stadtwerk über ein Website-Werkzeug entscheidet — und eine
// erfundene Rollen-Rangfolge wäre auch für einen Fachmann ein schlechter
// Prüfgegenstand. Erst wird eingesammelt, was es real gibt, dann wird die
// endliche Liste geordnet.

import { decodeEntities } from "./kommunen-profil";

// ─── Verfremdete Adressen ─────────────────────────────────────────────────────

/**
 * Repariert gegen Spam verfremdete Adressen im KLARTEXT.
 *
 * Gemessen an stadtwerke-lingen.de/kontakt (23.08.2026): Dort steht
 * `kundenservice @stadtwerke-lingen.de` — mit Leerzeichen vor dem @ und ohne
 * Verweis. Ein Adressmuster ohne diese Reparatur kann das prinzipiell nicht
 * finden; genau daran hat die erste Fassung der Erhebung auf jener Kontaktseite
 * null Adressen gefunden.
 *
 * Bewusst NUR die verbreiteten Schreibweisen. Wer jede denkbare Verfremdung
 * abdecken will, baut eine Liste, die nie fertig wird — und fängt sich dabei
 * falsche Treffer ein.
 */
export function entwirreAdressen(text: string): string {
  return (
    text
      // (at) [at] {at}
      .replace(/\s*[([{]\s*at\s*[)\]}]\s*/gi, "@")
      // " at " zwischen Wort und Domain
      .replace(/\s+at\s+(?=[\w-]+\.[a-z]{2,})/gi, "@")
      // (punkt) [dot]
      .replace(/\s*[([{]\s*(?:punkt|dot)\s*[)\]}]\s*/gi, ".")
      // Leerzeichen unmittelbar um das @ — der häufigste Fall, inkl. geschütztem
      .replace(/[ \t ]*@[ \t ]*/g, "@")
  );
}

const MAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;

/** Sieht die Adresse nach einer PERSON aus (vorname.nachname@, v-nachname@)
 *  statt nach einer Funktion (info@, vertrieb@)? Das Merkmal ist der Trenner im
 *  vorderen Teil — bewusst keine Wortliste, denn genau die Wörter sollen hier
 *  erst eingesammelt werden. */
export function istPersonenAdresse(mail: string): boolean {
  // Mehrere Trenner sind erlaubt: `anna-lena.mueller@` hat zwei.
  return /^[a-zäöüß]+(?:[._-][a-zäöüß]+)+$/i.test(mail.split("@")[0]);
}

/** Namensbestandteile aus dem vorderen Teil einer Adresse. */
export function namensteile(mail: string): string[] {
  return mail
    .split("@")[0]
    .split(/[._-]+/)
    .filter((t) => t.length >= 2);
}

/** Umlaute und ß auf ihre Umschrift, damit `moellenkamp` und `Möllenkamp`
 *  vergleichbar werden. */
export function umschrift(s: string): string {
  return s.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss");
}

// ─── Text mit Überschriften ───────────────────────────────────────────────────

/** Klammert eine Überschrift ein. Steuerzeichen, weil sie in echtem Seitentext
 *  nicht vorkommen und deshalb nichts zerstören können. */
const H = "\u0001";
/** Blockende — trennt zwei Personen voneinander. */
const BR = "\u0002";
const MARKEN = /[\u0001\u0002]/g;

/**
 * HTML zu Klartext, aber mit den Überschriften als Marke im Text.
 *
 * Die Überschrift ist auf einer Personenseite die Bereichsangabe
 * („Geschäftsführung", „Bereichsleitungen", „Ihr Team Vertrieb") und damit oft
 * aussagekräftiger als die Funktion am einzelnen Menschen. Wer den Text ohne sie
 * flach macht, wirft die Gliederung weg, die die Seite mitliefert.
 */
export function textMitAbschnitten(html: string): string {
  const roh = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, (_m, inner: string) => `${H}${inner}${H}`)
    // Blockenden trennen Personen voneinander — ohne sie klebt der nächste Name
    // an der Durchwahl des vorigen.
    .replace(/<br\s*\/?>/gi, BR)
    .replace(/<\/(?:p|div|li|tr|td|section|article)>/gi, BR)
    .replace(/<[^>]+>/g, " ");
  return entwirreAdressen(decodeEntities(roh))
    .replace(/[ \t ]+/g, " ")
    .replace(/ ?\u0002(?:\s*\u0002)* ?/g, BR);
}

/** Die letzte Überschrift vor dieser Stelle. */
export function abschnittVor(text: string, pos: number): string | null {
  const davor = text.slice(0, pos);
  const ende = davor.lastIndexOf(H);
  if (ende < 0) return null;
  const start = davor.lastIndexOf(H, ende - 1);
  if (start < 0) return null;
  const roh = davor.slice(start + 1, ende).replace(MARKEN, " ").replace(/\s+/g, " ").trim();
  return roh.length >= 2 && roh.length <= 80 ? roh : null;
}

// ─── Personen ─────────────────────────────────────────────────────────────────

export type Person = {
  /** Wie der Name auf der Seite steht. */
  name: string;
  /** Die Funktionsbezeichnung WÖRTLICH, ohne jede Einordnung. */
  funktion: string | null;
  /** Überschrift des Abschnitts, in dem die Person steht. */
  abschnitt: string | null;
  mail: string;
  telefon: string | null;
};

const TELEFON = /(?:\+49|0)[\d\s/()-]{6,24}\d/;
/** Wie weit vor der Adresse nach Name, Funktion und Durchwahl gesucht wird. */
const FENSTER = 400;

/**
 * Personen aus einer Seite.
 *
 * Der Anker ist die **persönliche Adresse**, und der Name wird aus ihr
 * abgeleitet statt geraten: `christian.kramer@` sagt, wonach im Text zu suchen
 * ist. Deshalb kommt dieses Modul ohne Namenslisten aus und funktioniert bei
 * seltenen und ausländischen Namen genauso.
 *
 * Die Funktion ist das, was zwischen dem Namen und der Durchwahl steht — auch
 * das ohne Wortliste, weil die Wörter ja gerade eingesammelt werden sollen.
 */
export function personenAus(html: string): Person[] {
  const text = textMitAbschnitten(html);
  const gefunden = new Map<string, Person>();

  for (const treffer of Array.from(text.matchAll(MAIL))) {
    const mail = treffer[0].toLowerCase();
    if (!istPersonenAdresse(mail) || gefunden.has(mail)) continue;
    const pos = treffer.index ?? 0;

    const fensterStart = Math.max(0, pos - FENSTER);
    const roh = text.slice(fensterStart, pos);
    // Die Grenze zum vorigen Eintrag ist DESSEN ADRESSE, nicht ein Blockende.
    // Ein Blockende taugt nicht: Auf diesen Seiten steht jedes Feld in einem
    // eigenen Block, ein Schnitt daran würde den Namen von seiner Adresse
    // trennen (erster Eichlauf: null Personen gefunden). Der Aufbau ist immer
    // Name → Funktion → Durchwahl → Adresse, also liegt zwischen zwei Adressen
    // genau ein vollständiger Eintrag.
    let letzteAndere = -1;
    for (const v of Array.from(roh.matchAll(MAIL))) {
      letzteAndere = (v.index ?? 0) + v[0].length;
    }
    const fenster = letzteAndere >= 0 ? roh.slice(letzteAndere) : roh;
    const versatz = fensterStart + (letzteAndere >= 0 ? letzteAndere : 0);

    const teile = namensteile(mail);
    if (teile.length < 2) continue;

    const nachname = teile[teile.length - 1];
    const posName = letzteFundstelle(fenster, nachname);
    if (posName < 0) continue;

    // Der Name beginnt beim Vornamen, sofern er kurz davor steht.
    const posVor = letzteFundstelle(fenster.slice(0, posName), teile[0]);
    const nameStart = posVor >= 0 && posName - posVor < 40 ? posVor : posName;
    const nameEnde = posName + nachname.length;
    const name = fenster.slice(nameStart, nameEnde).replace(MARKEN, " ").replace(/\s+/g, " ").trim();
    if (!istPlausiblerName(name)) continue;

    // Zwischen Name und Adresse steht die Funktion, dahinter die Durchwahl.
    let rest = fenster.slice(nameEnde);
    const tel = rest.match(TELEFON);
    if (tel && tel.index !== undefined) rest = rest.slice(0, tel.index);

    gefunden.set(mail, {
      name,
      funktion: saeubereFunktion(rest),
      abschnitt: abschnittVor(text, versatz + nameStart),
      mail,
      telefon: tel ? tel[0].replace(/\s+/g, " ").trim() : null,
    });
  }
  return [...gefunden.values()];
}

/**
 * Letzte Fundstelle eines Namensteils, unabhängig von der Umlaut-Umschrift.
 *
 * Die Position wird über eine mitlaufende Abbildung zurückgerechnet: „Möllenkamp"
 * ist kürzer als „moellenkamp", ein Index aus dem umgeschriebenen Text zeigt im
 * Original sonst daneben.
 */
export function letzteFundstelle(fenster: string, teil: string): number {
  const gesucht = umschrift(teil);
  const abbild: number[] = [];
  let um = "";
  for (let i = 0; i < fenster.length; i++) {
    const u = umschrift(fenster[i]);
    for (let k = 0; k < u.length; k++) abbild.push(i);
    um += u;
  }
  const idx = um.lastIndexOf(gesucht);
  return idx < 0 ? -1 : abbild[idx];
}

/**
 * Die Funktionsbezeichnung aus dem Text zwischen Name und Kontaktangabe.
 *
 * Bewusst konservativ: Was nach Fließtext aussieht (zu lang, Satzzeichen mitten
 * drin, Kleinschreibung am Anfang), wird verworfen statt geraten. Eine falsche
 * Funktionsbezeichnung ist hier schlimmer als eine fehlende — sie landet als
 * eigener Eintrag in der Wortliste und verzerrt genau die Erhebung, um die es
 * geht.
 */
export function saeubereFunktion(roh: string): string | null {
  const s = roh
    .replace(MARKEN, " ")
    .replace(/\b(?:tel(?:efon)?|fon|fax|mobil|mobile|e-?mail|mail)\b\.?:?/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[-–—·|,;:]+|[-–—·|,;:]+$/g, "")
    .trim();
  if (s.length < 3 || s.length > 70) return null;
  if (/[.!?]\s/.test(s)) return null; // Fließtext
  if (!/^[A-ZÄÖÜ]/.test(s)) return null; // Funktionsbezeichnungen beginnen groß
  // Eine Restadresse ist keine Funktion. Gemessen am ersten Lauf: „E-Mail
  // anschluss@thueringer-energienetze.com" landete als Funktionsbezeichnung in
  // der Wortliste — und verzerrt damit genau die Erhebung, um die es geht.
  if (s.includes("@")) return null;
  // Längere Ziffernfolgen sind Reste von Durchwahlen und Hausnummern.
  if (/\d{3,}/.test(s)) return null;
  // Mehr als sechs Wörter ist keine Funktionsbezeichnung mehr, sondern ein Satz.
  if (s.split(" ").length > 6) return null;
  return s;
}

/**
 * Sieht der Fund nach einem echten Personennamen aus?
 *
 * Gegen den zweiten gemessenen Fehlgriff des ersten Laufs: „G) Ihr Kontakt
 * Johannes Sambale" wurde als Name übernommen, weil der Nachname darin vorkam.
 * Erlaubt sind Buchstaben, Bindestriche, Apostrophe und der Punkt akademischer
 * Grade — mehr braucht ein Name nicht.
 */
export function istPlausiblerName(name: string): boolean {
  if (!/^[A-ZÄÖÜ]/.test(name)) return false;
  if (!/^[\p{L}\s.'’-]+$/u.test(name)) return false;
  const woerter = name.split(/\s+/);
  return woerter.length >= 2 && woerter.length <= 5;
}
