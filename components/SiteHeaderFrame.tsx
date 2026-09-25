"use client";
import { usePathname } from "next/navigation";
import Header from "./SharedSiteHeader";

/** District pages own their header inside the full-bleed hero, like home. */
export default function SiteHeaderFrame({ bottomGap }: { bottomGap: number }) {
  const pathname = usePathname();
  const parts=pathname.split("/").filter(Boolean);
  const isDistrict=parts[0]==="solar-atlas" && parts.length===3 && !["ranking","ranking-tief"].includes(parts[1]);
  if(isDistrict)return null;
  return <div style={{ padding: `28px var(--header-frame-pad) ${bottomGap}px` }}><Header /></div>;
}
