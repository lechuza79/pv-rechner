"use client";
import { useFundingLocation } from "./FundingPageShell";
import FormError from "./FormError";
import OptionalDisclosure from "./OptionalDisclosure";
import { Pill } from "./Pill";
import { IconHelpCircle, IconUser, IconBuilding, IconArrowRight, IconExternal } from "./Icons";
import { FundingStand } from "./FundingStand";
import { dashboardDate } from "../lib/dashboard/format";
import { fundingApplication, fundingConditionGroups } from "../lib/funding-application";
import editorial from "./EditorialContent.module.css";

import { useEffect, useState, type ReactNode } from "react";
import Modal, { ModalSticky } from "./Modal";
import ActionButton, { ActionLink } from "./ActionButton";
import { FundingStatusBadge, FundingConditions, FundingRates, istDachSicht } from "./FundingProgramParts";
import FoerderFlow from "./FoerderFlow";
import { fragenFuer } from "../lib/funding-flow";
import { technikenVon, saetzeFuer, type FundingTechnik } from "../lib/funding-programs";
import type { FoerderProgrammAnsicht } from "./gemeinde/GemeindeFoerderung";
import styles from "./FundingDetailModal.module.css";
import foundation from "./social/atlas-foundations.module.css";

import { FUNDING_CALCULATORS as calculators, fundingCalculatorHref } from "../lib/funding-calculator-links";

export function sourceChangeLabel(iso?: string): string {
  if (!iso || Number.isNaN(Date.parse(iso))) return "Keine Änderung der Quelle erfasst";
  return `Änderung der Quelle erkannt am ${dashboardDate(iso)}`;
}

export default function FundingDetailModal({ selected, onClose, ort, initialTechnology }: {
  selected: FoerderProgrammAnsicht | null;
  onClose: () => void;
  ort: string;
  initialTechnology?: FundingTechnik;
}) {
  // Keep the content mounted while the shared modal animates out.
  const [shown, setShown] = useState(selected);
  useEffect(() => { if (selected) setShown(selected); }, [selected]);
  return <Modal open={selected !== null} onClose={onClose}
    title={<span className={styles.title}>Förderung im Detail</span>}
    ariaLabel={shown?.programm.name ?? "Förderung im Detail"}
    className={`${foundation.foundation} ${styles.dialog}`} scheme="dark" maxWidth={720}>
    {shown && <FundingProgramDetails key={shown.programm.id} selected={shown} ort={ort} scheme="dark" initialTechnology={initialTechnology} />}
  </Modal>;
}

