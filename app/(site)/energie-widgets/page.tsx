import type { Metadata } from "next";
import { pageMetadata } from "../../../lib/seo";
import WidgetsClient from "./client";

export const metadata: Metadata = pageMetadata({
  path: "/energie-widgets",
  title: "Energie-Widgets kostenlos einbetten – Strommix & Stromerzeugung | Solar Check",
  description:
    "Kostenlose, immer aktuelle Energie-Widgets für die eigene Website: Live-Strommix und Stromerzeugung in Deutschland als iframe – anpassbares Theme, ein Klick zum Kopieren.",
  ogImageTitle: "Energie-Widgets einbetten",
  ogImageSubtitle: "Live-Strommix und Stromerzeugung, kostenlos fuer die eigene Website.",
});

export default function WidgetsPage() {
  return <WidgetsClient />;
}
