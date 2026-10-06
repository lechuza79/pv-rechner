/**
 * IS THIS A PV INSTALLER? — decided at the IMPRINT, not at the word.
 *
 * Until 06.10.2026 the stock called an entry "betrieb" for two reasons only:
 * it appeared in few district searches (so it was not a portal), and the word
 * Photovoltaik stood on its start page. A Stadtwerk, a newspaper, an
 * association and a wholesaler satisfy both. Measured on 50 random entries:
 * 10 were not installers (4 utilities, 3 associations, a directory, a
 * wholesaler, a municipal climate agency), and none of the 10 had anything in
 * its imprint that an installer has.
 *
 * The rule now has two halves, and the order matters:
 *
 *  1. WHO IS THE PROVIDER? Read from the imprint's provider block (name and
 *     address at the top) and the site's self-description (title, meta
 *     description). A utility, a medium, an association, a public body, a
 *     directory or a wholesaler is never an installer, whatever else the page
 *     says. These classes look ONLY at the provider, never at the whole page:
 *     an installer's page says "Mitglied im Bundesverband Solarwirtschaft
 *     e.V." or "Partner der Stadtwerke", and its imprint names the
 *     Handwerkskammer as a "Körperschaft des öffentlichen Rechts".
 *  2. IS THERE EVIDENCE OF A TRADE? One of: the Handwerkskammer, a master
 *     craftsman or Handwerksrolle entry, a trade in the provider's name, or
 *     the site offering to install/mount PV itself. No evidence means
 *     "unklar", never "betrieb" — an empty imprint is not a finding either way.
 *
 * The function is pure: it gets the page texts and returns the verdict with
 * the passage it rests on. Fetching and writing live in the script.
 */

import { handwerkskammerAus, navigationsText, sichtbarerText, entities } from "./fachbetrieb-extrakt";

export type KeinBetriebKlasse =
  | "versorger"
  | "medium"
  | "verband"
  | "behoerde"
  | "portal"
  | "handel";

/** Where an entry of this class belongs instead, if we keep such a stock. */
export const ZIEL_BESTAND: Record<KeinBetriebKlasse, "versorger" | "presse" | null> = {
  versorger: "versorger",
  medium: "presse",
  verband: null,
  behoerde: null,
  portal: null,
  handel: null,
};

export const KLASSEN_TEXT: Record<KeinBetriebKlasse, string> = {
  versorger: "Energieversorger",
  medium: "Medium/Verlag",
  verband: "Verband/Verein",
  behoerde: "Kommune/Behörde/Agentur",
  portal: "Portal/Verzeichnis",
  handel: "Großhandel/Hersteller",
};

export type Einordnung =
  | { art: "betrieb"; grund: string; beleg: string }
  | { art: "kein-betrieb"; klasse: KeinBetriebKlasse; grund: string; beleg: string }
  | { art: "unklar"; grund: string };

export type EinordnungEingabe = {
  domain: string;
  startHtml: string;
  /** Visible text of the imprint page; "" when it could not be read. */
  impText: string;
  /** Provider name as extracted earlier (profilAus), if any. */
  firmenname?: string | null;
};

const stelle = (text: string, idx: number, len = 90) =>
  text.slice(Math.max(0, idx - 20), idx + len).replace(/\s+/g, " ").trim();

// ─── The provider block of the imprint ──────────────────────────────────────

/**
 * Words that open the provider statement. "Impressum" alone is not one: it
 * stands in the navigation and the page title long before the statement.
 */
const ANBIETER_START =
  /Angaben\s+gem(?:ä|ae)(?:ß|ss)|Diensteanbieter|Anbieterkennzeichnung|Anbieter\s*(?:und|:)|Herausgeber|Betreiber\s+(?:der|dieser)\s+(?:Web|Internet)?(?:seite|site|präsenz)|Verantwortlich(?:er)?\s+f(?:ü|ue)r\s+(?:den\s+Inhalt|diese)|Inhaber|Anschrift|Impressum\s*(?:\n|$)/gi;

