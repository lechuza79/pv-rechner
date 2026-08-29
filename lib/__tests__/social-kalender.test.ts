import { describe, expect, it } from "vitest";
import { baueKalender, deckung, montagVon, type Gesendetes, type PlatzZuweisung } from "../social-kalender";
import type { PlanEintrag } from "../social-plan";
import type { SocialPost } from "../social-posts";
import { freiBaender, tagesbefund } from "../social-kalendertage";

/**
 * Die Wochenübersicht.
 *
 * Sie ist ABGELEITET, und diese Tests halten genau das fest. Ein Kalender mit
 * zugesagten Terminen war in diesem Projekt bewusst abgelehnt: Ein Datum je Post
 * ist eine Zusage, die niemand einhält, sobald eine Woche voll ist. Diese
 * Übersicht sagt nichts zu — sie zeigt Tatsachen (was rausging) und Vorrat (was
 * raus dürfte). Wer sie später auf gepflegte Termine umbaut, hebt genau das auf.
 */

const post = (id: string): SocialPost => ({
  id,
  titel: id,
  kategorie: "g13",
  kanal: ["linkedin"],
  text: "Text",
  bild: null,
  belege: [],
});

const frei = (id: string): PlanEintrag => ({ post: post(id), abdruck: id, hindernisse: [] });
const blockiert = (id: string, art: PlanEintrag["hindernisse"][number]["art"] = "freigabe"): PlanEintrag => ({
  post: post(id),
  abdruck: id,
  hindernisse: [{ art, text: "fehlt" }],
});

// Ein Mittwoch. Die Plätze liegen auf Di, Do, Fr.
const HEUTE = "2026-09-02";

describe("Die Woche", () => {
  it("findet den Montag, auch über den Sonntag hinweg", () => {
    expect(montagVon("2026-09-02")).toBe("2026-08-31");
    expect(montagVon("2026-08-31")).toBe("2026-08-31");
    // Sonntag gehört zur Woche davor, nicht zur nächsten.
    expect(montagVon("2026-09-06")).toBe("2026-08-31");
  });
});

describe("Was in den Plätzen steht", () => {
  it("füllt die kommenden Plätze der Reihe nach aus dem Vorrat", () => {
    const k = baueKalender([frei("a"), frei("b")], [], HEUTE, { wochenZurueck: 0, wochenVoraus: 0 });
    const kommend = k[0].plaetze.filter((p) => p.iso >= HEUTE);
    expect(kommend.filter((p) => p.zustand === "bereit").map((p) => (p as { post: SocialPost }).post.id)).toEqual([
      "a",
      "b",
    ]);
  });

  it("vergibt keinen Beitrag zweimal", () => {
    const k = baueKalender([frei("a")], [], HEUTE, { wochenZurueck: 0, wochenVoraus: 1 });
    const belegt = k.flatMap((w) => w.plaetze).filter((p) => p.zustand === "bereit");
    expect(belegt).toHaveLength(1);
  });

  it("füllt VERGANGENE Plätze nicht aus dem Vorrat", () => {
    // Ein leerer Tag in der Vergangenheit ist eine Tatsache. Ihn nachträglich zu
    // belegen wäre eine Behauptung über etwas, das nicht passiert ist.
    const k = baueKalender([frei("a")], [], HEUTE, { wochenZurueck: 1, wochenVoraus: 0 });
    const vergangen = k.flatMap((w) => w.plaetze).filter((p) => p.iso < HEUTE);
    expect(vergangen.every((p) => p.zustand === "vergangen-leer")).toBe(true);
  });

  it("zeigt in der Vergangenheit, was wirklich rausging", () => {
    const g: Gesendetes[] = [{ postId: "alt", titel: "Alt", gesendetAmIso: "2026-08-28" }];
    const k = baueKalender([], g, HEUTE, { wochenZurueck: 1, wochenVoraus: 0 });
    const treffer = k.flatMap((w) => w.plaetze).find((p) => p.zustand === "gesendet");
    expect(treffer && "postId" in treffer && treffer.postId).toBe("alt");
  });

  it("macht aus einer Lücke eine Aufgabe", () => {
    // Der eigentliche Zweck: Nicht „leer", sondern warum.
    const k = baueKalender([blockiert("x"), blockiert("y")], [], HEUTE, { wochenZurueck: 0, wochenVoraus: 0 });
    const leer = k[0].plaetze.find((p) => p.zustand === "leer");
    expect(leer && "grund" in leer && leer.grund).toMatch(/fehlende Freigaben \(2\)/);
  });

  it("sagt es auch, wenn gar nichts da ist", () => {
    const k = baueKalender([], [], HEUTE, { wochenZurueck: 0, wochenVoraus: 0 });
    const leer = k[0].plaetze.find((p) => p.zustand === "leer");
    expect(leer && "grund" in leer && leer.grund).toMatch(/Kein Beitrag mehr im Vorrat/);
  });
});

