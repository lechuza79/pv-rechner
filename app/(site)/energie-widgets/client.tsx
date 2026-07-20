"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Header from "../../../components/Header";
import { IconBolt, IconRefresh, IconLink, IconChevronDown } from "../../../components/Icons";
import { v, iconSizes } from "../../../lib/theme";
import {
  WIDGET_FONTS,
  WIDGET_THEME_DEFAULTS,
  WidgetThemeSelection,
  buildWidgetThemeQuery,
  selectionToVars,
} from "../../../lib/widget-theme";
import {
  WIDGET_SETTINGS_DEFAULTS,
  WidgetSettings,
  WidgetRange,
  buildWidgetSettingsQuery,
} from "../../../lib/widget-settings";

const SITE_URL = "https://solar-check.io";
const MAX_RADIUS = 28;

interface WidgetVariant {
  id: string;
  label: string;
  src: string;
  height: number;
  /** If set, the iframe renders at this fixed width; otherwise the width selector applies. */
  fixedWidth?: number;
  /** Fixed query params for this variant (e.g. metric=leistung), merged into both
   * the live-preview src and the copy-paste embed URL. */
  params?: Record<string, string>;
}

interface Attribution {
  /** Deep link target on solar-check.io — this anchor in the HOST page is the actual backlink. */
  path: string;
  text: string;
}

interface WidgetSection {
  id: string;
  label: string;
  intro: string;
  attribution: Attribution;
  showFrameWidth: boolean;
  showAutoswitch?: boolean;
  /** Widget supports the functional settings (share footer, time range, switcher). */
  supportsSettings?: boolean;
  variants: WidgetVariant[];
}

