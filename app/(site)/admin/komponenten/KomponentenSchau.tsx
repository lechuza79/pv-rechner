"use client";

import { useState } from "react";
import { AccordionField } from "../../../../components/AccordionField";
import BackLink from "../../../../components/BackLink";
import Breadcrumb from "../../../../components/Breadcrumb";
import InfoTooltip from "../../../../components/InfoTooltip";
import InlineEdit from "../../../../components/InlineEdit";
import { LoadingDots } from "../../../../components/LoadingDots";
import Modal from "../../../../components/Modal";
import OptionCard from "../../../../components/OptionCard";
import PresetNumberInput from "../../../../components/PresetNumberInput";
import RelatedLinks from "../../../../components/RelatedLinks";
import ResultSection from "../../../../components/ResultSection";
import SelectField from "../../../../components/SelectField";
import { SortPfeil } from "../../../../components/SortPfeil";
import Switch from "../../../../components/Switch";
import Toast from "../../../../components/Toast";
import TriToggle from "../../../../components/TriToggle";
import Logo from "../../../../components/Logo";
import ChartActionBar from "../../../../components/ChartActionBar";
import DataSourceList from "../../../../components/DataSourceList";
import FlowNav from "../../../../components/FlowNav";
import StandortField from "../../../../components/StandortField";
import StandNoteView from "../../../../components/StandNoteView";
import { AuswahlSkipper } from "../../../../components/AuswahlSkipper";
import { DataSourceNote } from "../../../../components/PoweredBy";
import { ErrorBoundary } from "../../../../components/ErrorBoundary";
import * as Icons from "../../../../components/Icons";
import { DATA_SOURCES } from "../../../../lib/data-sources";
import DachField from "../../../../components/DachField";
import GebaeudeField, { type GebaeudeWerte } from "../../../../components/GebaeudeField";
import type { TiltOrientation } from "../../../../lib/tilt-config";
import CiteModal from "../../../../components/CiteModal";
import ChartExportBar from "../../../../components/ChartExportBar";
import { WIDGETS } from "../../../../lib/widget-registry";
import { BAUSTEINE, GRUPPEN, verwendetVon, type Baustein } from "../../../../lib/bausteine-registry";
import { v, space, pad } from "../../../../lib/theme";

// ─── Die Komponenten, echt und bedienbar. ────────────────────────────────────
//
// Kein Bild und keine Beschreibung: Was hier steht, IST der Baustein. Ein
// nachgezeichnetes Beispiel wäre eine zweite Fassung, die beim ersten Umbau
// falsch wird — dieselbe Systematik, aus der die Beispielzahlen der Ratgeber
// live gerechnet werden statt getippt.
//
// Welcher Baustein hier ein Beispiel hat, entscheidet BEISPIELE. Fehlt eines,
// sagt die Karte das, statt die Lücke zu verschweigen — und
// lib/__tests__/bausteine-registry.test.ts hält die Liste gegen das Register.

/** Ein Beispiel je Baustein. Der Schlüssel ist sein Name im Register. */
type Beispiel = () => React.ReactNode;

function Reihe({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: space.md, alignItems: "flex-start" }}>{children}</div>
  );
}

/** Beschriftung eines einzelnen Zustands innerhalb eines Beispiels. */
function Zustand({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: space.xs, minWidth: 0 }}>
      <span
        style={{
          fontSize: v("--font-size-caption"),
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          color: v("--color-text-faint"),
        }}
      >
        {name}
      </span>
      {children}
    </div>
  );
}

function OptionCardBeispiel() {
  const [gewaehlt, setGewaehlt] = useState<number | null>(null);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: space.sm, maxWidth: 420 }}>
      {["Weg", "Teils", "Zuhause"].map((l, i) => (
        <OptionCard
          key={l}
          selected={gewaehlt === i}
          onClick={() => setGewaehlt(i)}
          label={l}
          sub={["tagsüber außer Haus", "gemischt", "meist da"][i]}
        />
      ))}
    </div>
  );
}

