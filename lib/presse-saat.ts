/**
 * Die Saat: Medien, deren Website angesehen wird.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WARUM EINE SAAT UND KEIN VERZEICHNIS
 *
 * Die drei vorigen Erhebungen hatten je eine Grundgesamtheit: das Melderegister
 * (Gemeinden), das Anlagenregister (Versorger), die Ortssuche je Landkreis
 * (Fachbetriebe). Für Medien gibt es nichts Vergleichbares, das man entnehmen
 * dürfte — die Verzeichnisse, die es gibt (Zimpel, Kroll, Stamm), sind
 * kostenpflichtige Datenbanken, und genau dort greift das Datenbankherstellerrecht
 * (§ 87b UrhG); dieselbe Absage wie bei den privaten Förderportalen.
 *
 * Deshalb: eine BENANNTE Saat plus eine Suchphase. Die Saat ist eine Behauptung
 * („dieses Medium dürfte passen"), die Erhebung ist die Messung. Ein Eintrag,
 * dessen Domain nicht antwortet oder dessen Seite kein redaktionelles Angebot
 * ist, fällt heraus und wird als solcher ausgewiesen — nicht stillschweigend
 * übersprungen.
 *
 * WAS IN DER SAAT STEHT, IST UNGEPRÜFT. Medientyp, Schwerpunkt und Gebiet sind
 * hier VORANNAHMEN, damit der Lauf weiß, wonach er sucht. Was in den Katalog
 * kommt, ist die Messung von der Website; wo die Messung nichts hergibt, steht
 * die Vorannahme mit dem Vermerk „ungeprüft".
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * MEDIENGRUPPEN
 *
 * `gruppe` benennt den Verlag oder die Dachmarke, wo mehrere Titel dazugehören
 * (Vorgabe: Mediengruppen mit mehreren Regionalausgaben kennzeichnen). Zwei
 * Titel desselben Hauses sind KEINE Dublette — sie haben eigene Redaktionen —,
 * aber wer beide anschreibt, sollte es wissen.
 */

/**
 * 1 bundesweite Fach-, Energie-, Kommunal- und Verbrauchermedien ·
 * 2 Regionalmedien · 3 Newsletter, Podcasts, Creator ·
 * 4 PRÜFLISTE: was die Suche gefunden hat und noch niemand angesehen hat.
 *
 * Vier ist bewusst kein Katalogpaket. Ein Suchtreffer ist eine Adresse, kein
 * Befund; ihn neben die benannten Medien zu stellen hieße, eine Vermutung wie
 * eine Messung aussehen zu lassen.
 */
export type Paket = 1 | 2 | 3 | 4;

export interface SaatEintrag {
  /** Startadresse. Die Domain ist die Identität, nicht der Titel — dieselbe
   *  Entscheidung wie bei den Fachbetrieben. */
  domain: string;
  /** Wie das Medium heißt, soweit vorab bekannt. Die Messung schlägt das. */
  name: string;
  /** VORANNAHME. Print · Online · Fachdienst · Newsletter · Podcast · Video · Verband */
  typ: string;
  /** VORANNAHME zum Schwerpunkt, in unseren eigenen Themenwörtern. */
  schwerpunkt: string;
  /** VORANNAHME zum Gebiet. „bundesweit" oder ein benanntes Gebiet. */
  gebiet: string;
  /** Verlag oder Dachmarke, wo mehrere Titel dazugehören. */
  gruppe?: string;
  paket: Paket;
  notiz?: string;
}

// ─── Paket 1: bundesweite Fach-, Energie-, Kommunal- und Verbrauchermedien ───

