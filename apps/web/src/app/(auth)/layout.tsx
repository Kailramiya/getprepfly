import { Globe } from "lucide-react";
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Left Panel — Branding */}
      <div className="hidden w-1/2 bg-gradient-to-br from-teal-500 via-indigo-600 to-purple-700 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
            <Globe className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-white">PTE Master</span>
        </Link>

        <div>
          <h1 className="text-4xl font-bold leading-tight text-white">
            Score 79+ in PTE Academic
          </h1>
          <p className="mt-4 text-lg text-white/80">
            AI-powered practice for Speaking, Writing, Reading & Listening.
            Free during beta — all features unlocked.
          </p>

          <div className="mt-10 grid grid-cols-2 gap-4">
            {[
              { label: "Speaking", icon: "🎤" },
              { label: "Writing", icon: "✏️" },
              { label: "Reading", icon: "📖" },
              { label: "Listening", icon: "🎧" },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm"
              >
                <span className="text-2xl">{item.icon}</span>
                <span className="text-sm font-medium text-white">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-sm text-white/60">
          Made in India. For students who dream of going abroad.
        </p>
      </div>

      {/* Right Panel — Auth Form */}
      <div className="flex w-full items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
