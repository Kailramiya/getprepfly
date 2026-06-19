import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  className?: string;
  /** true = white wordmark (for dark/gradient backgrounds) */
  textWhite?: boolean;
}

const sizes = {
  sm: { icon: "h-8 w-8",   text: "text-lg" },
  md: { icon: "h-10 w-10", text: "text-xl" },
  lg: { icon: "h-14 w-14", text: "text-2xl" },
  xl: { icon: "h-20 w-20", text: "text-4xl" },
};

export function Logo({
  size = "md",
  showText = true,
  className,
  textWhite = false,
}: LogoProps) {
  const s = sizes[size];
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className={cn("shrink-0", s.icon)}>
        <PrepflyMark className="h-full w-full" />
      </div>
      {showText && (
        <span className={cn("font-extrabold tracking-tight leading-none", s.text)}>
          <span className={textWhite ? "text-white" : "text-blue-700"}>Prep</span>
          <span className={textWhite ? "text-teal-200" : "text-teal-600 dark:text-teal-400"}>Fly</span>
        </span>
      )}
    </div>
  );
}

/** Pure SVG for use as an image/favicon */
export function LogoIcon({ size = 24 }: { size?: number }) {
  return <PrepflyMark style={{ width: size, height: size }} />;
}

/**
 * PrepFly SVG mark — 100 × 100 viewBox, transparent background.
 *
 * Elements (back → front):
 *   1. Wings  — 3 teal-blue feathers sweeping right from P's bowl
 *   2. P      — solid gradient fill (sky-blue → indigo)
 *   3. Glow   — soft white circle behind compass
 *   4. Compass— 8-pointed gold star inside P's bowl
 *   5. Arc    — gold trajectory line from compass to star
 *   6. Star   — 4-pointed gold sparkle at wing tip
 *   7. Book   — stacked page lines at P base
 *   8. Circuit— subtle tech traces below book
 */
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
        {/* P gradient: sky-blue → blue → indigo */}
        <linearGradient id="pf-pg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#0EA5E9" />
          <stop offset="50%"  stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#4338CA" />
        </linearGradient>
        {/* Wing gradient: indigo → teal (left-to-right) */}
        <linearGradient id="pf-wg" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#1D4ED8" />
          <stop offset="100%" stopColor="#0D9488" />
        </linearGradient>
        {/* Gold compass radial */}
        <radialGradient id="pf-gg" cx="35%" cy="30%" r="65%">
          <stop offset="0%"   stopColor="#FEF08A" />
          <stop offset="100%" stopColor="#B45309" />
        </radialGradient>
        {/* Soft glow filter for the star */}
        <filter id="pf-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* ── 1. Wings: 3 feathers curving right from P's bowl ─────────────── */}
      {/* Wing 1 — top, longest, most vibrant */}
      <path fill="url(#pf-wg)"
        d="M57,9 C71,0 91,4 97,14 C91,23 72,23 58,27 Q53,25 54,17 Z" />
      {/* Wing 2 — middle */}
      <path fill="url(#pf-wg)" opacity="0.8"
        d="M57,20 C72,12 92,18 97,29 C91,37 72,37 58,39 Q53,37 54,28 Z" />
      {/* Wing 3 — lower, most transparent */}
      <path fill="url(#pf-wg)" opacity="0.58"
        d="M56,31 C70,25 90,33 94,45 C88,52 70,51 57,49 Q52,47 53,39 Z" />

      {/* ── 2. P letter — solid bold fill ───────────────────────────────── */}
      {/*    Stem x=7–21 | Bowl curves right to x=68 at y=29, back to x=37  */}
      <path fill="url(#pf-pg)"
        d="M7,7 L7,91 L21,91 L21,52 L37,52 Q68,52 68,29 Q68,7 37,7 Z" />

      {/* ── 3. Glow circle in bowl for compass backdrop ──────────────────── */}
      <circle cx="37" cy="29" r="16" fill="rgba(255,255,255,0.18)" />

      {/* ── 4. Compass Rose — centred at (37, 29) ─────────────────────────  */}
      <g transform="translate(37,29)">
        {/* Cardinal spikes N / E / S / W — larger for visibility */}
        <path fill="url(#pf-gg)" d="M0,-13 L4,-4 L0,0 L-4,-4 Z" />
        <path fill="url(#pf-gg)" d="M13,0 L4,4 L0,0 L4,-4 Z" />
        <path fill="url(#pf-gg)" d="M0,13 L-4,4 L0,0 L4,4 Z" />
        <path fill="url(#pf-gg)" d="M-13,0 L-4,-4 L0,0 L-4,4 Z" />
        {/* Intercardinal spikes NE / SE / SW / NW */}
        <path fill="#FCD34D" d="M9.2,-9.2 L2.6,-2.6 L0,0 L-2.6,-2.6 Z" />
        <path fill="#FCD34D" d="M9.2,9.2  L2.6,2.6  L0,0 L2.6,-2.6 Z"  />
        <path fill="#FCD34D" d="M-9.2,9.2  L-2.6,2.6 L0,0 L2.6,2.6 Z"  />
        <path fill="#FCD34D" d="M-9.2,-9.2 L-2.6,-2.6 L0,0 L-2.6,2.6 Z" />
        {/* Hub rings */}
        <circle r="4.5" fill="#F59E0B" />
        <circle r="2.2" fill="#FEFCE8" />
      </g>

      {/* ── 5. Gold arc — compass to star (navigation trajectory) ───────── */}
      <path stroke="#FBBF24" strokeWidth="1.8" fill="none"
            strokeLinecap="round" strokeDasharray="0" opacity="0.75"
            d="M49,20 C64,8 80,6 91,9" />

      {/* ── 6. Gold sparkle star at wing tip ─────────────────────────────── */}
      <g transform="translate(94,11)" filter="url(#pf-glow)">
        {/* Outer soft glow */}
        <circle r="8" fill="#FCD34D" opacity="0.25" />
        {/* 4-pointed star */}
        <path fill="#F59E0B" d="M0,-9  L2.5,-2.5 L0,0 L-2.5,-2.5 Z" />
        <path fill="#F59E0B" d="M9,0   L2.5,2.5  L0,0 L2.5,-2.5  Z" />
        <path fill="#F59E0B" d="M0,9   L-2.5,2.5 L0,0 L2.5,2.5   Z" />
        <path fill="#F59E0B" d="M-9,0  L-2.5,-2.5 L0,0 L-2.5,2.5 Z" />
        {/* Bright centre */}
        <circle r="3.2" fill="#FEF9C3" />
      </g>

      {/* ── 7. Book pages stacked at P base ──────────────────────────────── */}
      <rect x="7"  y="84" width="30" height="2.6" rx="1.2" fill="#0D9488" opacity="0.60" />
      <rect x="7"  y="88" width="25" height="2.6" rx="1.2" fill="#0EA5E9" opacity="0.46" />
      <rect x="7"  y="92" width="20" height="2.6" rx="1.2" fill="#3B82F6" opacity="0.34" />

      {/* ── 8. Circuit traces (tech detail, subtle) ───────────────────────── */}
      <path stroke="#0D9488" strokeWidth="1" fill="none" opacity="0.4"
            d="M39,84 L46,84 L46,76 M52,84 L58,84 L58,78" />
      <circle cx="46" cy="76" r="1.8" fill="#0D9488" opacity="0.4" />
      <circle cx="58" cy="78" r="1.8" fill="#0D9488" opacity="0.4" />
      <circle cx="64" cy="84" r="1.2" fill="#0D9488" opacity="0.3" />
    </svg>
  );
}
