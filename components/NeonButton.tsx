import Link from "next/link";

/**
 * The action family of the neon surface: primary (filled), secondary
 * (outlined) and icon (round). Styles live in lib/theme.ts (`.sc-btn`), so a
 * button looks the same whether it is a link or a form control.
 *
 * A link stays a real `<a href>` — an action that navigates must be crawlable,
 * open in a new tab and announce its target (same rule as the affiliate
 * block). Only actions without a destination render as `<button>`.
 *
 * `laedt` keeps the button in place and marks it busy instead of swapping it
 * for a spinner: the layout must not jump while a postcode is being resolved.
 */
type Variante = "primary" | "secondary" | "icon";

type Gemeinsam = {
  variante?: Variante;
  /** Secondary on a dark background: white outline instead of ink. */
  ton?: "hell" | "dunkel";
  children: React.ReactNode;
  className?: string;
  /** Required for the icon variant — it has no visible text. */
  ariaLabel?: string;
};

type AlsLink = Gemeinsam & { href: string; onClick?: never; type?: never; disabled?: never; laedt?: never };
type AlsKnopf = Gemeinsam & {
  href?: undefined;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  laedt?: boolean;
};

export default function NeonButton(props: AlsLink | AlsKnopf) {
  const { variante = "primary", ton, children, className, ariaLabel } = props;
  const klasse = `sc-btn sc-btn-${variante}${className ? ` ${className}` : ""}`;
  if (props.href !== undefined) {
    return (
      <Link href={props.href} className={klasse} data-ton={ton} aria-label={ariaLabel}>
        {children}
      </Link>
    );
  }
  const gesperrt = props.disabled || props.laedt;
  return (
    <button
      type={props.type ?? "button"}
      className={klasse}
      data-ton={ton}
      aria-label={ariaLabel}
      aria-busy={props.laedt || undefined}
      aria-disabled={gesperrt || undefined}
      onClick={gesperrt ? undefined : props.onClick}
    >
      {children}
    </button>
  );
}
