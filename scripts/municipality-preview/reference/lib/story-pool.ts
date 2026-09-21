import type { Candidate, DiscoveryReport } from './story-discovery';
import { FAMILIEN } from './redaktionsplan';

/** Compatibility field for older consumers. Use the independent facets below. */
export type StoryCategory = 'evergreen' | 'snapshot' | 'event';
export type TimeAspect = 'snapshot' | 'event' | 'retrospective';
export const TIME_LABELS: Record<TimeAspect, string> = {
  snapshot: 'Momentaufnahme', event: 'Ereignis', retrospective: 'Rückblick',
};
const originalLabel = (id: string) => FAMILIEN.find(f => f.schluessel === id)!.kurz;
export const CONTENT_LABELS: Record<string, string> = {
  g1: originalLabel('g1'), g2: originalLabel('g2'), g3: originalLabel('g3'),
  g5: originalLabel('g5'), g10: originalLabel('g10'), g13: originalLabel('g13'),
  g14: originalLabel('g14'), g16: originalLabel('g16'),
  housing: 'Wohnstruktur', storage: 'Speicher', 'energy-model': 'Erzeugungsmodell',
  unassigned: 'Noch nicht zugeordnet',
};

type Facets = { categories: string[]; time: TimeAspect; evergreen?: boolean; exportSnapshot?: boolean };
/** Explicit meaning, not a default inferred from a family name or age threshold.
 * A historical maximum describes a period, not a newly observed change.
 * Changes stay events when read later; an anniversary needs its own finding. */
export const STORY_FACETS: Record<string, Facets> = {
  'Energie-Jahresprofil': {categories:['energy-model'],time:'retrospective'},
  'Solar-Monatsrecap': {categories:['energy-model'],time:'retrospective'},
  'Anzahl und Leistung': { categories: ['g14'], time: 'snapshot', evergreen: true, exportSnapshot: true },
  Bestandsprofil: { categories: ['g14'], time: 'snapshot', evergreen: true, exportSnapshot: true },
  Anlagengrößen: { categories: ['g16'], time: 'snapshot', evergreen: true, exportSnapshot: true },
  Speicherbestand: { categories: ['storage'], time: 'snapshot', evergreen: true, exportSnapshot: true },
  Wohnstruktur: { categories: ['housing'], time: 'snapshot', evergreen: true },
  'Ertragsspitze als Modell': { categories: ['energy-model'], time: 'retrospective', evergreen: false },
  'Jahresertrag als Modell': { categories: ['energy-model'], time: 'snapshot', evergreen: true, exportSnapshot: true },
  'Originalmuster: ausreisser': { categories: ['g3', 'g10'], time: 'snapshot', evergreen: true, exportSnapshot: true },
  'Originalmuster: kontrast': { categories: ['g3'], time: 'snapshot', evergreen: true, exportSnapshot: true },
  'Originalmuster: umkehrung': { categories: ['g3'], time: 'snapshot', evergreen: true, exportSnapshot: true },
  'Originalmuster: aufholer': { categories: ['g3'], time: 'snapshot', evergreen: true, exportSnapshot: true },
  'Originalmuster: topliste': { categories: ['g3'], time: 'snapshot', evergreen: true, exportSnapshot: true },
  'Originalmuster: david': { categories: ['g3'], time: 'snapshot', evergreen: true, exportSnapshot: true },
  'Originalmuster: kohorte': { categories: ['g16'], time: 'retrospective' },
  'Originalmuster: wohnform': { categories: ['housing'], time: 'snapshot', evergreen: true, exportSnapshot: true },
  'Original-Ortsausreißer': { categories: ['g3', 'g10'], time: 'snapshot', evergreen: true },
  'Original-Zeitraumvergleich': { categories: ['g2', 'g10'], time: 'retrospective' },
  Jahresveränderung: { categories: ['g2'], time: 'retrospective' },
  Jahreshöchstwert: { categories: ['g2', 'g10'], time: 'retrospective' },
  Monatsspitze: { categories: ['g2', 'g10'], time: 'retrospective' },
  'Lokale Monatsspitze': { categories: ['g2', 'g10'], time: 'retrospective' },
  Tageshöchstwert: { categories: ['g2', 'g10'], time: 'retrospective' },
  Wochenhöchstwert: { categories: ['g2', 'g10'], time: 'retrospective' },
  Vorjahreszeitraum: { categories: ['g2'], time: 'snapshot' },
  'Dauerhaft höheres Niveau': { categories: ['g2'], time: 'retrospective' },
  'Anlagenzahl und Größe': { categories: ['g2', 'g16'], time: 'retrospective' },
  Speicherzubau: { categories: ['g2', 'storage'], time: 'retrospective' },
  Ortsvergleich: { categories: ['g3'], time: 'snapshot' },
  'Rang-Monatsupdate': { categories: ['g3'], time: 'snapshot' },
  Rangänderung: { categories: ['g3'], time: 'event' },
  Aufsteiger: { categories: ['g3'], time: 'event' },
  Absteiger: { categories: ['g3'], time: 'event' },
  'Rang gehalten': { categories: ['g3'], time: 'snapshot', exportSnapshot: true },
  'Aktueller Rang': { categories: ['g3'], time: 'snapshot', exportSnapshot: true },
  Förderbestand: { categories: ['g5'], time: 'snapshot', evergreen: true, exportSnapshot: true },
  Förderänderung: { categories: ['g5'], time: 'event' },
  Förderkontext: { categories: ['g5', 'g2'], time: 'retrospective' },
  'Großanlagen-Hinweis': { categories: ['g2', 'g10'], time: 'event' },
};

