import { describe, it, expect } from "vitest";
import { embedCode } from "../embed-code";

// Dieser Code wird kopiert und auf einer FREMDEN Website eingefügt, mit unserem
// Namen darunter. Was hier schiefgeht, sieht niemand von uns — es steht bei
// jemand anderem auf der Seite.

const BASIS = {
  src: "/embed/gemeinde-solar",
  width: 480,
  height: 360,
  titel: "Solaranlagen in Höchberg",
  attribution: { path: "/solar-atlas", text: "Datenquelle: Solar Check" },
  siteUrl: "https://beispiel.test",
};

describe("Einbettungs-Code", () => {
  it("trägt den Textlink, nicht nur den Rahmen", () => {
    // DER TEXTLINK IST DER EIGENTLICHE RÜCKVERWEIS. Ein iframe zählt bei
    // Suchmaschinen nicht als Verweis der einbettenden Seite; der Anker darunter
    // schon. Wer ihn wegoptimiert, nimmt dem Einbetten seinen Zweck für uns.
    const code = embedCode(BASIS);
    expect(code).toContain('<a href="https://beispiel.test/solar-atlas"');
    expect(code).toContain("Datenquelle: Solar Check</a>");
  });

  it("maskiert alles, was in ein Attribut geht", () => {
    const code = embedCode({
      ...BASIS,
      titel: 'Ort "mit" <Zeichen> & Zeug',
      params: { ags: "09679147", theme: "a&b" },
    });
    // Ein Anführungszeichen im Titel beendete das Attribut mitten im Rahmen —
    // der Code stünde kaputt auf einer fremden Seite. Geprüft wird der INHALT
    // des Attributs, nicht seine Umgebung: Ein Muster über die ganze Zeile
    // schlägt sonst schon bei der Adresse darüber an (erste Fassung dieses
    // Tests, falsch positiv).
    const titel = code.match(/\stitle="([^"]*)"/);
    expect(titel, "kein Titel-Attribut gefunden").not.toBeNull();
    expect(titel![1]).not.toContain('"');
    // Und das Attribut endet dort, wo es enden soll — direkt vor dem Zeilenende.
    expect(code).toMatch(/\stitle="[^"]*"\n/);
    expect(code).toContain("&quot;mit&quot;");
    expect(code).toContain("&lt;Zeichen&gt;");
    // Auch im Abfrageteil: Ein nacktes & trennt in HTML kein Attribut, ist aber
    // ungültig — und genau solche Kleinigkeiten fallen bei einer zweiten
    // Codefassung als Erstes weg.
    expect(code).toContain("&amp;");
  });

  it("hängt den Ort an die Adresse", () => {
    const code = embedCode({ ...BASIS, params: { ags: "09679147" } });
    expect(code).toContain("/embed/gemeinde-solar?ags=09679147");
  });

  it("kommt ohne Abfrageteil auch ohne Fragezeichen aus", () => {
    expect(embedCode(BASIS)).toContain('src="https://beispiel.test/embed/gemeinde-solar"');
  });

  it("bleibt unter der angegebenen Breite flexibel", () => {
    // Feste Breite plus max-width: In einer schmalen Spalte schrumpft der
    // Rahmen mit, statt aus der Seite zu ragen.
    const code = embedCode(BASIS);
    expect(code).toContain('width="480"');
    expect(code).toContain("width:100%;max-width:480px");
  });
});
