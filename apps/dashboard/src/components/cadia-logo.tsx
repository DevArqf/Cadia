"use client";

interface CadiaLogoProps {
  size?: number;
  animated?: boolean;
  className?: string;
}

/**
 * Cadia logo : uses the official PNG asset in /public/cadia-logo.png.
 * The float animation is enabled only on hero usage.
 */
export function CadiaLogo({
  size = 48,
  animated = true,
  className = "",
}: CadiaLogoProps) {
  return (
    <img
      src="/cadia-logo.png"
      alt="Cadia logo"
      width={size}
      height={size}
      className={`cadia-logo-img ${animated ? "cadia-float" : ""} ${className}`}
      style={{ width: size, height: size }}
      draggable={false}
    />
  );
}