/**
 * The provider's name and address: from an opening word up to the first
 * postcode after it. Falls back to the stretch before the first postcode,
 * which on short imprints is the provider block itself.
 */
// Sections of an imprint that name SOMEONE ELSE with an address: the
// liability insurer ("Anbieter: Ergo Versicherung … Versicherungsombudsmann
// e.V." — meissner-handwerk.de, measured), the arbitration board, the
// chamber, the web designer. A provider block never starts inside one.
const FREMDER_ABSCHNITT =
  /Versicherung|Haftpflicht|Schlichtung|Ombudsmann|Kammer|Aufsichtsbeh|Webdesign|Gestaltung|Realisierung|Hosting|Bildnachweis|Bildrechte|Fotos?\b/i;

export function anbieterBlock(impText: string): string {
  if (!impText) return "";
  for (const m of impText.matchAll(ANBIETER_START)) {
    if (FREMDER_ABSCHNITT.test(impText.slice(Math.max(0, m.index! - 80), m.index!))) continue;
    const rest = impText.slice(m.index!, m.index! + 400);
    const plz = rest.search(/\b\d{5}\s+[A-ZÄÖÜ]/);
    if (plz > 0) return rest.slice(0, plz + 40);
  }
  const plz = impText.search(/\b\d{5}\s+[A-ZÄÖÜ]/);
  if (plz <= 0) return "";
  const block = impText.slice(Math.max(0, plz - 200), plz + 40);
  return FREMDER_ABSCHNITT.test(block) ? "" : block;
}

/** Title and meta description: how the site describes itself. */
export function selbstbeschreibung(html: string): string {
  const t = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "";
  const d =
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i)?.[1] ??
    html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i)?.[1] ??
    "";
  return entities(`${t}\n${d}`).replace(/\s+/g, " ").trim();
}

// ─── 1. Who is the provider? ────────────────────────────────────────────────

type Regel = { klasse: KeinBetriebKlasse; wo: string; test: (k: Kontext) => RegExpMatchArray | null };
type Kontext = { anbieter: string; selbst: string; titel: string; nav: string; start: string; startKopf: string; imp: string; domain: string };

// A utility names itself as one. "Energie" alone is not enough — installers
// call themselves "Sonnen-Energie GmbH".
const VERSORGER_NAME =
  /\b(?:Stadtwerke?|Gemeindewerke|Kreiswerke|Energieversorgung|Energieversorger|Elektrizit(?:ä|ae)tswerke?|(?:Ü|Ue)berlandwerk|Versorgungsbetriebe?|Energie-?\s*und\s*Wasserversorgung|Netzgesellschaft|Energienetze|Stromnetze?)\b/;
const VERSORGER_TITEL =
  /\b(?:Stadtwerke?|Gemeindewerke|Kreiswerke|Energieversorger|Elektrizit(?:ä|ae)tswerke?|(?:Ü|Ue)berlandwerk|Versorgungsbetriebe?|Netzgesellschaft|Energienetze|Stromnetze?)\b/;

// Large regional utilities do not call themselves Stadtwerke. What only a
// supplier or grid operator offers is BILLING AND METERING: meter readings,
// instalments, basic supply, a tariff calculator. Not "Netzentgelte" or
// "Stromtarife": installers blog about dynamic tariffs and grid fees
// (e-m-gz.de, measured). A fault hotline
// alone is not enough — PV service firms have one for their systems (Adler
// Solar, eniosol, Faber Solartechnik, SEB: measured on the full run). So: at
// least two distinct services, one of them billing or metering.
const ABRECHNUNG: RegExp[] = [
  /\bZ(?:ä|ae)hlerst(?:a|ä)nde?\s+(?:melden|mitteilen|(?:ü|ue)bermitteln|eingeben)/i,
  /\bAbschlag\s+(?:anpassen|(?:ä|ae)ndern)/i,
  /\bGrundversorgung\b/i,
  /\bErsatzversorgung\b/i,
  /\bTarifrechner\b/i,
];
const VERSORGER_DIENST: RegExp[] = [
  ...ABRECHNUNG,
  /\bSt(?:ö|oe)rung\s+melden|\bSt(?:ö|oe)rungsmeldung|\bEntst(?:ö|oe)rung/i,
  /\bGastarife?\b|\bErdgastarif/i,
  /\bUmzug\s+(?:melden|anmelden)|\bUmzugsservice\b/i,
];
function versorgerDienste(text: string): RegExpMatchArray | null {
  const treffer = VERSORGER_DIENST.map((r) => text.match(r)).filter((m): m is RegExpMatchArray => !!m);
  const abrechnung = ABRECHNUNG.map((r) => text.match(r)).find((m) => !!m);
  return treffer.length >= 2 && abrechnung ? abrechnung : null;
}

