/**
 * Guard for URL parameters that end up in a redirect.
 *
 * A path that comes out of the URL must be proven to be a path on THIS site
 * before anything redirects to it — otherwise `?next=https://evil.example`
 * turns our own callback into an open redirect that borrows the domain's
 * credibility. Used by the auth callback's `next` param; lives here (instead of
 * inline) so the rule has a name and a test suite rather than being three easy-
 * to-misread lines inside a route handler.
 */

/** Control characters, space and DEL — header-/markup-splitting material. */
function isJunkChar(code: number): boolean {
  return code <= 0x20 || code === 0x7f;
}

/**
 * Returns the path if it is a safe same-origin path, otherwise null.
 *
 * Rejected: absolute URLs, protocol-relative ("//host"), backslash-host tricks
 * ("/\host"), control characters/whitespace, and absurd lengths.
 */
export function safeInternalPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (raw.length > 512) return null;
  if (!raw.startsWith("/")) return null;
  if (raw.startsWith("//")) return null;
  for (let i = 0; i < raw.length; i++) {
    const code = raw.charCodeAt(i);
    if (isJunkChar(code) || code === 0x5c /* backslash */) return null;
  }
  return raw;
}

