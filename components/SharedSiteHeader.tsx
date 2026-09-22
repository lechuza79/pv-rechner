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
export default function SharedSiteHeader({ aktiv }: { aktiv?: string } = {}) {
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
    return mountGlobalNav(node, { active: aktiv ?? (ratgeberBySlug(pathname) ? "ratgeber" : "") });
  }, [pathname, aktiv]);

  // Login state only rewrites the account links; the menu itself stays.
  // Signed in, the person icon opens a small account menu (Mein Konto, Admin,
  // Abmelden) instead of adding entries to the main bar; in the mobile menu
  // the same entries sit next to the account link.
  useEffect(() => {
    const node = header.current;
    if (!node || auth.status !== "authed") return;
    const logoutKnopf = () => {
      const knopf = document.createElement("button");
      knopf.type = "button";
      knopf.className = "sc-nav-signout";
      knopf.textContent = "Abmelden";
      knopf.onclick = async () => {
        knopf.disabled = true;
        try { await signOut(); window.location.assign("/"); }
        catch { knopf.disabled = false; knopf.textContent = "Erneut abmelden"; }
      };
      return knopf;
    };
    // The admin entry only for admins, checked server-side.
    const adminLink = () => Object.assign(document.createElement("a"), { href: "/admin", className: "sc-nav-signout", textContent: "Admin" });
    const aufraeumen: (() => void)[] = [];

    node.querySelectorAll<HTMLAnchorElement>(".sc-nav-login").forEach(link => {
      if (link.parentElement?.matches("header")) {
        const konto = document.createElement("details");
        konto.className = "sc-account";
        const kopf = document.createElement("summary");
        kopf.className = link.className;
        kopf.setAttribute("aria-label", "Mein Konto");
        kopf.innerHTML = link.innerHTML;
        const panel = document.createElement("div");
        panel.className = "sc-account-panel";
        panel.append(Object.assign(document.createElement("a"), { href: "/dashboard", textContent: "Mein Konto" }));
        if (isAdmin) panel.append(adminLink());
        panel.append(logoutKnopf());
        konto.append(kopf, panel);
        link.replaceWith(konto);
        const schliessen = (e: Event) => {
          if (e instanceof KeyboardEvent ? e.key === "Escape" : !konto.contains(e.target as Node)) konto.open = false;
        };
        document.addEventListener("click", schliessen);
        document.addEventListener("keydown", schliessen);
        aufraeumen.push(() => {
          document.removeEventListener("click", schliessen);
          document.removeEventListener("keydown", schliessen);
          // The menu's own cleanup runs first on a page change and has already
          // taken its login link out; putting it back then would leave a second
          // icon next to the new menu. Restore only while that menu still stands.
          if (node.dataset.globalNav) konto.replaceWith(link);
          else konto.remove();
        });
      } else {
        const vorher = { text: link.textContent, href: link.href, label: link.getAttribute("aria-label") };
        link.lastChild!.textContent = "Mein Konto";
        link.setAttribute("aria-label", "Mein Konto");
        link.href = "/dashboard";
        const extras = [...(isAdmin ? [adminLink()] : []), logoutKnopf()];
        link.after(...extras);
        aufraeumen.push(() => {
          extras.forEach(e => e.remove());
          link.lastChild!.textContent = vorher.text?.trim() ?? "Login";
          link.href = vorher.href;
          if (vorher.label) link.setAttribute("aria-label", vorher.label); else link.removeAttribute("aria-label");
        });
      }
    });
    return () => aufraeumen.forEach(f => f());
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