function SchalterBeispiel() {
  const [a, setA] = useState(true);
  const [b, setB] = useState(false);
  return (
    <Reihe>
      <Zustand name="an">
        <Switch an={a} onChange={setA} label="Wärmepumpe" text="rechnet mit" />
      </Zustand>
      <Zustand name="aus">
        <Switch an={b} onChange={setB} label="E-Auto" text="rechnet nicht mit" />
      </Zustand>
      <Zustand name="klein">
        <Switch an={a} onChange={setA} label="Deutschland einblenden" text="Vergleich" size="sm" />
      </Zustand>
    </Reihe>
  );
}

function AbschnittBeispiel() {
  const [aktiv, setAktiv] = useState(true);
  return (
    <div style={{ maxWidth: 460, display: "grid", gap: space.sm }}>
      <ResultSection title="Dein Dach" summary="Satteldach · Ost / West">
        <p style={{ margin: 0, fontSize: v("--font-size-body"), color: v("--color-text-secondary") }}>
          Hier stehen im Ergebnis die Felder, mit denen sich die Annahme ändern lässt.
        </p>
      </ResultSection>
      <ResultSection
        title="Wärmepumpe"
        summary={aktiv ? "3.500 kWh im Jahr" : "rechnet nicht mit"}
        aktiv={aktiv}
        setAktiv={setAktiv}
        aktivLabel="Wärmepumpe rechnet mit"
      >
        <p style={{ margin: 0, fontSize: v("--font-size-body"), color: v("--color-text-secondary") }}>
          Ausgeschaltet klappt der Inhalt zu — Einstellungen zu zeigen, die gerade nichts bewirken,
          sieht bedienbar aus und ist es nicht.
        </p>
      </ResultSection>
    </div>
  );
}

function AkkordeonBeispiel() {
  const [offen, setOffen] = useState(true);
  const [wahl, setWahl] = useState<number | null>(null);
  return (
    <div style={{ maxWidth: 460 }}>
      <AccordionField
        label="Dachform"
        open={offen}
        answered={wahl !== null}
        summary={wahl !== null ? ["Satteldach", "Flachdach", "Pultdach"][wahl] : undefined}
        onEdit={() => setOffen(true)}
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: space.sm }}>
          {["Satteldach", "Flachdach", "Pultdach"].map((l, i) => (
            <OptionCard
              key={l}
              selected={wahl === i}
              onClick={() => {
                setWahl(i);
                setOffen(false);
              }}
              label={l}
              sub=""
            />
          ))}
        </div>
      </AccordionField>
    </div>
  );
}

