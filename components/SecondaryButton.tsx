"use client";
import type { ComponentPropsWithRef, ReactNode } from "react";
import ActionButton from "./ActionButton";
/** Compatibility entry point; all visual rules belong to ActionButton. */
export default function SecondaryButton({ icon, children, ...props }: ComponentPropsWithRef<"button"> & { icon?: ReactNode }) {
  return <ActionButton {...props} variant="secondary">{icon}{children}</ActionButton>;
}
