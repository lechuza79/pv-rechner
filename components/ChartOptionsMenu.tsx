"use client";

import { useEffect, useLayoutEffect, useId, useRef, useState, type ReactNode } from "react";
import { v } from "../lib/theme";
import { IconCheck, IconCode, IconDownload, IconMore, IconCopy, IconVideo, IconMail, IconArrowRight, IconShare, IconRefresh, IconHelpCircle } from "./Icons";
import Modal from "./Modal";
import ContactForm from "./ContactForm";
import { isContactTopic, DEFAULT_CONTACT_TOPIC, type ContactTopic } from "../lib/contact-topics";
import styles from "./WidgetActionMenu.module.css";
import type { VideoRequestParams } from "../lib/video-export-client";
import WidgetVideoDialog, { type VideoMailOptions } from "./WidgetVideoDialog";
import { EXPORT_IGNORE_ATTR } from "../lib/export-markers";

type MenuRect = {top:number;bottom:number;left:number;right:number};

/** Fit the menu to the document viewport, independent of the card size. */
export function widgetMenuPosition({host,trigger,viewportWidth,viewportHeight,contentHeight,footer}:{host:MenuRect;trigger:MenuRect;widget?:MenuRect;viewportWidth:number;viewportHeight:number;contentHeight:number;footer:boolean}) {
  const gutter=12;
  const topBound=gutter;
  const bottomBound=viewportHeight-gutter;
  const leftBound=gutter;
  const rightBound=viewportWidth-gutter;
  const maxHeight=Math.max(0,bottomBound-topBound);
  const height=Math.min(contentHeight,maxHeight);
  const width=Math.min(280,Math.max(0,rightBound-leftBound));
  const preferredTop=footer?trigger.top-8-height:trigger.bottom+6;
  const top=Math.max(topBound,Math.min(preferredTop,bottomBound-height));
  const left=Math.max(leftBound,Math.min(trigger.right-width,rightBound-width));
  return {left:left-host.left,top:top-host.top,width,maxHeight:Math.max(0,bottomBound-top),scrollable:contentHeight>maxHeight};
}

/**
 * Compact options menu for a chart (top right of its card): Teilen, Download,
 * Einbetten — nothing else. The menu presentation of the same handlers the
 * prominent action bar (ChartActionBar) uses; it owns no export logic.
 *
 * Embedding is only offered as an action where a supported embed exists;
 * otherwise it leads to the contact form with the widget context.
 *
 * Keyboard: Enter/Space/ArrowDown open and focus the first entry; ArrowUp/Down,
 * Home/End move; Escape closes and returns focus to the button; Tab closes.
 * Pointer: a tap or click outside closes it.
 */
