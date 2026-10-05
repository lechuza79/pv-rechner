# Shared landscape integration

The scroll composition mounts `LandscapeHero` through `landscape-client.tsx`. Production resolves the shared component in the same checkout; `scripts/kommunen-build.ts` rejects missing local dependencies. The local review server may explicitly resolve the owner workspace, but that mechanism is not part of the production build.

`LandscapeSources` supplies the detailed credits through the shared `DataSourcesSection`; the inline map attribution remains inside the stage. Header and place-picker boundaries preserve their shared styling. The host owns the approved copy rail and responsive composition.

The `gemeinde` query selects a prepared location, default Hatten. Geometry is served from the integrated public assets. Weather requests use the same-origin APIs and stored model data. The hourly park-weather service is documented in `docs/park-wetter-betrieb.md`. Missing data remains unavailable; no data preparation or direct external weather fallback is triggered by a page request.

The standalone review remains available on 4386 while the integrated production package is verified. Public deployment is a separate step from local browser acceptance.
