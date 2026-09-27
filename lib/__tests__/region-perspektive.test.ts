import { describe, expect, it } from "vitest";
import {readdirSync,readFileSync} from "node:fs";
import { barHeight, insidePolygon, interiorPoint, projectRegions, type RegionGeometry, type Point } from "../region-perspektive";
import wuerzburg from "../../public/geo/gemeinden/09679.geo.json";

describe("district perspective", () => {
  it("places a bar inside the polygon, outside an enclosed independent city", () => {
    const rings: Point[][] = [
      [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]],
      [[3, 3], [7, 3], [7, 7], [3, 7], [3, 3]],
    ];
    expect(insidePolygon([5, 5], rings)).toBe(false);
    expect(insidePolygon(interiorPoint(rings), rings)).toBe(true);
  });
  it("keeps anchors inside concave municipal outlines", () => {
    const rings: Point[][] = [[[0, 0], [8, 0], [8, 2], [2, 2], [2, 8], [0, 8], [0, 0]]];
    expect(insidePolygon(interiorPoint(rings), rings)).toBe(true);
  });
  it("projects every real feature without merging the independent city into the district", () => {
    const result = projectRegions(wuerzburg.features as RegionGeometry[]);
    expect(result).toHaveLength(wuerzburg.features.length);
    expect(new Set(result.map(r => r.id)).size).toBe(result.length);
    expect(result.find(r => r.id === "09663000")?.name).toBe("Würzburg");
    for (const r of result) {
      expect(r.path).not.toMatch(/NaN|Infinity/);
      expect(r.anchor[0]).toBeGreaterThanOrEqual(75);
      expect(r.anchor[0]).toBeLessThanOrEqual(925);
      expect(r.anchor[1]).toBeGreaterThanOrEqual(225);
      expect(r.anchor[1]).toBeLessThanOrEqual(615);
    }
  });
  it("keeps 3D trees on forest land and closes the extrudable rings", () => {
    for (const region of projectRegions(wuerzburg.features as RegionGeometry[])) {
      for (const polygon of region.ground) for (const ring of polygon) expect(ring.at(-1)).toEqual(ring[0]);
      expect(region.ground.some(p => insidePolygon(region.groundAnchor, p))).toBe(true);
      if (region.kind !== "Gemeindefreies Gebiet") expect(region.groundTrees).toEqual([]);
      else {
        expect(region.groundTrees.length).toBeGreaterThan(0);
        for (const tree of region.groundTrees) expect(region.ground.some(p => insidePolygon(tree, p))).toBe(true);
      }
    }
  });
  it("uses linear heights with a true zero and no fabricated missing values", () => {
    expect(barHeight(50, 100)).toBe(barHeight(100, 100) / 2);
    for (const value of [null, 0, -1, NaN, Infinity]) expect(barHeight(value, 100)).toBe(0);
    expect(barHeight(10, 0)).toBe(0);
  });
  it("allows an empty geographic coverage", () => expect(projectRegions([])).toEqual([]));
});

it("supports every checked-in district boundary with finite geometry and interior anchors",()=>{
 for(const file of readdirSync("public/geo/gemeinden").filter(f=>f.endsWith(".geo.json"))){
  const data=JSON.parse(readFileSync(`public/geo/gemeinden/${file}`,"utf8"));
  const shapes=projectRegions(data.features);
  expect(shapes.length,file).toBe(data.features.length);
  for(const shape of shapes){
   expect(shape.bounds.every(Number.isFinite),`${file}:${shape.id}`).toBe(true);
   expect(shape.ground.some(p=>insidePolygon(shape.groundAnchor,p)),`${file}:${shape.id}`).toBe(true);
  }
 }
}, 30000);
