import {captureNodeToBlob} from './chart-export';

export const CHART_ANIMATION_EVENT = 'chart-export-animation';
export type ChartAnimationCommand = {mode:'pause'|'seek'|'restore'|'describe'|'restart';progress?:number;timeMs?:number;report?:(value:{durationMs:number})=>void};

export async function controlChartAnimation(node:HTMLElement, command:ChartAnimationCommand) {
  const targets=node.querySelectorAll('[data-chart-animation]');
  if(!targets.length)throw new Error('Die Animation ist noch nicht bereit.');
  targets.forEach(target=>target.dispatchEvent(new CustomEvent(CHART_ANIMATION_EVENT,{detail:command})));
  // Let React commit the requested state before cloning the card.
  await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
}

export function chartAnimationDuration(node:HTMLElement):number {
  const durations:number[]=[];
  node.querySelectorAll('[data-chart-animation]').forEach(target=>target.dispatchEvent(new CustomEvent(CHART_ANIMATION_EVENT,{detail:{mode:'describe',report:({durationMs}:{durationMs:number})=>durations.push(durationMs)}})));
  if(!durations.length||durations.some(value=>!Number.isFinite(value)||value<=0))throw new Error('Die Zeitachse der Animation ist noch nicht bereit.');
  return Math.max(...durations);
}

function download(blob:Blob, filename:string) {
  const url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download=filename;link.click();
  return {url,filename};
}

/** Encode the shared light card on a fixed timeline, independent of capture speed. */
export async function downloadChartVideo(node:HTMLElement, filename:string, onProgress:(value:number)=>void) {
  const {Output,Mp4OutputFormat,BufferTarget,CanvasSource,canEncodeVideo}=await import('mediabunny');
  if(!await canEncodeVideo('avc'))throw new Error('Dieser Browser kann kein MP4-Video (H.264) erstellen. Bitte einen Browser mit MP4-Aufnahme verwenden oder ein Standbild herunterladen.');
  const canvas=document.createElement('canvas'),context=canvas.getContext('2d');
  if(!context)throw new Error('Videoexport ist in diesem Browser nicht verfügbar.');
  const output=new Output({format:new Mp4OutputFormat({fastStart:'in-memory'}),target:new BufferTarget()});
  let source:InstanceType<typeof CanvasSource>|undefined;
  const fps=30,durationMs=chartAnimationDuration(node),frames=Math.ceil(durationMs/1000*fps);
  try {
    for(let index=0;index<frames;index++) {
      if(!node.isConnected||document.hidden)throw new Error('Videoexport unterbrochen. Bitte den Tab während der Erstellung geöffnet lassen.');
      await controlChartAnimation(node,{mode:'seek',timeMs:index*1000/fps});
      const blob=await captureNodeToBlob(node,1.5);
      const bitmap=await createImageBitmap(blob);
      try {
        if(!source){
          // H.264 requires even dimensions.
          canvas.width=Math.ceil(bitmap.width/2)*2;canvas.height=Math.ceil(bitmap.height/2)*2;
          source=new CanvasSource(canvas,{codec:'avc',bitrate:4_000_000});
          output.addVideoTrack(source,{frameRate:fps});
          await output.start();
        }
        context.fillStyle=getComputedStyle(node).getPropertyValue('--chart-export-background').trim()||'#fafbf8';
        context.fillRect(0,0,canvas.width,canvas.height);
        context.drawImage(bitmap,0,0,canvas.width,canvas.height);
        await source.add(index/fps,1/fps);
      } finally {bitmap.close();}
      onProgress(Math.min(99,Math.round((index+1)/frames*100)));
    }
    await output.finalize();
    onProgress(100);
    return download(new Blob([output.target.buffer!],{type:'video/mp4'}),`${filename}.mp4`);
  } catch(error) {
    await output.cancel();
    throw error;
  } finally {
    source?.close();
    // The owning overlay restores playback when it is dismissed.
  }
}
