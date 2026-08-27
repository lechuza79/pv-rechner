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
  { name: "GmbH", muster: /\bGmbH\b/ },
  { name: "UG (haftungsbeschränkt)", muster: /\bUG\s*\(haftungsbeschr[äa]nkt\)/ },
  { name: "UG", muster: /\bUG\b/ },
  { name: "AG", muster: /\bAG\b/ },
  { name: "OHG", muster: /\bOHG\b/ },
  { name: "KG", muster: /\bKG\b/ },
  { name: "GbR", muster: /\bGbR\b/i },
  { name: "eG", muster: /\beG\b|\be\.\s?G\./ },
  { name: "e.K.", muster: /\be\.\s?K(fm|fr)?\./ },
];

export function rechtsformVon(name: string): string | null {
  for (const rf of RECHTSFORMEN) {
    if (rf.muster.test(name)) return rf.name;
  }
  return null;
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
  /^(Berufsrechtlich|Zust[äa]ndig|Kammer|Aufsicht|Angaben|Gesetzliche|Regelungen|Berufsbezeichnung|Die |Der |Das |Weitere|Informationen|Verantwortlich|Mitglied)/;

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
    muster: /\b(Zeitungsverlag|Chefredakt|Nachrichten aus|Redaktionsleitung)\b/,
  },
];

// ─── Ortsname normalisieren (für die PLZ-Zuordnung) ──────────────────────────

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

  for (const zeile of t.split("\n").slice(0, 60)) {
    const rf = rechtsformVon(zeile);
    if (rf && zeile.length < 90) {
      p.firmenname = zeile.replace(/^(Firma|Anbieter|Betreiber)[:\s]+/i, "").trim();
      p.rechtsform = rf;
      add("firmenname", p.firmenname, q, t, t.indexOf(zeile));
      break;
    }
  }
  if (!p.firmenname) {
    const ti = start.html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (ti) p.firmenname = entities(ti[1]).replace(/\s+/g, " ").trim().slice(0, 120) || null;
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

  const felder = FELDER.filter((f) => f.muster.test(startText)).map((f) => f.name);
  p.geschaeftsfelder = felder.length ? felder : null;

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
