import { describe, it, expect } from "vitest";
import {
  cfAdresseKlartext,
  ohneAdressVerschleierung,
  rollenAus,
  postfaecherAus,
  rangFuerFunktion,
  themenAus,
  geschichtenZu,
  reichweiteAus,
  medienurteil,
  prioritaet,
  redaktionsSeiten,
  siehtNachImpressumAus,
  titelBrauchbar,
  istMarkeStattName,
} from "../presse-extrakt";

/**
 * Jeder Test hier ist an einem GEMESSENEN Fehlgriff kalibriert — Eichung am
 * 03.09.2026 an pv-magazine.de, zfk.de, test.de, ikz.de, energiezukunft.eu und
 * taz.de, jede Zeile von Hand gegengelesen. Wer ein Muster aufweicht, damit mehr
 * Treffer entstehen, macht diese Tests rot; genau dafür sind sie da.
 */

describe("Verschleierte Adressen", () => {
  it("entschlüsselt eine Cloudflare-Adresse", () => {
    // Aus dem echten Quelltext von pv-magazine.de/info/pv-magazine-team/.
    const klar = cfAdresseKlartext("a6c3c5cdcec7d4d288c1c9d3d4c7d5e6d6d08bcbc7c1c7dccfc8c388c5c9cb");
    expect(klar).toContain("@");
    expect(klar).toMatch(/^[\w.+-]+@[\w-]+\.[a-z]{2,}$/);
  });

  it("nimmt keinen Hexwert an, der keine Adresse ergibt", () => {
    expect(cfAdresseKlartext("aabbcc")).toBeNull();
    expect(cfAdresseKlartext("nicht-hex")).toBeNull();
  });

  it("ersetzt auch ein span, nicht nur einen Verweis", () => {
    // DER GEMESSENE FEHLGRIFF: Die erste Fassung fasste nur <a> an. Auf der
    // Teamseite von pv magazine blieben dadurch alle 27 Adressen verloren,
    // während der Lauf trotzdem 27 Personen meldete.
    const hex = "a6c3c5cdcec7d4d288c1c9d3d4c7d5e6d6d08bcbc7c1c7dccfc8c388c5c9cb";
    const html = `<span class="__cf_email__" data-cfemail="${hex}">[email&#160;protected]</span>`;
    expect(ohneAdressVerschleierung(html)).toContain("@");
    expect(ohneAdressVerschleierung(html)).not.toContain("protected]");
  });
});

