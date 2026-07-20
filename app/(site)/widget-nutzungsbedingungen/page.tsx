import { Metadata } from "next";
import Link from "next/link";
import { IconArrowRight } from "../../../components/Icons";
import { v, iconSizes } from "../../../lib/theme";
import { pageMetadata } from "../../../lib/seo";

export const metadata: Metadata = pageMetadata({
  path: "/widget-nutzungsbedingungen",
  title: "Widget-Nutzungsbedingungen – Solar Check",
  description:
    "Bedingungen für das kostenlose Einbetten der Solar-Check-Energiedaten-Widgets: Quellenangabe, Gewährleistung, Verfügbarkeit.",
  ogImageTitle: "Widget-Nutzungsbedingungen",
});

const S = {
  page: {
    background: v('--color-bg'),
    fontFamily: v('--font-text'),
    color: v('--color-text-primary'),
    minHeight: "100vh",
    padding: "20px 16px",
  },
  wrap: { maxWidth: v('--page-max-width'), margin: "0 auto" },
  back: {
    fontSize: v('--font-size-small'),
    color: v('--color-text-secondary'),
    textDecoration: "none",
    display: "inline-block",
    marginBottom: 24,
  },
  h1: {
    fontSize: v('--font-size-h1'),
    fontWeight: 800,
    letterSpacing: "-0.02em",
    color: v('--color-text-primary'),
    lineHeight: 1.2,
    marginBottom: 24,
  },
  h2: {
    fontSize: v('--font-size-h2'),
    fontWeight: 700,
    color: v('--color-text-primary'),
    marginTop: 28,
    marginBottom: 10,
  },
  p: {
    fontSize: v('--font-size-body'),
    color: v('--color-text-muted'),
    lineHeight: 1.7,
    marginBottom: 12,
  },
  a: {
    color: v('--color-accent'),
    textDecoration: "none",
  },
};

export default function WidgetNutzungsbedingungenPage() {
  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <Link href="/energie-widgets" style={S.back}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <IconArrowRight size={iconSizes.sm} style={{ transform: "rotate(180deg)" }} /> Zurück zu den Widgets
          </span>
        </Link>

        <h1 style={S.h1}>Widget-Nutzungsbedingungen</h1>

        <p style={S.p}>
          Diese Bedingungen gelten für alle einbettbaren Energiedaten-Widgets
          (iframes) unter solar-check.io/embed, die du auf deiner eigenen
          Website einbindest.
        </p>

        <h2 style={S.h2}>1. Kostenlose Nutzung</h2>
        <p style={S.p}>
          Die Widgets dürfen kostenlos und ohne vorherige Anmeldung in
          redaktionelle oder informative Inhalte eingebettet werden — etwa
          Artikel, Ratgeberseiten oder Faktenboxen zum Thema Energie.
        </p>

        <h2 style={S.h2}>2. Quellenangabe bleibt sichtbar</h2>
        <p style={S.p}>
          Der im Widget-Code enthaltene Quellen-Link sowie der Hinweis
          „Powered by solar-check.io" dürfen nicht entfernt, verdeckt oder
          unkenntlich gemacht werden. Beides ist Teil des bereitgestellten
          Codes und muss unverändert sichtbar bleiben.
        </p>

        <h2 style={S.h2}>3. Keine Gewähr für die Daten</h2>
        <p style={S.p}>
          Die im Widget dargestellten Daten werden „wie besehen" bereitgestellt
          — ohne Gewähr für Richtigkeit, Vollständigkeit, Aktualität oder
          ständige Verfügbarkeit. Eine Haftung ist ausgeschlossen, außer bei
          Vorsatz oder grober Fahrlässigkeit.
        </p>

        <h2 style={S.h2}>4. Keine Partnerschaft oder Empfehlung</h2>
        <p style={S.p}>
          Das Einbetten eines Widgets darf nicht so eingesetzt oder dargestellt
          werden, dass es eine Partnerschaft, Kooperation oder Empfehlung durch
          solar-check.io suggeriert, sofern diese nicht tatsächlich besteht.
        </p>

        <h2 style={S.h2}>5. Änderung, Einstellung, Sperrung</h2>
        <p style={S.p}>
          Solar-check.io kann Inhalt, Darstellung und Bereitstellung der
          Widgets jederzeit ändern, die Bereitstellung insgesamt einstellen
          oder das Einbetten für einzelne Websites untersagen — insbesondere
          bei Verstößen gegen diese Bedingungen.
        </p>

        <h2 style={S.h2}>6. Kein eigenständiges Nutzerverhältnis</h2>
        <p style={S.p}>
          Diese Bedingungen begründen kein Vertragsverhältnis zwischen
          solar-check.io und den Besuchern deiner Website. Für Inhalt und
          Betrieb deiner Website bist ausschließlich du verantwortlich.
        </p>

        <h2 style={S.h2}>7. Datenschutz</h2>
        <p style={S.p}>
          Was beim Laden eines Widgets technisch an solar-check.io übermittelt
          wird und was das für deine eigene Datenschutzerklärung bedeutet,
          findest du auf der{" "}
          <Link href="/energie-widgets" style={S.a}>
            Widget-Seite
          </Link>{" "}
          im Abschnitt „Datenschutz beim Einbetten" — inklusive eines fertigen
          Textbausteins zum Kopieren.
        </p>
      </div>
    </div>
  );
}
