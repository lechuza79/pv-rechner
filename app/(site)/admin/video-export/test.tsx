"use client";

import { useState } from "react";
import { pollWidgetVideo, requestWidgetVideoAsOperator, type VideoJob } from "../../../../lib/video-export-client";

export default function VideoExportTest() {
  const [period, setPeriod] = useState("2026-08");
  const [job, setJob] = useState<VideoJob | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function start() {
    setBusy(true); setError(""); setJob(null);
    try {
      const id = await requestWidgetVideoAsOperator({ widget: "gemeinde-solar-monat", ags: "06440016", period });
      setJob(await pollWidgetVideo(id, { onStatus: setJob }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ padding: 16, maxWidth: 520 }}>
      <p>Solarerzeugung im Tagesverlauf · Nidda</p>
      <label>Monat (JJJJ-MM) <input value={period} onChange={(e) => setPeriod(e.target.value)} /></label>{" "}
      <button type="button" onClick={start} disabled={busy}>Video erstellen</button>
      {job && <p role="status">Status: {job.status}{job.error ? ` (${job.error})` : ""}</p>}
      {job?.downloadUrl && <p><a href={job.downloadUrl}>MP4 herunterladen</a></p>}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