export default function ChartOptionsMenu({ label, onShare, onDownload, onForward, onRestart, animation, contactHref, designContactHref, onVideoRequest, videoParams, videoPeriod, videoPlace, loadVideoThumbnail, presentation = "menu", showDownload = true, help, busy = false }: {
  /** Chart name, for the accessible button label. */
  label: string;
  showDownload?: boolean;
  help?: ReactNode;
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
  animation?: {end:()=>Promise<void>;video?:()=>Promise<void>};
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
  const [contact, setContact] = useState<{ topic: ContactTopic; message: string } | null>(null);
  const openContact = (href: string) => {
    const params = new URL(href, "https://solar-check.io").searchParams;
    const topic = params.get("topic");
    close();
    setContact({ topic: isContactTopic(topic) ? topic : DEFAULT_CONTACT_TOPIC, message: params.get("message") ?? "" });
  };
  const [menuPosition,setMenuPosition] = useState<ReturnType<typeof widgetMenuPosition>>();
  const [copied, setCopied] = useState(false);
  const [copying, setCopying] = useState(false);
  const [status, setStatus] = useState("");
  const [helpOpen,setHelpOpen]=useState(false);
  const keyboardOpen=useRef(false);
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const items = () => [...(wrap.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];

  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => { if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", outside);
    const frame = keyboardOpen.current ? requestAnimationFrame(() => items()[0]?.focus({ preventScroll: true })) : 0;
    return () => { cancelAnimationFrame(frame); document.removeEventListener("pointerdown", outside); };
  }, [open,group]);

  useLayoutEffect(() => {
    if(!open||!wrap.current||!button.current)return;
    const host=wrap.current,trigger=button.current;
    const update=()=>{
      const menu=document.getElementById(menuId);
      if(menu&&!menu.matches(":popover-open"))menu.showPopover();
      const widget=host.closest<HTMLElement>('.sc-widget');
      setMenuPosition(widgetMenuPosition({host:{top:0,left:0,bottom:0,right:0},trigger:trigger.getBoundingClientRect(),widget:widget?.getBoundingClientRect(),viewportWidth:window.innerWidth,viewportHeight:window.innerHeight,contentHeight:(menu?.scrollHeight??0)+2,footer:presentation==='footer'}));
    };
    update();
    const observer=new ResizeObserver(update);
    observer.observe(host);observer.observe(trigger);
    const widget=host.closest<HTMLElement>('.sc-widget');
    if(widget)observer.observe(widget);
    const menu=document.getElementById(menuId);
    if(menu)observer.observe(menu);
    window.addEventListener('resize',update);
    window.addEventListener('scroll',update,true);
    return()=>{observer.disconnect();window.removeEventListener('resize',update);window.removeEventListener('scroll',update,true);};
  },[open,group,presentation,menuId]);

  const close = (refocus = true) => { setOpen(false); if (refocus) button.current?.focus({preventScroll:true}); };
  const run = (fn: () => void | Promise<void>, done?: string, keepOpen = false) => async () => {
    if (!keepOpen) close();
    try {
      await fn();
      if (done) setStatus(done);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Aktion fehlgeschlagen. Bitte erneut versuchen.");
    }
    window.setTimeout(() => setStatus(""), 2500);
  };
  const copyLink = async () => {
    setCopying(true);
    setStatus("");
    try { await onShare(); setCopied(true); }
    catch (error) { setStatus(error instanceof Error ? error.message : "Link konnte nicht kopiert werden."); }
    finally { setCopying(false); }
  };
  useEffect(() => {
    if(!copied)return;
    const timer=window.setTimeout(()=>setCopied(false),2500);
    return()=>window.clearTimeout(timer);
  }, [copied]);
  const onMenuKey = (e: React.KeyboardEvent) => {
    const list = items(), index = list.indexOf(document.activeElement as HTMLElement);
    if (e.key === "Escape") { e.preventDefault(); close(); }
    else if (e.key === "Tab") setOpen(false);
    else if (e.key === "ArrowDown") { e.preventDefault(); list[(index + 1) % list.length]?.focus(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); list[(index - 1 + list.length) % list.length]?.focus(); }
    else if (e.key === "Home") { e.preventDefault(); list[0]?.focus(); }
    else if (e.key === "End") { e.preventDefault(); list[list.length - 1]?.focus(); }
  };
  const onButtonKey = (e: React.KeyboardEvent) => { if(e.key === "Escape"){e.preventDefault();close();} else if (e.key === "ArrowDown") { e.preventDefault(); keyboardOpen.current=true; setOpen(true); } };

  const footer = presentation === "footer";
  const leadingIcon: React.CSSProperties = {gridColumn:1,gridRow:1,order:-1,justifySelf:"start",flexShrink:0};
  const contactIcon = {...leadingIcon,alignSelf:"start",marginTop:3};
  const contactAction = <span className={styles.contactAction}>Anfragen <IconArrowRight size={14}/></span>;
  const separator = <div role="separator" className={styles.separator}/>;

  return (
    <div ref={wrap} className="sc-chart-options" data-presentation={presentation} style={{ position: "relative", display: footer ? "block" : "inline-flex", width: footer ? "100%" : undefined }} {...{ [EXPORT_IGNORE_ATTR]: "" }}>
      {footer&&<div role="group" aria-label={`Aktionen für ${label}`} className={styles.actions}>
        {onRestart&&<button type="button" className={`${styles.action} ${styles.restart}`} aria-label="Animation neu starten" title="Neu starten" data-widget-action="restart" disabled={busy} onClick={run(onRestart)}><IconRefresh size={16}/></button>}
        <button type="button" className={styles.action} aria-label={copied?"Link kopiert":"Link kopieren"} title="Link kopieren" data-widget-action="copy_link" disabled={busy||copying} onClick={copyLink}>{copied?<IconCheck size={16}/>:<IconCopy size={16}/>}</button>
        {([{id:"embed",text:"Einbetten",Icon:IconCode},{id:"download",text:"Herunterladen",Icon:IconDownload},{id:"share",text:"Teilen",Icon:IconShare}] as const).filter(action=>action.id!=="download"||showDownload).map(({id,text,Icon})=><button key={id} type="button" className={`${styles.action} ${id==="share"?styles.shareAction:""}`} data-widget-action="options" aria-label={text} title={text} aria-haspopup="menu" aria-expanded={open&&group===id} aria-controls={open&&group===id?menuId:undefined} disabled={busy}
          onClick={event=>{keyboardOpen.current=event.detail===0;button.current=event.currentTarget;setGroup(id);setOpen(!open||group!==id);}}><Icon size={16}/><span className={id==="share"?styles.shareLabel:styles.actionLabel}>{text}</span></button>)}
      </div>}
      {!footer&&<button ref={button} data-widget-action="options" type="button" aria-haspopup="menu" aria-expanded={open} aria-controls={open ? menuId : undefined}
        aria-label={`Optionen für ${label}`} title="Optionen" onClick={event => {keyboardOpen.current=event.detail===0;setOpen(o => !o);}} onKeyDown={onButtonKey} disabled={busy}
        style={{ width: 32, height: 32, border: 0, background: "transparent", color: "inherit", display: "grid", placeItems: "center", padding: 0, cursor: "pointer" }}>
        <IconMore size={16} style={{ transform: "rotate(90deg)" }} />
      </button>}
      {open && (
        <div popover="manual" className={styles.menu} id={menuId} role="menu" aria-label={`Optionen für ${label}`} onKeyDown={onMenuKey}
          onMouseDown={event => {
            const item = (event.target as HTMLElement).closest<HTMLElement>('[role="menuitem"]');
            if (event.button !== 0 || !item || item.matches(":disabled")) return;
            // Native mouse focus can scroll the outer page of an iframe even
            // when the item is already visible. Keep focus without navigation.
            event.preventDefault();
            item.focus({ preventScroll: true });
          }}
          style={{ position: "fixed", margin:0, inset:"auto", left:menuPosition?.left,top:menuPosition?.top??"calc(100% + 6px)",right:menuPosition?undefined:0,zIndex:20,width:menuPosition?.width??280,maxWidth:"calc(100vw - 24px)",maxHeight:menuPosition?.maxHeight,overflowY:"auto" }}>
          {menuPosition?.scrollable&&<div className={styles.scrollHint}>Weitere Optionen durch Scrollen ↕</div>}
          {help&&<><button type="button" role="menuitem" tabIndex={-1} className={styles.item} onClick={()=>{close();setHelpOpen(true);}}><IconHelpCircle size={16} style={leadingIcon}/><span>Informationen zum Diagramm</span></button>{separator}</>}
          {(!footer||group==="share")&&<>
          <button type="button" role="menuitem" tabIndex={-1} data-widget-action="copy_link" disabled={busy || copying} className={styles.item} onClick={copyLink}>{copied ? <IconCheck size={16} style={leadingIcon}/> : <IconCopy size={16} style={leadingIcon}/>}<span aria-live="polite">{copied ? "Link kopiert" : copying ? "Link wird kopiert …" : "Link kopieren"}</span></button>
          {onForward&&<button type="button" role="menuitem" tabIndex={-1} data-widget-action="forward" disabled={busy} className={styles.item} onClick={run(onForward,typeof navigator!=="undefined"&&typeof navigator.share==="function"?undefined:"Link kopiert.", true)}><IconShare size={16} style={leadingIcon}/><span>Weiterleiten</span></button>}
          </>}
          {!footer&&showDownload&&separator}
          {showDownload&&(!footer||group==="download")&&<>
          <button type="button" role="menuitem" tabIndex={-1} data-widget-action="image" disabled={busy} className={styles.item} onClick={run(onDownload, "Bild wird heruntergeladen.")}><IconDownload size={16} style={leadingIcon}/><span>{animation?"Aktueller Stand als Bild":"Download"}</span></button>
          {animation&&<>
            <button type="button" role="menuitem" tabIndex={-1} data-widget-action="image_end" disabled={busy} className={styles.item} onClick={run(animation.end,"Endstand wird heruntergeladen.")}><IconDownload size={16} style={leadingIcon}/><span>Endstand als Bild</span></button>
            {onVideoRequest ? <button type="button" role="menuitem" tabIndex={-1} data-widget-action="video" className={styles.item} onClick={()=>{close();setVideoOpen(true);}}><IconVideo size={16} style={leadingIcon}/><span>Video herunterladen<small className={styles.secondary}>MP4 · Downloadlink per E-Mail</small></span></button> : animation.video ? <button type="button" role="menuitem" tabIndex={-1} data-widget-action="video" disabled={busy} className={styles.item} onClick={run(animation.video)}><IconVideo size={16} style={leadingIcon}/><span>Video herunterladen</span></button> : <button type="button" role="menuitem" tabIndex={-1} data-widget-action="video_contact" className={styles.item} onClick={()=>openContact(videoContactHref)}><IconVideo size={16} style={leadingIcon}/><span>Animation als Video anfragen</span></button>}
          </>}
          {designContactHref&&<>{separator}<button type="button" role="menuitem" tabIndex={-1} data-widget-action="design_contact" className={`${styles.item} ${styles.contactItem}`} onClick={()=>openContact(designContactHref)}><IconMail size={16} style={contactIcon}/><span>In Ihrem Design<small className={styles.secondary}>Ihr Logo, Ihre Farben.</small>{contactAction}</span></button></>}
          </>}
          {!footer&&separator}
          {(!footer||group==="embed")&&<>
          <button type="button" role="menuitem" tabIndex={-1} data-widget-action="embed_contact" className={`${styles.item} ${styles.contactItem}`} onClick={()=>openContact(contactHref)}><IconCode size={16} style={contactIcon}/><span>Einbetten{contactAction}</span></button>

          </>}
        </div>
      )}
      <Modal open={helpOpen} onClose={()=>setHelpOpen(false)} title={label}>{help}</Modal>
      <Modal open={contact !== null} onClose={() => { setContact(null); button.current?.focus({preventScroll:true}); }} title="Kontakt aufnehmen">
        {contact && <ContactForm initialTopic={contact.topic} initialMessage={contact.message} />}
      </Modal>
      {videoOpen && <WidgetVideoDialog open={videoOpen} onClose={()=>{setVideoOpen(false);button.current?.focus({preventScroll:true});}} label={label} videoParams={videoParams} period={videoPeriod} place={videoPlace} loadThumbnail={loadVideoThumbnail} onRequest={onVideoRequest} />}
      {status && <span role="status" aria-live="polite" style={{ position: footer ? "relative" : "absolute", display:"block", right: 0, top: footer ? undefined : "100%", zIndex: 21, minWidth: 180, padding: 10, borderRadius: 8, background: `var(--widget-surface, ${v("--color-bg-raised")})`, color: "inherit" }}>{status}</span>}
    </div>
  );
}
