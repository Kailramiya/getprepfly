import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  className?: string;
  /** Unused — kept for call-site compatibility */
  textWhite?: boolean;
}

// logo-transparent.png natural dimensions ~560×430 ≈ 1.3 : 1
const pngSizes = {
  sm: { w: 110, h: 60  },
  md: { w: 148, h: 80  },
  lg: { w: 220, h: 120 },
  xl: { w: 294, h: 160 },
};

// Icon-only (collapsed sidebar): square container for SVG mark
const iconSizes = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-14 w-14",
  xl: "h-20 w-20",
};

export function Logo({
  size = "md",
  showText = true,
  className,
}: LogoProps) {
  if (!showText) {
    return (
      <div className={cn("shrink-0", iconSizes[size], className)}>
        <PrepflyMark className="h-full w-full" />
      </div>
    );
  }

  const ps = pngSizes[size];
  return (
    <div className={cn("shrink-0", className)}>
      <Image
        src="/icons/logo-transparent.png"
        alt="PrepFly"
        width={ps.w}
        height={ps.h}
        className="object-contain"
        priority
      />
    </div>
  );
}

export function LogoIcon({ size = 24 }: { size?: number }) {
  return <PrepflyMark style={{ width: size, height: size }} />;
}

export function PrepflyMark({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      aria-label="PrepFly"
    >
      <defs>
        <linearGradient id="pf-pg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#0EA5E9" />
          <stop offset="50%"  stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#4338CA" />
        </linearGradient>
        <linearGradient id="pf-wg" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#1D4ED8" />
          <stop offset="100%" stopColor="#0D9488" />
        </linearGradient>
        <radialGradient id="pf-gg" cx="35%" cy="30%" r="65%">
          <stop offset="0%"   stopColor="#FEF08A" />
          <stop offset="100%" stopColor="#B45309" />
        </radialGradient>
        <filter id="pf-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      <path fill="url(#pf-wg)"
        d="M57,9 C71,0 91,4 97,14 C91,23 72,23 58,27 Q53,25 54,17 Z" />
      <path fill="url(#pf-wg)" opacity="0.8"
        d="M57,20 C72,12 92,18 97,29 C91,37 72,37 58,39 Q53,37 54,28 Z" />
      <path fill="url(#pf-wg)" opacity="0.58"
        d="M56,31 C70,25 90,33 94,45 C88,52 70,51 57,49 Q52,47 53,39 Z" />

      <path fill="url(#pf-pg)"
        d="M7,7 L7,91 L21,91 L21,52 L37,52 Q68,52 68,29 Q68,7 37,7 Z" />

      <circle cx="37" cy="29" r="16" fill="rgba(255,255,255,0.18)" />

      <g transform="translate(37,29)">
        <path fill="url(#pf-gg)" d="M0,-13 L4,-4 L0,0 L-4,-4 Z" />
        <path fill="url(#pf-gg)" d="M13,0 L4,4 L0,0 L4,-4 Z" />
        <path fill="url(#pf-gg)" d="M0,13 L-4,4 L0,0 L4,4 Z" />
        <path fill="url(#pf-gg)" d="M-13,0 L-4,-4 L0,0 L-4,4 Z" />
        <path fill="#FCD34D" d="M9.2,-9.2 L2.6,-2.6 L0,0 L-2.6,-2.6 Z" />
        <path fill="#FCD34D" d="M9.2,9.2  L2.6,2.6  L0,0 L2.6,-2.6 Z"  />
        <path fill="#FCD34D" d="M-9.2,9.2  L-2.6,2.6 L0,0 L2.6,2.6 Z"  />
        <path fill="#FCD34D" d="M-9.2,-9.2 L-2.6,-2.6 L0,0 L-2.6,2.6 Z" />
        <circle r="4.5" fill="#F59E0B" />
        <circle r="2.2" fill="#FEFCE8" />
      </g>

      <path stroke="#FBBF24" strokeWidth="1.8" fill="none"
            strokeLinecap="round" opacity="0.75"
            d="M49,20 C64,8 80,6 91,9" />

      <g transform="translate(94,11)" filter="url(#pf-glow)">
        <circle r="8" fill="#FCD34D" opacity="0.25" />
        <path fill="#F59E0B" d="M0,-9  L2.5,-2.5 L0,0 L-2.5,-2.5 Z" />
        <path fill="#F59E0B" d="M9,0   L2.5,2.5  L0,0 L2.5,-2.5  Z" />
        <path fill="#F59E0B" d="M0,9   L-2.5,2.5 L0,0 L2.5,2.5   Z" />
        <path fill="#F59E0B" d="M-9,0  L-2.5,-2.5 L0,0 L-2.5,2.5 Z" />
        <circle r="3.2" fill="#FEF9C3" />
      </g>

      <rect x="7"  y="84" width="30" height="2.6" rx="1.2" fill="#0D9488" opacity="0.60" />
      <rect x="7"  y="88" width="25" height="2.6" rx="1.2" fill="#0EA5E9" opacity="0.46" />
      <rect x="7"  y="92" width="20" height="2.6" rx="1.2" fill="#3B82F6" opacity="0.34" />

      <path stroke="#0D9488" strokeWidth="1" fill="none" opacity="0.4"
            d="M39,84 L46,84 L46,76 M52,84 L58,84 L58,78" />
      <circle cx="46" cy="76" r="1.8" fill="#0D9488" opacity="0.4" />
      <circle cx="58" cy="78" r="1.8" fill="#0D9488" opacity="0.4" />
      <circle cx="64" cy="84" r="1.2" fill="#0D9488" opacity="0.3" />
    </svg>
  );
}
