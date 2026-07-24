import Link from "next/link";
import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] bg-background">
      {/* Left Panel — Branding */}
      <div className="relative hidden w-1/2 overflow-hidden bg-background lg:flex lg:flex-col lg:justify-between lg:p-12 border-r border-white/5">
        <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(ellipse_at_center,rgba(20,184,166,0.15),transparent_60%)] dark:bg-[radial-gradient(ellipse_at_center,rgba(20,184,166,0.1),transparent_60%)]"></div>
        <Link href="/">
          <Logo size="md" showText />
        </Link>

        <div>
          <h1 className="text-4xl font-extrabold tracking-tighter text-foreground sm:text-5xl leading-tight">
            Score <span className="bg-gradient-to-r from-teal-500 to-indigo-500 bg-clip-text text-transparent">79+</span> in PTE Academic
          </h1>
          <p className="mt-6 text-lg font-medium text-muted-foreground leading-relaxed max-w-md">
            AI-powered practice for Speaking, Writing, Reading & Listening.
            Free during beta — all features unlocked.
          </p>

          <div className="mt-12 grid grid-cols-2 gap-4">
            {[
              { label: "Speaking", icon: "🎤" },
              { label: "Writing", icon: "✏️" },
              { label: "Reading", icon: "📖" },
              { label: "Listening", icon: "🎧" },
            ].map((item) => (
              <div
                key={item.label}
                className="group flex items-center gap-4 rounded-2xl border border-white/5 bg-card/50 p-4 backdrop-blur-md shadow-glass dark:shadow-glass-dark transition-all duration-700 ease-fluid hover:bg-white/5 hover:shadow-float"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10 shadow-inner group-hover:scale-110 transition-transform duration-700 ease-fluid text-xl">
                  {item.icon}
                </div>
                <span className="text-sm font-bold tracking-wide text-foreground">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground/60">
          Made in India. For students who dream of going abroad.
        </p>
      </div>

      {/* Right Panel — Auth Form */}
      <div className="flex w-full items-center justify-center px-6 py-12 lg:w-1/2 bg-background relative z-10">
        <div className="w-full max-w-[420px] rounded-[2rem] border border-white/5 bg-card p-8 sm:p-12 shadow-glass dark:shadow-glass-dark relative z-20 overflow-hidden">
           {children}
        </div>
      </div>
    </div>
  );
}
