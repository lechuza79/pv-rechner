"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Logo from "./Logo";
import { useAuth, signOut } from "../lib/auth";
import { ratgeberBySlug } from "../lib/ratgeber";
import { navigationContent } from "../public/shared-nav/nav-content.js";
import { mountGlobalNav } from "../public/shared-nav/nav.js";
import "../public/shared-nav/nav.css";

/** Keep the same menu on React pages and the standalone homepage. */
export default function SharedSiteHeader() {
  const header = useRef<HTMLElement>(null);
  const pathname = usePathname();
  const auth = useAuth();

  useEffect(() => {
    const node = header.current;
    if (!node) return;
    const cleanup = mountGlobalNav(node, { active: ratgeberBySlug(pathname) ? "ratgeber" : "" });
    if (auth.status === "authed") {
      node.querySelectorAll<HTMLAnchorElement>(".sc-nav-login").forEach(link => {
        if (!link.parentElement?.matches("header")) link.textContent = "Mein Konto";
        link.setAttribute("aria-label", "Mein Konto");
        link.href = "/dashboard";
      });
      const logout = document.createElement("button");
      logout.type = "button";
      logout.className = "sc-nav-signout";
      logout.textContent = "Abmelden";
      logout.onclick = async () => {
        logout.disabled = true;
        try { await signOut(); window.location.assign("/"); }
        catch { logout.disabled = false; logout.textContent = "Erneut abmelden"; }
      };
      node.querySelector(".sc-global-nav")?.append(logout);
    }
    return cleanup;
  }, [pathname, auth.status]);

  return <header ref={header} className="site-header sc-react-header">
    <Link className="brand" href="/" aria-label="Solar Check – Startseite"><Logo width={166} /></Link>
    <details className="sc-react-fallback">
      <summary>Menü</summary>
      <div dangerouslySetInnerHTML={{ __html: navigationContent() }} />
      <Link href="/login">Login</Link>
    </details>
  </header>;
}
