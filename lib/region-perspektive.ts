/** Static oblique projection: geography stays on the ground, bars stay vertical.
 * The input is independent of the administrative level and the metric's unit.
 */
export type Point = [number, number];
export type RegionGeometry = {
  properties: { id: string; name: string; kind?: string; kreis?: string };
  geometry: { type: string; coordinates: unknown };
};
export type ProjectedRegion = { id: string; name: string; kind?: string; ground: Point[][][]; groundAnchor: Point; groundTrees: Point[]; sidePath: string; trees: Point[]; path: string; anchor: Point; bounds: [number, number, number, number] };

function polygons(feature: RegionGeometry): Point[][][] {
  return feature.geometry.type === "Polygon"
    ? [feature.geometry.coordinates as Point[][]]
    : feature.geometry.type === "MultiPolygon" ? feature.geometry.coordinates as Point[][][] : [];
}

function area(ring: Point[]) {
  return Math.abs(ring.reduce((sum, p, i) => {
    const q = ring[(i + 1) % ring.length];
    return sum + p[0] * q[1] - q[0] * p[1];
  }, 0) / 2);
}

function inRing([x, y]: Point, ring: Point[]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], b = ring[j];
    if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}

export function insidePolygon(p: Point, rings: Point[][]) {
  return inRing(p, rings[0]) && !rings.slice(1).some(r => inRing(p, r));
}

/** An interior point, not an averaged coordinate that may land in a neighbour
 * or a hole. Scanlines guarantee an interior interval even for thin polygons.
 */
export function interiorPoint(rings: Point[][]): Point {
  const ys = rings[0].map(p => p[1]);
  const lo = Math.min(...ys), hi = Math.max(...ys);
  let best: Point = rings[0][0];
  let width = -1;
  for (let line = 1; line < 40; line++) {
    const y = lo + (hi - lo) * line / 40;
    const hits: number[] = [];
    for (const ring of rings) for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const a = ring[i], b = ring[j];
      if ((a[1] > y) !== (b[1] > y)) hits.push(a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
    }
    hits.sort((a, b) => a - b);
    for (let i = 0; i + 1 < hits.length; i += 2) {
      const candidate: Point = [(hits[i] + hits[i + 1]) / 2, y];
      const score = (hits[i + 1] - hits[i]) * (1 - .5 * Math.abs((y - lo) / (hi - lo) - .5));
      if (score > width && insidePolygon(candidate, rings)) { best = candidate; width = score; }
    }
  }
  return best;
}

export function projectRegions(features: RegionGeometry[]): ProjectedRegion[] {
  const valid = features.map(feature => ({ feature, polygons: polygons(feature) })).filter(f => f.polygons.length);
  const points = valid.flatMap(f => f.polygons.flat(2));
  if (!points.length) return [];
  const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const correction = Math.cos(cy * Math.PI / 180);
  const raw = ([x, y]: Point): Point => {
    const east = (x - cx) * correction, south = cy - y;
    return [east * .96 + south * .28, (south * .96 - east * .28) * .60];
  };
  const rawPoints = points.map(raw);
  const xx = rawPoints.map(p => p[0]), yy = rawPoints.map(p => p[1]);
  const minX = Math.min(...xx), maxX = Math.max(...xx), minY = Math.min(...yy), maxY = Math.max(...yy);
  const scale = Math.min(850 / (maxX - minX), 390 / (maxY - minY));
  const project = (p: Point): Point => {
    const [x, y] = raw(p);
    return [500 + (x - (minX + maxX) / 2) * scale, 420 + (y - (minY + maxY) / 2) * scale];
  };
  return valid.map(({ feature, polygons: shapes }) => {
    const largest = shapes.reduce((a, b) => area(a[0]) > area(b[0]) ? a : b);
    const projected = shapes.flat(2).map(project);
    const px = projected.map(p => p[0]), py = projected.map(p => p[1]);
    const projectedLargest = largest.map(ring => ring.map(project));
    const trees: Point[] = [];
    if (feature.properties.kind === "Gemeindefreies Gebiet") {
      for (let y = Math.min(...py) + 7; y < Math.max(...py) - 5; y += 13) {
        for (let x = Math.min(...px) + 7; x < Math.max(...px) - 5; x += 15) {
          if (insidePolygon([x, y], projectedLargest) && insidePolygon([x - 4, y], projectedLargest) && insidePolygon([x + 4, y], projectedLargest)) trees.push([x, y]);
        }
      }
    }
    const groundPoint = ([x, y]: Point): Point => [(x-cx)*correction*scale, (cy-y)*scale];
    const ground = shapes.map(poly => poly.map(ring => ring.map(groundPoint)));
    const groundLargest = largest.map(ring => ring.map(groundPoint));
    const groundTrees: Point[] = [];
    if (feature.properties.kind === "Gemeindefreies Gebiet") {
      const ring = groundLargest[0], xx = ring.map(p=>p[0]), zz = ring.map(p=>p[1]);
      for (let z = Math.min(...zz)+8; z < Math.max(...zz)-8; z+=12) {
        for (let x = Math.min(...xx)+8; x < Math.max(...xx)-8; x+=12) {
          if ([[x,z],[x-4,z],[x+4,z],[x,z-4],[x,z+4]].every(p=>insidePolygon(p as Point,groundLargest))) groundTrees.push([x,z]);
        }
      }
      if (!groundTrees.length) groundTrees.push(groundPoint(interiorPoint(largest)));
    }
    return {
      ground, groundAnchor: groundPoint(interiorPoint(largest)), groundTrees,
      sidePath: shapes.flatMap(shape => shape.flatMap(ring => ring.slice(1).map((p, i) => {
        const a = project(ring[i]), b = project(p), depth = 14;
        return `M${a[0]},${a[1]}L${b[0]},${b[1]}L${b[0]},${b[1]+depth}L${a[0]},${a[1]+depth}Z`;
      }))).join(""),
      trees,
      id: feature.properties.id,
      name: feature.properties.name,
      kind: feature.properties.kind,
      anchor: project(interiorPoint(largest)),
      bounds: [Math.min(...px), Math.min(...py), Math.max(...px), Math.max(...py)] as [number, number, number, number],
      path: shapes.flatMap(shape => shape.map(ring => ring.map((p, i) => {
        const [x, y] = project(p);
        return `${i ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`;
      }).join("") + "Z")).join(""),
    };
  });
}

export function barHeight(value: number | null, maximum: number) {
  return value !== null && Number.isFinite(value) && value > 0 && maximum > 0 ? value / maximum * 175 : 0;
}
