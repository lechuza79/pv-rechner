import { describe, expect, it } from "vitest";
import { rankMovement, storyEdition, type RankObservation } from "../orts-story-feed";
import type { OrtsBeitrag } from "../orts-posts";

const beitrag = { post: { id: "ort-12345678-vergleich-solar", text: "Platz 2" }, storyKennung: "vergleich-solar", text: "Platz 2" } as OrtsBeitrag;
const before: RankObservation = { sourceDate: "2026-07-05", rules: "v1", group: "kreis-solar", members: ["a", "b"], ranks: [{ regionId: "a", rank: 2, value: 10 }] };

describe("Permanent story editions", () => {
  it("is idempotent across repeated captures and does not modify the working story", () => {
    const a = storyEdition("12345678", "2026-08-05", beitrag, "2026-09-10T00:00:00Z");
    const b = storyEdition("12345678", "2026-08-05", beitrag, "2026-09-11T00:00:00Z");
    expect(a.id).toBe(b.id);
    expect(beitrag.storyKennung).toBe("vergleich-solar");
    expect(a.beitrag.storyKennung).toBe(a.id);
  });
  it("gives changed text or data editions separate permanent identities", () => {
    const a = storyEdition("12345678", "2026-08-05", beitrag, "2026-09-10");
    expect(storyEdition("12345678", "2026-09-05", beitrag, "2026-09-10").id).not.toBe(a.id);
    expect(storyEdition("12345678", "2026-08-05", { ...beitrag, text: "Platz 3" }, "2026-09-10").id).not.toBe(a.id);
  });
  it("rejects mismatched municipalities", () => {
    expect(() => storyEdition("87654321", "2026-08-05", beitrag, "2026-09-10")).toThrow();
  });
});

describe("Rank movements", () => {
  it.each([[1, 1], [3, -1], [2, 0]])("includes rank %s as movement %s", (rank, delta) => {
    expect(rankMovement(before, { ...before, sourceDate: "2026-08-05", ranks: [{ regionId: "a", rank, value: 12 }] }, "a")).toBe(delta);
  });
  it("rejects changed peers, rules and repeated source dates", () => {
    expect(rankMovement(before, { ...before, sourceDate: "2026-08-05", members: ["a", "c"] }, "a")).toBeNull();
    expect(rankMovement(before, { ...before, sourceDate: "2026-08-05", rules: "v2" }, "a")).toBeNull();
    expect(rankMovement(before, before, "a")).toBeNull();
  });
});

import { rankStory } from "../orts-rang-stories";
import type { OrtsStory } from "../orts-stories";
const base = { kennung: "vergleich-solar", grundlage: "Gleiche Größenklasse", gemessen: "Solarleistung je Einwohner", werte: [] } as unknown as OrtsStory;
it("builds dated ascent and descent drafts without an inferred cause", () => {
  for (const [rank, word] of [[1, "aufgestiegen"], [3, "abgestiegen"]] as const) {
    const story = rankStory(base, "Testort", "a", before, { ...before, sourceDate: "2026-08-05", ranks: [{ regionId: "a", rank, value: 10 }] });
    expect(story?.text).toContain(word);
    expect(story?.kennung).toContain("2026-08-05");
    expect(story?.werte.map(w => w.wert)).toEqual([2, rank]);
    expect(story?.grundlage).toContain("belegt keine Ursache");
  }
});
it("does not draft unchanged or incomparable ranks", () => {
  expect(rankStory(base, "Testort", "a", before, { ...before, sourceDate: "2026-08-05" })).toBeNull();
  expect(rankStory(base, "Testort", "a", before, { ...before, sourceDate: "2026-08-05", group: "other" })).toBeNull();
});
