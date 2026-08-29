/**
 * Was aus einer Betriebs-Website herauszulesen ist — die reine Logik.
 *
 * Hier steht kein Netzzugriff und keine Datenbank; `scripts/fachbetriebe-refresh.ts`
 * holt die Seiten und schreibt das Ergebnis. Getrennt, weil die Muster der Kern
 * der Datenqualität sind und einzeln prüfbar sein müssen: Die erste Fassung lief
 * durch, lieferte plausible Quoten (88 % mit Anschrift, 40 % mit
 * Handelsregisternummer) — und enthielt sechs Fehlerklassen, von denen keine
 * einzige an der Quote zu erkennen war.
 *
 * Jede Regel unten ist an einem gemessenen Fehlgriff kalibriert (27.08.2026,
 * Eichlauf über 25 Betriebe, jede Zeile von Hand gegengelesen). Die Fehlgriffe
 * sind in `lib/__tests__/fachbetrieb-extrakt.test.ts` festgenagelt — wer ein
 * Muster aufweicht, macht den Test rot.
 *
 * Herleitung und verworfene Quellen: docs/fachbetriebe-quellen.md
 */

// ─── Ortssuche ───────────────────────────────────────────────────────────────

export interface Kreis {
  id: string;
  name: string;
  kind: string;
  bl: string;
}

/**
 * Wie der Kreis in der Suchanfrage heißt.
 *
 * Eine kreisfreie Stadt heißt nach der Stadt, ein Landkreis nach dem Kreis.
 * „Landkreis Flensburg" gibt es nicht und liefert entsprechend nichts;
 * „Solarteur Flensburg" schon.
 */
export function ortsname(k: Kreis): string {
  return k.kind === "Kreisfreie Stadt" ? k.name : `Landkreis ${k.name}`;
}

/**
 * Zwei Fragen je Kreis, und der Unterschied ist nicht kosmetisch.
 *
 * „Photovoltaik" ist das Wort der Betriebe, die aus dem Solargeschäft kommen;
 * „Solarteur" das der Suchenden. Beide Male antworten teils andere Betriebe —
 * gemessen an drei Kreisen überschneiden sich die Trefferlisten nur etwa zur
 * Hälfte. Ein Begriff allein verlöre systematisch eine Bauart von Betrieb: das
 * Elektrohandwerk, das PV mitmacht, ohne es im Namen zu führen.
 */
export const FRAGEN = [
  { name: "photovoltaik", vorlage: (k: Kreis) => `Photovoltaik Fachbetrieb ${ortsname(k)}` },
  { name: "solarteur", vorlage: (k: Kreis) => `Solarteur ${ortsname(k)}` },
] as const;

/**
 * Große Plattformen, die nie ein Fachbetrieb sind.
 *
 * Bewusst KURZ und nur für Fälle, welche die Streuungsmessung nicht fassen kann:
 * Plattformen erscheinen zwar überall, aber ein EINZELNER Facebook-Treffer in
 * einem Kreis käme sonst als „Betrieb mit einem Kreis" durch. Die eigentliche
 * Portal-Trennung macht `portalSchwelle` über die Streuung; diese Liste ersetzt
 * sie nicht und darf nicht zur gepflegten Sperrliste anwachsen.
 */
export const NIE_EIN_BETRIEB = [
  "facebook.com",
  "instagram.com",
  "youtube.com",
  "linkedin.com",
  "xing.com",
  "wikipedia.org",
  "amazon.de",
  "ebay.de",
  "ebay-kleinanzeigen.de",
  "kleinanzeigen.de",
  "google.com",
  "bing.com",
  "pinterest.de",
  "tiktok.com",
  "x.com",
  "twitter.com",
];

export function istPlattform(host: string): boolean {
  return NIE_EIN_BETRIEB.some((p) => host === p || host.endsWith("." + p));
}

