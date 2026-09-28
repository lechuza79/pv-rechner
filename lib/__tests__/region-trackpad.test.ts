import {describe, expect, it} from 'vitest';
import {readFileSync} from 'node:fs';
import {OrthographicCamera} from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {bindTrackpadGestures} from '../../public/shared-3d/trackpad-gestures.js';

// Exercise the actual scene adapter with the installed OrbitControls implementation.
const source = readFileSync(new URL('../../components/landkreis/region-scene.ts', import.meta.url), 'utf8');
function fixture() {
  const canvas = new EventTarget();
  const camera = new OrthographicCamera(-1, 1, 1, -1, .1, 100);
  camera.position.set(0, 0, 10);
  const controls = new OrbitControls(camera, null);
  controls.minZoom = .7; controls.maxZoom = 3;
  let invalidations = 0;
  const adapter = source.match(/const disposeTrackpad = bindTrackpadGestures\(canvas, \{[\s\S]*?\n  \}\);/)![0];
  const dispose = new Function('bindTrackpadGestures', 'canvas', 'controls', 'events', 'invalidate',
    `let spinVelocity=2,resumeRotationAt=0; ${adapter}; return disposeTrackpad;`
  )(bindTrackpadGestures, canvas, controls, {hover(){}}, () => invalidations++);
  const emit = (type: string, props: object) => {
    const event = new Event(type, {cancelable:true});
    Object.assign(event, {deltaY:0,deltaMode:0,ctrlKey:false}, props);
    canvas.dispatchEvent(event); return event;
  };
  return {camera, controls, emit, dispose, invalidations: () => invalidations};
}
describe('Region map trackpad integration', () => {
  it('zooms in and out and requests a render', () => {
    const f=fixture();
    expect(f.emit('wheel',{ctrlKey:true,deltaY:-20}).defaultPrevented).toBe(true);
    expect(f.camera.zoom).toBeGreaterThan(1);
    f.emit('wheel',{ctrlKey:true,deltaY:20});
    expect(f.camera.zoom).toBeCloseTo(1);
    expect(f.invalidations()).toBe(2);
  });
  it('honours the existing camera limits', () => {
    const f=fixture();
    for(let i=0;i<10;i++)f.emit('wheel',{ctrlKey:true,deltaY:-100});
    expect(f.camera.zoom).toBe(3);
    for(let i=0;i<10;i++)f.emit('wheel',{ctrlKey:true,deltaY:100});
    expect(f.camera.zoom).toBe(.7);
  });
  it('preserves scrolling and does not zoom when disabled or disposed', () => {
    const f=fixture();
    expect(f.emit('wheel',{deltaY:20}).defaultPrevented).toBe(false);
    f.controls.enabled=false;
    expect(f.emit('wheel',{ctrlKey:true,deltaY:-20}).defaultPrevented).toBe(false);
    f.controls.enabled=true; f.dispose();
    expect(f.emit('wheel',{ctrlKey:true,deltaY:-20}).defaultPrevented).toBe(false);
    expect(f.camera.zoom).toBe(1);
  });
  it('lets pinch pass the old wheel gate and disposes the shared binding', () => {
    const body=source.match(/const wheel=\(e:WheelEvent\)=>\{([^}]+)\}/)![1];
    let blocked=0;const wheel=new Function('e',body);
    wheel({ctrlKey:true,stopImmediatePropagation(){blocked++;}});
    expect(blocked).toBe(0);
    wheel({ctrlKey:false,stopImmediatePropagation(){blocked++;}});
    expect(blocked).toBe(1);
    expect(source).toContain('dispose(){disposeTrackpad();');
  });
});
