"use client";

import { useEffect, useId, useRef, useState } from "react";
import Modal, { ModalSticky } from "./Modal";
import { v } from "../lib/theme";
import { videoDirectAccess, requestWidgetVideoAsOperator, pollWidgetVideo, VideoRequestError, type VideoRequestParams } from "../lib/video-export-client";
import { IconVideo } from "./Icons";
import { VIDEO_ABO_EINWILLIGUNG } from "../lib/abo-einwilligung";

export type VideoMailOptions = { subscribe: boolean; consentVersion?: string };
import styles from "./WidgetVideoDialog.module.css";

/** Shared request UI; the server adapter owns validation, entitlement and delivery. */
export default function WidgetVideoDialog({ open, onClose, label, period, place, loadThumbnail, videoParams, onRequest }: {
  open: boolean;
  onClose: () => void;
  label: string;
  period?: string;
  place?: string;
  videoParams?: VideoRequestParams;
  loadThumbnail?: () => Promise<Blob | null>;
  onRequest?: (email: string, options: VideoMailOptions) => Promise<void>;
}) {
  const id = useId();
  const [direct, setDirect] = useState<boolean | null>(videoParams ? null : false);
  const [progress, setProgress] = useState<number | null>(null);
  const [notify, setNotify] = useState(false);
  const [directStatus, setDirectStatus] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const polling = useRef<AbortController | null>(null);
  useEffect(() => {
    let active = true;
    if (videoParams) videoDirectAccess().then(value => { if (active) setDirect(value); });
    return () => { active = false; polling.current?.abort(); };
  }, [videoParams?.widget, videoParams?.ags]);
  async function startDirect() {
    if (!videoParams || directStatus) return;
    setError(""); setDirectStatus("Video wird vorbereitet …");
    const controller = new AbortController(); polling.current = controller;
    try {
      const jobId = await requestWidgetVideoAsOperator(videoParams);
      const result = await pollWidgetVideo(jobId, {signal:controller.signal, onStatus:job => { setProgress(job.status === "rendering" ? job.progress ?? 0 : null); setDirectStatus(job.status === "rendering" ? "Video wird erstellt …" : "Video wartet auf die Erstellung …"); }});
      if (result.status !== "done" || !result.downloadUrl) throw new Error("render failed");
      setDownloadUrl(result.downloadUrl); setDirectStatus(null);
    } catch (e) {
      if (controller.signal.aborted) return;
      setDirectStatus(null); setError(e instanceof VideoRequestError ? e.message : "Das Video konnte gerade nicht erstellt werden. Bitte versuchen Sie es erneut.");
    }
  }
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  useEffect(() => {
    if (!open || !loadThumbnail) return;
    let cancelled = false;
    let url: string | undefined;
    setThumbnail(null);
    loadThumbnail().then(blob => {
      if (cancelled || !blob) return;
      url = URL.createObjectURL(blob);
      setThumbnail(url);
    }).catch(() => { /* The preview must never block the request form. */ });
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url); };
  }, [open, loadThumbnail]);
  const [subscribe, setSubscribe] = useState(false);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!onRequest || state !== "idle") return;
    setError("");
    setState("sending");
    try {
      await onRequest(email.trim(), { subscribe, ...(subscribe ? {consentVersion: VIDEO_ABO_EINWILLIGUNG.version} : {}) });
      setState("sent");
    } catch (e) {
      setError(e instanceof VideoRequestError ? e.message : "Das hat gerade nicht geklappt. Bitte versuchen Sie es erneut.");
      setState("idle");
    }
  }

  return <Modal open={open} onClose={onClose} title="Video herunterladen" maxWidth={520} className={styles.dialog}>
    <div className={styles.content}>
      <div className={styles.context}><div className={styles.thumbnail}>{thumbnail ? <img src={thumbnail} alt={`Vorschau: ${label}`} /> : <IconVideo size={24} aria-hidden="true" />}</div><div>{label}<span>{period ? `${period} · MP4-Video` : "MP4-Video"}</span></div></div>
      {direct === null ? <p role="status" aria-live="polite">Wird geladen …</p> : direct ? <div>
        {!directStatus && <p>{downloadUrl ? "Ihr Video ist fertig." : "Erstellen Sie das Video als MP4. Sobald es fertig ist, können Sie es hier herunterladen."}</p>}
        {directStatus && <>
          <div className={styles.progressHeader}><span>{progress === null ? "In Vorbereitung" : "Video wird erstellt"}</span>{progress !== null && <span>{progress} %</span>}</div>
          <progress className={styles.progress} max={100} value={progress ?? undefined} aria-label="Fortschritt der Videoerstellung" />
          <p className={styles.closeHint}>Sie können dieses Fenster schließen. Das Video wird im Hintergrund fertiggestellt.</p>
          {onRequest && (state === "sent" ? <p role="status">Bitte bestätigen Sie den Link in Ihrer E-Mail. Danach erhalten Sie den Downloadlink, sobald das Video fertig ist.</p> : notify ? <form onSubmit={submit}>
            <label htmlFor={id}>E-Mail-Adresse</label>
            <input id={id} type="email" autoComplete="email" required maxLength={254} placeholder="name@beispiel.de" value={email} onChange={event => setEmail(event.target.value)} disabled={state === "sending"} />
            <p className={styles.closeHint}>Einmal bestätigen, dann kommt der Downloadlink per E-Mail.</p>
            <button className={styles.secondary} type="submit" disabled={state === "sending"}>{state === "sending" ? "Wird gesendet …" : "Benachrichtigung anfordern"}</button>
            <p className={styles.note}><a href="/datenschutz" target="_top">Datenschutz</a></p>
          </form> : <button type="button" className={styles.secondary} onClick={() => setNotify(true)}>Per E-Mail benachrichtigen</button>)}
        </>}
        {error && <p role="alert">{error}</p>}
        <ModalSticky>{downloadUrl ? <a className={styles.submit} href={downloadUrl} download>Video herunterladen</a> : directStatus ? <button className={styles.submit} onClick={onClose}>Fenster schließen</button> : <button className={styles.submit} onClick={startDirect}>Video erstellen</button>}</ModalSticky>
      </div> : state === "sent" ? <div role="status">
        <h3>Bitte bestätigen Sie Ihre E-Mail-Adresse</h3>
        <p>Öffnen Sie den Bestätigungslink in Ihrem Postfach. Sobald Ihr Video fertig ist, erhalten Sie eine weitere Mail mit dem Downloadlink.</p>
      </div> : <form onSubmit={submit}>
        <p>Sie erhalten einen Bestätigungslink per E-Mail. Nach Ihrem Klick erstellen wir das Video und schicken Ihnen den Downloadlink. Sie können die Seite danach schließen.</p>
        <label htmlFor={id}>E-Mail-Adresse</label>
        <input id={id} type="email" autoComplete="email" required maxLength={254} placeholder="name@beispiel.de" value={email} onChange={event => setEmail(event.target.value)} disabled={state === "sending"} aria-describedby={`${id}-privacy`} />
        {place && <div className={styles.subscription}>
          <label className={styles.check}><input type="checkbox" checked={subscribe} disabled={state === "sending"} onChange={event => setSubscribe(event.target.checked)} /><span>{VIDEO_ABO_EINWILLIGUNG.gemeinde.replace("{Ort}", place)} <small>{VIDEO_ABO_EINWILLIGUNG.foerderung}</small></span></label>
        </div>}
        {error && <p role="alert" style={{color:v("--color-text-primary")}}>{error}</p>}
        <ModalSticky><button className={styles.submit} type="submit" disabled={!onRequest || state === "sending"}>{state === "sending" ? "Wird gesendet …" : "Bestätigungslink senden"}</button><p id={`${id}-privacy`} className={styles.note}><a href="/datenschutz" target="_top">Datenschutz</a></p></ModalSticky>
      </form>}
    </div>
  </Modal>;
}

