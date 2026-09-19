"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Logo from "./Logo";
import { useAuth, useIsAdmin, signOut } from "../lib/auth";
import { ratgeberBySlug } from "../lib/ratgeber";
import { navigationContent } from "../public/shared-nav/nav-content.js";
import { mountGlobalNav } from "../public/shared-nav/nav.js";
import "../public/shared-nav/nav.css";

/** Keep the same menu on React pages and the standalone homepage. */
export default function SharedSiteHeader() {
  const header = useRef<HTMLElement>(null);
  const pathname = usePathname();
  const auth = useAuth();
  const isAdmin = useIsAdmin(auth.status === "authed" ? auth.user.id : null);

  // Build the menu once per page, not on every auth change: each mount builds
  // the full menu with ~80 illustrations, and the auth check used to trigger
  // up to five rebuilds per page load (measured 19.09.2026).
  useEffect(() => {
    const node = header.current;
    if (!node) return;
    return mountGlobalNav(node, { active: ratgeberBySlug(pathname) ? "ratgeber" : "" });
  }, [pathname]);

  // Login state only rewrites the account links; the menu itself stays.
  useEffect(() => {
    const node = header.current;
    if (!node || auth.status !== "authed") return;
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
    // The admin entry the old header had; only for admins, checked server-side.
    const admin = isAdmin ? Object.assign(document.createElement("a"), { href: "/admin", className: "sc-nav-signout", textContent: "Admin" }) : null;
    if (admin) node.querySelector(".sc-global-nav")?.append(admin);
    node.querySelector(".sc-global-nav")?.append(logout);
    return () => { logout.remove(); admin?.remove(); };
  }, [auth.status, isAdmin, pathname]);

  return <header ref={header} className="site-header sc-react-header">
    <Link className="brand" href="/" aria-label="Solar Check – Startseite"><Logo width={166} /></Link>
    <details className="sc-react-fallback">
      <summary>Menü</summary>
      <div dangerouslySetInnerHTML={{ __html: navigationContent() }} />
      <Link href="/login">Login</Link>
    </details>
  </header>;
}