// The trailing guard is a lookahead, not \b: after "e.V." a \b only matches
// when a WORD character follows, so the old KEIN_BETRIEB pattern never matched
// "GFWW. e.V. - …" (measured 06.10.2026).
// A cooperative is not per se no installer ("Solarbau Freiburg eG" builds PV
// systems, measured) — only a citizens' energy cooperative is.
const VEREIN_NAME =
  /\be\.\s?V\.(?!\w)|\beingetragener\s+Verein\b|\bVerband\b|\bStiftung\b|(?:B(?:ü|ue)rger|Energie)[\wäöü-]*genossenschaft|B(?:ü|ue)rger[\wäöü-]*\s+eG(?!\w)|\bB(?:ü|ue)rgerwerke\b/i;
// A volunteer initiative says what it is (heidel-solar.de: "Wir arbeiten
// ehrenamtlich und semi-professionell"). Only as a statement about "wir": an
// installer's page may well support a volunteer fire brigade.
// solarini-lauenburg.de: "ist eine Initiative … Wir informieren und beraten
// ehrenamtlich" (measured).
const EHRENAMT = /\bwir\b[^.!?\n]{0,60}\behrenamtlich|\bist\s+eine\s+(?:[\wäöüß-]+\s+)?(?:B(?:ü|ue)rger)?[Ii]nitiative\b/i;
// The register counts only with its own number type: "Genossenschaftsregister:
// HRB 14650" and "Vereinsregister: HRB 100735" are imprint typos of
// companies (jona-solar.de, vp-solar.de, measured).
const VEREIN_REGISTER = /\bVereinsregister\s*(?:[-:–]|Nr\.?|nummer)?\s*(?:VR\s*)?\d|\bVR\s?\d{2,}/;

const BEHOERDE =
  /\b(?:Stadtverwaltung|Gemeindeverwaltung|Kreisverwaltung|Landratsamt|Der\s+(?:Ober)?B(?:ü|ue)rgermeister|K(?:ö|oe)rperschaft\s+des\s+(?:ö|oe)ffentlichen\s+Rechts|Anstalt\s+des\s+(?:ö|oe)ffentlichen\s+Rechts|Zweckverband)\b/i;
// A district's energy portal names the district as publisher and its Landrat
// (energiewegweiser.de: "Herausgeber: Landkreis Harburg Landrat …", measured).
const KOMMUNE_ALS_ANBIETER =
  /\b(?:Herausgeber(?:in)?|Anbieter|Betreiber)\s*:?\s*(?:der\s+|die\s+)?(?:Landkreis|Kreis|Stadt|Gemeinde|Markt|Samtgemeinde|Verbandsgemeinde|Amt)\s+[A-ZÄÖÜ]|\bLandr(?:at|ätin)\b/;
// Municipal solar maps load by script and name themselves in the title. Only
// the title: an installer writes "prüfen Sie Ihr Dach im Solarkataster".
const AGENTUR =
  /\b(?:Klima(?:schutz)?-?agentur|Energieagentur|Klimaschutzmanagement|Solar(?:potenzial|dach)?kataster|Solaratlas|Energieatlas|Geoportal)\b/i;

const MEDIUM = /\b(?:Chefredakt\w*|Redaktionsleitung|Verlagsleitung|Verlagsgesellschaft|Zeitungsverlag|Verlagshaus|Anzeigenleitung)\b/i;

