"use client";
import { useId, useState, type ReactNode } from "react";
import Collapse from "./Collapse";
import InfoTooltip from "./InfoTooltip";
import { IconChevronDown } from "./Icons";
import { iconSizes, space } from "../lib/theme";
import "./optional-disclosure.css";

/** Shared optional-input disclosure; callers supply content, never trigger styling. */
export default function OptionalDisclosure({ label, children, open, onOpenChange, heading, description, descriptionAsHelp = false }: {
  label: string;
  heading?: string;
  description?: ReactNode;
  descriptionAsHelp?: boolean;
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const id = useId();
  const [internalOpen, setInternalOpen] = useState(false);
  const expanded = open ?? internalOpen;
  return <div className={`sc-optional-disclosure${heading ? " sc-optional-disclosure--heading" : ""}`}>
    {heading && <div className="sc-disclosure-heading"><div className="sc-disclosure-title"><h3>{heading}</h3>{description && descriptionAsHelp && <InfoTooltip ariaLabel={`Informationen: ${heading}`} size={16}>{description}</InfoTooltip>}</div>{description && !descriptionAsHelp && <p>{description}</p>}</div>}
    <button type="button" className="sc-optional-disclosure-trigger" aria-expanded={expanded} aria-controls={id}
      style={{ gap: space.md, padding: `${space.lg}px 0` }}
      onClick={() => { setInternalOpen(!expanded); onOpenChange?.(!expanded); }}>
      {label}<IconChevronDown size={iconSizes.md} />
    </button>
    <Collapse open={expanded}><div id={id} className="sc-optional-disclosure-content">{children}</div></Collapse>
  </div>;
}
