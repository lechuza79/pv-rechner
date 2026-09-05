import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  haendlerAnschrift,
  inbetriebnahmeInklusive,
  lieferumfangText,
  preisZusatz,
  umfangText,
  WP_HAENDLER,
  type WpGeraet,
} from "../wp-katalog";

/**
 * Was neben dem Preis stehen muss — und warum nicht aus der Verordnung, an die
 * man zuerst denkt.
 *
 * § 5b Abs. 1 Nr. 3 UWG macht Gesamtpreis und Lieferkosten zur wesentlichen
 * Information, sobald Waren unter Hinweis auf Merkmale und Preis so dargestellt
 * werden, dass ein Verbraucher das Geschäft abschließen kann. Die Kacheln tun
 * genau das.
 *
 * Die Preisangabenverordnung trifft uns dagegen NICHT, obwohl sie näher liegt:
 * Beide Alternativen des § 3 Abs. 1 PAngV setzen die Anbietereigenschaft voraus
 * ("als Anbieter von Waren ... unter Angabe von Preisen wirbt"), § 6 Abs. 1
 * sogar ein Angebot "zum Abschluss eines Fernabsatzvertrages". Anbieter der
 * Wärmepumpe ist der Händler. Eine erste Fassung dieses Tests stützte sich auf
 * die Verordnung — die Lesung des Volltextes hat die eigene Annahme widerlegt,
 * die Angaben blieben dieselben. Beide Normen am 27.08.2026 im Original
 * gelesen, Belege in `lib/rechtsbelege.ts`.
 *
 * Am 27.08.2026 am Shop gegengeprüft, nicht angenommen: Der Datenstrom liefert
 * brutto (Haier HPM14-Nd2, 4.598,00 € — die Produktseite schreibt "inkl. 19%
 * MwSt. | Versandkostenfrei"). Hätte er netto geliefert, wäre jede Zahl in
 * jeder Kachel um 19 % zu niedrig gewesen, ohne dass es irgendwo aufgefallen
 * wäre.
 */

/**
 * Der Text, den ein Nutzer wirklich sieht — ohne Kommentare.
 *
 * Die erste Fassung filterte ZEILENWEISE auf `//`, `*` und `/*` und übersah
 * damit JSX-Kommentare: `{/* … *\/}` trägt in seinen Fortsetzungszeilen kein
 * Kommentarzeichen am Anfang. Ein Kommentar, der die verworfene Fassung
 * absichtlich zitiert, ließ den Test deshalb rot werden — und umgekehrt hätte
 * ein Filter, der zu viel wegwirft, echte Befunde verschluckt.
 */