const PORTAL_NAME = /\b(?:Portal|Verzeichnis|Branchenbuch|Vergleichsportal)\b/i;
// Not "portal": an electrician runs "e-infoportal.de" (measured).
const PORTAL_DOMAIN = /(?:finden|vergleich|verzeichnis|branchen)/i;
const PORTAL_TEXT =
  /\b(?:Angebote vergleichen|kostenlos vergleichen|bis zu (?:drei|3|f(?:ü|ue)nf|5) (?:kostenlose )?Angebote|Anbieter vergleichen|Handwerker finden|Fachbetriebe? in Ihrer N(?:ä|ae)he finden|Jetzt Anbieter finden|Leads?[- ]?(?:Navigator|Generierung|Vermittlung)|Auftragsvermittlung|Wir vermitteln Ihnen)\b/i;

// Who sells and lets others install says so: "planen in Zusammenarbeit mit
// Handwerkern … die Installation" (energiering.de, a shop, measured).
const MIT_HANDWERKERN = /\bin\s+Zusammenarbeit\s+mit\s+(?:unseren\s+|regionalen\s+|lokalen\s+)?(?:Partner-?)?Handwerkern\b/i;
// A wholesaler in its TITLE or DESCRIPTION. Not in the navigation or body:
// installers write "mit Herstellern und Großhandel", "durch unsere
// Großhändler", or carry "Großhandel" as a menu item next to "Privatkunden"
// (ostsee.solar, CTE Haustechnik, Solardes, Weber + Horbach — measured).
const HANDEL =
  /\b(?:Gro(?:ß|ss)handel\w*|Gro(?:ß|ss)h(?:ä|ae)ndler|Distributor|Distribution|B2B-?Shop|f(?:ü|ue)r\s+(?:Fach)?installateure|Fachhandelspartner)\b/i;
// A manufacturer says it is one. "Wechselrichter namhafter Hersteller für
// maximale Erträge" is an installer naming its suppliers (solarteur-pro.de,
// measured) — so only the self-description counts, and only as a statement.
// "Photovoltaik-Großhandel in Altusried mit eigenem Montageservice" installs.
const EIGENE_MONTAGE = /\beigene[nmr]?\s+(?:Montage|Monteur|Installat)|\bMontageservice\b|\bMontageteams?\b/i;
const HERSTELLER = /\b(?:wir\s+sind|als)\s+(?:ein(?:er)?\s+)?(?:[\w-]+\s+)?Hersteller\b|\bHersteller\s+(?:von|hochwertiger)\b/i;

/**
 * The provider classes, most specific first. `wo` names where the evidence
 * was found — it goes into the reason, so a later reader knows it came from
 * the imprint and not from a sentence somewhere on the page.
 */