const SECTIONS: WidgetSection[] = [
  {
    id: "erzeugung",
    label: "Stromerzeugung (live)",
    intro:
      "Die aktuelle Erzeugung aus erneuerbaren Quellen als Radial-Chart der letzten 24 Stunden. Optional wechselt das Widget automatisch durch die Energieträger.",
    attribution: {
      path: "/strommix-deutschland",
      text: "Stromerzeugung in Deutschland – live bei Solar Check",
    },
    showFrameWidth: false,
    showAutoswitch: true,
    variants: [
      { id: "standard", label: "Standard", src: "/embed/erzeugung", height: 412, fixedWidth: 380 },
      { id: "mini", label: "Kompakt", src: "/embed/erzeugung-mini", height: 285, fixedWidth: 260 },
    ],
  },
  {
    id: "strommix",
    label: "Strommix Deutschland",
    intro:
      "Der deutsche Strommix im Zeitverlauf – erneuerbare und fossile Erzeugung nebeneinander, mit wählbarem Zeitraum von 24 Stunden bis zum Maximum.",
    attribution: {
      path: "/strommix-deutschland",
      text: "Strommix Deutschland – live bei Solar Check",
    },
    showFrameWidth: true,
    supportsSettings: true,
    variants: [{ id: "strommix", label: "Strommix", src: "/embed/strommix", height: 460 }],
  },
  {
    id: "ee-ampel",
    label: "EE-Ampel (Strommix live)",
    intro:
      "Zeigt auf einen Blick, ob der deutsche Strom gerade überwiegend erneuerbar ist. Grün heißt: guter Zeitpunkt für Stromverbrauch, etwa fürs Laden des E-Autos. Kompakt für Sidebar oder Faktenbox.",
    attribution: {
      path: "/strommix-deutschland",
      text: "Strommix Deutschland – live bei Solar Check",
    },
    showFrameWidth: false,
    variants: [{ id: "ee-ampel", label: "EE-Ampel", src: "/embed/ee-ampel", height: 290, fixedWidth: 320 }],
  },
  {
    id: "strommix-anteil",
    label: "Kernenergie im Strommix",
    intro:
      "Wie viel Kernenergie – inklusive rechnerisch importiertem Atomstrom – im deutschen Strommix des laufenden Jahres steckt. Als Donut mit den Anteilen aller Kategorien.",
    attribution: {
      path: "/atomstrom-import",
      text: "Kernenergie im deutschen Strommix – Solar Check",
    },
    showFrameWidth: true,
    variants: [{ id: "strommix-anteil", label: "Kernenergie-Anteil", src: "/embed/strommix-anteil", height: 400 }],
  },
  {
    id: "zubau-erneuerbare-atom",
    label: "Zubau: Erneuerbare vs. Atomkraft",
    intro:
      "Wie viel Wind + Solar gegenüber Atomkraft jedes Jahr neu ans Netz geht — wählbar je Land, plus direkter Vergleich Deutschland ↔ China.",
    attribution: {
      path: "/laendervergleich",
      text: "Zubau Erneuerbare vs. Atomkraft – Solar Check",
    },
    showFrameWidth: true,
    variants: [{ id: "zubau-erneuerbare-atom", label: "Zubau EE vs. Atom", src: "/embed/zubau-erneuerbare-atom", height: 420 }],
  },
  {
    id: "pv-zubau-deutschland",
    label: "PV-Zubau & Förderung (Deutschland)",
    intro:
      "Der jährliche Photovoltaik-Zubau in Deutschland mit sinkender Einspeisevergütung und steigendem Strompreis auf einer Zeitachse — plus interaktiver Ereignis-Timeline, die die politischen Weichenstellungen erklärt.",
    attribution: {
      path: "/photovoltaik-zubau-deutschland",
      text: "Wie Förderung den Solarausbau geformt hat – Solar Check",
    },
    showFrameWidth: true,
    variants: [{ id: "pv-zubau-deutschland", label: "PV-Zubau", src: "/embed/pv-zubau-deutschland", height: 680 }],
  },
  {
    id: "karte",
    label: "Deutschland-Karte",
    intro:
      "Der Photovoltaik- und Erneuerbaren-Bestand je Region aus dem Marktstammdatenregister – interaktiv nach Energieträger umschaltbar und bis auf Landkreis-Ebene aufklappbar.",
    attribution: {
      path: "/",
      text: "PV-Anlagen in Deutschland – Solar Check",
    },
    showFrameWidth: false,
    variants: [{ id: "karte", label: "Karte", src: "/embed/karte", height: 820, fixedWidth: 680 }],
  },
  {
    id: "kennzahl",
    label: "Kennzahlen (Anlagenbestand)",
    intro:
      "Eine einzelne Kennzahl aus dem Marktstammdatenregister als kompakte Kachel: die bundesweit installierte Erneuerbaren-Leistung oder die Anzahl der Anlagen. Zum Einbetten in eine Sidebar oder Faktenbox.",
    attribution: {
      path: "/",
      text: "PV-Anlagen in Deutschland – Solar Check",
    },
    showFrameWidth: false,
    variants: [
      { id: "leistung", label: "Leistung", src: "/embed/kennzahl", params: { metric: "leistung" }, height: 190, fixedWidth: 300 },
      { id: "anlagen", label: "Anlagen", src: "/embed/kennzahl", params: { metric: "anlagen" }, height: 190, fixedWidth: 300 },
    ],
  },
  {
    id: "gemeinde-solar",
    label: "Solaranlagen einer Gemeinde",
    intro:
      "Der Anlagenbestand einer einzelnen Gemeinde aus dem Marktstammdatenregister — Anlagen, Leistung und Leistung je Einwohner. Für Kommunen zum Einbetten auf der eigenen Website. Hier als Beispiel Höchberg; den fertigen Code für Ihre Gemeinde finden Sie auf deren Seite im Solar-Atlas.",
    attribution: {
      path: "/solar-atlas/bayern/landkreis-wuerzburg/hoechberg",
      text: "Solaranlagen in Höchberg · Solar Check",
    },
    showFrameWidth: false,
    variants: [
      { id: "gemeinde-solar", label: "Höchberg (Beispiel)", src: "/embed/gemeinde-solar", params: { ags: "09679147" }, height: 250, fixedWidth: 380 },
    ],
  },
  {
    id: "gemeinde-erneuerbare",
    label: "Erneuerbare Leistung einer Gemeinde",
    intro:
      "Die installierte erneuerbare Leistung einer Gemeinde nach Technologie (Solar, Wind, Biomasse, Wasserkraft) aus dem Marktstammdatenregister — als Donut. Für Kommunen zum Einbetten. Hier als Beispiel Höchberg; den fertigen Code für Ihre Gemeinde finden Sie auf deren Seite im Solar-Atlas.",
    attribution: {
      path: "/solar-atlas/bayern/landkreis-wuerzburg/hoechberg",
      text: "Erneuerbare Leistung in Höchberg · Solar Check",
    },
    showFrameWidth: false,
    variants: [
      { id: "gemeinde-erneuerbare", label: "Höchberg (Beispiel)", src: "/embed/gemeinde-erneuerbare", params: { ags: "09679147" }, height: 360, fixedWidth: 380 },
    ],
  },
  {
    id: "gemeinde-solarleistung",
    label: "Solarleistung einer Gemeinde (simuliert)",
    intro:
      "Der Tagesverlauf der Solarleistung des Gemeinde-Bestands, simuliert aus dem heutigen Wetter am Standort — kein Messwert, aber standortgenau. Für Kommunen zum Einbetten. Hier als Beispiel Höchberg; den fertigen Code für Ihre Gemeinde finden Sie auf deren Seite im Solar-Atlas.",
    attribution: {
      path: "/solar-atlas/bayern/landkreis-wuerzburg/hoechberg",
      text: "Solarleistung in Höchberg · Solar Check",
    },
    showFrameWidth: false,
    variants: [
      { id: "gemeinde-solarleistung", label: "Höchberg (Beispiel)", src: "/embed/gemeinde-solarleistung", params: { ags: "09679147" }, height: 470, fixedWidth: 380 },
    ],
  },
  {
    id: "region-anlagentyp",
    label: "Solarleistung eines Bundeslands nach Anlagentyp",
    intro:
      "Die installierte Solarleistung eines Bundeslands nach Anlagentyp (private Dächer, Gewerbe, Freifläche) aus dem Marktstammdatenregister — als Donut. Hier als Beispiel Mecklenburg-Vorpommern; den fertigen Code je Bundesland finden Sie auf dessen Förderseite.",
    attribution: {
      path: "/photovoltaik-foerderung/mecklenburg-vorpommern",
      text: "Photovoltaik-Förderung in Mecklenburg-Vorpommern · Solar Check",
    },
    showFrameWidth: false,
    variants: [
      { id: "region-anlagentyp", label: "Mecklenburg-Vorpommern (Beispiel)", src: "/embed/region-anlagentyp", params: { bl: "13" }, height: 360, fixedWidth: 380 },
    ],
  },
  {
    id: "region-solarleistung",
    label: "Solarleistung eines Bundeslands (simuliert)",
    intro:
      "Die aktuelle Solarleistung des Anlagenbestands eines Bundeslands, simuliert aus dem heutigen Wetter — kein Messwert, aber nah dran. Hier als Beispiel Mecklenburg-Vorpommern; den fertigen Code je Bundesland finden Sie auf dessen Förderseite.",
    attribution: {
      path: "/photovoltaik-foerderung/mecklenburg-vorpommern",
      text: "Solarleistung in Mecklenburg-Vorpommern · Solar Check",
    },
    showFrameWidth: false,
    variants: [
      { id: "region-solarleistung", label: "Mecklenburg-Vorpommern (Beispiel)", src: "/embed/region-solarleistung", params: { bl: "13" }, height: 470, fixedWidth: 380 },
    ],
  },
  {
    id: "simulation",
    label: "PV-Simulation (live)",
    intro:
      "Die vollständige Live-Simulation: was eine PV-Anlage am eingegebenen Standort gerade beim aktuellen Wetter liefert – mit Haushaltsprofil (Personen, Wärmepumpe, E-Auto), Eigenverbrauch und Tagesverlauf. Standort über die PLZ; per ?plz=… im Code fest vorgebbar.",
    attribution: {
      path: "/pv-simulation",
      text: "Live-PV-Simulation – Solar Check",
    },
    showFrameWidth: false,
    variants: [{ id: "simulation", label: "Simulation", src: "/embed/simulation", height: 1060, fixedWidth: 380 }],
  },
];