describe("Die Deckung", () => {
  it("zählt nur die kommenden Plätze", () => {
    const k = baueKalender([frei("a")], [], HEUTE, { wochenZurueck: 1, wochenVoraus: 0 });
    const d = deckung(k, HEUTE);
    expect(d.belegt).toBe(1);
    // Diese Woche hat drei Plätze, einer liegt vor heute.
    expect(d.belegt + d.offen).toBe(k.flatMap((w) => w.plaetze).filter((p) => p.iso >= HEUTE).length);
  });
});

describe("Zugewiesene Plätze", () => {
  const zuweisung = (datum: string, ueber: Partial<PlatzZuweisung> = {}): PlatzZuweisung => ({
    datum,
    art: "post",
    post_id: "a",
    familie: null,
    kategorie: null,
    titel: "Ein Beitrag",
    ...ueber,
  });

  it("schlägt den Vorschlag aus der Warteschlange", () => {
    // Eine Zuweisung ist eine Entscheidung, der Vorschlag nur eine Reihenfolge.
    const k = baueKalender([frei("b")], [], HEUTE, {
      wochenZurueck: 0,
      wochenVoraus: 0,
      zuweisungen: [zuweisung("2026-09-03")],
    });
    const platz = k[0].plaetze.find((p) => p.iso === "2026-09-03");
    expect(platz?.zustand).toBe("geplant");
  });

  it("zeigt einen VERSTRICHENEN Plan, statt ihn verschwinden zu lassen", () => {
    // Das ist die Antwort auf den alten Einwand gegen Kalender: Ein Termin, den
    // niemand eingehalten hat, wird ausgewiesen. Ein Plan, dessen Verstreichen
    // man sieht, ist etwas anderes als einer, der es verschweigt.
    const k = baueKalender([], [], HEUTE, {
      wochenZurueck: 1,
      wochenVoraus: 0,
      zuweisungen: [zuweisung("2026-08-27")],
    });
    const platz = k.flatMap((w) => w.plaetze).find((p) => p.iso === "2026-08-27");
    expect(platz?.zustand).toBe("verstrichen");
  });

  it("stellt einen zugewiesenen Beitrag nicht zusätzlich als Vorschlag auf", () => {
    // Sonst stünde derselbe Beitrag zweimal im Kalender.
    const k = baueKalender([frei("a")], [], HEUTE, {
      wochenZurueck: 0,
      wochenVoraus: 1,
      zuweisungen: [zuweisung("2026-09-03", { post_id: "a" })],
    });
    const alle = k.flatMap((w) => w.plaetze);
    expect(alle.filter((p) => p.zustand === "bereit")).toHaveLength(0);
    expect(alle.filter((p) => p.zustand === "geplant")).toHaveLength(1);
  });

  it("lässt sich auch ohne fertigen Beitrag belegen", () => {
    // Eine Datengeschichte oder ein individuelles Thema zeigt auf keinen Post —
    // der wird an dem Tag erst gebaut.
    const k = baueKalender([], [], HEUTE, {
      wochenZurueck: 0,
      wochenVoraus: 0,
      zuweisungen: [zuweisung("2026-09-03", { art: "individuell", post_id: null, titel: "Featurevorstellung" })],
    });
    const platz = k[0].plaetze.find((p) => p.iso === "2026-09-03");
    expect(platz && "zuweisung" in platz && platz.zuweisung.titel).toBe("Featurevorstellung");
  });

  it("zählt einen geplanten Platz als gedeckt", () => {
    const k = baueKalender([], [], HEUTE, {
      wochenZurueck: 0,
      wochenVoraus: 0,
      zuweisungen: [zuweisung("2026-09-03")],
    });
    expect(deckung(k, HEUTE).belegt).toBe(1);
  });
});

describe("Ratgeber im Kalender", () => {
  it("hängt an der WOCHE, nicht am Platz", () => {
    // Ratgeber liegen an beliebigen Wochentagen, auch an solchen ohne Platz.
    const k = baueKalender([], [], HEUTE, {
      wochenZurueck: 0,
      wochenVoraus: 0,
      artikel: [{ iso: "2026-09-02", slug: "/ratgeber/x", titel: "Ein Ratgeber", anlass: "live" }],
    });
    expect(k[0].artikel).toHaveLength(1);
    // Der 2.9. ist ein Mittwoch — dort liegt kein Platz.
    expect(k[0].plaetze.some((p) => p.iso === "2026-09-02")).toBe(false);
  });

  it("nimmt nur Artikel der eigenen Woche", () => {
    const k = baueKalender([], [], HEUTE, {
      wochenZurueck: 0,
      wochenVoraus: 1,
      artikel: [{ iso: "2026-09-09", slug: "/ratgeber/y", titel: "Nächste Woche", anlass: "ueberarbeitet" }],
    });
    expect(k[0].artikel).toHaveLength(0);
    expect(k[1].artikel).toHaveLength(1);
  });
});

