"use client";

import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import type { ComponentProps, ComponentPropsWithoutRef, ReactNode } from "react";

export type BigButtonVariant = "primary" | "success" | "danger" | "secondary" | "ghost";
export type BigButtonSize = "default" | "compact";

type BigButtonBaseProps = {
  variant?: BigButtonVariant;
  size?: BigButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
};

type BigButtonAsButtonProps = BigButtonBaseProps & {
  href?: undefined;
} & Omit<ComponentPropsWithoutRef<"button">, keyof BigButtonBaseProps>;

type BigButtonAsLinkProps = BigButtonBaseProps & {
  href: string;
  prefetch?: ComponentProps<typeof Link>["prefetch"];
} & Omit<ComponentPropsWithoutRef<"a">, keyof BigButtonBaseProps | "href">;

export type BigButtonProps = BigButtonAsButtonProps | BigButtonAsLinkProps;

const VARIANT_CLASSES: Record<BigButtonVariant, string> = {
  primary: "lip bg-primary text-white [--lip-color:var(--color-primary-lip)] hover:brightness-105",
  success: "lip bg-success text-white [--lip-color:var(--color-success-lip)] hover:brightness-105",
  danger: "lip bg-danger text-white [--lip-color:var(--color-danger-lip)] hover:brightness-105",
  secondary:
    "lip bg-surface text-primary border-2 border-border [--lip-color:var(--color-border)] hover:bg-canvas",
  ghost: "bg-transparent text-primary hover:bg-primary-pale/60",
};

const DISABLED_CLASSES = "bg-border text-disabled cursor-not-allowed";

const SIZE_CLASSES: Record<BigButtonSize, string> = {
  default: "min-h-14 px-6 text-base",
  compact: "min-h-11 px-4 text-[15px]",
};

export function BigButton(props: BigButtonProps) {
  const {
    variant = "primary",
    size = "default",
    fullWidth = false,
    loading = false,
    disabled = false,
    icon,
    className = "",
    children,
    ...rest
  } = props;

  const inactive = disabled || loading;
  const sharedClassName = [
    "lip-press relative inline-flex select-none items-center justify-center gap-2 rounded-btn font-extrabold uppercase tracking-[0.04em]",
    "outline-none focus-visible:ring-4 focus-visible:ring-primary/30",
    SIZE_CLASSES[size],
    fullWidth ? "w-full" : "",
    inactive ? DISABLED_CLASSES : VARIANT_CLASSES[variant],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      {loading ? (
        <LoaderCircle className="size-5 shrink-0 animate-spin" aria-hidden />
      ) : icon ? (
        <span className="flex shrink-0 items-center [&>svg]:size-5" aria-hidden>
          {icon}
        </span>
      ) : null}
      <span>{children}</span>
    </>
  );

  if ("href" in props && props.href !== undefined && !inactive) {
    const { href, ...linkRest } = rest as Omit<BigButtonAsLinkProps, keyof BigButtonBaseProps>;
    return (
      <Link href={href} className={sharedClassName} {...linkRest}>
        {content}
      </Link>
    );
  }

  const {
    href: _ignoredHref,
    prefetch: _ignoredPrefetch,
    ...buttonRest
  } = rest as Omit<BigButtonAsButtonProps, keyof BigButtonBaseProps> & {
    href?: string;
    prefetch?: BigButtonAsLinkProps["prefetch"];
  };
  void _ignoredHref;
  void _ignoredPrefetch;

  return (
    <button
      type="button"
      disabled={inactive}
      aria-busy={loading || undefined}
      className={sharedClassName}
      {...buttonRest}
    >
      {content}
    </button>
  );
}
