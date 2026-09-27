import type { Candidate, DiscoveryReport } from './story-discovery';
export type FundingRate = { label: string; value: string; nur?: string[] };
export type FundingCondition = string | { text: string; nur?: string[] };
export type FundingRow = {
  id: string; archived: boolean; last_verified: string | null; source_url: string | null;
  page_changed_at?: string | null;
  data: { name: string; level: string; agsCode?: string; agsCodes?: string[]; verified?: boolean;
    status: string; rates?: FundingRate[]; conditions?: FundingCondition[]; coveredCosts?: string; maxFoerderung?: string };
};
export type FundingChange = { id: number; program_id: string; observed_at: string; feld: string; bedeutung: string; alt: string | null; neu: string | null; quelle: string | null; belegt_am: string | null };
const statuses: Record<string, string> = { aktiv: 'Aktiv', ausgeschoepft: 'Mittel ausgeschöpft', eingestellt: 'Eingestellt', pausiert: 'Pausiert' };
const techniques: Record<string, string> = { pv: 'Photovoltaik', balkon: 'Balkonkraftwerk', speicher: 'Speicher', waermepumpe: 'Wärmepumpe' };
const validDate = (value: string | null | undefined): value is string => !!value && /^\d{4}-\d{2}-\d{2}$/.test(value.slice(0, 10))
  && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value.slice(0, 10);
const validUrl = (value: string | null): value is string => { try { return !!value && ['http:', 'https:'].includes(new URL(value).protocol); } catch { return false; } };
const scopeLabel = (scope?: string[]) => scope?.length ? scope.map(s => techniques[s] ?? s).join(', ') : 'Alle geförderten Techniken';
function covers(programme: FundingRow, regionId: string): boolean {
  return !programme.archived && ['kommune', 'landkreis', 'kreis'].includes(programme.data.level)
    && [programme.data.agsCode, ...programme.data.agsCodes ?? []].some(id => !!id
      && (/^\d{8}$/.test(id) ? id === regionId : /^\d{5}$/.test(id) && regionId.startsWith(id)));
}
/** The checked source timestamp is independent of the register edition.
 * Later page changes suspend a current snapshot; historic documented changes
 * remain dated facts. A catalogue entry is never a programme launch. */