function DialogBeispiel() {
  const [offen, setOffen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOffen(true)}
        style={{
          padding: pad("sm", "md"),
          borderRadius: v("--radius-md"),
          border: `1px solid ${v("--color-border")}`,
          background: v("--color-bg"),
          color: v("--color-text-primary"),
          fontSize: v("--font-size-body"),
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Dialog öffnen
      </button>
      <Modal open={offen} onClose={() => setOffen(false)} title="So sieht ein Dialog aus">
        <p style={{ margin: 0, fontSize: v("--font-size-body"), lineHeight: 1.6, color: v("--color-text-secondary") }}>
          Am Rechner mittig, auf schmalen Schirmen von unten einfahrend. Escape schließt, der Fokus
          bleibt drin und springt beim Schließen auf den Knopf zurück.
        </p>
      </Modal>
    </>
  );
}

function ToastBeispiel() {
  const [a, setA] = useState(false);
  const [b, setB] = useState(false);
  const knopf: React.CSSProperties = {
    padding: pad("sm", "md"),
    borderRadius: v("--radius-md"),
    border: `1px solid ${v("--color-border")}`,
    background: v("--color-bg"),
    color: v("--color-text-primary"),
    fontSize: v("--font-size-body"),
    fontWeight: 600,
    cursor: "pointer",
  };
  return (
    <>
      <Reihe>
        <button style={knopf} onClick={() => setA(true)}>
          Aufforderung zeigen
        </button>
        <button style={knopf} onClick={() => setB(true)}>
          Auskunft zeigen
        </button>
      </Reihe>
      <Toast open={a} onClose={() => setA(false)} tone="accent">
        Mit deiner Postleitzahl wird es genauer.
      </Toast>
      <Toast open={b} onClose={() => setB(false)} tone="neutral" autoHideMs={4000}>
        Ohne Dachangabe rechnen wir mit einem Satteldach nach Süden — eher zu gut als zu schlecht.
      </Toast>
    </>
  );
}

function ZahlBeispiel() {
  const [wert, setWert] = useState(9.6);
  return (
    <span style={{ fontSize: v("--font-size-body"), color: v("--color-text-secondary") }}>
      Anlagengröße <InlineEdit value={wert} onCommit={setWert} unit=" kWp" min={1} max={30} />
    </span>
  );
}

function ZahlenfeldBeispiel() {
  const [wert, setWert] = useState(4000);
  return (
    <div style={{ maxWidth: 340 }}>
      <PresetNumberInput
        value={wert}
        presets={[2500, 3500, 4500, 6000]}
        min={500}
        max={20000}
        unit="kWh"
        onCommit={setWert}
      />
    </div>
  );
}

function AuswahlBeispiel() {
  const [wert, setWert] = useState("sued");
  return (
    <div style={{ maxWidth: 260, display: "flex" }}>
      <SelectField value={wert} onChange={(e) => setWert(e.target.value)} ariaLabel="Ausrichtung">
        <option value="sued">Süden</option>
        <option value="ostwest">Ost / West</option>
        <option value="nord">Norden</option>
      </SelectField>
    </div>
  );
}

function DreifachBeispiel() {
  const [wert, setWert] = useState("nein");
  return (
    <div style={{ maxWidth: 340 }}>
      <TriToggle
        label="Wärmepumpe"
        value={wert}
        onChange={setWert}
        options={[
          { id: "nein", label: "Nein" },
          { id: "geplant", label: "Geplant" },
          { id: "ja", label: "Ja" },
        ]}
      />
    </div>
  );
}


function FlowNavBeispiel() {
  const [gewaehlt, setGewaehlt] = useState(false);
  const [schritt, setSchritt] = useState(1);
  return (
    <div style={{ maxWidth: 420 }}>
      <p style={{ margin: `0 0 ${space.sm}px`, fontSize: v("--font-size-small"), color: v("--color-text-muted") }}>
        Schritt {schritt}. Weiter bleibt gesperrt, bis etwas gewählt ist.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: space.sm, marginBottom: space.md }}>
        {["Ja", "Nein"].map((l) => (
          <OptionCard key={l} selected={gewaehlt && l === "Ja"} onClick={() => setGewaehlt(true)} label={l} sub="" />
        ))}
      </div>
      <FlowNav
        weiterAktiv={gewaehlt}
        onWeiter={() => {
          setSchritt((n) => n + 1);
          setGewaehlt(false);
        }}
        onZurueck={schritt > 1 ? () => setSchritt((n) => n - 1) : undefined}
        zurueckSichtbar={schritt > 1}
      />
    </div>
  );
}

function StandortBeispiel() {
  const [plz, setPlz] = useState("");
  const [bestaetigt, setBestaetigt] = useState(false);
  return (
    <div style={{ maxWidth: 420 }}>
      <StandortField
        plz={plz}
        onPlzChange={(w) => {
          setPlz(w);
          setBestaetigt(false);
        }}
        loading={false}
        confirmed={bestaetigt}
        onSubmit={() => setBestaetigt(plz.length === 5)}
      />
    </div>
  );
}

function SkipperBeispiel() {
  const [wert, setWert] = useState("");
  return (
    <AuswahlSkipper
      ariaLabel="Dachform überspringen"
      wert={wert}
      onWaehle={setWert}
      eintraege={[
        { wert: "", text: "Weiß ich nicht" },
        { wert: "sued", text: "Süden" },
        { wert: "ostwest", text: "Ost / West" },
      ]}
    />
  );
}

