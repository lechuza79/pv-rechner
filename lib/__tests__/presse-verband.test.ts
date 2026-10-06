import { describe, expect, it } from "vitest";
import { medientypAus, verbandAus } from "../presse-extrakt";

/**
 * "Verband" says who publishes, so it is read at the imprint's provider block
 * and the page title — never at a word anywhere on the page. Every case below
 * is a measured site from the re-read of 06.10.2026 (3,047 media), each one
 * read by hand.
 */

describe("medium type 'Verband' comes from the imprint, not from the page", () => {
  it("a word on the page is no longer enough", () => {
    // The old whole-page pattern: any page mentioning a club or an association.
    const seite = "Unser Partner, der Bundesverband Solarwirtschaft e.V. Hauptstraße, lädt ein. Newsletter abonnieren.";
    expect(medientypAus(seite)).not.toContain("Verband");
    expect(medientypAus(seite)).toContain("Newsletter");
  });

  it("a finding from the imprint is carried into the type list", () => {
    expect(medientypAus("Newsletter", { wo: "Anbieter im Impressum", treffer: "e.V." })).toEqual(["Newsletter", "Verband"]);
  });

  it("e.V. before a space in the provider block (netzwerkrecherche.org)", () => {
    const imp = "Impressum Netzwerk Recherche e.V. c/o Publix Hermannstraße 90 12051 Berlin Telefon: 030 49854012";
    expect(verbandAus(imp, "")).toEqual({ wo: "Anbieter im Impressum", treffer: "e.V." });
  });

  it("e.V without the final period (regionalia.de)", () => {
    const imp = "Herausgeber und Verleger: Neuer Zeitungsverein e.V Gemeinschaft für freies Wissen Lindenstraße 4 12345 Musterstadt";
    expect(verbandAus(imp, "")?.wo).toBe("Anbieter im Impressum");
  });

  it("a name ending in -verband (bvda.de)", () => {
    const imp = "Impressum Bundesverband kostenloser Wochenzeitungen Haus der Presse Markgrafenstraße 15 10969 Berlin";
    expect(verbandAus(imp, "")?.treffer).toBe("Bundesverband");
  });

  it("an association elsewhere in the imprint is someone else (gemeindezeitung.de)", () => {
    const imp =
      "Impressum Verlag Bayerische Kommunalpresse GmbH Breslauer Weg 44 82538 Geretsried Handelsregister: HRB 65 Streitschlichtung: Allgemeine Verbraucherschlichtungsstelle des Zentrums für Schlichtung e.V. Straßburger Straße 8 77694 Kehl";
    expect(verbandAus(imp, "")).toBeNull();
  });

  it("initials are not an association (staedte-verlag.de)", () => {
    const imp =
      "Impressum Diensteanbieter im Sinne des DDG ist die Städte-Verlag E. v. Wagner & J. Mitterhuber GmbH Steinbeisstraße 9 70736 Fellbach";
    expect(verbandAus(imp, "")).toBeNull();
  });

  it("a membership names someone else (kbumm.de)", () => {
    const imp =
      "Impressum Inhaber der Domain und Redaktionssitz ist: Geschäftsführer und V.i.S.d.P. Stefan Bösl Mitglied Deutscher Fachjournalisten-Verband Musterweg 1 93047 Regensburg";
    expect(verbandAus(imp, "")).toBeNull();
  });

  it("a special-purpose association is a public body", () => {
    const imp = "Impressum Herausgeber: Abfallzweckverband Musterkreis Am Hof 3 12345 Musterstadt";
    expect(verbandAus(imp, "")).toBeNull();
  });

  it("an administration is not an association (Verbandsgemeinde)", () => {
    const imp = "Impressum Herausgeber: Verbandsgemeinde Daun Vertreten durch: Bürgermeister Leopoldstraße 29 54550 Daun";
    expect(verbandAus(imp, "")).toBeNull();
  });

  it("NRW local radio: the broadcasting association is a legal form (radiomk.de)", () => {
    const imp =
      "Impressum Verantwortlich für redaktionelle Inhalte gemäß §18 Abs.2 MStV: Veranstaltergemeinschaft für Lokalfunk im Märkischen Kreis e.V. Bahnhofstraße 5 58507 Lüdenscheid Vereinsregister VR 956";
    expect(verbandAus(imp, "")).toBeNull();
  });

  it("the register counts when the provider block names no company (tierherberge-paf.de)", () => {
    const imp =
      "IMPRESSUM Tierherberge Pfaffenhofen Am Tierheim 1 85276 Pfaffenhofen Registereintrag Vereinsregister: Ingolstadt Registernummer: VR 20480";
    expect(verbandAus(imp, "")).toEqual({ wo: "Vereinsregister im Impressum", treffer: "VR 20480" });
  });

  it("the register does not count under a company's provider block", () => {
    const imp =
      "Impressum Anbieter: Muster Medien Produktionsgesellschaft mbH & Co. KG Handelsregister Bielefeld: HRA 13120 Musterweg 2 33602 Bielefeld Förderverein VR 2636";
    expect(verbandAus(imp, "")).toBeNull();
  });

  it("the page title names the association when the imprint has none (landkreistag.de)", () => {
    const selbst = "Aktuelles – Deutscher Landkreistag (DLT) Deutscher Landkreistag - der kommunale Spitzenverband der 294 Landkreise";
    expect(verbandAus("", selbst)).toEqual({ wo: "Selbstbeschreibung", treffer: "Spitzenverband" });
  });

  it("an unread imprint is no finding", () => {
    expect(verbandAus("", "Startseite – Lokalnachrichten aus Bochum")).toBeNull();
  });
});
