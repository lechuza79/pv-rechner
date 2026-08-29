import { describe, expect, it } from "vitest";
import { baueKalender, deckung, montagVon, type Gesendetes } from "../social-kalender";
import type { PlanEintrag } from "../social-plan";
import type { SocialPost } from "../social-posts";

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
