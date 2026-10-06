import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Every published stage must draw complete turbines: a missing hub height or rotor
// renders a ground marker, and LoD2 tower bodies render as bare cylinders beside
// the turbine. scripts/landscape_wind_dimensions.py repairs both during preparation.
const ROOT = join(process.cwd(), "public/geo/landscape-tours");
type Point = [number, number, number];
type Scene = { turbines?: { id: string; x: number; z: number; hub: number | null; rotor: number | null }[];
  buildings?: { id: string; surfaces: { points: Point[] }[] }[] };

const scenes = readdirSync(ROOT).filter(d => existsSync(join(ROOT, d, "scene.json")));

describe("published landscape stages draw complete turbines", () => {
  it("covers the prepared places", () => expect(scenes.length).toBeGreaterThan(50));

  it("no turbine without hub height and rotor, no LoD2 tower beside a turbine", () => {
    const broken: string[] = [];
    for (const place of scenes) {
      const scene = JSON.parse(readFileSync(join(ROOT, place, "scene.json"), "utf8")) as Scene;
      const turbines = scene.turbines ?? [];
      for (const t of turbines) if (!(Number(t.hub) > 0 && Number(t.rotor) > 0)) broken.push(`${place} turbine ${t.id} without dimensions`);
      if (!turbines.length) continue;
      for (const b of scene.buildings ?? []) {
        const pts = b.surfaces.flatMap(s => s.points);
        const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), zs = pts.map(p => p[2]);
        const x = (Math.max(...xs) + Math.min(...xs)) / 2, z = (Math.max(...zs) + Math.min(...zs)) / 2;
        const footprint = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs));
        const near = turbines.some(t => Math.hypot(x - t.x, z - t.z) <= 15);
        if (near && footprint <= 16 && Math.max(...ys) - Math.min(...ys) >= 20) broken.push(`${place} tower building ${b.id}`);
      }
    }
    expect(broken).toEqual([]);
  }, 60000);
});