/** The same program content on funding pages and inside the Atlas modal. */
export function FundingProgramDetails({selected: shown, ort, scheme = "light", context = "modal", relatedPrograms = [], initialTechnology, variant = "default", updatesAction, programActions}: {
  selected: FoerderProgrammAnsicht;
  variant?: "default" | "compact";
  updatesAction?: ReactNode;
  programActions?: ReactNode;
  ort: string;
  scheme?: "light" | "dark";
  context?: "page" | "modal";
  initialTechnology?: FundingTechnik;
  relatedPrograms?: { id: string; name: string; url: string }[];
}) {
  const compact = context === "page" && variant === "compact";
  const {dark}=useFundingLocation();
  const pageScheme = compact || (context === "page" && dark) ? "dark" : scheme;
  const [check, setCheck] = useState(false);
  const [technology, setTechnology] = useState<FundingTechnik>(initialTechnology ?? technikenVon(shown.programm)[0]);
  const { programm: program } = shown;
  const technologies = technikenVon(program);
  const hasQuestions = fragenFuer([program]).length > 0;
  const currentTechnology = technologies.includes(technology) ? technology : technologies[0];
  const calculator = calculators[currentTechnology];
  const calculatorHref = fundingCalculatorHref(program, currentTechnology);
  const application = fundingApplication(program, currentTechnology);
  const conditions = fundingConditionGroups(program, currentTechnology);
  const needsProgramSource = !!application?.portal && application.portal.url !== program.url && !application.sources.some(source => source.url === program.url);
  const showInlineCheck = context !== "page" && hasQuestions && program.status === "aktiv";
  const ProgramHeading = context === "page" ? "h2" : "h3";
  const SectionHeading = compact ? "h2" : context === "page" ? "h3" : "h4";
  const eligibility = program.eligibility.length === 0 ? null : program.eligibility.length === 2 ? "Privatpersonen und Gewerbe" : program.eligibility[0] === "privat" ? "Privatpersonen" : "Gewerbe";
  const audience = context === "page" ? program.eligibility.length > 0 && <div className={styles.audiencePills}><span>Förderung für</span>{program.eligibility.map(group => <Pill key={group} ton="ruhig" size="regular" icon={group === "privat" ? <IconUser /> : <IconBuilding />}>{group === "privat" ? "Privatpersonen" : "Gewerbe"}</Pill>)}</div> : eligibility && <p className={styles.audience}>Für {eligibility}</p>;
  return <div className={`${foundation.foundation} ${styles.presentation}`} data-story-scheme={pageScheme} data-context={context}>
    {check ? <div className={styles.content}>
      <ActionButton onClick={() => setCheck(false)}>Zurück zum Programm</ActionButton>
      <FoerderFlow key={program.id} programme={[program]} ortName={ort} imFenster />
    </div> : <>
      <article className={`${foundation.foundation} ${styles.card}`} data-story-scheme={context === "page" ? pageScheme : "light"}>
        {context !== "page" && <div className={styles.meta}>
          <FundingStatusBadge status={program.status} compact />
          {context === "modal" && <FundingStand program={program} />}
        </div>}
        <header className={styles.intro}>
          {context === "page" && !compact && <p className={styles.provider}>Förderprogramm {ort}</p>}
          {context !== "page" && <p className={styles.provider}>{program.traeger}</p>}
          {compact && <div className={styles.compactStatus}><FundingStatusBadge status={program.status} compact /><FundingStand program={program} compact />{updatesAction && <div className={styles.headerUpdates}>{updatesAction}</div>}</div>}
          {<div className={styles.programHeading}>{context === "page" && !compact && <FundingStatusBadge status={program.status} compact />}{(!compact || programActions === undefined) && <ProgramHeading>{program.name}</ProgramHeading>}</div>}
          {audience}
          {context === "page" && !compact && <div className={styles.verification}><FundingStand program={program} /></div>}
          {program.capped && !compact && <p className={styles.sourceUpdate}>Begrenzte Fördermittel. Der Status ist keine Zusage für deinen Antrag.</p>}
        </header>
        {technologies.length > 1 && <div className={styles.choices} role="group" aria-label="Technik wählen">
          {technologies.map(tech => <ActionButton key={tech} active={currentTechnology === tech}
            aria-pressed={currentTechnology === tech} onClick={() => setTechnology(tech)}>{calculators[tech].label}</ActionButton>)}
        </div>}
        {(context !== "page" || !program.rates.length) && <p className={styles.description}>{program.coveredCosts}</p>}

        <section className={styles.fundingAmounts} aria-label="Förderhöhe">
        {(!compact || program.status !== "aktiv") && <SectionHeading>{program.status === "aktiv" ? "Das wird gefördert" : "Zuletzt erfasste Konditionen"}</SectionHeading>}
        {program.id !== "vg-weilerbach-meilenstein-preisgeld" ? <FundingRates rates={program.rates} technik={currentTechnology} bordered={context !== "page"} stacked columns={context === "page" ? 2 : 1} tiles={context === "page"} headerTiles={compact} /> : <dl className={styles.rates}>
          {saetzeFuer(program.rates, currentTechnology).map((rate, index) => <div key={`${rate.label}-${index}`}>
            <dt>{rate.label}</dt><dd>{program.id === "vg-weilerbach-meilenstein-preisgeld"
              ? currentTechnology === "waermepumpe"
                ? "Für eine förderfähige Wärmepumpe gibt es einen Anteil am jährlichen Preisgeld. Ein fester Eurobetrag ist nicht zugesagt; die Verbandsgemeinde legt die Auszahlung jährlich fest."
                : rate.label === "Batteriespeicher"
                  ? "Ein Batteriespeicher erhöht den Anteil am jährlichen Preisgeld. Ein fester Eurobetrag ist nicht zugesagt."
                  : "Die Anlagengröße bestimmt den Anteil am jährlichen Preisgeld. Ein fester Eurobetrag ist nicht zugesagt; die Verbandsgemeinde legt die Auszahlung jährlich fest."
              : rate.value}</dd>
          </div>)}
        </dl>}
        </section>
        {program.id !== "vg-weilerbach-meilenstein-preisgeld" && (technologies.length === 1 || istDachSicht(currentTechnology)) && program.maxFoerderung && <p className={styles.description}><strong>Höchstbetrag: </strong>{program.maxFoerderung}.</p>}
        {compact && programActions && <><div className={styles.compactActions}>{programActions}</div><div id="foerder-programm-aktionen-ende" /></>}
        <section className={`${styles.requirements} ${compact ? styles.compactRequirements : ""}`} aria-label="Voraussetzungen">
          {compact ? <OptionalDisclosure label="Voraussetzungen" icon={<IconHelpCircle size={20} style={{color:"var(--atlas-action)"}} />}><FundingConditions technik={currentTechnology} conditions={conditions.eligibility} label="" /></OptionalDisclosure> : <><SectionHeading>Voraussetzungen</SectionHeading><FundingConditions technik={currentTechnology} conditions={conditions.eligibility} label="" /></>}
        </section>
        <section className={`${styles.scope} ${compact ? styles.applicationNotice : ""}`} aria-label="Antragstellung">
          <SectionHeading>{application ? "So beantragst du die Förderung" : "Antrag und Ablauf"}</SectionHeading>
          {compact && program.capped && <p className={styles.sourceUpdate}>Begrenztes Budget · keine Förderzusage</p>}
          {program.status !== "aktiv" && <p className={editorial.p}>Beachte den oben angegebenen Programmstatus. Die folgenden Angaben beschreiben das erfasste Verfahren, keine Zusage einer aktuellen Antragsmöglichkeit.</p>}
          {application ? <>
            {conditions.application.length > 0 && <FundingConditions technik={currentTechnology} conditions={conditions.application} label="Antragsbedingungen" />}
            <ol className={styles.applicationSteps}>{application.steps.map((step, index) => <li key={`${step.kind}-${index}`}><strong>{step.title}</strong><p>{step.text}</p></li>)}</ol>
            {!!application.documents?.length && <><h4>Benötigte Unterlagen</h4><ul>{application.documents.map(d => <li key={d.text}>{d.text}</li>)}</ul></>}
            {application.contact && <p className={editorial.p}>{application.contact.text}</p>}
            <p className={styles.sourceUpdate}>Antragsablauf geprüft am <time dateTime={application.checkedAt}>{dashboardDate(application.checkedAt)}</time>. {application.sources.map((source, index) => <span key={source.url}>{index > 0 ? " · " : " "}<a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a></span>)}</p>
          </> : <>
            {conditions.application.length > 0 && (compact ? <FormError tone="awareness" title="Vor dem Kauf beachten"><FundingConditions technik={currentTechnology} conditions={conditions.application} label="" /></FormError> : <FundingConditions technik={currentTechnology} conditions={conditions.application} label="" />)}
            <p className={editorial.p}>{conditions.application.length ? `Vollständiger Ablauf und benötigte Unterlagen: auf der Programmseite von ${program.traeger}.` : "Ein verlässlicher Antragsablauf ist hier noch nicht erfasst. Kläre vor Kauf oder Beauftragung beim Fördergeber, wann du den Antrag stellen musst und ob du die Bewilligung abwarten musst."}</p>
          </>}
          {compact && application?.portal && <p className={styles.programSource}>Förderprogramm: <a href={program.url} target="_blank" rel="noopener noreferrer">{program.name}</a></p>}
          <ActionLink variant="secondary" href={application?.portal?.url ?? program.url} target="_blank" rel="noopener noreferrer">{application?.portal?.label ?? (compact ? program.name : "Zur Programmseite beim Fördergeber")}<IconExternal size={18} /></ActionLink>
          <p className={styles.sourceUpdate}>Solar Check erklärt die Förderung. Den Antrag bearbeitet {program.traeger}.</p>
        </section>
        {context !== "page" && shown.geltungsbereich && <section className={styles.scope}>
          <SectionHeading>Geltungsbereich</SectionHeading>
          <div className={styles.details}>
            {shown.geltungsbereich && <p>{shown.geltungsbereich}</p>}
          </div>
        </section>}
        {relatedPrograms.length > 0 && <section className={`${styles.scope} ${compact ? styles.related : ""}`} aria-label="Ergänzende Förderung">
          <SectionHeading>Ergänzende Förderung</SectionHeading>
          <ul>{relatedPrograms.map(item => <li key={item.id}><ActionLink variant="text" href={item.url} target="_blank" rel="noopener noreferrer">{item.name} <IconArrowRight size={18} /></ActionLink></li>)}</ul>
        </section>}
        {(needsProgramSource || showInlineCheck) && <footer className={styles.programFooter}>
        <div className={styles.sourceRow}>
          {needsProgramSource && <a href={program.url} target="_blank" rel="noopener noreferrer">Programm beim Fördergeber: {program.traeger}</a>}
          {showInlineCheck
            ? <ActionButton variant="text" onClick={() => setCheck(true)}>Förder-Check starten <IconArrowRight size={18} /></ActionButton>
            : null}
        </div>
        </footer>}
      </article>
      {context !== "page" && <ModalSticky transparent><div className={styles.actions}>
        <ActionLink href={calculatorHref}>{calculator.label}-Rechner starten <IconArrowRight size={18} /></ActionLink>
      </div></ModalSticky>}
    </>}
  </div>;
}
