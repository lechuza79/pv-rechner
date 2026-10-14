// What a published landscape stage must satisfy before it goes to the scene bucket.
// A missing hub height or rotor renders a ground marker, and LoD2 tower bodies render
// as bare cylinders beside the turbine; scripts/landscape_wind_dimensions.py repairs
// both during preparation, this is the gate that refuses what slipped through.
// Register coordinates lie up to ~100 m from the surveyed tower, so the distance rule
// alone misses towers; a body the survey labels as wind turbine is refused anywhere.
type Point = [number, number, number];
export type CheckedScene = {
  turbines?: { id: string; x: number; z: number; hub: number | null; rotor: number | null }[];
  buildings?: { id: string; function?: string; surfaces: { points: Point[] }[] }[];
};

const TOWER_RADIUS = 15, TOWER_MAX_FOOTPRINT = 16, TOWER_MIN_HEIGHT = 20;
const WIND_TURBINE_FUNCTION = "51002_1220"; // ALKIS Bauwerksfunktion "Windrad"

export function sceneDefekte(scene: CheckedScene): string[] {
  const broken: string[] = [];
  const turbines = scene.turbines ?? [];
  for (const t of turbines) if (!(Number(t.hub) > 0 && Number(t.rotor) > 0)) broken.push(`turbine ${t.id} without dimensions`);
  for (const b of scene.buildings ?? []) if (b.function === WIND_TURBINE_FUNCTION) broken.push(`surveyed wind turbine building ${b.id}`);
  if (!turbines.length) return broken;
  for (const b of scene.buildings ?? []) {
    if (b.function === WIND_TURBINE_FUNCTION) continue;
    const pts = b.surfaces.flatMap(s => s.points);
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), zs = pts.map(p => p[2]);
    const x = (Math.max(...xs) + Math.min(...xs)) / 2, z = (Math.max(...zs) + Math.min(...zs)) / 2;
    const footprint = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs));
    const near = turbines.some(t => Math.hypot(x - t.x, z - t.z) <= TOWER_RADIUS);
    if (near && footprint <= TOWER_MAX_FOOTPRINT && Math.max(...ys) - Math.min(...ys) >= TOWER_MIN_HEIGHT) broken.push(`tower building ${b.id}`);
  }
  return broken;
}
