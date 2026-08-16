import { Metadata } from "next";
import { Suspense } from "react";
import StandNote from "../../../components/StandNote";
import { pageMetadata } from "../../../lib/seo";
import { v } from "../../../lib/theme";
import Empfehlung from "./empfehlung";

export const metadata: Metadata = pageMetadata({
  path: "/pv-bedarf-berechnen",
  title: "PV-Bedarf berechnen – Welche Photovoltaikanlage passt zu dir?",
  description: "Beschreibe deinen Haushalt und dein Dach — wir empfehlen dir die optimale PV-Anlage mit Speicher. Kostenlos, ohne Anmeldung, ohne Verkaufsanrufe.",
  ogImageTitle: "Welche PV-Anlage passt zu mir?",
  ogImageSubtitle: "Haushalt + Dach beschreiben — wir empfehlen Anlage & Speicher.",
});

export default function EmpfehlungPage() {
  // useSearchParams in the client component requires a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <Empfehlung />
      <div style={{ maxWidth: v("--page-max-width"), margin: "0 auto", padding: "0 16px 32px" }}>
        <StandNote pfad="/pv-bedarf-berechnen" />
      </div>
    </Suspense>
  );
}