export const KEIN_BETRIEB_REGELN: Regel[] = [
  { klasse: "versorger", wo: "Anbieter im Impressum", test: (k) => k.anbieter.match(VERSORGER_NAME) },
  // The TITLE only: a description says what a firm does ("besonders effiziente
  // Energieversorgung" — an engineering office, measured), the title says who
  // it is.
  // "Energieversorgung" in a title describes a service ("Konzepte zur
  // dezentralen Energieversorgung", an association "für eine Energieversorgung
  // auf Basis 100 % Erneuerbare" — measured); "Energieversorger" says who it is.
  { klasse: "versorger", wo: "Seitentitel", test: (k) => k.titel.match(VERSORGER_TITEL) },
  { klasse: "versorger", wo: "Startseite (Abrechnung und Zähler)", test: (k) => versorgerDienste(k.start) },
  { klasse: "medium", wo: "Impressum", test: (k) => k.imp.match(MEDIUM) },
  { klasse: "verband", wo: "Anbieter im Impressum", test: (k) => k.anbieter.match(VEREIN_NAME) },
  { klasse: "verband", wo: "Registerart im Impressum", test: (k) => k.imp.match(VEREIN_REGISTER) },
  { klasse: "verband", wo: "Startseite", test: (k) => k.start.match(EHRENAMT) },
  { klasse: "behoerde", wo: "Anbieter im Impressum", test: (k) => k.anbieter.match(BEHOERDE) ?? k.anbieter.match(KOMMUNE_ALS_ANBIETER) },
  { klasse: "behoerde", wo: "Anbieter/Selbstbeschreibung", test: (k) => (k.anbieter + "\n" + k.selbst).match(AGENTUR) },
  { klasse: "portal", wo: "Anbieter/Selbstbeschreibung", test: (k) => (k.anbieter + "\n" + k.selbst).match(PORTAL_NAME) },
  { klasse: "portal", wo: "Domain", test: (k) => k.domain.match(PORTAL_DOMAIN) },
  { klasse: "portal", wo: "Startseite", test: (k) => k.start.match(PORTAL_TEXT) },
  {
    // "mg-solar-shop.de", "alma-solarshop.de": a shop names itself in its
    // domain (measured). An installer's shop sits under its own name.
    klasse: "handel",
    wo: "Domain",
    test: (k) => (EIGENE_MONTAGE.test(k.selbst) ? null : k.domain.match(/shop/i)),
  },
  {
    klasse: "handel",
    wo: "Selbstbeschreibung",
    test: (k) =>
      EIGENE_MONTAGE.test(k.selbst) ? null : k.selbst.match(HANDEL) ?? k.selbst.match(HERSTELLER) ?? k.start.match(MIT_HANDWERKERN),
  },
];

// ─── 2. Evidence of a trade ─────────────────────────────────────────────────

const MEISTER =
  /\bMeisterbetrieb\b|\b(?:Elektro(?:techniker|installateur)?|Installateur(?:-\s*und\s*Heizungsbauer)?|Heizungsbauer|Dachdecker|Zimmerer|Klempner|Spengler|Sanit(?:ä|ae)r|K(?:ä|ae)lteanlagenbauer)(?:in)?-?meister(?:in)?\b|\bHandwerksrolle\b|\bHandwerksbetrieb\b|\b(?:Elektro|Solar|PV|SHK|Dachdecker|Meister|Innungs)?-?[Ff]achbetrieb\b|\bMitglied\s+der\s+[\w-]*Innung\b|\beingetragene[rn]?\s+Elektrofachbetrieb/i;

const GEWERK_IM_NAMEN =
  /Elektr|Solar|Photovoltaik|\bPV\b|Haustechnik|Geb(?:ä|ae)udetechnik|Heizung|Sanit(?:ä|ae)r|Bedachung|Dachdecker|Dachtechnik|Zimmerei|Holzbau|Energietechnik|Energiesysteme|Installation|Klimatechnik|K(?:ä|ae)ltetechnik/i;

const GEWERK_SELBST =
  /\bElektr(?:o|iker)\w*|\bHeizung\w*|\bSanit(?:ä|ae)r\w*|\bDachdecke\w*|\bZimmerei\b|\bSolarteur\w*|\bHaustechnik\b|\bGeb(?:ä|ae)udetechnik\b|\bInstallateur\w*|\bHandwerk\w*|\bMeister\w*|\bSolartechnik\b|\bK(?:ä|ae)ltetechnik\b|\bKlimatechnik\b|\bEnergietechnik\b/i;

