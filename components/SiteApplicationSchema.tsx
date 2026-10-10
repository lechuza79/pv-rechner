"use client";
import { usePathname } from "next/navigation";
import { softwareAppJsonLd } from "../lib/site-json-ld";
import { jsonLdHtml } from "../lib/json-ld";

/** Energy editorial pages describe a dataset, not the PV calculator. */
export default function SiteApplicationSchema() {
  const pathname = usePathname();
  if (pathname === "/atomstrom-import" || pathname.startsWith("/atomstrom-import/")) return null;
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(softwareAppJsonLd) }} />;
}