const RULES: { icon: typeof IconBolt; title: string; body: React.ReactNode }[] = [
  {
    icon: IconBolt,
    title: "Kostenlos und ohne Anmeldung",
    body: "Kopiere den Code und füge ihn in deine Seite ein. Es gibt keine Registrierung, keine Kosten und kein Limit.",
  },
  {
    icon: IconRefresh,
    title: "Immer aktuell",
    body: "Das Widget lädt die Daten live von Solar Check. Du musst nie etwas nachpflegen – die Werte bleiben automatisch auf dem neuesten Stand.",
  },
  {
    icon: IconLink,
    title: "Mit Quellenangabe",
    body: (
      <>
        Bitte lass den Quellen-Link und den „Powered by solar-check.io“-Hinweis unter dem Widget
        stehen. Beides ist im Code bereits enthalten – die vollständigen Bedingungen für die
        kostenlose Nutzung stehen in den{" "}
        <Link href="/widget-nutzungsbedingungen" style={{ color: v("--color-accent"), textDecoration: "underline" }}>
          Widget-Nutzungsbedingungen
        </Link>
        .
      </>
    ),
  },
];

const PRIVACY_SNIPPET = `Auf dieser Seite ist ein Energiedaten-Widget von solar-check.io (Sebastian Schäder, Höchberg) eingebunden. Beim Laden des Widgets werden technisch bedingt Ihre IP-Adresse, die aufgerufene Seite (Referrer) und Ihr User-Agent an solar-check.io übermittelt (Hosting: Vercel Inc., USA; Übermittlung auf Grundlage des EU-US Data Privacy Framework). Das Widget setzt keine Cookies, speichert keine Daten in Ihrem Browser und führt kein Tracking durch. Rechtsgrundlage ist unser berechtigtes Interesse an der Darstellung aktueller Energiedaten (Art. 6 Abs. 1 lit. f DSGVO). Details: https://solar-check.io/datenschutz`;

