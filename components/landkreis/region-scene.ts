import { createFramePacer } from "../../public/hero-system/source/frame-pacer.js";
import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Tree, TreePreset } from "@dgreenheck/ez-tree";
import type { ProjectedRegion } from "../../lib/region-perspektive";
import type { MapValue } from "./RegionKarte";

export type Season = "spring" | "summer" | "autumn" | "winter";
const DEPTH = 26;
const BAR_MAX = 155;

/** One scene with shared tree geometry; intro rotation yields to interaction. */
export function createRegionScene(host: HTMLElement, shapes: ProjectedRegion[], events: {
  hover: (id: string | null) => void; select: (id: string) => void;
  pin: (point: { x: number; y: number } | null) => void; failed: () => void;
}, heightEnvelope: Record<string, number> = {}) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const canvas = renderer.domElement;
  let enteredAt: number | null = null;
  let manual = false, lastFrame = performance.now();
  const pace = createFramePacer(30);
  let lastPin: {x:number;y:number}|null=null;
  canvas.setAttribute("aria-hidden", "true");
  host.append(canvas);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xe5f2ed, 0x26343b, 1.8));
  const key = new THREE.DirectionalLight(0xfff1cc, 2.2); key.position.set(-350, 650, 350);
  key.castShadow=true;key.shadow.mapSize.set(2048,2048);
  Object.assign(key.shadow.camera,{left:-650,right:650,top:650,bottom:-650,near:1,far:2000});
  key.shadow.bias=-.0002;key.shadow.normalBias=.5;scene.add(key);
  const fill = new THREE.DirectionalLight(0xb8d1df, .8); fill.position.set(500, 220, -350); scene.add(fill);
  const city = shapes.find(s=>s.kind === "Kreisfreie Stadt");
  const pivot = new THREE.Vector3(city?.groundAnchor[0]??0,DEPTH+1,city?.groundAnchor[1]??0);
  const camera = new THREE.OrthographicCamera(-500, 500, 400, -400, 1, 4000);
  camera.position.set(-330, 540, 920).add(pivot); camera.lookAt(pivot); camera.updateMatrixWorld();
  const controls = new OrbitControls(camera, canvas);
  controls.target.copy(pivot); controls.enableDamping = false; controls.enablePan = false;
  // Page scrolling stays page scrolling; mouse/touch drag only changes viewing angle.
  controls.enableZoom = false; controls.minPolarAngle = .35; controls.maxPolarAngle = 1.25;
  controls.minAzimuthAngle = -Infinity; controls.maxAzimuthAngle = Infinity;
  controls.autoRotateSpeed = .35;
  // Touch: a horizontal one-finger drag turns the map; vertical drags stay page
  // scrolling (the browser claims them via pan-y); two fingers stay the browser's
  // pinch zoom. Before, two fingers were mapped to TOUCH.ROTATE, which OrbitControls
  // does not handle for two fingers (it falls back to "none"), and pinch zoom was
  // blocked over the whole hero. A short tap still opens the municipality.
  controls.update(); canvas.style.touchAction = "pan-y pinch-zoom";
  controls.touches.ONE = THREE.TOUCH.ROTATE; controls.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;
  const pickables: THREE.Object3D[] = [];
  const surfaces = new Map<string, THREE.MeshBasicMaterial>();
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
    .lerp(new THREE.Color(theme.getPropertyValue("--color-bg-raised").trim()), .5);
  const side = new THREE.MeshBasicMaterial({color:new THREE.Color(theme.getPropertyValue("--color-bg-raised").trim()).multiplyScalar(1.65),toneMapped:false});
  side.onBeforeCompile = shader => {
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
    const face = new THREE.MeshBasicMaterial({ color: brand.clone().multiplyScalar(shade), toneMapped: false });
    materials.add(face); return face;
  });
  const barMaterial = barFaces(false);
  const selectedBar = barFaces(true);
  const barGeometry = new THREE.BoxGeometry(6.5, 1, 6.5); geometries.add(barGeometry);
  for (const region of shapes) {
    const forest = region.kind === "Gemeindefreies Gebiet";
    const top = new THREE.MeshBasicMaterial({color:background,toneMapped:false});
    top.onBeforeCompile = shader => {
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
      mesh.userData.region = region.id; scene.add(mesh); pickables.push(mesh);
      // Outlines only on the upper face, retaining fine municipal boundaries.
      for (const ring of rings) {
        const lineGeometry = new LineGeometry().setPositions(ring.flatMap(([x,z])=>[x,DEPTH+.25,z]));
        geometries.add(lineGeometry);
        const lineMaterial = new LineMaterial({ color: 0x789491, linewidth: 1.35, transparent: true, opacity: .42, toneMapped: false }); materials.add(lineMaterial);outlines.add(lineMaterial);
        scene.add(new Line2(lineGeometry,lineMaterial));
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
    cityMarker=pin;pin.position.copy(pivot);pin.userData.region=city.id;scene.add(pin);pickables.push(pin);
  }
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let previousValues: MapValue[] | null = null;
  let transition: { start: number; duration: number; heights: Map<string, { from: number; to: number; delay: number }> } | null = null;
  const placeBar = (bar: THREE.Mesh, height: number) => {
    bar.visible = height > .001; bar.scale.y = height; bar.position.y = DEPTH + height / 2;
  };
  function render() {
    queued = 0;
    if (dead || !visible || document.hidden) return;
    const now = performance.now();
    if (!manual && !reducedMotion.matches && !pace.shouldDraw(now)) { invalidate(); return; }
    if(enteredAt===null){enteredAt=now;if(transition)transition.start=now+180;}
    const elapsed = now-enteredAt;
    const opacity = reducedMotion.matches ? "1" : String(Math.min(1,elapsed/240));
    if (canvas.style.opacity !== opacity) canvas.style.opacity = opacity;
    controls.autoRotate = !manual && !reducedMotion.matches && elapsed>950;
    if(controls.autoRotate)controls.update(Math.min(.05,(now-lastFrame)/1000));
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
    renderer.render(scene,camera);
    if (transition || (!manual && !reducedMotion.matches) || elapsed<240) invalidate();
    if (city) {
      const point = new THREE.Vector3(city.groundAnchor[0],DEPTH+1,city.groundAnchor[1]).project(camera);
      const next={x:(point.x+1)*renderWidth/2,y:(1-point.y)*renderHeight/2};
      if (!lastPin || Math.abs(next.x-lastPin.x)>.1 || Math.abs(next.y-lastPin.y)>.1) {lastPin=next;events.pin(next);}
    }
  }
  function invalidate() { if (!dead && !queued) queued = requestAnimationFrame(render); }
  let renderWidth=0,renderHeight=0;
  let framing: {cx:number;cy:number;halfW:number;halfH:number}|null=null;
  function resize() {
    if (dead) return;
    const w = host.clientWidth, h = host.clientHeight; if (!w || !h) return;
    if(w!==renderWidth || h!==renderHeight){renderer.setSize(w,h,false);renderWidth=w;renderHeight=h;}
    for(const material of outlines)material.resolution.set(w,h);
    // Fixed envelope across metrics: only bars move when the metric changes.
    if (!framing) {
      camera.updateMatrixWorld();
      const xs:number[]=[],ys:number[]=[];
      const fitPoint = (x:number,y:number,z:number) => {
        const point=new THREE.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse);
        xs.push(point.x);ys.push(point.y);
      };
      for (const region of shapes) {
        for (const poly of region.ground) for (const ring of poly) for (const [x,z] of ring) {fitPoint(x,0,z);fitPoint(x,DEPTH,z);}
        const bar=bars.get(region.id)!;
        if(!region.kind || !["Gemeindefreies Gebiet", "Kreisfreie Stadt"].includes(region.kind)) fitPoint(bar.position.x,DEPTH+BAR_MAX*(heightEnvelope[region.id]??1),bar.position.z);
        for(const [x,z] of region.groundTrees)fitPoint(x,DEPTH+28,z);
      }
      // Frame the initial composition once: rotation retains a fixed geographic pivot.
      const left=Math.min(...xs),right=Math.max(...xs),bottom=Math.min(...ys),top=Math.max(...ys);
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
    const worldPerFitPixel = Math.max(2 * framing.halfH / fittedHeight, 2 * framing.halfW / fittedWidth) * 1.12;
    const halfH = worldPerFitPixel * h / 2;
    const centerY = (topInset + bottomEdge) / 2;
    const verticalOffset = (centerY - h / 2) * worldPerFitPixel;
    camera.left=framing.cx-halfH*w/h;camera.right=framing.cx+halfH*w/h;
    camera.bottom=framing.cy-halfH+verticalOffset;camera.top=framing.cy+halfH+verticalOffset;
    const worldPerPixel=(camera.right-camera.left)/w;
    cityMarker?.scale.set(26*worldPerPixel,26*worldPerPixel,1);
    camera.updateProjectionMatrix();invalidate();
  }
  const observer = new ResizeObserver(resize);observer.observe(host);
  const intersection = new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)invalidate();});intersection.observe(host);
  const visibility = () => invalidate(); document.addEventListener("visibilitychange",visibility);
  // Orbiting changes the view, not the fixed composition or DOM dimensions.
  controls.addEventListener("change",invalidate);
  const ray = new THREE.Raycaster();
  function hit(event: PointerEvent) {
    const rect=canvas.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1),camera);
    return ray.intersectObjects(pickables,false)[0]?.object.userData.region as string | undefined;
  }
  let down: {x:number;y:number;pointerId:number} | null = null;
  const pointers=new Set<number>();
  let dragged=false;
  const move = (e:PointerEvent) => { if(down&&Math.hypot(e.clientX-down.x,e.clientY-down.y)>=5)dragged=true; if (e.pointerType === "touch" || e.buttons) return; const id=hit(e)??null;events.hover(id);canvas.style.cursor=id?"pointer":"grab"; };
  const leave = () => events.hover(null);
  const startDrag = () => {manual=true;controls.autoRotate=false;events.hover(null);};
  const endDrag = () => {manual=false;lastFrame=performance.now();invalidate();};
  controls.addEventListener("start",startDrag);
  controls.addEventListener("end",endDrag);
  // Touch turns the map around its axis only: a vertical drag belongs to page
  // scrolling, and until the browser claims it the map must not tilt with it.
  const tilt={min:controls.minPolarAngle,max:controls.maxPolarAngle};
  const lockTilt=(e:PointerEvent)=>{if(e.pointerType!=="touch")return;const polar=controls.getPolarAngle();controls.minPolarAngle=polar;controls.maxPolarAngle=polar;};
  // After the gesture handlers below have removed the pointer.
  const unlockTilt=()=>queueMicrotask(()=>{if(pointers.size===0){controls.minPolarAngle=tilt.min;controls.maxPolarAngle=tilt.max;}});
  canvas.addEventListener("pointerdown",lockTilt,{capture:true});
  canvas.addEventListener("pointerup",unlockTilt);canvas.addEventListener("pointercancel",unlockTilt);
  const press = (e:PointerEvent) => {if(e.button!==0)return;pointers.add(e.pointerId);if(pointers.size>1){dragged=true;return;}dragged=false;down={x:e.clientX,y:e.clientY,pointerId:e.pointerId};};
  const release = (e:PointerEvent) => { pointers.delete(e.pointerId);if(!dragged&&down?.pointerId===e.pointerId&&Math.hypot(e.clientX-down.x,e.clientY-down.y)<5){const id=hit(e);if(id)events.select(id);}down=null; };
  const cancel = (e:PointerEvent) => {pointers.delete(e.pointerId);down=null;dragged=true;};
  const lost = (e:Event) => {e.preventDefault();events.failed();};
  canvas.addEventListener("pointermove",move);canvas.addEventListener("pointerleave",leave);canvas.addEventListener("pointerdown",press);canvas.addEventListener("pointerup",release);canvas.addEventListener("pointercancel",cancel);canvas.addEventListener("webglcontextlost",lost);
  function highlight() {
    for (const region of shapes) {
      const active=region.id===hovered||region.id===selected;
      surfaces.get(region.id)!.color.copy(background).lerp(new THREE.Color(0x486665),active?.4:0);
      bars.get(region.id)!.material=active?selectedBar:barMaterial;
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
  const planting=plant().catch(()=>{canvas.dataset.trees="failed";});
  resize();
  return {
    update(values:MapValue[],chosen:string,over:string|null) {
      if (values !== previousValues) {
        const maximum=Math.max(0,...values.map(v=>v.value??0));
        const targets=new Map(values.map(v=>[v.id,v.value!==null&&v.value>0&&maximum>0?v.value/maximum*BAR_MAX:0]));
        // A short geographic wave gives the entrance rhythm without delaying metric changes.
        const north=Math.min(...shapes.map(s=>s.groundAnchor[1]));
        const south=Math.max(...shapes.map(s=>s.groundAnchor[1]));
        const heights=new Map([...bars].map(([id,bar])=>[id,{
          from:bar.visible?bar.scale.y:0,to:targets.get(id)??0,
          delay:previousValues?0:180*(bar.position.z-north)/Math.max(1,south-north)+(Number(id)%4)*12,
        }]));
        if (reducedMotion.matches) {
          transition=null;
          for(const [id,height] of heights)placeBar(bars.get(id)!,height.to);
        } else transition={start:performance.now()+(previousValues?0:180),duration:previousValues?550:420,heights};
        renderer.shadowMap.needsUpdate=true;
        previousValues=values;
      }
      selected=chosen;hovered=over;highlight();
    },
    async season(season:Season) {
      await planting;if(dead)return;
      for(const leaf of leaves){leaf.visible=season!=="winter"||leaf.userData.evergreen===true;(leaf.material as THREE.MeshStandardMaterial).color.copy(side.color);}
      renderer.shadowMap.needsUpdate=true;
      invalidate();
    },
    dispose(){dead=true;cancelAnimationFrame(queued);observer.disconnect();intersection.disconnect();canvas.removeEventListener("pointerdown",lockTilt,{capture:true});canvas.removeEventListener("pointerup",unlockTilt);canvas.removeEventListener("pointercancel",unlockTilt);controls.removeEventListener("change",invalidate);controls.removeEventListener("start",startDrag);controls.removeEventListener("end",endDrag);controls.dispose();document.removeEventListener("visibilitychange",visibility);canvas.removeEventListener("pointermove",move);canvas.removeEventListener("pointerleave",leave);canvas.removeEventListener("pointerdown",press);canvas.removeEventListener("pointerup",release);canvas.removeEventListener("pointercancel",cancel);canvas.removeEventListener("webglcontextlost",lost);for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();key.shadow.map?.dispose();renderer.dispose();canvas.remove();},
  };
}
