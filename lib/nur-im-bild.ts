"use client";

import { createContext, useContext, useEffect, useState } from "react";

/**
 * Set by <ExportOnly>: everything inside exists only for the exported image
 * and is hidden on the page.
 *
 * Heavy artwork in there (the logo is 13 kB of path data) does not have to be
 * in the server HTML — the image is taken on a click, long after hydration.
 * Measured 28.09.2026: a Kreis page carried the logo 14 times, 11 of them in
 * hidden image footers.
 */
export const NurImBild = createContext(false);

/**
 * False on the server and in the first client render inside an image-only
 * block, true right after mount (and always outside such a block). The
 * element stays in place, only its artwork follows after hydration — so the
 * exported image is identical.
 */
export function useBildInhaltBereit(): boolean {
  const imBild = useContext(NurImBild);
  const [bereit, setBereit] = useState(!imBild);
  useEffect(() => {
    if (!bereit) setBereit(true);
  }, [bereit]);
  return bereit;
}
