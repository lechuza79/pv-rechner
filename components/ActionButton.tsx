"use client";
import type { ComponentPropsWithRef } from "react";
import styles from "./ActionButton.module.css";

type Appearance = { variant?: "primary" | "secondary"; iconOnly?: boolean; active?: boolean };
/** One action style for native buttons and links; semantics and handlers stay native. */
export default function ActionButton({ variant = "secondary", iconOnly = false, active = false, className = "", type = "button", ...props }: ComponentPropsWithRef<"button"> & Appearance) {
  return <button {...props} type={type} data-action-button data-variant={variant} data-icon-only={iconOnly || undefined} data-active={active || undefined} className={`${styles.action} ${className}`} />;
}
export function ActionLink({ variant = "primary", iconOnly = false, active = false, className = "", ...props }: ComponentPropsWithRef<"a"> & Appearance) {
  return <a {...props} data-action-button data-variant={variant} data-icon-only={iconOnly || undefined} data-active={active || undefined} className={`${styles.action} ${className}`} />;
}
