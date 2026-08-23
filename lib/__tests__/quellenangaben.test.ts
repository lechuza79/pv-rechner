import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DATA_SOURCES, sourceLabel } from "../data-sources";
import { spotPreisFreigegeben } from "../energy-api";
import { OWN_WORK_LICENSE } from "../license";
import { allWidgets, embedExamplePath } from "../widget-registry";

// Eine falsche Lizenzangabe ist im Projekt derselbe Fehlertyp wie eine falsche
// Einheit: Sie fällt niemandem auf, steht auf /lizenz, /ueber, /presse UND in
// jedem exportierten Bild, und sie beschädigt genau das, womit die Seite wirbt.
// Der Rechts-Review 07/2026 fand vier davon — drei Quellen trugen ein
// „dl-de/by-2-0", das auf der Quelle nirgends steht. Diese Tests halten die
// geprüften Angaben fest, damit sie niemand aus Gewohnheit zurückschreibt.

const wurzel = join(__dirname, "..", "..");

describe("Quellenangaben", () => {
  it("nur wer wirklich unter der Datenlizenz Deutschland steht, sagt das auch", () => {
    // Geprüft am 29.07.2026 an der jeweiligen Primärquelle:
    //  • MaStR (Bundesnetzagentur) und BKG: veröffentlichen ausdrücklich unter
    //    dl-de/by-2-0.
    //  • Destatis: dl-de gilt laut Impressum NUR für GENESIS-Online; unsere
    //    Einwohnerzahlen kommen aus dem Download-Produkt GV100AD.
    //  • UBA: nutzt § 12a EGovG, nicht die Datenlizenz.
    //  • Eurostat: Statistikdaten laufen über Beschluss 2011/833/EU, die
    //    CC-Lizenz deckt nur den redaktionellen Website-Inhalt.
    const mitDatenlizenz = Object.entries(DATA_SOURCES)
      .filter(([, q]) => (q as { license?: string }).license === "dl-de/by-2-0")
      .map(([schluessel]) => schluessel)
      .sort();
    expect(mitDatenlizenz).toEqual(["bkg", "mastr"]);
  });

  it("der BKG-Quellenvermerk trägt Bezugsjahr, Datenquellen-Liste und Veränderungshinweis", () => {
    const bkg = DATA_SOURCES.bkg;
    // Wortlaut vom BKG vorgegeben: "© BKG (Jahr des letzten Datenbezugs)
    // dl-de/by-2-0, Datenquellen: …", bei Bearbeitung "(Daten verändert)".
    expect(bkg.name).toMatch(/^© BKG \(20\d\d\)$/);
    expect(
      bkg.name,
      "GeoBasis-DE ist die Form für die Behörden-Bereitstellung, nicht für den freien Download",
    ).not.toContain("GeoBasis-DE");
    expect(bkg.note).toContain("Daten verändert");
    expect(bkg.note).toContain("datenquellen_vg_nuts.pdf");
    // Die schmale Kante wirft Klammer-Zusätze weg — das Bezugsjahr darf sie
    // nicht mitnehmen, deshalb die Kurzform.
    expect(bkg.shortName).toContain("(");
  });

  it("jede CC-BY-Quelle verweist auf den Lizenztext", () => {
    // CC BY 4.0 Sec. 3(a)(1)(A)(iii) + 3(a)(2): Der Vermerk muss auf die Lizenz
    // verweisen; ein Link auf die Lizenzressource genügt. Der Vermerk rendert
    // die Lizenz aber nur dann als Link, wenn licenseUrl gesetzt ist
    // (components/PoweredBy.tsx) — ohne sie steht die Pflichtangabe als toter
    // Text da. Energy-Charts und Ember fehlte sie bis zum 22.08.2026,
    // ausgerechnet den beiden Quellen hinter den meisten Widgets.
    for (const [schluessel, q] of Object.entries(DATA_SOURCES)) {
      const quelle = q as { license?: string; licenseUrl?: string };
      if (quelle.license !== "CC BY 4.0") continue;
      expect(quelle.licenseUrl, `${schluessel}: Lizenzadresse fehlt`).toBe(OWN_WORK_LICENSE.url);
    }
  });

  it("wo wir CC-BY-Daten verändern, steht der Änderungshinweis dran", () => {
    // Sec. 3(a)(1)(B) verlangt die Angabe, DASS verändert wurde — aber nur
    // dann, wenn wirklich verändert wird. Deshalb eine benannte Liste mit
    // Grund statt einer Pauschalregel für alle CC-BY-Quellen: Eine Quelle, die
    // wir unverändert durchreichen, dürfte den Hinweis gar nicht tragen. Er
    // wäre dann eine falsche Angabe — derselbe Fehlertyp wie ein erfundenes
    // Prüfdatum, nur in die andere Richtung.
    const veraendert: Record<string, string> = {
      energyCharts: "Viertelstunden zu Wochenwerten gemittelt; nuclear-import.ts leitet eine Größe ab, die so nicht geliefert wird",
      ember: "Länderreihen werden bei jedem Sync neu gerechnet",
      openMeteo: "cdhFromDailyMinMax bildet aus Tages-Min/Max einen synthetischen Tagesgang",
    };
    for (const [schluessel, grund] of Object.entries(veraendert)) {
      const quelle = DATA_SOURCES[schluessel as keyof typeof DATA_SOURCES] as { note?: string };
      expect(quelle.note, `${schluessel}: Änderungshinweis fehlt — ${grund}`).toBeTruthy();
    }
  });

  it("Börsenpreise werden an der Antwort geprüft, nicht an einer getippten Zonenliste", () => {
    // Energy-Charts liefert /price NICHT pauschal unter CC BY: für einen Teil
    // der Gebotszonen ist die Nutzung "in its raw or derived form, for external
    // or commercial purposes … expressly prohibited". Die Doku-Liste der
    // CC-BY-Zonen ist dabei veraltet — IT-North steht dort und antwortet live
    // restriktiv (geprüft 22.08.2026). Wer die Liste in den Code tippt, baut
    // den Fehler ein, den die Prüfung verhindern soll.
    expect(spotPreisFreigegeben("CC BY 4.0 (creativecommons.org/licenses/by/4.0) from Bundesnetzagentur | SMARD.de")).toBe(true);
    expect(spotPreisFreigegeben("The data provided herein is for private and internal use only. ...")).toBe(false);
    // Fehlt die Angabe ganz, wird nicht ausgeliefert — die vorsichtige Richtung.
    expect(spotPreisFreigegeben(undefined)).toBe(false);
    expect(spotPreisFreigegeben("")).toBe(false);

    const quelle = readFileSync(join(wurzel, "lib/energy-api.ts"), "utf8");
    const ab = quelle.slice(quelle.indexOf("export async function fetchSpotPrices"));
    const rumpf = ab.slice(0, ab.indexOf("\n}"));
    expect(rumpf, "fetchSpotPrices liefert ungeprüfte Börsenpreise aus").toContain("spotPreisFreigegeben");
  });

  it("die Kurzform kürzt den NAMEN, nie die Lizenz oder den Änderungshinweis", () => {
    // Die Quellenkante am Widget-Rand und der Bild-Fuß bauten ihre Kurzform
    // selbst: shortName + Lizenz — und ließen den Änderungshinweis weg, unter
    // einem Kommentar, der versprach, er bleibe "in jedem Fall" stehen. Das
    // traf das BKG ("Daten verändert", von dl-de/by-2-0 verlangt) und hätte
    // jede neue Quelle mit Kurzform ebenso getroffen.
    for (const [schluessel, q] of Object.entries(DATA_SOURCES)) {
      const quelle = q as { license?: string; note?: string };
      const kurz = sourceLabel(quelle as never, { kurz: true });
      if (quelle.license) expect(kurz, `${schluessel}: Lizenz fehlt in der Kurzform`).toContain(quelle.license);
      if (quelle.note) expect(kurz, `${schluessel}: Änderungshinweis fehlt in der Kurzform`).toContain(quelle.note);
    }

    // Und die Kurzform wird auch wirklich benutzt, statt an der Kante erneut
    // von Hand zusammengesetzt zu werden.
    const quelle = readFileSync(join(wurzel, "components/WidgetExport.tsx"), "utf8");
    expect(quelle, "Kante baut die Kurzform wieder selbst zusammen").not.toMatch(/\$\{s\.shortName\}/);
  });

  it("Destatis nennt die tatsächliche Erlaubnis statt einer erfundenen Lizenz", () => {
    expect((DATA_SOURCES.destatis as { license?: string }).license).toBeUndefined();
    expect(sourceLabel(DATA_SOURCES.destatis)).toContain("mit Quellennachweis gestattet");
  });

  it("die eine Lizenz-Adresse steht überall in derselben Form", () => {
    // Vorher: /lizenz sprach von creativecommons.org/…/deed.de, das
    // Quellenregister von der internationalen Fassung. Zwei Adressen für
    // dieselbe Lizenz heißt: eine davon ist falsch zitiert.
    const cc = Object.values(DATA_SOURCES)
      .map((q) => (q as { licenseUrl?: string }).licenseUrl)
      .filter((u): u is string => !!u && u.includes("creativecommons.org"));
    for (const u of cc) expect(u).toBe(OWN_WORK_LICENSE.url);
  });

  it("das Klartext-Zitat nennt die Lizenz-Adresse", () => {
    // CC BY 4.0 Sec. 3(a)(1)(C): Text, URI oder Hyperlink der Lizenz. In Print
    // und PDF gibt es keinen Hyperlink — also muss die Adresse dastehen.
    const quelle = readFileSync(join(wurzel, "components/CiteModal.tsx"), "utf8");
    const ab = quelle.slice(quelle.indexOf("export function citePlain"));
    const rumpf = ab.slice(0, ab.indexOf("\n}"));
    expect(rumpf).toContain("LIZENZ_URL");
  });

  it("der Bild-Fuß backt den Lizenzcode mit ein", () => {
    // /presse verspricht, dass die Namensnennung im weitergereichten Bild nicht
    // verlorengeht — /lizenz zählt den Lizenzcode ausdrücklich dazu.
    const quelle = readFileSync(join(wurzel, "components/WidgetExport.tsx"), "utf8");
    const fuss = quelle.slice(quelle.indexOf("export function WidgetExportFooter"));
    expect(fuss).toContain("OWN_WORK_LICENSE.code");
    expect(fuss).toContain("OWN_WORK_LICENSE.attributionName");
  });

  it("jeder ortsbezogene Einbett-Link zeigt einen echten Ort", () => {
    // Ohne Ort begrüßt das Widget den Leser mit „Keine gültige Gemeinde
    // angegeben." — auf der Presseseite also vor genau dem Publikum, das wir
    // gewinnen wollen.
    for (const w of allWidgets().filter((x) => x.place)) {
      expect(w.exampleParams, `${w.id}: Beispiel-Ort fehlt`).toBeTruthy();
      const pfad = embedExamplePath(w);
      expect(pfad, `${w.id}: Beispiel-Pfad fehlt`).toBeTruthy();
      expect(pfad!, `${w.id}: Beispiel-Ort landet nicht im Link`).toMatch(/\?(ags|bl)=\d+$/);
    }
    // Einträge ohne Ortsbezug bleiben unverändert — sonst hängt an jedem Link
    // ein Fragezeichen ohne Grund.
    for (const w of allWidgets().filter((x) => !x.place && x.embeddable !== false)) {
      expect(embedExamplePath(w)).toBe(`/embed/${w.id}`);
    }
  });
});
