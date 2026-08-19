// Der Speicher-Ratgeber (/balkonkraftwerk/ratgeber/mit-speicher) lebt davon, dass jede Zahl
// darauf aus dem Modell kommt, mit dem der Rechner rechnet. Steht dort einmal
// ein getippter Euro-Betrag, driftet die Seite beim ersten Wächter-Lauf vom
// Rechner weg — und eine Ratgeber-Seite, deren Beispiel dem eigenen Rechner
// widerspricht, ist schlimmer als gar keine.
//
// Geprüft wird deshalb dreierlei:
//   1. Die Seite rechnet, statt zu tippen (Quelltext-Prüfung).
//   2. Der Referenzfall der Seite ist derselbe wie im FAQ (sonst stehen zwei
//      verschiedene Beispielhaushalte unter derselben Überschrift).
//   3. Die Aussagen, die den Text tragen, gelten wirklich — sie sind hier als
//      Realitäts-Anker nachgerechnet, nicht als Wortlaut festgeschrieben.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { calcBalkon, recommendBalkon } from "../balkon";
import {
  DEFAULT_BALKON_CONFIG as CFG,
  STORAGE_ROUNDTRIP_KETTE,
} from "../balkon-config";
import { PERSONEN } from "../constants";
import { balkonSpeicherFaq } from "../faq";
import { RATGEBER } from "../ratgeber";
import { STAND } from "../stand";

const SEITE = join(__dirname, "..", "..", "app", "(site)", "balkonkraftwerk", "ratgeber", "mit-speicher", "page.tsx");
const quelltext = readFileSync(SEITE, "utf8");

const PFAD = "/balkonkraftwerk/ratgeber/mit-speicher";

// Derselbe Fall, den Seite und FAQ benutzen: Zwei Personen, Standard-Set,
// senkrecht am Südgeländer, Homeoffice-Tage, deutscher Durchschnittsertrag.
const basis = {
  orientationId: "sued_gelaender" as const,
  presenceId: "teils" as const,
  haushaltKwh: PERSONEN[1].verbrauch,
  specificYield: CFG.specificYield,
  monthlyYield: null,
  stromPrice: CFG.stromPrice,
};
const ohne = calcBalkon({ ...basis, setId: "duo", storageId: "none" });
const klein = calcBalkon({ ...basis, setId: "duo", storageId: "small" });
const gross = calcBalkon({ ...basis, setId: "duo", storageId: "large" });

describe("Speicher-Ratgeber: alle Zahlen kommen aus dem Modell", () => {
  it("die Seite rechnet mit calcBalkon, statt Beträge zu tippen", () => {
    expect(quelltext).toContain("calcBalkon");
    // Kein Euro-Literal im JSX. Erlaubt sind Zahlen in Stilangaben (Abstände,
    // Breiten) — die stehen alle vor dem "€"-Zeichen an anderer Stelle. Gesucht
    // wird deshalb gezielt nach dem Muster „<Zahl> €" bzw. „<Zahl> Euro".
    expect(quelltext).not.toMatch(/\d[\d.]*\s*(€|Euro)/);
    // Und keine getippte Jahresangabe als Amortisation — auch nicht ohne
    // Nachkommastelle („nach 7 Jahren drin") oder im Singular.
    expect(quelltext).not.toMatch(/\d+(,\d)?\s*Jahr(en|e)?\s+(drin|wieder|amortis)/i);
  });

  it("das FAQ nennt dieselben Zahlen wie die Seite (ein Referenzfall, nicht zwei)", () => {
    const antworten = balkonSpeicherFaq().map(e => e.a).join("\n");
    expect(antworten).toContain(Math.round(klein.storageAddedKwh).toLocaleString("de-DE"));
    expect(antworten).toContain(klein.storagePrice.toLocaleString("de-DE"));
    expect(antworten).toContain(ohne.savingPerYear.toLocaleString("de-DE"));
  });

  it("die Wirkungsgrad-Kette und der Rechenwert bleiben beieinander", () => {
    // Die Seite schlüsselt die drei Faktoren auf, der Rechner benutzt das
    // Produkt. Laufen sie auseinander, erklärt die Seite eine andere Zahl, als
    // sie zeigt — die Fehlerklasse, wegen der die Kette überhaupt in die Config
    // gewandert ist.
    const produkt =
      STORAGE_ROUNDTRIP_KETTE.laden * STORAGE_ROUNDTRIP_KETTE.entladen * STORAGE_ROUNDTRIP_KETTE.batterie;
    expect(produkt).toBeCloseTo(CFG.storageRoundtrip, 3);
    // Die Leitquelle nennt 82,5 % — der Rechenwert muss die gerundete Fassung
    // sein, nicht das ungerundete Produkt (sonst erfundene Genauigkeit).
    expect(CFG.storageRoundtrip).toBe(Number(produkt.toFixed(3)));
  });
});

