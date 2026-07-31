import { describe, it, expect } from "vitest";
import { askVariante, bilanziere, refToken, WIDGET_AB_EINWOHNER } from "../kommunen-ask";

describe("Ask-Variante", () => {
  it("große Gemeinden bekommen den Widget-Absatz", () => {
    expect(askVariante({ population: WIDGET_AB_EINWOHNER + 1 })).toBe("meldung_plus_widget");
  });

  it("kleine Gemeinden bekommen nur die Meldung", () => {
    expect(askVariante({ population: 3_000 })).toBe("nur_meldung");
    expect(askVariante({ population: WIDGET_AB_EINWOHNER })).toBe("nur_meldung"); // Grenze exklusiv
  });

  it("eine BELEGTE operative Stelle schlägt die Einwohnerzahl", () => {
    // Wenige Fälle, aber die sicheren: hier wissen wir, dass es eine
    // Pressereferentin gibt — dann kann die Gemeinde ein Widget auch umsetzen.
    expect(askVariante({ population: 4_000, operativeStelle: true })).toBe("meldung_plus_widget");
  });

  it("kommt mit unbekannter Einwohnerzahl klar", () => {
    expect(askVariante({ population: null })).toBe("nur_meldung");
  });
});

describe("Auswertung je Variante", () => {
  const zeilen = [
    { versendet_variante: "nur_meldung", ref_klicks: 3, responded_at: "2026-07-30", widget_anfrage: false },
    { versendet_variante: "nur_meldung", ref_klicks: 0, responded_at: null, widget_anfrage: false },
    { versendet_variante: "meldung_plus_widget", ref_klicks: 5, responded_at: "2026-07-31", widget_anfrage: true },
    // noch nicht versendet — zählt nirgends mit
    { versendet_variante: null, ref_klicks: 9, responded_at: "2026-08-01", widget_anfrage: true },
  ];

  it("zählt je Variante getrennt und ignoriert Unversendetes", () => {
    const b = bilanziere(zeilen);
    const nur = b.find((x) => x.variante === "nur_meldung")!;
    const plus = b.find((x) => x.variante === "meldung_plus_widget")!;
    expect(nur.versendet).toBe(2);
    expect(nur.klicks).toBe(3);
    expect(nur.antworten).toBe(1);
    expect(plus.versendet).toBe(1);
    expect(plus.widgetAnfragen).toBe(1);
  });

  it("zählt Gemeinden mit Klick getrennt von der Klicksumme", () => {
    // Ein Sicherheits-Scanner im Mailserver kann die Summe hochtreiben; die
    // Zahl der Gemeinden mit überhaupt einem Klick ist robuster.
    const b = bilanziere(zeilen);
    expect(b.find((x) => x.variante === "nur_meldung")!.gemeindenMitKlick).toBe(1);
  });
});

describe("Weiterleitungs-Token", () => {
  it("nimmt den Slug, damit der Link lesbar bleibt", () => {
    expect(refToken("hoechberg", "09679135", new Set())).toBe("hoechberg");
  });

  it("hängt bei Namensgleichheit den Schlüssel an", () => {
    expect(refToken("neustadt", "09679135", new Set(["neustadt"]))).toBe("neustadt-135");
  });

  it("fällt ohne Slug auf den Schlüssel zurück", () => {
    expect(refToken(null, "09679135", new Set())).toBe("09679135");
  });
});