// Installing is what distinguishes the installer from everyone who merely
// writes about PV. Both orders, within one sentence-sized window.
const PV = String.raw`(?:Photovoltaik\w*|PV-?Anlage\w*|Solaranlage\w*|Solar(?:strom|technik)|PV\b)`;
// No "Errichtung": "für die Errichtung einer Solaranlage geeignet" is advice,
// not an offer (energiering.de, measured).
const MONTAGE = String.raw`(?:Montage|montieren|montiert|Installation|installieren|installiert|Inbetriebnahme|Anlagenbau)`;
const INSTALLIERT_NAH = new RegExp(String.raw`${PV}[^.!?\n]{0,120}${MONTAGE}|${MONTAGE}[^.!?\n]{0,120}${PV}`, "gi");
// Advice, not an offer: "Es ist möglich, eine Solaranlage zu installieren"
// (alma-solarshop.de, measured), "was kostet die Montage".
const RATSCHLAG = /\b(?:m(?:ö|oe)glich|kann|k(?:ö|oe)nnen|l(?:ä|ae)sst|lassen|kostet|Kosten|sollten?|wenn|ob|geeignet)\b/i;
// Offers that need no PV word next to them — the PV offer itself is checked
// separately: "über Montage und Inbetriebnahme bis zur Wartung" (mt-pv.de),
// "Umsetzung und Inbetriebnahme" as a menu item (main-energiekreis.de).
const MONTAGE_ANGEBOT: RegExp[] = [
  /\bwir\b[^.!?\n]{0,60}\b(?:montieren|installieren)\b/i,
  /\b(?:montieren|installieren)\s+wir\b/i,
  /\b(?:Planung|Beratung)\s*(?:,|und|&|\+)\s*(?:[\wäöü-]+\s*(?:,|und|&|\+)\s*)?(?:Montage|Installation)\b/i,
  /\bMontage\s*(?:,|und|&|\+)\s*(?:Inbetriebnahme|Installation|Wartung)\b/i,
  /\bbis\s+zur\s+(?:Installation|Montage|Inbetriebnahme)\b/i,
  /\beigene[nmr]?\s+(?:Montage|Monteur|Installat)|\bMontageteams?\b/i,
];
const MONTAGE_IM_MENUE = /\b(?:Montage|Installation|Inbetriebnahme)\b/i;

/** The site offers to mount or install, as an offer — not as advice. */
function bietetMontage(start: string, nav: string): RegExpMatchArray | null {
  for (const m of start.matchAll(INSTALLIERT_NAH)) {
    const davor = start.slice(Math.max(0, m.index! - 40), m.index!);
    if (!RATSCHLAG.test(davor + m[0])) return m;
  }
  for (const r of MONTAGE_ANGEBOT) {
    const m = start.match(r);
    if (m) return m;
  }
  return nav.match(MONTAGE_IM_MENUE);
}

const PV_ANGEBOT = /\b(?:photovoltaik|solaranlage|pv-anlage|solarstrom|balkonkraftwerk|stecker-?solar)\w*/i;

type Beleg = { grund: string; test: (k: Kontext & { name: string }) => RegExpMatchArray | null };

export const BETRIEBS_BELEGE: Beleg[] = [
  {
    grund: "Handwerkskammer im Impressum",
    test: (k) => {
      const h = handwerkskammerAus(k.imp);
      return h ? Object.assign([h.name], { index: h.index }) as RegExpMatchArray : null;
    },
  },
  { grund: "Meister/Handwerksrolle", test: (k) => k.imp.match(MEISTER) ?? k.start.match(MEISTER) },
  { grund: "Gewerk im Namen des Anbieters", test: (k) => k.name.match(GEWERK_IM_NAMEN) },
  // How the firm describes itself: "erfahrener Fachmann in Sachen Heizung,
  // Sanitär oder Klima" (Peter Seven GmbH, measured — nothing in its imprint
  // named the trade).
  { grund: "Gewerk in der Selbstbeschreibung", test: (k) => k.selbst.match(GEWERK_SELBST) },
  { grund: "bietet Montage/Installation an", test: (k) => bietetMontage(k.start, k.nav) },
];

