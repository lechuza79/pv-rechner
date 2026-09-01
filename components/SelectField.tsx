"use client";
import { IconChevronDown } from "./Icons";
import { iconSizes, v } from "../lib/theme";

/**
 * Einheitlich gestyltes Auswahlfeld statt des nackten Browser-Selects: gleiche
 * Optik wie die Text-Eingaben (Muster ContactForm) plus eigener Chevron —
 * das native Erscheinungsbild ist abgeschaltet, damit das Feld in jedem
 * Browser und jeder Theme-Stufe gleich aussieht.
 */
/**
 * Zwei Bauformen, und der Typ erzwingt, dass es genau eine ist.
 *
 * GESTEUERT ist der Normalfall: React hält den Wert. FORMULAR ist der Fall in
 * den Verwaltungsansichten, wo das Feld seinen Wert beim Absenden mitschickt
 * und React ihn gar nicht kennt. Ein Feld mit weder Wert noch Vorgabe ist immer
 * ein Fehler — deshalb steht das hier als Entweder-oder und nicht als zwei
 * optionale Felder.
 */
type Gesteuert = {
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  name?: string;
  defaultValue?: never;
};
type Formular = {
  name: string;
  defaultValue: string | number;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  value?: never;
};

export default function SelectField({
  value,
  onChange,
  name,
  defaultValue,
  ariaLabel,
  children,
  maxWidth,
  id,
  size = "md",
  block = false,
  ton = "neutral",
  ampel,
}: (Gesteuert | Formular) & {
  ariaLabel: string;
  children: React.ReactNode;
  maxWidth?: number;
  /** Für eine eigene Beschriftung daneben (`<label htmlFor>`). */
  id?: string;
  /**
   * „md" für eigenständige Felder, „sm" für dichte Zeilen — Ergebniszeilen der
   * Rechner und Tabellenfilter im Admin, wo ein Feld in Fließtexthöhe die Zeile
   * aufreißen würde. Dieselbe Staffelung wie beim Schalter, und aus demselben
   * Grund: Die Alternative war, an 32 Stellen ein nacktes Browser-Feld zu
   * benutzen, das in jedem Browser anders aussieht.
   */
  size?: "sm" | "md";
  /** Über die volle Breite statt in der Zeile mitlaufend. */
  block?: boolean;
  /**
   * „akzent" für eine Auswahl, die IM Ergebnis neben editierbaren Werten steht
   * (Referenzheizung, Wärmepumpen-Bauart). Dort ist die Auswahl selbst ein
   * geänderter Wert und muss so aussehen wie die Zahlen daneben — sonst liest
   * sie sich als Beschriftung und niemand merkt, dass man sie anfassen kann.
   */
  ton?: "neutral" | "akzent";
  /**
   * SEMANTISCHE Farbe — grün/gelb/rot einer Ampel, die den gewählten Zustand
   * trägt. Nur dafür: Hier IST die Farbe die Information, und sie hängt am
   * Wert, nicht am Baustein. Nicht als allgemeiner Ausweg benutzen, um ein
   * Feld anders aussehen zu lassen — dafür gibt es `ton` und `size`.
   */
  ampel?: { text: string; hintergrund: string };
}) {
  const klein = size === "sm";
  const akzent = ton === "akzent";
  return (
    <span
      style={{
        position: "relative",
        display: block ? "flex" : "inline-flex",
        flex: block ? undefined : 1,
        width: block ? "100%" : undefined,
        maxWidth,
      }}
    >
      <select
        id={id}
        name={name}
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        aria-label={ariaLabel}
        style={{
          appearance: "none",
          WebkitAppearance: "none",
          MozAppearance: "none",
          width: "100%",
          fontFamily: akzent ? v("--font-mono") : v("--font-text"),
          fontSize: klein ? v("--font-size-small") : v("--font-size-body"),
          fontWeight: ampel || akzent || klein ? 700 : 400,
          color: ampel?.text ?? (akzent ? v("--color-accent") : v("--color-text-primary")),
          background: ampel?.hintergrund ?? (akzent ? v("--color-accent-dim") : v("--color-bg-muted")),
          border: `1px solid ${akzent ? v("--color-accent") : v("--color-border")}`,
          // Maße wie die Texteingaben daneben (Muster Kontaktformular): gleiche
          // Ecke, gleiche Innenhöhe. Sie waren auseinandergelaufen — im
          // Kontaktformular stand das Auswahlfeld 4 px niedriger als die Felder
          // darüber und darunter, mit doppelt so runder Ecke. In einem
          // gestapelten Formular sieht man genau das.
          borderRadius: v("--radius-sm"),
          padding: klein ? "4px 26px 4px 8px" : "12px 34px 12px 12px",
          outline: "none",
          cursor: "pointer",
        }}
      >
        {children}
      </select>
      <span
        style={{
          position: "absolute",
          right: klein ? 6 : 10,
          top: "50%",
          transform: "translateY(-50%)",
          pointerEvents: "none",
          color: akzent ? v("--color-accent") : v("--color-text-secondary"),
          display: "inline-flex",
        }}
      >
        <IconChevronDown size={klein ? iconSizes.sm : iconSizes.md} />
      </span>
    </span>
  );
}
