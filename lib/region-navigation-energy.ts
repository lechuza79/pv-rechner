import type {DistrictEnergy, EnergyPacket} from './district-energy';

export type RegionNavigationEnergy = {
  month: string;
  totalMwh: number;
  values: {regionId: string; mwh: number}[];
};

/** Reuse months already validated by the aggregate; never fetch children on a page request. */
export function regionNavigationEnergy(
  ids: string[], packets: (EnergyPacket | null)[], energy: DistrictEnergy | null,
  empty: ReadonlySet<string> = new Set(),
): RegionNavigationEnergy | null {
  if (!energy || ids.length !== packets.length || new Set(ids).size !== ids.length) return null;
  // The register edition is an explicit upper bound: partial current months cannot qualify.
  const editionMonth = packets.find(p => p)?.registerStand.slice(0,7);
  const month = [...energy.monthly].sort((a,b) => b.month.localeCompare(a.month))
    .find(m => editionMonth && m.month < editionMonth);
  if (!month) return null;
  const values = ids.map((regionId,i) => {
    if (empty.has(regionId)) return {regionId, mwh:0};
    const packet = packets[i];
    const source = packet?.ags === regionId ? packet.monitorPeriods?.monthly.find(m => m.month === month.month) : null;
    return {regionId, mwh: source ? source.solar.days.reduce((sum,day) => sum + day.mwh,0) : NaN};
  });
  const totalMwh = month.solar.totalMwh;
  if (!Number.isFinite(totalMwh) || totalMwh < 0 || values.some(v => !Number.isFinite(v.mwh) || v.mwh < 0)) return null;
  if (Math.abs(values.reduce((sum,v) => sum+v.mwh,0)-totalMwh) > Math.max(1e-6,totalMwh*1e-9)) return null;
  return {month:month.month,totalMwh,values};
}

/** Stored data is optional during rollout and must cover exactly the displayed children. */
export function checkedNavigationEnergy(value: RegionNavigationEnergy | null | undefined, ids: string[]): RegionNavigationEnergy | null {
  if (!value || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value.month) || !Array.isArray(value.values)) return null;
  const wanted = new Set(ids);
  if (wanted.size !== ids.length || new Set(value.values.map(v=>v.regionId)).size !== value.values.length || ids.some(id=>!value.values.some(v=>v.regionId===id))) return null;
  if (!Number.isFinite(value.totalMwh) || value.totalMwh < 0 || value.values.some(v=>(!wanted.has(v.regionId)&&v.mwh!==0)||!Number.isFinite(v.mwh)||v.mwh<0)) return null;
  return Math.abs(value.values.reduce((sum,v)=>sum+v.mwh,0)-value.totalMwh) <= Math.max(1e-6,value.totalMwh*1e-9) ? value : null;
}