// Die drei Aussagen, die den Text tragen. Sie sind hier nachgerechnet, damit
// eine Config-Änderung die Seite umwirft, statt sie still falsch werden zu
// lassen — dann muss jemand den Text anfassen, und genau das ist der Zweck.
describe("Speicher-Ratgeber: die Kernaussagen halten", () => {
  it("der große Speicher kostet deutlich mehr und bringt kaum mehr Strom", () => {
    const mehrPreis = gross.storagePrice / klein.storagePrice - 1;
    const mehrStrom = gross.storageAddedKwh / klein.storageAddedKwh - 1;
    expect(mehrPreis).toBeGreaterThan(mehrStrom * 2);
    // Am STANDARD-Set ist er schlechter als gar kein Speicher. Der Zusatz
    // „am Standard-Set" ist nicht Beiwerk: Er ist die Bedingung, unter der der
    // Satz gilt — siehe die Umkehrung im nächsten Test.
    expect(gross.lifetimeSaving).toBeLessThan(ohne.lifetimeSaving);
    expect(klein.lifetimeSaving).toBeGreaterThan(ohne.lifetimeSaving);
  });

  it("mit vier Modulen kehrt sich die Speichergröße um", () => {
    // DER BEFUND, DER DIESEN TEST ERZWUNGEN HAT (adversariale Prüfung
    // 19.08.2026): Eine frühere Fassung schrieb „der größere Speicher ist meist
    // der schlechtere Kauf" ohne die Bedingung — und schickte den Leser zwei
    // Absätze vorher zu mehr Modulen, wo genau das nicht mehr stimmt. Der Test
    // davor konnte das prinzipiell nicht sehen, weil er nur „duo" kannte.
    const maxOhne = calcBalkon({ ...basis, setId: "max", storageId: "none" });
    const maxKlein = calcBalkon({ ...basis, setId: "max", storageId: "small" });
    const maxGross = calcBalkon({ ...basis, setId: "max", storageId: "large" });
    expect(maxGross.lifetimeSaving).toBeGreaterThan(maxKlein.lifetimeSaving);
    expect(maxKlein.lifetimeSaving).toBeGreaterThan(maxOhne.lifetimeSaving);
    // Und er trägt sich dort innerhalb der Empfehlungsschwelle — sonst dürfte
    // die Seite ihn nicht als beste Wahl ausweisen.
    expect(maxGross.storagePayback).toBeLessThanOrEqual(CFG.storageRecommendMaxPayback);
  });

  it("die Seite widerspricht der Empfehlung des Rechners nicht", () => {
    // Ratgeber und Rechner rechnen dasselbe Modell. Sagt der eine „vier Module
    // mit großem Speicher" und der andere „großer Speicher lohnt nicht", ist
    // einer von beiden falsch — und der Nutzer sieht beides.
    const empfehlung = recommendBalkon(basis);
    const set = CFG.sets.find(x => x.id === empfehlung.best.setId)!;
    const speicher = CFG.storage.find(x => x.id === empfehlung.best.storageId)!;
    // Die Seite nennt die Empfehlung wörtlich aus recommendBalkon, statt sie zu
    // behaupten — geprüft wird deshalb, dass sie sie überhaupt abfragt.
    expect(quelltext).toContain("recommendBalkon(basis)");
    expect(quelltext).toContain("empfohlenesSet");
    expect(quelltext).toContain("empfohlenerSpeicher");
    // Sicherheitsnetz gegen den umgekehrten Fehler: Empfiehlt der Rechner einen
    // Speicher, darf die Seite nicht pauschal von Speichern abraten.
    if (speicher.kwh > 0) {
      expect(calcBalkon({ ...basis, setId: set.id, storageId: empfehlung.best.storageId }).storagePayback)
        .toBeLessThanOrEqual(CFG.storageRecommendMaxPayback);
    }
  });

  it("die Amortisation wird schlechter, je mehr der Haushalt tagsüber verbraucht", () => {
    // Gegen die verbreitete Faustregel („Speicher lohnt sich für große
    // Haushalte") — bei Steckersolar gilt sie nicht, weil der Wechselrichter
    // deckelt. Beide Gefälle der Tabelle auf der Seite werden hier geprüft.
    const payback = (haushaltKwh: number, presenceId: "weg" | "teils" | "home") =>
      calcBalkon({ ...basis, haushaltKwh, presenceId, setId: "duo", storageId: "small" }).storagePayback;

    // Mehr Anwesenheit tagsüber → längere Amortisation.
    expect(payback(PERSONEN[1].verbrauch, "weg")).toBeLessThan(payback(PERSONEN[1].verbrauch, "teils"));
    expect(payback(PERSONEN[1].verbrauch, "teils")).toBeLessThan(payback(PERSONEN[1].verbrauch, "home"));
    // Größerer Haushalt → längere Amortisation, über ALLE vier Zeilen. Die
    // letzte trug bis dahin keinen Anker, obwohl beide „nie"-Zellen dort liegen
    // und der Absatz darunter sich auf sie beruft.
    expect(payback(PERSONEN[0].verbrauch, "teils")).toBeLessThan(payback(PERSONEN[1].verbrauch, "teils"));
    expect(payback(PERSONEN[1].verbrauch, "teils")).toBeLessThan(payback(PERSONEN[2].verbrauch, "teils"));
    expect(payback(PERSONEN[2].verbrauch, "teils")).toBeLessThan(payback(PERSONEN[3].verbrauch, "teils"));
    // Die Aussage „in großen Haushalten mit Tagverbrauch trägt er sich nicht"
    // braucht mindestens einen Fall, in dem das wirklich so ist.
    expect(payback(PERSONEN[3].verbrauch, "home")).toBe(Infinity);
  });

  it("die Autarkie-Zahl ist die Autarkie, nicht der Eigenverbrauch", () => {
    // Eine frühere Fassung kündigte die Autarkie an und lieferte den
    // Eigenverbrauch (63 → 89 statt 16 → 22). Genau die Fehlerklasse aus
    // CLAUDE.md, „Aussagen zählen wie Zahlen": Beschriftung sagt etwas
    // anderes, als die Zahl misst. Beide Paare müssen unterscheidbar bleiben.
    expect(klein.autarky).toBeGreaterThan(ohne.autarky);
    expect(klein.selfShare).toBeGreaterThan(ohne.selfShare);
    expect(Math.round(klein.autarky * 100)).not.toBe(Math.round(klein.selfShare * 100));
    expect(quelltext).toContain("klein.autarky");
    expect(quelltext).toContain("ohne.autarky");
  });

  it("keine Formulierungen, die eine Konfigurationsänderung still falsch macht", () => {
    // Alle fünf sind schon einmal dagestanden und wurden von der adversarialen
    // Prüfung am 19.08.2026 widerlegt. Sie kommen beim nächsten Umschreiben
    // zurück, wenn sie hier nicht verboten sind.
    expect(quelltext).not.toMatch(/jede sechste/i);            // 17,5 % sind jede 5,7te
    expect(quelltext).not.toMatch(/zahlt drauf/i);             // traf nur 3 von 12 Fällen
    expect(quelltext).not.toMatch(/billiger je gewonnener/i);  // fürs 4. Modul falsch
    expect(quelltext).not.toMatch(/halb so lange/i);           // 12 von 20 Jahren sind 60 %
    expect(quelltext).not.toMatch(/die meisten .{0,20}Aussagen/i); // unbelegt über Dritte
  });

  it("mehr Module verkürzen die Speicher-Amortisation stärker als jede Speichergröße", () => {
    const proSet = (setId: "single" | "duo" | "max") =>
      calcBalkon({ ...basis, setId, storageId: "small" }).storagePayback;
    expect(proSet("max")).toBeLessThan(proSet("duo"));
    // Am kleinsten Set trägt sich der Speicher gar nicht — der Satz „wer dort
    // einen Speicher dazukauft, kauft ihn für X kWh im Jahr" hängt daran.
    expect(proSet("single")).toBe(Infinity);
  });
});

