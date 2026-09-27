"use client";

import { Children, cloneElement, isValidElement, createContext, useContext, useState } from "react";
import { AccordionField } from "./AccordionField";
import OptionCard from "./OptionCard";

import { DEFAULT_HEATPUMP_CONFIG, begStufeAm, type BegStufe } from "../lib/heatpump-config";
import { BEG_EINKOMMEN_OPTIONS } from "../lib/beg-funding-options";

const cfg = DEFAULT_HEATPUMP_CONFIG;
const nf = (n: number) => n.toLocaleString("de-DE");
export type BegFundingScreen = "gebaeude" | "heizung" | "alter" | "nutzung" | "einkommen" | "kind" | "result";

const FundingChoice = createContext<{ selected?: string; choose: (label: string) => void; compactTitle: boolean } | null>(null);
const QUESTION_TITLES: Record<BegFundingScreen, string> = {
  gebaeude: "Gebäude", heizung: "Vorhandene Heizung", alter: "Heizungsalter",
  nutzung: "Nutzung", einkommen: "Haushaltseinkommen", kind: "Kinder im Haushalt", result: "Ergebnis",
};

type FundingQuestionProps = Parameters<typeof FundingQuestionContent>[0];

/** Reuses the input flow's disclosure and option components for embedded checks. */
export function BegFundingQuestions(props: FundingQuestionProps & { progressive?: boolean; initialAnswers?: Partial<Record<BegFundingScreen, string>>; onEditScreen?: (screen: BegFundingScreen) => void }) {
  const [answers, setAnswers] = useState<Partial<Record<BegFundingScreen, string>>>(props.initialAnswers ?? {});
  const [visited, setVisited] = useState<BegFundingScreen[]>(Object.keys(props.initialAnswers ?? {}) as BegFundingScreen[]);
  const [collapsed, setCollapsed] = useState<BegFundingScreen | null>(null);
  if (!props.progressive) return <FundingQuestionContent {...props} />;
  const screens = [...new Set([...visited, ...(props.screen === "result" ? [] : [props.screen])])];
  return <>{screens.map(screen => <AccordionField key={screen} completedStyle="check"
    label={QUESTION_TITLES[screen]} open={props.screen === screen && collapsed !== screen}
    answered={!!answers[screen]} summary={answers[screen]}
    onEdit={() => {
      if (props.screen === screen) setCollapsed(collapsed === screen ? null : screen);
      else { setCollapsed(null); props.onEditScreen?.(screen); }
    }}>
    <FundingChoice.Provider value={{ compactTitle: true, selected: answers[screen], choose: label => setAnswers(previous => ({ ...previous, [screen]: label })) }}>
      <FundingQuestionContent {...props} screen={screen} go={next => {
        setCollapsed(null);
        setVisited(previous => {
          const index = previous.indexOf(screen);
          return index < 0 ? [...previous, screen] : previous.slice(0, index + 1);
        });
        props.go(next);
      }} />
    </FundingChoice.Provider>
  </AccordionField>)}</>;
}

