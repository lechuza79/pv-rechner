import type { ReactNode } from "react";

/** Shared height transition; closed content stays mounted but cannot receive focus. */
export default function Collapse({ open, children }: { open: boolean; children: ReactNode }) {
  return <div className="sc-collapse" data-open={open} inert={!open} aria-hidden={!open}>
    <div>{children}</div>
  </div>;
}
