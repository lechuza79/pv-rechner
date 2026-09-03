import { describe, it, expect } from "vitest";
import {
  istPressePostfach,
  empfaengerFuerBrief,
  presseLinkRang,
  brauchtKontext,
  presseKontextBelegt,
} from "../kommunen-presse";
import { postfachBefund } from "../outreach-mail";

// Alle Adressen unten sind echte Funde vom 03.09.2026 an den größten Städten
// des offenen NRW-Schubs.
describe("Presse-Postfach erkennen", () => {
  it("erkennt die echten Funde", () => {
    for (const m of [
      "presse@duesseldorf.de",
      "pressestelle@bocholt.de",
      "pressestelle@lippstadt.de",
      "presse@kleve.de",
      "pressestelle@koenigswinter.de",
      "pressestelle@coesfeld.de",
      "pressestelle@kamp-lintfort.de",
      "pressestelle@goch.de",
      "redaktion@gemeinde-dennheritz.de",
    ]) {
      expect(istPressePostfach(m), m).toBe(true);
    }
  });

  it("erkennt die Schreibweisen mit Trennzeichen", () => {
    expect(istPressePostfach("presse.info@musterstadt.de")).toBe(true);
    expect(istPressePostfach("presse-team@musterstadt.de")).toBe(true);
    expect(istPressePostfach("Öffentlichkeitsarbeit@Musterstadt.DE")).toBe(true);
  });

  // DIE WICHTIGERE RICHTUNG. Ein falsch erkanntes Postfach schickt den Brief an
  // die falsche Stelle, und das fällt niemandem auf — die Mail kommt an.
  it("hält die allgemeinen Postfächer heraus", () => {
    for (const m of [
      "info@langenfeld.de",
      "stadt@viersen.de",
      "poststelle@duesseldorf.de",
      "kontakt@guetersloh.de",
      "rathaus@musterstadt.de",
      "stadtverwaltung@bocholt.de",
    ]) {
      expect(istPressePostfach(m), m).toBe(false);
    }
  });

  // Als Wortstamm gesucht träfe „presse" auch einen Nachnamen — derselbe
  // Fehlgriff, der bei den Förder-Wortfiltern schon gemessen wurde
  // („Beförderung" enthält „Förderung").
  it("sucht ganze Wörter, keine Wortstämme", () => {
    expect(istPressePostfach("pressel@musterstadt.de")).toBe(false);
    expect(istPressePostfach("pressluft@musterstadt.de")).toBe(false);
    expect(istPressePostfach("medienzentrum-abo@musterstadt.de")).toBe(false);
  });

  // „medien" ALLEIN ist die Pressestelle (bei Brilon nachgesehen: Abteilung
  // „Medien / Öffentlichkeitsarbeit" im Rathaus, eigene Durchwahl). Mit einem
  // Zusatz dahinter ist es oft eine ganz andere Stelle — ein Medienzentrum der
  // Schulverwaltung, eine medienpädagogische Beratung. Der Zusatz entscheidet.
  it("nimmt medien nur alleinstehend", () => {
    expect(istPressePostfach("medien@brilon.de")).toBe(true);
    expect(istPressePostfach("medien-zentrum@musterstadt.de")).toBe(false);
    expect(istPressePostfach("medien.paedagogik@musterstadt.de")).toBe(false);
    expect(istPressePostfach("medienteam@musterstadt.de")).toBe(true);
  });

  it("nimmt kommunikation ebenfalls nur alleinstehend", () => {
    expect(istPressePostfach("kommunikation@musterstadt.de")).toBe(true);
    expect(istPressePostfach("kommunikation-technik@musterstadt.de")).toBe(false);
  });

  // Stadtmarketing ist vielerorts eine eigene Gesellschaft für Tourismus und
  // Veranstaltungen. Ein Angebot dorthin sieht aus wie Werbung.
  it("nimmt Marketing NICHT als Pressestelle", () => {
    expect(istPressePostfach("marketing@musterstadt.de")).toBe(false);
    expect(istPressePostfach("stadtmarketing@musterstadt.de")).toBe(false);
  });

  it("verträgt fehlende Angaben", () => {
    expect(istPressePostfach(null)).toBe(false);
    expect(istPressePostfach("")).toBe(false);
    expect(istPressePostfach("   ")).toBe(false);
  });
});

describe("Empfänger des Briefes", () => {
  it("nimmt die Presseadresse, wenn es eine gibt", () => {
    const e = empfaengerFuerBrief({ rollenEmail: "info@goch.de", presseEmail: "pressestelle@goch.de" });
    expect(e).toEqual({ email: "pressestelle@goch.de", anPresse: true });
  });

  it("bleibt beim allgemeinen Postfach, wenn keine Presseadresse bekannt ist", () => {
    expect(empfaengerFuerBrief({ rollenEmail: "info@goch.de" })).toEqual({
      email: "info@goch.de",
      anPresse: false,
    });
  });

  // Eine falsch eingetragene Adresse darf den Versand nicht an eine Stelle
  // schicken, die gar keine Pressestelle ist — geprüft wird auch das, was in
  // der Presse-Spalte steht.
  it("misstraut einer Presse-Spalte, die keine Presseadresse enthält", () => {
    expect(
      empfaengerFuerBrief({ rollenEmail: "info@goch.de", presseEmail: "buergermeister@goch.de" }),
    ).toEqual({ email: "info@goch.de", anPresse: false });
  });

  it("meldet gar keine Adresse, wenn beide fehlen", () => {
    expect(empfaengerFuerBrief({ rollenEmail: null }).email).toBeNull();
  });
});

