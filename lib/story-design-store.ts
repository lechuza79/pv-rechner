import 'server-only';
import { requireLocalStoryDesignEnvironment } from './story-design-local';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, writeFile, readFile, link, unlink } from 'node:fs/promises';
import path from 'node:path';
import type { StoryConcept } from './story-konzepte';

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
export type StoryDesignSnapshot = {
  schemaVersion: 1;
  sourceReportReference: string;
  sourceDate: string;
  concept: StoryConcept;
  scheme: 'light' | 'dark' | 'highlight';
  familyTemplate?: JsonValue;
};

const defaultDirectory = () => path.join(process.cwd(), 'scripts/.cache/story-design');
const identifier = /^[a-f0-9]{64}$/;

// Stable key order makes retries and equivalent JSON inputs resolve to one version.
function canonical(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype) {
    return `{${Object.keys(value).filter(key => (value as Record<string, unknown>)[key] !== undefined).sort()
      .map(key => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(',')}}`;
  }
  throw new Error('Story snapshot must contain finite JSON values only');
}

function validate(snapshot: StoryDesignSnapshot): void {
  if (!snapshot || snapshot.schemaVersion !== 1 || typeof snapshot.sourceReportReference !== 'string' || !snapshot.sourceReportReference.trim()) {
    throw new Error('Story snapshot requires its source report reference and schema version');
  }
  if (typeof snapshot.sourceDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(snapshot.sourceDate) ||
    !Number.isFinite(Date.parse(snapshot.sourceDate)) || new Date(snapshot.sourceDate).toISOString().slice(0,10) !== snapshot.sourceDate) {
    throw new Error('Story snapshot requires a valid source date');
  }
  if (!['light', 'dark', 'highlight'].includes(snapshot.scheme) || !snapshot.concept ||
    typeof snapshot.concept.id !== 'string' || !snapshot.concept.id || typeof snapshot.concept.title !== 'string' ||
    !Array.isArray(snapshot.concept.values) || !Array.isArray(snapshot.concept.copy)) {
    throw new Error('Story snapshot requires a concept and color scheme');
  }
}

const digest = (content: string) => createHash('sha256').update(content).digest('hex');
const errorCode = (error: unknown) => (error as NodeJS.ErrnoException).code;

/** Local immutable drafts only: this store grants no publication or editorial approval. */
export async function writeStoryDesignSnapshot(snapshot: StoryDesignSnapshot, directory = defaultDirectory()): Promise<{ id: string; snapshot: StoryDesignSnapshot }> {
  requireLocalStoryDesignEnvironment();
  validate(snapshot);
  const content = canonical(snapshot);
  const id = digest(content);
  await mkdir(directory, { recursive: true });
  const temporary = path.join(directory, `.${id}-${randomUUID()}.tmp`);
  try {
    await writeFile(temporary, content, { flag: 'wx', mode: 0o600 });
    try {
      // Linking a complete file is atomic and fails if the immutable target already exists.
      await link(temporary, path.join(directory, `${id}.json`));
    } catch (error) {
      if (errorCode(error) !== 'EEXIST') throw error;
      const existing = await readStoryDesignSnapshot(id, directory);
      if (!existing || canonical(existing) !== content) throw new Error('Stored story snapshot integrity mismatch');
    }
  } finally {
    await unlink(temporary).catch(error => { if (errorCode(error) !== 'ENOENT') throw error; });
  }
  return { id, snapshot: JSON.parse(content) as StoryDesignSnapshot };
}

export async function readStoryDesignSnapshot(id: string, directory = defaultDirectory()): Promise<StoryDesignSnapshot | null> {
  requireLocalStoryDesignEnvironment();
  if (!identifier.test(id)) throw new Error('Invalid story snapshot identifier');
  let content: string;
  try {
    content = await readFile(path.join(directory, `${id}.json`), 'utf8');
  } catch (error) {
    if (errorCode(error) === 'ENOENT') return null;
    throw error;
  }
  const snapshot = JSON.parse(content) as StoryDesignSnapshot;
  validate(snapshot);
  if (digest(canonical(snapshot)) !== id) throw new Error('Stored story snapshot integrity mismatch');
  return snapshot;
}
