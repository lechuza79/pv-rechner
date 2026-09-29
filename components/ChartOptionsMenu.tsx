"use client";

import { useEffect, useLayoutEffect, useId, useRef, useState } from "react";
import { v } from "../lib/theme";
import { IconCode, IconDownload, IconMore, IconCopy, IconVideo, IconHelpCircle, IconShare, IconRefresh } from "./Icons";
import styles from "./ChartOptionsMenu.module.css";
import type { VideoRequestParams } from "../lib/video-export-client";
import WidgetVideoDialog, { type VideoMailOptions } from "./WidgetVideoDialog";
import { EXPORT_IGNORE_ATTR } from "../lib/export-markers";

/**
 * Compact options menu for a chart (top right of its card): Teilen, Download,
 * Einbetten — nothing else. The menu presentation of the same handlers the
 * prominent action bar (ChartActionBar) uses; it owns no export logic.
 *
 * Embedding is only offered as an action where a supported embed exists;
 * otherwise the entry stays visible, disabled, with the reason, so nobody is
 * handed a code that does not work.
 *
 * Keyboard: Enter/Space/ArrowDown open and focus the first entry; ArrowUp/Down,
 * Home/End move; Escape closes and returns focus to the button; Tab closes.
 * Pointer: a tap or click outside closes it.
 */
