import Link from "next/link";
import { BookOpen, Mic, Headphones, PenTool, BarChart3, Users, Zap, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  { icon: Mic, title: "Speaking Practice", desc: "AI-powered pronunciation and fluency scoring for all 6 speaking question types" },
  { icon: PenTool, title: "Writing Practice", desc: "Instant grammar, spelling, and content analysis with detailed feedback" },
  { icon: BookOpen, title: "Reading Practice", desc: "MCQ, reorder paragraphs, and fill-in-the-blanks with explanations" },
  { icon: Headphones, title: "Listening Practice", desc: "Audio-based questions with speed control and dictation practice" },
  { icon: BarChart3, title: "Smart Analytics", desc: "Track your progress, identify weak areas, and get personalized recommendations" },
  { icon: Zap, title: "Full Mock Tests", desc: "Timed mock tests that simulate the real PTE exam with band score estimates" },
];

const stats = [
  { value: "500+", label: "Coaching Centres" },
  { value: "50,000+", label: "Students" },
  { value: "20,000+", label: "Practice Questions" },
  { value: "95%", label: "Score Improvement" },
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600">
              <Globe className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">PTE Master</span>
          </Link>
          <div className="hidden items-center gap-8 md:flex">
            <Link href="#features" className="text-sm text-gray-600 hover:text-gray-900">Features</Link>
            <Link href="/download" className="text-sm text-gray-600 hover:text-gray-900">Download App</Link>
            <Link href="#centres" className="text-sm text-gray-600 hover:text-gray-900">For Centres</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">Log in</Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Start Free</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-indigo-100 px-4 py-1.5 text-sm font-medium text-indigo-700">
              <Zap className="h-4 w-4" />
              AI-Powered PTE Practice
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
              Score <span className="text-indigo-600">79+</span> in PTE Academic
            </h1>
            <p className="mt-6 text-lg text-gray-600 sm:text-xl">
              Practice all 20+ PTE question types with instant AI scoring.
              Trusted by 500+ coaching centres and 50,000+ students across India.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link href="/register">
                <Button size="xl">Start Practicing Free</Button>
              </Link>
              <Link href="#features">
                <Button variant="outline" size="xl">See How It Works</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-gray-200 bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 py-12 sm:px-6 md:grid-cols-4 lg:px-8">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl font-bold text-indigo-600">{stat.value}</p>
              <p className="mt-1 text-sm text-gray-600">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">Everything you need to crack PTE</h2>
            <p className="mt-4 text-lg text-gray-600">Practice smarter with AI-powered feedback on every question</p>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.title} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-100">
                  <feature.icon className="h-6 w-6 text-indigo-600" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">{feature.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For Centres CTA */}
      <section id="centres" className="bg-indigo-600 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <Users className="mx-auto h-12 w-12 text-indigo-200" />
            <h2 className="mt-6 text-3xl font-bold text-white">For Coaching Centres</h2>
            <p className="mt-4 text-lg text-indigo-100">
              White-label the platform with your branding. Track student progress,
              manage batches, and grow your business with AI-powered PTE practice.
            </p>
            <div className="mt-10">
              <Link href="/register?role=centre">
                <Button size="xl" className="bg-white text-indigo-600 hover:bg-indigo-50">
                  Register Your Centre
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-3">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-indigo-600">
                  <Globe className="h-4 w-4 text-white" />
                </div>
                <span className="text-lg font-bold text-gray-900">PTE Master</span>
              </div>
              <p className="mt-3 text-sm text-gray-500">
                AI-powered PTE practice platform. Made in India for students who dream of going abroad.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900">Platform</h4>
              <ul className="mt-3 space-y-2">
                <li><Link href="/register" className="text-sm text-gray-500 hover:text-gray-900">Sign Up Free</Link></li>
                <li><Link href="/login" className="text-sm text-gray-500 hover:text-gray-900">Log In</Link></li>
                <li><Link href="/download" className="text-sm text-gray-500 hover:text-gray-900">Download App</Link></li>
                <li><Link href="/register?role=centre" className="text-sm text-gray-500 hover:text-gray-900">Register Centre</Link></li>
              </ul>
            </div>

            {/* Get the App */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900">Get the App</h4>
              <ul className="mt-3 space-y-2">
                <li>
                  <Link href="/download" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900">
                    <span className="flex h-6 w-6 items-center justify-center rounded bg-gray-100 text-xs">🌐</span>
                    Web App (PWA)
                  </Link>
                </li>
                <li>
                  <span className="flex items-center gap-2 text-sm text-gray-400">
                    <span className="flex h-6 w-6 items-center justify-center rounded bg-gray-100 text-xs">📱</span>
                    Android — Coming Soon
                  </span>
                </li>
                <li>
                  <span className="flex items-center gap-2 text-sm text-gray-400">
                    <span className="flex h-6 w-6 items-center justify-center rounded bg-gray-100 text-xs">🍎</span>
                    iOS — Coming Soon
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 border-t border-gray-100 pt-8 text-center text-xs text-gray-400">
            &copy; {new Date().getFullYear()} PTE Master. All rights reserved. Free during beta period.
          </div>
        </div>
      </footer>
    </div>
  );
}
