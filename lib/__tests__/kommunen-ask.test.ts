import { describe, it, expect } from "vitest";
import {
  askVariante,
  refToken,
  verteile,
  VARIANTE_ERKLAERUNG,
  VERTEILUNG_HINWEIS,
  WIDGET_AB_EINWOHNER,
} from "../kommunen-ask";

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

describe("Verteilung je Variante", () => {
  const zeilen: { versendet_variante: string | null; responded_at: string | null; widget_anfrage: boolean }[] = [
    { versendet_variante: "nur_meldung", responded_at: "2026-07-30", widget_anfrage: false },
    { versendet_variante: "nur_meldung", responded_at: null, widget_anfrage: false },
    { versendet_variante: "meldung_plus_widget", responded_at: "2026-07-31", widget_anfrage: true },
    // noch nicht versendet — zählt nirgends mit
    { versendet_variante: null, responded_at: "2026-08-01", widget_anfrage: true },
  ];

  it("zählt je Variante getrennt und ignoriert Unversendetes", () => {
    const b = verteile(zeilen);
    const nur = b.find((x) => x.variante === "nur_meldung")!;
    const plus = b.find((x) => x.variante === "meldung_plus_widget")!;
    expect(nur.versendet).toBe(2);
    expect(nur.antworten).toBe(1);
    expect(plus.versendet).toBe(1);
    expect(plus.widgetAnfragen).toBe(1);
  });

  // DIE VARIANTE IST EINE ZIELREGEL, KEIN VERSUCH.
  //
  // Sie hängt an der Einwohnerzahl, die beiden Gruppen unterscheiden sich also
  // nach Gemeindegröße und nicht nach Zufall. Die Oberfläche behauptete bis zum
  // 20.08.2026 das Gegenteil („beide Fassungen sind sonst identisch — sonst
  // wüssten wir hinterher nicht, woran eine Reaktion lag"), und dieser Satz war
  // im Browser nicht als falsch zu erkennen: Er beschrieb einen Versuchsaufbau,
  // den es nie gab.
  //
  // Geprüft wird die AUSSAGE, nicht der Wortlaut — ein Test auf den alten Satz
  // wäre grün, sobald jemand ihn umformuliert (derselbe Fehler wie beim
  // Vertrauens-Leisten-Audit).
  it("behauptet nirgends, die Varianten seien vergleichbar", () => {
    const beide = `${VARIANTE_ERKLAERUNG} ${VERTEILUNG_HINWEIS}`.toLowerCase();
    expect(beide).not.toMatch(/sonst identisch|im übrigen identisch|woran eine reaktion lag/);
    expect(beide).not.toMatch(/\ba\/b\b|test der beiden|versuchsaufbau/);
    // Und sie sagt, WORAN die Zuordnung hängt — ohne das ist „Verteilung" nur
    // ein anderes Wort für dieselbe Behauptung.
    expect(VARIANTE_ERKLAERUNG).toMatch(/Größe|Einwohner/);
    expect(VERTEILUNG_HINWEIS).toMatch(/kein Vergleich/i);
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
