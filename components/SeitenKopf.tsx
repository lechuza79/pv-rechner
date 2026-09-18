"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import DesignHeader from "./DesignHeader";
import Header from "./Header";
import { useAuth } from "../lib/auth";
import { headerContentGap } from "../lib/theme";

/**
 * Which header a page gets.
 *
 * The redesigned pages (NEON_PFADE) use the neutral design header OVER their
 * full-bleed hero; every other page keeps the existing header and its spacing
 * unchanged. The switch lives here, in one place — adopting the new header for
 * more pages is a line in the list, not an edit in each page.
 *
 * Decided by the path during server rendering too, so both variants arrive in
 * the HTML without a flash and the pages stay static.
 */
export const NEON_PFADE = ["/", "/pv-simulation"] as const;

export function istNeonPfad(pfad: string | null): boolean {
  return pfad !== null && (NEON_PFADE as readonly string[]).includes(pfad);
}

function KontoLink() {
  const auth = useAuth();
  if (auth.status === "loading") return null;
  return auth.status === "authed" ? (
    <Link href="/dashboard" className="sc-kopf-konto">Mein Konto</Link>
  ) : (
    <Link href="/login" className="sc-kopf-konto">Einloggen</Link>
  );
}

export default function SeitenKopf() {
  const pfad = usePathname();
  if (istNeonPfad(pfad)) {
    return (
      <div className="sc-neon-kopf">
        <DesignHeader />
        <KontoLink />
      </div>
    );
  }
  return (
    <div style={{ padding: `20px 16px ${headerContentGap}px` }}>
      <Header />
    </div>
  );
}