// Zwei Sätze der Seite hängen an Config-PREISEN, ohne dass eine Zahl sie
// sichtbar macht. Sie werden beim nächsten Lauf des Quartals-Wächters still
// falsch, wenn hier kein Anker steht (Befund 8 der adversarialen Prüfung).
describe("Speicher-Ratgeber: preisabhängige Sätze", () => {
  it("der Satz „Größenordnung der Module“ bleibt wahr", () => {
    // Untertitel und Meta-Beschreibung sagen das über den kleinen Speicher
    // gegenüber dem Standard-Set. „Größenordnung" ist großzügig, aber nicht
    // beliebig: Zwischen halb so teuer und doppelt so teuer trägt der Satz,
    // darüber hinaus nicht mehr.
    const standard = CFG.sets.find(x => x.id === "duo")!;
    const klein = CFG.storage.find(x => x.id === "small")!;
    const verhaeltnis = klein.price / standard.price;
    expect(verhaeltnis).toBeGreaterThan(0.5);
    expect(verhaeltnis).toBeLessThan(2);
  });

  it("die Zusatzkapazität des großen Speichers bleibt das schlechte Geschäft", () => {
    // Die Seite nennt dafür zwei gerechnete Zahlen (Ladungen im Jahr, Preis je
    // zusätzlicher Jahres-Kilowattstunde). Kippte das Verhältnis, wäre der
    // ganze Abschnitt falsch herum.
    const zusatzKapazitaet = gross.storageKwh - klein.storageKwh;
    const zusatzKwh = gross.storageAddedKwh - klein.storageAddedKwh;
    expect(zusatzKapazitaet).toBeGreaterThan(0);
    expect(zusatzKwh).toBeGreaterThan(0);
    // Deutlich weniger als eine Füllung pro Woche — das ist die Aussage.
    expect(zusatzKwh / zusatzKapazitaet).toBeLessThan(52);
    // Und die Mehrkapazität kostet ein Vielfaches dessen, was sie einbringt.
    const mehrPreis = gross.storagePrice - klein.storagePrice;
    expect(mehrPreis / zusatzKwh).toBeGreaterThan(5);
  });

  it("keine unbelegten Superlative über fremde Inhalte oder Häufigkeiten", () => {
    expect(quelltext).not.toMatch(/häufigste/i);
    expect(quelltext).not.toMatch(/die meisten (Tage|Seiten|Anbieter|Ratgeber)/i);
  });
});

