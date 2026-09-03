/**
 * Ersatz für Nexts `server-only` im Testlauf.
 *
 * Das echte Paket existiert nur im Next-Bau und lässt sich dort absichtlich
 * nicht auflösen, wenn ein Modul im Browser-Bündel landen würde. Vitest kennt es
 * nicht — deshalb scheiterte der Sitemap-Test in dem Moment, in dem die Sitemap
 * ein server-only-Modul mitzog (29.08.2026, `lib/atlas-outreach-freigabe.ts`).
 *
 * Der Ersatz tut nichts. Die Schutzwirkung im echten Bau bleibt unberührt: Dort
 * wird weiterhin das Original aufgelöst, und ein Modul, das versehentlich in den
 * Browser wandert, bricht den Build wie zuvor.
 */
export {};
