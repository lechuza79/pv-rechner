import { Metadata } from "next";
import { Suspense } from "react";
import { pageMetadata } from "../../../lib/seo";
import Empfehlung from "./empfehlung";

export const metadata: Metadata = pageMetadata({
  path: "/pv-bedarf-berechnen",
  title: "PV-Bedarf berechnen – Welche Photovoltaikanlage passt zu dir?",
  description: "Beschreibe deinen Haushalt und dein Dach — wir empfehlen dir die optimale PV-Anlage mit Speicher. Kostenlos, ohne Anmeldung, ohne Verkaufsanrufe.",
  ogImageTitle: "Welche PV-Anlage passt zu mir?",
  ogImageSubtitle: "Haushalt + Dach beschreiben — wir empfehlen Anlage & Speicher.",
});

// Die „Stand:"-Zeile sitzt im Flow selbst (siehe empfehlung.tsx), nicht hier:
// Der Rahmen ist mindestens bildschirmhoch, ein Absatz dahinter stünde hinter
// einer leeren Fläche.
export default function EmpfehlungPage() {
  // useSearchParams in the client component requires a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <Empfehlung />
    </Suspense>
  );
}