export default function WidgetsClient() {
  const [theme, setTheme] = useState<WidgetThemeSelection>(WIDGET_THEME_DEFAULTS);
  const update = (patch: Partial<WidgetThemeSelection>) => setTheme((t) => ({ ...t, ...patch }));
  const [settings, setSettings] = useState<WidgetSettings>(WIDGET_SETTINGS_DEFAULTS);
  const updateSettings = (patch: Partial<WidgetSettings>) => setSettings((s) => ({ ...s, ...patch }));

  // The customization panel floats (sticky) on desktop so changes are visible
  // in the widgets while adjusting. On mobile it stays in flow — a sticky panel
  // would cover the very widget you want to watch.
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return (
    <div style={S.page}>
      <Header activePage="widgets" />
      <div style={S.wrap}>
        <h1 style={S.h1}>Energie-Widgets für die eigene Website</h1>
        <p style={S.subtitle}>
          Bette den deutschen Strommix und die Live-Stromerzeugung kostenlos auf deiner Seite ein.
          Die Daten aktualisieren sich automatisch, und das Aussehen lässt sich frei an dein Design anpassen.
          Wähle ein Widget, passe das Aussehen unten an und kopiere den fertigen Code.
        </p>

        <div style={S.rules}>
          {RULES.map((r) => {
            const Icon = r.icon;
            return (
              <div key={r.title} style={S.ruleCard}>
                <div style={S.ruleIcon}>
                  <Icon size={iconSizes.lg} color={v("--color-accent")} />
                </div>
                <div style={S.ruleTitle}>{r.title}</div>
                <div style={S.ruleBody}>{r.body}</div>
              </div>
            );
          })}
        </div>

        <section style={S.privacySection}>
          <h2 style={S.h2}>Datenschutz beim Einbetten</h2>
          <p style={S.sectionIntro}>
            Beim Laden eines Widgets gehen technisch bedingt die IP-Adresse, die aufgerufene Seite
            (Referrer) und der User-Agent des Besuchers deiner Website an solar-check.io (Hosting:
            Vercel Inc., USA — zertifiziert unter dem EU-US Data Privacy Framework). Dabei werden
            keine Cookies gesetzt, kein Speicher im Browser des Besuchers beschrieben und kein
            Tracking durchgeführt. Wenn du ein Widget einbindest, solltest du das in deiner eigenen
            Datenschutzerklärung erwähnen — den passenden Textbaustein kannst du unten direkt
            übernehmen.
          </p>
          <PrivacySnippet />
        </section>

        {SECTIONS.map((s, i) => (
          <Fragment key={s.id}>
            <SectionPreview
              section={s}
              theme={theme}
              settings={settings}
              onSettings={updateSettings}
            />
            {/* Controls live directly under the first live widget and stick to
                the top while scrolling on to the next widget / the code. */}
            {i === 0 && <ThemePanel theme={theme} onChange={update} sticky={isDesktop} />}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

function ThemePanel({
  theme,
  onChange,
  sticky,
}: {
  theme: WidgetThemeSelection;
  onChange: (patch: Partial<WidgetThemeSelection>) => void;
  sticky: boolean;
}) {
  const isDefault = JSON.stringify(theme) === JSON.stringify(WIDGET_THEME_DEFAULTS);

  return (
    <section style={{ ...S.themePanel, ...(sticky ? S.themePanelSticky : null) }}>
      <div style={S.themePanelHead}>
        <h2 style={S.themePanelTitle}>Aussehen anpassen</h2>
        <span style={S.themePanelHint}>Änderungen erscheinen sofort in den Widgets oben.</span>
        {!isDefault && (
          <button type="button" onClick={() => onChange(WIDGET_THEME_DEFAULTS)} style={S.resetBtn}>
            Zurücksetzen
          </button>
        )}
      </div>

      <div style={S.themeGrid}>
        <Control label="Hintergrund">
          <ColorInput value={theme.bg} onChange={(bg) => onChange({ bg })} />
        </Control>
        <Control label="Hauptfarbe (Text)">
          <ColorInput value={theme.fg} onChange={(fg) => onChange({ fg })} />
        </Control>
        <Control label="Akzent">
          <ColorInput value={theme.accent} onChange={(accent) => onChange({ accent })} />
        </Control>
        <Control label="Highlight">
          <ColorInput value={theme.highlight} onChange={(highlight) => onChange({ highlight })} />
        </Control>

        <Control label={`Ecken: ${parseInt(theme.radius, 10) || 0} px`} span={2}>
          <input
            type="range"
            min={0}
            max={MAX_RADIUS}
            step={1}
            value={parseInt(theme.radius, 10) || 0}
            onChange={(e) => onChange({ radius: `${e.target.value}px` })}
            style={S.slider}
            aria-label="Eckenradius"
          />
        </Control>

        <Control label="Schrift" span={2}>
          <div style={{ ...S.btnRow, flexWrap: "nowrap" }}>
            {Object.entries(WIDGET_FONTS).map(([key, f]) => (
              <button
                key={key}
                type="button"
                onClick={() => onChange({ font: key })}
                style={{ ...S.btn, ...(theme.font === key ? S.btnActive : null) }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </Control>
      </div>
    </section>
  );
}

function Control({ label, children, span }: { label: string; children: React.ReactNode; span?: number }) {
  return (
    <div style={span ? { gridColumn: `span ${span}` } : undefined}>
      <div style={S.label}>{label}</div>
      {children}
    </div>
  );
}

function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label style={S.colorRow}>
      <input
        type="color"
        value={value || "#000000"}
        onChange={(e) => onChange(e.target.value)}
        style={S.colorSwatch}
        aria-label="Farbe wählen"
      />
      <span style={S.colorValue}>{(value || "").toUpperCase()}</span>
    </label>
  );
}

const AUTOSWITCH_OPTIONS = [
  { id: "off", label: "Aus", ms: 0 },
  { id: "3s", label: "3 s", ms: 3000 },
  { id: "4s", label: "4 s", ms: 4000 },
  { id: "6s", label: "6 s", ms: 6000 },
  { id: "10s", label: "10 s", ms: 10000 },
];

function SectionPreview({
  section,
  theme,
  settings,
  onSettings,
}: {
  section: WidgetSection;
  theme: WidgetThemeSelection;
  settings: WidgetSettings;
  onSettings: (patch: Partial<WidgetSettings>) => void;
}) {
  const [frameW, setFrameW] = useState<number>(480);
  const [autoswitch, setAutoswitch] = useState<number>(0);

  return (
    <section id={section.id} style={{ ...S.section, scrollMarginTop: 80 }}>
      <h2 style={S.h2}>{section.label}</h2>
      <p style={S.sectionIntro}>{section.intro}</p>

      {(section.showFrameWidth || section.showAutoswitch || section.supportsSettings) && (
        <div style={S.controls}>
          {section.supportsSettings && (
            <>
              <Control label="Teilen-Leiste">
                <div style={S.btnRow}>
                  <button type="button" onClick={() => onSettings({ share: true })} style={{ ...S.btn, ...(settings.share ? S.btnActive : null) }}>An</button>
                  <button type="button" onClick={() => onSettings({ share: false })} style={{ ...S.btn, ...(!settings.share ? S.btnActive : null) }}>Aus</button>
                </div>
              </Control>
              <Control label="Zeitraum">
                <div style={S.btnRow}>
                  {(["24h", "7d", "30d", "year"] as WidgetRange[]).map((r) => (
                    <button key={r} type="button" onClick={() => onSettings({ range: r })} style={{ ...S.btn, ...(settings.range === r ? S.btnActive : null) }}>
                      {r === "24h" ? "24 Std" : r === "7d" ? "7 Tage" : r === "30d" ? "30 Tage" : "Jahr"}
                    </button>
                  ))}
                </div>
              </Control>
              <Control label="Zeitraum-Umschalter">
                <div style={S.btnRow}>
                  <button type="button" onClick={() => onSettings({ switchable: true })} style={{ ...S.btn, ...(settings.switchable ? S.btnActive : null) }}>An</button>
                  <button type="button" onClick={() => onSettings({ switchable: false })} style={{ ...S.btn, ...(!settings.switchable ? S.btnActive : null) }}>Aus</button>
                </div>
              </Control>
            </>
          )}
          {section.showFrameWidth && (
            <Control label="Breite">
              <div style={S.btnRow}>
                {[320, 480, 600].map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setFrameW(w)}
                    style={{ ...S.btn, ...(frameW === w ? S.btnActive : null) }}
                  >
                    {w} px
                  </button>
                ))}
              </div>
            </Control>
          )}

          {section.showAutoswitch && (
            <Control label="Autoswitch">
              <div style={S.btnRow}>
                {AUTOSWITCH_OPTIONS.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setAutoswitch(o.ms)}
                    style={{ ...S.btn, ...(autoswitch === o.ms ? S.btnActive : null) }}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              <div style={S.hint}>
                Das Widget wechselt im gewählten Intervall automatisch durch die Energieträger und
                pausiert für 30 Sekunden, wenn jemand manuell auf die Pfeile klickt.
              </div>
            </Control>
          )}
        </div>
      )}

      <div style={S.variantRow}>
        {section.variants.map((variant) => (
          <VariantFrame
            key={variant.id}
            variant={variant}
            attribution={section.attribution}
            theme={theme}
            settings={section.supportsSettings ? settings : undefined}
            frameW={frameW}
            autoswitch={autoswitch}
            showVariantLabel={section.variants.length > 1}
          />
        ))}
      </div>
    </section>
  );
}

function VariantFrame({
  variant,
  attribution,
  theme,
  settings,
  frameW,
  autoswitch,
  showVariantLabel,
}: {
  variant: WidgetVariant;
  attribution: Attribution;
  theme: WidgetThemeSelection;
  settings?: WidgetSettings;
  frameW: number;
  autoswitch: number;
  showVariantLabel: boolean;
}) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [iframeReady, setIframeReady] = useState(false);

  // Live preview drives the theme via postMessage (instant, no reload). The
  // autoswitch interval is the only thing that needs a fresh src. embed=0 hides
  // the widget's own "Einbetten" button here — you're already on the gallery.
  const previewParams = new URLSearchParams(variant.params);
  previewParams.set("embed", "0");
  if (autoswitch > 0) previewParams.set("auto", String(autoswitch));
  const src = `${variant.src}?${previewParams.toString()}`;

  useEffect(() => {
    setIframeReady(false);
  }, [src]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (iframe?.contentDocument?.readyState === "complete") setIframeReady(true);
  }, []);

  // Always send the full var set so the preview never keeps a stale override.
  const themeKey = JSON.stringify(theme);
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !iframeReady) return;
    iframe.contentWindow?.postMessage(
      { type: "widget:theme", vars: selectionToVars(theme) },
      window.location.origin,
    );
  }, [themeKey, iframeReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // Functional settings (share footer, range, switcher) — live preview. Only
  // the three live controls travel; `embed` is intentionally omitted so it never
  // overrides the embed=0 in the iframe URL (the gallery always hides the
  // widget's own "Einbetten" button).
  const settingsKey = JSON.stringify(settings);
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !iframeReady || !settings) return;
    iframe.contentWindow?.postMessage(
      {
        type: "widget:settings",
        settings: {
          share: settings.share,
          range: settings.range,
          switchable: settings.switchable,
        },
      },
      window.location.origin,
    );
  }, [settingsKey, iframeReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-Höhe: das Widget meldet seine Content-Höhe → Vorschau ohne Leerraum.
  const [autoHeight, setAutoHeight] = useState<number | null>(null);
  useEffect(() => setAutoHeight(null), [src]);
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (!iframeRef.current || e.source !== iframeRef.current.contentWindow) return;
      const d = e.data as { type?: string; height?: number } | null;
      if (d && d.type === "widget:height" && typeof d.height === "number" && d.height > 0) {
        setAutoHeight(Math.ceil(d.height));
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  const effectiveWidth = variant.fixedWidth ?? frameW;

  return (
    <div style={{ ...S.frameContainer, maxWidth: effectiveWidth }}>
      {showVariantLabel && <div style={S.variantLabel}>{variant.label}</div>}
      <iframe
        ref={iframeRef}
        src={src}
        title={variant.label}
        onLoad={() => setIframeReady(true)}
        style={{ ...S.iframe, height: autoHeight ?? variant.height }}
      />
      <EmbedSnippet
        variant={variant}
        attribution={attribution}
        theme={theme}
        settings={settings}
        autoswitch={autoswitch}
      />
    </div>
  );
}

function EmbedSnippet({
  variant,
  attribution,
  theme,
  settings,
  autoswitch,
}: {
  variant: WidgetVariant;
  attribution: Attribution;
  theme: WidgetThemeSelection;
  settings?: WidgetSettings;
  autoswitch: number;
}) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const qs = new URLSearchParams(buildWidgetThemeQuery(theme));
  if (variant.params) Object.entries(variant.params).forEach(([k, val]) => qs.set(k, val));
  if (autoswitch > 0) qs.set("auto", String(autoswitch));
  if (settings) {
    buildWidgetSettingsQuery(settings).forEach((val, key) => qs.set(key, val));
  }
  const query = qs.toString();
  const url = `${SITE_URL}${variant.src}${query ? `?${query}` : ""}`;
  const width = variant.fixedWidth ?? 480;

  // The <a> below the iframe lives in the HOST page's HTML — that anchor, not
  // the iframe src, is what search engines count as a backlink to solar-check.io.
  const code = [
    `<iframe`,
    `  src="${url}"`,
    `  width="${width}"`,
    `  height="${variant.height}"`,
    `  style="border:0;display:block;width:100%;max-width:${width}px"`,
    `  title="${variant.label} — Solar Check"`,
    `  loading="lazy"`,
    `></iframe>`,
    `<p style="margin:6px 0 0;font:13px/1.4 system-ui,sans-serif">`,
    `  <a href="${SITE_URL}${attribution.path}" target="_blank" rel="noopener">${attribution.text}</a>`,
    `</p>`,
  ].join("\n");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // noop
    }
  };

  return (
    <div style={S.snippetWrap}>
      <div style={S.snippetHeader}>
        <button type="button" onClick={() => setOpen((o) => !o)} style={S.snippetToggle} aria-expanded={open}>
          <IconChevronDown
            size={iconSizes.md}
            color={v("--color-text-secondary")}
            style={{ transition: "transform 0.15s ease", transform: open ? "rotate(180deg)" : "none" }}
          />
          Einbettungs-Code
        </button>
        <button type="button" onClick={copy} style={S.snippetCopyBtn}>
          {copied ? "Kopiert!" : "Kopieren"}
        </button>
      </div>
      {open && (
        <pre style={S.snippetPre}>
          <code>{code}</code>
        </pre>
      )}
    </div>
  );
}

