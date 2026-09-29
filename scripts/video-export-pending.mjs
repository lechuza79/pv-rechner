// Avoid installing the renderer when the queue is empty. Run cleanup hourly.
import { appendFileSync } from 'node:fs';
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;
if (!url || !key) throw new Error('Video queue credentials missing');
const headers = { apikey: key, Authorization: `Bearer ${key}` };
async function exists(query) {
  const response = await fetch(`${url}/rest/v1/${query}`, { headers });
  if (!response.ok) throw new Error(`Queue check HTTP ${response.status}`);
  return (await response.json()).length > 0;
}
const pending = new Date().getUTCMinutes() < 5 ||
  await exists('video_render_jobs?select=id&status=in.(queued,rendering)&limit=1') ||
  await exists('video_requests?select=id&status=eq.confirmed&limit=1');
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `pending=${pending}\n`);
console.log(pending ? 'Video queue or cleanup needs work' : 'Video queue empty');
