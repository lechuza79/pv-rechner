import type { ShopAngebot } from "./shop-solakon";

export type BalkonHardwareSnapshot = Pick<ShopAngebot, "moduleWp" | "inverterW" | "speicherKwh" | "preis"> & { batteryCoupling?: "ac" | "dc"; haendler?: string };

/** Preserve the physical package when a shared merchant variant disappears. */
export function readBalkonHardware(query: URLSearchParams): BalkonHardwareSnapshot | null {
  const ranges = { moduleWp: [100, 2000], inverterW: [100, 800], speicherKwh: [0, 30], preis: [0, 20000] } as const;
  const values: Record<string, number> = {};
  for (const [key, [min, max]] of Object.entries(ranges)) {
    const raw = query.get(key);
    const value = Number(raw);
    if (!raw?.trim() || !Number.isFinite(value) || value < min || value > max) return null;
    values[key] = value;
  }
  return { ...values, ...((query.get("haendler") === "solakon" || query.get("offer")?.startsWith("solakon-")) ? { haendler: "solakon" } : {}), ...(query.get("batteryCoupling") === "dc" ? { batteryCoupling: "dc" as const } : {}) } as BalkonHardwareSnapshot;
}

export function writeBalkonHardware(hardware: BalkonHardwareSnapshot | null | undefined): Record<string, string> {
  return hardware ? { ...(hardware.haendler === "solakon" ? { haendler: "solakon" } : {}), ...Object.fromEntries(["moduleWp", "inverterW", "speicherKwh", "preis"].map(key => [key, String(hardware[key as keyof BalkonHardwareSnapshot])])), ...((hardware.haendler === "solakon" || hardware.batteryCoupling === "dc") ? { batteryCoupling: "dc" } : {}) } : {};
}
