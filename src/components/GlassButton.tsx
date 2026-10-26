"use client";

import React from "react";

type Variant = "glass" | "primary";
type Size = "sm" | "md" | "lg";

interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  pill?: boolean;
  block?: boolean;
  icon?: React.ReactNode;
}

const sizeClass: Record<Size, string> = {
  sm: "h-9 px-3.5 text-[13px] gap-1.5",
  md: "h-11 px-5 text-[15px] gap-2",
  lg: "h-14 px-7 text-[17px] gap-2.5",
};

/**
 * Frosted-glass button with a short press animation (scale 0.97, 140 ms).
 */
export function GlassButton({
  variant = "glass",
  size = "md",
  pill = false,
  block = false,
  icon,
  className = "",
  children,
  ...rest
}: GlassButtonProps) {
  const base =
    "pressable focus-ring inline-flex items-center justify-center font-medium tracking-[-0.01em] select-none";
  const v = variant === "primary" ? "btn-primary" : "btn-glass";
  return (
    <button
      type="button"
      className={`${base} ${v} ${sizeClass[size]} ${pill ? "btn-pill" : ""} ${
        block ? "w-full" : ""
      } ${className}`}
      {...rest}
    >
      {icon ? <span className="flex-none inline-flex">{icon}</span> : null}
      {children}
    </button>
  );
}
