import Link from "next/link";
import { Logo } from "@/components/logo";
import { CheckCircle2 } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] flex-col lg:flex-row bg-background">
      {/* Left Panel — Branding */}
      <div className="relative flex flex-col justify-center lg:justify-between w-full lg:w-[45%] bg-background p-6 pt-10 pb-4 lg:p-12 border-b lg:border-b-0 lg:border-r border-white/5 shrink-0">
        <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(ellipse_at_center,rgba(20,184,166,0.15),transparent_60%)] dark:bg-[radial-gradient(ellipse_at_center,rgba(20,184,166,0.1),transparent_60%)]"></div>
        <Link href="/" className="mb-8 lg:mb-0 flex justify-center lg:justify-start">
          <Logo size="lg" showText />
        </Link>

        <div className="flex-1 flex flex-col justify-center text-center lg:text-left">
          <h1 className="text-3xl font-extrabold tracking-tighter text-foreground sm:text-4xl lg:text-5xl leading-tight">
            Score <span className="bg-gradient-to-r from-teal-500 to-indigo-500 bg-clip-text text-transparent">79+</span> in PTE Academic
          </h1>
          
          <p className="mt-4 text-base lg:text-lg font-medium text-muted-foreground leading-relaxed max-w-md mx-auto lg:mx-0">
            Start free. Get 3 AI-scored attempts every day, no card needed. Upgrade anytime from ₹249/month.
          </p>

          <div className="mt-8 lg:mt-12 hidden lg:flex flex-col gap-4">
            {[
              "3 AI-scored attempts every day",
              "All 20+ question types covered",
              "Detailed progress tracking"
            ].map((text) => (
              <div
                key={text}
                className="flex items-center gap-4 rounded-2xl border border-white/5 bg-card/50 p-4 backdrop-blur-md shadow-glass dark:shadow-glass-dark transition-all duration-700 ease-fluid hover:bg-white/5 hover:shadow-float"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <span className="text-sm font-bold tracking-wide text-foreground">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="hidden lg:block text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground/60 mt-8">
          Made in India. For students who dream of going abroad.
        </p>
      </div>

      {/* Right Panel — Auth Form */}
      <div className="flex w-full items-center justify-center px-4 py-8 lg:px-6 lg:py-12 lg:w-[55%] bg-background relative z-10 flex-1">
        <div className="w-full max-w-[420px] rounded-[2rem] border border-white/5 bg-card p-6 sm:p-10 lg:p-12 shadow-glass dark:shadow-glass-dark relative z-20 overflow-hidden mx-auto">
           {children}
        </div>
      </div>
    </div>
  );
}
