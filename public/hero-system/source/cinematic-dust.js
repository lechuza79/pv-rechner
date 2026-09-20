// Screen-space dust with depth, soft focus and a backlight-dependent visibility field.
// No DOM nodes per particle and no separate animation loop.
export function createCinematicDust(scene, root) {
  const canvas = document.createElement('canvas');
  canvas.className = 'cinematic-dust';
  canvas.setAttribute('aria-hidden', 'true');
  scene.append(canvas);
  const ctx = canvas.getContext('2d');
  const grain = document.createElement('div');
  grain.className = 'cinematic-grain';
  grain.setAttribute('aria-hidden', 'true');
  scene.append(grain);
  let seed = 73519;
  const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const particles = Array.from({length: 160}, () => ({
    x: random(), y: random(), depth: random(), phase: random() * Math.PI * 2,
    speed: .25 + random() * .75, alpha: .3 + random() * .7,
  }));
  const softDot = document.createElement('canvas');
  softDot.width = softDot.height = 32;
  const dot = softDot.getContext('2d');
  const gradient = dot.createRadialGradient(16,16,0,16,16,16);
  gradient.addColorStop(0,'rgba(255,249,225,.85)');
  gradient.addColorStop(.35,'rgba(255,253,238,.95)');
  gradient.addColorStop(.65,'rgba(255,249,225,.3)');
  gradient.addColorStop(1,'rgba(255,249,225,0)');
  dot.fillStyle = gradient; dot.fillRect(0,0,32,32);
  const noise = document.createElement('canvas'); noise.width = noise.height = 192;
  const ng = noise.getContext('2d'), pixels = ng.createImageData(192,192);
  for(let i=0;i<pixels.data.length;i+=4){const value=Math.floor(random()*256);pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=value;pixels.data[i+3]=255;}
  ng.putImageData(pixels,0,0);grain.style.backgroundImage=`url(${noise.toDataURL()})`;
  let width=1,height=1,drift=0,previousTime=0,amount=1,grainAmount=.045;
  function resize(w,h){width=w;height=h;const ratio=Math.min(devicePixelRatio,1.5);canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);ctx.setTransform(ratio,0,0,ratio,0,0);}
  function render(time,wind,enabled,illuminated=true){
    const dt=Math.min(.15,Math.max(0,time-previousTime));previousTime=time;
    drift+=dt*(1+wind*.6);
    ctx.clearRect(0,0,width,height);
    grain.style.opacity=enabled?grainAmount:0;
    if(!enabled||!illuminated||amount===0)return;
    const lighting=root.dataset.mode;
    if(root.dataset.weather!=='sun'||lighting==='night')return;
    const lightX=parseFloat(root.style.getPropertyValue('--sun-x'))/100||.6;
    const lightY=parseFloat(root.style.getPropertyValue('--sun-y'))/100||.3;
    const count=width<700?90:160;
    for(let i=0;i<count;i++){
      const p=particles[i],near=p.depth>.9;
      const depthSpeed=.4+p.depth*1.5;
      const x=((p.x*width+drift*p.speed*depthSpeed*2+Math.sin(time*.09+p.phase)*9)%(width+40)+width+40)%(width+40)-20;
      const y=((p.y*height-drift*p.speed*depthSpeed*.55+Math.sin(time*.13+p.phase)*6)%(height+40)+height+40)%(height+40)-20;
      // Broad, fading pool below the sun: only occasional bright flecks, no glitter.
      const dx=(x/width-lightX)/.38,dy=(y/height-(lightY+.24))/.6;
      const backlight=Math.exp(-2*(dx*dx+dy*dy));
      const edge=Math.min(1,Math.max(0,x/25),Math.max(0,(width-x)/25),Math.max(0,y/25),Math.max(0,(height-y)/25));
      const opacity=(.12+backlight*1.6)*p.alpha*amount*edge;
      const diameter=near?7+p.depth*3:2.8+p.depth*2.5;
      ctx.globalAlpha=Math.min(1,opacity*(near?.55:1));
      ctx.drawImage(softDot,x-diameter/2,y-diameter/2,diameter,diameter);
    }
    ctx.globalAlpha=1;
  }
  return {resize,render,setAmount(value){amount=value;},setGrain(value){grainAmount=value/100;}};
}
