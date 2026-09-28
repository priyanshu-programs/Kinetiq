import type { ButtonHTMLAttributes } from "react";

type Variant = "accent" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  accent: "bg-accent text-accent-ink hover:bg-accent-dark",
  outline: "border border-hairline-strong text-ink hover:bg-surface-raised",
  ghost: "text-ink-3 hover:bg-surface-raised hover:text-ink",
  danger: "bg-hot text-white hover:bg-hot/90",
};

const SIZES: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-5 py-2.5 text-sm",
  lg: "px-7 py-3.5 text-base",
};

/** Exported so <Link> CTAs match buttons exactly. */
export function buttonClass(variant: Variant = "accent", size: Size = "md") {
  return `inline-flex items-center justify-center gap-2 rounded-full font-semibold uppercase transition disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]}`;
}

export function Button({
  variant = "accent",
  size = "md",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}) {
  return <button className={`${buttonClass(variant, size)} ${className}`} {...props} />;
}