export const SAAT: SaatEintrag[] = [
  // — Solar, Speicher, Erneuerbare: der engste Kreis ————————————————————————
  { domain: "pv-magazine.de", name: "pv magazine Deutschland", typ: "Online, Print", schwerpunkt: "photovoltaik, speicher", gebiet: "bundesweit", gruppe: "pv magazine group", paket: 1 },
  { domain: "photovoltaik.eu", name: "photovoltaik (Fachzeitschrift)", typ: "Print, Online", schwerpunkt: "photovoltaik", gebiet: "bundesweit", gruppe: "Alfons W. Gentner Verlag", paket: 1 },
  { domain: "solarserver.de", name: "Solarserver", typ: "Online", schwerpunkt: "photovoltaik, speicher", gebiet: "bundesweit", paket: 1 },
  { domain: "erneuerbareenergien.de", name: "ERNEUERBARE ENERGIEN", typ: "Print, Online", schwerpunkt: "photovoltaik, wind", gebiet: "bundesweit", paket: 1 },
  { domain: "pveurope.eu", name: "PV Europe", typ: "Online", schwerpunkt: "photovoltaik", gebiet: "europaweit", gruppe: "Alfons W. Gentner Verlag", paket: 1 },
  { domain: "solarify.eu", name: "Solarify", typ: "Online", schwerpunkt: "photovoltaik, energiewende", gebiet: "bundesweit", paket: 1 },
  { domain: "iwr.de", name: "IWR — Internationales Wirtschaftsforum Regenerative Energien", typ: "Online, Fachdienst", schwerpunkt: "erneuerbare, daten", gebiet: "bundesweit", paket: 1 },
  { domain: "sonnenseite.com", name: "Sonnenseite (Franz Alt)", typ: "Online", schwerpunkt: "erneuerbare, umwelt", gebiet: "bundesweit", paket: 1 },
  { domain: "energiezukunft.eu", name: "energiezukunft", typ: "Online, Print", schwerpunkt: "erneuerbare, verbraucher", gebiet: "bundesweit", gruppe: "naturstrom", paket: 1 },
  { domain: "klimareporter.de", name: "Klimareporter", typ: "Online", schwerpunkt: "klima, energiewende", gebiet: "bundesweit", paket: 1 },
  { domain: "energie-experten.org", name: "Energie-Experten", typ: "Online", schwerpunkt: "photovoltaik, waermepumpe, verbraucher", gebiet: "bundesweit", paket: 1 },
  { domain: "solaranlage.eu", name: "Solaranlage.eu", typ: "Online", schwerpunkt: "photovoltaik, verbraucher", gebiet: "bundesweit", paket: 1 },
  { domain: "energynet.de", name: "energynet", typ: "Online, Podcast", schwerpunkt: "energiewende", gebiet: "bundesweit", paket: 1 },
  { domain: "cleanthinking.de", name: "Cleanthinking", typ: "Online", schwerpunkt: "cleantech, photovoltaik", gebiet: "bundesweit", paket: 1 },
  { domain: "energiedialog.nrw.de", name: "EnergieDialog.NRW", typ: "Online", schwerpunkt: "photovoltaik, kommunal", gebiet: "Nordrhein-Westfalen", paket: 1 },
  { domain: "pv-magazine.com", name: "pv magazine international", typ: "Online", schwerpunkt: "photovoltaik", gebiet: "international", gruppe: "pv magazine group", paket: 1 },
  { domain: "solarbranche.de", name: "Solarbranche.de", typ: "Online", schwerpunkt: "photovoltaik", gebiet: "bundesweit", paket: 1 },
  { domain: "photovoltaik-web.de", name: "Photovoltaik-Web", typ: "Online", schwerpunkt: "photovoltaik", gebiet: "bundesweit", paket: 1 },
  { domain: "energie-und-management.de", name: "Energie & Management", typ: "Print, Online, Fachdienst", schwerpunkt: "energiewirtschaft, strommix", gebiet: "bundesweit", paket: 1 },
  { domain: "energate-messenger.de", name: "energate messenger", typ: "Fachdienst", schwerpunkt: "energiewirtschaft", gebiet: "bundesweit", paket: 1 },
  { domain: "ew-magazin.de", name: "ew — Magazin für die Energiewirtschaft", typ: "Print, Online", schwerpunkt: "energiewirtschaft", gebiet: "bundesweit", gruppe: "EW Medien und Kongresse", paket: 1 },
  { domain: "et-magazin.de", name: "et — Energiewirtschaftliche Tagesfragen", typ: "Print, Online", schwerpunkt: "energiewirtschaft", gebiet: "bundesweit", paket: 1 },
  { domain: "energie.blog", name: "energie.blog", typ: "Online", schwerpunkt: "energiewende", gebiet: "bundesweit", paket: 1 },
  { domain: "vdi-nachrichten.com", name: "VDI nachrichten", typ: "Print, Online", schwerpunkt: "technik, energie", gebiet: "bundesweit", paket: 1 },
  { domain: "elektro.net", name: "de — das elektrohandwerk", typ: "Print, Online", schwerpunkt: "elektrohandwerk, photovoltaik", gebiet: "bundesweit", gruppe: "Hüthig", paket: 1 },
  { domain: "emobilitaet-online.de", name: "eMobilitätOnline", typ: "Online", schwerpunkt: "emobilitaet, photovoltaik", gebiet: "bundesweit", paket: 1 },
  { domain: "electrive.net", name: "electrive", typ: "Online, Podcast", schwerpunkt: "emobilitaet, speicher", gebiet: "bundesweit", paket: 1 },

  // — Stadtwerke, Versorger, Kommunales ————————————————————————————————————
  { domain: "zfk.de", name: "ZfK — Zeitung für kommunale Wirtschaft", typ: "Print, Online", schwerpunkt: "stadtwerke, kommunal", gebiet: "bundesweit", gruppe: "VKU Verlag", paket: 1 },
  { domain: "stadt-und-werk.de", name: "stadt+werk", typ: "Print, Online", schwerpunkt: "stadtwerke, digitalisierung", gebiet: "bundesweit", gruppe: "K21 media", paket: 1 },
  { domain: "kommune21.de", name: "Kommune21", typ: "Print, Online", schwerpunkt: "kommunal, digitalisierung", gebiet: "bundesweit", gruppe: "K21 media", paket: 1 },
  { domain: "kommunal.de", name: "KOMMUNAL", typ: "Online, Print", schwerpunkt: "kommunal", gebiet: "bundesweit", paket: 1 },
  { domain: "treffpunkt-kommune.de", name: "Der Gemeinderat / Treffpunkt Kommune", typ: "Print, Online", schwerpunkt: "kommunal", gebiet: "bundesweit", paket: 1 },
  { domain: "kommunalwirtschaft.eu", name: "Kommunalwirtschaft", typ: "Online, Print", schwerpunkt: "kommunal, stadtwerke", gebiet: "bundesweit", paket: 1 },
  { domain: "behoerden-spiegel.de", name: "Behörden Spiegel", typ: "Print, Online", schwerpunkt: "verwaltung, kommunal", gebiet: "bundesweit", paket: 1 },
  { domain: "der-neue-kaemmerer.de", name: "Der Neue Kämmerer", typ: "Print, Online", schwerpunkt: "kommunalfinanzen", gebiet: "bundesweit", gruppe: "F.A.Z. BUSINESS MEDIA", paket: 1 },
  { domain: "vku.de", name: "VKU — Verband kommunaler Unternehmen", typ: "Verband", schwerpunkt: "stadtwerke, kommunal", gebiet: "bundesweit", paket: 1 },
  { domain: "dstgb.de", name: "Deutscher Städte- und Gemeindebund", typ: "Verband", schwerpunkt: "kommunal", gebiet: "bundesweit", paket: 1 },
  { domain: "staedtetag.de", name: "Deutscher Städtetag", typ: "Verband", schwerpunkt: "kommunal", gebiet: "bundesweit", paket: 1 },
  { domain: "landkreistag.de", name: "Deutscher Landkreistag", typ: "Verband", schwerpunkt: "kommunal", gebiet: "bundesweit", paket: 1 },
  { domain: "innovative-verwaltung.de", name: "Innovative Verwaltung", typ: "Print, Online", schwerpunkt: "verwaltung", gebiet: "bundesweit", gruppe: "Springer", paket: 1 },
  { domain: "energiekommune.de", name: "EnergieKommune", typ: "Print", schwerpunkt: "kommunal, erneuerbare", gebiet: "bundesweit", gruppe: "Solarpraxis / Agentur für Erneuerbare Energien", paket: 1 },
  { domain: "unendlich-viel-energie.de", name: "Agentur für Erneuerbare Energien", typ: "Verband, Online", schwerpunkt: "erneuerbare, kommunal, daten", gebiet: "bundesweit", paket: 1 },

  // — Verbraucher, Haus, Immobilien ————————————————————————————————————————
  { domain: "test.de", name: "Stiftung Warentest / test", typ: "Print, Online", schwerpunkt: "verbraucher, test", gebiet: "bundesweit", paket: 1 },
  { domain: "finanztip.de", name: "Finanztip", typ: "Online, Newsletter, Video", schwerpunkt: "verbraucher, kosten", gebiet: "bundesweit", paket: 1 },
  { domain: "oekotest.de", name: "ÖKO-TEST", typ: "Print, Online", schwerpunkt: "verbraucher, test", gebiet: "bundesweit", paket: 1 },
  { domain: "verbraucherzentrale.de", name: "Verbraucherzentrale Bundesverband / VZ", typ: "Online, Verband", schwerpunkt: "verbraucher, energie", gebiet: "bundesweit", paket: 1 },
  { domain: "co2online.de", name: "co2online", typ: "Online", schwerpunkt: "verbraucher, energie, daten", gebiet: "bundesweit", paket: 1 },
  { domain: "haus.de", name: "haus.de", typ: "Online", schwerpunkt: "haus, verbraucher", gebiet: "bundesweit", gruppe: "Bauer Media", paket: 1 },
  { domain: "bauen.de", name: "bauen.de", typ: "Online", schwerpunkt: "bauen, verbraucher", gebiet: "bundesweit", paket: 1 },
  { domain: "selbst.de", name: "selbst ist der Mann", typ: "Print, Online", schwerpunkt: "haus, heimwerken", gebiet: "bundesweit", gruppe: "Bauer Media", paket: 1 },
  { domain: "das-haus.de", name: "DAS HAUS", typ: "Print, Online", schwerpunkt: "haus, bauen", gebiet: "bundesweit", gruppe: "Burda", paket: 1 },
  { domain: "wohnglueck.de", name: "Wohnglück", typ: "Online", schwerpunkt: "haus, sanierung", gebiet: "bundesweit", gruppe: "Interhyp", paket: 1 },
  { domain: "energie-fachberater.de", name: "Energie-Fachberater", typ: "Online", schwerpunkt: "sanierung, foerderung", gebiet: "bundesweit", paket: 1 },
  { domain: "enbausa.de", name: "EnBauSa — Energetisch Bauen und Sanieren", typ: "Online", schwerpunkt: "sanierung, waermepumpe", gebiet: "bundesweit", paket: 1 },
  { domain: "effizienzhaus-online.de", name: "Effizienzhaus-online", typ: "Online", schwerpunkt: "sanierung, foerderung", gebiet: "bundesweit", paket: 1 },
  { domain: "immobilienscout24.de", name: "ImmoScout24 Redaktion", typ: "Online", schwerpunkt: "immobilien", gebiet: "bundesweit", paket: 1 },
  { domain: "immowelt.de", name: "immowelt Ratgeber", typ: "Online", schwerpunkt: "immobilien", gebiet: "bundesweit", paket: 1 },
  { domain: "haufe.de", name: "Haufe / Immobilienwirtschaft", typ: "Fachdienst, Print", schwerpunkt: "immobilien, verwaltung", gebiet: "bundesweit", gruppe: "Haufe Group", paket: 1 },
  { domain: "ivd.net", name: "IVD — Immobilienverband Deutschland", typ: "Verband", schwerpunkt: "immobilien", gebiet: "bundesweit", paket: 1 },
  { domain: "wohnungswirtschaft-heute.de", name: "Wohnungswirtschaft heute", typ: "Online, Print", schwerpunkt: "wohnungswirtschaft", gebiet: "bundesweit", paket: 1 },
  { domain: "haus-und-grund.net", name: "Haus & Grund Deutschland", typ: "Verband, Print", schwerpunkt: "eigentuemer, immobilien", gebiet: "bundesweit", paket: 1 },
  { domain: "mieterbund.de", name: "Deutscher Mieterbund", typ: "Verband", schwerpunkt: "mieter, wohnen", gebiet: "bundesweit", paket: 1 },

  // — Handwerk, Gebäudetechnik (die Zielgruppe, die einbaut) ————————————————
  { domain: "ikz.de", name: "IKZ — Fachzeitschrift für Gebäudetechnik", typ: "Print, Online", schwerpunkt: "haustechnik, waermepumpe", gebiet: "bundesweit", gruppe: "STROBEL VERLAG", paket: 1 },
  { domain: "sbz-online.de", name: "SBZ — Sanitär Heizung Klima", typ: "Print, Online", schwerpunkt: "haustechnik, waermepumpe", gebiet: "bundesweit", gruppe: "Alfons W. Gentner Verlag", paket: 1 },
  { domain: "tga-fachplaner.de", name: "TGA Fachplaner", typ: "Print, Online", schwerpunkt: "gebaeudetechnik", gebiet: "bundesweit", gruppe: "Alfons W. Gentner Verlag", paket: 1 },
  { domain: "haustec.de", name: "haustec.de", typ: "Online", schwerpunkt: "haustechnik, waermepumpe", gebiet: "bundesweit", gruppe: "Alfons W. Gentner Verlag", paket: 1 },
  { domain: "geb-info.de", name: "GEB — Gebäude Energieberater", typ: "Print, Online", schwerpunkt: "energieberatung, foerderung", gebiet: "bundesweit", gruppe: "Alfons W. Gentner Verlag", paket: 1 },
  { domain: "elektrofachkraft.de", name: "Elektrofachkraft.de", typ: "Online", schwerpunkt: "elektrohandwerk", gebiet: "bundesweit", paket: 1 },
  { domain: "deutsche-handwerks-zeitung.de", name: "Deutsche Handwerks Zeitung", typ: "Print, Online", schwerpunkt: "handwerk", gebiet: "bundesweit", gruppe: "Holzmann Medien", paket: 1 },
  { domain: "handwerksblatt.de", name: "Deutsches Handwerksblatt", typ: "Print, Online", schwerpunkt: "handwerk", gebiet: "bundesweit", paket: 1 },
  { domain: "zvei.org", name: "ZVEI", typ: "Verband", schwerpunkt: "elektroindustrie", gebiet: "bundesweit", paket: 1 },
  { domain: "zveh.de", name: "ZVEH — Elektro- und Informationstechnische Handwerke", typ: "Verband", schwerpunkt: "elektrohandwerk, photovoltaik", gebiet: "bundesweit", paket: 1 },

  // — Daten, Wissenschaft, Umwelt ——————————————————————————————————————————
  { domain: "riffreporter.de", name: "RiffReporter", typ: "Online", schwerpunkt: "wissenschaft, umwelt", gebiet: "bundesweit", paket: 1 },
  { domain: "table.media", name: "Table.Briefings (Climate.Table)", typ: "Fachdienst, Newsletter", schwerpunkt: "klima, energiepolitik", gebiet: "bundesweit", paket: 1 },
  { domain: "correctiv.org", name: "CORRECTIV", typ: "Online", schwerpunkt: "recherche, daten", gebiet: "bundesweit", paket: 1 },
  { domain: "klimafakten.de", name: "klimafakten.de", typ: "Online", schwerpunkt: "klima, daten", gebiet: "bundesweit", paket: 1 },
  { domain: "spektrum.de", name: "Spektrum der Wissenschaft", typ: "Print, Online", schwerpunkt: "wissenschaft", gebiet: "bundesweit", paket: 1 },
  { domain: "scinexx.de", name: "scinexx", typ: "Online", schwerpunkt: "wissenschaft", gebiet: "bundesweit", paket: 1 },
  { domain: "quarks.de", name: "Quarks (WDR)", typ: "Online, Video, Podcast", schwerpunkt: "wissenschaft, verbraucher", gebiet: "bundesweit", gruppe: "WDR", paket: 1 },
  { domain: "energiewende-magazin.de", name: "Energiewende-Magazin", typ: "Online", schwerpunkt: "energiewende", gebiet: "bundesweit", paket: 1 },
  { domain: "agora-energiewende.de", name: "Agora Energiewende", typ: "Thinktank", schwerpunkt: "energiedaten, strommix", gebiet: "bundesweit", paket: 1 },
  { domain: "ise.fraunhofer.de", name: "Fraunhofer ISE", typ: "Forschung", schwerpunkt: "photovoltaik, energiedaten", gebiet: "bundesweit", paket: 1 },
  { domain: "dena.de", name: "Deutsche Energie-Agentur (dena)", typ: "Agentur", schwerpunkt: "energiewende, kommunal", gebiet: "bundesweit", paket: 1 },
  { domain: "bsw-solar.de", name: "Bundesverband Solarwirtschaft", typ: "Verband", schwerpunkt: "photovoltaik, daten", gebiet: "bundesweit", paket: 1 },
  { domain: "bee-ev.de", name: "Bundesverband Erneuerbare Energie", typ: "Verband", schwerpunkt: "erneuerbare", gebiet: "bundesweit", paket: 1 },
  { domain: "dgs.de", name: "Deutsche Gesellschaft für Sonnenenergie / SONNENENERGIE", typ: "Verband, Print", schwerpunkt: "photovoltaik, balkonkraftwerk", gebiet: "bundesweit", paket: 1 },
  { domain: "sfv.de", name: "Solarenergie-Förderverein Deutschland", typ: "Verband, Online", schwerpunkt: "photovoltaik, einspeiseverguetung", gebiet: "bundesweit", paket: 1 },

  // — Große Häuser mit Wirtschafts-/Datenressort ————————————————————————————
  { domain: "handelsblatt.com", name: "Handelsblatt", typ: "Print, Online", schwerpunkt: "wirtschaft, energie", gebiet: "bundesweit", gruppe: "Handelsblatt Media Group", paket: 1 },
  { domain: "wiwo.de", name: "WirtschaftsWoche", typ: "Print, Online", schwerpunkt: "wirtschaft, energie", gebiet: "bundesweit", gruppe: "Handelsblatt Media Group", paket: 1 },
  { domain: "taz.de", name: "taz", typ: "Print, Online", schwerpunkt: "klima, energie", gebiet: "bundesweit", paket: 1 },
  { domain: "zeit.de", name: "ZEIT ONLINE", typ: "Print, Online", schwerpunkt: "daten, klima", gebiet: "bundesweit", gruppe: "Zeitverlag", paket: 1 },
  { domain: "spiegel.de", name: "DER SPIEGEL", typ: "Print, Online", schwerpunkt: "daten, klima", gebiet: "bundesweit", paket: 1 },
  { domain: "sueddeutsche.de", name: "Süddeutsche Zeitung", typ: "Print, Online", schwerpunkt: "daten, klima", gebiet: "bundesweit", gruppe: "Süddeutscher Verlag", paket: 1 },
  { domain: "faz.net", name: "Frankfurter Allgemeine Zeitung", typ: "Print, Online", schwerpunkt: "wirtschaft, energie", gebiet: "bundesweit", gruppe: "F.A.Z.", paket: 1 },
  { domain: "n-tv.de", name: "n-tv", typ: "TV, Online", schwerpunkt: "verbraucher, wirtschaft", gebiet: "bundesweit", gruppe: "RTL Deutschland", paket: 1 },
  { domain: "heise.de", name: "heise online", typ: "Online", schwerpunkt: "technik, energie", gebiet: "bundesweit", gruppe: "Heise Medien", paket: 1 },
  { domain: "golem.de", name: "Golem.de", typ: "Online", schwerpunkt: "technik, energie", gebiet: "bundesweit", paket: 1 },
  { domain: "efahrer.chip.de", name: "EFAHRER.com", typ: "Online", schwerpunkt: "photovoltaik, balkonkraftwerk, emobilitaet", gebiet: "bundesweit", gruppe: "CHIP / Burda", paket: 1, notiz: "schreibt regelmäßig über Balkonkraftwerke" },
  { domain: "chip.de", name: "CHIP", typ: "Online, Print", schwerpunkt: "technik, verbraucher", gebiet: "bundesweit", gruppe: "Burda", paket: 1 },
  { domain: "computerbild.de", name: "COMPUTER BILD", typ: "Print, Online", schwerpunkt: "technik, verbraucher", gebiet: "bundesweit", gruppe: "Axel Springer", paket: 1 },
  { domain: "t3n.de", name: "t3n", typ: "Print, Online", schwerpunkt: "technik, energie", gebiet: "bundesweit", paket: 1 },
  { domain: "utopia.de", name: "Utopia", typ: "Online", schwerpunkt: "nachhaltigkeit, verbraucher", gebiet: "bundesweit", paket: 1 },
  { domain: "geo.de", name: "GEO", typ: "Print, Online", schwerpunkt: "umwelt, wissenschaft", gebiet: "bundesweit", gruppe: "RTL Deutschland", paket: 1 },
  { domain: "nationalgeographic.de", name: "National Geographic Deutschland", typ: "Print, Online", schwerpunkt: "umwelt", gebiet: "bundesweit", gruppe: "RTL Deutschland", paket: 1 },

  // — Paket 1, Nachtrag: Fach- und Zielgruppenmedien ————————————————————————
  { domain: "solarthemen.de", name: "Solarthemen", typ: "Fachdienst, Print", schwerpunkt: "photovoltaik, kommunal", gebiet: "bundesweit", paket: 1 },
  { domain: "50komma2.de", name: "50,2 Magazin (Netzpraxis)", typ: "Print, Online", schwerpunkt: "netze, energiewirtschaft", gebiet: "bundesweit", paket: 1 },
  { domain: "ingenieur.de", name: "ingenieur.de (VDI)", typ: "Online", schwerpunkt: "technik, energie", gebiet: "bundesweit", gruppe: "VDI Verlag", paket: 1 },
  { domain: "energiespektrum.de", name: "energiespektrum", typ: "Print, Online", schwerpunkt: "energieeffizienz", gebiet: "bundesweit", paket: 1 },
  { domain: "energieverbraucher.de", name: "Bund der Energieverbraucher", typ: "Verband, Print", schwerpunkt: "verbraucher, photovoltaik", gebiet: "bundesweit", paket: 1 },
  { domain: "photovoltaikforum.com", name: "Photovoltaikforum", typ: "Online, Community", schwerpunkt: "photovoltaik, speicher, balkonkraftwerk", gebiet: "bundesweit", paket: 1 },
  { domain: "topagrar.com", name: "top agrar", typ: "Print, Online", schwerpunkt: "agri-pv, freiflaeche", gebiet: "bundesweit", gruppe: "Landwirtschaftsverlag", paket: 1 },
  { domain: "agrarheute.com", name: "agrarheute", typ: "Print, Online", schwerpunkt: "agri-pv, freiflaeche", gebiet: "bundesweit", gruppe: "dlv", paket: 1 },
  { domain: "bauernzeitung.de", name: "Bauernzeitung", typ: "Print, Online", schwerpunkt: "agri-pv, laendlich", gebiet: "Ostdeutschland", paket: 1 },
  { domain: "bundesbaublatt.de", name: "BundesBauBlatt", typ: "Print, Online", schwerpunkt: "bauen, wohnungswirtschaft", gebiet: "bundesweit", paket: 1 },
  { domain: "immobilien-zeitung.de", name: "Immobilien Zeitung", typ: "Print, Online", schwerpunkt: "immobilien", gebiet: "bundesweit", paket: 1 },
  { domain: "vdiv.de", name: "VDIV — Verband der Immobilienverwalter", typ: "Verband", schwerpunkt: "immobilienverwaltung, balkonkraftwerk", gebiet: "bundesweit", paket: 1 },
  { domain: "wohnen-im-eigentum.de", name: "Wohnen im Eigentum", typ: "Verband", schwerpunkt: "eigentuemer, photovoltaik", gebiet: "bundesweit", paket: 1 },
  { domain: "difu.de", name: "Difu — Deutsches Institut für Urbanistik", typ: "Forschung", schwerpunkt: "kommunal, klimaschutz", gebiet: "bundesweit", paket: 1 },
  { domain: "oeko.de", name: "Öko-Institut", typ: "Forschung", schwerpunkt: "energie, daten", gebiet: "bundesweit", paket: 1 },
  { domain: "ifeu.de", name: "ifeu — Institut für Energie- und Umweltforschung", typ: "Forschung", schwerpunkt: "energie, kommunal", gebiet: "bundesweit", paket: 1 },
  { domain: "wupperinst.org", name: "Wuppertal Institut", typ: "Forschung", schwerpunkt: "energiewende, kommunal", gebiet: "bundesweit", paket: 1 },
  { domain: "ariadneprojekt.de", name: "Kopernikus-Projekt Ariadne", typ: "Forschung", schwerpunkt: "energiedaten", gebiet: "bundesweit", paket: 1 },
  { domain: "verivox.de", name: "Verivox Redaktion", typ: "Online", schwerpunkt: "energiepreise, verbraucher", gebiet: "bundesweit", paket: 1 },
  { domain: "energiewinde.orsted.de", name: "Energiewinde", typ: "Online", schwerpunkt: "energiewende", gebiet: "bundesweit", gruppe: "Ørsted", paket: 1 },
  { domain: "energieagentur.nrw", name: "EnergieAgentur.NRW", typ: "Agentur", schwerpunkt: "photovoltaik, kommunal", gebiet: "Nordrhein-Westfalen", paket: 1 },
  { domain: "klimaschutz.de", name: "Nationale Klimaschutzinitiative", typ: "Behörde, Online", schwerpunkt: "kommunal, foerderung", gebiet: "bundesweit", paket: 1 },
  { domain: "energie-experten.de", name: "energie-experten (Redaktion)", typ: "Online", schwerpunkt: "photovoltaik, verbraucher", gebiet: "bundesweit", paket: 1 },
  { domain: "haustechnikdialog.de", name: "HaustechnikDialog", typ: "Online, Community", schwerpunkt: "waermepumpe, haustechnik", gebiet: "bundesweit", paket: 1 },
  { domain: "energie-fachmedien.de", name: "Energie Fachmedien", typ: "Verlag", schwerpunkt: "energiewirtschaft", gebiet: "bundesweit", paket: 1 },

  // ─── Paket 2: Regionalmedien mit eindeutig zuordenbarem Gebiet ─────────────
  // Nur Titel, deren Verbreitungsgebiet benennbar ist (Vorgabe). Mediengruppen
  // sind gekennzeichnet — Funke, Madsack, DuMont und Ippen führen mehrere
  // Regionalausgaben mit eigenen Redaktionen.
  { domain: "rp-online.de", name: "Rheinische Post", typ: "Print, Online", schwerpunkt: "regional", gebiet: "Düsseldorf / Niederrhein", gruppe: "Rheinische Post Mediengruppe", paket: 2 },
  { domain: "waz.de", name: "Westdeutsche Allgemeine Zeitung", typ: "Print, Online", schwerpunkt: "regional", gebiet: "Ruhrgebiet", gruppe: "FUNKE Mediengruppe", paket: 2 },
  { domain: "nrz.de", name: "Neue Ruhr / Rhein Zeitung", typ: "Print, Online", schwerpunkt: "regional", gebiet: "Niederrhein / Ruhr", gruppe: "FUNKE Mediengruppe", paket: 2 },
  { domain: "wp.de", name: "Westfalenpost", typ: "Print, Online", schwerpunkt: "regional", gebiet: "Südwestfalen", gruppe: "FUNKE Mediengruppe", paket: 2 },
  { domain: "ksta.de", name: "Kölner Stadt-Anzeiger", typ: "Print, Online", schwerpunkt: "regional", gebiet: "Köln / Rheinland", gruppe: "DuMont", paket: 2 },
  { domain: "ga.de", name: "General-Anzeiger Bonn", typ: "Print, Online", schwerpunkt: "regional", gebiet: "Bonn / Rhein-Sieg", paket: 2 },
  { domain: "wn.de", name: "Westfälische Nachrichten", typ: "Print, Online", schwerpunkt: "regional", gebiet: "Münsterland", gruppe: "Aschendorff", paket: 2 },
  { domain: "nw.de", name: "Neue Westfälische", typ: "Print, Online", schwerpunkt: "regional", gebiet: "Ostwestfalen-Lippe", paket: 2 },
  { domain: "hna.de", name: "HNA — Hessische/Niedersächsische Allgemeine", typ: "Print, Online", schwerpunkt: "regional", gebiet: "Nordhessen", gruppe: "Ippen", paket: 2 },
  { domain: "fr.de", name: "Frankfurter Rundschau", typ: "Print, Online", schwerpunkt: "regional", gebiet: "Rhein-Main", gruppe: "Ippen", paket: 2 },
  { domain: "fnp.de", name: "Frankfurter Neue Presse", typ: "Print, Online", schwerpunkt: "regional", gebiet: "Rhein-Main", gruppe: "Ippen", paket: 2 },
  { domain: "echo-online.de", name: "Darmstädter Echo", typ: "Print, Online", schwerpunkt: "regional", gebiet: "Südhessen", paket: 2 },
  { domain: "stuttgarter-zeitung.de", name: "Stuttgarter Zeitung", typ: "Print, Online", schwerpunkt: "regional", gebiet: "Region Stuttgart", gruppe: "SWMH", paket: 2 },
  { domain: "swp.de", name: "Südwest Presse", typ: "Print, Online", schwerpunkt: "regional", gebiet: "Ulm / Ostwürttemberg", gruppe: "SWMH", paket: 2 },
  { domain: "badische-zeitung.de", name: "Badische Zeitung", typ: "Print, Online", schwerpunkt: "regional", gebiet: "Südbaden / Freiburg", paket: 2 },
  { domain: "bnn.de", name: "Badische Neueste Nachrichten", typ: "Print, Online", schwerpunkt: "regional", gebiet: "Karlsruhe / Mittelbaden", paket: 2 },
  { domain: "suedkurier.de", name: "SÜDKURIER", typ: "Print, Online", schwerpunkt: "regional", gebiet: "Bodensee / Hochrhein", paket: 2 },
  { domain: "rnz.de", name: "Rhein-Neckar-Zeitung", typ: "Print, Online", schwerpunkt: "regional", gebiet: "Heidelberg / Rhein-Neckar", paket: 2 },
  { domain: "mannheimer-morgen.de", name: "Mannheimer Morgen", typ: "Print, Online", schwerpunkt: "regional", gebiet: "Rhein-Neckar", paket: 2 },
  { domain: "schwarzwaelder-bote.de", name: "Schwarzwälder Bote", typ: "Print, Online", schwerpunkt: "regional", gebiet: "Schwarzwald", gruppe: "SWMH", paket: 2 },
  { domain: "merkur.de", name: "Münchner Merkur", typ: "Print, Online", schwerpunkt: "regional", gebiet: "München / Oberbayern", gruppe: "Ippen", paket: 2 },
  { domain: "augsburger-allgemeine.de", name: "Augsburger Allgemeine", typ: "Print, Online", schwerpunkt: "regional", gebiet: "Schwaben", paket: 2 },
  { domain: "nordbayern.de", name: "Nürnberger Nachrichten", typ: "Print, Online", schwerpunkt: "regional", gebiet: "Mittelfranken", paket: 2 },
  { domain: "mainpost.de", name: "Main-Post", typ: "Print, Online", schwerpunkt: "regional", gebiet: "Unterfranken", gruppe: "Mediengruppe Main-Post", paket: 2 },
  { domain: "pnp.de", name: "Passauer Neue Presse", typ: "Print, Online", schwerpunkt: "regional", gebiet: "Niederbayern", paket: 2 },
  { domain: "lvz.de", name: "Leipziger Volkszeitung", typ: "Print, Online", schwerpunkt: "regional", gebiet: "Leipzig / Nordsachsen", gruppe: "Madsack", paket: 2 },
  { domain: "saechsische.de", name: "Sächsische Zeitung", typ: "Print, Online", schwerpunkt: "regional", gebiet: "Dresden / Ostsachsen", paket: 2 },
  { domain: "freiepresse.de", name: "Freie Presse", typ: "Print, Online", schwerpunkt: "regional", gebiet: "Chemnitz / Südwestsachsen", paket: 2 },
  { domain: "mz.de", name: "Mitteldeutsche Zeitung", typ: "Print, Online", schwerpunkt: "regional", gebiet: "Südliches Sachsen-Anhalt", paket: 2 },
  { domain: "volksstimme.de", name: "Volksstimme", typ: "Print, Online", schwerpunkt: "regional", gebiet: "Nördliches Sachsen-Anhalt", paket: 2 },
  { domain: "thueringer-allgemeine.de", name: "Thüringer Allgemeine", typ: "Print, Online", schwerpunkt: "regional", gebiet: "Thüringen", gruppe: "FUNKE Mediengruppe", paket: 2 },
  { domain: "otz.de", name: "Ostthüringer Zeitung", typ: "Print, Online", schwerpunkt: "regional", gebiet: "Ostthüringen", gruppe: "FUNKE Mediengruppe", paket: 2 },
  { domain: "nordkurier.de", name: "Nordkurier", typ: "Print, Online", schwerpunkt: "regional", gebiet: "Mecklenburgische Seenplatte / Vorpommern", paket: 2 },
  { domain: "ostsee-zeitung.de", name: "Ostsee-Zeitung", typ: "Print, Online", schwerpunkt: "regional", gebiet: "Mecklenburgische Ostseeküste", gruppe: "Madsack", paket: 2 },
  { domain: "svz.de", name: "Schweriner Volkszeitung", typ: "Print, Online", schwerpunkt: "regional", gebiet: "Westmecklenburg", gruppe: "NOZ/mh:n MEDIEN", paket: 2 },
  { domain: "kn-online.de", name: "Kieler Nachrichten", typ: "Print, Online", schwerpunkt: "regional", gebiet: "Kiel / Ostholstein", gruppe: "Madsack", paket: 2 },
  { domain: "shz.de", name: "shz.de", typ: "Print, Online", schwerpunkt: "regional", gebiet: "Schleswig-Holstein", gruppe: "NOZ/mh:n MEDIEN", paket: 2 },
  { domain: "ln-online.de", name: "Lübecker Nachrichten", typ: "Print, Online", schwerpunkt: "regional", gebiet: "Lübeck / Ostholstein", gruppe: "Madsack", paket: 2 },
  { domain: "weser-kurier.de", name: "WESER-KURIER", typ: "Print, Online", schwerpunkt: "regional", gebiet: "Bremen / Umland", paket: 2 },
  { domain: "nwzonline.de", name: "Nordwest-Zeitung", typ: "Print, Online", schwerpunkt: "regional", gebiet: "Oldenburg / Nordwest-Niedersachsen", paket: 2 },
  { domain: "noz.de", name: "Neue Osnabrücker Zeitung", typ: "Print, Online", schwerpunkt: "regional", gebiet: "Osnabrück / Emsland", gruppe: "NOZ/mh:n MEDIEN", paket: 2 },
  { domain: "haz.de", name: "Hannoversche Allgemeine Zeitung", typ: "Print, Online", schwerpunkt: "regional", gebiet: "Hannover", gruppe: "Madsack", paket: 2 },
  { domain: "goettinger-tageblatt.de", name: "Göttinger Tageblatt", typ: "Print, Online", schwerpunkt: "regional", gebiet: "Südniedersachsen", gruppe: "Madsack", paket: 2 },
  { domain: "abendblatt.de", name: "Hamburger Abendblatt", typ: "Print, Online", schwerpunkt: "regional", gebiet: "Hamburg / Umland", gruppe: "FUNKE Mediengruppe", paket: 2 },
  { domain: "mopo.de", name: "Hamburger Morgenpost", typ: "Print, Online", schwerpunkt: "regional", gebiet: "Hamburg", paket: 2 },
  { domain: "tagesspiegel.de", name: "Der Tagesspiegel", typ: "Print, Online", schwerpunkt: "regional, energiepolitik", gebiet: "Berlin", gruppe: "DvH Medien", paket: 2 },
  { domain: "berliner-zeitung.de", name: "Berliner Zeitung", typ: "Print, Online", schwerpunkt: "regional", gebiet: "Berlin", paket: 2 },
  { domain: "morgenpost.de", name: "Berliner Morgenpost", typ: "Print, Online", schwerpunkt: "regional", gebiet: "Berlin", gruppe: "FUNKE Mediengruppe", paket: 2 },
  { domain: "maz-online.de", name: "Märkische Allgemeine", typ: "Print, Online", schwerpunkt: "regional", gebiet: "Brandenburg / Potsdam", gruppe: "Madsack", paket: 2 },
  { domain: "lr-online.de", name: "Lausitzer Rundschau", typ: "Print, Online", schwerpunkt: "regional", gebiet: "Lausitz", paket: 2 },
  { domain: "rhein-zeitung.de", name: "Rhein-Zeitung", typ: "Print, Online", schwerpunkt: "regional", gebiet: "Koblenz / Mittelrhein", paket: 2 },
  { domain: "volksfreund.de", name: "Trierischer Volksfreund", typ: "Print, Online", schwerpunkt: "regional", gebiet: "Trier / Eifel", gruppe: "Rheinische Post Mediengruppe", paket: 2 },
  { domain: "saarbruecker-zeitung.de", name: "Saarbrücker Zeitung", typ: "Print, Online", schwerpunkt: "regional", gebiet: "Saarland", gruppe: "Rheinische Post Mediengruppe", paket: 2 },
  { domain: "wiesbadener-kurier.de", name: "Wiesbadener Kurier", typ: "Print, Online", schwerpunkt: "regional", gebiet: "Wiesbaden / Rheingau", paket: 2 },
  { domain: "allgemeine-zeitung.de", name: "Allgemeine Zeitung Mainz", typ: "Print, Online", schwerpunkt: "regional", gebiet: "Mainz / Rheinhessen", paket: 2 },

  // ─── Paket 3: Newsletter, Podcasts, YouTube, Creator ───────────────────────
  // Deutsche Creator sind nach § 5 DDG impressumspflichtig, sobald das Angebot
  // geschäftsmäßig ist — der Kontakt steht deshalb auf ihrer EIGENEN Seite, nicht
  // auf der Plattform. Genau die wird hier gelesen; der Kanal ist die Notiz.
  { domain: "akkudoktor.net", name: "Akkudoktor (Andreas Schmitz)", typ: "Video, Online, Community", schwerpunkt: "photovoltaik, speicher, balkonkraftwerk", gebiet: "bundesweit", paket: 3, notiz: "YouTube-Kanal mit sechsstelliger Abonnentenzahl (ungeprüft)" },
  { domain: "finanzfluss.de", name: "Finanzfluss", typ: "Video, Online, Newsletter", schwerpunkt: "verbraucher, kosten", gebiet: "bundesweit", paket: 3 },
  { domain: "geladen-podcast.de", name: "Geladen — der Batteriepodcast", typ: "Podcast", schwerpunkt: "speicher, batterie", gebiet: "bundesweit", paket: 3 },
  { domain: "solarenergie.de", name: "Solarenergie.de", typ: "Online", schwerpunkt: "photovoltaik, verbraucher", gebiet: "bundesweit", paket: 3 },
  { domain: "energie-tipp.de", name: "Energie-Tipp", typ: "Online, Print", schwerpunkt: "verbraucher, energie", gebiet: "bundesweit", paket: 3 },
  { domain: "photovoltaik-shop.com", name: "Photovoltaik-Shop Magazin", typ: "Online", schwerpunkt: "photovoltaik", gebiet: "bundesweit", paket: 3, notiz: "Händler mit Magazin — als Medium vermutlich nicht belegbar" },
  { domain: "machdeinenstrom.de", name: "Mach Deinen Strom", typ: "Online", schwerpunkt: "balkonkraftwerk, photovoltaik", gebiet: "bundesweit", paket: 3 },
  { domain: "solarwatt.de", name: "SOLARWATT Magazin", typ: "Online", schwerpunkt: "photovoltaik", gebiet: "bundesweit", paket: 3, notiz: "Hersteller — als Medium vermutlich nicht belegbar" },
  { domain: "hoppe-energie.de", name: "Hoppe Energie", typ: "Online", schwerpunkt: "photovoltaik", gebiet: "bundesweit", paket: 3 },
  { domain: "kleines-kraftwerk.de", name: "Kleines Kraftwerk Magazin", typ: "Online", schwerpunkt: "balkonkraftwerk", gebiet: "bundesweit", paket: 3, notiz: "Händler mit Magazin" },
  { domain: "priwatt.de", name: "priwatt Magazin", typ: "Online", schwerpunkt: "balkonkraftwerk", gebiet: "bundesweit", paket: 3, notiz: "Händler mit Magazin" },
  { domain: "indielux.de", name: "indielux", typ: "Online", schwerpunkt: "balkonkraftwerk", gebiet: "bundesweit", paket: 3 },
  { domain: "energiewende-magazin.lichtblick.de", name: "LichtBlick Energiewende-Magazin", typ: "Online", schwerpunkt: "energiewende, verbraucher", gebiet: "bundesweit", gruppe: "LichtBlick", paket: 3 },
  { domain: "der-energieblog.de", name: "Der Energieblog", typ: "Online", schwerpunkt: "energiewende", gebiet: "bundesweit", paket: 3 },
  { domain: "blog.paradigma.de", name: "Paradigma Blog", typ: "Online", schwerpunkt: "heizung, solarthermie", gebiet: "bundesweit", paket: 3 },
  { domain: "energie-und-technik.de", name: "Energie & Technik", typ: "Print, Online", schwerpunkt: "energietechnik", gebiet: "bundesweit", paket: 3 },
  { domain: "podcast.de", name: "podcast.de", typ: "Verzeichnis", schwerpunkt: "podcast", gebiet: "bundesweit", paket: 3, notiz: "Verzeichnis — kein Medium, dient nur der Kanalsuche" },
];

/**
 * Doppelte Adressen in der Saat — BLOCKER, und die Prüfung steht hier statt im
 * Lauf.
 *
 * Postgres bricht einen Stapel mit zwei gleichen Schlüsseln ab („ON CONFLICT DO
 * UPDATE command cannot affect row a second time"), und die Meldung nennt die
 * Adresse nicht. Real passiert beim Erweitern der Saat um die Pakete 2 und 3:
 * energiezukunft.eu stand versehentlich zweimal darin. Die Vorgabe verlangt
 * ohnehin, Dubletten zu vermeiden — dann soll die Datei es auch sagen.
 */
export function doppelteInDerSaat(): string[] {
  const gesehen = new Set<string>();
  const doppelt: string[] = [];
  for (const s of SAAT) {
    if (gesehen.has(s.domain)) doppelt.push(s.domain);
    gesehen.add(s.domain);
  }
  return doppelt;
}

export function saatFuer(paket: Paket): SaatEintrag[] {
  return SAAT.filter((s) => s.paket === paket);
}
