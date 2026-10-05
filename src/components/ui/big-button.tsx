"use client";

import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react";
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

export const GUMMY_PRESS_TRANSITION = { type: "spring", visualDuration: 0.18, bounce: 0.55 } as const;
export const GUMMY_PRESS_TRANSITION_REDUCED = { type: "spring", visualDuration: 0.18, bounce: 0 } as const;

const MotionLink = motion.create(Link);

const VARIANT_WRAPPER_CLASSES: Record<BigButtonVariant, string> = {
  primary:
    "btn-plate [--btn-plate-color:var(--color-primary-lip)] [--btn-surface:var(--color-primary)] [--btn-surface-hover:var(--color-primary-hover)] [--btn-surface-pressed:var(--color-primary-pressed)] [--btn-text:var(--color-primary-contrast)]",
  success:
    "btn-plate [--btn-plate-color:color-mix(in_srgb,#000_22%,var(--color-success-lip))] [--btn-surface:var(--color-success)] [--btn-surface-hover:color-mix(in_srgb,#fff_14%,var(--color-success))] [--btn-surface-pressed:var(--color-success-lip)] [--btn-text:#06140d]",
  danger:
    "btn-plate [--btn-plate-color:color-mix(in_srgb,#000_22%,var(--color-danger-lip))] [--btn-surface:var(--color-danger-lip)] [--btn-surface-hover:color-mix(in_srgb,#fff_14%,var(--color-danger-lip))] [--btn-surface-pressed:color-mix(in_srgb,#000_16%,var(--color-danger-lip))] [--btn-text:#ffffff]",
  secondary:
    "btn-plate btn-outline [--btn-surface:var(--color-surface)] [--btn-surface-hover:var(--color-surface-alt)] [--btn-surface-pressed:var(--color-canvas)] [--btn-text:var(--color-text)] [--btn-text-hover:var(--color-ink)]",
  ghost:
    "btn-plate btn-outline [--btn-surface:transparent] [--btn-surface-hover:var(--color-primary-pale)] [--btn-surface-pressed:color-mix(in_srgb,#000_6%,var(--color-primary-pale))] [--btn-text:var(--color-primary-text)]",
};

const VARIANT_BODY_CLASSES: Record<BigButtonVariant, string> = {
  primary: "",
  success: "",
  danger: "",
  secondary: "ring-gradient",
  ghost: "border-transparent!",
};

const SIZE_BODY_CLASSES: Record<BigButtonSize, string> = {
  default: "min-h-12 px-5 text-base",
  compact: "min-h-10 px-4 text-base",
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
  const reduceMotion = useReducedMotion();

  const inactive = disabled || loading;
  const wrapperClassName = [
    "focus-outline select-none cursor-pointer font-medium leading-6",
    VARIANT_WRAPPER_CLASSES[variant],
    fullWidth ? "w-full" : "",
    inactive ? "cursor-not-allowed opacity-50" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const bodyClassName = ["btn-plate-body w-full", SIZE_BODY_CLASSES[size], VARIANT_BODY_CLASSES[variant]]
    .filter(Boolean)
    .join(" ");

  const pressAnimation = inactive ? undefined : { scale: 0.96 };
  const pressTransition = reduceMotion ? GUMMY_PRESS_TRANSITION_REDUCED : GUMMY_PRESS_TRANSITION;

  const content = (
    <span className={bodyClassName}>
      {loading ? (
        <LoaderCircle className="size-5 shrink-0 animate-spin" aria-hidden />
      ) : icon ? (
        <span className="flex shrink-0 items-center [&>svg]:size-5" aria-hidden>
          {icon}
        </span>
      ) : null}
      <span>{children}</span>
    </span>
  );

  if ("href" in props && props.href !== undefined && !inactive) {
    const { href, ...linkRest } = rest as Omit<BigButtonAsLinkProps, keyof BigButtonBaseProps>;
    return (
      <MotionLink
        href={href}
        className={wrapperClassName}
        whileTap={pressAnimation}
        transition={pressTransition}
        {...(linkRest as HTMLMotionProps<"a">)}
      >
        {content}
      </MotionLink>
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
    <motion.button
      type="button"
      disabled={inactive}
      aria-busy={loading || undefined}
      className={wrapperClassName}
      whileTap={pressAnimation}
      transition={pressTransition}
      {...(buttonRest as HTMLMotionProps<"button">)}
    >
      {content}
    </motion.button>
  );
}
