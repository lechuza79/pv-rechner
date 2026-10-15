import {createSceneQuality,scenePixelRatio} from '../../lib/scene-render-quality';
import {addLocationPins} from "./location-pins";
import {projectLocationSign,signInFrontOfCamera,locationSignShadow} from './location-sign';
import {cameraDepthOfField,createFlightLensFocus} from "./camera-depth-of-field";
import {addSolarLayer,type SolarFootprint} from "./solar-layer";
import {terrainFlight} from "../../lib/terrain-flight";
import {referenceFlight,parkDeparture} from "../../lib/reference-flight";
import { bindTrackpadGestures } from "../../public/shared-3d/trackpad-gestures.js";
import { addTerrainContours } from "./terrain-contours";
import { addBuildingLayer } from "./building-layer";
import type { SceneBuilding, SceneLocation } from "../../lib/building-scene";
import {addWindContext} from "./wind-context";
import { createFramePacer } from "../../public/hero-system/source/frame-pacer.js";
import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Tree, TreePreset } from "@dgreenheck/ez-tree";
import type { ProjectedRegion } from "../../lib/region-perspektive";
import type { MapValue } from "./RegionKarte";

import { addWindTerrain } from "./wind-terrain";
import { terrainHeight, type SceneTerrain } from "../../lib/wind-terrain";
import type { WindConditions } from "../../lib/wind-animation";
import { addWindLayer } from "./wind-layer";
import type { SceneTurbine } from "../../lib/wind-map";

export type Season = "spring" | "summer" | "autumn" | "winter";
const BASE_DEPTH = 26;
const BAR_MAX = 155;
const REGION_MOTION = { bars:220, land:260, stagger:10, zoomIn:640, zoomOut:720, detailOut:180 };
// Fast departure with a soft arrival, without overshoot or overlapping phases.
const regionEase = (progress:number) => {
  const t=Math.max(0,Math.min(1,progress));
  return 1-Math.pow(1-t,3)*(1+3*t);
};

