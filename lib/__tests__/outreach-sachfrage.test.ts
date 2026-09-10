import { describe, it, expect } from "vitest";
import { istAntwortAufSachfrage } from "../outreach-sachfrage";
import { INQUIRY_BETREFF_ANFANG, inquirySubject } from "../funding-inquiry-draft";

const mail = (betreff: string, roh = "") => ({ betreff, roh: roh || betreff });

describe("Antwort auf eine Sachfrage ist keine Antwort auf den Brief", () => {
  // DER ANLASSFALL. Beide Gespräche laufen über dasselbe Postfach und dieselben
  // Amtsadressen; ohne diese Weiche verbucht der Rücklauf die Antwort einer
  // Förderstelle als Reaktion auf unser Anschreiben.
  it("erkennt die Antwort auf eine Sachfrage am zitierten Betreff", () => {
    expect(istAntwortAufSachfrage(mail(`AW: ${INQUIRY_BETREFF_ANFANG} „Solarbonus"`))).toBe(true);
  });

  // Ein Mailprogramm kürzt den Betreff mitunter, zitiert ihn im Text aber
  // vollständig — deshalb zählen beide Stellen.
  it("erkennt sie auch, wenn nur der zitierte Text sie trägt", () => {
    const roh = `Guten Tag,\n\n> Betreff: ${INQUIRY_BETREFF_ANFANG} „Solarbonus"\n> Ihre Anfrage`;
    expect(istAntwortAufSachfrage({ betreff: "AW: Ihre Anfrage", roh })).toBe(true);
  });

  // Ein über eine Zeile umbrochenes Zitat trägt zusätzlichen Leerraum; der
  // Betreff bliebe sonst unerkannt und die Antwort landete beim Brief.
  it("übersteht Umbrüche und Groß-/Kleinschreibung im Zitat", () => {
    const umbrochen = INQUIRY_BETREFF_ANFANG.replace(" ", "\n>   ").toUpperCase();
    expect(istAntwortAufSachfrage({ betreff: "Re:", roh: `> ${umbrochen} „X"` })).toBe(true);
  });

  // DIE WICHTIGERE RICHTUNG: Eine echte Antwort auf unser Anschreiben darf
  // nicht aussortiert werden — sie ist der einzige Rücklauf, der ohne Zutun
  // verfällt.
  it("lässt eine echte Antwort auf den Kommunen-Brief durch", () => {
    const brief = "AW: PLATZ 1: Trier bei Balkonkraftwerken auf Platz 1 von 5 in Rheinland-Pfalz";
    expect(istAntwortAufSachfrage(mail(brief))).toBe(false);
  });

  it("lässt Abwesenheitsnotizen und Unzustellbarkeiten durch", () => {
    expect(istAntwortAufSachfrage(mail("Automatische Antwort: Eichenzell bei privater Solarleistung"))).toBe(false);
    expect(istAntwortAufSachfrage(mail("Undelivered Mail Returned to Sender"))).toBe(false);
  });

  // Eine Mail, die zufällig über Förderung schreibt, ist keine Antwort auf
  // unsere Sachfrage — die Marke ist der volle Betreffanfang, kein Stichwort.
  it("greift nicht bei einer beliebigen Mail über Förderprogramme", () => {
    expect(istAntwortAufSachfrage(mail("Neues Förderprogramm in unserer Stadt"))).toBe(false);
    expect(istAntwortAufSachfrage(mail("Stand des Programms"))).toBe(false);
  });

  // Die Marke kommt aus dem Entwurf, nicht aus einer zweiten getippten Fassung:
  // Sonst fällt die Weiche beim ersten Umformulieren stumm aus.
  it("hängt am erzeugten Betreff, nicht an einer eigenen Zeichenkette", () => {
    const echt = inquirySubject({ programName: "Klimabonus Muster" } as never);
    expect(istAntwortAufSachfrage(mail(`AW: ${echt}`))).toBe(true);
  });
});
