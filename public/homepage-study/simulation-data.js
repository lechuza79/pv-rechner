// Shared in-flight requests: validation, submit and retries must not duplicate work.
const pending = new Map();
async function request(url, validate) {
  if (pending.has(url)) return pending.get(url);
  const promise = (async () => {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!response.ok) {
          const error = new Error(`Request failed: ${response.status}`);
          error.permanent = response.status >= 400 && response.status < 500 && response.status !== 429;
          throw error;
        }
        const data = await response.json();
        if (!validate(data)) { const error = new Error('Incomplete simulation data'); error.permanent = true; throw error; }
        return data;
      } catch (error) {
        if (attempt || error.permanent) throw error;
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
  })();
  pending.set(url, promise);
  try { return await promise; }
  catch (error) { pending.delete(url); throw error; }
}
export function postcodes() {
  return request('/dynamic-hero/plz-coordinates.json', data => data && typeof data === 'object' && Object.keys(data).length > 0);
}
export function retrospective(plz) {
  if (!/^\d{5}$/.test(plz)) return Promise.reject(new Error('Invalid postcode'));
  return request('/simulation-retrospective?plz=' + plz, data => data && Number.isFinite(data.pv) && Number.isFinite(data.combined));
}
