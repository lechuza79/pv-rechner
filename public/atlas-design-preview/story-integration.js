(()=>{
 let mounted=false;
 const mount=()=>{
  const section=document.querySelector('#atlas-stories');
  if(!section||!section.querySelector('.v3-section-divider')||mounted)return;
  mounted=true;
  section.replaceChildren();
  const frame=document.createElement('iframe');
  frame.src='/embed/story-preview?city=09679147&theme=dark';
  frame.title='Geschichten aus Höchberg';
  frame.style.cssText='display:block;width:100%;height:700px;border:0;background:transparent';
  section.append(frame);
  window.addEventListener('message',event=>{
   if(event.origin!==location.origin||event.source!==frame.contentWindow||event.data?.type!=='story-preview-layout')return;
   const modal=event.data.modal===true;
   section.style.position=modal?'relative':'';section.style.zIndex=modal?'2147483647':'';
   const content=section.closest('.atlas-content');if(content)content.style.zIndex=modal?'2147483647':'';
   frame.style.position=modal?'fixed':'static';frame.style.inset=modal?'0':'auto';
   frame.style.zIndex=modal?'2147483647':'auto';frame.style.height=modal?'100dvh':Math.min(4000,Math.max(300,Number(event.data.height)||700))+'px';
   document.body.style.overflow=modal?'hidden':'';
  });
 };
 new MutationObserver(mount).observe(document.documentElement,{childList:true,subtree:true});mount();
})();
