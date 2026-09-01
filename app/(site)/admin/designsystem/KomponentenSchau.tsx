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
        marginBottom: space.md,
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
          <span style={{ fontSize: v("--font-size-small"), color: v("--color-text-faint") }}>
            Noch kein Beispiel — der Baustein existiert, steht hier aber noch nicht bedienbar.
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
            {teile.map((b) => (
              <Karte key={b.name} b={b} />
            ))}
          </div>
        );
      })}
    </>
  );
}
