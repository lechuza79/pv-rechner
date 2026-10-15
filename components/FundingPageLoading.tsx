import { LoadingDots } from "./LoadingDots";

/** Only the route content waits; the scene, location and sidebar stay mounted. */
export default function FundingPageLoading() {
  return <div role="status" style={{minHeight:320,padding:"var(--space-xl)",color:"var(--color-text-secondary)"}}>
    Förderinhalte werden geladen <LoadingDots/>
  </div>;
}