describe("Rollen und Namen", () => {
  it("liest den Namen von der Zeile ÜBER der Funktion", () => {
    // Der Regelfall auf Teamseiten — und der Grund, warum die erste Fassung
    // Namen und Funktionen quer über Einträge hinweg vermischte
    // („Emiliano Bellini News Director" als Name).
    const html = `<div><p>Sandra Enkhardt</p><p>News Director, Germany</p>
      <p>Michael Fuhs</p><p>Head of Editorial</p></div>`;
    const r = rollenAus(html);
    const namen = r.map((x) => x.name);
    expect(namen).toContain("Sandra Enkhardt");
    expect(namen).toContain("Michael Fuhs");
    expect(namen.some((n) => /Director|Editorial/.test(n))).toBe(false);
  });

  it("liest den Namen hinter der Funktion", () => {
    const html = "<p>Chefredaktion (V.i.S.d.P.): Klaus Hinkel redaktion@zfk.de</p>";
    const r = rollenAus(html);
    expect(r[0].name).toBe("Klaus Hinkel");
    expect(r[0].rang).toBe(100);
  });

  it("hält den Zusatz der Funktion fest", () => {
    // „Editor, France" und „News Director, Germany" sind für einen deutschen
    // Verteiler zwei verschiedene Adressaten. Ohne den Zusatz nicht trennbar.
    const html = `<div><p>Marie Beyer</p><p>Editor, France</p></div>`;
    expect(rollenAus(html)[0].funktion).toBe("Editor, France");
  });

  it("stuft eine Auslandsredaktion zurück", () => {
    expect(rangFuerFunktion("Editor, Germany")).toBeGreaterThan(
      rangFuerFunktion("Editor, France"),
    );
    expect(rangFuerFunktion("Editor, Australia")).toBeLessThan(50);
  });

  it("hält eine Firma nicht für einen Menschen", () => {
    const html = "<p>Verantwortlich für den Inhalt: Muster Verlag GmbH</p>";
    expect(rollenAus(html)).toHaveLength(0);
  });

  it("hält einen Menüpunkt nicht für einen Menschen", () => {
    // GEMESSEN auf energiezukunft.eu: „Magazine Netiquette Impressum" landete
    // als Name im Katalog, weil es zwei großgeschriebene Wörter sind.
    const html = "<div><p>Magazine Netiquette Impressum</p><p>Redaktion</p></div>";
    expect(rollenAus(html).map((r) => r.name)).not.toContain("Magazine Netiquette Impressum");
  });

  it("hält eine Funktionsbezeichnung nicht für einen Namen", () => {
    // GEMESSEN auf ikz.de: „Chief Content Officer" stand als Name im Katalog.
    const html = "<div><p>Chief Content Officer</p><p>Verlagsleitung</p></div>";
    expect(rollenAus(html).map((r) => r.name)).not.toContain("Chief Content Officer");
  });

  it("hält einen Satzrest mit Artikel am Ende nicht für einen Namen", () => {
    // GEMESSEN auf finanztip.de: „Redaktionskodex Der" stand als Person im
    // Katalog — der Test auf den Artikel am ANFANG hat das nicht gefangen.
    const html = "<div><p>Redaktionskodex Der</p><p>Redaktion</p></div>";
    expect(rollenAus(html).map((r) => r.name)).not.toContain("Redaktionskodex Der");
  });

  it("hält ein Titelkürzel nicht für einen Nachnamen", () => {
    // GEMESSEN auf haustec.de: „SBZ Monteur" — der Name einer
    // Schwesterzeitschrift — stand als Chefredakteur im Katalog.
    const html = "<div><p>SBZ Monteur</p><p>Chefredakteur</p></div>";
    expect(rollenAus(html)).toHaveLength(0);
  });

  it("ordnet eine fremde Adresse neben einem Namen NICHT der Person zu", () => {
    const html = "<div><p>Klaus Hinkel</p><p>Chefredakteur</p><p>redaktion@zfk.de</p></div>";
    expect(rollenAus(html)[0].mail).toBeNull();
  });

  it("nimmt die Adresse, die zum Namen passt", () => {
    const html = "<div><p>Klaus Hinkel</p><p>Chefredakteur</p><p>klaus.hinkel@zfk.de</p></div>";
    expect(rollenAus(html)[0].mail).toBe("klaus.hinkel@zfk.de");
  });
});

describe("Postfächer", () => {
  it("sortiert Redaktion vor Werbung", () => {
    const html = `<p>anzeigen@zfk.de redaktion@zfk.de info@zfk.de</p>`;
    const p = postfaecherAus(html, "zfk.de");
    expect(p[0].mail).toBe("redaktion@zfk.de");
    expect(p.find((x) => x.mail === "anzeigen@zfk.de")?.werblich).toBe(true);
  });

  it("nimmt keine Adresse einer fremden Domain", () => {
    // Dieselbe Regel wie bei Gemeinden und Fachbetrieben, wo sie zwei
    // Agenturadressen abgefangen hat.
    const p = postfaecherAus("<p>redaktion@irgendeine-agentur.de</p>", "zfk.de");
    expect(p).toHaveLength(0);
  });

  it("erkennt eine persönlich aussehende Adresse als solche", () => {
    // GEMESSEN: emiliano.bellini@pv-magazine.com stand im Katalog als
    // „Redaktion (Postfach)" — ein Mensch, wie ein Verteiler beschriftet.
    const p = postfaecherAus("<p>emiliano.bellini@pv-magazine.com</p>", "pv-magazine.com");
    expect(p[0].persoenlich).toBe(true);
    const q = postfaecherAus("<p>redaktion@pv-magazine.com</p>", "pv-magazine.com");
    expect(q[0].persoenlich).toBe(false);
  });

  it("nimmt keine Datenschutz-Auskunftsadresse", () => {
    // GEMESSEN auf test.de: datenschutzauskunft@ stand als Kontakt im Katalog.
    const p = postfaecherAus("<p>datenschutzauskunft@stiftung-warentest.de</p>", "stiftung-warentest.de");
    expect(p).toHaveLength(0);
  });
});

describe("Themen und Geschichten", () => {
  it("zählt Themen und leitet die Geschichten daraus ab", () => {
    const text = "Photovoltaik Solaranlage Solarstrom Balkonkraftwerk Balkonkraftwerk";
    const t = themenAus(text);
    expect(t[0].name).toBe("photovoltaik");
    expect(geschichtenZu(t)).toContain("Solarzubau und Rankings");
    expect(geschichtenZu(t)).toContain("Balkonkraftwerke");
  });

  it("lässt ein einzelnes Vorkommen nicht zählen", () => {
    // Ein einzelnes Wort ist genauso oft ein Menüpunkt wie ein Thema.
    expect(geschichtenZu([{ name: "speicher", treffer: 1 }])).toHaveLength(0);
  });
});

