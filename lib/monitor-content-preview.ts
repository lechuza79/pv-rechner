import type {DistrictContent} from "./district-monitor-server";

/** Local previews have no last-good ISR page to retain on a failed read.
 * Production must still reject so an incomplete regeneration is never published.
 */
export function monitorContentForPreview(source: Promise<DistrictContent>): Promise<DistrictContent> {
  const content = source.catch((error): DistrictContent => {
    if (process.env.NODE_ENV !== "development") throw error;
    return {
      monitor: {status:"unavailable", reason:"not-prepared", energy:null, sites:null},
      stories: [],
      prepared: {state:"unavailable", reason:"read-error"},
    };
  });
  // The server starts reading before Suspense consumes the result. Register a
  // rejection handler immediately, without changing what the consumer receives.
  void content.catch(() => {});
  return content;
}
