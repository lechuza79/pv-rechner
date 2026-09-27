import {captureNodeToBlob} from './chart-export';
import {videoFormat} from './race-video';

export const CHART_ANIMATION_EVENT = 'chart-export-animation';
export type ChartAnimationCommand = {mode:'pause'|'seek'|'restore';progress?:number};

export async function controlChartAnimation(node:HTMLElement, command:ChartAnimationCommand) {
  const targets=node.querySelectorAll('[data-chart-animation]');
  if(!targets.length)throw new Error('Die Animation ist noch nicht bereit.');
  targets.forEach(target=>target.dispatchEvent(new CustomEvent(CHART_ANIMATION_EVENT,{detail:command})));
  // Let React commit the requested state before cloning the card.
  await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
}

function download(blob:Blob, filename:string) {
  const url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download=filename;link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

/** Capture the same light card, including provenance, without screen-recording permissions. */
export async function downloadChartVideo(node:HTMLElement, filename:string, onProgress:(value:number)=>void) {
  const format=videoFormat();
  if(!format)throw new Error('Dieser Browser unterstützt keinen Videoexport. Bitte ein Standbild herunterladen.');
  const canvas=document.createElement('canvas'),context=canvas.getContext('2d');
  if(!context)throw new Error('Videoexport ist in diesem Browser nicht verfügbar.');
  let recorder:MediaRecorder|undefined,stream:MediaStream|undefined;
  const chunks:Blob[]=[];
  try {
    // Sixty samples retain the actual chart renderer and keep export work bounded.
    for(let index=0;index<60;index++) {
      if(!node.isConnected||document.hidden)throw new Error('Videoexport unterbrochen. Bitte den Tab während der Aufnahme geöffnet lassen.');
      await controlChartAnimation(node,{mode:'seek',progress:index/59});
      const blob=await captureNodeToBlob(node,1.5);
      const bitmap=await createImageBitmap(blob);
      if(!recorder){
        canvas.width=bitmap.width;canvas.height=bitmap.height;
        stream=canvas.captureStream(30);
        recorder=new MediaRecorder(stream,{mimeType:format.mime,videoBitsPerSecond:4_000_000});
        recorder.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};
      }
      context.fillStyle=getComputedStyle(node).getPropertyValue('--chart-export-background').trim()||'#fafbf8';
      context.fillRect(0,0,canvas.width,canvas.height);
      context.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
      if(recorder.state==='inactive')recorder.start(250);
      onProgress(Math.round((index+1)/60*100));
      await new Promise(resolve=>setTimeout(resolve,120));
    }
    await new Promise(resolve=>setTimeout(resolve,800));
    const result=await new Promise<Blob>((resolve,reject)=>{
      recorder!.onstop=()=>resolve(new Blob(chunks,{type:format.mime}));
      recorder!.onerror=()=>reject(new Error('Video konnte nicht gespeichert werden.'));
      recorder!.stop();
    });
    download(result,`${filename}.${format.ext}`);
  } finally {
    if(recorder?.state==='recording')recorder.stop();
    stream?.getTracks().forEach(track=>track.stop());
    await controlChartAnimation(node,{mode:'restore'});
  }
}