describe("Reichweite", () => {
  it("nimmt nur beschriftete Zahlen", () => {
    expect(reichweiteAus("Auflage: 45.000 Exemplare")).not.toBeNull();
    expect(reichweiteAus("Gegründet 1998 in Berlin")).toBeNull();
    expect(reichweiteAus("Seite 12 von 30")).toBeNull();
  });

  it("hält eine Jahreszahl nicht für eine Auflage", () => {
    expect(reichweiteAus("Leser seit 2018")).toBeNull();
  });
});

describe("Medienurteil", () => {
  it("erkennt ein redaktionelles Angebot", () => {
    const html = `<p>Aktuelles</p><p>Redaktion</p><p>12. Januar 2026</p>`;
    expect(medienurteil(html).ist).toBe("medium");
  });

  it("erkennt einen Shop als Nicht-Medium", () => {
    const html = `<p>In den Warenkorb</p><p>Artikelnummer 12</p><p>inkl. MwSt.</p>`;
    expect(medienurteil(html).ist).toBe("kein-medium");
  });
});

describe("Priorität", () => {
  it("stellt Passung über Reichweite", () => {
    const stark = prioritaet({
      themen: [{ name: "photovoltaik", treffer: 20 }],
      hatPerson: true,
      hatRedaktionsPostfach: false,
      hatIrgendeinenWeg: true,
    });
    expect(stark).toBe("A");
  });

  it("gibt ohne Kontaktweg nie A", () => {
    const p = prioritaet({
      themen: [{ name: "photovoltaik", treffer: 99 }],
      hatPerson: false,
      hatRedaktionsPostfach: false,
      hatIrgendeinenWeg: false,
    });
    expect(p).toBe("C");
  });
});

describe("Seiten und Titel", () => {
  it("findet die Unterseiten aus den Links", () => {
    const html = `<a href="/rechtliches/impressum/">Impressum</a>
      <a href="/info/team/">Das Team</a><a href="/kontakt">Kontakt</a>`;
    const s = redaktionsSeiten(html, "https://example.de/");
    expect(s.impressum).toContain("/rechtliches/impressum/");
    expect(s.team).toContain("/info/team/");
    expect(s.kontakt).toContain("/kontakt");
  });

  it("prüft eine geratene Impressumsadresse am Inhalt", () => {
    expect(siehtNachImpressumAus("Vertreten durch: Max Mustermann, USt-IdNr. DE123")).toBe(true);
    expect(siehtNachImpressumAus("Seite nicht gefunden. Zurück zur Startseite")).toBe(false);
  });

  it("erkennt einen nichtssagenden Titel auch als Wortteil", () => {
    // GEMESSEN auf dstgb.de: „Startseite der Webseite" stand als Name des
    // Mediums im Katalog.
    expect(titelBrauchbar("Startseite der Webseite")).toBe(false);
    expect(titelBrauchbar("Themen")).toBe(false);
    // Ein generisches Wort MITTEN im Titel macht ihn nicht unbrauchbar —
    // sonst fiele der Katalog ohne Not auf die Saat zurück.
    expect(titelBrauchbar("Kommunalpolitische Übersicht 2026")).toBe(true);
  });

  it("hält die Marke des Mediums nicht für einen Personennamen", () => {
    // GEMESSEN: „Springer Professional", „National Geographic Magazin" und
    // „CORRECTIV CrowdNewsroom" standen als Personen im Katalog.
    expect(istMarkeStattName("Springer Professional", "springerprofessional.de", "Springer Professional")).toBe(true);
    expect(istMarkeStattName("National Geographic Magazin", "nationalgeographic.de", "National Geographic Magazin")).toBe(true);
    // Ein echter Mensch beim selben Medium bleibt stehen.
    expect(istMarkeStattName("Klaus Hinkel", "zfk.de", "ZfK")).toBe(false);
  });

  it("nimmt einen nichtssagenden Seitentitel nicht als Namen des Mediums", () => {
    // GEMESSEN: energate-messenger.de und ikz.de standen mit dem Medium-Namen
    // „Startseite" im Katalog.
    expect(titelBrauchbar("Startseite")).toBe(false);
    expect(titelBrauchbar("Home")).toBe(false);
    expect(titelBrauchbar("ZfK")).toBe(true);
  });
});