// Der Hinweis des Betreibers (03.09.2026): Die Presseseite steht meist in der
// Fußzeile, oft neben den Social-Media-Links. Sie wird also gefunden, wenn man
// sie ZUERST nimmt — genau daran ist der erste Anlauf gescheitert. Der Crawl
// behandelte alle Treffer gleich, und die Dutzenden „rathaus"- und
// „kontakt"-Links einer Großstadt füllten das Abruf-Budget, bevor der
// Presse-Link an der Reihe war. Düsseldorf verlinkt sein Medienportal auf der
// Startseite; gefunden wurde es trotzdem nie.
describe("Rangfolge der Presse-Links", () => {
  it("stellt Presse- und Medienportal vor Kontakt und Rathaus", () => {
    expect(presseLinkRang("/medienportal")).toBeGreaterThan(presseLinkRang("/infonav/kontakt"));
    expect(presseLinkRang("/rathaus/presseportal.php")).toBeGreaterThan(presseLinkRang("/rathaus"));
    expect(presseLinkRang("/presse")).toBeGreaterThan(presseLinkRang("/impressum"));
  });

  // Kontakt und Impressum bleiben drin, aber als Zwischenschritt: Von dort
  // führt der Weg weiter, sie sind selbst nicht das Ziel.
  it("wirft die schwachen Wörter nicht weg", () => {
    expect(presseLinkRang("/impressum")).toBeGreaterThan(0);
    expect(presseLinkRang("/rathaus")).toBeGreaterThan(0);
  });

  it("bewertet auch den Linktext, nicht nur die Adresse", () => {
    expect(presseLinkRang("/x/y/12345", "Presseportal")).toBe(100);
  });

  it("verwirft, was gar kein Link auf eine Seite ist", () => {
    expect(presseLinkRang("mailto:presse@x.de")).toBe(0);
    expect(presseLinkRang("#presse")).toBe(0);
    expect(presseLinkRang("/veranstaltungen")).toBe(0);
  });
});

// ZWEI LISTEN, DIE ÜBEREINSTIMMEN MÜSSEN. Die Versand-Prüfung hat eine eigene
// Liste von Funktionswörtern; „medien" stand nicht darin, und sie warf
// medien@brilon.de als vermuteten Personennamen aus dem Versand. Seitdem fragt
// sie die Presse-Wortliste mit — dieser Test hält beide zusammen.
describe("Presse-Postfächer bestehen die Versand-Prüfung", () => {
  it("nimmt jedes erkannte Pressepostfach als Funktionspostfach an", () => {
    for (const [mail, ort] of [
      ["medien@brilon.de", "Brilon"],
      ["newsroom@duesseldorf.de", "Düsseldorf"],
      ["presse@kleve.de", "Kleve"],
      ["pressestelle@goch.de", "Goch"],
      ["redaktion@gemeinde-dennheritz.de", "Dennheritz"],
    ] as const) {
      expect(postfachBefund(mail, ort).ok, mail).toBe(true);
    }
  });

  // Die Gegenrichtung bleibt scharf: Ein Nachname wird weiterhin abgewiesen.
  it("lässt sich davon nicht aufweichen", () => {
    expect(postfachBefund("pressel@brilon.de", "Brilon").ok).toBe(false);
    expect(postfachBefund("mueller@brilon.de", "Brilon").ok).toBe(false);
  });
});

// NICHT NUR DIE SCHREIBWEISE, SONDERN DER ZUSAMMENHANG (Einwand des Betreibers,
// 03.09.2026). Die Adresse allein sagt bei zwei Wörtern nichts: kommunikation@
// ist in der einen Verwaltung die Stabsstelle, in der nächsten die
// Kommunikationstechnik; medien@ ist bei Brilon die Pressestelle und anderswo
// ein Medienzentrum.
describe("Kontext statt Schreibweise", () => {
  it("verlangt einen Beleg nur bei den mehrdeutigen Wörtern", () => {
    expect(brauchtKontext("medien@brilon.de")).toBe(true);
    expect(brauchtKontext("kommunikation@musterstadt.de")).toBe(true);
    // Diese bedeuten in einer Verwaltung nichts anderes.
    expect(brauchtKontext("presse@kleve.de")).toBe(false);
    expect(brauchtKontext("pressestelle@goch.de")).toBe(false);
    expect(brauchtKontext("redaktion@musterstadt.de")).toBe(false);
  });

  it("nimmt einen Ausschnitt an, der die Pressestelle benennt", () => {
    expect(presseKontextBelegt("Stadt Brilon, Medien / Öffentlichkeitsarbeit, Zimmer 36")).toBe(true);
    expect(presseKontextBelegt("Ansprechpartner für Journalistinnen und Journalisten")).toBe(true);
  });

  // EIN GEGENWORT SCHLÄGT EIN TREFFWORT. „Presse" steht auf einer Kommunalseite
  // fast immer irgendwo in der Navigation; wenn daneben „Medienzentrum" steht,
  // ist die Frage beantwortet.
  it("weist ab, wo ein Gegenwort steht — auch mit Presse-Wort daneben", () => {
    expect(presseKontextBelegt("Medienzentrum des Kreises · Presse · Kontakt")).toBe(false);
    expect(presseKontextBelegt("Abteilung Kommunikationstechnik, Öffentlichkeitsarbeit")).toBe(false);
  });

  it("weist ab, wo gar nichts dafür spricht", () => {
    expect(presseKontextBelegt("Öffnungszeiten des Bürgerbüros")).toBe(false);
    expect(presseKontextBelegt("")).toBe(false);
  });
});
