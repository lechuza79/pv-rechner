import {useId,type CSSProperties} from 'react';
import styles from './WindMicroCompass.module.css';

/** Input direction names the meteorological origin; the particles show flow toward the opposite direction.
 * Use the same maxSpeedMs for all instances being compared.
 */
export function WindMicroCompass({speedMs,directionDeg,maxSpeedMs=20,size=112,showValue=true}:{speedMs:number|null;directionDeg:number|null;maxSpeedMs?:number;size?:number;showValue?:boolean}){
 const clipId=useId();
 const speedValid=speedMs!==null&&Number.isFinite(speedMs)&&speedMs>=0;
 const directionValid=directionDeg!==null&&Number.isFinite(directionDeg);
 if(!speedValid||!Number.isFinite(maxSpeedMs)||maxSpeedMs<=0)return <span role="status">Winddaten nicht verfügbar</span>;
 const calm=speedMs===0;
 const angle=((directionDeg??0)%360+360)%360*Math.PI/180;
 const flowAngle=angle+Math.PI;
 // Particle travel is proportional to wind speed; light air must remain slow.
 const duration=40/Math.max(.1,Math.min(speedMs,maxSpeedMs));
 const directions=['N','NO','O','SO','S','SW','W','NW'];
 const from=directionValid?directions[Math.round(angle/(Math.PI/4))%8]:null;
 const style:CSSProperties={fontFamily:'var(--font-text, sans-serif)',color:'var(--atlas-text, currentColor)'};
 return <div style={{...style,width:size,textAlign:'center'}}>
  <svg width={size} height={size} viewBox="0 0 112 112" role="img" aria-label={calm?'Windstille':from?`Wind aus ${from}, ${speedMs.toLocaleString('de-DE',{maximumFractionDigits:2})} Meter pro Sekunde`:'Windrichtung nicht verfügbar'}>
   {[25,48].map(r=><circle key={r} cx="56" cy="56" r={r} fill="none" stroke="currentColor" strokeOpacity=".16"/>)}
   <g aria-label="Norden"><path d="M56 0 L49 13 L56 10 L63 13 Z" fill="currentColor"/></g>
   <defs>
    <clipPath id={clipId}><circle cx="56" cy="56" r="47"/></clipPath>
    <linearGradient id={`${clipId}-trail`} x1="0" y1="0" x2="0" y2="1">
     <stop offset="0" stopColor="var(--atlas-action, currentColor)" stopOpacity=".95"/>
     <stop offset=".3" stopColor="var(--atlas-action, currentColor)" stopOpacity=".5"/>
     <stop offset="1" stopColor="var(--atlas-action, currentColor)" stopOpacity="0"/>
    </linearGradient>
   </defs>
   {(calm||directionValid)&&<g clipPath={`url(#${clipId})`} aria-hidden="true">
    <g transform={`rotate(${flowAngle*180/Math.PI} 56 56)`} data-wind-flow={(!calm&&directionValid)?'moving':'still'}>
     {Array.from({length:48},(_,i)=>{
      // Uneven lanes and phases avoid a marching row, including in reduced motion.
      const random=(seed:number)=>{
       let n=Math.imul(seed ^ 0x9e3779b9,0x21f0aaad);
       n=Math.imul(n ^ (n >>> 16),0x735a2d97);
       return ((n ^ (n >>> 15)) >>> 0)/4294967296;
      };
      const x=10+random(i+1)*92;
      const phase=random(i+101);
      const particleDuration=duration*(.85+random(i+201)*.3);
      const restY=36-phase*72;
      return <g key={i} transform={`translate(${x} 56)`}>
       <g className={!calm&&directionValid?styles.particle:undefined} style={{'--duration':`${particleDuration}s`,'--rest-y':`${restY}px`,animationDelay:`-${phase*particleDuration}s`,transform:calm?`translateY(${restY}px)`:undefined,opacity:calm?.35:undefined} as CSSProperties}>
        {calm ? <circle r=".65" fill="var(--atlas-action, currentColor)"/> :
         <rect x="-.55" y="0" width="1.1" height={12+(i%5)*1.5} rx=".55" fill={`url(#${clipId}-trail)`}/>}
       </g>
      </g>;
     })}
    </g>
   </g>}

  </svg>
  {showValue&&<><div><strong>{speedMs.toLocaleString('de-DE',{maximumFractionDigits:2})}</strong> <small>m/s</small></div>
  <small>{calm?'Windstille':from?`aus ${from}`:'Richtung fehlt'}</small></>}
 </div>;
}
