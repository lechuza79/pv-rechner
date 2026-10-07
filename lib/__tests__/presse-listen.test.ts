import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { benannteDomains, bewusstPresse, doppeltBenannt, listeFuer } from "../presse-listen";

const lies = (p: string) => readFileSync(resolve(__dirname, "../..", p), "utf8");

describe("press catalogue lists (press · topic associations · archive)", () => {
  it("no domain sits in two lists, none twice in one", () => {
    expect(doppeltBenannt()).toEqual([]);
    const alle = benannteDomains();
    expect(alle.length).toBe(new Set(alle).size);
  });

  it("whatever is not named stays press", () => {
    expect(listeFuer("pv-magazine.de")).toEqual({ liste: "presse", grund: null });
  });

  it("measured cases, read by hand on 07.10.2026", () => {
    // A topic association goes to its own list.
    expect(listeFuer("vku.de").liste).toBe("verbaende");
    expect(listeFuer("verbraucherzentrale.de").liste).toBe("verbaende");
    // A club without a topic link goes to the archive, with its group.
    expect(listeFuer("drk-hohenlohe.de")).toEqual({ liste: "archiv", grund: "Rettungsdienst und Wohlfahrt" });
    expect(listeFuer("kfv-online.de").liste).toBe("archiv");
    // Run by an e.V. and still press: a citizen radio, a research institute,
    // a journalists' network.
    expect(listeFuer("osradio.de").liste).toBe("presse");
    expect(listeFuer("ise.fraunhofer.de").liste).toBe("presse");
    expect(listeFuer("klimajournalismus.de").liste).toBe("presse");
    // Decided to stay press although no medium: the free weeklies' association.
    expect(listeFuer("bvda.de").liste).toBe("presse");
    expect(bewusstPresse("bvda.de")).toBe(true);
    expect(bewusstPresse("drk-hohenlohe.de")).toBe(false);
  });
});

describe("every press flow respects the lists", () => {
  it("the profile run does not read the archive again", () => {
    expect(lies("scripts/presse-refresh.ts")).toMatch(/\.filter\(\(m\) => m\.liste !== "archiv"\)/);
  });

  it("press suitability is judged for the press list only", () => {
    expect(lies("scripts/presse-refresh.ts")).toMatch(/\.filter\(\(m\) => !m\.liste \|\| m\.liste === "presse"\)/);
  });

  it("contact search and release take media and associations, never the archive", () => {
    const filter = 'or("ist_medium.eq.medium,liste.eq.verbaende").or("liste.is.null,liste.neq.archiv")';
    expect(lies("scripts/presse-kontakte.ts")).toContain(filter);
    expect(lies("scripts/kontakte-freigabe.ts")).toContain(filter);
  });

  it("the admin view shows the press list by default", () => {
    const route = lies("app/api/admin/presse/route.ts");
    expect(route).toMatch(/liste: sp\.get\("liste"\) \?\? "presse"/);
    expect(route).toMatch(/if \(f\.liste === "presse"\) q = q\.or\("liste\.is\.null,liste\.eq\.presse"\)/);
  });
});
