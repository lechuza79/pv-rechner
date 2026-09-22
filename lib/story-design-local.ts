/** Filesystem-backed story drafts are local development tools, never hosted storage. */
export function isLocalStoryDesignEnvironment(): boolean {
  return process.env.NODE_ENV !== 'production' && !process.env.VERCEL;
}

export function requireLocalStoryDesignEnvironment(): void {
  if (!isLocalStoryDesignEnvironment()) throw new Error('Story design storage is available in local development only');
}
