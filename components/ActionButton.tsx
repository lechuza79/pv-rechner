"use client";
import type { ComponentPropsWithRef } from "react";
import styles from "./ActionButton.module.css";

type Appearance = { size?: "small" | "default" | "large"; variant?: "primary" | "secondary" | "text"; iconOnly?: boolean; active?: boolean };
/** One action style for native buttons and links; semantics and handlers stay native. */
export default function ActionButton({ variant = "secondary", size = "default", iconOnly = false, active = false, className = "", type = "button", ...props }: ComponentPropsWithRef<"button"> & Appearance) {
  return <button {...props} type={type} data-action-button data-size={size} data-variant={variant} data-icon-only={iconOnly || undefined} data-active={active || undefined} className={`${styles.action} ${className}`} />;
}
export function ActionLink({ variant = "primary", size = "default", iconOnly = false, active = false, className = "", ...props }: ComponentPropsWithRef<"a"> & Appearance) {
  return <a {...props} data-action-button data-size={size} data-variant={variant} data-icon-only={iconOnly || undefined} data-active={active || undefined} className={`${styles.action} ${className}`} />;
}
