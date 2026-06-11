import { cn } from "@/lib/utils";

export const BRAND_ALT = "MRKFIN - Sistema de Controle Financeiro Muraki";

type BrandLogoVariant = "wordmark" | "mark" | "lockup";

interface BrandLogoProps {
  variant?: BrandLogoVariant;
  className?: string;
  imageClassName?: string;
  textClassName?: string;
}

export function BrandLogo({
  variant = "lockup",
  className,
  imageClassName,
  textClassName,
}: BrandLogoProps) {
  if (variant === "wordmark") {
    return (
      <img
        src="/brand/mrkfin-wordmark.png"
        alt={BRAND_ALT}
        className={cn("block h-auto w-full", className)}
      />
    );
  }

  if (variant === "mark") {
    return (
      <img
        src="/brand/mrkfin-mark.png"
        alt={BRAND_ALT}
        className={cn("block h-10 w-10 rounded-lg", className)}
      />
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <img
        src="/brand/mrkfin-mark.png"
        alt={BRAND_ALT}
        className={cn("block h-8 w-8 rounded-lg", imageClassName)}
      />
      <span className={cn("font-bold tracking-tight text-foreground", textClassName)}>MRKFIN</span>
    </div>
  );
}
