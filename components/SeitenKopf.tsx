"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import DesignHeader from "./DesignHeader";
import Header from "./Header";
import { IconUser } from "./Icons";
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
  const [href, text] = auth.status === "authed" ? ["/dashboard", "Mein Konto"] : ["/login", "Einloggen"];
  // On narrow phones the word gives way to the icon; the name stays for
  // screen readers, so the link never loses its purpose.
  return (
    <Link href={href} className="sc-kopf-konto" aria-label={text}>
      <IconUser size={16} />
      <span className="sc-kopf-konto-text">{text}</span>
    </Link>
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