const confirmationCopy: Record<string, { title: string; text: string }> = {
  pending: { title: "E-Mail-Adresse bestätigen", text: "Bestätigen Sie Ihre Videoanfrage. Anschließend erhalten Sie den Downloadlink per E-Mail." },
  queued: { title: "Video wird erstellt", text: "Der Downloadlink kommt per E-Mail, sobald Ihr Video fertig ist. Sie können dieses Fenster schließen." },
  ready: { title: "Ihr Video ist fertig", text: "Der Downloadlink ist unterwegs in Ihr Postfach." },
  already: { title: "Bereits bestätigt", text: "Sie erhalten den Downloadlink per E-Mail, sobald Ihr Video fertig ist." },
  expired: { title: "Link abgelaufen", text: "Bitte fordern Sie das Video im Optionsmenü des Widgets erneut an." },
  invalid: { title: "Link ungültig", text: "Bitte öffnen Sie den vollständigen Link aus Ihrer E-Mail oder fordern Sie das Video erneut an." },
  capacity: { title: "Gerade ausgelastet", text: "Bitte versuchen Sie es später erneut." },
  unavailable: { title: "Gerade nicht verfügbar", text: "Bitte versuchen Sie es erneut. Ihre Anfrage wurde noch nicht bestätigt." },
};

/** Shared entry point for emailed links on both site and embed surfaces. */
export function WidgetVideoConfirmation() {
  const [token, setToken] = useState("");
  const [context, setContext] = useState<{place?: string; period?: string; outcome: string} | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const read = () => {
      const value = new URLSearchParams(window.location.hash.slice(1)).get("video-confirm");
      if (!value) return;
      setToken(value);
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      fetch(`/api/video-export/bestaetigen?view=json&t=${encodeURIComponent(value)}`, { cache: "no-store", referrerPolicy: "no-referrer" })
        .then(res => res.json()).then(setContext).catch(() => setContext({outcome:"unavailable"}));
    };
    read(); window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  if (!token) return null;
  const outcome = context?.outcome ?? "loading";
  const copy = confirmationCopy[outcome] ?? { title: "Video herunterladen", text: "Wird geladen …" };
  async function confirm() {
    if (busy) return;
    setBusy(true);
    const form = new FormData(); form.set("t", token);
    try {
      const response = await fetch("/api/video-export/bestaetigen", {method:"POST", body:form});
      const result = await response.json();
      setContext(previous => ({...previous, outcome:result.outcome ?? "unavailable"}));
    } catch { setContext(previous => ({...previous, outcome:"unavailable"})); }
    finally { setBusy(false); }
  }
  return <Modal open onClose={() => setToken("")} title={copy.title} maxWidth={520} className={styles.dialog}>
    <div className={styles.content}>
      {context?.place && <div className={styles.context}><IconVideo size={24} aria-hidden="true" /><div>Solarerzeugung im Tagesverlauf in {context.place}<span>{context.period && new Date(`${context.period}-01T12:00:00Z`).toLocaleDateString("de-DE", {month:"long",year:"numeric"})} · MP4-Video</span></div></div>}
      <p role="status">{copy.text}</p>
      <ModalSticky>{["pending","unavailable","capacity"].includes(outcome) ? <button className={styles.submit} disabled={busy} onClick={confirm}>{busy ? "Wird bestätigt …" : "Video erstellen"}</button> : <button className={styles.submit} onClick={() => setToken("")}>Schließen</button>}</ModalSticky>
    </div>
  </Modal>;
}
