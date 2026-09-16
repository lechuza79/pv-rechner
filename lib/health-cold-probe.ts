export type ColdProbe = { label: string; url: string; status: number; seconds: number; cache: string; region: string };
export async function collectColdProbes(options: {
  label: string; paths: string[]; target: number; base: string;
  visited: Set<string>; excludedRegions: Set<string>;
  measure: (label: string, path: string) => Promise<ColdProbe>;
}): Promise<ColdProbe[]> {
  const hits: ColdProbe[] = [];
  for (const path of options.paths) {
    if (hits.length >= options.target) break;
    const url = `${options.base}${path}`;
    const district = path.split('/').slice(0, 4).join('/');
    if (options.visited.has(url) || options.excludedRegions.has(district)) continue;
    options.visited.add(url);
    const measured = await options.measure(options.label, path);
    // Cached responses never count as fresh evidence; errors must not disappear.
    if (measured.cache === 'MISS' || measured.status !== 200) hits.push(measured);
  }
  return hits;
}
