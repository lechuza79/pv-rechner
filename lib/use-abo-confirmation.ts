"use client";

import { useEffect, useState } from "react";
import { ABO_BESTAETIGT_PARAM } from "./abo-bestaetigt";

let confirmedPath: string | null = null;

/** Share the confirmation receipt across header and sticky actions. */
export function useAboConfirmation() {
  const [confirmed, setConfirmed] = useState(false);
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get(ABO_BESTAETIGT_PARAM) !== "1" && confirmedPath !== url.pathname) return;
    confirmedPath = url.pathname;
    setConfirmed(true);
    url.searchParams.delete(ABO_BESTAETIGT_PARAM);
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  }, []);
  return confirmed;
}