function ausgelieferterText(datei: string): string {
  return fs
    .readFileSync(datei, "utf-8")
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")   // JSX-Kommentare
    .replace(/\/\*[\s\S]*?\*\//g, "")               // Blockkommentare
    .replace(/^\s*\/\/.*$/gm, "");                   // Zeilenkommentare
}

const KACHEL_DATEI = path.resolve(
  __dirname,
  "..",
  "..",
  "components",
  "WpGeraeteEmpfehlung.tsx",
);

const g = (ueber: Partial<WpGeraet> = {}): WpGeraet => ({
  id: "1",
  name: "Testgerät",
  marke: "TEST",
  leistungKw: 10,
  herkunft: "ausgeschrieben",
  bauart: "luft-wasser",
  preisEur: 9000,
  versandEur: 0,
  link: "https://example.invalid",
  bildUrl: null,
  lieferbar: true,
  vorlaufMaxC: 65,
  kaeltemittel: "r290",
  aufbau: "monoblock",
  umfang: "geraet",
  ...ueber,
});

describe("Pflichtangaben zum Preis", () => {
  it("nennt immer die Umsatzsteuer", () => {
    for (const versand of [0, 5.9, null]) {
      expect(preisZusatz(g({ versandEur: versand }))).toMatch(/inkl\. MwSt\./);
    }
  });

  it("schreibt 'versandkostenfrei' nur bei null", () => {
    expect(preisZusatz(g({ versandEur: 0 }))).toBe("inkl. MwSt., versandkostenfrei");
  });

  it("nennt Versandkosten mit Betrag, wenn welche anfallen", () => {
    // Real: 21 von 2.413 Artikeln der Wärmepumpen-Kategorie tragen 5,90 €.
    // Pauschal "versandkostenfrei" wäre für die eine Falschangabe.
    expect(preisZusatz(g({ versandEur: 5.9 }))).toBe("inkl. MwSt., zzgl. 5,90 € Versand");
    expect(preisZusatz(g({ versandEur: 39.8 }))).toBe("inkl. MwSt., zzgl. 39,80 € Versand");
  });

  it("übersteht die Schnittstelle — null, nicht NaN", () => {
    // JSON kennt kein NaN und macht daraus stillschweigend null. Der Typ hätte
    // `number` behauptet, im Browser wäre etwas anderes angekommen.
    const durchJson = JSON.parse(JSON.stringify(g({ versandEur: null }))) as WpGeraet;
    expect(durchJson.versandEur).toBeNull();
    expect(preisZusatz(durchJson)).toBe("inkl. MwSt.");
  });

  it("behauptet bei fehlender Angabe KEINE Versandkostenfreiheit", () => {
    // "unbekannt" und "kostenlos" sind zwei Aussagen. Eine fehlende Angabe zu
    // einer Null zu runden wäre eine erfundene Preisangabe — dieselbe
    // Fehlerklasse wie ein erfundenes Prüfdatum.
    const text = preisZusatz(g({ versandEur: null }));
    expect(text).toBe("inkl. MwSt.");
    expect(text).not.toMatch(/versandkostenfrei|Versand/);
  });

  it("steht als eine Quelle im Code, nicht an der Kachel getippt", () => {
    expect(fs.readFileSync(KACHEL_DATEI, "utf-8")).toMatch(/preisZusatz\(g\)/);
    // Kein handgetippter Steuer- oder Versandhinweis AN DER KACHEL.
    //
    // Die Fußzeile darunter darf ihn tragen und tut es seit dem 05.09.2026
    // („Preise inkl. MwSt., Versand geprüft") — das ist eine Aussage über die
    // ganze Liste, nicht über ein Gerät, und sie steht dort genau einmal. Der
    // Fehler, gegen den diese Regel gebaut ist, wäre eine zweite Fassung
    // NEBEN dem Preis: Dort entscheidet die Angabe je Gerät, ob Versand
    // anfällt, und eine handgetippte Zeile daneben wäre für die Hälfte falsch.
    const ausgeliefert = ausgelieferterText(KACHEL_DATEI);
    const anDerKachel = ausgeliefert.slice(0, ausgeliefert.indexOf("Preise inkl. MwSt."));
    expect(anDerKachel).not.toMatch(/"[^"]*inkl\. MwSt/);
    expect(ausgeliefert).not.toMatch(/>\s*versandkostenfrei/i);
  });

  it("stellt den Erhebungszeitpunkt AN den Preis", () => {
    // Ein Preis ohne Datum behauptet Aktualität, die ein täglich abgerufener
    // Datenstrom nicht zusagen kann (BGH I ZR 123/08, Espressomaschine,
    // Leitsatz 1 — NICHT I ZR 140/07, das ist "Versandkosten bei Froogle").
    //
    // Und zwar an den PREIS, nicht in einen Block darüber: Das Datum korrigiert
    // die Fehlvorstellung "das ist der aktuelle Preis", und Leitsatz 2 derselben
    // Entscheidung verwarf einen Vorbehalt an anderer Stelle ausdrücklich als
    // untauglich, die Irreführung auszuräumen.
    // Am kommentarfreien Text gemessen: Ein erklärender Kommentar zwischen
    // beiden Zeilen ließ die frühere Fassung dieses Tests fehlschlagen, obwohl
    // im Browser nichts dazwischenstand. Ein Test, der Kommentarlänge misst,
    // misst die falsche Sache.
    const ausgeliefert = ausgelieferterText(KACHEL_DATEI);
    expect(ausgeliefert).toMatch(/Preis vom \$\{preisStand\}/);
    // Direkt hinter den Pflichtangaben zum Preis, nicht irgendwo sonst.
    expect(ausgeliefert).toMatch(/preisZusatz\(g\)[\s\S]{0,120}Preis vom/);
  });

  it("nennt neben dem Datum, welcher Preis gilt", () => {
    // Das Datum allein sagt, wann wir geholt haben — nicht, welcher Preis gilt,
    // wenn der Shop inzwischen einen anderen nennt. Erst beides zusammen ist ein
    // "klarer gegenteiliger Hinweis" gegen die Erwartung hoechstmoeglicher
    // Aktualitaet (BGH I ZR 123/08, Leitsatz 1).
    //
    // Der Zusatz war beim Umbau auf drei Stellen ersatzlos entfallen, waehrend
    // der Kommentar daneben weiter behauptete, er stehe da. Dieser Test liest
    // deshalb den ausgelieferten Text, nicht den Kommentar.
    const ausgeliefert = ausgelieferterText(KACHEL_DATEI);
    expect(ausgeliefert).toMatch(/es gilt der Preis im Shop/);
  });

  it("nennt den Preisstand konkret, nicht als Haftungsformel", () => {
    // BGH I ZR 123/08 (Espressomaschine), Leitsatz 2: Ein "Alle Angaben ohne
    // Gewähr" räumt die Irreführung NICHT aus — ausdrücklich auch dann nicht,
    // wenn es auf eine Erläuterungsseite verlinkt, weil Kaufinteressenten
    // solche Seiten nicht aufrufen. Die Entscheidung betrifft also die FORM des
    // Hinweises, nicht nur sein Vorhandensein: Datum und Vorrang des
    // Shop-Preises statt einer allgemeinen Formel.
    //
    // Dass der Hinweis auch VOR der ersten Kachel steht, prüft der Browser
    // (`e2e/wp-geraete-kennzeichnung.spec.ts`). Ein Positionsvergleich im
    // Quelltext wäre hier wertlos: Die Kachel-Komponente ist oben definiert und
    // unten verwendet — die Reihenfolge im Code sagt nichts über die Anzeige.
    const ausgeliefert = ausgelieferterText(KACHEL_DATEI);
    expect(ausgeliefert).not.toMatch(/ohne Gewähr/);
  });

  it("hält den Anzeigen-Block kurz — drei Stellen, nicht ein Absatz", () => {
    // Eine frühere Fassung packte alle fünf Pflichtangaben in einen Fließtext
    // über den Kacheln: 70 Wörter, die niemand liest. Der Ausweg ist NICHT das
    // Auslagern hinter einen Aufklapper — § 5a Abs. 3 UWG greift auf einer
    // scrollbaren Seite nicht, der EuGH nennt die eigene Entscheidung über die
    // Raumaufteilung für die Beurteilung ausdrücklich "irrelevant" (C-430/17,
    // Walbusch, Rn. 39). Der Ausweg ist Zerlegen.
    const ausgeliefert = ausgelieferterText(KACHEL_DATEI);

    // Oben: Kennzeichnung, ein Händler, Provision — mehr nicht.
    expect(ausgeliefert).toMatch(/Sortiment eines einzelnen Händlers/);
    expect(ausgeliefert).toMatch(/kein Marktüberblick/);
    // Unter den Kacheln: EINE Zeile, die sagt, wo der Vertrag zustande kommt.
    //
    // Bis 05.09.2026 standen hier zwei Absätze mit voller Händleranschrift und
    // einem eigenen Widerrufssatz. Der Betreiber hat sie nach zwei Prüfungen
    // ersetzt (siehe den Kommentar an der Stelle selbst): Die Rechtsprüfung
    // deckte die Anschrift, die Praxis-Erhebung fand sie bei KEINEM von zwölf
    // geprüften Anbietern. Die Abwägung gehört ihm.
    //
    // Was der Test weiter erzwingt, ist die Substanz: dass der Nutzer die
    // Seite verlässt, wer sein Vertragspartner wird, dass dort ein
    // Widerrufsrecht besteht, und dass der Preis nicht die fertige Anlage ist.
    expect(ausgeliefert).toMatch(/verlässt du\s*\n?\s*solar-check\.io/);
    expect(ausgeliefert).toMatch(/Kaufvertrag schließt du mit/);
    expect(ausgeliefert).toMatch(/Widerrufsrecht/);
    expect(ausgeliefert).toMatch(/nicht der Preis der fertigen Anlage/);
  });

  it("führt die Versandkosten von der Datenbank bis in die Kachel durch", () => {
    const wurzel = path.resolve(__dirname, "..", "..");
    const lies = (p: string) => fs.readFileSync(path.join(wurzel, p), "utf-8");
    expect(lies("app/api/wp-katalog/setup/route.ts")).toMatch(
      /ADD COLUMN IF NOT EXISTS versand_eur/,
    );
    expect(lies("scripts/wp-katalog-sync.ts")).toMatch(/versand_eur:/);
    expect(lies("lib/wp-katalog-db.ts")).toMatch(/versand_eur/);
    // Die Leseseite darf NULL nicht zu 0 machen.
    expect(lies("lib/wp-katalog-db.ts")).toMatch(/versand_eur === null \? null/);
  });
});