export function hostVon(u: string): string | null {
  try {
    return new URL(u).host.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

// ─── Betrieb oder Portal: die Streuung entscheidet ───────────────────────────

/**
 * Ab wie vielen Kreisen gilt eine Domain als Portal?
 *
 * Hergeleitet, nicht gegriffen: Ein Fachbetrieb bedient einen Umkreis, der
 * typisch ein bis drei Kreise berührt; das größte Beispiel aus dem Eichlauf
 * nennt sieben Städte innerhalb von rund 50 km, also vier Kreise. Ein
 * Vergleichsportal erscheint in JEDEM Kreis, in dem gesucht wird. Zwischen vier
 * und zehn liegt niemand — deshalb ist die Schwelle unkritisch.
 *
 * Der zweite Teil ist der wichtigere: Die Schwelle wirkt erst, wenn genug Kreise
 * abgefragt sind. Nach zehn abgefragten Kreisen KANN keine Domain in acht
 * auftauchen, und dann wäre jedes Portal ein „Betrieb" — eine Einordnung, die
 * still falsch ist und nach der Vollabfrage niemand mehr nachprüft.
 */
export const PORTAL_AB_KREISEN = 8;
export const PORTAL_ANTEIL = 0.05;

export function portalSchwelle(kreiseAbgefragt: number): number {
  return Math.max(PORTAL_AB_KREISEN, Math.ceil(kreiseAbgefragt * PORTAL_ANTEIL));
}

// ─── HTML → Text ─────────────────────────────────────────────────────────────

export function entities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&auml;/g, "ä")
    .replace(/&ouml;/g, "ö")
    .replace(/&uuml;/g, "ü")
    .replace(/&Auml;/g, "Ä")
    .replace(/&Ouml;/g, "Ö")
    .replace(/&Uuml;/g, "Ü")
    .replace(/&szlig;/g, "ß")
    .replace(/&ndash;/g, "–")
    .replace(/&mdash;/g, "—")
    .replace(/&hellip;/g, "…")
    .replace(/&middot;/g, "·")
    .replace(/&bull;/g, "•")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

/**
 * Sichtbarer Text mit ERHALTENEN Zeilengrenzen.
 *
 * Der Unterschied zum üblichen Tag-Strippen ist nicht Kosmetik: Eine Anschrift
 * lebt von ihren Zeilen. „Musterweg 3" und „12345 Musterstadt" stehen im HTML in
 * getrennten Elementen; werden sie zu einer Zeile verschmolzen, findet kein
 * Muster mehr die Postleitzahl am Zeilenanfang.
 */
export function sichtbarerText(html: string): string {
  let s = html.replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, " ");
  s = s.replace(/<br\s*\/?>|<\/(p|div|li|tr|h[1-6]|td)>/gi, "\n");
  s = s.replace(/<[^>]+>/g, " ");
  s = entities(s);
  return s
    .split("\n")
    .map((l) => l.replace(/[ \t ]+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

/** Die Impressum-Adresse ist NICHT ratbar — `/impressum` traf im Eichlauf in
 *  zwei von drei Fällen daneben (einmal `impressum.html`, einmal mit Schrägstrich
 *  am Ende, sonst 404). Deshalb wird sie aus den Links der Startseite gelesen. */
export function impressumUrl(html: string, basis: string): string | null {
  const treffer: { url: string; punkte: number }[] = [];
  const re = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const href = entities(m[1]);
    const text = entities(m[2].replace(/<[^>]+>/g, " "))
      .trim()
      .toLowerCase();
    if (/^(mailto:|tel:|javascript:|#)/i.test(href)) continue;
    const h = href.toLowerCase();
    let p = 0;
    if (/impressum/.test(h)) p = 100;
    else if (/impressum/.test(text)) p = 90;
    else if (/\bimprint\b/.test(h) || /\bimprint\b/.test(text)) p = 70;
    else if (/anbieterkennzeichnung|rechtliche/.test(h + " " + text)) p = 50;
    if (!p) continue;
    try {
      treffer.push({ url: new URL(href, basis).toString(), punkte: p });
    } catch {
      /* unbrauchbarer Link */
    }
  }
  treffer.sort((a, b) => b.punkte - a.punkte);
  return treffer[0]?.url ?? null;
}

/**
 * Die Kontaktseite — der zweite Weg zu einem Kontakt, wenn das Impressum keinen hergibt.
 *
 * Gemessen am 28.08.2026: 473 der 3.098 Betriebe hatten keine auslesbare
 * E-Mail-Adresse, 233 gar keinen Kontaktweg. Der Grund ist selten, dass es
 * keinen gibt — er steht nur woanders: hinter einem Formular auf der
 * Kontaktseite, oder als Bild gegen Spam-Sammler. Dieselbe Systematik wie bei
 * den Gemeinden, wo die Kontaktseite den Rollen-Postfächern nachgeht.
 */
export function kontaktUrl(html: string, basis: string): string | null {
  const treffer: { url: string; punkte: number }[] = [];
  const re = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  const basisHost = (() => {
    try {
      return new URL(basis).host.replace(/^www\./, "");
    } catch {
      return "";
    }
  })();
  while ((m = re.exec(html))) {
    const href = entities(m[1]);
    const text = entities(m[2].replace(/<[^>]+>/g, " "))
      .trim()
      .toLowerCase();
    if (/^(mailto:|tel:|javascript:|#)/i.test(href)) continue;
    const h = href.toLowerCase();
    let p = 0;
    if (/kontakt[-_/]?formular|anfrage/.test(h)) p = 100;
    else if (/kontaktformular|anfrage stellen|jetzt anfragen/.test(text)) p = 95;
    else if (/[-_/]kontakt(\b|[-_/.])/.test(h) || /^kontakt$/.test(text)) p = 80;
    else if (/\bkontakt\b/.test(text)) p = 60;
    else if (/beratung|angebot anfordern|schreiben sie uns/.test(text)) p = 40;
    if (!p) continue;
    let abs: string;
    try {
      abs = new URL(href, basis).toString();
    } catch {
      continue;
    }
    // Ein Kontaktlink auf eine FREMDE Domain ist meist ein Portal-Formular,
    // nicht der Betrieb selbst — deshalb abgewertet, nicht verworfen: Manche
    // kleinen Betriebe hängen wirklich an einem fremden Formulardienst.
    let host = "";
    try {
      host = new URL(abs).host.replace(/^www\./, "");
    } catch {
      continue;
    }
    treffer.push({ url: abs, punkte: host === basisHost ? p : p - 40 });
  }
  treffer.sort((a, b) => b.punkte - a.punkte);
  return treffer[0] && treffer[0].punkte >= 40 ? treffer[0].url : null;
}

// ─── Rechtsform ──────────────────────────────────────────────────────────────

/**
 * Rechtsformen mit WORTGRENZEN — ohne sie liest der Extraktor Unsinn.
 *
 * Gemessen im Eichlauf: „DORFMANAGEMENT" enthält die Buchstaben von AG,
 * „WERKZEUG" die von UG. Beide wurden als Rechtsform gesetzt, und beide standen
 * danach völlig plausibel in der Spalte. Eine Rechtsform aus der Mitte eines
 * Wortes fällt niemandem auf.
 *
 * Reihenfolge ist bedeutsam: Die spezifischste Form zuerst, sonst gewinnt „GmbH"
 * gegen „GmbH & Co. KG".
 */
export const RECHTSFORMEN: { name: string; muster: RegExp }[] = [
  { name: "GmbH & Co. KG", muster: /\bGmbH\s*&\s*Co\.?\s*KG\b/ },
  { name: "gGmbH", muster: /\bgGmbH\b/ },
  { name: "GmbH", muster: /\bGmbH\b|\bGMBH\b/ },
  { name: "UG (haftungsbeschränkt)", muster: /\bUG\s*\(haftungsbeschr[äa]nkt\)/ },
  { name: "UG", muster: /\bUG\b/ },
  { name: "AG", muster: /\bAG\b/ },
  { name: "OHG", muster: /\bOHG\b/ },
  { name: "KG", muster: /\bKG\b/ },
  { name: "GbR", muster: /\bGbR\b/i },
  { name: "eG", muster: /\beG\b|\be\.\s?G\./ },
  { name: "e.K.", muster: /\be\.\s?K(fm|fr)?\./ },
  // Fehlte bis 29.08.2026 ganz. Folge: „Welt in Elbe-Elster e.V." galt als
  // Text ohne Rechtsform, fiel unter die Werbesatz-Regel und wurde zu „Welt".
  { name: "e.V.", muster: /\be\.\s?V\.|\beV\b/ },
];

export function rechtsformVon(name: string): string | null {
  for (const rf of RECHTSFORMEN) {
    if (rf.muster.test(name)) return rf.name;
  }
  return null;
}

/**
 * Den Firmennamen von dem befreien, was die SEITE dazugeschrieben hat.
 *
 * Gefunden am 28.08.2026, als die Namen zum ersten Mal in einer Liste
 * untereinander standen — in der Datenbank waren sie nicht aufgefallen:
 * „Impressum - 3E-Elektrotechnik GmbH", „Home | ABEL ReTec", „Kontakt Wagner
 * GmbH", „Name 3NERGY GmbH Adresse Am Pönitzer Dreieck 1", und einmal bloß
 * „GmbH & Co. KG" ganz ohne Namen. Herkunft: die Überschrift des Impressums
 * oder der Seitentitel als Rückfall.
 *
 * In einem Anschreiben wäre jeder dieser Namen peinlich — und genau dafür wird
 * er irgendwann gebraucht. Deshalb lieber KEIN Name als ein falscher: Was nach
 * dem Putzen nur noch aus einer Rechtsform besteht, wird verworfen.
 */
/**
 * Zeilen, in denen eine FREMDE Firma steht — nicht der Betrieb.
 *
 * Der teuerste Fehlgriff dieser Erhebung, gefunden vom Betreiber an einer
 * einzelnen Karte: „© Vaillant Deutschland GmbH & Co. KG" stand als Firmenname
 * über einem Betrieb, der duo energy heißt. Der Satz im Impressum lautete
 * „Diese Website wurde erstellt von mai multimedia — Bildrechte © Vaillant
 * Deutschland GmbH & Co. KG". Adresse und E-Mail waren richtig, nur der Name
 * gehörte jemand anderem.
 *
 * Ein Impressum nennt regelmäßig mehrere Firmen: den Anbieter ganz oben, dann
 * Bildquellen, den Webdesigner, den Anbieter der Rechtstexte, den Hersteller.
 * Wer die erste Zeile mit einer Rechtsform nimmt, erwischt irgendeine davon.
 * In einem Anschreiben wäre das der schlimmste Fehler von allen — er benennt
 * den falschen Betrieb.
 */
const FREMDE_FIRMA =
  // ©, (c) und ähnliche Zeichen stehen AUSSERHALB der Wortgrenzen-Gruppe: Eine
  // Wortgrenze vor „©" kann nie passen, weil © kein Wortzeichen ist. Das erste
  // Muster prüfte genau so — und ließ jeden Urheberrechtsvermerk durch.
  /©|\(c\)|\b(Bildrechte|Bildnachweis|Bildquelle|Fotos?|Grafiken?|erstellt von|umgesetzt von|realisiert (von|durch)|Webdesign|Programmierung|Gestaltung|Copyright|All Rights Reserved|Rechtstexte|Quelle|Hersteller|Lieferant|powered by|depositphotos|shutterstock|adobe ?stock|unsplash|pixabay)\b/i;

/** Menüpunkte, die als ganzer Name auftauchten — nur als EINZIGES Wort geprüft. */
const NAVIGATIONSWORT =
  /^(Start|Startseite|Home|News|Aktuelles|Leistungen|Willkommen|Das|Die|Der|Smart|Menu|Men[üu]|Seite|Index|Login|Suche|Blog|Über|Ueber|Team|Service|Produkte|Referenzen|Kontakt|Impressum)$/i;

/** Wörter, die in einem Firmennamen nichts verloren haben. */
const SEITENWORT =
  /^(Impressum|Kontakt|Startseite|Home|Anbieterkennzeichnung|Datenschutz(erkl[äa]rung)?|AGB|Angaben gem[äa][ßss][^:]*|Name|Firma|Anbieter|Betreiber|Verantwortlich|und Kontaktdaten|von|Showroom)\b/i;

/**
 * Sieht dieser Textabschnitt aus wie ein Firmenname — oder wie ein Werbespruch?
 *
 * Ein Seitentitel ist fast nie der Firmenname. „Photovoltaik und Elektrotechnik
 * — Mac Metzler Energietechnik GmbH" hat den Namen hinten, „Solaranlagen Bayern
 * — Sie kontaktieren uns und wir erledigen alles!" hat gar keinen. Beides sah
 * nach dem ersten Putzen gleich aus.
 */
function wirktWieName(t: string): boolean {
  if (t.length < 2 || t.length > 60) return false;
  if (SEITENWORT.test(t)) return false;
  // Ein Satz ist kein Name: Ausrufe- und Fragezeichen, Werbeformeln,
  // Aufzählungen mit mehreren Kommas.
  if (/[!?]/.test(t)) return false;
  if (
    /\b(kaufen|g[üu]nstig|jetzt|sichern|erledigen|kontaktieren|Ihr Partner|Ihr Spezialist|vom Fachmann|in Ihrer N[äa]he|Tagespreis|Sofortbonus|Zum Inhalt springen)\b/i.test(
      t,
    )
  )
    return false;
  if ((t.match(/,/g) ?? []).length >= 2) return false;
  if (istWerbesatz(t)) return false;
  // NUR GATTUNGSWÖRTER HEISST: KEIN NAME.
  //
  // Die letzte Klasse der Durchsicht — reine Leistungsaufzählungen, die durch
  // die Werbesatz-Regel schlüpfen, weil sie weder ein Verhältniswort noch ein
  // Werbe-Adjektiv enthalten: „PV-Anlagen, Batteriespeicher und Wärmepumpen",
  // „Elektroarbeiten, Badsanierung & Heizungsbau", „Photovoltaikanlage Beratung
  // Installation". Ein Firmenname hat immer mindestens ein Wort, das im
  // Branchenvokabular nicht vorkommt — den Namen eben.
  //
  // AUSNAHME VERSALIEN: „PV ELEKTRO" ist der Firmenname (und die Domain), nicht
  // die Aufzählung „PV, Elektro". Wer seinen Namen in Großbuchstaben schreibt,
  // schreibt keinen Fließtext — gemessener Fehlgriff dieser Regel.
  const worte = t.split(/[\s/]+/).map((w) => w.replace(/^[&(]+|[.,;:&)-]+$/g, "")).filter(Boolean);
  const versalien = worte.every((w) => w === w.toUpperCase());
  if (!versalien && worte.length >= 1 && worte.every((w) => GATTUNGSWORT.test(w))) return false;
  // MENÜPUNKTE, die als Name durchgingen: „Start" stand elfmal in der Liste,
  // dazu „Das", „News", „Smart", „Home". Sie kommen aus dem Seitentitel, wenn
  // die Seite dort nur ihren Menüpunkt führt. Auf GLEICHHEIT geprüft, nicht als
  // Anfang — „Startec GmbH" gibt es.
  if (worte.length === 1 && NAVIGATIONSWORT.test(worte[0])) return false;
  // Mindestens ein großgeschriebenes Wort — ein Name hat eines.
  return /[A-ZÄÖÜ]/.test(t);
}

/**
 * Ein Leistungsversprechen ist kein Firmenname.
 *
 * Die zweite Klasse, die erst das Durchlesen ALLER Namen zutage förderte:
 * „Experte für Photovoltaik, erneuerbare Energie & Solaranlagen",
 * „Badrenovierung und Heizungsbau im Raum Cuxhaven & Otterndorf",
 * „Hochwertige Photovoltaikanlagen für Hamburg und Umgebung". Jeder Satz für
 * sich unauffällig, keiner nennt eine Firma — die Seite hat schlicht keinen
 * Namen im Titel und im Impressum-Kopf.
 *
 * Erkannt wird die BAUFORM, nicht das Thema: ein Verhältniswort, das eine
 * Leistung an einen Ort oder einen Zweck bindet, oder ein Werbe-Adjektiv. Beides
 * kommt in Firmennamen praktisch nicht vor — und wo doch („Gesellschaft für
 * Solartechnik mbH"), schützt die Rechtsform davor, siehe Aufrufstelle.
 *
 * Lieber kein Name als ein falscher: Ohne Namen zeigt die Liste die Anschrift,
 * und die ist immer richtig.
 */
function istWerbesatz(t: string): boolean {
  return t.split(/\s+/).some(istWerbewort);
}

/**
 * Ein einzelnes Wort, an dem das Leistungsversprechen beginnt.
 *
 * DURCHGEHENDE GROSSSCHREIBUNG SCHÜTZT: „IM Elektrotechnik Nord" heißt wirklich
 * so — „IM" sind die Initialen des Inhabers, kein Verhältniswort. Gemessen als
 * Fehlgriff genau dieser Regel, sichtbar erst, weil dieselbe Auszählung nach
 * dem Fix ein zweites Mal lief: Der Bestand verlor plötzlich MEHR Namen statt
 * weniger.
 */
function istWerbewort(w: string): boolean {
  const rein = w.replace(/[.,;:&()-]+$/, "");
  if (rein.length <= 3 && rein === rein.toUpperCase() && /[A-ZÄÖÜ]/.test(rein)) return false;
  return WERBE_BEGINN.test(rein) || WERBE_WORT.test(rein);
}

/** Wo ein Leistungsversprechen anfängt — dort endet der Name, wenn es einen gibt. */
const WERBE_BEGINN =
  /\b(f[üu]r|zur|zum|in|im|aus|vom|rund um|ist|sind|deine?[nmrs]?|Ihre?[nmrs]?|Dein|Experten?|Spezialist\w*|Fachpartner|Ansprechpartner|Anbieter|Berater\w*|Profi)\b/i;

const WERBE_WORT =
  /\b(hochwertig\w*|professionell\w*|zuverl[äa]ssig\w*|schl[üu]sselfertig\w*|kostenlos|Full[- ]?Service|kompetent\w*|erfahren\w*|individuell\w*|ma[ßss]geschneidert\w*|nachhaltig\w*|effizient\w*|komplett\w*|erschwinglich\w*|intelligent\w*|modern\w*|regional\w*)\b/i;

/**
 * Branchen- und Füllwörter — alles, was KEIN Eigenname ist.
 *
 * Gebraucht für genau eine Entscheidung: Steht vor dem Leistungsversprechen ein
 * Firmenname, oder fängt der Satz gleich mit der Leistung an? „SEAC Group
 * Experten für solare Freiflächenanlagen" trägt vorn einen Namen, „Solaranlagen
 * für Schwerin und ganz Mecklenburg" nicht — und beide sahen bis hierher gleich
 * aus.
 */
const GATTUNGSWORT =
  /^(Photovoltaik(anlagen?|shop)?|PV(-?Anlagen?)?|Solar(anlagen?|technik|energie|module|strom|thermie|systeme|park)?|Elektro(technik|installationen?|arbeiten|anlagen?|fachbetrieb|meisterbetrieb)?|Elektriker|Heizung(en|sbau|stechnik)?|Sanit[äa]r(technik)?|Bad(sanierung|renovierung)?|W[äa]rmepumpen?|Energie(technik|beratung|systeme|l[öo]sungen|versorger|experten?|speicher)?|Strom(speicher)?|Dach(decker|sanierung|arbeiten)?|Balkonkraftwerke?|Anlagen?|Beratung|Service|Technik|L[öo]sungen?|Fachbetrieb(e)?|Meisterbetrieb(e)?|Meisterfachbetrieb|Partner|Zuhause|Haus(technik)?|Geb[äa]udetechnik|Gewerbe|Industrie|Privat(kunden)?|Region(al)?|Stadtwerke|Institut|Gruppe|Group|GmbH|Zimmerer|Zimmerei|Dachdecker(betrieb|meister)?|Schreinerei|Tischlerei|Klempner(ei)?|Installateur|Meister(betrieb|fachbetrieb)?|Handwerk(er)?|Bau|Montage(service|systeme)?|Holzbau|Bedachungen|Haustechnik|Klimatechnik|K[äa]ltetechnik|Solarteur(e)?|Energieberat(ung|er)|Energieexperten?|Netzbetreiber|Energieversorger|Dienstleister|Welt|Zukunft|Sonne(nenergie)?|Strom(speicher)?|W[äa]rme(pumpen?)?|Batteriespeicher|Speicher(systeme)?|Balkonkraftwerke?|Solarmodule|Zubeh[öo]r|Installation(en)?|Planung|Montage|Wartung|Elektroarbeiten|Badsanierung|Badrenovierung|Heizungsbau|Angebote?|Erneuerbare|Innovative|Klima(technik|anlagen?|schutz)?|Sicherheitstechnik|Solarthermie|Wallbox(en)?|E-?Mobilit[äa]t|Sanierung|D[äa]mmung|Fassade|Shop|Komplettl[öo]sungen|Energiel[öo]sungen|Anlage|hier|erhalten|mit|ohne|von|vom|neu|noch|mehr|gute|eine|einer|Alles|Wir|Sie|Ihnen|und|oder|&|,|-|und|&|die|der|das|Alles|Wir|Ihre?[nmrs]?|Das|Die|Der)$/i;

/**
 * Der Firmenname vor dem Leistungsversprechen — oder null.
 *
 * Gemessen an den 131 Sätzen, die sonst ganz entfielen: In gut einem Dutzend
 * steht der Name vorn und nur der Rest ist Werbung. Alles wegzuwerfen wäre
 * derselbe Fehler in der anderen Richtung.
 */
function nameVorWerbung(t: string): string | null {
  const worte = t.split(/\s+/);
  const i = worte.findIndex(istWerbewort);
  if (i < 1) return null;
  const vorn = worte.slice(0, i);
  // Nur Gattungswörter davor heißt: Der Satz fängt gleich mit der Leistung an.
  if (vorn.every((w) => GATTUNGSWORT.test(w.replace(/[.,;:&-]+$/, "")))) return null;
  const name = vorn.join(" ").replace(/[\s.,;:&-]+$/, "");
  return name.length >= 3 && /[A-ZÄÖÜ]/.test(name) ? name : null;
}

/**
 * Den Firmennamen von dem befreien, was die SEITE dazugeschrieben hat.
 *
 * MESSUNG, die diesen Umbau ausgelöst hat (28.08.2026): 633 von 3.115 Namen —
 * 20 % — trugen Müll. Nicht als Ausreißer, sondern in fünf klaren Klassen:
 * „& Datenschutz - SED-Solar GmbH" (die Impressum-Überschrift lautet „Impressum
 * & Datenschutz", das erste Wort war entfernt, der Rest blieb stehen),
 * „Elektro-Klaas GmbH: Impressum" (nachgestellt), „Photovoltaik und
 * Elektrotechnik - Mac Metzler Energietechnik GmbH" (Seitentitel mit dem Namen
 * HINTEN), „&ndash; AURORASOL GmbH" (unaufgelöste HTML-Entität) und reine
 * Werbesprüche ohne jeden Namen.
 *
 * Der Grundfehler war, den Seitentitel als Rückfall oberflächlich zu putzen.
 * Ein Seitentitel ist fast nie der Firmenname. Deshalb jetzt:
 *
 *  1. an ALLEN üblichen Trennern zerlegen, nicht nur an | und ·
 *  2. der Teil MIT Rechtsform gewinnt, egal an welcher Stelle er steht
 *  3. ohne Rechtsform nur, was wie ein Name aussieht und nicht wie ein Satz
 *  4. sonst KEIN Name — die Liste zeigt dann die Adresse, und die stimmt immer
 *
 * Lieber kein Name als ein falscher: In einem Anschreiben wäre jeder dieser
 * Fälle peinlich, und genau dafür wird der Name irgendwann gebraucht.
 */
export function firmennameSaeubern(roh: string | null): string | null {
  if (!roh) return null;

  // Entitäten ZUERST — „&ndash; AURORASOL GmbH" kam sonst mit dem Rohtext an.
  // Dann die unsichtbaren Zeichen: Baukästen wie Wix und Webflow setzen
  // Null-Breiten-Verbinder in Überschriften; im Namen sieht man sie nicht, aber
  // sie sortieren ihn an den Anfang der Liste.
  let s = entities(roh)
    .replace(/[​-‍﻿⁠­]/g, "")
    // Emojis und Schmuckzeichen — „KB Solartec GmbH ☀️ Impressum ❤️".
    .replace(/[←-⯿☀-➿️\u{1F000}-\u{1FAFF}]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Was gar kein Name sein kann: HTML-Reste und alles, was einen
  // Urheberrechtsvermerk trägt. Beide gemessen — „<p>© 2026 Avacon AG</p>"
  // stand so in der Liste.
  if (/<[^>]+>|&\w+;/.test(s)) return null;
  if (FREMDE_FIRMA.test(s)) return null;

  // VORSPANN-SÄTZE, die dem Namen vorangehen. Gefunden in der dritten Runde der
  // vollständigen Durchsicht — ein Impressum leitet den Namen gern mit einem
  // ganzen Satz ein: „Diese Webseite ist ein Angebot von Solartechnik Türpe
  // GbR", „Erklärungen gemäß § 5 Grüne Strahlen Memmingen GmbH", „Anschrift
  // (Firmensitz) Dachdeckerei Wilhelm GmbH".
  s = s.replace(
    /^(Diese (Webseite|Website|Seite) ist ein Angebot (von|der|des)|Erkl[äa]rungen gem[äa][ßss][^A-ZÄÖÜ]*|Angaben gem[äa][ßss][^A-ZÄÖÜ]*|Rechtliche Hinweise|Anschrift \(Firmensitz\)|Herausgeber|Willkommen bei|Herzlich willkommen bei)\s+/i,
    "",
  );
  // Baustellen- und Wartungsmeldungen HINTER dem Namen — „Stockner Solar is
  // under construction", „Photovoltaik Zentrum Bayern is under maintenance".
  s = s.replace(/\s+is under (construction|maintenance)\b.*$/i, "");
  // Werbe-Imperativ vor dem Namen — „Erleben Sie Elektro-Phase".
  s = s.replace(/^(Erleben|Entdecken|Besuchen|Vertrauen) Sie\s+/i, "");

  // Nachlaufende Feldbeschriftungen aus dem Impressum abschneiden.
  s = s.replace(
    /\s+(Adresse|Anschrift|Sitz|Telefon|E-?Mail|Vertreten durch|Gesch[äa]ftsf[üu]hr\w*|Registergericht|USt|Zum Inhalt springen)\b.*$/i,
    "",
  );

  // Führende und nachlaufende Trenner weg, BEVOR zerlegt wird — ein Titel wie
  // „| EK Fuchs Solar- & Elektrotechnik" ergibt sonst nur einen Teil, wird
  // deshalb nicht zerlegt und behält den Strich.
  // Auch Anführungszeichen und Pfeile: „» Palme Solar GmbH", „\"RNS-Energy GmbH\"".
  s = s
    .replace(/^[\s|·•–—:,;&+"'«»‹›→➤-]+/, "")
    .replace(/[\s|·•–—:,;"'«»‹›-]+$/, "");

  // An den üblichen Trennern zerlegen. Der Teil MIT Rechtsform gewinnt — gleich,
  // ob er vorn oder hinten steht.
  //
  // AB DREI TEILEN WIRD NICHT ZERLEGT. Dann sind die Striche keine
  // Seitentitel-Trenner, sondern eine Aufzählung IM Namen — und ein Schnitt
  // trifft mitten hinein. Gemessen: „Uwe Schmidt Elektroinstallation Gas |
  // Wasser | Sanitär GmbH - Elektromeisterbetrieb Berlin" wurde zu „Sanitär
  // GmbH". Das sah in der Liste aus wie ein Firmenname und war keiner. Bleibt
  // der ganze Ausdruck übrig und ist er zu lang, gibt es lieber gar keinen
  // Namen — die Liste zeigt dann die Adresse, und die stimmt.
  const teile = s
    // Das freistehende „I" ist in Seitentiteln ein Pipe-Ersatz, kein Buchstabe
    // („Elektrotechnik Birkefeld I Elektromeisterbetrieb in Ellrich"). Ohne
    // Punkt dahinter, damit eine Initiale („Elektro I. Müller") stehen bleibt.
    .split(/\s*[|·•ᐅ➤]\s*|\s+I\s+(?!\.)|\s+[–—]\s+|\s+-\s+|\s*:\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
  if (teile.length > 1) {
    const mitForm = teile.filter((t) => rechtsformVon(t));
    const kandidat =
      mitForm.length > 0
        ? mitForm.sort((a, b) => a.length - b.length)[0]
        : (teile.find(wirktWieName) ?? "");
    // EIN SCHNITT, DER FAST ALLES WEGNIMMT, IST VERDÄCHTIG.
    //
    // Die frühere Regel „ab vier Teilen nicht zerlegen" war eine Krücke und
    // machte die Reinigung überdies NICHT IDEMPOTENT: Ein bereits geputzter
    // Name hat einen Teil weniger, fällt beim zweiten Durchgang unter die
    // Schwelle und wird dann doch zerlegt. Gemessen am 29.08.2026 beim
    // Nachputzen des Bestands — aus „Uwe Schmidt Elektroinstallation Gas |
    // Wasser | Sanitär GmbH" wurde erneut „Sanitär GmbH", und aus „Elektro -
    // Blum Inh. Heiko Schmonsees - Bremerhaven" wurde „Elektro".
    //
    // Der Anteil misst dasselbe robuster und in einem Durchgang: Bleibt weniger
    // als ein Viertel übrig, war der Strich kein Titel-Trenner, sondern Teil des
    // Namens. Die Grenze ist an den gemessenen Fällen kalibriert — „Jendrian
    // Haustechnik" aus einem Werbetitel behält 29 %, „Sanitär GmbH" aus einer
    // Aufzählung nur 20 %.
    const genugUebrig = kandidat.length >= Math.max(12, s.length * 0.25);
    if (kandidat && genugUebrig) s = kandidat;
  }

  // Führende Seitenwörter — auch der Rest einer zerlegten Überschrift
  // („Impressum & Datenschutz" → „& Datenschutz").
  for (let i = 0; i < 3; i++) {
    const vorher = s;
    s = s
      .replace(/^[&+·\-–—:,;]+\s*/, "")
      .replace(SEITENWORT, "")
      // Ein KLEIN geschriebener Artikel vorn ist der Rest eines Satzes
      // („… der Klempau GmbH in Lübeck"), nie Teil des Namens. Groß
      // geschrieben bleibt er stehen — „Die Solarbauer GmbH" gibt es wirklich.
      .replace(/^(der|die|das|den|dem|des|ein|eine|einer)\s+/, "")
      .trim();
    if (s === vorher) break;
  }
  // Seitenwörter am ENDE — „KB Solartec GmbH Impressum Solaranlage nachhaltig".
  // ERST hier, nach der Zerlegung: Vorher angewandt fraß die Regel bei
  // „& Datenschutz - SED-Solar GmbH" den Namen gleich mit, weil sie beim ersten
  // Seitenwort ansetzt und alles dahinter wegwirft.
  const gekuerzt = s.replace(
    /\s+(Impressum|Datenschutz\w*|AGB|Startseite|Home)\b.*$/i,
    "",
  );
  if (gekuerzt.trim().length >= 2) s = gekuerzt;
  s = s.replace(/\s*[–—:,-]+\s*$/, "").trim();

  // NACH DER RECHTSFORM ENDET DER NAME.
  //
  // Die stärkste Einzelregel, gefunden beim Durchlesen der längsten Namen: Was
  // hinter „GmbH" steht, ist Anschrift, Telefonnummer, Menü oder Ortszusatz —
  // nie mehr der Name. Gemessene Beispiele: „Banik Haustechnik Schwabach GmbH
  // O´Brien-Straße 2 91126 Schwabach Deutschland", „Rieger & Kraft Solar GmbH
  // 09141 / 923 239 kontakt@…", „Soleno GmbH Soleno GmbH Leistungen Ratgeber
  // Über uns Kontakt".
  //
  // Die Zusätze, die WIRKLICH zur Rechtsform gehören, bleiben: „& Co. KG",
  // „(haftungsbeschränkt)", „mbH". Ohne sie würde aus „Muster GmbH & Co. KG"
  // ein „Muster GmbH", und das ist eine andere Gesellschaft.
  const rf = rechtsformVon(s);
  if (rf) {
    const treffer = RECHTSFORMEN.find((r) => r.name === rf)?.muster;
    const m = treffer ? s.match(treffer) : null;
    if (m && m.index !== undefined) {
      const bis = m.index + m[0].length;
      const rest = s.slice(bis);
      // Erlaubte Fortsetzungen der Rechtsform selbst.
      const fortsetzung = rest.match(
        /^(\s*&\s*Co\.?\s*KG|\s*\(haftungsbeschr[äa]nkt\)|\s*mbH|\s*i\.\s?G\.)*/i,
      );
      const ende = bis + (fortsetzung?.[0].length ?? 0);
      if (ende < s.length) s = s.slice(0, ende).trim().replace(/[,;·|-]+$/, "").trim();
    }
  }

  if (!s) return null;
  // Ohne Rechtsform gelten die strengeren Namensregeln; mit Rechtsform reicht,
  // dass neben ihr überhaupt etwas steht.
  if (!rechtsformVon(s)) {
    if (wirktWieName(s)) return s;
    // Letzter Versuch: Steht der Name vor dem Leistungsversprechen?
    const vorn = nameVorWerbung(s);
    return vorn && wirktWieName(vorn) ? vorn : null;
  }
  if (s.length > 80) return null;
  const ohneRechtsform = RECHTSFORMEN.reduce((t, rf) => t.replace(rf.muster, " "), s)
    .replace(/[\s&.,-]+/g, "")
    .trim();
  // Eine Rechtsform allein ist kein Name — „GmbH & Co. KG" stand so in der Liste.
  return ohneRechtsform.length >= 2 ? s : null;
}

// ─── E-Mail ──────────────────────────────────────────────────────────────────

/**
 * Adressen, die dem Betrieb nicht gehören.
 *
 * Zwei Fälle aus dem Eichlauf: eine Beispieladresse aus einem Formularhinweis
 * (`user@example.com`) und die Adresse des HOSTERS auf einer geparkten Domain
 * (`info@ionos.de`). Beide sähen in der Datenbank aus wie ein Kontaktweg und
 * wären beim ersten Anschreiben peinlich.
 */
export const FREMDE_MAILDOMAINS =
  /@(example\.(com|org|de)|ionos\.de|1und1\.de|strato\.de|wordpress\.(com|org)|jimdo\.com|wix\.com|godaddy\.com|sentry\.io|domain\.de|muster(mann)?\.de|test\.de)$/i;

export function mailBrauchbar(mail: string): boolean {
  if (FREMDE_MAILDOMAINS.test(mail)) return false;
  if (/^(noreply|no-reply|postmaster|abuse)@/i.test(mail)) return false;
  return true;
}

/**
 * Die beste E-Mail aus einer Kandidatenliste.
 *
 * Eine Adresse auf der EIGENEN Domain gewinnt. Ohne diese Reihenfolge gewinnt
 * die erste im Text — und das war im Eichlauf zweimal die falsche.
 */
export function besteMail(kandidaten: string[], domain: string): string | null {
  const brauchbar = kandidaten
    .map((m) => m.toLowerCase().replace(/[.,;:)]+$/, ""))
    .filter(mailBrauchbar);
  const kern = domain.split(".").slice(-2)[0];
  return (
    brauchbar.find((m) => m.endsWith("@" + domain)) ??
    brauchbar.find((m) => m.includes("@" + kern)) ??
    brauchbar[0] ??
    null
  );
}

// ─── Gründungsjahr ───────────────────────────────────────────────────────────

/**
 * „seit 20XX" allein ist KEIN Gründungsjahr.
 *
 * Der Eichlauf lieferte drei Fehlgriffe nach demselben Muster: Das Hamburger
 * Abendblatt bekam 2021, zwei Betriebe 2024 und 2025 — aus Sätzen wie „seit 2021
 * im Amt" oder einem Copyright-Vermerk. Ein Gründungsjahr aus einem beliebigen
 * „seit"-Satz ist von einem echten nicht mehr zu unterscheiden, sobald es in der
 * Spalte steht, und es ist genau die Zahl, mit der später ein Anschreiben
 * argumentieren würde („seit über 30 Jahren").
 *
 * Deshalb zwei Wege: ein ausdrückliches Gründungswort, oder „seit" in
 * unmittelbarer Nähe eines Betriebsworts. Und ein Jahr aus den letzten zwei
 * Jahren gilt NUR mit ausdrücklichem Gründungswort — „seit 2025" ist fast immer
 * etwas anderes.
 *
 * Das ÄLTESTE gültige Jahr gewinnt: Wo mehrere stehen, ist das jüngere meist ein
 * Meilenstein („seit 2019 auch Wärmepumpen").
 */
export function gruendungsjahrAus(
  text: string,
  jetzt: number,
): { jahr: number; index: number } | null {
  const kandidaten: { jahr: number; index: number; ausdruecklich: boolean }[] = [];
  let m: RegExpExecArray | null;

  // Das Gründungswort steht mal VOR dem Jahr („gegründet 1992"), mal DAHINTER
  // („wurde 1992 gegründet") — und die zweite Form ist im Deutschen die
  // häufigere. Sie fehlte in der ersten Fassung; der Test hat es gefangen,
  // bevor der Lauf reihenweise leere Gründungsjahre geschrieben hätte.
  const reAusVor =
    /(?:gegr[üu]ndet(?:\s+(?:im\s+Jahr|am))?[^\n\d]{0,20}|Gr[üu]ndungsjahr[:\s]+|Firmengr[üu]ndung[:\s]+)(19[3-9]\d|20[0-2]\d)\b/gi;
  while ((m = reAusVor.exec(text))) {
    kandidaten.push({ jahr: Number(m[1]), index: m.index, ausdruecklich: true });
  }
  // Die Nähe ist eng gefasst: „Im Jahr 2020 wurde die Halle gebaut, der Betrieb
  // wurde gegründet …" darf das Jahr nicht einsammeln.
  const reAusNach = /\b(19[3-9]\d|20[0-2]\d)\b[^\n]{0,20}?gegr[üu]ndet/gi;
  while ((m = reAusNach.exec(text))) {
    kandidaten.push({ jahr: Number(m[1]), index: m.index, ausdruecklich: true });
  }

  const reSeitVor =
    /\bseit\s+(?:[üu]ber\s+)?(19[3-9]\d|20[0-2]\d)\b[^\n]{0,60}?\b(?:f[üu]r Sie|am Markt|t[äa]tig|Ihr |unser|Betrieb|Familienbetrieb|Meisterbetrieb|Erfahrung|Handwerk)/gi;
  while ((m = reSeitVor.exec(text))) {
    kandidaten.push({ jahr: Number(m[1]), index: m.index, ausdruecklich: false });
  }

  const reSeitNach =
    /\b(?:Familienbetrieb|Meisterbetrieb|Fachbetrieb|Unternehmen|Erfahrung)\b[^\n]{0,60}?\bseit\s+(?:[üu]ber\s+)?(19[3-9]\d|20[0-2]\d)\b/gi;
  while ((m = reSeitNach.exec(text))) {
    kandidaten.push({ jahr: Number(m[1]), index: m.index, ausdruecklich: false });
  }

  const gueltig = kandidaten.filter(
    (k) => k.jahr >= 1930 && k.jahr <= jetzt && (k.ausdruecklich || k.jahr <= jetzt - 2),
  );
  gueltig.sort((a, b) => a.jahr - b.jahr);
  return gueltig[0] ? { jahr: gueltig[0].jahr, index: gueltig[0].index } : null;
}

// ─── Handwerkskammer ─────────────────────────────────────────────────────────

/**
 * Nach „Handwerkskammer" muss ein Kammerbezirk stehen, kein Zwischentitel.
 *
 * Im Eichlauf landete „Handwerkskammer Berufsrechtliche Regelungen" in der
 * Spalte — das Muster hatte die nächste ÜBERSCHRIFT gefressen. Ein Kammername
 * ist ein Ortsname; die Stoppwörter sind genau die Formulierungen, die im
 * Impressum in der Zeile darunter stehen.
 */
const HWK_STOPP =
  /^(Berufsrechtlich|Zust[äa]ndig|Kammer|Aufsicht|Angaben|Gesetzliche|Regelungen|Berufsbezeichnung|Die |Der |Das |Weitere|Informationen|Verantwortlich|Mitglied|IHK|Industrie)/;

export function handwerkskammerAus(text: string): { name: string; index: number } | null {
  const m = text.match(/Handwerkskammer\s+(?:f[üu]r\s+)?([A-ZÄÖÜ][A-Za-zÄÖÜäöüß.\-/ ]{2,40})/);
  if (!m) return null;
  const kandidat = m[1].trim().replace(/\s+/g, " ");
  if (!kandidat || HWK_STOPP.test(kandidat)) return null;
  return { name: ("Handwerkskammer " + kandidat).slice(0, 80), index: m.index ?? 0 };
}

// ─── Merkmale und Einordnung ─────────────────────────────────────────────────

export const ZERTIFIKATE: { name: string; muster: RegExp }[] = [
  { name: "E-CHECK", muster: /\bE-?CHECK\b/i },
  { name: "VDE", muster: /\bVDE\b/ },
  { name: "ISO 9001", muster: /ISO\s?9001/i },
  { name: "SHK-Fachbetrieb", muster: /SHK[- ]Fachbetrieb/i },
  { name: "Innungsfachbetrieb", muster: /Innungsfachbetrieb/i },
  { name: "TÜV-geprüft", muster: /T[ÜU]V[- ]?(gepr[üu]ft|zertifiziert)/i },
  { name: "Fachbetrieb nach WHG", muster: /Fachbetrieb nach\s*§?\s*(19l|62)?\s*WHG/i },
];

/**
 * Das GEWERK — was für ein Handwerksbetrieb das ist.
 *
 * Zu unterscheiden von den Geschäftsfeldern darunter: Die sagen, WAS angeboten
 * wird (Photovoltaik, Speicher, Wallbox), das Gewerk sagt, WER es anbietet. Ein
 * Elektrobetrieb, ein Dachdecker und ein reiner Solarteur bauen dieselbe Anlage
 * und sind drei verschiedene Gesprächspartner.
 *
 * Angelegt am 28.08.2026 auf Vorgabe des Betreibers, weil die Erhebung später um
 * Heizungsbauer und weitere Gewerke wachsen soll. Ein Betrieb kann MEHRERE
 * tragen — „Elektro und Sanitär" ist im Handwerk der Normalfall, und die
 * Alternative wäre, sich für eines zu entscheiden und das andere zu verlieren.
 *
 * Die Muster greifen auf Firmenname, Navigation und Impressum. Sie sind bewusst
 * eng: Ein Betrieb, dessen Gewerk nirgends steht, bekommt KEINES — die leere
 * Liste ist eine ehrliche Auskunft, eine geratene Einordnung wäre es nicht.
 */
export const GEWERKE: { name: string; text: string; muster: RegExp }[] = [
  {
    name: "solarteur",
    text: "Solarteur",
    muster: /\b(Solarteur|Solarfachbetrieb|Solartechnik|PV-Fachbetrieb|Photovoltaikbetrieb)\b/i,
  },
  {
    name: "elektro",
    text: "Elektrobetrieb",
    // „Elektro" ALLEIN muss mit — „Elektro Klaas GmbH" ist die häufigste
    // Schreibweise im Handwerk, und die erste Fassung verlangte ein Suffix und
    // fand sie deshalb nicht. Die Wortgrenze dahinter hält „Elektroauto" und
    // „Elektromobilität" heraus, die auf jeder zweiten Solarteur-Seite stehen
    // und kein Gewerk sind.
    muster: /\bElektro\b|\bElektro(technik|installation|meister|betrieb|anlagen|handwerk)\b|\bElektriker\b|\bE-Handwerk\b/i,
  },
  {
    name: "heizung_sanitaer",
    text: "Heizung/Sanitär",
    muster: /\b(Heizungsbau|Sanit[äa]r|SHK|Heizung und Sanit[äa]r|Installateur und Heizungsbauer|Haustechnik)\b/i,
  },
  {
    name: "dachdecker",
    text: "Dachdecker",
    // „Dachdeckerei" ist die gebräuchlichste Form und fiel durch, solange das
    // Muster nur auf „Dachdecker" mit Wortgrenze prüfte.
    muster: /\bDachdecker(ei|meister|betrieb)?\b|\bDachbau\b|\bBedachung(en)?\b/i,
  },
  {
    name: "zimmerei",
    text: "Zimmerei",
    muster: /\b(Zimmerei|Zimmerer|Holzbau|Dachstuhl)\b/i,
  },
  {
    name: "energieberatung",
    text: "Energieberatung",
    muster: /\b(Energieberat|Energieeffizienz-?Experte|Geb[äa]udeenergieberat)/i,
  },
];

export const FELDER: { name: string; muster: RegExp }[] = [
  { name: "photovoltaik", muster: /\b(photovoltaik|solaranlage|pv-anlage|solarstrom)\b/i },
  { name: "speicher", muster: /\b(stromspeicher|batteriespeicher|speicherl[öo]sung)\b/i },
  { name: "waermepumpe", muster: /\bw[äa]rmepumpe/i },
  { name: "wallbox", muster: /\b(wallbox|ladestation|ladeinfrastruktur)\b/i },
  { name: "balkonkraftwerk", muster: /\b(balkonkraftwerk|steckersolar)\b/i },
];

/**
 * Wer erkennbar KEIN Fachbetrieb ist.
 *
 * Der Eichlauf hat gezeigt, warum das nötig ist: `heidel-solar.de` trägt „solar"
 * im Namen, steht in der Wettbewerbsmessung unter „Solarteure" — und ist eine
 * ehrenamtliche Balkonstrom-Initiative einer Energiegenossenschaft, die
 * ausdrücklich keine Beratung anbietet. Eine Namensheuristik hätte sie
 * durchgelassen. Ebenso landeten Ämter, eine Tageszeitung und ein
 * Vermittlungsportal in der Trefferliste.
 */
export const KEIN_BETRIEB: { grund: string; muster: RegExp }[] = [
  {
    grund: "Kommune/Behörde",
    muster:
      /\b(Stadtverwaltung|Landratsamt|Gemeindeverwaltung|Amtsverwaltung|Rathaus|Der B[üu]rgermeister|K[öo]rperschaft des [öo]ffentlichen Rechts|Amtsdirektor)\b/,
  },
  {
    grund: "Genossenschaft/Verein/Initiative",
    muster: /\b(e\.\s?V\.|Genossenschaft|B[üu]rgerenergie|ehrenamtlich)\b/,
  },
  {
    grund: "Vergleichs-/Vermittlungsportal",
    muster:
      /\b(Angebote vergleichen|kostenlos vergleichen|bis zu (drei|3|f[üu]nf|5) (kostenlose )?Angebote|Anbieter vergleichen|Handwerker finden|Fachbetriebe? in Ihrer N[äa]he finden|Jetzt Anbieter finden)\b/i,
  },
  {
    grund: "Presse/Verlag",
    muster:
      /\b(Zeitungsverlag|Chefredakt|Nachrichten aus|Redaktionsleitung|Anzeigenblatt|Verlagsleitung|Verantwortlich im Sinne des Presserechts)\b/,
  },
  {
    // Nachgetragen, nachdem die Streuungsmessung sie durchgelassen hatte: Ein
    // Lead-Vermittler wirbt regional wie ein Betrieb und erscheint deshalb in
    // wenigen Kreisen. Erkennbar ist er nicht an der Streuung, sondern daran,
    // dass er das Vermitteln selbst benennt („Leads Navigator GmbH").
    grund: "Lead-Vermittlung",
    muster: /\b(Leads?[- ]?(Navigator|Generierung|Vermittlung)|Auftragsvermittlung|Anfragen vermitteln|Wir vermitteln Ihnen)\b/i,
  },
  {
    // Der größte Einzelposten der Restklasse: kommunale Solarkataster. Sie laden
    // ihre Karte per Skript, liefern deshalb kein Photovoltaik-Wort im HTML und
    // landeten alle auf „unklar". Es sind Auskunftsangebote von Landkreisen und
    // Städten — nie ein Fachbetrieb, aber auch kein Fehler der Suche: Auf
    // „Photovoltaik <Landkreis>" gehören sie zu Recht nach oben.
    grund: "Solarkataster/Geoportal",
    muster:
      /\b(Solarkataster|Solarpotenzialkataster|Solardachkataster|Energieatlas|Geoportal|Solarpotenzial(analyse|karte))\b/i,
  },
];

/**
 * Erkennt eine Kartenanwendung auch dann, wenn sie es nur im Namen sagt.
 *
 * Die Startseiten dieser Anwendungen enthalten oft NICHTS außer einem
 * Skript-Container — dort greift kein Textmuster. Der Domainname sagt es
 * trotzdem eindeutig genug: „solarkataster-muenster.de" ist kein Betrieb.
 * Bewusst eng auf zusammengesetzte Wörter, damit ein Betrieb namens
 * „solar-mueller.de" nicht hineinfällt.
 */
/**
 * Was die NAVIGATION einer Seite verrät — Adressen und Beschriftungen der Links.
 *
 * Der entscheidende Unterschied zum sichtbaren Text: Die Navigation ist fast
 * immer statisch im HTML, auch wenn der Inhalt per Skript nachgeladen wird. Ein
 * Elektrobetrieb, dessen Startseite uns leer erscheint, hat „Photovoltaik"
 * trotzdem im Menü stehen — oder wenigstens einen Menüpunkt, der dorthin führt.
 *
 * Gemessen am 28.08.2026: Der erste Anlauf prüfte das Gewerk auf der
 * KONTAKTSEITE und löste damit fast nichts auf — dort steht das Angebot
 * naturgemäß nicht. Offensichtliche Elektrobetriebe blieben auf „unklar".
 */
export function navigationsText(html: string): string {
  const teile: string[] = [];
  const re = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const href = entities(m[1]);
    // Adressen werden entschlüsselt, damit „/photovoltaik-l%C3%B6sungen" als
    // Wort lesbar wird — aber ein einzelnes kaputtes Prozentzeichen in einem
    // fremden Link wirft, und das riss am 28.08.2026 einen Lauf nach 450 von
    // 1.254 Domains ab. Im Zweifel die rohe Adresse nehmen.
    try {
      teile.push(decodeURIComponent(href));
    } catch {
      teile.push(href);
    }
    teile.push(entities(m[2].replace(/<[^>]+>/g, " ")).trim());
  }
  const titel = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titel) teile.push(entities(titel[1]));
  const beschr = html.match(
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i,
  );
  if (beschr) teile.push(entities(beschr[1]));
  return teile.join(" \n ").replace(/[ \t]+/g, " ");
}

/**
 * Die Adresse des Favicons — GELESEN, nicht geraten.
 *
 * Dieselbe Lehre wie beim Impressum: `/favicon.ico` ist nur eine von mehreren
 * Konventionen. Gemessen an 120 Betrieben (28.08.2026) tragen 110 ein Icon im
 * HTML — aber viele unter einem eigenen Pfad, als PNG oder SVG, oft mit
 * Zeitstempel im Namen. Wer den Standardpfad rät, bekommt bei einem großen Teil
 * nichts und hält das für „hat kein Logo".
 */
export function faviconUrl(html: string, basis: string): string | null {
  const kandidaten: { url: string; punkte: number }[] = [];
  for (const m of html.matchAll(/<link\b([^>]*)>/gi)) {
    const attr = m[1];
    const rel = attr.match(/rel=["']([^"']+)["']/i)?.[1]?.toLowerCase() ?? "";
    if (!/\bicon\b/.test(rel)) continue;
    const href = attr.match(/href=["']([^"']+)["']/i)?.[1];
    if (!href) continue;
    // Ein großes Icon ist schärfer; „apple-touch-icon" ist meist das größte.
    let p = 50;
    if (/apple-touch-icon/.test(rel)) p = 80;
    else if (/\bshortcut\b/.test(rel)) p = 60;
    const groesse = attr.match(/sizes=["'](\d+)x/i)?.[1];
    if (groesse) p += Math.min(30, Number(groesse) / 8);
    try {
      kandidaten.push({ url: new URL(entities(href), basis).toString(), punkte: p });
    } catch {
      /* unbrauchbare Adresse */
    }
  }
  kandidaten.sort((a, b) => b.punkte - a.punkte);
  return kandidaten[0]?.url ?? null;
}

export function istKartenanwendung(domain: string): boolean {
  return /(^|[.-])(solar|photovoltaik|pv)[-_]?(kataster|potenzial|potential|atlas)([.-]|$)|(^|[.-])geoportal|(^|[.-])energieatlas/i.test(
    domain,
  );
}

// ─── Ortsname normalisieren (für die PLZ-Zuordnung) ──────────────────────────

/**
 * Eine Bewertung aus den STRUKTURIERTEN DATEN der eigenen Website.
 *
 * Der einzige zulässige Weg, die Bewertungsquote zu erhöhen. Google selbst
 * bleibt gesperrt (Maps Platform Terms 3.2.3), aber viele Betriebe tragen ihre
 * Bewertung als `AggregateRating` nach schema.org in ihr eigenes HTML — als
 * JSON-LD oder als Microdata. Das ist eine Selbstauskunft auf einer öffentlichen
 * Seite, genau wie eine Zahl im Fließtext, nur maschinenlesbar.
 *
 * GEMESSEN an 120 Betrieben (28.08.2026): 6 mit JSON-LD, 3 mit Microdata, also
 * rund 7,5 %. Das verdreifacht die bisherige Quote und bleibt trotzdem eine
 * Minderheit — die Erwartung „jeder Betrieb bekommt Sterne" erfüllt kein
 * zulässiger Weg.
 *
 * Die Herkunft wird MITGEFÜHRT und nicht verwischt: Was der Betrieb selbst
 * ausweist, heißt „eigene Website", nie „Google-Bewertung" — auch dann nicht,
 * wenn er seine Google-Sterne dort wiedergibt. Wir haben die Zahl von ihm, nicht
 * von Google.
 */
export function bewertungAusDaten(
  html: string,
): { wert: number; anzahl: number } | null {
  const kandidaten: { wert: number; anzahl: number }[] = [];

  // JSON-LD: "ratingValue": 4.8, "reviewCount": 37 (oder ratingCount).
  for (const block of html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    const roh = block[1];
    const w = roh.match(/"ratingValue"\s*:\s*"?([\d.,]+)"?/i);
    const n = roh.match(/"(?:reviewCount|ratingCount)"\s*:\s*"?(\d+)"?/i);
    if (w && n) {
      kandidaten.push({ wert: Number(w[1].replace(",", ".")), anzahl: Number(n[1]) });
    }
  }

  // Microdata: itemprop="ratingValue" content="4.8"
  const mw = html.match(/itemprop=["']ratingValue["'][^>]*content=["']([\d.,]+)["']/i);
  const mn = html.match(/itemprop=["'](?:reviewCount|ratingCount)["'][^>]*content=["'](\d+)["']/i);
  if (mw && mn) {
    kandidaten.push({ wert: Number(mw[1].replace(",", ".")), anzahl: Number(mn[1]) });
  }

  // Nur plausible Werte: eine Fünferskala und mindestens eine Bewertung.
  // Ein `ratingValue` von 100 stammt aus einer Prozentskala und ließe sich nicht
  // mit den übrigen vergleichen.
  const gueltig = kandidaten.filter(
    (k) => k.wert >= 1 && k.wert <= 5 && k.anzahl >= 1 && k.anzahl < 100000,
  );
  return gueltig[0] ?? null;
}

export function normOrt(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]/g, "");
}

// ─── Das Profil ──────────────────────────────────────────────────────────────

export interface Beleg {
  merkmal: string;
  wert: string;
  fundstelle: string;
  textstelle: string | null;
}

export interface Profil {
  domain: string;
  firmenname: string | null;
  rechtsform: string | null;
  hr_gericht: string | null;
  hr_nummer: string | null;
  ust_id: string | null;
  strasse: string | null;
  plz: string | null;
  ort: string | null;
  impressum_url: string | null;
  favicon_url: string | null;
  telefon: string | null;
  email: string | null;
  gruendungsjahr: number | null;
  meisterbetrieb: boolean | null;
  innung: string | null;
  handwerkskammer: string | null;
  installateurverzeichnis: boolean | null;
  zertifikate: string[] | null;
  bewertung_wert: number | null;
  bewertung_anzahl: number | null;
  bewertung_quelle: string | null;
  geschaeftsfelder: string[] | null;
  gewerke: string[] | null;
  art: string | null;
  art_grund: string | null;
  belege: Beleg[];
}

function stelle(text: string, index: number, laenge = 160): string {
  const von = Math.max(0, index - 60);
  return text.slice(von, von + laenge).replace(/\s+/g, " ").trim();
}

export interface Seite {
  html: string;
  url: string;
}

/**
 * Aus Startseite und Impressum ein Profil ableiten.
 *
 * BEIDE Seiten werden gelesen, und das ist der Kern: Beim Eichen stand in
 * KEINEM der drei geprüften Impressen die Handwerkskammer, obwohl § 5 Abs. 1
 * Nr. 5 DDG sie für zulassungspflichtige Handwerke verlangt. Meisterbetrieb,
 * Gründungsjahr und Einzugsgebiet standen dagegen im Marketing-Text der
 * Startseite. Wer nur das Impressum liest, bekommt Rechtsform und Anschrift und
 * sonst nichts.
 */
export function profilAus(domain: string, start: Seite, imp: Seite | null, jetzt: number): Profil {
  const startText = sichtbarerText(start.html);
  const impText = imp ? sichtbarerText(imp.html) : "";
  const belege: Beleg[] = [];
  const p: Profil = {
    domain,
    firmenname: null,
    rechtsform: null,
    hr_gericht: null,
    hr_nummer: null,
    ust_id: null,
    strasse: null,
    plz: null,
    ort: null,
    impressum_url: imp?.url ?? null,
    favicon_url: null,
    telefon: null,
    email: null,
    gruendungsjahr: null,
    meisterbetrieb: null,
    innung: null,
    handwerkskammer: null,
    installateurverzeichnis: null,
    zertifikate: null,
    bewertung_wert: null,
    bewertung_anzahl: null,
    bewertung_quelle: null,
    geschaeftsfelder: null,
    gewerke: null,
    art: null,
    art_grund: null,
    belege,
  };

  const add = (merkmal: string, wert: string, quelle: string, text: string, idx: number) => {
    belege.push({ merkmal, wert, fundstelle: quelle, textstelle: stelle(text, idx) });
  };

  // ── Impressum: Rechtsform, Register, Anschrift ───────────────────────────
  const q = imp?.url ?? start.url;
  const t = impText || startText;

  // Der Anbieter steht OBEN im Impressum. Weiter unten folgen Haftung,
  // Bildrechte, Webdesign — und dort stehen fremde Firmen. 60 Zeilen weit zu
  // suchen war der Grund, aus dem ein Bildrechte-Vermerk als Firmenname endete.
  const impZeilen = t.split("\n");
  for (let i = 0; i < Math.min(impZeilen.length, 25); i++) {
    const zeile = impZeilen[i];
    const rf = rechtsformVon(zeile);
    if (!rf || zeile.length >= 90) continue;
    // Die Zeile selbst UND ihre Nachbarn dürfen keine fremde Firma benennen:
    // „Bildrechte" steht oft eine Zeile über dem Namen, nicht in derselben.
    const umfeld = impZeilen.slice(Math.max(0, i - 1), i + 2).join(" ");
    if (FREMDE_FIRMA.test(umfeld)) continue;
    const name = firmennameSaeubern(zeile);
    if (!name) continue;
    p.firmenname = name;
    p.rechtsform = rf;
    // DER BELEG TRÄGT DIE ROHE ZEILE, NICHT DEN GEPUTZTEN NAMEN.
    //
    // Vorher stand hier das Ergebnis der Reinigung — also unser Urteil, nicht
    // der Fund. Damit war jede Verbesserung der Reinigung einbahnig: Wer den
    // Bestand nachputzt, putzt ein zweites Mal, was schon geputzt war, und ein
    // Fehlgriff ist unwiederbringlich. Gemessen am 29.08.2026, als eine zu
    // breite Werbesatz-Regel aus „Welt in Elbe-Elster e.V." ein „Welt" machte
    // und der Rohfund nirgends mehr stand.
    add("firmenname", zeile.trim(), q, t, t.indexOf(zeile));
    break;
  }
  if (!p.firmenname) {
    // Rückfall auf den Seitentitel — der trägt fast immer Beiwerk („Home |“,
    // „Impressum -“), deshalb durch dieselbe Reinigung.
    //
    // MIT EIGENEM MERKMAL, damit ein Nachputz die Herkunft noch unterscheiden
    // kann: Der Impressum-Fund schlägt den Titel-Fund, und das muss auch dann
    // noch gelten, wenn beide nur als Beleg vorliegen. Der Titel bekam bis zum
    // 29.08.2026 gar keinen Beleg — genau die zwei Namen, die der Fehlgriff
    // oben verkürzt hatte, waren deshalb nicht wiederherstellbar.
    const ti = start.html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (ti) {
      const roh = entities(ti[1]).replace(/\s+/g, " ").trim();
      p.firmenname = firmennameSaeubern(roh);
      if (roh) add("firmenname-titel", roh, start.url, roh, 0);
    }
  }

  const hr = t.match(/\bHR([AB])\s*[:\-]?\s*(\d{1,7})\b/);
  if (hr) {
    p.hr_nummer = `HR${hr[1]} ${hr[2]}`;
    add("handelsregister", p.hr_nummer, q, t, hr.index ?? 0);
  }
  const ag = t.match(/Amtsgericht\s+([A-ZÄÖÜ][A-Za-zÄÖÜäöüß.\-/ ]{2,28})/);
  if (ag) p.hr_gericht = ag[1].trim().replace(/\s+(HRB|HRA).*$/, "");

  const ust = t.match(/\bDE\s?\d{9}\b/);
  if (ust) {
    p.ust_id = ust[0].replace(/\s/g, "");
    add("ust_id", p.ust_id, q, t, ust.index ?? 0);
  }

  const zeilen = t.split("\n");
  for (let i = 0; i < zeilen.length; i++) {
    const m = zeilen[i].match(/^(\d{5})\s+([A-ZÄÖÜ][A-Za-zÄÖÜäöüß.\-/() ]{1,45})$/);
    if (!m) continue;
    p.plz = m[1];
    p.ort = m[2].trim();
    const vor = zeilen[i - 1] ?? "";
    if (/\d/.test(vor) && vor.length < 60 && !/^\d{5}/.test(vor)) p.strasse = vor.trim();
    add("anschrift", `${p.strasse ?? ""} ${p.plz} ${p.ort}`.trim(), q, t, t.indexOf(zeilen[i]));
    break;
  }

  const tel = t.match(/(?:Tel(?:efon)?\.?|Fon)[:\s]*(\+?[\d\s()/.\-]{7,24})/i);
  if (tel) p.telefon = tel[1].replace(/\s+/g, " ").trim();

  p.email = besteMail(
    [
      ...Array.from(t.matchAll(/[\w.+-]+@[\w-]+\.[\w.-]{2,}/g), (m) => m[0]),
      ...Array.from(
        (imp?.html ?? start.html).matchAll(/mailto:([\w.+-]+@[\w-]+\.[\w.-]{2,})/g),
        (m) => m[1],
      ),
    ],
    domain,
  );

  // ── Trust-Signale aus BEIDEN Seiten ──────────────────────────────────────
  const beide: { text: string; quelle: string }[] = [
    { text: startText, quelle: start.url },
    ...(imp ? [{ text: impText, quelle: imp.url }] : []),
  ];

  for (const { text, quelle } of beide) {
    const meister = text.match(
      /\b(Meisterbetrieb|Elektromeisterbetrieb|Elektromeister|Meisterbrief|Innungsbetrieb)\b/i,
    );
    if (meister && p.meisterbetrieb === null) {
      p.meisterbetrieb = true;
      add("meisterbetrieb", meister[1], quelle, text, meister.index ?? 0);
    }

    if (p.gruendungsjahr === null) {
      const g = gruendungsjahrAus(text, jetzt);
      if (g) {
        p.gruendungsjahr = g.jahr;
        add("gruendungsjahr", String(g.jahr), quelle, text, g.index);
      }
    }

    const innung = text.match(
      /\b(?:Mitglied der\s+)?(Elektro-?Innung|Innung f[üu]r [A-ZÄÖÜ][\wäöüß\- ]{3,40}|Innung des [A-ZÄÖÜ][\wäöüß\- ]{3,40})/,
    );
    if (innung && !p.innung) {
      p.innung = innung[1].trim();
      add("innung", p.innung, quelle, text, innung.index ?? 0);
    }

    if (!p.handwerkskammer) {
      const h = handwerkskammerAus(text);
      if (h) {
        p.handwerkskammer = h.name;
        add("handwerkskammer", h.name, quelle, text, h.index);
      }
    }

    const iv = text.match(
      /\b(Installateurverzeichnis|eingetragener?\s+Installateur|Installateurausweis|beim Netzbetreiber eingetragen)\b/i,
    );
    if (iv && p.installateurverzeichnis === null) {
      p.installateurverzeichnis = true;
      add("installateurverzeichnis", iv[1], quelle, text, iv.index ?? 0);
    }

    for (const z of ZERTIFIKATE) {
      const m = text.match(z.muster);
      if (!m) continue;
      if (!p.zertifikate) p.zertifikate = [];
      if (!p.zertifikate.includes(z.name)) {
        p.zertifikate.push(z.name);
        add("zertifikat", z.name, quelle, text, m.index ?? 0);
      }
    }

    // Bewertung NUR als Selbstauskunft dieser Website — nie aus Google geholt.
    // Google Maps Platform Terms 3.2.3(a)(iii) untersagt das Speichern von
    // Reviews, (d)(iii) die Nutzung in einem Verzeichnisdienst.
    if (p.bewertung_wert === null) {
      const b =
        text.match(
          /(\d[,.]\d)\s*(?:von\s*5|\/\s*5|Sterne)[^\n]{0,80}?(\d{1,5})\s*(?:Bewertungen|Rezensionen)/i,
        ) ??
        text.match(
          /(\d{1,5})\s*(?:Bewertungen|Rezensionen)[^\n]{0,80}?(\d[,.]\d)\s*(?:von\s*5|\/\s*5|Sterne)/i,
        );
      if (b) {
        const a = Number(b[1].replace(",", "."));
        const c = Number(b[2].replace(",", "."));
        const wert = a <= 5 ? a : c;
        const anzahl = a <= 5 ? c : a;
        if (wert >= 1 && wert <= 5 && anzahl >= 1) {
          p.bewertung_wert = wert;
          p.bewertung_anzahl = Math.round(anzahl);
          p.bewertung_quelle = "eigene-website";
          add("bewertung", `${wert} / ${Math.round(anzahl)}`, quelle, text, b.index ?? 0);
        }
      }
    }
  }

  p.favicon_url = faviconUrl(start.html, start.url);

  const felder = FELDER.filter((f) => f.muster.test(startText)).map((f) => f.name);
  p.geschaeftsfelder = felder.length ? felder : null;

  // Das GEWERK steht selten im Fließtext der Startseite, sehr oft aber im
  // Firmennamen („Elektro Klaas GmbH") und in der Navigation. Deshalb wird
  // beides gelesen, dazu das Impressum — dort steht bei zulassungspflichtigen
  // Handwerken die Berufsbezeichnung.
  const gewerkQuelle = [p.firmenname ?? "", navigationsText(start.html), startText, impText].join(
    "\n",
  );

  // Bewertung aus den strukturierten Daten — nachgezogen, falls im Fließtext
  // keine stand. Beides ist Selbstauskunft der Website; die strukturierte Form
  // ist nur die verlässlichere.
  if (p.bewertung_wert === null) {
    const b = bewertungAusDaten(start.html) ?? (imp ? bewertungAusDaten(imp.html) : null);
    if (b) {
      p.bewertung_wert = b.wert;
      p.bewertung_anzahl = b.anzahl;
      p.bewertung_quelle = "eigene-website";
      belege.push({
        merkmal: "bewertung",
        wert: `${b.wert} / ${b.anzahl}`,
        fundstelle: start.url,
        textstelle: "als strukturierte Daten (schema.org) im HTML der eigenen Seite",
      });
    }
  }
  const gewerke = GEWERKE.filter((g) => g.muster.test(gewerkQuelle));
  p.gewerke = gewerke.length ? gewerke.map((g) => g.name) : null;
  for (const g of gewerke) {
    const m = gewerkQuelle.match(g.muster);
    if (m) add("gewerk", g.name, start.url, gewerkQuelle, m.index ?? 0);
  }

  // ── Rückstufung: zwei Stufen, und der Unterschied ist der Punkt ──────────
  //
  // „Wir haben nichts gefunden" ist nicht dasselbe wie „es ist keiner". Eine
  // Startseite, die ihren Inhalt erst per Skript nachlädt, liefert uns gar
  // nichts — sie deshalb als Nicht-Betrieb abzustempeln wäre ein Urteil ohne
  // Messung (im Eichlauf traf es einen Hersteller von Solardachziegeln). Ein
  // erkanntes Kommunal-, Verlags- oder Portalmuster ist dagegen ein Befund.
  for (const k of KEIN_BETRIEB) {
    const m = (startText + "\n" + impText).match(k.muster);
    if (m) {
      p.art = "kein-betrieb";
      p.art_grund = `${k.grund} („${m[0].slice(0, 60)}")`;
      return p;
    }
  }
  if (!felder.includes("photovoltaik") && !felder.includes("balkonkraftwerk")) {
    p.art = "unklar";
    p.art_grund = "kein Photovoltaik-Wort im ausgelieferten HTML — von Hand ansehen";
  }

  return p;
}