export function einordnen(e: EinordnungEingabe): Einordnung {
  // Without URLs: "https://leadgenerierung-engelmann.fly.dev/" is a link on
  // an installer's page, not a lead seller (measured).
  const start = [sichtbarerText(e.startHtml), navigationsText(e.startHtml)].join("\n").replace(/\bhttps?:\/\/\S+/g, " ");
  const anbieter = [anbieterBlock(e.impText), e.firmenname ?? ""].join("\n");
  const k: Kontext = {
    anbieter,
    selbst: selbstbeschreibung(e.startHtml),
    nav: navigationsText(e.startHtml),
    titel: entities(e.startHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").replace(/\s+/g, " ").trim(),
    start,
    startKopf: start.slice(0, 1500),
    imp: e.impText,
    domain: e.domain,
  };

  for (const r of KEIN_BETRIEB_REGELN) {
    const m = r.test(k);
    if (!m) continue;
    const quelle = r.wo === "Domain" ? k.domain : r.wo.startsWith("Anbieter") ? k.anbieter + "\n" + k.selbst : r.wo === "Seitentitel" ? k.titel : r.wo === "Selbstbeschreibung" ? k.selbst + "\n" + k.startKopf : r.wo.startsWith("Impressum") || r.wo.startsWith("Registerart") ? k.imp : k.start;
    return {
      art: "kein-betrieb",
      klasse: r.klasse,
      grund: `${KLASSEN_TEXT[r.klasse]} (${r.wo}: „${m[0].trim().slice(0, 50)}")`,
      beleg: stelle(quelle, Math.max(0, quelle.indexOf(m[0]))),
    };
  }

  if (!PV_ANGEBOT.test(start)) {
    return { art: "unklar", grund: "kein Photovoltaik-Angebot auf Startseite oder Navigation" };
  }

  // The name to test for a trade: the provider block's first lines, else the
  // name extracted earlier. Never the whole page — every page names a trade.
  // Not the domain: "solaratlas-bsk…" and "solarini-lauenburg.de" carry the
  // word Solar and are a map and a volunteer initiative (measured).
  const name = [anbieterBlock(e.impText).slice(0, 160), e.firmenname ?? ""].join("\n");
  for (const b of BETRIEBS_BELEGE) {
    const m = b.test({ ...k, name });
    if (!m) continue;
    const quelle = b.grund === "Gewerk in der Selbstbeschreibung" ? k.selbst : b.grund.startsWith("Gewerk") ? name : b.grund.startsWith("bietet") ? start : k.imp.includes(m[0]) ? k.imp : start;
    return { art: "betrieb", grund: b.grund, beleg: stelle(quelle, Math.max(0, quelle.indexOf(m[0]))) };
  }

  return {
    art: "unklar",
    grund: e.impText
      ? "Photovoltaik erwähnt, aber kein Beleg für einen ausführenden Betrieb (Kammer, Meister, Gewerk, Montage)"
      : "Impressum nicht gelesen, Startseite ohne Beleg für einen ausführenden Betrieb",
  };
}

/**
 * A verdict this rule must not overwrite: a person's decision on a collision,
 * or the demotion because an official stock holds the domain. Both rest on
 * knowledge the page itself does not carry.
 */
export function behaeltEinordnung(r: { art: string; art_grund: string | null }): boolean {
  return r.art === "kein-betrieb" && /^(?:von Hand entschieden|steht im Bestand)/.test(r.art_grund ?? "");
}

/**
 * What the district-search spread may write. The spread separates portals and
 * nationwide firms from regional ones — it says nothing about whether a
 * regional domain is an installer. So it writes "überregional", or keeps the
 * existing verdict, and a new or no-longer-overregional domain starts as
 * 'unklar'. NEVER 'betrieb': until 06.10.2026 it did, and overwrote every
 * demotion made at the imprint on the next search run.
 */
export function artNachStreuung(
  bisher: { art: string; art_grund: string | null } | undefined,
  weitVerbreitet: boolean,
  n: number,
  kreiseGelaufen: number,
  schwelle: number,
): { art: string; art_grund: string } {
  if (weitVerbreitet) return { art: "ueberregional", art_grund: `in ${n} von ${kreiseGelaufen} abgefragten Kreisen (Schwelle ${schwelle})` };
  // Back below the threshold: the spread alone proves nothing either way.
  if (!bisher || bisher.art === "ueberregional") {
    return { art: "unklar", art_grund: `in ${n} Kreis${n === 1 ? "" : "en"} gesehen — Beleg aus dem Impressum steht aus` };
  }
  return { art: bisher.art, art_grund: bisher.art_grund ?? "" };
}