function FundingQuestionContent({
  screen,
  go,
  setNeubau,
  setFossil,
  setAlterUnbekannt,
  setSelbstnutzer,
  setEinkommen,
  setKind,
  stufe = begStufeAm(new Date()),
  onHeatingCategory,
  unknownAgeBonus = true,
}: {
  screen: BegFundingScreen;
  go: (s: BegFundingScreen) => void;
  setNeubau: (v: boolean) => void;
  setFossil: (v: boolean) => void;
  setAlterUnbekannt: (v: boolean) => void;
  setSelbstnutzer: (v: boolean) => void;
  setEinkommen: (v: string) => void;
  setKind: (v: boolean) => void;
  stufe?: BegStufe;
  unknownAgeBonus?: boolean;
  onHeatingCategory?: (category: "fossil" | "gas" | "other") => void;
}) {
  if (screen === "gebaeude") {
    return (
      <Question title="Um welches Gebäude geht es?">
        <OptionRow
          label="Bestandsgebäude"
          sub="Bereits bewohnt, Heizung wird getauscht"
          onClick={() => {
            setNeubau(false);
            go("nutzung");
          }}
        />
        <OptionRow
          label="Neubau"
          sub="Noch nicht fertiggestellt"
          onClick={() => {
            setNeubau(true);
            go("result");
          }}
        />
      </Question>
    );
  }

  if (screen === "heizung") {
    // Klima-Geschwindigkeits-Bonus hängt von der Art der alten Heizung ab:
    //  • Öl / Kohle / Nachtspeicher → immer (kein Mindestalter)
    //  • Gas / Biomasse (Holz, Pellets) → nur ab 20 Jahren → Folgefrage "alter"
    //  • alles andere (schon Strom-WP etc.) → kein Klima-Bonus
    return (
      <Question
        title="Welche Heizung ersetzt du?"
        hint="Die Art der alten Heizung entscheidet über den Klima-Geschwindigkeits-Bonus."
      >
        <OptionRow
          label="Öl, Kohle, Gas-Etage oder Nachtspeicher"
          sub={`Klima-Bonus +${Math.round(stufe.klimaBonus * 100)} % (unabhängig vom Alter)`}
          onClick={() => {
            onHeatingCategory?.("fossil");
            setFossil(true);
            setAlterUnbekannt(false);
            go("einkommen");
          }}
        />
        <OptionRow
          label="Gas-Zentralheizung, Holz oder Pellets"
          sub="Klima-Bonus nur ab 20 Jahren – Alter wird gleich gefragt"
          onClick={() => {
            onHeatingCategory?.("gas");
            go("alter");
          }}
        />
        <OptionRow
          label="Etwas anderes"
          sub="z. B. bereits eine Strom- oder Wärmepumpenheizung – kein Klima-Bonus"
          onClick={() => {
            onHeatingCategory?.("other");
            setFossil(false);
            setAlterUnbekannt(false);
            go("einkommen");
          }}
        />
      </Question>
    );
  }

  if (screen === "alter") {
    return (
      <Question
        title="Wie alt ist die Heizung?"
        hint="Für den Klima-Geschwindigkeits-Bonus muss eine Gas-, Holz- oder Pelletheizung mindestens 20 Jahre alt sein."
      >
        <OptionRow
          label="20 Jahre oder älter"
          sub={`Klima-Bonus +${Math.round(stufe.klimaBonus * 100)} %`}
          onClick={() => {
            setFossil(true);
            setAlterUnbekannt(false);
            go("einkommen");
          }}
        />
        <OptionRow
          label="Jünger als 20 Jahre"
          sub="Kein Klima-Bonus"
          onClick={() => {
            setFossil(false);
            setAlterUnbekannt(false);
            go("einkommen");
          }}
        />
        <OptionRow
          label="Weiß ich nicht"
          sub={unknownAgeBonus ? "Wir rechnen mit Bonus und weisen im Ergebnis darauf hin" : "Ohne bestätigtes Alter rechnen wir vorerst ohne Austauschbonus"}
          onClick={() => {
            setFossil(unknownAgeBonus);
            setAlterUnbekannt(true);
            go("einkommen");
          }}
        />
        <details style={{ marginTop: 4 }}>
          <summary
            style={{
              fontSize: "var(--font-size-small)",
              color: "var(--widget-accent)",
              cursor: "pointer",
              listStyle: "none",
              fontWeight: 600,
            }}
          >
            Woran erkenne ich das Alter?
          </summary>
          <div style={{ fontSize: "var(--font-size-small)", color: "var(--widget-muted)", lineHeight: 1.5, marginTop: 6 }}>
            Auf dem Typenschild am Heizkessel steht das Bau- oder Herstellungsjahr. Alternativ findest du das
            Datum im letzten Schornsteinfeger-Protokoll oder auf der Rechnung bzw. dem Übergabeprotokoll der
            Heizungsinstallation.
          </div>
        </details>
      </Question>
    );
  }

  if (screen === "nutzung") {
    // Steht bewusst VOR den Heizungsfragen: Klima- und Einkommens-Bonus setzen beide
    // Selbstnutzung voraus. Für Vermieter bleibt nur die Grundförderung — dann sind
    // Heizungstyp und Alter für die Förderung ohne Wirkung und werden übersprungen.
    return (
      <Question
        title="Bewohnst du das Gebäude selbst?"
        hint="Klima- und Einkommens-Bonus gibt es nur für selbstnutzende Eigentümer."
      >
        <OptionRow
          label="Ja, ich wohne selbst darin"
          sub="Klima- und Einkommens-Bonus möglich"
          onClick={() => {
            setSelbstnutzer(true);
            go("heizung");
          }}
        />
        <OptionRow
          label="Nein, ich vermiete"
          sub={`Nur die Grundförderung von ${Math.round(stufe.grundfoerderung * 100)} %`}
          onClick={() => {
            setSelbstnutzer(false);
            go("result");
          }}
        />
      </Question>
    );
  }

  if (screen === "einkommen") {
    return (
      <Question
        title="Zu versteuerndes Haushaltseinkommen?"
        hint="Gemeint ist das zu versteuernde Einkommen laut Steuerbescheid: der Durchschnitt des zweiten und dritten Jahres vor dem Antrag. Zusammen zählen Antragsteller, im Haushalt lebende Miteigentümer und ihre Partner."
      >
        {BEG_EINKOMMEN_OPTIONS.map((o) => (
          <OptionRow
            key={o.key}
            label={o.label}
            sub={o.sub}
            onClick={() => {
              setEinkommen(o.key);
              // Kind hebt nur bei einer Bonus-Stufe die Grenze — sonst überspringen.
              go(o.income != null ? "kind" : "result");
            }}
          />
        ))}
      </Question>
    );
  }

  if (screen === "kind") {
    return (
      <Question
        title="Lebt ein kindergeldberechtigtes Kind unter 18 Jahren im Haushalt?"
        hint={`Ein dort mit Hauptwohnsitz lebendes, kindergeldberechtigtes Kind unter 18 hebt die maßgebliche Einkommensgrenze um ${nf(cfg.begFamilienzuschlag)} € – die Anzahl spielt keine Rolle. Dadurch kann eine höhere Bonusstufe greifen.`}
      >
        <OptionRow
          label="Ja"
          sub={`Einkommensgrenze +${nf(cfg.begFamilienzuschlag)} €`}
          onClick={() => {
            setKind(true);
            go("result");
          }}
        />
        <OptionRow
          label="Nein"
          onClick={() => {
            setKind(false);
            go("result");
          }}
        />
      </Question>
    );
  }

  return null;
}

function Question({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  const choice = useContext(FundingChoice);
  return (
    <div>
      {!choice?.compactTitle && <div style={{ fontSize: "var(--font-size-body)", fontWeight: 700, marginBottom: hint ? 4 : 10 }}>{title}</div>}
      {hint && <div style={{ fontSize: "var(--font-size-small)", color: "var(--widget-muted)", lineHeight: 1.45, marginBottom: 10 }}>{hint}</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{Children.map(children, (child, index) => isValidElement<{ choiceIndex?: number }>(child) ? cloneElement(child, { choiceIndex: choice?.compactTitle ? index : undefined }) : child)}</div>
    </div>
  );
}

function OptionRow({ label, sub, onClick, choiceIndex }: { label: string; sub?: string; onClick: () => void; choiceIndex?: number }) {
  const choice = useContext(FundingChoice);
  return <OptionCard choiceIndex={choiceIndex} label={label} sub={sub ?? ""} selected={choice?.selected === label}
    onClick={() => { choice?.choose(label); onClick(); }} />;
}
