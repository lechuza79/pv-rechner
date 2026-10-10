"use client";

import { useEffect, useState } from "react";
import Modal, { ModalSticky } from "./Modal";
import ActionButton, { ActionLink } from "./ActionButton";
import { FundingStatusBadge, FundingConditions, istDachSicht } from "./FundingProgramParts";
import FoerderFlow from "./FoerderFlow";
import { fragenFuer } from "../lib/funding-flow";
import { fundingAmount, technikenVon, saetzeFuer, type FundingTechnik } from "../lib/funding-programs";
import type { FoerderProgrammAnsicht } from "./gemeinde/GemeindeFoerderung";
import styles from "./FundingDetailModal.module.css";
import foundation from "./social/atlas-foundations.module.css";

const calculators: Record<FundingTechnik, { label: string; href: string }> = {
  pv: { label: "Photovoltaik", href: "/photovoltaik-rechner" },
  balkon: { label: "Balkonkraftwerk", href: "/balkonkraftwerk/rechner" },
  waermepumpe: { label: "Wärmepumpe", href: "/waermepumpe-rechner" },
};

export function sourceChangeLabel(iso?: string): string {
  if (!iso || Number.isNaN(Date.parse(iso))) return "Keine Änderung der Quelle erfasst";
  return `Änderung der Quelle erkannt am ${new Date(iso).toLocaleDateString("de-DE", { timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit", year: "numeric" })}`;
}

export default function FundingDetailModal({ selected, onClose, ort }: {
  selected: FoerderProgrammAnsicht | null;
  onClose: () => void;
  ort: string;
}) {
  // Keep the content mounted while the shared modal animates out.
  const [shown, setShown] = useState(selected);
  useEffect(() => { if (selected) setShown(selected); }, [selected]);
  return <Modal open={selected !== null} onClose={onClose}
    title={<span className={styles.title}>Förderung im Detail</span>}
    ariaLabel={shown?.programm.name ?? "Förderung im Detail"}
    className={`${foundation.foundation} ${styles.dialog}`} scheme="dark" maxWidth={720}>
    {shown && <FundingProgramDetails key={shown.programm.id} selected={shown} ort={ort} scheme="dark" />}
  </Modal>;
}

/** The same program content on funding pages and inside the Atlas modal. */
export function FundingProgramDetails({selected: shown, ort, scheme = "light"}: {
  selected: FoerderProgrammAnsicht;
  ort: string;
  scheme?: "light" | "dark";
}) {
  const [check, setCheck] = useState(false);
  const [technology, setTechnology] = useState<FundingTechnik>(technikenVon(shown.programm)[0]);
  const { programm: program } = shown;
  const technologies = technikenVon(program);
  const hasQuestions = fragenFuer([program]).length > 0;
  const currentTechnology = technologies.includes(technology) ? technology : technologies[0];
  const calculator = calculators[currentTechnology];
  const calculatorHref = currentTechnology === "pv" && program.status === "aktiv" && fundingAmount(program, { technik: "pv", kwp: 10, speicherKwh: 5, kosten: 20000 }).computable
    ? `${calculator.href}?foe=${encodeURIComponent(program.id)}` : calculator.href;
  const eligibility = program.eligibility.length === 0 ? null : program.eligibility.length === 2 ? "Privatpersonen und Gewerbe" : program.eligibility[0] === "privat" ? "Privatpersonen" : "Gewerbe";
  return <div className={`${foundation.foundation} ${styles.presentation}`} data-story-scheme={scheme}>
    {check ? <div className={styles.content}>
      <ActionButton onClick={() => setCheck(false)}>Zurück zum Programm</ActionButton>
      <FoerderFlow key={program.id} programme={[program]} ortName={ort} imFenster />
    </div> : <>
      <div className={styles.meta}>
        <FundingStatusBadge status={program.status} compact />
        <span>{shown.standLabel}</span>
        {program.changedSinceIso && <span>{sourceChangeLabel(program.changedSinceIso)}</span>}
      </div>
      <article className={`${foundation.foundation} ${styles.card}`} data-story-scheme="light">
        <header className={styles.intro}>
          <p className={styles.provider}>{program.traeger}</p>
          <h3>{program.name}</h3>
          {eligibility && <p className={styles.audience}>Für {eligibility}</p>}
        </header>
        {technologies.length > 1 && <div className={styles.choices} role="group" aria-label="Technik wählen">
          {technologies.map(tech => <ActionButton key={tech} active={currentTechnology === tech}
            aria-pressed={currentTechnology === tech} onClick={() => setTechnology(tech)}>{calculators[tech].label}</ActionButton>)}
        </div>}
        <p className={styles.description}>{program.coveredCosts}</p>
        {program.capped && <p className={styles.description}>Mittel begrenzt – vor Antrag bei der offiziellen Quelle prüfen.</p>}
        <dl className={styles.rates}>
          {saetzeFuer(program.rates, currentTechnology).map((rate, index) => <div key={`${rate.label}-${index}`}>
            <dt>{rate.label}</dt><dd>{program.id === "vg-weilerbach-meilenstein-preisgeld"
              ? currentTechnology === "waermepumpe"
                ? "Für eine förderfähige Wärmepumpe gibt es einen Anteil am jährlichen Preisgeld. Ein fester Eurobetrag ist nicht zugesagt; die Verbandsgemeinde legt die Auszahlung jährlich fest."
                : rate.label === "Batteriespeicher"
                  ? "Ein Batteriespeicher erhöht den Anteil am jährlichen Preisgeld. Ein fester Eurobetrag ist nicht zugesagt."
                  : "Die Anlagengröße bestimmt den Anteil am jährlichen Preisgeld. Ein fester Eurobetrag ist nicht zugesagt; die Verbandsgemeinde legt die Auszahlung jährlich fest."
              : rate.value}</dd>
          </div>)}
        </dl>
        {program.id !== "vg-weilerbach-meilenstein-preisgeld" && (technologies.length === 1 || istDachSicht(currentTechnology)) && program.maxFoerderung && <p className={styles.description}><strong>Höchstbetrag: </strong>{program.maxFoerderung}.</p>}
        <section className={styles.requirements} aria-label="Voraussetzungen">
          <FundingConditions conditions={program.conditions} technik={currentTechnology} />
        </section>
        {shown.geltungsbereich && <section className={styles.scope}>
          <h4>Geltungsbereich</h4>
          <div className={styles.details}>
            {shown.geltungsbereich && <p>{shown.geltungsbereich}</p>}
          </div>
        </section>}
        <div className={styles.sourceRow}>
          <a href={program.url} target="_blank" rel="noopener noreferrer">Offizielle Quelle</a>
          {hasQuestions && program.status === "aktiv"
            ? <button type="button" onClick={() => setCheck(true)}>Förder-Check starten →</button>
            : null}
        </div>
      </article>
      <ModalSticky transparent><div className={styles.actions}>
        <ActionLink href={calculatorHref}>{calculator.label}-Rechner starten →</ActionLink>
      </div></ModalSticky>
    </>}
  </div>;
}