function AbsturzBeispiel() {
  const [kaputt, setKaputt] = useState(false);
  function Kind() {
    if (kaputt) throw new Error("Absichtlich ausgelöst — so sieht der Auffangnetz-Zustand aus.");
    return (
      <span style={{ fontSize: v("--font-size-body"), color: v("--color-text-secondary") }}>
        Ein Bauteil, das gerade funktioniert.
      </span>
    );
  }
  return (
    <div style={{ display: "grid", gap: space.sm, justifyItems: "start" }}>
      <ErrorBoundary key={String(kaputt)}>
        <Kind />
      </ErrorBoundary>
      <button
        onClick={() => setKaputt((k) => !k)}
        style={{
          padding: pad("xs", "sm"),
          borderRadius: v("--radius-sm"),
          border: `1px solid ${v("--color-border")}`,
          background: v("--color-bg"),
          color: v("--color-text-primary"),
          fontSize: v("--font-size-small"),
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        {kaputt ? "wieder heil machen" : "Absturz auslösen"}
      </button>
    </div>
  );
}

function IconsBeispiel() {
  const alle = Object.entries(Icons).filter(([n]) => n.startsWith("Icon")) as [
    string,
    React.ComponentType<{ size?: number }>,
  ][];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(74px, 1fr))", gap: space.sm }}>
      {alle.map(([name, Icon]) => (
        <div key={name} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, minWidth: 0 }}>
          <Icon size={20} />
          <span
            style={{
              fontSize: v("--font-size-micro"),
              fontFamily: v("--font-mono"),
              color: v("--color-text-faint"),
              maxWidth: "100%",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {name.replace("Icon", "")}
          </span>
        </div>
      ))}
    </div>
  );
}

function AktionsleisteBeispiel() {
  const nichts = () => {};
  return (
    <Reihe>
      <Zustand name="Leiste (breite Karten)">
        <ChartActionBar
          onCopyLink={nichts}
          onDownload={nichts}
          onEmbed={nichts}
          onWhatsApp={nichts}
          onTwitter={nichts}
          isExporting={false}
          canNativeShare={false}
          variant="bar"
        />
      </Zustand>
      <Zustand name="Menü (kleine Karten)">
        <ChartActionBar
          onCopyLink={nichts}
          onDownload={nichts}
          onEmbed={nichts}
          onWhatsApp={nichts}
          onTwitter={nichts}
          isExporting={false}
          canNativeShare={false}
          variant="menu"
        />
      </Zustand>
    </Reihe>
  );
}


/** Der „schon beantwortet"-Zustand, den beide Feld-Bausteine von außen erwarten. */
function useBeantwortet() {
  const [menge, setMenge] = useState<ReadonlySet<string>>(new Set());
  return {
    beantwortet: menge,
    markiereBeantwortet: (k: string) => setMenge((m) => new Set(m).add(k)),
    nimmZurueck: (k: string) =>
      setMenge((m) => {
        const n = new Set(m);
        n.delete(k);
        return n;
      }),
  };
}

function DachFeldBeispiel() {
  const { beantwortet, markiereBeantwortet, nimmZurueck } = useBeantwortet();
  const [dachart, setDachart] = useState<number | null>(null);
  const [ausrichtung, setAusrichtung] = useState<TiltOrientation | null>(null);
  const [neigung, setNeigung] = useState<number | null>(null);
  const [bearbeitet, setBearbeitet] = useState<string | null>(null);
  return (
    <div style={{ maxWidth: 460 }}>
      <DachField
        dachartIdx={dachart}
        setDachartIdx={setDachart}
        ausrichtung={ausrichtung}
        setAusrichtung={setAusrichtung}
        neigungGrad={neigung}
        setNeigungGrad={setNeigung}
        beantwortet={beantwortet}
        markiereBeantwortet={markiereBeantwortet}
        nimmZurueck={nimmZurueck}
        bearbeitet={bearbeitet}
        setBearbeitet={setBearbeitet}
        onWeissNicht={() => undefined}
      />
    </div>
  );
}

function GebaeudeFeldBeispiel() {
  const { beantwortet, markiereBeantwortet } = useBeantwortet();
  const [werte, setWerte] = useState<GebaeudeWerte>({
    haustypIdx: 0,
    wohnflaeche: 140,
    insulationIdx: 1,
    heizsystem: "hk_alt",
  });
  const [bearbeitet, setBearbeitet] = useState<string | null>(null);
  return (
    <div style={{ maxWidth: 460 }}>
      <GebaeudeField
        werte={werte}
        setWerte={(patch) => setWerte((w) => ({ ...w, ...patch }))}
        beantwortet={beantwortet}
        markiereBeantwortet={markiereBeantwortet}
        bearbeitet={bearbeitet}
        setBearbeitet={setBearbeitet}
        onWeissNicht={() => undefined}
      />
    </div>
  );
}


