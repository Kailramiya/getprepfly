import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  className?: string;
}

const sizes = {
  sm: { icon: "h-8 w-8", plane: "h-4 w-4", text: "text-lg" },
  md: { icon: "h-10 w-10", plane: "h-5 w-5", text: "text-xl" },
  lg: { icon: "h-14 w-14", plane: "h-7 w-7", text: "text-2xl" },
  xl: { icon: "h-20 w-20", plane: "h-10 w-10", text: "text-4xl" },
};

export function Logo({ size = "md", showText = true, className }: LogoProps) {
  const s = sizes[size];

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      {/* Icon Mark */}
      <div className={cn("relative flex items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-indigo-600 shadow-md", s.icon)}>
        {/* Paper Airplane SVG */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={cn("text-white", s.plane)}
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M21.707 2.293a1 1 0 00-1.069-.225l-18 7a1 1 0 00.074 1.874l8.024 2.674 2.674 8.024a1 1 0 001.874.074l7-18a1 1 0 00-.225-1.069zM18.263 5.737l-7.87 7.87-5.263-1.754L18.263 5.737zM12.146 18.13l-1.754-5.263 7.87-7.87L12.146 18.13z"
            fill="currentColor"
          />
        </svg>
        {/* Small sparkle dot */}
        <div className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-amber-400 shadow-sm" />
      </div>

      {/* Wordmark */}
      {showText && (
        <span className={cn("font-bold tracking-tight", s.text)}>
          <span className="text-teal-600">Prep</span>
          <span className="text-indigo-600">fly</span>
        </span>
      )}
    </div>
  );
}

// Icon-only version for favicon/PWA — renders as pure SVG
export function LogoIcon({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Rounded square background with gradient */}
      <defs>
        <linearGradient id="logoGrad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#14B8A6" />
          <stop offset="100%" stopColor="#4F46E5" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="22" fill="url(#logoGrad)" />
      {/* Paper airplane */}
      <path
        d="M75.5 24.5a2.5 2.5 0 00-2.67-.56l-45 17.5a2.5 2.5 0 00.18 4.69l20.06 6.68 6.68 20.06a2.5 2.5 0 004.69.18l17.5-45a2.5 2.5 0 00-.56-2.67zM65.66 34.34l-19.68 19.68-13.16-4.39L65.66 34.34zM50.37 65.17l-4.39-13.16 19.68-19.68L50.37 65.17z"
        fill="white"
      />
      {/* Sparkle dot */}
      <circle cx="78" cy="22" r="5" fill="#FBBF24" />
    </svg>
  );
}
