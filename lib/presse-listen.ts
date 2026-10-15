/**
 * WHICH LIST AN ENTRY OF THE PRESS CATALOGUE BELONGS TO — decided by hand,
 * written down here, applied by `npm run presse -- --listen`.
 *
 * Three lists, one table (presse_medien):
 * - "presse": the default — newsrooms, citizen media, research institutes,
 *   journalists' networks. Everything not named below.
 * - "verbaende": interest associations on our topics (energy, consumers,
 *   housing, municipalities). Addressed differently from a newsroom: material
 *   for their members, not a story.
 * - "archiv": clubs without a topic link that the county search for regional
 *   newspapers dragged in (fire brigades, Red Cross, local history, town
 *   marketing, tourism, parties). Kept, not deleted — the row also stops the
 *   next search from adding the domain again — but out of every press flow.
 *
 * Decided 07.10.2026 on the 231 entries marked "Verband" after the imprint
 * re-read (operator: "lass die vereine mal in einem archiv erhalten"). The
 * list is by name on purpose: a rule over title words would archive a
 * citizen radio run by an e.V. and keep a town-marketing club with a news
 * section. Every entry was read by hand.
 *
 * The profile run never writes these columns; they belong to this file.
 */

export type PresseListe = "presse" | "verbaende" | "archiv";

export const PRESSE_LISTEN: readonly PresseListe[] = ["presse", "verbaende", "archiv"];

export const LISTEN_TEXT: Record<PresseListe, string> = {
  presse: "Presse",
  verbaende: "Fachverbände",
  archiv: "Archiv",
};

/** Topic associations — energy, consumers, housing, municipal umbrella bodies. */
const VERBAENDE: Record<string, string> = {
  "bee-ev.de": "Bundesverband Erneuerbare Energie",
  "bne-online.de": "Bundesverband Neue Energiewirtschaft",
  "bsw-solar.de": "Bundesverband Solarwirtschaft",
  "deutsches-energieberaternetzwerk.de": "Deutsches Energieberater-Netzwerk",
  "dgs.de": "Deutsche Gesellschaft für Sonnenenergie",
  "dstgb.de": "Deutscher Städte- und Gemeindebund",
  "energieverbraucher.de": "Bund der Energieverbraucher",
  "erneuerbare-bw.de": "Plattform Erneuerbare Energien Baden-Württemberg",
  "greenpeace.de": "Umweltverband",
  "gruenerstromlabel.de": "Grüner Strom Label",
  "haus-und-grund.net": "Eigentümerverband",
  "helfen.bund-naturschutz.de": "Bund Naturschutz in Bayern",
  "house-of-energy.org": "Energie-Cluster Nordhessen",
  "ivd.net": "Immobilienverband Deutschland",
  "landkreistag.de": "Deutscher Landkreistag",
  "lee-nrw.de": "Landesverband Erneuerbare Energien NRW",
  "machdeinenstrom.de": "Initiative für Balkonkraftwerke",
  "mieterbund.de": "Deutscher Mieterbund",
  "netzwerk-energiewende-jetzt.de": "Netzwerk Energiewende Jetzt",
  "sfv.de": "Solarenergie-Förderverein",
  "staedtetag.de": "Deutscher Städtetag",
  "unendlich-viel-energie.de": "Agentur für Erneuerbare Energien",
  "vdiv.de": "Verband der Immobilienverwalter",
  "verbraucherzentrale-bawue.de": "Verbraucherzentrale",
  "verbraucherzentrale-energieberatung.de": "Verbraucherzentrale, Energieberatung",
  "verbraucherzentrale.de": "Verbraucherzentrale Bundesverband",
  "vku.de": "Verband kommunaler Unternehmen",
  "waermepumpe.de": "Bundesverband Wärmepumpe",
  "wind-energie.de": "Bundesverband WindEnergie",
  "wohnen-im-eigentum.de": "Wohneigentümerverband",
  "zveh.de": "Elektrohandwerk",
  "zvei.org": "Elektro- und Digitalindustrie",
};

