/** The region every published Atlas path starts from.
 *
 *  The page resolves a slug path by walking down from this root
 *  (`walkSlugPath` in lib/atlas.ts); a region whose chain does not end here has
 *  no page and answers 404 by design. Since 07.10.2026 the same tables also hold
 *  the Swiss register below the root `ch` — data, not a release. Anything that
 *  builds Atlas URLs from database rows (the health-check sampler) asks this
 *  same question instead of guessing from the key format.
 *
 *  Its own module because lib/atlas.ts pulls in Next's cache and cannot be
 *  loaded from a plain script. */
export const ATLAS_WURZEL = "de";