describe("Das Wochenende gehört dazu", () => {
  /**
   * GEMESSENER FEHLER (29.08.2026). Der Kalender zeigte zuerst nur Mo–Fr, mit der
   * Begründung „am Wochenende wird nicht veröffentlicht". Das stimmt für
   * SENDEPLÄTZE und war für alles andere falsch:
   *
   *   — Drei von zehn Ratgeber-Daten liegen auf einem Samstag oder Sonntag. Die
   *     waren unsichtbar, ohne dass irgendwo etwas fehlte.
   *   — Der Marker für „heute" verschwand an jedem Wochenende vollständig, weil
   *     es keine Spalte gab, in die er gehört hätte. Genau so ist es dem
   *     Betreiber aufgefallen: an einem Samstag.
   *
   * Eine Spalte wegzulassen, weil EINE Sorte Inhalt dort nie steht, wirft jede
   * andere Sorte lautlos mit weg.
   */

  it("liefert Ratgeber-Ereignisse auch am Wochenende", () => {
    // 2026-09-05 ist ein Samstag, 2026-09-06 ein Sonntag.
    const k = baueKalender([], [], HEUTE, {
      wochenZurueck: 0,
      wochenVoraus: 0,
      artikel: [
        { iso: "2026-09-05", slug: "/ratgeber/sa", titel: "Samstag", anlass: "live" },
        { iso: "2026-09-06", slug: "/ratgeber/so", titel: "Sonntag", anlass: "live" },
      ],
    });
    expect(k[0].artikel.map((a) => a.slug)).toEqual(["/ratgeber/sa", "/ratgeber/so"]);
  });

  it("legt trotzdem keinen Sendeplatz aufs Wochenende", () => {
    // Die Kadenz ist Di/Do/Fr. Das Wochenende ist im Kalender sichtbar, aber
    // nicht belegbar — beides gleichzeitig ist der Punkt.
    const k = baueKalender([frei("a"), frei("b"), frei("c")], [], HEUTE, {
      wochenZurueck: 0,
      wochenVoraus: 0,
    });
    const wochentage = k[0].plaetze.map((p) => p.tag);
    expect(wochentage).toEqual(["Di", "Do", "Fr"]);
  });
});

describe("Ferienbänder", () => {
  /**
   * Ein Band, dessen Enden keinem Datum in der Wirklichkeit entsprechen.
   *
   * Gemessen im Browser: Das Band endete am 15.08.2026, obwohl an dem Tag noch
   * acht Länder Ferien hatten und Berlin, Brandenburg und Mecklenburg-Vorpommern
   * bis in die Folgewoche. Es endete dort, weil die ZAHL der Länder unter eine
   * gegriffene Schwelle fiel — nicht weil die Ferien endeten. Ein Balken mit
   * runden Ecken, der ein falsches Datum behauptet, ist schlimmer als keiner:
   * Man liest ihn als Auskunft.
   */
  it("endet, wo die Ferien enden — nicht, wo eine Schwelle unterschritten wird", () => {
    for (const montag of ["2026-08-10", "2026-08-17", "2026-08-24"]) {
      const band = freiBaender(montag).find((b) => b.text.startsWith("Ferien"));
      expect(band, `Woche ${montag} ohne Ferienband`).toBeTruthy();
      for (let i = band!.vonIndex; i <= band!.bisIndex; i++) {
        const d = new Date(`${montag}T12:00:00Z`);
        d.setUTCDate(d.getUTCDate() + i);
        expect(tagesbefund(d.toISOString().slice(0, 10)).ferienLaender).toBeGreaterThan(0);
      }
    }
  });

  it("bleibt ein Band, auch wenn nur der letzte Ferientag in die Woche ragt", () => {
    // 14.09.2026 ist der letzte Tag der bayerischen Sommerferien und liegt als
    // einziger Ferientag in seiner Woche. Vorher entschied die BREITE über die
    // Darstellung — daraus wurde ein Punkt, der wie ein Feiertag aussah: sechs
    // Wochen Ferien als Ereignis ohne Dauer. Ein Feiertag hat keine Dauer, ein
    // Ferienzeitraum immer; dass nur ein Tag ins Sichtfeld ragt, ändert daran
    // nichts.
    const band = freiBaender("2026-09-14").find((b) => b.text.startsWith("Ferien"));
    expect(band!.vonIndex).toBe(band!.bisIndex);
    expect(band!.art).toBe("ferien");
    // Und die Enden sagen die Wahrheit: Der Zeitraum läuft aus der Vorwoche
    // herein und hört hier wirklich auf.
    expect(band!.echterBeginn).toBe(false);
    expect(band!.echtesEnde).toBe(true);
  });

  it("nennt die Spanne, wenn sich die Zahl innerhalb des Bandes ändert", () => {
    // Woche ab 10.08.2026: Montag dreizehn Länder, Sonntag sieben. Nur den
    // Höchstwert zu nennen wäre eine Aussage über EINEN Tag, quer über sieben
    // gemalt — dieselbe Fehlerklasse wie eine Beschriftung, die etwas anderes
    // sagt als die Zahl darunter misst.
    const band = freiBaender("2026-08-10").find((b) => b.text.startsWith("Ferien"));
    expect(band!.text).toMatch(/Ferien in \d+–\d+ Ländern/);
  });
});
