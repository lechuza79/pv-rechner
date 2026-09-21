(()=>{
 let mounted=false;
 const mount=()=>{
  const section=document.querySelector('#atlas-stories');
  if(!section||!section.querySelector('.v3-section-divider')||mounted)return;
  mounted=true;
  section.replaceChildren();
  const frame=document.createElement('iframe');
  const params=new URLSearchParams({city:'09679147',theme:'dark'});const story=new URLSearchParams(location.search).get('story');if(story)params.set('story',story);frame.src='/embed/story-preview?'+params;
  frame.title='Geschichten aus Höchberg';
  frame.style.cssText='display:block;width:100%;height:700px;border:0;background:transparent';
  section.append(frame);
  let modalOpen=false,closeTimer,lastHeight=700;
  const applyModal=(open)=>{
   if(open===modalOpen)return;modalOpen=open;
   if(open)section.style.minHeight=frame.getBoundingClientRect().height+'px';
   section.style.position=open?'relative':'';section.style.zIndex=open?'2147483647':'';
   const content=section.closest('.atlas-content');if(content)content.style.zIndex=open?'2147483647':'';
   frame.style.position=open?'fixed':'static';frame.style.inset=open?'0':'auto';
   frame.style.zIndex=open?'2147483647':'auto';frame.style.height=open?'100dvh':lastHeight+'px';
   document.body.style.overflow=open?'hidden':'';
   frame.style.backdropFilter=open?'blur(3px)':'';frame.style.webkitBackdropFilter=open?'blur(3px)':'';frame.style.background=open?'rgba(0,8,10,.48)':'transparent';
   if(!open)section.style.minHeight='';
  };
  window.addEventListener('message',event=>{
   if(event.origin!==location.origin||event.source!==frame.contentWindow||event.data?.type!=='story-preview-layout')return;
   lastHeight=Math.min(4000,Math.max(300,Number(event.data.height)||700));
   clearTimeout(closeTimer);
   if(event.data.modal===true)applyModal(true);
   else if(modalOpen)closeTimer=setTimeout(()=>applyModal(false),240);
   else frame.style.height=lastHeight+'px';
  });
 };
 new MutationObserver(mount).observe(document.documentElement,{childList:true,subtree:true});mount();
})();

// Keep permanent charts independent from the story reader and its modal state.
window.addEventListener('message',event=>{
 const frame=document.querySelector('.v3-permanent-charts iframe');
 if(!frame||event.origin!==location.origin||event.source!==frame.contentWindow||event.data?.type!=='municipal-data-layout')return;
 const height=Number(event.data.height);
 if(Number.isFinite(height)&&height>0)frame.style.height=Math.min(16000,Math.ceil(height)+4)+'px';
});