/** One scene with shared tree geometry; intro rotation yields to interaction. */
export function createRegionScene(host: HTMLElement, shapes: ProjectedRegion[], events: {
  hover: (id: string | null) => void; select: (id: string, touch?: boolean) => void;
  regionReady?:(id:string)=>void;
  barHover?:(label:string|null)=>void;
  flight?:(moving:boolean,arrived?:boolean)=>void;
  locationFocus?:()=>string|undefined;
  locationSurface?:()=>{id:string;x:number;y:number;width:number;height:number}|null;
  locationSize?:()=>{width:number;height:number}|null;
  locationClearance?:()=>number;
  locations?: (points:(SceneLocation & {screenX:number;screenY:number;signTransform?:string;strokeScale?:number;stemPixels?:number;blur:number})[])=>void;
  pin: (point: { x: number; y: number } | null) => void; failed: () => void;
}, heightEnvelope: Record<string, number> = {}, turbines?: SceneTurbine[], terrain?:SceneTerrain, windScale=1, windConditions:WindConditions|null=null, buildings?:SceneBuilding[], solar?:SolarFootprint[], locations?:SceneLocation[],framingScale=1,exportable=false,sceneContext?:import("../../lib/wind-context").SceneContext) {
  const DEPTH=buildings?4:BASE_DEPTH;
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer:exportable || !!buildings, powerPreference: "low-power" });
  const quality=buildings?createSceneQuality():null;
  renderer.setPixelRatio(quality?scenePixelRatio(window.devicePixelRatio,host.clientWidth,host.clientHeight):Math.min(window.devicePixelRatio,2));
  renderer.setClearColor(0, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const canvas = renderer.domElement;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let autoplay = true;
  let enteredAt: number | null = null;
  let manual = false, resumeRotationAt = 0, lastFrame = performance.now();
  let spinVelocity = 0;
  let swipe: {x:number;at:number;velocity:number} | null = null;
  const spinAxis = new THREE.Vector3(0,1,0);
  const spinOffset = new THREE.Vector3();
  let pace = createFramePacer(buildings?60:30);
  let lastPin: {x:number;y:number}|null=null;
  canvas.setAttribute("aria-hidden", "true");
  host.append(canvas);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(exportable ? 0xffffff : turbines ? 0xf2f4f6 : 0xe5f2ed, exportable ? 0x444444 : turbines ? 0x8c9299 : 0x26343b, exportable ? 1.2 : 1.8));
  const key = new THREE.DirectionalLight(exportable ? 0xffffff : turbines ? 0xffffff : 0xfff1cc, turbines ? 1.5 : 2.2); key.position.set(-350, 650, 350);
  key.castShadow=true;key.shadow.mapSize.set(2048,2048);
  Object.assign(key.shadow.camera,{left:-650,right:650,top:650,bottom:-650,near:1,far:2000});
  key.shadow.bias=-.0002;key.shadow.normalBias=.5;scene.add(key);
  const fill = new THREE.DirectionalLight(exportable ? 0xffffff : 0xb8d1df, exportable ? .45 : .8); fill.position.set(500, 220, -350); scene.add(fill);
  const city = shapes.find(s=>s.kind === "Kreisfreie Stadt");
  const pivot = new THREE.Vector3(city?.groundAnchor[0]??0,DEPTH+1,city?.groundAnchor[1]??0);
  const camera = buildings ? new THREE.PerspectiveCamera(42,1,.1,4000) : new THREE.OrthographicCamera(-500,500,400,-400,1,4000);
  canvas.dataset.camera=buildings?'perspective':'orthographic';
  const depthOfField=camera instanceof THREE.PerspectiveCamera?cameraDepthOfField(renderer,camera):null;
  const flightLensFocus=createFlightLensFocus();
  // Render only scene geometry in front of the HTML sign, inside its rectangle.
  // The widget remains owned by React; turbine silhouettes now occlude it naturally.
  const signForeground=buildings&&events.locationSurface?new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:"low-power"}):null;
  const signPlane=new THREE.Plane();
  if(signForeground){
    signForeground.setPixelRatio(renderer.getPixelRatio());
    signForeground.setClearColor(0,0);
    signForeground.outputColorSpace=renderer.outputColorSpace;
    signForeground.toneMapping=renderer.toneMapping;
    signForeground.toneMappingExposure=renderer.toneMappingExposure;
    signForeground.clippingPlanes=[signPlane];
    const overlay=signForeground.domElement;
    overlay.dataset.signOcclusion='';
    overlay.setAttribute('aria-hidden','true');
    Object.assign(overlay.style,{position:'absolute',inset:'0',width:'100%',height:'100%',zIndex:'5',pointerEvents:'none'});
    host.closest('[data-map-hero-stage]')?.append(overlay);
  }
  let sceneZoom=1;
  let compositionX=0,compositionY=0;
  const cameraOffset = new THREE.Vector3(-330, buildings ? 400 : 540, 920);
  camera.position.copy(cameraOffset).add(pivot); camera.lookAt(pivot); camera.updateMatrixWorld();
  const controls = new OrbitControls(camera, canvas);
  controls.target.copy(pivot); controls.enableDamping = !reducedMotion.matches; controls.dampingFactor = .08; controls.enablePan = false;
  // Page scrolling stays page scrolling; mouse/touch drag only changes viewing angle.
  controls.enableZoom = true; controls.minZoom = .7; controls.maxZoom = turbines ? 12 : 3; controls.minPolarAngle = .35; controls.maxPolarAngle = buildings?1.48:1.25;
  controls.minDistance=15;controls.maxDistance=2000;
  controls.minAzimuthAngle = -Infinity; controls.maxAzimuthAngle = Infinity;
  controls.autoRotateSpeed = .35;
  // Own the two-finger gesture so it zooms/tilts the scene, not the document.
  // The surrounding page retains normal scrolling outside the canvas.
  controls.update(); canvas.style.touchAction = "pan-y";
  controls.touches.ONE = THREE.TOUCH.ROTATE; controls.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;
  const pickables: THREE.Object3D[] = [];
  const surfaces = new Map<string, THREE.MeshBasicMaterial | THREE.MeshLambertMaterial>();
  const SurfaceMaterial = exportable ? THREE.MeshLambertMaterial : THREE.MeshBasicMaterial;
  const initialViewInverse = camera.quaternion.clone().invert();
  const keyViewOffset = key.position.clone().applyQuaternion(initialViewInverse);
  const fillViewOffset = fill.position.clone().applyQuaternion(initialViewInverse);
  const lightView = camera.quaternion.clone();
  const bars = new Map<string, THREE.Mesh>();
  const materials = new Set<THREE.Material>();
  const outlines = new Set<LineMaterial>();
  const geometries = new Set<THREE.BufferGeometry>();
  const textures = new Set<THREE.Texture>();
  const trees: THREE.Group[] = [];
  const leaves: THREE.Mesh[] = [];
  let dead = false, visible = true, queued = 0, selected = "", hovered: string | null = null;
  const theme = getComputedStyle(host);
  const background = new THREE.Color(theme.getPropertyValue("--color-bg-page").trim())
    .lerp(new THREE.Color(theme.getPropertyValue("--color-bg-raised").trim()), exportable ? 0 : .5);
  const side = new SurfaceMaterial({color:new THREE.Color(theme.getPropertyValue(terrain ? "--color-border" : "--color-bg-raised").trim()).multiplyScalar(terrain ? 1 : 1.65),toneMapped:false});
  if (!exportable) side.onBeforeCompile = shader => {
    shader.vertexShader="varying float edgeHeight;\n"+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace("#include <begin_vertex>","#include <begin_vertex>\nedgeHeight=position.y;");
    shader.fragmentShader="varying float edgeHeight;\n"+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace("#include <color_fragment>",`#include <color_fragment>
 diffuseColor.rgb *= mix(0.45,1.0,clamp(edgeHeight/${DEPTH.toFixed(1)},0.0,1.0));`);
  };
  side.customProgramCacheKey=()=>"district-visible-edge";
  materials.add(side);
  const forestSide = side;
  // Keep the actual brand colour in sRGB, independent of exposure and warm lights.
  // Box faces supply restrained depth shading; bars still cast real scene shadows.
  const brand = new THREE.Color(getComputedStyle(host).getPropertyValue("--color-brand").trim());
  const barFaces = (selected: boolean) => [selected ? .78 : .62, .88, 1, .5, 1, .72].map(shade => {
    const face = exportable ? new THREE.MeshLambertMaterial({color:brand,emissive:brand,emissiveIntensity:selected ? .72 : .62,toneMapped:false}) : new THREE.MeshBasicMaterial({ color: brand.clone().multiplyScalar(shade), toneMapped: false });
    materials.add(face); return face;
  });
  const barMaterial = barFaces(false);
  const selectedBar = barFaces(true);
  const groupedParentMaterial=new THREE.MeshBasicMaterial({visible:false});materials.add(groupedParentMaterial);
  const groupedMaterials=new Map<string,THREE.MeshBasicMaterial>();
  const colorCanvas=document.createElement("canvas");colorCanvas.width=colorCanvas.height=1;
  const colorContext=colorCanvas.getContext("2d",{willReadFrequently:true})!;
  function groupedMaterial(css:string){
    let material=groupedMaterials.get(css);
    if(!material){material=new THREE.MeshBasicMaterial({toneMapped:false});materials.add(material);groupedMaterials.set(css,material);}
    const probe=document.createElement('span');probe.style.color=css;host.append(probe);// Canvas resolves modern CSS color-mix syntax into sRGB for Three.js.
    colorContext.clearRect(0,0,1,1);colorContext.fillStyle=getComputedStyle(probe).color;
    colorContext.fillRect(0,0,1,1);const [r,g,b]=colorContext.getImageData(0,0,1,1).data;
    material.color.setRGB(r/255,g/255,b/255,THREE.SRGBColorSpace);probe.remove();
    return material;
  }
  const barMaximum=(value:MapValue)=>value.bars?Math.max(0,...value.bars.map(bar=>bar.value)):value.value??0;

  const groundAt=(x:number,z:number)=>DEPTH+(terrain?terrainHeight(terrain,x,z):0);
  // Building coordinates and explicit sign elevations share the same base offset.
  const labelY=(p:SceneLocation)=>p.labelElevation===undefined?groundAt(p.labelX??p.x,p.labelZ??p.z):DEPTH+p.labelElevation;
  const signAnchor=(p:SceneLocation)=>new THREE.Vector3(p.labelX??p.x,labelY(p),p.labelZ??p.z);
  const signShadow=buildings&&events.locationSurface?locationSignShadow(scene):null;
  let lastShadowAt=0;
  const groundColor=new THREE.Color(theme.getPropertyValue(terrain ? "--color-bg-muted" : "--color-bg-raised").trim()).multiplyScalar(terrain ? 1 : 2.4);
  const contours=terrain?.display==="contours"?addTerrainContours(scene,terrain,DEPTH,new THREE.Color(theme.getPropertyValue("--color-text-secondary").trim())):null;
  if(contours){canvas.dataset.terrain="contours";canvas.dataset.terrainBody="none";}
  const land=terrain&& !contours?addWindTerrain(scene,terrain,shapes,DEPTH,groundColor,side,4):null;
  const landscape=sceneContext??terrain?.sceneContext;
  const beforeContext=new Set(scene.children);
  const context=landscape?addWindContext(scene,landscape,groundAt,groundColor.clone().lerp(new THREE.Color(theme.getPropertyValue("--color-bg-raised").trim()),.7),new THREE.Color(theme.getPropertyValue("--color-map-water").trim()||theme.getPropertyValue("--color-bg-muted").trim()).lerp(new THREE.Color(theme.getPropertyValue("--color-bg-raised").trim()),.55),undefined,buildings?{widthMetres:3,liftMetres:.15}:undefined):null;
  const contextObjects=scene.children.filter(object=>!beforeContext.has(object));
  if(context)canvas.dataset.landscape="settlements-water";
  if(land){pickables.push(land.mesh);canvas.dataset.terrain="relief";canvas.dataset.terrainBody="solid";}
  const solarLayer=solar?.length&&terrain?addSolarLayer(scene,solar,groundAt,terrain.unitsPerMetre,groundColor.clone().lerp(new THREE.Color(theme.getPropertyValue("--color-bg-raised").trim()),.4),renderer):null;
  if(solarLayer)canvas.dataset.solarRows=String(solar?.length);
  const architecture=buildings?addBuildingLayer(scene,buildings,DEPTH,new THREE.Color(theme.getPropertyValue("--color-bg-raised").trim()),turbines,terrain?.unitsPerMetre):null;
  if(architecture)canvas.dataset.replacedBuildingTowers=String(architecture.excludedTowers);
  if(architecture)canvas.dataset.buildingCount=String(buildings?.length??0);
  const barGeometry = new THREE.BoxGeometry(6.5, 1, 6.5); geometries.add(barGeometry);
  for (const region of shapes) {
    const forest = region.kind === "Gemeindefreies Gebiet";
    const top = new SurfaceMaterial({color:background,toneMapped:false});
    if (!exportable) top.onBeforeCompile = shader => {
      shader.vertexShader = "varying vec3 districtPosition;\n" + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\ndistrictPosition = position;");
      shader.fragmentShader = "varying vec3 districtPosition;\n" + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace("#include <color_fragment>", `
        #include <color_fragment>
        float planeShade = smoothstep(-420.0, 420.0, districtPosition.z + districtPosition.x * 0.35);
        diffuseColor.rgb *= mix(0.40, 1.65, planeShade);
      `);
    };
    top.customProgramCacheKey = () => "district-plane-shade";
    materials.add(top); surfaces.set(region.id, top);
    for (const rings of region.ground) {
      const outline = new THREE.Shape(rings[0].map(([x,z]) => new THREE.Vector2(x,-z)));
      outline.holes = rings.slice(1).map(r => new THREE.Path(r.map(([x,z]) => new THREE.Vector2(x,-z))));
      const geometry = new THREE.ExtrudeGeometry(outline, { depth: DEPTH, bevelEnabled: false, steps: 1 });
      geometry.rotateX(-Math.PI/2); geometries.add(geometry);
      const mesh = new THREE.Mesh(geometry, [top, forest ? forestSide : side]);
      mesh.castShadow=true;mesh.receiveShadow=true;
      mesh.userData.region = region.id; if(!terrain){scene.add(mesh); pickables.push(mesh);}
      // Outlines only on the upper face, retaining fine municipal boundaries.
      for (const ring of terrain?[]:rings) {
        const boundary:number[]=[];
        ring.forEach(([x,z],i)=>{
          const next=ring[(i+1)%ring.length],steps=terrain?Math.max(1,Math.ceil(Math.hypot(next[0]-x,next[1]-z)/3)):1;
          for(let k=0;k<steps;k++){const px=x+(next[0]-x)*k/steps,pz=z+(next[1]-z)*k/steps;boundary.push(px,groundAt(px,pz)+.35,pz);}
        });
        boundary.push(...boundary.slice(0,3));
        const lineGeometry = new LineGeometry().setPositions(boundary);
        geometries.add(lineGeometry);
        const lineMaterial = new LineMaterial({ color: 0x789491, linewidth: 1.35, transparent: true, opacity: .42, toneMapped: false, depthWrite: false }); materials.add(lineMaterial);outlines.add(lineMaterial);
        const outline=new Line2(lineGeometry,lineMaterial);outline.userData.region=region.id;scene.add(outline);
      }
    }
    const bar = new THREE.Mesh(barGeometry, barMaterial);
    bar.position.set(region.groundAnchor[0],DEPTH,region.groundAnchor[1]); bar.visible = false;
    bar.castShadow=true;bar.receiveShadow=true;bar.userData.region = region.id; scene.add(bar); bars.set(region.id,bar); pickables.push(bar);
  }
  let cityMarker: THREE.Sprite | undefined;
  if(city){
    // A depth-tested billboard belongs to the scene: foreground bars can occlude it.
    const pinCanvas=document.createElement("canvas");pinCanvas.width=192;pinCanvas.height=192;
    const context=pinCanvas.getContext("2d")!;
    context.scale(8,8);context.fillStyle="#fff";
    context.fill(new Path2D("M12 23C10 20 3 14 3 9A9 9 0 0 1 21 9C21 14 14 20 12 23Z"));
    context.fillStyle="#163338";context.font="bold 7px Arial, sans-serif";context.textAlign="center";
    context.fillText(city.name.replace(/^Kreisfreie Stadt\s+/, "").slice(0,2).toLocaleUpperCase("de-DE"),12,11.5);
    const texture=new THREE.CanvasTexture(pinCanvas);texture.colorSpace=THREE.SRGBColorSpace;textures.add(texture);
    const material=new THREE.SpriteMaterial({map:texture,color:0xffffff,toneMapped:false,depthTest:true,depthWrite:false});materials.add(material);
    const pin=new THREE.Sprite(material);pin.center.set(.5,1/24);pin.scale.set(26,26,1);
    // Draw after translucent boundaries; solid foreground bars still occlude it.
    pin.renderOrder=1;
    cityMarker=pin;pin.position.copy(pivot);pin.userData.region=city.id;scene.add(pin);pickables.push(pin);
  }
  const locationPins=buildings&&locations?addLocationPins(scene,locations,labelY):null;
  const wind = turbines ? addWindLayer(scene,turbines,DEPTH,new THREE.Color(0xf2f1e8),groundAt,windScale,windConditions) : null;
  canvas.dataset.windMotion=windConditions?"model":"unavailable";
  canvas.dataset.windSpeed=String(windConditions?.speedMs??'');canvas.dataset.windAt=windConditions?.validAt??'';
  if(wind)pickables.push(...wind.meshes);
  canvas.dataset.windCount=String(wind?.count??0);
  let previousValues: MapValue[] | null = null;
  let transition: { start: number; duration: number; heights: Map<string, { from: number; to: number; delay: number }> } | null = null;
  const placeBar = (bar: THREE.Mesh, height: number) => {
    bar.visible = height > .001; bar.scale.y = height; bar.position.y = DEPTH + height / 2;
  };
  let flight:{start:number;from:THREE.Vector3;to:THREE.Vector3;zoom:number;endZoom:number;offset:THREE.Vector3}|null=null;
  let journey:{start:number;route:Pick<ReturnType<typeof terrainFlight>,'sample'>;park:boolean;to:THREE.Vector3;zoom:number;endZoom:number;duration?:number}|null=null;
  let referencePlan:SVGSVGElement|null=null,planEye:SVGCircleElement|null=null,planDirection:SVGLineElement|null=null;
  function moveReferenceGuide(position:THREE.Vector3,orientation:THREE.Quaternion){
    const heading=new THREE.Vector3(0,0,-1).applyQuaternion(orientation);
    planEye?.setAttribute('cx',String(position.x));planEye?.setAttribute('cy',String(position.z));
    if(planDirection)for(const [key,value] of Object.entries({x1:position.x,y1:position.z,x2:position.x+heading.x*30,y2:position.z+heading.z*30}))planDirection.setAttribute(key,String(value));
  }
  let flightMetrics:HTMLOutputElement|null=null,frameTimes:number[]|null=null,measureStart=0,measurePrevious=0,measureShown=0;
  function reportFrames(final=false){
    if(!flightMetrics||!frameTimes?.length)return;
    const sorted=[...frameTimes].sort((a,b)=>a-b),mean=frameTimes.reduce((sum,n)=>sum+n,0)/frameTimes.length;
    const report={frames:frameTimes.length,meanMs:mean,p95Ms:sorted[Math.floor((sorted.length-1)*.95)],maxMs:sorted.at(-1),durationMs:performance.now()-measureStart};
    canvas.dataset.flightMetrics=JSON.stringify(report);
    flightMetrics.textContent=`${final?'Angekommen':'Referenzflug'} · ${Math.round(1000/mean)} Bilder/s · 95 % ≤ ${Math.round(report.p95Ms)} ms · längste Pause ${Math.round(report.maxMs!)} ms`;
  }
  function stopFlight(arrived=false){if(frameTimes){reportFrames(arrived);frameTimes=null;}flight=null;journey=null;canvas.dataset.flight='idle';events.flight?.(false,arrived);}
  function updateReferenceGuide(route:{curve:THREE.Curve<THREE.Vector3>},goal:THREE.Vector3){
    if(!flightMetrics){flightMetrics=document.createElement('output');flightMetrics.dataset.flightMetrics='';flightMetrics.hidden=true;flightMetrics.dataset.scExportIgnore='';host.append(flightMetrics);}
    {
      const points=route.curve.getPoints(100),xs=points.map(p=>p.x),zs=points.map(p=>p.z);
      const left=Math.min(...xs,goal.x)-25,top=Math.min(...zs,goal.z)-25,width=Math.max(...xs,goal.x)-left+25,height=Math.max(...zs,goal.z)-top+25;
      if(!referencePlan){referencePlan=document.createElementNS('http://www.w3.org/2000/svg','svg');referencePlan.dataset.flightPlan='';referencePlan.style.display='none';}
      referencePlan.setAttribute('viewBox',`${left} ${top} ${width} ${height}`);referencePlan.setAttribute('role','img');referencePlan.setAttribute('aria-label','Flugbahn von oben mit Kameraposition und Blickrichtung');
      referencePlan.innerHTML=`<path d="${points.map((p,i)=>`${i?'L':'M'}${p.x},${p.z}`).join(' ')}" fill="none" stroke="currentColor" stroke-width="2" vector-effect="non-scaling-stroke"/><circle cx="${goal.x}" cy="${goal.z}" r="6" fill="currentColor"/><line data-direction stroke="var(--color-map-water)" stroke-width="3" vector-effect="non-scaling-stroke"/><circle data-eye r="5" fill="var(--color-map-water)"/>`;
      planEye=referencePlan.querySelector('[data-eye]');planDirection=referencePlan.querySelector('[data-direction]');host.append(referencePlan);
    }
  }
  function previewReference(town:{x:number;z:number},park:{x:number;z:number},animate=true){
    if(!(camera instanceof THREE.PerspectiveCamera))return;
    stopFlight();spinVelocity=0;controls.autoRotate=false;controls.enableDamping=false;controls.update(0);resumeRotationAt=Infinity;
    const goal=new THREE.Vector3(park.x,groundAt(park.x,park.z),park.z);
    const route=referenceFlight(new THREE.Vector3(town.x,groundAt(town.x,town.z),town.z),goal,groundAt);
    updateReferenceGuide(route,goal);
    const pose=route.sample(animate&&reducedMotion.matches?1:0);
    camera.position.copy(pose.position);camera.quaternion.copy(pose.orientation);
    controls.target.set(0,0,-pose.targetDistance).applyQuaternion(pose.orientation).add(pose.position);
    moveReferenceGuide(pose.position,pose.orientation);
    sceneZoom=8;canvas.dataset.referenceFlight='ready';flightMetrics!.textContent='Referenzflug · Ortskern → Ziel · 8 Sekunden';
    if(animate&&!reducedMotion.matches){
      measureStart=measurePrevious=measureShown=performance.now();frameTimes=[];
      journey={start:measureStart,route,park:true,to:goal,zoom:8,endZoom:8,duration:route.duration};
      canvas.dataset.flight='moving';events.flight?.(true);
    }else if(animate){events.flight?.(false,true);resumeRotationAt=0;}
    invalidate();
  }

  function leaveReferencePark(park:{x:number;z:number},destination:{x:number;z:number}){
    if(!(camera instanceof THREE.PerspectiveCamera))return;
    stopFlight();spinVelocity=0;controls.autoRotate=false;controls.enableDamping=false;controls.update(0);resumeRotationAt=Infinity;
    const goal=new THREE.Vector3(destination.x,groundAt(destination.x,destination.z),destination.z);
    const route=parkDeparture(camera.position.clone(),camera.quaternion.clone(),new THREE.Vector3(park.x,groundAt(park.x,park.z),park.z),goal,groundAt);
    updateReferenceGuide(route,goal);
    if(reducedMotion.matches){
      const pose=route.sample(1);camera.position.copy(pose.position);camera.quaternion.copy(pose.orientation);controls.target.copy(goal);sceneZoom=12;events.flight?.(false,true);resumeRotationAt=0;
    }else{
      measureStart=measurePrevious=measureShown=performance.now();frameTimes=[];
      journey={start:measureStart,route,park:false,to:goal,zoom:sceneZoom,endZoom:12,duration:route.duration};
      canvas.dataset.flight='moving';events.flight?.(true);
    }
    invalidate();
  }

  function flyTo(target:{x:number;z:number;zoom:number;throughPark?:boolean;overview?:boolean},animate=true){
    if(camera instanceof THREE.PerspectiveCamera){
      const to=new THREE.Vector3(target.x,groundAt(target.x,target.z),target.z);
      const distance=1000/target.zoom;
      // Retain the arrival bearing so the camera traverses the geographic distance,
      // rather than cancelling most of it by switching sides of the destination.
      const direction=camera.position.clone().sub(controls.target);direction.y=0;
      const offset=direction.normalize().multiplyScalar(.85*distance);
      offset.y=.23*distance;
      const end=to.clone().add(offset);
      const measuredEnd=groundAt(end.x,end.z);
      end.y=Math.max(end.y,(Number.isFinite(measuredEnd)?measuredEnd:to.y)+8);
      if(target.throughPark){
        const arrival=to.clone().sub(camera.position);arrival.y=0;arrival.normalize();
        const radius=Math.min(45,distance*.7);
        // Leave space beside the park for a forward-flying return arc.
        end.copy(to).addScaledVector(arrival,radius).addScaledVector(new THREE.Vector3(-arrival.z,0,arrival.x),radius);
        end.y=Math.max(to.y+radius*.3,groundAt(end.x,end.z)+8);
      }
      spinVelocity=0;controls.autoRotate=false;resumeRotationAt=Infinity;
      if(!animate||reducedMotion.matches){stopFlight(true);controls.target.copy(to);camera.position.copy(end);sceneZoom=target.zoom;camera.lookAt(to);resumeRotationAt=0;invalidate();return;}
      const from=camera.position.clone();
      const low=(p:THREE.Vector3,clearance=6)=>{const height=groundAt(p.x,p.z);p.y=(Number.isFinite(height)?height:Math.max(to.y,from.y))+clearance;return p;};
      let path:THREE.Curve<THREE.Vector3>;
      if(target.throughPark){
        const direction=to.clone().sub(from);direction.y=0;direction.normalize();
        const entry=low(to.clone().addScaledVector(direction,-20));
        const pass=low(to.clone());
        const exit=low(to.clone().addScaledVector(direction,20),8);
        path=new THREE.CatmullRomCurve3([from,low(from.clone().lerp(entry,.65)),entry,pass,exit,end],false,'centripetal');
      }else path=new THREE.CatmullRomCurve3([from,low(from.clone().lerp(end,.25)),low(from.clone().lerp(end,.7)),end],false,'centripetal');
      const route=terrainFlight(path,groundAt,to,camera.quaternion.clone(),!!target.throughPark);
      journey={start:performance.now(),route,park:!!target.throughPark,to,zoom:sceneZoom,endZoom:target.zoom};
      flight=null;canvas.dataset.flight='moving';events.flight?.(true);invalidate();return;
    }
    // Recenter the orthographic frustum without moving the visible composition.
    const cx=(camera.left+camera.right)/2,cy=(camera.top+camera.bottom)/2;
    camera.updateMatrixWorld();
    const shift=new THREE.Vector3(cx/camera.zoom,cy/camera.zoom,0).applyQuaternion(camera.quaternion);
    camera.position.add(shift);controls.target.add(shift);windFocused=true;resize();
    spinVelocity=0;controls.autoRotate=false;resumeRotationAt=Infinity;
    const to=new THREE.Vector3(target.x,groundAt(target.x,target.z),target.z);
    const offset=camera.position.clone().sub(controls.target);
    if(!animate||reducedMotion.matches){stopFlight(true);controls.target.copy(to);camera.position.copy(to).add(offset);camera.zoom=target.zoom;camera.updateProjectionMatrix();invalidate();return;}
    flight={start:performance.now(),from:controls.target.clone(),to,zoom:camera.zoom,endZoom:target.zoom,offset};
    canvas.dataset.flight='moving';events.flight?.(true);invalidate();
  }
  function render() {
    queued = 0;
    if (dead || !visible || document.hidden) return;
    const now = performance.now();
    if (((autoplay && !manual) || quality) && !reducedMotion.matches && !pace.shouldDraw(now)) { invalidate(); return; }
    if(enteredAt===null){enteredAt=now;if(transition)transition.start=now+180;}
    const elapsed = now-enteredAt;
    if(autoplay&&!reducedMotion.matches)context?.update(elapsed/1000);
    const opacity = reducedMotion.matches ? "1" : String(Math.min(1,elapsed/240));
    if (canvas.style.opacity !== opacity) canvas.style.opacity = opacity;
    const windDt=Math.min(.25,(now-lastFrame)/1000);
    const dt = Math.min(.05,(now-lastFrame)/1000);
    if (reducedMotion.matches) spinVelocity=0;
    // Release velocity drives momentum independently of OrbitControls' residual drag.
    if (!manual && Math.abs(spinVelocity)>.015) {
      const decay=Math.exp(-dt/1.6);
      spinOffset.copy(camera.position).sub(controls.target);
      spinOffset.applyAxisAngle(spinAxis,spinVelocity*1.6*(1-decay));
      camera.position.copy(controls.target).add(spinOffset);
      spinVelocity*=decay;
    } else if (!manual) spinVelocity=0;
    controls.autoRotate = !regionSequence && !regionFlight && autoplay && (!!buildings || !turbines) && !flight && !journey && !manual && !spinVelocity && !reducedMotion.matches && elapsed>950 && now>=resumeRotationAt;
    controls.enableDamping = !reducedMotion.matches && !(referencePlan && controls.autoRotate);
    if(flight){
      const t=Math.min(1,(now-flight.start)/2400),ease=t*t*t*(t*(t*6-15)+10);
      controls.target.lerpVectors(flight.from,flight.to,ease);
      camera.position.copy(controls.target).add(flight.offset);
      const distance=flight.from.distanceTo(flight.to);
      const arch=Math.min(2.4,distance/140)*Math.pow(Math.sin(Math.PI*t),2);
      camera.zoom=Math.exp(Math.log(flight.zoom)*(1-ease)+Math.log(flight.endZoom)*ease-arch);
      camera.updateProjectionMatrix();
      if(t===1)stopFlight(true);
    }
    if(journey){
      if(frameTimes){frameTimes.push(now-measurePrevious);measurePrevious=now;if(now-measureShown>500){reportFrames();measureShown=now;}}
      const t=Math.min(1,(now-journey.start)/(journey.duration??(journey.park?8500:6500))),ease=THREE.MathUtils.smootherstep(t,0,1);
      const pose=journey.route.sample(t);
      camera.position.copy(pose.position);camera.quaternion.copy(pose.orientation);
      if(referencePlan)moveReferenceGuide(pose.position,pose.orientation);
      controls.target.set(0,0,-pose.targetDistance).applyQuaternion(pose.orientation).add(pose.position);
      sceneZoom=journey.zoom+(journey.endZoom-journey.zoom)*ease;
      if(t===1){sceneZoom=journey.endZoom;stopFlight(true);resumeRotationAt=0;}
    }
    // Preserve the authored waiting pose: OrbitControls would clamp its low viewing angle
    // before takeoff, causing an abrupt camera jump when the route starts.
    const waitingForReference = !!referencePlan && resumeRotationAt === Infinity && !manual;
    const moving = journey || waitingForReference ? false : controls.update(dt);
    if (exportable && !lightView.equals(camera.quaternion)) {
      key.position.copy(keyViewOffset).applyQuaternion(camera.quaternion);
      fill.position.copy(fillViewOffset).applyQuaternion(camera.quaternion);
      lightView.copy(camera.quaternion);
      renderer.shadowMap.needsUpdate=true;
    }
    if(regionFade){
      let complete=true;
      for(const item of regionFade.items){
        const t=reducedMotion.matches?1:Math.max(0,Math.min(1,(now-regionFade.start-item.delay)/REGION_MOTION.land));
        const alpha=item.from+(item.to-item.from)*regionEase(t);
        item.copies.forEach((material,index)=>{material.opacity=item.opacity[index]*alpha;});
        if(t<1)complete=false;
      }
      if(complete)finishRegionFade();
    }
    if(regionFlight&&camera instanceof THREE.OrthographicCamera){
      const t=reducedMotion.matches?1:Math.max(0,Math.min(1,(now-regionFlight.start)/regionFlight.duration)),ease=regionEase(t);
      const [fl,fr,fb,ft]=regionFlight.from,[tl,tr,tb,tt]=regionFlight.to;
      const halfW=Math.exp(Math.log((fr-fl)/2)*(1-ease)+Math.log((tr-tl)/2)*ease);
      const halfH=Math.exp(Math.log((ft-fb)/2)*(1-ease)+Math.log((tt-tb)/2)*ease);
      const cx=(fl+fr)/2*(1-ease)+(tl+tr)/2*ease,cy=(fb+ft)/2*(1-ease)+(tb+tt)/2*ease;
      const bounds=[cx-halfW,cx+halfW,cy-halfH,cy+halfH];
      [camera.left,camera.right,camera.bottom,camera.top]=bounds;camera.updateProjectionMatrix();
      if(t===1){

        centerRegionOrbit(regionFlight.id);
        regionFlight=null;canvas.dataset.regionFlight='idle';
      }
    }
    canvas.dataset.orbit=controls.autoRotate?'active':'paused';
    if(buildings)canvas.dataset.cameraPosition=camera.position.toArray().map(v=>v.toFixed(3)).join(',');
    lastFrame=now;
    if (transition) {
      renderer.shadowMap.needsUpdate = true;
      let complete=true;
      for (const [id, height] of transition.heights) {
        const t=reducedMotion.matches?1:Math.max(0,Math.min(1,(now-transition.start-height.delay)/transition.duration));
        const eased=1-Math.pow(1-t,3);
        placeBar(bars.get(id)!,height.from+(height.to-height.from)*eased);
        if(t<1)complete=false;
      }
      if(complete)transition=null;
    }
    if(turbines){canvas.dataset.windView="individual";canvas.dataset.windZoom=String(buildings?sceneZoom:camera.zoom);canvas.dataset.windScale=String(windScale);}
    if(regionSequence){
      renderer.shadowMap.needsUpdate=true;
      const elapsed=now-regionSequence.start;
      const downStart=regionSequence.out?REGION_MOTION.detailOut:0;
      const zoomStart=downStart+REGION_MOTION.bars+(regionSequence.out?0:regionLandDuration);
      const landStart=regionSequence.out?zoomStart+REGION_MOTION.zoomOut:downStart+REGION_MOTION.bars;
      const upStart=regionSequence.out?landStart+regionLandDuration:zoomStart+REGION_MOTION.zoomIn;
      for(const [id,bar] of bars){
        const from=regionSequence.from.get(id)??0;
        const target=!regionSequence.id||id===regionSequence.id?regionSequence.targets.get(id)??0:0;
        const height=reducedMotion.matches?target:elapsed<upStart?from*(1-regionEase((elapsed-downStart)/REGION_MOTION.bars)):target*regionEase((elapsed-upStart)/REGION_MOTION.bars);
        placeBar(bar,height);
      }
      canvas.dataset.regionPhase=elapsed<downStart?'donut-out':elapsed<downStart+REGION_MOTION.bars?'bars-out':elapsed<(regionSequence.out?landStart:zoomStart)?(regionSequence.out?'zoom-out':'land-out'):elapsed<upStart?(regionSequence.out?'land-in':'zoom-in'):'bars-in';
      if(reducedMotion.matches||elapsed>=upStart+REGION_MOTION.bars){
        const id=regionSequence.id;regionSequence=null;canvas.dataset.regionPhase='ready';events.regionReady?.(id);
      }
    }
    if(wind&&!reducedMotion.matches)wind.tick(windDt);
    // Compose the geographic focus in the available hero area without changing the route,
    // camera pose or orbit. Hold the framing during travel; ease into the next stop.
    const focusId=events.locationFocus?.();
    const focus=locations?.find(p=>p.id===focusId);
    if(camera instanceof THREE.PerspectiveCamera && focus && renderWidth && renderHeight){
      if(!journey&&!flight){
        camera.clearViewOffset();
        camera.updateMatrixWorld();
        const mobile=renderWidth<700;
        // On narrow screens frame the elevated sign below the copy as well as
        // the town. Changing the view offset preserves the authored flight pose.
        const projected=new THREE.Vector3(focus.x,mobile?labelY(focus):groundAt(focus.x,focus.z),focus.z).project(camera);
        const desiredX=renderWidth*(mobile?.5:.76);
        let desiredY=renderHeight*(mobile?.79:.69);
        const size=mobile?events.locationSize?.():null;
        if(size){
          const sign=projectLocationSign(camera,signAnchor(focus),size.width,size.height,renderWidth,renderHeight);
          // Move the whole scene's framing, not the sign, below the mobile copy.
          desiredY=Math.max(desiredY,(events.locationClearance?.()??0)+(1-projected.y)*renderHeight/2-sign.top);
        }
        const blend=reducedMotion.matches?1:1-Math.exp(-dt/1.1);
        compositionX+=((projected.x+1)*renderWidth/2-desiredX-compositionX)*blend;
        compositionY+=((1-projected.y)*renderHeight/2-desiredY-compositionY)*blend;
      }
      camera.setViewOffset(renderWidth,renderHeight,compositionX,compositionY,renderWidth,renderHeight);
    }
    camera.updateMatrixWorld();
    const focalPoint=focus&&!journey&&!flight?new THREE.Vector3(focus.x,groundAt(focus.x,focus.z),focus.z):controls.target.clone();
    const focalDepth=-focalPoint.applyMatrix4(camera.matrixWorldInverse).z;
    // A distant flight destination is a steering target, not the lens focus.
    // Hold the last local focus through takeoff/travel, then refocus gently on arrival.
    const focusDepth=flightLensFocus(depthOfField?.focusDistance()??0,focalDepth,Boolean(journey||flight));
    const visiblePins=camera instanceof THREE.PerspectiveCamera?locationPins?.update(camera,renderHeight,focusId,dt,reducedMotion.matches):undefined;
    const signSize=events.locationSize?.();
    signShadow?.update(camera,focus&&signSize?signAnchor(focus):null,signSize?.width,signSize?.height);
    // Cache static scenery; refresh moving rotor and panel shadows at 10 Hz.
    if((wind?.isMoving()||signShadow)&&now-lastShadowAt>=100){renderer.shadowMap.needsUpdate=true;lastShadowAt=now;}
    solarLayer?.update(camera,renderHeight);
    contours?.update(camera);
    if(depthOfField){depthOfField.render(scene,focusDepth,dt);canvas.dataset.focusDepth=depthOfField.focusDistance().toFixed(3);}
    else renderer.render(scene,camera);
    if (regionSequence || regionFade || regionFlight || (context?.animated&&autoplay&&!reducedMotion.matches) || journey || flight || controls.autoRotate || transition || moving || locationPins?.isFading() || (autoplay && !manual && !reducedMotion.matches && (!turbines || buildings || wind?.isMoving())) || elapsed<240) invalidate();
    if(locations?.length&&events.locations) events.locations(locations.flatMap(p=>{
      if(visiblePins&&p.id!==focusId&&!visiblePins.has(p.id))return [];
      const anchor=signAnchor(p);
      const v=anchor.clone().project(camera);
      const size=p.id===focusId?events.locationSize?.():null;
      const sign=size?projectLocationSign(camera,anchor,size.width,size.height,renderWidth,renderHeight,groundAt(anchor.x,anchor.z)):undefined;
      return (size?signInFrontOfCamera(camera,anchor):Math.abs(v.x)<=1&&Math.abs(v.y)<=1&&Math.abs(v.z)<=1)?[{...p,screenX:(v.x+1)*renderWidth/2,screenY:(1-v.y)*renderHeight/2,signTransform:sign?.transform,strokeScale:sign?.strokeScale,stemPixels:sign?.stemPixels,blur:depthOfField?.blur(-anchor.clone().applyMatrix4(camera.matrixWorldInverse).z)??0}]:[];
    }));
    if(signForeground){
      signForeground.setScissorTest(false);signForeground.clear();
      const surface=events.locationSurface?.();
      const location=surface&&locations?.find(p=>p.id===surface.id);
      if(surface&&location&&signInFrontOfCamera(camera,signAnchor(location))){
        const anchor=signAnchor(location);
        const size=events.locationSize?.();
        if(size){
          const sign=projectLocationSign(camera,anchor,size.width,size.height,renderWidth,renderHeight,groundAt(anchor.x,anchor.z));
          signForeground.domElement.style.clipPath=`path('${sign.occlusionPath}')`;
        }
        const normal=camera.position.clone().sub(anchor).setY(0).normalize();
        signPlane.setFromNormalAndCoplanarPoint(normal,anchor);
        const left=Math.max(0,surface.x),right=Math.min(renderWidth,surface.x+surface.width);
        const top=Math.max(0,surface.y),bottom=Math.min(renderHeight,surface.y+surface.height);
        if(right>left&&bottom>top){
          signForeground.setScissor(left,renderHeight-bottom,right-left,bottom-top);
          // Replay physical foreground objects only. Ground and shadow receivers
          // belong to the main lens pass and must never paint a scissor rectangle.
          const physical=new Set<THREE.Object3D>([...(wind?.meshes??[]),...(architecture?[architecture.mesh]:[])]);
          const visibility=scene.children.map(object=>object.visible);
          scene.children.forEach(object=>{object.visible=object.visible&&(object instanceof THREE.Light||physical.has(object)||object.name==='solar-panel-frames'||object.name==='solar-panel-glass');});
          try{signForeground.setScissorTest(true);signForeground.render(scene,camera);}
          finally{scene.children.forEach((object,index)=>{object.visible=visibility[index];});}
        }
      }
    }
    const measurement=quality?.sample(now);
    if(measurement){
      canvas.dataset.renderQuality=JSON.stringify({...measurement,pixelRatio:renderer.getPixelRatio()});
      if(measurement.changed){pace=createFramePacer(quality!.fps);resize();}
    }
    if (transition || moving || journey || flight || (autoplay && !manual && !reducedMotion.matches) || elapsed<240) invalidate();
    if (city) {
      const point = new THREE.Vector3(city.groundAnchor[0],DEPTH+1,city.groundAnchor[1]).project(camera);
      const next={x:(point.x+1)*renderWidth/2,y:(1-point.y)*renderHeight/2};
      if (!lastPin || Math.abs(next.x-lastPin.x)>.1 || Math.abs(next.y-lastPin.y)>.1) {lastPin=next;events.pin(next);}
    }
  }
  function invalidate() { if (!dead && !queued) queued = requestAnimationFrame(render); }
  let renderWidth=0,renderHeight=0;
  let windFocused=false;
  let framing: {cx:number;cy:number;halfW:number;halfH:number}|null=null;
  const regionLandDuration=REGION_MOTION.land+Math.max(0,shapes.length-1)*REGION_MOTION.stagger;
  let regionSequence:{start:number;id:string;out:boolean;from:Map<string,number>;targets:Map<string,number>}|null=null;
  let regionFocus='';
  let regionCompositionManaged=false;
  let regionFade:{start:number;items:{object:THREE.Object3D;mesh:THREE.Mesh;original:THREE.Material|THREE.Material[];copies:THREE.Material[];opacity:number[];from:number;to:number;delay:number}[]} | null=null;
  function finishRegionFade(){
    if(!regionFade)return;
    for(const item of regionFade.items){item.mesh.material=item.original;item.copies.forEach(material=>material.dispose());item.object.visible=item.to>0;}
    regionFade=null;
  }
  function centerRegionOrbit(id:string){
    if(!(camera instanceof THREE.OrthographicCamera))return;
    const focused=shapes.filter(shape=>!id||shape.id===id);if(!focused.length)return;
    const box=new THREE.Box3();for(const shape of focused)for(const polygon of shape.ground)for(const ring of polygon)for(const [x,z] of ring)box.expandByPoint(new THREE.Vector3(x,DEPTH+1,z));
    const next=box.getCenter(new THREE.Vector3());
    const shift=next.clone().sub(controls.target),viewShift=shift.clone().applyQuaternion(camera.quaternion.clone().invert());
    camera.position.add(shift);controls.target.copy(next);
    camera.left-=viewShift.x;camera.right-=viewShift.x;camera.top-=viewShift.y;camera.bottom-=viewShift.y;
    camera.updateProjectionMatrix();camera.updateMatrixWorld();
    canvas.dataset.orbitRegion=id||'all';
    manual=false;resumeRotationAt=performance.now()+400;controls.autoRotateSpeed=.2;
  }
  let regionFlight:{start:number;from:number[];to:number[];id:string;duration:number}|null=null;
  function focusRegion(id:string) {
    if(!(camera instanceof THREE.OrthographicCamera))return;
    stopFlight();spinVelocity=0;controls.autoRotate=false;controls.enableDamping=false;controls.update(0);
    const sequenceNeeded=Boolean(id||regionFocus);
    const now=performance.now(),maximum=Math.max(0,...(previousValues??[]).map(barMaximum));
    if(sequenceNeeded){
      regionSequence={start:now,id,out:!id,from:new Map([...bars].map(([key,bar])=>[key,bar.visible?bar.scale.y:0])),targets:new Map((previousValues??[]).map(value=>[value.id,maximum?barMaximum(value)/maximum*BAR_MAX:0]))};
      transition=null;events.regionReady?.('');
    }
    regionCompositionManaged=true;regionFocus=id;resumeRotationAt=id?Infinity:0;
    // Fade only the surroundings; retain the chosen region at its current position.
    finishRegionFade();
    const items:NonNullable<typeof regionFade>['items']=[];
    for(const object of scene.children){
      if(bars.get(object.userData.region)===object)continue;
      if(!object.userData.region&&!contextObjects.includes(object))continue;
      const keep=!id||object.userData.region===id;
      const from=object.visible?1:0,to=keep?1:0;
      if(from===to)continue;
      object.visible=true;
      const regionIndex=Math.max(0,shapes.findIndex(shape=>shape.id===object.userData.region));
      const delay=(sequenceNeeded?(id?REGION_MOTION.bars:REGION_MOTION.detailOut+REGION_MOTION.bars+REGION_MOTION.zoomOut):0)+regionIndex*REGION_MOTION.stagger;
      object.traverse(node=>{
        const mesh=node as THREE.Mesh;if(!mesh.material)return;
        const original=mesh.material,source=Array.isArray(original)?original:[original];
        const copies=source.map(material=>{const copy=material.clone();copy.onBeforeCompile=material.onBeforeCompile;copy.customProgramCacheKey=material.customProgramCacheKey;copy.transparent=true;copy.opacity=material.opacity*from;copy.depthWrite=false;return copy;});
        mesh.material=Array.isArray(original)?copies:copies[0];
        items.push({object,mesh,original,copies,opacity:source.map(material=>material.opacity),from,to,delay});
      });
    }
    if(items.length)regionFade={start:performance.now(),items};
    renderer.shadowMap.needsUpdate=true;
    canvas.dataset.visibleRegion=id||'all';
    camera.updateMatrixWorld();
    const box=new THREE.Box3();
    const fit=(x:number,y:number,z:number)=>box.expandByPoint(new THREE.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse));
    for(const shape of shapes.filter(shape=>!id||shape.id===id)){
      for(const polygon of shape.ground)for(const ring of polygon)for(const [x,z] of ring){fit(x,0,z);fit(x,DEPTH,z);}
      const bar=bars.get(shape.id)!;
      fit(bar.position.x,DEPTH+BAR_MAX*(heightEnvelope[shape.id]??1),bar.position.z);
    }
    if(id){
      // Reserve the complete orbit envelope so long states never rotate out of frame.
      const shape=shapes.find(shape=>shape.id===id)!;
      const groundBounds=new THREE.Box3();
      for(const polygon of shape.ground)for(const ring of polygon)for(const [x,z] of ring)groundBounds.expandByPoint(new THREE.Vector3(x,0,z));
      const pivot=groundBounds.getCenter(new THREE.Vector3());let radius=0;
      for(const polygon of shape.ground)for(const ring of polygon)for(const [x,z] of ring)radius=Math.max(radius,Math.hypot(x-pivot.x,z-pivot.z));
      const local=pivot.clone().applyMatrix4(camera.matrixWorldInverse);
      const up=new THREE.Vector3(0,1,0).applyQuaternion(camera.quaternion.clone().invert());
      const verticalRadius=radius*Math.sqrt(Math.max(0,1-up.y*up.y));
      box.expandByPoint(new THREE.Vector3(local.x-radius,local.y-verticalRadius,local.z));
      box.expandByPoint(new THREE.Vector3(local.x+radius,local.y+verticalRadius+DEPTH*up.y,local.z));
      const bar=bars.get(id)!;const barRadius=Math.hypot(bar.position.x-pivot.x,bar.position.z-pivot.z);
      box.expandByPoint(new THREE.Vector3(local.x,local.y+barRadius*Math.sqrt(Math.max(0,1-up.y*up.y))+(DEPTH+BAR_MAX*(heightEnvelope[id]??1))*up.y,local.z));
    }
    if(box.isEmpty())return;
    const center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
    const style=getComputedStyle(host);
    const columns=id?Number(style.getPropertyValue('--region-focus-columns'))||1:1;
    const gap=columns>1?parseFloat(style.getPropertyValue('--region-focus-gap'))||0:0;
    const plotWidth=(host.clientWidth-gap*(columns-1))/columns;
    const aspect=host.clientWidth/host.clientHeight;
    const halfH=Math.max(size.y,size.x*host.clientHeight/plotWidth)*.5*1.12/framingScale;
    // Keep the canvas stable: fit into the left plot without resizing the scene
    // when the adjacent detail chart appears.
    center.x+=halfH/host.clientHeight*(host.clientWidth-plotWidth);
    const from=[camera.left/camera.zoom,camera.right/camera.zoom,camera.bottom/camera.zoom,camera.top/camera.zoom];
    camera.zoom=1;
    regionFlight={start:performance.now()+(sequenceNeeded?(id?REGION_MOTION.bars+regionLandDuration:REGION_MOTION.detailOut+REGION_MOTION.bars):0),from,to:[center.x-halfH*aspect,center.x+halfH*aspect,center.y-halfH,center.y+halfH],id,duration:sequenceNeeded?(id?REGION_MOTION.zoomIn:REGION_MOTION.zoomOut):1};
    canvas.dataset.regionFlight='moving';invalidate();
  }
  function resize() {
    if (dead) return;
    const w = host.clientWidth, h = host.clientHeight; if (!w || !h) return;
    const ratio=quality?scenePixelRatio(window.devicePixelRatio,w,h,quality.level):Math.min(window.devicePixelRatio,2);
    if(w!==renderWidth || h!==renderHeight || ratio!==renderer.getPixelRatio()){
      renderer.setPixelRatio(ratio);signForeground?.setPixelRatio(ratio);
      renderer.setSize(w,h,false);depthOfField?.resize(w,h);signForeground?.setSize(w,h,false);renderWidth=w;renderHeight=h;
    }
    for(const material of outlines)material.resolution.set(w,h);
    if(regionCompositionManaged){focusRegion(regionFocus);return;}
    // Fixed envelope across metrics: only bars move when the metric changes.
    if (!framing) {
      camera.updateMatrixWorld();
      let left=Infinity,right=-Infinity,bottom=Infinity,top=-Infinity;
      const fitPoint = (x:number,y:number,z:number) => {
        const point=new THREE.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse);
        left=Math.min(left,point.x);right=Math.max(right,point.x);
        bottom=Math.min(bottom,point.y);top=Math.max(top,point.y);
      };
      for (const region of shapes) {
        for (const poly of region.ground) for (const ring of poly) for (const [x,z] of ring) {fitPoint(x,0,z);fitPoint(x,DEPTH,z);}
        const bar=bars.get(region.id)!;
        if(!region.kind || !["Gemeindefreies Gebiet", "Kreisfreie Stadt"].includes(region.kind)) fitPoint(bar.position.x,DEPTH+BAR_MAX*(heightEnvelope[region.id]??1),bar.position.z);
        for(const [x,z] of region.groundTrees)fitPoint(x,DEPTH+28,z);
      }
      for(const t of turbines??[]){
        const r=(t.rotor??0)/2*(buildings?windScale:Math.max(windScale,5));
        fitPoint(t.x-r,groundAt(t.x,t.z)+(t.hub??0)*(buildings?windScale:Math.max(windScale,5))+r,t.z);
        fitPoint(t.x+r,DEPTH,t.z);
      }

      if(architecture){const box=new THREE.Box3().setFromObject(architecture.mesh);for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])fitPoint(x,y,z);}
      if(buildings&&terrain)for(const [x,z] of terrain.groundSurface?.vertices??[])fitPoint(x,groundAt(x,z),z);
      // Frame the initial composition once: rotation retains a fixed geographic pivot.
      framing={cx:(left+right)/2,cy:(bottom+top)/2,halfW:(right-left)/2,halfH:(top-bottom)/2};
    }
    // Full-bleed canvas; compose the map within the space below the copy.
    // Measure the actual heading so wrapping never changes the intended overlap.
    const hostRect = host.getBoundingClientRect();
    const stage = host.closest<HTMLElement>("[data-map-hero-stage]");
    const heading = stage?.querySelector<HTMLElement>("[data-map-hero-heading]");
    const stageRect = stage?.getBoundingClientRect();
    const headingBottom = heading?.getBoundingClientRect().bottom ?? hostRect.top;
    const topInset = Math.max(0, headingBottom - hostRect.top + (w < 600 ? 12 : -200));
    const canvasRect = host.closest<HTMLElement>("[data-map-canvas]")?.getBoundingClientRect();
    const bottomEdge = canvasRect ? canvasRect.bottom - hostRect.top : stageRect ? stageRect.bottom - hostRect.top : h;
    const fittedHeight = Math.max(200, bottomEdge - topInset);
    const fittedWidth = Math.min(w, 1120);
    const worldPerFitPixel = Math.max(2 * framing.halfH / fittedHeight, 2 * framing.halfW / fittedWidth) * 1.12 / framingScale;
    const halfH = worldPerFitPixel * h / 2;
    const centerY = (topInset + bottomEdge) / 2;
    const verticalOffset = (centerY - h / 2) * worldPerFitPixel;
    const frameX=windFocused?0:framing.cx,frameY=windFocused?0:framing.cy+verticalOffset;
    if(camera instanceof THREE.PerspectiveCamera){camera.aspect=w/h;camera.updateProjectionMatrix();invalidate();return;}
    camera.left=frameX-halfH*w/h;camera.right=frameX+halfH*w/h;
    camera.bottom=frameY-halfH;camera.top=frameY+halfH;
    const worldPerPixel=(camera.right-camera.left)/w;
    cityMarker?.scale.set(26*worldPerPixel,26*worldPerPixel,1);
    camera.updateProjectionMatrix();invalidate();
  }
  const observer = new ResizeObserver(resize);observer.observe(host);
  const intersection = new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(!visible)quality?.reset();if(visible)invalidate();});intersection.observe(host);
  const visibility = () => {quality?.reset();lastFrame=performance.now();pace.reset();invalidate();}; document.addEventListener("visibilitychange",visibility);
  reducedMotion.addEventListener("change",visibility);
  // Orbiting changes the view, not the fixed composition or DOM dimensions.
  controls.addEventListener("change",invalidate);
  const ray = new THREE.Raycaster();
  let hitCarrier:string|null=null;
  function hit(event: PointerEvent) {
    const rect=canvas.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1),camera);
    const hit=ray.intersectObjects(pickables.filter(object=>object.visible),true).find(hit=>{const material=(hit.object as THREE.Mesh).material;return !material||(Array.isArray(material)?material.some(item=>item.visible):material.visible);});
    hitCarrier=hit?.object.userData.carrier??null;
    return hit?.object.userData.windIds?.[hit.instanceId??0] ?? hit?.object.userData.region as string | undefined;
  }
  let down: {x:number;y:number;pointerId:number} | null = null;
  const pointers=new Set<number>();
  let dragged=false;
  const move = (e:PointerEvent) => {
    if(swipe&&down?.pointerId===e.pointerId&&pointers.size===1){
      const now=performance.now(),dt=now-swipe.at;
      if(dt>=4){
        const velocity=-(e.clientX-swipe.x)*2*Math.PI/Math.max(1,canvas.clientHeight)/(dt/1000)*controls.rotateSpeed;
        swipe={x:e.clientX,at:now,velocity:swipe.velocity*.25+velocity*.75};
      }
    }
    if(down&&Math.hypot(e.clientX-down.x,e.clientY-down.y)>=5)dragged=true; if (e.pointerType === "touch" || e.buttons) return; const id=hit(e)??null;events.hover(id);events.barHover?.(hitCarrier);canvas.style.cursor=id?"pointer":"grab"; };
  const leave = (e:PointerEvent) => {if(e.pointerType!=="touch"){events.hover(null);events.barHover?.(null);}};
  const startDrag = () => {stopFlight();manual=true;spinVelocity=0;resumeRotationAt=Infinity;controls.dampingFactor=.22;controls.autoRotate=false;events.hover(null);};
  const endDrag = () => {
    lastFrame=performance.now();
    spinVelocity=!reducedMotion.matches&&swipe&&lastFrame-swipe.at<120
      ? Math.max(-5,Math.min(5,swipe.velocity*1.5)):0;
    manual=false;controls.dampingFactor=.22;
    resumeRotationAt=lastFrame+7000;invalidate();
  };
  controls.addEventListener("start",startDrag);
  controls.addEventListener("end",endDrag);
  // Leave single-finger scrolling to the browser. Claim two-finger touch
  // gestures before its default pan/zoom while OrbitControls handles the map.
  const twoFingerTouch=(event:TouchEvent)=>{
    if(event.touches.length>=2&&event.cancelable)event.preventDefault();
  };
  canvas.addEventListener("touchstart",twoFingerTouch,{passive:false});
  canvas.addEventListener("touchmove",twoFingerTouch,{passive:false});
  const wheel=(e:WheelEvent)=>{if(!e.ctrlKey)e.stopImmediatePropagation();};
  canvas.addEventListener("wheel",wheel,{capture:true,passive:true});
  const disposeTrackpad = bindTrackpadGestures(canvas, {
    mode: () => "pinch-only",
    enabled: () => controls.enabled && controls.enableZoom,
    zoom: factor => {
      stopFlight();
      spinVelocity = 0;
      controls.autoRotate = false;
      resumeRotationAt = performance.now() + 7000;
      events.hover(null);
      controls.dollyIn(factor);
      invalidate();
    },
  });

  const press = (e:PointerEvent) => {if(e.button!==0)return;pointers.add(e.pointerId);spinVelocity=0;if(pointers.size>1){swipe=null;dragged=true;return;}swipe={x:e.clientX,at:performance.now(),velocity:0};dragged=false;down={x:e.clientX,y:e.clientY,pointerId:e.pointerId};};
  const release = (e:PointerEvent) => { pointers.delete(e.pointerId);if(!dragged&&down?.pointerId===e.pointerId&&Math.hypot(e.clientX-down.x,e.clientY-down.y)<5){const id=hit(e);if(id)events.select(id,e.pointerType==="touch");}down=null; };
  const cancel = (e:PointerEvent) => {pointers.delete(e.pointerId);swipe=null;spinVelocity=0;down=null;dragged=true;};
  const lost = (e:Event) => {e.preventDefault();events.failed();};
  canvas.addEventListener("pointermove",move);canvas.addEventListener("pointerleave",leave);canvas.addEventListener("pointerdown",press);canvas.addEventListener("pointerup",release);canvas.addEventListener("pointercancel",cancel);canvas.addEventListener("webglcontextlost",lost);
  let carrierColors:Record<string,string>={};
  let highlightedCarriers:string[]=[];
  const carrierHighlight=new THREE.MeshBasicMaterial({color:brand,toneMapped:false});materials.add(carrierHighlight);
  const carrierMuted=new THREE.MeshBasicMaterial({color:0x46656b,toneMapped:false});materials.add(carrierMuted);
  function highlightCarriers(){
    for(const [id,parent] of bars)for(const child of parent.children){
      const mesh=child as THREE.Mesh;
      if(!mesh.userData.carrier)continue;
      mesh.material=id===selected&&carrierColors[mesh.userData.carrier]?groupedMaterial(carrierColors[mesh.userData.carrier]):highlightedCarriers.length&&id===selected?(highlightedCarriers.includes(mesh.userData.carrier)?carrierHighlight:carrierMuted):mesh.userData.baseMaterial;
    }
    canvas.dataset.highlightedCarriers=highlightedCarriers.join(',');invalidate();
  }
  function highlight() {
    wind?.highlight(hovered??selected);
    for (const region of shapes) {
      const active=region.id===hovered||region.id===selected;
      surfaces.get(region.id)!.color.copy(background).lerp(new THREE.Color(0x486665),active?.4:0);
      const bar=bars.get(region.id)!;bar.material=bar.children.length?groupedParentMaterial:active?selectedBar:barMaterial;
    }
    invalidate();
  }
  // Three shared, seeded branch/leaf meshes; clones vary scale and orientation.
  // Deciduous leaves can change colour or disappear independently of the branches.
  async function plant() {
    for (let seed=0;seed<3;seed++) {
      await new Promise(resolve=>setTimeout(resolve,0)); if(dead)return;
      const template=new Tree(); Object.assign(template.options, structuredClone(TreePreset[seed===1?"Pine Small":"Ash Small"]));
      template.options.seed=26867+seed*91;
      template.options.bark.textured=false;template.options.bark.tint=side.color.getHex();
      template.options.leaves.count=seed===1?8:10;template.options.leaves.size=seed===1?5:4.5;template.options.leaves.tint=0xffffff;
      template.options.branch.levels=seed===1?1:2;
      template.options.branch.children={0:seed===1?32:7,1:5,2:3};
      template.options.branch.sections={0:5,1:4,2:3,3:2};template.options.branch.segments={0:5,1:4,2:3,3:2};
      template.generate();
      const oldLeafMaterial=template.leavesMesh.material as THREE.MeshPhongMaterial;
      const leafMaterial=new THREE.MeshStandardMaterial({map:oldLeafMaterial.map,color:side.color,roughness:.85,side:THREE.DoubleSide,toneMapped:false});
      const oldBarkMaterial=template.branchesMesh.material as THREE.Material;
      template.branchesMesh.material=new THREE.MeshStandardMaterial({color:side.color,roughness:1,toneMapped:false});
      oldBarkMaterial.dispose();
      leafMaterial.onBeforeCompile = shader => {
        shader.fragmentShader = shader.fragmentShader.replace("#include <map_fragment>", `
          vec3 treeTint = diffuseColor.rgb;
          #include <map_fragment>
          // Keep the texture's alpha silhouette, but remove its natural green pigment.
          diffuseColor.rgb = treeTint;
        `);
      };
      leafMaterial.customProgramCacheKey = () => "district-leaf-map-monochrome";
      oldLeafMaterial.dispose();template.leavesMesh.material=leafMaterial;
      leafMaterial.alphaTest=.25;leafMaterial.transparent=false;leafMaterial.side=THREE.DoubleSide;
      leafMaterial.forceSinglePass=true;
      const bounds=new THREE.Box3().setFromObject(template),size=bounds.getSize(new THREE.Vector3());
      template.traverse(o=>{if(o instanceof THREE.Mesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){materials.add(m);const map=(m as THREE.MeshStandardMaterial).map;if(map)textures.add(map);}}});
      let i=0;
      for(const region of shapes) for(const [x,z] of region.groundTrees) {
        if(i++%3!==seed)continue;
        const tree=new THREE.Group();tree.add(template.branchesMesh.clone(),template.leavesMesh.clone());const height=14+(i%5)*2;
        tree.scale.setScalar(Math.min(height/size.y,15/Math.max(size.x,size.z)));
        tree.position.set(x,DEPTH,z);tree.rotation.y=i*2.39996;scene.add(tree);trees.push(tree);
        tree.traverse(o=>{if(o instanceof THREE.Mesh&&o.geometry===template.leavesMesh.geometry){o.userData.evergreen=seed===1;leaves.push(o);}});
      }
      renderer.shadowMap.needsUpdate=true;
      invalidate();
    }
    await Promise.all([...textures].map(t => {
      const image=t.image;
      return image instanceof HTMLImageElement ? image.decode().catch(()=>undefined) : Promise.resolve();
    }));
    if(dead)return;
    renderer.shadowMap.needsUpdate=true;
    invalidate();
    canvas.dataset.trees="ready";
  }
  const planting=(turbines ? Promise.resolve() : plant()).catch(()=>{canvas.dataset.trees="failed";});
  resize();
  return {
    autoplay(enabled:boolean){autoplay=enabled;controls.autoRotate=false;invalidate();},
    palette(){
      if(buildings)return;
      const currentTheme=getComputedStyle(host);
      background.set(currentTheme.getPropertyValue('--color-bg-page').trim()).lerp(new THREE.Color(currentTheme.getPropertyValue('--color-bg-raised').trim()),exportable ? 0 : .5);
      side.color.set(currentTheme.getPropertyValue('--color-bg-raised').trim()).multiplyScalar(1.65);
      brand.set(currentTheme.getPropertyValue('--color-brand').trim());
      for(const css of groupedMaterials.keys())groupedMaterial(css);
      for(const [selected,faces] of [[false,barMaterial],[true,selectedBar]] as const){
        const shades=[selected ? .78 : .62,.88,1,.5,1,.72];
        faces.forEach((face,index)=>{face.color.copy(brand).multiplyScalar(exportable ? 1 : shades[index]);if(face instanceof THREE.MeshLambertMaterial)face.emissive.copy(brand);});
      }
      highlight();invalidate();
    },
    setWind(value:WindConditions|null){windConditions=value;wind?.setWind(value);canvas.dataset.windMotion=value?"model":"unavailable";canvas.dataset.windSpeed=String(value?.speedMs??'');canvas.dataset.windAt=value?.validAt??'';invalidate();},
    setWindScale(factor:number){windScale=factor;wind?.setScale(factor);invalidate();},
    flyTo,
    focusRegion,
    setCarrierColors(colors:Record<string,string>){carrierColors=colors;highlightCarriers();},
    highlightCarriers(labels:string[]){highlightedCarriers=labels;highlightCarriers();},
    previewReference,
    leaveReferencePark,
    showReferencePath(show:boolean){if(flightMetrics)flightMetrics.hidden=!show;if(referencePlan)referencePlan.style.display=show?'block':'none';invalidate();},
    zoom(factor:number) { stopFlight();if(camera instanceof THREE.PerspectiveCamera){controls.dollyIn(factor);invalidate();return;}camera.zoom=THREE.MathUtils.clamp(camera.zoom*factor,controls.minZoom,controls.maxZoom);camera.updateProjectionMatrix();invalidate(); },
    focus(id:string) { const turbine=turbines?.find(t=>t.id===id);if(turbine)flyTo({x:turbine.x,z:turbine.z,zoom:8}); },
    reset() { if(buildings)flyTo({x:pivot.x,z:pivot.z,zoom:1});else {stopFlight();camera.position.copy(cameraOffset).add(pivot);controls.target.copy(pivot);camera.zoom=1;windFocused=false;resize();invalidate();} },
    update(values:MapValue[],chosen:string,over:string|null) {
      if (values !== previousValues) {
        for(const [id,parent] of bars){
          parent.clear();const value=values.find(item=>item.id===id);const maximum=value?barMaximum(value):0;
          if(value?.bars&&maximum>0)value.bars.forEach((item,index)=>{
            if(item.value<=0)return;
            const height=item.value/maximum;
            const bar=new THREE.Mesh(barGeometry,groupedMaterial(item.color));
            const columns=Math.ceil(value.bars!.length/2);
            bar.scale.set(.65,height,.65);bar.position.set((index%columns-(columns-1)/2)*7,-.5+height/2,(Math.floor(index/columns)-.5)*7);
            bar.castShadow=true;bar.receiveShadow=true;bar.userData.region=id;bar.userData.carrier=item.label;bar.userData.baseMaterial=bar.material;parent.add(bar);
          });
          parent.castShadow=!parent.children.length;
        }
        const maximum=Math.max(0,...values.map(barMaximum));
        const targets=new Map(values.map(value=>[value.id,maximum>0?barMaximum(value)/maximum*BAR_MAX:0]));
        // A short geographic wave gives the entrance rhythm without delaying metric changes.
        const north=Math.min(...shapes.map(s=>s.groundAnchor[1]));
        const south=Math.max(...shapes.map(s=>s.groundAnchor[1]));
        const heights=new Map([...bars].map(([id,bar])=>[id,{
          from:bar.visible?bar.scale.y:0,to:targets.get(id)??0,
          delay:previousValues?0:180*(bar.position.z-north)/Math.max(1,south-north)+((Number(id)||0)%4)*12,
        }]));
        if (reducedMotion.matches) {
          transition=null;
          for(const [id,height] of heights)placeBar(bars.get(id)!,height.to);
        } else transition={start:performance.now()+(previousValues?0:180),duration:previousValues?550:420,heights};
        renderer.shadowMap.needsUpdate=true;
        previousValues=values;
      }
      selected=chosen;hovered=over;highlight();highlightCarriers();
    },
    async season(season:Season) {
      await planting;if(dead)return;
      for(const leaf of leaves){leaf.visible=season!=="winter"||leaf.userData.evergreen===true;(leaf.material as THREE.MeshStandardMaterial).color.copy(side.color);}
      renderer.shadowMap.needsUpdate=true;
      invalidate();
    },
    dispose(){finishRegionFade();signShadow?.dispose();locationPins?.dispose();depthOfField?.dispose();signForeground?.domElement.remove();signForeground?.dispose();flightMetrics?.remove();referencePlan?.remove();disposeTrackpad();solarLayer?.dispose();contours?.dispose();architecture?.dispose();context?.dispose();land?.dispose();reducedMotion.removeEventListener("change",visibility);wind?.dispose();canvas.removeEventListener("touchstart",twoFingerTouch);canvas.removeEventListener("touchmove",twoFingerTouch);canvas.removeEventListener("wheel",wheel,{capture:true});dead=true;cancelAnimationFrame(queued);observer.disconnect();intersection.disconnect();controls.removeEventListener("change",invalidate);controls.removeEventListener("start",startDrag);controls.removeEventListener("end",endDrag);controls.dispose();document.removeEventListener("visibilitychange",visibility);canvas.removeEventListener("pointermove",move);canvas.removeEventListener("pointerleave",leave);canvas.removeEventListener("pointerdown",press);canvas.removeEventListener("pointerup",release);canvas.removeEventListener("pointercancel",cancel);canvas.removeEventListener("webglcontextlost",lost);for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();key.shadow.map?.dispose();renderer.dispose();canvas.remove();},
  };
}