const GRUPPEN_ARCHIV: Record<string, readonly string[]> = {
  "Rettungsdienst und Wohlfahrt": [
    "asb-helmstedt.de", "asb-wilhelmshaven.de", "awo-neustadt.de", "awo-prignitz.de", "brk-bgl.de",
    "brk-regen.de", "caritas-darmstadt.de", "drk-bottrop.de", "drk-dan.org", "drk-eichsfeld.de",
    "drk-emmendingen.de", "drk-emsland.de", "drk-gg.de", "drk-hohenlohe.de", "drk-kv-bodenseekreis.de",
    "drk-kv-calw.de", "drk-kv-viersen.de", "drk-mol-ost.de", "drk-pforzheim.de", "drk-rhein-erft.de",
    "drk-rhein-lahn.de", "drk-rheingau-taunus.de", "drk-um-ost.de", "drkemden.de", "kv-bks-wil.drk.de",
    "kv-duew.drk.de", "kv-recklinghausen.drk.de", "kvaichach-friedberg.brk.de", "kvaltoetting.brk.de",
    "kvdillingen.brk.de", "kveichstaett.brk.de", "kvfreyung.brk.de", "kvhassberge.brk.de",
    "kvneumarkt.brk.de", "kvoberallgaeu.brk.de", "kvpfaffenhofen.brk.de", "kvrhoen-grabfeld.brk.de",
    "kvtoel.brk.de", "malteser.de", "mayen-koblenz.drk.de", "rhein-berg.drk.de",
  ],
  Feuerwehr: [
    "feuerwehr-ansbach.de", "feuerwehr-landshut.de", "feuerwehr-memmingen.de", "kbi-dachau.de",
    "kfv-ab.de", "kfv-ba.de", "kfv-cham.de", "kfv-forchheim.de", "kfv-lkbh.de", "kfv-neustadt.de",
    "kfv-new.de", "kfv-nienburg.de", "kfv-oh.de", "kfv-online.de", "kfv-regen.de", "kfv-schweinfurt.de",
    "kfv-slfl.de", "kreisbrandinspektion-as.de", "kreisfeuerwehrverband.net",
  ],
  "Heimat, Geschichte, Wikis": [
    "collegium-carolinum.de", "hammwiki.info", "heimatverein-aichach.de", "hv-her-wan.de",
    "karl-may-wiki.de", "luenepedia.de", "rhein-neckar-wiki.de", "tuepedia.de",
    "uckermaerkischer-geschichtsverein.de", "virtuelles-museum.com", "wiki.hv-her-wan.de", "wugwiki.de",
  ],
  "Stadtmarketing, Gewerbe, Handel": [
    "ago-info.de", "bad-godesberg.info", "beuelhats.de", "bremen-city.de", "deggendorf-pulsiert.de",
    "einkaufen-in-dingolfing.de", "einkaufen-in-solingen.de", "einkaufen-in-straubing.de",
    "garmischer-zentrum.de", "gescher-lokal.de", "gewaechshaus-viersen.de", "gewerbeverein-bitburg.de",
    "gwm-miesbach.de", "hardtberg.net", "hgv-sontheim.de", "ig-schildgen.de", "igel-lesum.de",
    "innenstadt-freising.de", "ja-fuer-gera.de", "kempen.city", "luebeckmanagement.de",
    "luis-ludwigsburg.de", "magdelstube.de", "marketing-club-krefeld.de", "muehldorf-vor-ort.de",
    "mybamberg.de", "rhein-voreifel-unternehmen.de", "schlebusch-online.net", "stadtmarketing-koeln.de",
    "stadtmarketing-lichtenfels.de", "wirtschafts-werbung-weilburg.de", "wirtschaftskreis.de",
    "wirtschaftstreff.de", "wochenmarkt-osnabrueck.de",
  ],
  Tourismus: [
    "altenburg.travel", "bayerischer-wald.de", "echt-dithmarschen.de", "erzgebirge-tourismus.de",
    "land-genuss.bayern", "mein-albtrauf.de", "pfalz.de", "saechsische-schweiz.de",
    "suedlicheweinstrasse.de", "visithavelland.de",
  ],
  Parteien: [
    "cdu-merzig-wadern.de", "die-linke-burgenlandkreis.de", "die-linke-ilmkreis.de", "gruene-ebersberg.de",
    "gruene-weissenburg-gunzenhausen.de", "gruene-werra-meissner.de", "spd-mayen-koblenz.net",
  ],
  "Sonstige Vereine": [
    "alwis-saarland.de", "bauernverband-boerde.de", "blhv.de", "dprg.de", "foerderwerk-natur.de",
    "freiburg.social", "ifd-frankfurt.de", "kbv-waldeck-frankenberg.de", "kickers.de", "kreis-bochum.de",
    "llb-detmold.de", "tierheim-hoechstaedt.de", "tierherberge-paf.de", "waldorfschule-kiel.de",
    "amberg-sulzbach-kleinanzeigen.de", "bbw.de", "digitalzentrum-fokus-mensch.de", "langenhain.com",
    "regional-prignitz-ruppin.de", "swa-leipzig.de",
  ],
  // Operator, 07.10.2026: a site about racism, no link to our topics.
  "Kein Themenbezug": ["hessenschauthin.de"],
};

