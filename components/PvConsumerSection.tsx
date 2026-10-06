'use client';

import { useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import PvConsumerFields, { consumersComplete, requiredConsumerFields, type PvConsumerKind, type PvConsumerValues } from './PvConsumerFields';
import PvConsumerComparison from './PvConsumerComparison';
import PvCoolingEditor from './PvCoolingEditor';
import AffiliateCarousel from './AffiliateCarousel';
import ResultChoiceHeader from './ResultChoiceHeader';
import MetricValue from './MetricValue';
import InfoTooltip from './InfoTooltip';
import Collapse from './Collapse';
import Modal from './Modal';
import FlowNav from './FlowNav';
import KlebenderKnopf from './KlebenderKnopf';
import { YEARS } from '../lib/constants';
import { vollEinspeisungGesperrt } from '../lib/calc';
import { calculatePvConsumerBenefit, consumerChangeLabel, consumerCoolingKwh, consumerFeedIn, consumerPatch, PV_CONSUMERS, type PvConsumerBasis, type PvConsumerChanges } from '../lib/pv-consumer-model';
import './calculator/result-design.css';
import './pv-consumer-section.css';

const NO_ANSWERS: ReadonlySet<string> = new Set();
type Action =
  | { variant?: 'calculator'; onApply: (values: PvConsumerValues, answered: ReadonlySet<string>) => void; onContinue?: never }
  | { variant: 'editorial'; onContinue: (values: PvConsumerValues) => void; onApply?: never };
export type PvConsumerSectionProps = Action & {
  id?: string;
  presentation?: { hideIntro?: boolean; hideEdit?: boolean; hideComparisons?: boolean; consumers?: readonly PvConsumerKind[]; hintConsumer?: PvConsumerKind | null };
  onSelectConsumer?: (kind: PvConsumerKind) => void;
  values: PvConsumerValues;
  basis: PvConsumerBasis;
  answered?: ReadonlySet<string>;
  /** The applied calculator total includes overrides such as manual self-consumption. */
  baselineBenefit?: number;
  manualSelfConsumption?: boolean;
  plz?: string;
  fuelType?: 'gas' | 'oil';
  onFuelTypeChange?: (fuel: 'gas' | 'oil') => void;
  onPendingChange?: (pending: boolean) => void;
  heading?: string;
  settings?: ReactNode;
  note?: ReactNode;
};

/** One consumer interaction for calculators and standalone editorial examples. */
export default function PvConsumerSection({ presentation, onSelectConsumer, id: suppliedId, values, basis, answered = NO_ANSWERS, baselineBenefit, manualSelfConsumption = false, plz = '', fuelType: appliedFuelType, onFuelTypeChange, onPendingChange, heading = 'Deinen Gewinn weiter optimieren', settings, note, ...action }: PvConsumerSectionProps) {
  const generatedId = useId();
  const id = suppliedId ?? generatedId;
  const [draft, setDraft] = useState<PvConsumerValues | null>(null);
  const [draftAnswers, setDraftAnswers] = useState<Set<string>>(new Set());
  const [kind, setKind] = useState<PvConsumerKind>('ea');
  const [changes, setChanges] = useState<PvConsumerChanges>({});
  const [addonAnswers, setAddonAnswers] = useState<Set<string>>(new Set());
  const [localFuelType, setLocalFuelType] = useState<'gas' | 'oil'>('gas');
  const fuelType = appliedFuelType ?? localFuelType;
  const setFuelType = onFuelTypeChange ?? setLocalFuelType;
  const pending: PvConsumerValues = Object.assign({}, values, ...Object.values(changes));
  const hasChanges = Object.keys(changes).length > 0;
  const editorial = action.variant === 'editorial';
  const shownConsumers = useMemo(() => PV_CONSUMERS.filter(item => !presentation?.consumers || presentation.consumers.includes(item.kind)), [presentation?.consumers]);
  const firstAvailable = shownConsumers.find(item => pending[item.kind] === 'nein')?.kind;
  useEffect(() => { onPendingChange?.(hasChanges); }, [hasChanges, onPendingChange]);
  useEffect(() => () => onPendingChange?.(false), [onPendingChange]);

  const amounts = useMemo(() => {
    if (manualSelfConsumption) return null;
    const evaluate = (v: PvConsumerValues) => calculatePvConsumerBenefit(basis, v);
    const baseline = baselineBenefit ?? evaluate(values);
    return {
      delta: evaluate(Object.assign({}, values, ...Object.values(changes))) - baseline,
      cards: Object.fromEntries(shownConsumers.map(item => {
        const patch = changes[item.kind];
        const configured = values[item.kind] !== 'nein' || !!patch;
        const card = { ...values, ...patch };
        return [item.kind, configured ? evaluate(card) - evaluate({ ...card, [item.kind]: 'nein' }) : evaluate({ ...values, [item.kind]: 'geplant' }) - baseline];
      })) as Record<PvConsumerKind, number>,
    };
  }, [basis, values, changes, baselineBenefit, manualSelfConsumption, shownConsumers]);

  const edit = (nextKind: PvConsumerKind) => {
    setKind(nextKind);
    setDraftAnswers(new Set([...answered, ...addonAnswers]));
    setDraft({ ...pending, [nextKind]: pending[nextKind] === 'nein' ? values[nextKind] === 'nein' ? 'geplant' : values[nextKind] : pending[nextKind] });
  };
  const remove = (nextKind: PvConsumerKind) => {
    setChanges(previous => {
      const next = { ...previous };
      if (values[nextKind] !== 'nein') next[nextKind] = { [nextKind]: 'nein' };
      else delete next[nextKind];
      return next;
    });
    setAddonAnswers(previous => new Set([...previous].filter(key => !requiredConsumerFields(pending, nextKind).includes(key))));
  };
  const stage = () => {
    if (!draft || !consumersComplete(draft, draftAnswers, kind)) return;
    const patch = consumerPatch(kind, draft);
    setChanges(previous => {
      const next = { ...previous };
      if (!manualSelfConsumption && Object.entries(patch).every(([key, value]) => values[key as keyof PvConsumerValues] === value)) delete next[kind];
      else next[kind] = patch;
      return next;
    });
    setAddonAnswers(new Set(draftAnswers));
    setDraft(null);
  };
  const applyBar = !editorial && hasChanges ? <footer className="pv-consumer-apply" aria-label="Verbraucher übernehmen"><div>
    <div className="pv-consumer-apply-summary"><div className="pv-consumer-apply-amount">
      {amounts ? <MetricValue signed value={amounts.delta} /> : <strong>Eigenverbrauch neu berechnen</strong>}
      <InfoTooltip size={16} ariaLabel="Änderung des PV-Vorteils erklären">{amounts ? <>Änderung deines PV-Vorteils über {YEARS} Jahre.</> : <>Dein manuell gesetzter Eigenverbrauch wird beim Aktualisieren neu berechnet.</>}</InfoTooltip>
    </div>{amounts && <p className="pv-consumer-apply-subline">{consumerChangeLabel(changes, pending)}</p>}</div>
    <FlowNav weiterLabel="Berechnung aktualisieren" weiterAktiv onWeiter={() => {
      action.onApply!(pending, new Set([...answered, ...addonAnswers]));
      setChanges({}); setAddonAnswers(new Set());
    }} />
  </div></footer> : null;

  return <section className="pv-consumer-scenarios" data-variant={editorial ? 'editorial' : 'calculator'} aria-labelledby={presentation?.hideIntro ? undefined : `${id}-heading`} aria-label={presentation?.hideIntro ? heading : undefined}>
    {!presentation?.hideIntro && <><h2 id={`${id}-heading`}>{heading}</h2>
    <p>Wärmepumpe, E-Auto und Klimaanlage können mehr von deinem Solarstrom nutzen. Die Kacheln zeigen den zusätzlichen PV-Vorteil über {YEARS} Jahre. Darunter vergleichst du die laufenden Kosten – bei Heizung, Fahren und Kühlen jeweils mit dem angegebenen Zeitraum.</p></>}
    <div className="pv-consumer-body">
    {editorial && <header className="pv-consumer-embed-header"><h3>Mehr aus deinem Solarstrom machen <InfoTooltip title="So rechnet das Beispiel">{note}</InfoTooltip></h3>{settings}</header>}
    <div className="pv-consumer-options"><AffiliateCarousel label="Weitere Verbraucher" desktopSlides={Math.min(shownConsumers.length,editorial ? 2 : 3)} previousLabel="Vorherige Verbraucher">
      {shownConsumers.map(item => {
        const patch = changes[item.kind], removed = patch?.[item.kind] === 'nein';
        const active = values[item.kind] !== 'nein', configured = active || !!patch;
        return <li key={item.kind} data-consumer={item.kind} className="wp-geraete-kachel pv-consumer-card">
          <ResultChoiceHeader wholeCard editSelected neutral surface={editorial ? "white" : undefined} clickHint={item.kind === (presentation?.hintConsumer === undefined ? firstAvailable : presentation.hintConsumer)} illustrationDecorated selected={!removed && configured} title={item.title} illustration={item.illustration}
            actionLabel={`${item.title}: ${removed ? 'Wieder hinzufügen' : active ? 'Bereits berücksichtigt' : patch ? 'Zur Vorschau hinzugefügt' : 'Ergänzen'}`}
            onSelect={() => onSelectConsumer ? onSelectConsumer(item.kind) : edit(item.kind)} onRemove={onSelectConsumer ? undefined : () => remove(item.kind)} onEdit={presentation?.hideEdit ? undefined : () => edit(item.kind)}>
            {removed ? 'Entfernt' : !amounts ? <span className="pv-consumer-period">PV-Vorteil nach Neuberechnung</span> : <>
              <MetricValue signed={configured} value={amounts.cards[item.kind]} />
              <span className="pv-consumer-period">{configured ? <>Zusätzlicher PV-Vorteil<br />über {YEARS} Jahre</> : <>PV-Vorteil über {YEARS} Jahre · Beispiel</>}</span>
            </>}
          </ResultChoiceHeader>
        </li>;
      })}
    </AffiliateCarousel></div>
    <Collapse open={!presentation?.hideComparisons && shownConsumers.some(item => pending[item.kind] !== 'nein')}>
      <div id={`${id}-comparison`} className="pv-consumer-comparison">
        {shownConsumers.map(item => <div key={item.kind} hidden={pending[item.kind] === 'nein'}>
          <PvConsumerComparison standalone fuelType={fuelType} setFuelType={setFuelType} kind={item.kind} values={pending} personen={basis.personen} baseKwh={basis.baseKwh} kwp={basis.kwp} speicherKwh={basis.storageKwh} ertragKwp={basis.yieldPerKwp} monthly={basis.monthly} klimaKwh={consumerCoolingKwh(basis, pending)} strompreis={basis.electricityPrice} scenario={basis.scenario} einspeiseSatzCt={(() => { const f = consumerFeedIn(basis, pending); return f.mode === 'aus' ? 0 : f.rate; })()} fullFeedIn={basis.feedInMode === 'voll' && !vollEinspeisungGesperrt({ wp: pending.wp, ea: pending.ea, speicherKwh: basis.storageKwh })} />
        </div>)}
      </div>
    </Collapse>
    {!editorial && settings}
    {applyBar && <KlebenderKnopf floating kinder={ref => <div ref={ref} className="pv-consumer-apply-anchor">{applyBar}</div>} leiste={applyBar} />}
    {!editorial && note}
    {editorial && <FlowNav weiterLabel="Genau ausrechnen" weiterAktiv onWeiter={() => action.onContinue!(pending)} />}
    </div>
    <Modal className="pv-consumer-dialog" open={draft !== null} onClose={() => setDraft(null)} title={`${PV_CONSUMERS.find(item => item.kind === kind)?.title} ergänzen`} intro={editorial ? 'Passe die Beispielrechnung an deine Nutzung an.' : 'Erst zur Vorschau hinzufügen, dann gemeinsam übernehmen.'}>
      {draft && <>
        <PvConsumerFields only={kind} values={draft} update={patch => setDraft(previous => previous ? { ...previous, ...patch } : previous)} answered={draftAnswers} onAnswered={key => setDraftAnswers(previous => new Set([...previous, key]))} />
        {kind === 'klima' && draft.klima !== 'nein' && <PvCoolingEditor rooms={draft.klimaRooms} kwh={draft.klimaKwh} plz={plz} price={basis.electricityPrice} onApply={klimaKwh => setDraft(previous => previous ? { ...previous, klimaKwh } : previous)} />}
        <FlowNav zurueckLabel="Abbrechen" onZurueck={() => setDraft(null)} weiterLabel="Zur Vorschau hinzufügen" weiterAktiv={consumersComplete(draft, draftAnswers, kind)} inaktivHinweis="Bitte ergänze die offenen Verbraucherangaben." onWeiter={stage} />
      </>}
    </Modal>
  </section>;
}