describe("Speicher-Ratgeber: Registrierung", () => {
  it("steht in der Ratgeber-Registry", () => {
    expect(RATGEBER.some(r => r.slug === PFAD)).toBe(true);
  });

  it("trägt einen Stand-Eintrag und rendert ihn", () => {
    expect(STAND[PFAD]).toBeDefined();
    expect(quelltext).toContain(`<StandNote pfad="${PFAD}"`);
  });

  it("die Krümelspur nennt das Thema als Elternteil, nicht die Ratgeber-Liste", () => {
    // Eine BreadcrumbList, die „Ratgeber" behauptet, beschreibt eine Hierarchie,
    // die die Adresse nicht hat (CLAUDE.md, Routen-Schema).
    const spur = quelltext.slice(quelltext.indexOf("<Breadcrumb"), quelltext.indexOf("</h1>"));
    expect(spur).toContain('href: "/balkonkraftwerk"');
    expect(spur).not.toContain('"/ratgeber"');
  });

  it("nennt sich nirgends einen Test — wir messen keine Geräte (§ 5 UWG)", () => {
    // Der Wortlaut der Seite darf das Keyword bedienen, aber nie behaupten,
    // hier sei etwas getestet worden. Geprüft werden die Stellen, an denen so
    // eine Behauptung entstünde: Titel, Beschreibung und Überschriften.
    const kopf = quelltext.slice(0, quelltext.indexOf("const S = {"));
    expect(kopf).not.toMatch(/title:\s*"[^"]*[Tt]est/);
    expect(kopf).not.toMatch(/description:\s*"[^"]*\b[Tt]est(sieger|bericht)?\b/);
    for (const m of quelltext.matchAll(/<h2 style=\{S\.h2\}>([^<]*)</g)) {
      expect(m[1]).not.toMatch(/\bTest\b/);
    }
  });
});