/**
 * Run by an association, judged no medium — and still press on purpose. The
 * run lists every such entry without a decision; these are decided.
 */
const BLEIBT_PRESSE: Record<string, string> = {
  "anzeigenblatt-kompakt.de": "Verband der Gratiszeitungen: Weg zu den Anzeigenblättern",
  "bvda.de": "Verband der Gratiszeitungen: Weg zu den Anzeigenblättern",
  "presseverein-muenster-muensterland.de": "Journalistenverein",
  "regionalia.de": "Zeitung eines Vereins",
  "tonkuhle.de": "Bürgerradio",
  "wuestenradar.de": "Studie zur Zeitungslandschaft",
  "kommunalwiki.boell.de": "Fachwissen Kommunalpolitik, kein Verein",
  ...Object.fromEntries(
    [
      "alzey-land.de", "forum-baukultur.de", "ihk.de", "innovationsregion.de", "lag-landkreis-pfaffenhofen.de",
      "lwl.org", "metropolregion-muenchen.eu", "metropolregionnuernberg.de", "oldenburger-muensterland.de",
      "reab-bayern.de", "region-kassel-land.de", "regionalverband-saarbruecken.de", "schrobenhausen.de",
      "spree-neisse-land.de", "wirtschaft-donauries.bayern",
    ].map((d) => [d, "kein Verein: Verwaltung, Kammer oder Regionalentwicklung"]),
  ),
};

/** Decided to stay press although run by an association and no medium. */
export function bewusstPresse(domain: string): boolean {
  return domain in BLEIBT_PRESSE;
}

const ARCHIV: Record<string, string> = Object.fromEntries(
  Object.entries(GRUPPEN_ARCHIV).flatMap(([grund, domains]) => domains.map((d) => [d, grund])),
);

export interface ListenEntscheidung {
  liste: PresseListe;
  grund: string | null;
}

/** The list for an entry; everything not named here is press. */
export function listeFuer(domain: string): ListenEntscheidung {
  if (VERBAENDE[domain]) return { liste: "verbaende", grund: VERBAENDE[domain] };
  if (ARCHIV[domain]) return { liste: "archiv", grund: ARCHIV[domain] };
  return { liste: "presse", grund: null };
}

/** All named domains, for the run and the tests. */
export function benannteDomains(): string[] {
  return [...Object.keys(VERBAENDE), ...Object.keys(ARCHIV), ...Object.keys(BLEIBT_PRESSE)];
}

export function doppeltBenannt(): string[] {
  const listen = [Object.keys(VERBAENDE), Object.keys(ARCHIV), Object.keys(BLEIBT_PRESSE)];
  const gesehen = new Set<string>();
  const doppelt: string[] = [];
  for (const d of listen.flat()) (gesehen.has(d) ? doppelt : (gesehen.add(d), [])).push(d);
  return doppelt;
}