export function addFundingStories(report: DiscoveryReport, programmes: FundingRow[], changes: FundingChange[]) {
  const local = programmes.filter(p => covers(p, report.regionId));
  let added = 0, snapshots = 0;
  const unavailable: string[] = [];
  const existing = new Set(report.candidates.map(c => c.id));
  const append = (candidate: Candidate) => { if (existing.has(candidate.id)) return false; report.candidates.push(candidate); existing.add(candidate.id); return true; };
  for (const programme of local) {
    const checked = programme.last_verified, changed = programme.page_changed_at;
    const hasUncheckedChange = !!changed && (!validDate(changed) || !validDate(checked) || Date.parse(changed) > Date.parse(checked));
    if (!programme.data.verified || !validDate(checked) || !validUrl(programme.source_url) || !statuses[programme.data.status] || hasUncheckedChange) {
      unavailable.push(`${programme.data.name}: ${hasUncheckedChange ? 'Quellenseite hat sich nach der letzten Bestätigung verändert.' : 'Bestätigter Quellenstand, Quellenlink oder eindeutiger Programmstatus fehlt.'}`);
    } else {
      const rates = programme.data.rates ?? [], conditions = programme.data.conditions ?? [];
      const details: NonNullable<Candidate['details']> = [
        { label: 'Status', text: statuses[programme.data.status] },
        ...rates.map(rate => ({ label: rate.nur?.length && rate.label !== scopeLabel(rate.nur) ? `${rate.label} (${scopeLabel(rate.nur)})` : rate.label, text: rate.value })),
        ...conditions.map(condition => ({ label: typeof condition === 'string' ? 'Bedingung' : `Bedingung · ${scopeLabel(condition.nur)}`, text: typeof condition === 'string' ? condition : condition.text })),
        ...(programme.data.coveredCosts ? [{ label: 'Fördergegenstand', text: programme.data.coveredCosts }] : []),
        ...(programme.data.maxFoerderung ? [{ label: 'Höchstbetrag', text: programme.data.maxFoerderung }] : []),
      ];
      if (details.some(d => typeof d.label !== 'string' || !d.label.trim() || typeof d.text !== 'string' || !d.text.trim())) {
        unavailable.push(`${programme.data.name}: Unvollständige Fördersätze oder Bedingungen.`);
      } else if (append({ id: `${report.regionId}-funding-stock-${programme.id}`, family: 'Förderbestand',
        title: `${programme.data.name}: ${statuses[programme.data.status]}`, status: 'ready', priority: 45,
        period: checked.slice(0, 10), eventKey: `funding-stock-${programme.id}`, evidence: [], details,
        provenance: [{ label: 'Programmquelle, zuletzt bestätigt', date: checked, url: programme.source_url }],
        comparison: `Programmstatus und Konditionen zuletzt an der Quelle bestätigt am ${checked.slice(0, 10)}.`,
        reason: 'Bestehendes, örtlich zugeordnetes Förderprogramm mit bestätigtem Quellenstand; kein neuer Förderbeginn.',
        limitations: ['Die Angaben beschreiben den bestätigten Stand. Daraus folgt kein Anspruch auf Förderung.'], related: [], visual: 'Förderprogramm',
      })) snapshots++;
    }
    for (const change of changes.filter(c => c.program_id === programme.id && c.feld !== 'aufnahme' && c.bedeutung === 'inhalt'
      && validDate(c.belegt_am) && validDate(c.observed_at) && c.belegt_am.slice(0, 10) >= c.observed_at.slice(0, 10)
      && validUrl(c.quelle) && c.alt !== c.neu)) {
      if (!['status', 'rates', 'conditions', 'coveredCosts', 'maxFoerderung'].includes(change.feld)) continue;
      const labels: Record<string, string> = { status: 'Status', rates: 'Fördersätze', conditions: 'Bedingungen', coveredCosts: 'Fördergegenstand', maxFoerderung: 'Höchstbetrag' };
      if (append({ id: `${report.regionId}-funding-change-${change.id}`, family: 'Förderänderung', title: `${programme.data.name}: ${labels[change.feld]} geändert`, status: 'ready', priority: 65,
        period: change.observed_at.slice(0, 10), eventKey: `funding-${programme.id}-${change.observed_at.slice(0, 10)}`, evidence: [],
        provenance: [{ label: 'Förderänderung, Quellenbestätigung', date: change.belegt_am!, url: change.quelle! }],
        details: [{ label: 'Vorher', text: change.alt ?? 'nicht angegeben' }, { label: 'Danach', text: change.neu ?? 'entfallen' }],
        comparison: `Vorher: ${change.alt ?? 'nicht angegeben'}. Danach: ${change.neu ?? 'entfallen'}.`, reason: `Im gepflegten Förderverlauf festgestellt; Quelle: ${change.quelle}`,
        limitations: [`Festgestellt am ${change.observed_at.slice(0, 10)}, nicht automatisch an diesem Tag beschlossen. Quellenbestätigung im Verlauf: ${change.belegt_am}.`], related: [], visual: 'Änderungsvergleich',
      })) added++;
    }
  }
  report.checks.push({ family: 'Förderbestand', status: unavailable.length ? 'missing' : snapshots ? 'found' : local.length ? 'none' : 'missing',
    reason: `${snapshots} bestätigte Programmbestände. ${unavailable.join(' ')}${!local.length ? ' Kein örtlich zugeordnetes Programm im eigenen Katalog; das belegt nicht, dass keine Förderung existiert.' : ''}` });
  report.checks.push({ family: 'Gepflegter Förderverlauf', status: added ? 'found' : local.length ? 'none' : 'missing', reason: `${local.length} zugeordnete Programme, ${added} dokumentierte Änderungen mit Quellenbestätigung. Aufnahme in unseren Katalog zählt nicht als Förderbeginn. Der Katalog ist keine vollständige Historie aller örtlichen Förderprogramme.` });
}