/**
 * Was ein Kaufangebot nach sich zieht.
 *
 * Zwei unabhängige Rechtsprüfungen am 27.08.2026 — eine ergebnisoffen, eine mit
 * dem Auftrag, die bequeme Antwort zu widerlegen — kamen zum selben Schluss und
 * haben die hier zuvor getroffene Annahme gekippt: Die Kacheln SIND eine
 * Aufforderung zum Kauf, obwohl bei uns nichts gekauft werden kann.
 *
 * Der EuGH hat genau diese Auslegung ausdrücklich verworfen (C-122/10, Ving
 * Sverige, Rn. 32: die Einstufung setzt nicht voraus, "dass die betreffende
 * Kommunikation eine tatsächliche Möglichkeit des Kaufs bietet"), und an einem
 * strukturgleichen Fall bestätigt, in dem der Werbende ebenfalls selbst nichts
 * verkaufte (C-146/16, DHL Paket, Rn. 25 und 31). Der BGH hat das übernommen —
 * und dabei den Satz geschrieben, der die Sache entscheidet: "Das Aufrufen
 * eines Verkaufsportals im Internet ist eine geschäftliche Entscheidung"
 * (I ZR 231/14, MeinPaket.de II). Der Klick IST die geschützte Entscheidung;
 * das Argument "im Shop steht ja alles" beschreibt einen Zeitpunkt, der zu spät
 * liegt (dort Rn. 30).
 */
