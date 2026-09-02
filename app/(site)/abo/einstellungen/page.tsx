import type { Metadata } from "next";
import Client from "./client";

// Was habe ich abonniert — und wie ändere ich es?
//
// NICHT INDEXIERBAR und nicht in der Sitemap: Die Adresse trägt ein Token, das
// zu genau einem Postfach gehört. Ein Suchergebnis dafür wäre bestenfalls
// nutzlos und schlimmstenfalls ein Link auf fremde Einstellungen.
//
// DIE SEITE SELBST IST STATISCH, die Daten holt der Browser mit dem Token aus
// der Adresse. Anders herum — Token serverseitig auflösen — wäre die Seite
// dynamisch und stünde damit auch im Server-Protokoll jeder Zwischenstation.

export const metadata: Metadata = {
  title: "Deine Meldungen – Solar Check",
  robots: { index: false, follow: false },
};

export default function Seite() {
  return <Client />;
}
