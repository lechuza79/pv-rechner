import type { Candidate, DiscoveryReport } from './story-discovery';
import type { Fund } from './social-funde';

/** This metadata must come from the source-backed finder run, never from
 * social_funde.zuletzt_gesehen (which is only the time of a database write). */
export type LegacyFindingProvenance = {
  kind: 'recomputed'; sourceDate: string; source: string; inputVersion: string;
  regionIds: string[]; period: { start: string; end: string; label: string };
  /** Human-readable meaning for every original formatter key. */
  units: Record<string, string>;
};
export type LegacyAdaptation =
  | { status: 'ready'; candidate: Candidate }
  | { status: 'unavailable'; reasons: string[] };
const family = { ausreisser: 'Original-Ortsausreißer', anomalie: 'Original-Zeitraumvergleich' } as const;
const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value)
  && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;

/** The stored inventory is not automatically a current data source. Keep its
 * exact statement and numbers only after rerunning a supported original finder.
 * Unsupported families are coverage gaps, not editorial approval requests. */
export function adaptLegacyFund(
  fund: Fund,
  context: { regionId: string; sourceDate: string; provenance?: LegacyFindingProvenance },
): LegacyAdaptation {
  const reasons: string[] = [];
  const p = context.provenance;
  if (!(fund.muster in family)) reasons.push(`Originalmuster ${fund.muster}: Herkunft und Aussage noch nicht an diese Datenbasis angeschlossen.`);
  if (!p) reasons.push('Der gespeicherte Fund enthält keinen belegten Quellenstand. Zuletzt gesehen ist kein Datenstand; Originalfinder mit aktueller Basis erneut ausführen.');
  if (p) {
    if (p.kind !== 'recomputed' || !p.inputVersion.trim() || !p.source.trim()) reasons.push('Nachgerechnete Herkunft mit Quelle und Eingabeversion fehlt.');
    if (!validDate(p.sourceDate) || p.sourceDate !== context.sourceDate) reasons.push('Quellenstand des Originalfundes stimmt nicht mit dem aktuellen Lauf überein.');
    if (!/^\d{8}$/.test(context.regionId) || !p.regionIds.includes(context.regionId)) reasons.push('Keine eindeutige Zuordnung zu dieser Gemeinde; ein gleicher Ortsname genügt nicht.');
    if (!validDate(p.period.start) || !validDate(p.period.end) || p.period.start > p.period.end || p.period.end > p.sourceDate || !p.period.label.trim()) reasons.push('Gültige Bezugsperiode des Befundes fehlt.');
    if (fund.werte.some(v => !p.units[v.einheit]?.trim())) reasons.push('Mindestens eine Messgröße hat keine belegte Einheit; Formatierungsnamen sind keine Einheiten.');
  }
  if (!fund.kennung.trim() || !fund.satz.trim() || !fund.grundlage.trim()) reasons.push('Kennung, Aussage oder Vergleichsgrundlage fehlen.');
  if (fund.werte.length < 2 || fund.werte.some(v => !v.name.trim() || !Number.isFinite(v.wert) || v.wert < 0)) reasons.push('Keine vollständigen, endlichen Vergleichswerte vorhanden.');
  if (reasons.length || !p) return { status: 'unavailable', reasons };
  const period = p.period.label;
  return { status: 'ready', candidate: {
    id: `${context.regionId}-original-${fund.kennung}-${p.period.start}-${p.period.end}`,
    family: family[fund.muster as keyof typeof family], title: fund.satz, status: 'ready', priority: 50,
    period, comparison: fund.grundlage,
    evidence: fund.werte.map(v => ({ label: v.name, value: v.wert, unit: p.units[v.einheit] })),
    reason: `Originalfinder ${fund.muster}, neu gerechnet mit ${p.source}; Quellenstand ${p.sourceDate}. ${fund.grundlage}`,
    limitations: fund.muster === 'anomalie'
      ? ['Registrierte Inbetriebnahmen aktuell aktiver Einheiten; kein rekonstruierter damaliger Anlagenbestand.', 'Beschreibender Zeitraumvergleich, keine Bereinigung um Saison und Wachstum; kein Nachweis einer Förderwirkung.']
      : ['Beschreibender Vergleich innerhalb der angegebenen Grundmenge; keine Kausalitätsaussage.'],
    related: [], visual: fund.muster === 'anomalie' ? 'Periodenvergleich' : 'Ortsvergleich',
    eventKey: `original-${fund.kennung}-${p.period.start}-${p.period.end}`,
  } };
}

export function addLegacyFindings(
  report: DiscoveryReport,
  entries: { fund: Fund; provenance?: LegacyFindingProvenance }[],
): { accepted: number; unavailable: { id: string; reasons: string[] }[] } {
  const unavailable: { id: string; reasons: string[] }[] = [];
  const ids = new Set(report.candidates.map(c => c.id));
  let accepted = 0;
  for (const entry of entries) {
    const result = adaptLegacyFund(entry.fund, { regionId: report.regionId, sourceDate: report.sourceDate, provenance: entry.provenance });
    if (result.status === 'unavailable') { unavailable.push({ id: entry.fund.kennung, reasons: result.reasons }); continue; }
    if (ids.has(result.candidate.id)) continue;
    report.candidates.push(result.candidate); ids.add(result.candidate.id); accepted++;
  }
  report.checks.push({ family: 'Originalfundvorrat', status: unavailable.length ? 'missing' : accepted ? 'found' : 'none',
    reason: `${accepted} nachgerechnete Originalbefunde angeschlossen; ${unavailable.length} ohne ausreichende Datenanbindung. Gespeicherte Fundtexte ersetzen keine Quelldaten.` });
  return { accepted, unavailable };
}