export default function ChartOptionsMenu({ label, onShare, onDownload, onForward, onRestart, embed, animation, contactHref, designContactHref, onVideoRequest, videoParams, videoPeriod, videoPlace, loadVideoThumbnail, presentation = "menu", busy = false }: {
  /** Chart name, for the accessible button label. */
  label: string;
  /** Prefilled contact link supplied by the shared widget frame. */
  contactHref: string;
  designContactHref?: string;
  /** Resolves only after the server has accepted the confirmation-mail request. */
  onVideoRequest?: (email: string, options: VideoMailOptions) => Promise<void>;
  videoParams?: VideoRequestParams;
  videoPeriod?: string;
  videoPlace?: string;
  loadVideoThumbnail?: () => Promise<Blob | null>;
  presentation?: "menu" | "footer";
  onShare: () => void | Promise<void>;
  onDownload: () => void | Promise<void>;
  onForward?: () => void | Promise<void>;
  onRestart?: () => void | Promise<void>;
  embed: { onEmbed: () => void } | { unavailable: string };
  animation?: {end:()=>Promise<void>;video:()=>Promise<void>};
  busy?: boolean;
}) {
  // Preserve the shared frame's widget, location, state and source context.
  const videoRequest = new URL(contactHref, "https://solar-check.io");
  videoRequest.searchParams.set("topic", "Widget als Video");
  const contactMessage = videoRequest.searchParams.get("message") ?? `Widget: ${label}`;
  videoRequest.searchParams.set("message", contactMessage
    .replace(/^Ich habe eine Frage zum Einbetten dieses Widgets:/, "Ich möchte dieses Diagramm als MP4-Video anfragen:")
    .replace(/Meine Frage:\n?$/, "Gewünschtes Format und Verwendungszweck:\n"));
  const videoContactHref = `${videoRequest.pathname}${videoRequest.search}`;
  const [group,setGroup] = useState<"embed"|"download"|"share">("embed");
  const [open, setOpen] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const [anchor,setAnchor] = useState({left:12,bottom:60,width:280});
  const [menuMaxHeight,setMenuMaxHeight]=useState<number>();
  const [status, setStatus] = useState("");
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const items = () => [...(wrap.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];

  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => { if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", outside);
    requestAnimationFrame(() => items()[0]?.focus());
    return () => document.removeEventListener("pointerdown", outside);
  }, [open,group]);

  useLayoutEffect(() => {
    if(!open||!wrap.current||!button.current)return;
    const host=wrap.current,trigger=button.current;
    const update=()=>{
      const box=host.getBoundingClientRect(),target=trigger.getBoundingClientRect();
      setMenuMaxHeight(Math.max(120,presentation==="footer"?target.top-20:window.innerHeight-target.bottom-20));
      if(presentation!=="footer")return;
      const width=Math.min(280,Math.max(0,box.width-24));
      const left=Math.max(12,Math.min(target.right-box.left-width,box.width-width-12));
      setAnchor({left,bottom:box.bottom-target.top+8,width});
    };
    update();
    const observer=new ResizeObserver(update);
    observer.observe(host);observer.observe(trigger);
    window.addEventListener('resize',update);
    return()=>{observer.disconnect();window.removeEventListener('resize',update);};
  },[open,group,presentation]);

  const close = (refocus = true) => { setOpen(false); if (refocus) button.current?.focus(); };
  const run = (fn: () => void | Promise<void>, done?: string) => async () => {
    close();
    try {
      await fn();
      if (done) setStatus(done);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Aktion fehlgeschlagen. Bitte erneut versuchen.");
    }
    window.setTimeout(() => setStatus(""), 2500);
  };
  const onMenuKey = (e: React.KeyboardEvent) => {
    const list = items(), index = list.indexOf(document.activeElement as HTMLElement);
    if (e.key === "Escape") { e.preventDefault(); close(); }
    else if (e.key === "Tab") setOpen(false);
    else if (e.key === "ArrowDown") { e.preventDefault(); list[(index + 1) % list.length]?.focus(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); list[(index - 1 + list.length) % list.length]?.focus(); }
    else if (e.key === "Home") { e.preventDefault(); list[0]?.focus(); }
    else if (e.key === "End") { e.preventDefault(); list[list.length - 1]?.focus(); }
  };
  const onButtonKey = (e: React.KeyboardEvent) => { if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); } };

  const footer = presentation === "footer";
  const item: React.CSSProperties = { display: "grid", gridTemplateColumns: "18px minmax(0, 1fr)", alignItems: "center", gap: 10, textDecoration: "none", width: "100%", minHeight: 44, padding: "8px 14px", border: 0, background: "transparent", color: `var(--widget-ink, ${v("--color-text-primary")})`, font: "inherit", fontSize: v("--font-size-body"), textAlign: "left", lineHeight: 1.45, boxSizing: "border-box", whiteSpace: "normal", cursor: "pointer" };
  const leadingIcon: React.CSSProperties = {gridColumn:1,gridRow:1,order:-1,justifySelf:"start",flexShrink:0};
  const separator = <div role="separator" style={{height:0,margin:"6px 14px",borderTop:"1px solid color-mix(in srgb, var(--widget-muted, currentColor) 35%, transparent)"}}/>;
  const unavailable = "unavailable" in embed ? embed.unavailable : null;

  return (
    <div ref={wrap} className="sc-chart-options" data-presentation={presentation} style={{ position: "relative", display: footer ? "block" : "inline-flex", width: footer ? "100%" : undefined }} {...{ [EXPORT_IGNORE_ATTR]: "" }}>
      {footer&&<div role="group" aria-label={`Aktionen für ${label}`} style={{display:"flex",flexWrap:"wrap",gap:8,padding:12,borderRadius:16,background:"color-mix(in srgb, var(--widget-ink) 5%, transparent)"}}>
        {onRestart&&<button type="button" aria-label="Animation neu starten" title="Neu starten" data-widget-action="restart" disabled={busy} onClick={run(onRestart)} style={{display:"grid",placeItems:"center",width:44,height:44,flexShrink:0,color:"var(--widget-ink)",background:"var(--widget-surface)",border:"1px solid color-mix(in srgb,var(--widget-ink) 25%,transparent)",borderRadius:12,boxShadow:"0 2px 4px rgb(0 0 0 / .08)",cursor:"pointer"}}><IconRefresh size={16}/></button>}
        <div style={{display:"flex",flexWrap:"wrap",justifyContent:"flex-end",gap:8,marginLeft:"auto",flex:1}}>
        {([{id:"embed",text:"Einbetten",Icon:IconCode},{id:"download",text:"Herunterladen",Icon:IconDownload},{id:"share",text:"Teilen",Icon:IconShare}] as const).map(({id,text,Icon})=><button key={id} type="button" data-widget-action="options" aria-haspopup="menu" aria-expanded={open&&group===id} aria-controls={open&&group===id?menuId:undefined} disabled={busy}
          onClick={event=>{button.current=event.currentTarget;setGroup(id);setOpen(!open||group!==id);}}
          style={{display:"inline-flex",alignItems:"center",justifyContent:"center",gap:8,minHeight:44,padding:"10px 12px",font:"inherit",fontSize:v("--font-size-body"),color:"var(--widget-ink)",background:"var(--widget-surface)",border:"1px solid color-mix(in srgb,var(--widget-ink) 25%,transparent)",borderRadius:12,boxShadow:"0 2px 4px rgb(0 0 0 / .08)",cursor:"pointer"}}><Icon size={16} style={{opacity:.6,flexShrink:0}}/>{text}</button>)}
        </div>
      </div>}
      {!footer&&<button ref={button} data-widget-action="options" type="button" aria-haspopup="menu" aria-expanded={open} aria-controls={open ? menuId : undefined}
        aria-label={`Optionen für ${label}`} title="Optionen" onClick={() => setOpen(o => !o)} onKeyDown={onButtonKey} disabled={busy}
        style={{ width: 32, height: 32, border: 0, background: "transparent", color: "inherit", display: "grid", placeItems: "center", padding: 0, cursor: "pointer" }}>
        <IconMore size={16} style={{ transform: "rotate(90deg)" }} />
      </button>}
      {open && (
        <div className={styles.menu} id={menuId} role="menu" aria-label={`Optionen für ${label}`} onKeyDown={onMenuKey}
          style={{ position: "absolute", ...(footer ? {left:anchor.left,bottom:anchor.bottom} : {top:"calc(100% + 6px)",right:0}), zIndex:20,width:footer?anchor.width:280,maxWidth:"calc(100vw - 48px)",maxHeight:menuMaxHeight,overflowY:"auto",boxSizing:"border-box",padding:"6px 0",borderRadius:12,background:`var(--widget-surface, ${v("--color-bg-raised")})`,border:"1px solid var(--widget-muted)",boxShadow:"0 12px 32px #0004" }}>
          {(!footer||group==="share")&&<>
          <button type="button" role="menuitem" tabIndex={-1} data-widget-action="copy_link" disabled={busy} style={item} onClick={run(onShare, "Link kopiert.")}><IconCopy size={16} style={leadingIcon}/><span>Link kopieren</span></button>
          {onForward&&<button type="button" role="menuitem" tabIndex={-1} data-widget-action="forward" disabled={busy} style={item} onClick={run(onForward,typeof navigator!=="undefined"&&typeof navigator.share==="function"?undefined:"Link kopiert.")}><IconShare size={16} style={leadingIcon}/><span>Weiterleiten</span></button>}
          </>}
          {!footer&&separator}
          {(!footer||group==="download")&&<>
          <button type="button" role="menuitem" tabIndex={-1} data-widget-action="image" disabled={busy} style={item} onClick={run(onDownload, "Bild wird heruntergeladen.")}><IconDownload size={16} style={leadingIcon}/><span>{animation?"Aktueller Stand als Bild":"Download"}</span></button>
          {animation&&<>
            <button type="button" role="menuitem" tabIndex={-1} data-widget-action="image_end" disabled={busy} style={item} onClick={run(animation.end,"Endstand wird heruntergeladen.")}><IconDownload size={16} style={leadingIcon}/><span>Endstand als Bild</span></button>
            {onVideoRequest ? <button type="button" role="menuitem" tabIndex={-1} data-widget-action="video" style={item} onClick={()=>{close();setVideoOpen(true);}}><IconVideo size={16} style={leadingIcon}/><span>Video herunterladen<small style={{display:"block",fontSize:v("--font-size-small"),color:"var(--widget-muted)",marginTop:2}}>MP4 · Downloadlink per E-Mail</small></span></button> : <a role="menuitem" tabIndex={-1} data-widget-action="video_contact" href={videoContactHref} target="_top" style={item} onClick={()=>close(false)}><IconVideo size={16} style={leadingIcon}/><span>Animation als Video anfragen</span></a>}
          </>}
          {designContactHref&&<>{separator}<a role="menuitem" tabIndex={-1} data-widget-action="design_contact" href={designContactHref} target="_top" style={item} onClick={()=>close(false)}><IconHelpCircle size={16} style={leadingIcon}/><span>In Ihrem Design<small style={{display:"block",fontSize:v("--font-size-small"),color:"var(--widget-muted)",marginTop:2}}>Mit Ihrem Logo und Ihren Farben.</small><span style={{display:"block",marginTop:4,textDecoration:"underline",textUnderlineOffset:3}}>Anfragen →</span></span></a></>}
          </>}
          {!footer&&separator}
          {(!footer||group==="embed")&&<>
          {unavailable
            ? <button type="button" role="menuitem" tabIndex={-1} aria-disabled="true" style={{ ...item, cursor: "default", alignItems: "flex-start", opacity: .75 }} onClick={e => e.preventDefault()}>
                <IconCode size={16} style={leadingIcon}/><span>Einbetten<small style={{ display: "block", fontSize: v("--font-size-small"), color: `var(--widget-muted, ${v("--color-text-muted")})`, marginTop: 2 }}>{unavailable}</small></span>
              </button>
            : <button type="button" role="menuitem" tabIndex={-1} data-widget-action="embed" disabled={busy} style={item} onClick={run((embed as { onEmbed: () => void }).onEmbed)}><IconCode size={16} style={leadingIcon}/><span>Einbetten</span></button>}
          <a role="menuitem" tabIndex={-1} data-widget-action="embed_contact" href={contactHref} target="_top" style={{...item,fontSize:v("--font-size-small")}} onClick={()=>close(false)}><IconHelpCircle size={16} style={leadingIcon}/><span>Fragen zum Einbetten? Kontakt</span></a>
          </>}
        </div>
      )}
      {videoOpen && <WidgetVideoDialog open={videoOpen} onClose={()=>{setVideoOpen(false);button.current?.focus();}} label={label} videoParams={videoParams} period={videoPeriod} place={videoPlace} loadThumbnail={loadVideoThumbnail} onRequest={onVideoRequest} />}
      {status && <span role="status" aria-live="polite" style={{ position: footer ? "relative" : "absolute", display:"block", right: 0, top: footer ? undefined : "100%", zIndex: 21, minWidth: 180, padding: 10, borderRadius: 8, background: `var(--widget-surface, ${v("--color-bg-raised")})`, color: "inherit" }}>{status}</span>}
    </div>
  );
}
