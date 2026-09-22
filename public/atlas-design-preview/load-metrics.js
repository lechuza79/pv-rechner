// Local preview diagnostics; no analytics requests or user data collection.
(()=>{
 const root=document.documentElement,start=performance.now();let cls=0;
 addEventListener('error',event=>{root.dataset.previewError=event.error?.stack||event.message;});
 try{new PerformanceObserver(list=>{for(const entry of list.getEntries())if(!entry.hadRecentInput){cls+=entry.value;root.dataset.previewLastShift=JSON.stringify({value:entry.value,sources:entry.sources?.map(source=>({node:source.node?.className||source.node?.nodeName,from:source.previousRect.y,to:source.currentRect.y}))});}root.dataset.previewCls=cls.toFixed(4);}).observe({type:'layout-shift',buffered:true});}catch{}
 const observer=new MutationObserver(()=>{
  if(root.dataset.atlasBoot==='ready'&&!root.dataset.previewShellMs)root.dataset.previewShellMs=String(Math.round(performance.now()-start));
  if(document.querySelector('.scene')?.dataset.unifiedReady==='true'&&!root.dataset.previewSceneMs)root.dataset.previewSceneMs=String(Math.round(performance.now()-start));
 });observer.observe(root,{subtree:true,attributes:true,attributeFilter:['data-atlas-boot','data-unified-ready']});
 addEventListener('load',()=>{root.dataset.previewLoadMs=String(Math.round(performance.now()-start));});
 addEventListener('pagehide',()=>observer.disconnect(),{once:true});
})();