export type StoryTopic = {
  id: string; category: StoryCategory; categories: string[]; timeAspects: TimeAspect[];
  evergreen: boolean; title: string; period: string; observations: Candidate[]; isNew: boolean;
};
export type StoryPool = {
  topics: StoryTopic[]; observationCount: number; internalCount: number;
  hasPreviousRun: boolean; unmappedFamilies: string[];
};
const stripTrailingPeriod = (key: string) => key.replace(/-\d{4}(?:-(?:\d{2}(?:-\d{2})?|W\d{2}))?$/, '');

/** The identity of a standing fact does not change with its export stamp.
 * Its values can be refreshed without inventing another newly found story. */
export function candidateFingerprint(claim: Candidate): string {
  const snapshot = STORY_FACETS[claim.family]?.exportSnapshot;
  return JSON.stringify([claim.family, snapshot ? stripTrailingPeriod(claim.eventKey) : claim.eventKey,
    snapshot ? 'current-stock' : claim.period, claim.evidence.map(e => e.unit).sort()]);
}
function legacyId(claim: Candidate): string {
  return STORY_FACETS[claim.family]?.exportSnapshot
    ? claim.id.replace(/\d{4}-\d{2}-\d{2}/g, 'export-date') : claim.id;
}
function previousLegacyIds(ids: string[]): Set<string> {
  // Keep both forms: only a current snapshot may use the date-free identity.
  return new Set(ids.flatMap(id => [id, id.replace(/\d{4}-\d{2}-\d{2}/g, 'export-date')]));
}

/** Every ready claim remains inspectable, including newly introduced families.
 * Missing taxonomy is explicit rather than silently called Zubau or news. */
export function buildStoryPool(report: DiscoveryReport, previous?: DiscoveryReport): StoryPool {
  const ready = report.candidates.filter(c => c.status === 'ready');
  const groups = new Map<string, Candidate[]>();
  for (const claim of ready) {
    const facets = STORY_FACETS[claim.family];
    const segment = stripTrailingPeriod(claim.eventKey);
    const period = facets?.exportSnapshot ? 'current-stock' : claim.period;
    const key = JSON.stringify([facets?.time ?? 'unassigned', segment, period]);
    const list = groups.get(key) ?? [];
    list.push(claim); groups.set(key, list);
  }
  const comparable = previous?.version === report.version && previous.regionId === report.regionId
    && previous.sourceDate < report.sourceDate;
  const hasPreviousRun = !!comparable || (!previous && !!report.previousSourceDate);
  const savedFingerprints = report.previousCandidateFingerprints;
  const old = new Set(comparable ? previous!.candidates.map(candidateFingerprint) : !previous ? savedFingerprints ?? [] : []);
  const legacy = previousLegacyIds(!previous ? report.previousCandidateIds ?? [] : []);
  const topics: StoryTopic[] = [...groups].map(([id, observations]): StoryTopic => {
    observations.sort((a, b) => Number(b.family === 'Anlagenzahl und Größe') - Number(a.family === 'Anlagenzahl und Größe')
      || b.priority - a.priority || a.id.localeCompare(b.id));
    const first = observations[0];
    const categories = [...new Set(observations.flatMap(claim => [
      ...(claim.eventKey.includes('steckersolar') ? ['g13'] : []),
      ...(STORY_FACETS[claim.family]?.categories ?? ['unassigned']),
    ]))];
    const evergreen = observations.every(c => STORY_FACETS[c.family]?.evergreen === true);
    const timeAspects = [...new Set(observations.flatMap(c => STORY_FACETS[c.family] ? [STORY_FACETS[c.family].time] : []))];
    return {
      id, category: evergreen ? 'evergreen' : timeAspects.includes('event') ? 'event' : 'snapshot',
      categories, timeAspects, evergreen, title: first.title, period: first.period, observations,
      isNew: hasPreviousRun && observations.some(c => (comparable || savedFingerprints) ? !old.has(candidateFingerprint(c)) : !legacy.has(legacyId(c))),
    };
  }).sort((a, b) => b.period.localeCompare(a.period) || a.id.localeCompare(b.id));
  return { topics, observationCount: ready.length, internalCount: report.candidates.length - ready.length,
    hasPreviousRun, unmappedFamilies: [...new Set(ready.filter(c => !STORY_FACETS[c.family]).map(c => c.family))] };
}
