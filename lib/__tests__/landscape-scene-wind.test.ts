import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { sceneDefekte, type CheckedScene } from "../landscape-scene-check";

// Published scenes live in the scene bucket; the upload refuses any place this check
// rejects. Here the check is held against the fixture places kept in the repo and
// against a built defect, so it cannot silently stop seeing anything.
const ROOT = join(process.cwd(), "public/geo/landscape-tours");
const scenes = readdirSync(ROOT).filter(d => existsSync(join(ROOT, d, "scene.json")));

describe("landscape stages draw complete turbines", () => {
  it("fixture places pass", () => {
    expect(scenes.length).toBeGreaterThan(0);
    const broken = scenes.flatMap(place => sceneDefekte(JSON.parse(readFileSync(join(ROOT, place, "scene.json"), "utf8")) as CheckedScene).map(d => `${place} ${d}`));
    expect(broken).toEqual([]);
  }, 60000);

  it("rejects a turbine without dimensions and a tower body beside a turbine", () => {
    const tower = { id: "B1", surfaces: [{ points: [[0, 0, 0], [8, 80, 8]] as [number, number, number][] }] };
    const scene: CheckedScene = { turbines: [{ id: "T1", x: 4, z: 4, hub: null, rotor: 120 }], buildings: [tower] };
    expect(sceneDefekte(scene)).toEqual(["turbine T1 without dimensions", "tower building B1"]);
  });

  it("rejects a surveyed wind turbine body far from the register position", () => {
    // Hückelhoven: the surveyed tower stood 42 m from the register position.
    const far = { id: "W1", function: "51002_1220", surfaces: [{ points: [[40, 0, 0], [45, 155, 5]] as [number, number, number][] }] };
    const chimney = { id: "C1", function: "51002_1251", surfaces: [{ points: [[40, 0, 0], [45, 80, 5]] as [number, number, number][] }] };
    const scene: CheckedScene = { turbines: [{ id: "T1", x: 0, z: 0, hub: 149, rotor: 136 }], buildings: [far, chimney] };
    expect(sceneDefekte(scene)).toEqual(["surveyed wind turbine building W1"]);
  });
});