describe("Kacheln als Aufforderung zum Kauf", () => {
  const block = () =>
    fs.readFileSync(
      path.resolve(__dirname, "..", "..", "components", "WpGeraeteEmpfehlung.tsx"),
      "utf-8",
    );

  it("hält die Anschrift des Händlers vor, auch wenn die Seite sie nicht zeigt", () => {
    // DIE ANGABE BLEIBT IM CODE, die Anzeige ist eine Betreiber-Entscheidung.
    //
    // Bis 05.09.2026 stand die volle Anschrift unter den Kacheln. Die
    // Rechtsprüfung deckt das — § 5b Abs. 1 Nr. 2 UWG verlangt „Identität und
    // Anschrift", und BGH I ZR 231/14 hat den Verweis aufs Shop-Impressum als
    // „zu spät" verworfen. Die Praxis-Erhebung desselben Tages fand die
    // Anschrift bei KEINEM von zwölf geprüften Anbietern; der Betreiber hat
    // sich für deren Bauform entschieden.
    //
    // Der Test hält deshalb den DATENSTAND fest, nicht die Anzeige: Wer die
    // Entscheidung zurückdreht, findet eine gepflegte Angabe vor und keine,
    // die inzwischen veraltet ist. Die Firmierung ist dabei der Punkt — gemeint
    // ist die Identität, nicht das Logo.
    expect(haendlerAnschrift()).toBe("Heizungsdiscount 24 GmbH, Stolzenmorgen 15, 35394 Gießen");
    expect(WP_HAENDLER.firma).toMatch(/GmbH|AG|KG|e\.K\./);
  });

  it("sagt, mit wem der Vertrag zustande kommt — und dass dort Widerruf besteht", () => {
    // Was von den beiden Absätzen übrig ist und bleiben muss: Der Leser soll
    // wissen, dass er unsere Seite verlässt und wer sein Vertragspartner wird.
    // Das ist der Zweck, den BGH I ZR 231/14 in Rn. 29 der Anschrift zuschreibt
    // — hier ohne die Postadresse, dafür ausdrücklich.
    //
    // Keine FRIST zum Widerruf: Verlangt ist nur das Bestehen, und eine Frist
    // wäre eine Aussage über die Vertragsbedingungen eines Dritten, die wir
    // nicht beherrschen — er kann auch mehr gewähren.
    const t = block();
    expect(t).toMatch(/verlässt du/);
    expect(t).toMatch(/Kaufvertrag schließt du mit/);
    expect(t).toMatch(/Widerrufsrecht/);
    expect(t).not.toMatch(/\d+\s*Tage\s*Widerruf/i);
  });

  it("kennzeichnet JEDE Kachel, nicht nur den Block darüber", () => {
    // Leitfaden der Medienanstalten: Erkennbarkeit "insbesondere ohne Scrollen
    // oder Ausklappen"; ein pauschaler Hinweis für ein ganzes Angebot genügt
    // nicht. Auf der Wischleiste ist der Block oben bei Kachel 3 aus dem Bild.
    expect(block()).toMatch(/ANZEIGE/);
  });

  it("nennt die Bezugsgröße der Spitzenstellung", () => {
    // "Günstigstes passendes" ohne Grundgesamtheit ist eine Spitzenstellung
    // ohne Bezug. Sie muss dort stehen, wo der Superlativ steht.
    const t = block();
    expect(t).toMatch(/Günstigstes passendes bei \$\{WP_HAENDLER\.kurz\}/);
  });

  it("nennt die Dimension seines Versprechens", () => {
    // Die Zusage bleibt — angreifbar war nur ihre REICHWEITE. "nie nach unserer
    // Provision" liest sich als Aussage darüber, was jemand überhaupt zu sehen
    // bekommt, und das ist provisionsbestimmt: Es gibt einen Partnershop.
    // Absolute Aussagen über die eigenen Beweggründe sind als irreführungsfähig
    // ausdrücklich benannt (§ 5 Abs. 2 Nr. 3 UWG).
    //
    // Ein zweiter Anlauf schrieb daraufhin nur noch über Sortierreihenfolge und
    // Partnerprogramm und warf damit die Zusage weg, um die es geht. Das war
    // überkorrigiert (Betreiber, 27.08.2026: "hat vor allem nicht mehr die
    // gleiche Aussage"). Eine wahre Aussage vorsichtshalber vager zu machen ist
    // keine Verbesserung.
    //
    // Der Satz bezieht sich jetzt ausdrücklich auf die Wahl DES GERÄTS — und
    // die ist vollständig durch Heizlast, Vorlauf und Preis bestimmt.
    const ausgeliefert = ausgelieferterText(KACHEL_DATEI);
    expect(ausgeliefert).not.toMatch(/nie nach unserer Provision/);
    expect(ausgeliefert).toMatch(/Welches Gerät wir dir empfehlen/);
    expect(ausgeliefert).toMatch(/nicht, woran wir mehr verdienen/);
    // Dass die Geräte aus einem Sortiment stammen, sagt die Kennzeichnung —
    // nicht das Versprechen. Beides an einer Stelle wäre wieder zu viel.
    expect(ausgeliefert).toMatch(/kein Marktüberblick/);
  });
});

