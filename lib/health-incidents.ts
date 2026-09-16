/** Monitoring state is separate from the health verdict and runner exit code. */
export type Finding = { key: string; text: string; urgent?: boolean; operator?: boolean };
export type Incident = Finding & { firstSeen: string; lastSeen: string; count: number; escalated: boolean };
export type IncidentState = { version: 1; incidents: Record<string, Incident> };
export const emptyState = (): IncidentState => ({ version: 1, incidents: {} });

export function readState(value: unknown): IncidentState {
  const state = value as IncidentState;
  if (state?.version !== 1 || !state.incidents || typeof state.incidents !== 'object' || Array.isArray(state.incidents)) throw new Error('Invalid incident history');
  for (const [key, entry] of Object.entries(state.incidents)) {
    if (entry.key !== key || typeof entry.text !== 'string' || !Number.isInteger(entry.count) || entry.count < 1 || typeof entry.escalated !== 'boolean' || !Number.isFinite(Date.parse(entry.firstSeen)) || !Number.isFinite(Date.parse(entry.lastSeen))) throw new Error('Invalid incident entry');
  }
  return state;
}

export function advanceIncidents(previous: IncidentState, findings: Finding[], now: string, unknown: string[] = []) {
  const state = emptyState();
  const escalations: Incident[] = [];
  const opened: Incident[] = [];
  for (const finding of findings) {
    // Multiple measurements of the same cause in ONE run are one observation.
    if (state.incidents[finding.key]) continue;
    const old = previous.incidents[finding.key];
    const incident: Incident = { ...finding, firstSeen: old?.firstSeen ?? now, lastSeen: now, count: (old?.count ?? 0) + 1, escalated: old?.escalated ?? false };
    if (!old) opened.push(incident);
    if (!incident.escalated && (finding.urgent || finding.operator || incident.count >= 3)) {
      incident.escalated = true;
      escalations.push(incident);
    }
    state.incidents[finding.key] = incident;
  }
  // Missing evidence must never manufacture recovery.
  for (const [key, incident] of Object.entries(previous.incidents)) {
    if (unknown.some(prefix => key === prefix || (prefix.endsWith(":") && key.startsWith(prefix))) && !state.incidents[key]) state.incidents[key] = incident;
  }
  const recovered = Object.values(previous.incidents).filter(i => !state.incidents[i.key]);
  return { state, escalations, opened, recovered, autofix: findings.some(f => !f.operator) };
}