function PrivacySnippet() {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(PRIVACY_SNIPPET);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // noop
    }
  };

  return (
    <div style={S.snippetWrap}>
      <div style={S.snippetHeader}>
        <button type="button" onClick={() => setOpen((o) => !o)} style={S.snippetToggle} aria-expanded={open}>
          <IconChevronDown
            size={iconSizes.md}
            color={v("--color-text-secondary")}
            style={{ transition: "transform 0.15s ease", transform: open ? "rotate(180deg)" : "none" }}
          />
          Textbaustein für deine Datenschutzerklärung
        </button>
        <button type="button" onClick={copy} style={S.snippetCopyBtn}>
          {copied ? "Kopiert!" : "Kopieren"}
        </button>
      </div>
      {open && (
        <pre style={S.snippetPre}>
          <code>{PRIVACY_SNIPPET}</code>
        </pre>
      )}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: {
    background: v("--color-bg"),
    fontFamily: v("--font-text"),
    color: v("--color-text-primary"),
    minHeight: "100vh",
    paddingTop: 20,
  },
  wrap: { maxWidth: 720, margin: "0 auto", padding: "0 16px 64px" },
  h1: { fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em", marginTop: 0, marginBottom: 10 },
  subtitle: { fontSize: 15, color: v("--color-text-secondary"), marginBottom: 28, lineHeight: 1.55 },
  rules: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 12,
    marginBottom: 44,
  },
  ruleCard: {
    background: v("--color-bg-muted"),
    border: `1px solid ${v("--color-border")}`,
    borderRadius: 12,
    padding: 16,
  },
  ruleIcon: { marginBottom: 10 },
  ruleTitle: { fontSize: 14, fontWeight: 700, marginBottom: 4, color: v("--color-text-primary") },
  ruleBody: { fontSize: 13, color: v("--color-text-secondary"), lineHeight: 1.5 },
  privacySection: { marginBottom: 44, paddingBottom: 24, borderBottom: `1px solid ${v("--color-border")}` },
  themePanel: {
    marginBottom: 44,
    padding: 16,
    background: v("--color-bg-accent"),
    border: `1px solid ${v("--color-border-accent")}`,
    borderRadius: 14,
  },
  themePanelSticky: {
    position: "sticky" as const,
    top: 12,
    zIndex: 50,
    boxShadow: v("--shadow-lg"),
  },
  themePanelHead: {
    display: "flex",
    alignItems: "baseline",
    flexWrap: "wrap" as const,
    gap: "2px 10px",
    marginBottom: 14,
  },
  themePanelTitle: { fontSize: 17, fontWeight: 700, margin: 0 },
  themePanelHint: { fontSize: 12.5, color: v("--color-text-muted") },
  resetBtn: {
    marginLeft: "auto",
    padding: "5px 12px",
    fontSize: 12.5,
    fontWeight: 600,
    background: v("--color-bg"),
    color: v("--color-text-secondary"),
    border: `1px solid ${v("--color-border")}`,
    borderRadius: 8,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  themeGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: 16,
    alignItems: "start",
  },
  section: { marginBottom: 44, paddingBottom: 24, borderBottom: `1px solid ${v("--color-border")}` },
  h2: { fontSize: 20, fontWeight: 700, marginTop: 0, marginBottom: 8 },
  sectionIntro: { fontSize: 14, color: v("--color-text-secondary"), lineHeight: 1.5, marginTop: 0, marginBottom: 16 },
  hint: { fontSize: 12, color: v("--color-text-muted"), marginTop: 6, lineHeight: 1.5 },
  label: {
    fontSize: 11,
    fontWeight: 700,
    color: v("--color-text-secondary"),
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
    marginBottom: 8,
  },
  controls: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: 24,
    padding: 16,
    background: v("--color-bg-muted"),
    border: `1px solid ${v("--color-border")}`,
    borderRadius: 12,
    marginBottom: 16,
  },
  btnRow: { display: "flex", flexWrap: "wrap" as const, gap: 8 },
  btn: {
    padding: "8px 12px",
    fontSize: 12.5,
    fontWeight: 600,
    background: v("--color-bg"),
    color: v("--color-text-primary"),
    border: `1px solid ${v("--color-border")}`,
    borderRadius: 8,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  btnActive: {
    background: v("--color-accent"),
    color: v("--color-text-on-accent"),
    border: `1px solid ${v("--color-accent")}`,
  },
  colorRow: { display: "flex", alignItems: "center", gap: 8, cursor: "pointer" },
  colorSwatch: {
    width: 40,
    height: 32,
    padding: 0,
    border: `1px solid ${v("--color-border")}`,
    borderRadius: 8,
    background: "none",
    cursor: "pointer",
  },
  colorValue: { fontSize: 12.5, fontFamily: v("--font-mono"), color: v("--color-text-secondary") },
  slider: { width: "100%", accentColor: v("--color-accent"), cursor: "pointer", margin: "6px 0" },
  variantRow: {
    display: "flex",
    flexWrap: "wrap" as const,
    alignItems: "flex-start",
    gap: 24,
    justifyContent: "center",
  },
  frameContainer: { width: "100%", transition: "max-width 0.2s ease-out" },
  variantLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: v("--color-text-muted"),
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
    marginBottom: 8,
    textAlign: "center" as const,
  },
  iframe: { width: "100%", border: 0, display: "block", background: "transparent" },
  snippetWrap: {
    marginTop: 12,
    border: `1px solid ${v("--color-border")}`,
    borderRadius: 8,
    overflow: "hidden",
    background: v("--color-bg-muted"),
  },
  snippetHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "6px 8px 6px 10px",
  },
  snippetToggle: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    background: "none",
    border: 0,
    padding: 0,
    fontSize: 11,
    fontWeight: 700,
    color: v("--color-text-secondary"),
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  snippetCopyBtn: {
    padding: "3px 10px",
    fontSize: 11,
    fontWeight: 600,
    background: v("--color-accent"),
    color: v("--color-text-on-accent"),
    border: 0,
    borderRadius: 6,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  snippetPre: {
    margin: 0,
    padding: "10px 12px",
    borderTop: `1px solid ${v("--color-border")}`,
    fontSize: 11,
    lineHeight: 1.45,
    fontFamily: v("--font-mono"),
    color: v("--color-text-primary"),
    whiteSpace: "pre-wrap" as const,
    wordBreak: "break-all" as const,
  },
};
