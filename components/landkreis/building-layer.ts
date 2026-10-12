import * as THREE from 'three';
import type { BuildingPoint, BuildingSurface, SceneBuilding } from '../../lib/building-scene';
import type {SceneTurbine} from '../../lib/wind-map';

/** LoD2 sometimes includes the same turbine tower that the wind layer renders. */
export function isRegisteredTurbineTower(building:SceneBuilding,turbines:SceneTurbine[],unitsPerMetre:number){
  const points=building.surfaces.flatMap(s=>s.points);
  if(!points.length)return false;
  const bounds=new THREE.Box3().setFromPoints(points.map(p=>new THREE.Vector3(...p)));
  const size=bounds.getSize(new THREE.Vector3()),centre=bounds.getCenter(new THREE.Vector3());
  // Match only tall, narrow structures with the registered tower's location and height.
  // Nearby sheds and houses remain in the scene; original source data is untouched.
  return size.y>40*unitsPerMetre&&Math.max(size.x,size.z)<15*unitsPerMetre&&turbines.some(t=>
    t.hub!==null&&t.rotor!==null&&Math.hypot(centre.x-t.x,centre.z-t.z)<10*unitsPerMetre&&Math.abs(size.y-t.hub)<t.hub*.1);
}

/** Triangulate each original plane, including courtyards, without flattening it. */
export function triangulateBuildingSurface(surface: BuildingSurface): BuildingPoint[] {
  const points = surface.points;
  const normal = new THREE.Vector3();
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    normal.x += (a[1] - b[1]) * (a[2] + b[2]);
    normal.y += (a[2] - b[2]) * (a[0] + b[0]);
    normal.z += (a[0] - b[0]) * (a[1] + b[1]);
  }
  const axes = [Math.abs(normal.x), Math.abs(normal.y), Math.abs(normal.z)];
  const omitted = axes.indexOf(Math.max(...axes));
  const project = (p: BuildingPoint) => new THREE.Vector2(...p.filter((_, i) => i !== omitted) as [number, number]);
  const holes = surface.holes ?? [];
  const all = [...points, ...holes.flat()];
  return THREE.ShapeUtils.triangulateShape(points.map(project), holes.map(r => r.map(project))).flatMap(face => {
    const triangle = face.map(i => all[i]);
    const [a, b, c] = triangle.map(p => new THREE.Vector3(...p));
    // Earcut's 2D winding must not reverse the original 3D surface normal.
    // Otherwise the shadow normal offset points into roofs and causes striping.
    if (b.sub(a).cross(c.sub(a)).dot(normal) < 0) [triangle[1], triangle[2]] = [triangle[2], triangle[1]];
    return triangle;
  });
}

export function addBuildingLayer(scene: THREE.Scene, buildings: SceneBuilding[], groundY: number, color: THREE.Color, turbines:SceneTurbine[]=[],unitsPerMetre=1) {
  const visible=buildings.filter(b=>!isRegisteredTurbineTower(b,turbines,unitsPerMetre));
  const positions = visible.flatMap(b => b.surfaces.filter(s => s.kind !== 'GroundSurface').flatMap(s => triangulateBuildingSurface(s).flatMap(([x, y, z]) => [x, groundY + y, z])));
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({ color, roughness: .88, metalness: 0, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'official-buildings'; mesh.castShadow = true; mesh.receiveShadow = true;
  scene.add(mesh);
  return { mesh, excludedTowers:buildings.length-visible.length, dispose() { scene.remove(mesh); geometry.dispose(); material.dispose(); } };
}
