"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import Modal from "../../../components/Modal";

// The full Wärmepumpen-Rechner is a heavy client flow — load it lazily and only
// once the modal is opened, so the guide page stays light. It's a self-contained
// component (no URL/storage coupling), rendered directly in our shared Modal
// (no iframe). Opened via the "#wp-rechner" hash so plain server-rendered links
// (sticky CTA, hero CTA) can trigger it without extra client wiring.
const Waermepumpe = dynamic(() => import("../waermepumpe-rechner/waermepumpe"), {
  ssr: false,
  loading: () => (
    <div style={{ padding: "48px 0", textAlign: "center", color: "var(--color-text-muted)", fontSize: 14 }}>
      Rechner wird geladen …
    </div>
  ),
});

const HASH = "#wp-rechner";

export default function WpRechnerModal() {
  const [open, setOpen] = useState(false);
  // Latch: once opened, keep the rechner mounted so its state survives a close
  // and the Modal's fade-out shows content (per the Modal convention).
  const [everOpened, setEverOpened] = useState(false);

  useEffect(() => {
    const sync = () => setOpen(window.location.hash === HASH);
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  useEffect(() => {
    if (open) setEverOpened(true);
  }, [open]);

  const close = () => {
    setOpen(false);
    if (window.location.hash === HASH) {
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  };

  return (
    <Modal open={open} onClose={close} title="Wärmepumpen-Rechner" ariaLabel="Wärmepumpen-Rechner" maxWidth={560}>
      {everOpened && <Waermepumpe embedded />}
    </Modal>
  );
}