describe("Umfang und Dienstleistung", () => {
  const g = (name: string, umfang: WpGeraet["umfang"] = "geraet"): WpGeraet => ({
    id: "1",
    name,
    marke: "TEST",
    leistungKw: 10,
    herkunft: "ausgeschrieben",
    bauart: "luft-wasser",
    preisEur: 9000,
    versandEur: 0,
    link: "https://example.invalid",
    bildUrl: null,
    lieferbar: true,
    vorlaufMaxC: 65,
    kaeltemittel: "r290",
    aufbau: "monoblock",
    umfang,
  });

  it("widerspricht dem Produktnamen nicht", () => {
    // Gemessen: 29 der 2.413 Wärmepumpen tragen "inkl. Erstinbetriebnahme" im
    // Namen. Daneben stand "nur Gerät" — zwei wahre Aussagen über verschiedene
    // Dinge, die wie ein Widerspruch aussehen und die ein Leser nicht auflösen
    // kann. Genau die Fehlerklasse "Beschriftung sagt etwas anderes als das,
    // was danebensteht".
    const mit = "Haier Monoblock-Wärmepumpe 14kW, R290, inkl. Erstinbetriebnahme";
    expect(inbetriebnahmeInklusive(mit)).toBe(true);
    expect(umfangText(g(mit))).toBe("Gerät + Inbetriebnahme");
    expect(lieferumfangText(g(mit))).toBe("Gerät + Inbetriebnahme");
  });

  it("erfindet keine Dienstleistung, wo keine genannt ist", () => {
    const ohne = "Vaillant aroTHERM plus VWL 75/6 A";
    expect(inbetriebnahmeInklusive(ohne)).toBe(false);
    expect(umfangText(g(ohne))).toBe("nur Gerät");
    expect(lieferumfangText(g(ohne))).toBe("Wärmepumpe allein");
  });

  it("hält Preis-Beschriftung und Lieferumfang beieinander", () => {
    // Beide müssen dieselbe Dienstleistung nennen, sonst ist der Widerspruch
    // nur an eine andere Stelle gewandert.
    for (const name of [
      "Gerät inkl. Erstinbetriebnahme",
      "Gerät ohne alles",
      "Komplettpaket mit Speicher inkl. Inbetriebnahme",
    ]) {
      const erwartet = inbetriebnahmeInklusive(name);
      expect(umfangText(g(name)).includes("Inbetriebnahme")).toBe(erwartet);
      expect(lieferumfangText(g(name)).includes("Inbetriebnahme")).toBe(erwartet);
    }
  });

  it("nennt beim Paket den Paketpreis", () => {
    expect(umfangText(g("Paket mit Speicher", "paket"))).toBe("Paketpreis");
    expect(lieferumfangText(g("Paket mit Speicher", "paket"))).toBe("Außen- + Innenteil");
  });
});