function ZitierBeispiel() {
  const [offen, setOffen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOffen(true)}
        style={{
          padding: pad("sm", "md"),
          borderRadius: v("--radius-md"),
          border: `1px solid ${v("--color-border")}`,
          background: v("--color-bg"),
          color: v("--color-text-primary"),
          fontSize: v("--font-size-body"),
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Zitierhilfe öffnen
      </button>
      <CiteModal widget={WIDGETS.strommix} open={offen} onClose={() => setOffen(false)} />
    </>
  );
}

const BEISPIELE: Record<string, Beispiel> = {
  OptionCard: OptionCardBeispiel,
  Switch: SchalterBeispiel,
  TriToggle: DreifachBeispiel,
  SelectField: AuswahlBeispiel,
  PresetNumberInput: ZahlenfeldBeispiel,
  InlineEdit: ZahlBeispiel,
  AccordionField: AkkordeonBeispiel,
  Modal: DialogBeispiel,
  Toast: ToastBeispiel,
  ResultSection: AbschnittBeispiel,
  InfoTooltip: () => (
    <span style={{ fontSize: v("--font-size-body"), color: v("--color-text-secondary") }}>
      Gewinn nach 25 Jahren{" "}
      <InfoTooltip title="Gewinn nach 25 Jahren" exportNote={false}>
        Die Summe aus ersparten Stromkosten und Einspeisevergütung, abzüglich der Anschaffung.
      </InfoTooltip>
    </span>
  ),
  LoadingDots: () => (
    <Reihe>
      <Zustand name="Standard">
        <LoadingDots />
      </Zustand>
      <Zustand name="größer">
        <LoadingDots size={10} />
      </Zustand>
    </Reihe>
  ),
  Breadcrumb: () => (
    <Breadcrumb
      items={[
        { href: "/", label: "Start" },
        { href: "/balkonkraftwerk", label: "Balkonkraftwerk" },
        { label: "Rechner" },
      ]}
      jsonLd={false}
    />
  ),
  BackLink: () => <BackLink fallback="/admin" label="Zurück zur Übersicht" />,
  RelatedLinks: () => (
    <div style={{ maxWidth: 460 }}>
      <RelatedLinks
        links={[
          { href: "/photovoltaik-rechner", label: "Photovoltaik-Rechner", desc: "Amortisation für deine Anlage" },
          { href: "/balkonkraftwerk/rechner", label: "Balkonkraftwerk-Rechner", desc: "Ertrag und Ersparnis" },
        ]}
      />
    </div>
  ),
  SortPfeil: () => (
    <Reihe>
      <Zustand name="aktiv, aufsteigend">
        <SortPfeil an auf />
      </Zustand>
      <Zustand name="aktiv, absteigend">
        <SortPfeil an auf={false} />
      </Zustand>
      <Zustand name="inaktiv">
        <SortPfeil an={false} auf />
      </Zustand>
    </Reihe>
  ),
  Logo: () => <Logo />,
  FlowNav: FlowNavBeispiel,
  StandortField: StandortBeispiel,
  AuswahlSkipper: SkipperBeispiel,
  ErrorBoundary: AbsturzBeispiel,
  Icons: IconsBeispiel,
  ChartActionBar: AktionsleisteBeispiel,
  CiteModal: ZitierBeispiel,
  ChartExportBar: () => (
    <ChartExportBar
      onDownload={() => undefined}
      onWhatsApp={() => undefined}
      onTwitter={() => undefined}
      isExporting={false}
      canNativeShare={false}
    />
  ),
  DachField: DachFeldBeispiel,
  GebaeudeField: GebaeudeFeldBeispiel,
  PoweredBy: () => (
    <Reihe>
      <Zustand name="eine Quelle">
        <DataSourceNote source={DATA_SOURCES.mastr} />
      </Zustand>
      <Zustand name="mehrere">
        <DataSourceNote source={[DATA_SOURCES.energyCharts, DATA_SOURCES.ember]} />
      </Zustand>
    </Reihe>
  ),
  DataSourceList: () => (
    <div style={{ maxHeight: 260, overflow: "auto" }}>
      <DataSourceList />
    </div>
  ),
  StandNoteView: () => (
    <StandNoteView
      seite={{
        // Beispieldaten, keine echten Stände: Die Zeile ist hier der Baustein,
        // nicht die Auskunft. Die echten Stände einer Seite kommen aus lib/stand.ts
        // und dürfen nirgends getippt werden.
        eintraege: [
          { was: "Marktpreise", iso: "2026-08-28", praezision: "tag", wertIso: "2026-07" },
          { was: "Rechtsstand", iso: "2026-09-01", praezision: "tag" },
        ],
        live: ["Strompreis", "Standort-Ertrag"],
      }}
    />
  ),
};

/** Die Bausteine, für die es hier ein Beispiel gibt. */
export const MIT_BEISPIEL = Object.keys(BEISPIELE).sort();

function Karte({ b }: { b: Baustein }) {
  const Beispiel = BEISPIELE[b.name];
  const nutzer = verwendetVon(b.name);
  const verbindlich = b.stand === "verbindlich";
  return (
    <section
      id={`baustein-${b.name}`}
      style={{
        background: v("--color-bg"),
        border: `1px solid ${v("--color-border")}`,
        borderRadius: v("--radius-md"),
        padding: space.lg,
        height: "100%",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: space.sm, flexWrap: "wrap" }}>
        <h3 style={{ fontSize: v("--font-size-lead"), fontWeight: 700, margin: 0 }}>{b.name}</h3>
        <span
          style={{
            fontSize: v("--font-size-caption"),
            fontWeight: 700,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            borderRadius: v("--radius-sm"),
            padding: pad("xs", "sm"),
            color: verbindlich ? v("--color-positive-text") : v("--color-text-secondary"),
            background: verbindlich ? v("--color-bg-accent") : v("--color-bg-muted"),
          }}
        >
          {verbindlich ? "verbindlich" : "im Aufbau"}
        </span>
        <span style={{ fontSize: v("--font-size-small"), color: v("--color-text-muted") }}>{b.zweck}</span>
      </div>

      <div
        style={{
          marginTop: space.md,
          padding: space.md,
          borderRadius: v("--radius-sm"),
          background: v("--color-bg-muted"),
        }}
      >
        {Beispiel ? (
          <Beispiel />
        ) : (
          <span style={{ fontSize: v("--font-size-small"), color: v("--color-text-faint"), lineHeight: 1.5 }}>
            {b.keinBeispielWeil ?? "Noch kein Beispiel — der Baustein existiert, steht hier aber noch nicht bedienbar."}
          </span>
        )}
      </div>

      {(b.bestehtAus.length > 0 || nutzer.length > 0) && (
        <p style={{ fontSize: v("--font-size-small"), color: v("--color-text-muted"), margin: `${space.sm}px 0 0` }}>
          {b.bestehtAus.length > 0 ? <>Besteht aus: {b.bestehtAus.join(" · ")}</> : null}
          {b.bestehtAus.length > 0 && nutzer.length > 0 ? "   ·   " : null}
          {nutzer.length > 0 ? <>Steckt in: {nutzer.map((n) => n.name).join(" · ")}</> : null}
        </p>
      )}
    </section>
  );
}

export default function KomponentenSchau() {
  return (
    <>
      {GRUPPEN.map((g) => {
        const teile = BAUSTEINE.filter((b) => b.gruppe === g.schluessel);
        if (teile.length === 0) return null;
        return (
          <div key={g.schluessel} id={`gruppe-${g.schluessel}`} style={{ marginBottom: space.huge }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: space.sm, marginBottom: space.md }}>
              <h2 style={{ fontSize: v("--font-size-h3"), fontWeight: 700, margin: 0 }}>{g.titel}</h2>
              <span style={{ fontSize: v("--font-size-small"), color: v("--color-text-muted") }}>{g.text}</span>
            </div>
            <div
              style={{
                display: "grid",
                gap: space.md,
                // Eine Karte trägt ein bedienbares Beispiel und braucht Breite;
                // 420 px ist die Grenze, unterhalb derer die Beispiele selbst
                // umbrechen. Darüber zwei Spalten, sonst eine.
                gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))",
                alignItems: "start",
              }}
            >
              {teile.map((b) => (
                <Karte key={b.name} b={b} />
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
}
