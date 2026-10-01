"use client";

import { useRef, type CSSProperties, type ReactNode } from "react";

export type GlareHoverProps = {
  width?: string;
  height?: string;
  background?: string;
  borderRadius?: string;
  borderColor?: string;
  children?: ReactNode;
  glareColor?: string;
  glareOpacity?: number;
  glareAngle?: number;
  glareSize?: number;
  transitionDuration?: number;
  playOnce?: boolean;
  className?: string;
  style?: CSSProperties;
};

function glareColorToRgba(glareColor: string, glareOpacity: number): string {
  const hex = glareColor.replace("#", "");
  if (/^[\dA-Fa-f]{6}$/.test(hex)) {
    return `rgba(${parseInt(hex.slice(0, 2), 16)}, ${parseInt(hex.slice(2, 4), 16)}, ${parseInt(hex.slice(4, 6), 16)}, ${glareOpacity})`;
  }
  if (/^[\dA-Fa-f]{3}$/.test(hex)) {
    return `rgba(${parseInt(hex[0] + hex[0], 16)}, ${parseInt(hex[1] + hex[1], 16)}, ${parseInt(hex[2] + hex[2], 16)}, ${glareOpacity})`;
  }
  return glareColor;
}

export function GlareHover({
  width = "100%",
  height = "auto",
  background = "transparent",
  borderRadius = "var(--radius-card)",
  borderColor,
  children,
  glareColor = "#ffffff",
  glareOpacity = 0.35,
  glareAngle = -30,
  glareSize = 220,
  transitionDuration = 600,
  playOnce = false,
  className = "",
  style = {},
}: GlareHoverProps) {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const rgba = glareColorToRgba(glareColor, glareOpacity);

  const animateGlareIn = () => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    overlay.style.transition = "none";
    overlay.style.backgroundPosition = "-100% -100%, 0 0";
    // Forces a style flush so the next assignment transitions from the reset position instead of being batched away.
    void overlay.offsetWidth;
    overlay.style.transition = `${transitionDuration}ms ease`;
    overlay.style.backgroundPosition = "100% 100%, 0 0";
  };

  const animateGlareOut = () => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    overlay.style.transition = playOnce ? "none" : `${transitionDuration}ms ease`;
    overlay.style.backgroundPosition = "-100% -100%, 0 0";
  };

  const overlayStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    zIndex: 1,
    background: `linear-gradient(${glareAngle}deg, hsla(0,0%,0%,0) 60%, ${rgba} 70%, hsla(0,0%,0%,0) 100%)`,
    backgroundSize: `${glareSize}% ${glareSize}%, 100% 100%`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "-100% -100%, 0 0",
    pointerEvents: "none",
  };

  return (
    <div
      className={`relative overflow-hidden ${borderColor ? "border" : ""} ${className}`}
      style={{ width, height, background, borderRadius, borderColor, ...style }}
      onMouseEnter={animateGlareIn}
      onMouseLeave={animateGlareOut}
      onPointerDown={animateGlareIn}
    >
      <div ref={overlayRef} style={overlayStyle} aria-hidden />
      {children}
    </div>
  );
}
