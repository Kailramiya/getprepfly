import { redirect } from "next/navigation";
import Link from "next/link";
import { BookOpen, Mic, Headphones, PenTool, BarChart3, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { getCurrentUser } from "@/lib/auth-utils";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Prepfly — AI-Powered PTE Academic Practice Platform",
  description:
    "Score 79+ in PTE Academic with Prepfly. Practice all 20+ question types — Speaking, Writing, Reading & Listening — with AI-powered instant feedback. Free during beta.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Prepfly — AI-Powered PTE Academic Practice Platform",
    description:
      "Score 79+ in PTE Academic with Prepfly. Practice all 20+ question types with AI-powered instant feedback. Free during beta.",
    url: "https://getprepfly.com",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://getprepfly.com/#organization",
      name: "Prepfly",
      url: "https://getprepfly.com",
      logo: {
        "@type": "ImageObject",
        url: "https://getprepfly.com/icons/logo.svg",
      },
      description: "AI-powered PTE Academic practice platform for students preparing for the Pearson Test of English.",
      foundingLocation: "India",
    },
    {
      "@type": "WebSite",
      "@id": "https://getprepfly.com/#website",
      url: "https://getprepfly.com",
      name: "Prepfly",
      publisher: { "@id": "https://getprepfly.com/#organization" },
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: "https://getprepfly.com/register" },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://getprepfly.com/#app",
      name: "Prepfly",
      url: "https://getprepfly.com",
      applicationCategory: "EducationApplication",
      operatingSystem: "Web, Android, iOS",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "INR",
        description: "Free during beta — all features unlocked",
      },
      publisher: { "@id": "https://getprepfly.com/#organization" },
      description:
        "Practice PTE Academic with AI-powered scoring across Speaking, Writing, Reading and Listening. Full mock tests included.",
      featureList: [
        "AI-powered speaking scoring",
        "Writing feedback with grammar analysis",
        "All 20+ PTE question types",
        "Full timed mock tests",
        "Progress analytics",
        "Coaching centre management",
      ],
    },
  ],
};

const features = [
  { icon: Mic, title: "Speaking Practice", desc: "AI-powered pronunciation and fluency scoring for all 6 speaking question types" },
  { icon: PenTool, title: "Writing Practice", desc: "Instant grammar, spelling, and content analysis with detailed feedback" },
  { icon: BookOpen, title: "Reading Practice", desc: "MCQ, reorder paragraphs, and fill-in-the-blanks with explanations" },
  { icon: Headphones, title: "Listening Practice", desc: "Audio-based questions with speed control and dictation practice" },
  { icon: BarChart3, title: "Smart Analytics", desc: "Track your progress, identify weak areas, and get personalized recommendations" },
  { icon: Zap, title: "Full Mock Tests", desc: "Timed mock tests that simulate the real PTE exam with band score estimates" },
];

const stats = [
  { value: "20+", label: "Question Types" },
  { value: "4", label: "PTE Sections" },
  { value: "AI", label: "Powered Scoring" },
  { value: "Free", label: "During Beta" },
];

export default async function HomePage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    <div className="min-h-screen">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/">
            <Logo size="sm" />
          </Link>
          <div className="hidden items-center gap-8 md:flex">
            <Link href="#features" className="text-sm text-gray-600 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-100">Features</Link>
            <Link href="/download" className="text-sm text-gray-600 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-100">Download App</Link>
            <Link href="#centres" className="text-sm text-gray-600 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-100">For Centres</Link>
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
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-50 via-white to-indigo-50">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-teal-100 px-4 py-1.5 text-sm font-medium text-teal-700">
              <Zap className="h-4 w-4" />
              AI-Powered PTE Practice
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
              Score <span className="bg-gradient-to-r from-teal-600 to-indigo-600 bg-clip-text text-transparent">79+</span> in PTE Academic
            </h1>
            <p className="mt-6 text-lg text-gray-600 sm:text-xl">
              Practice all 20+ PTE question types with instant AI feedback.
              Free during beta — all features unlocked.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link href="/register">
                <Button size="xl" className="bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-600 hover:to-indigo-700">Start Practicing Free</Button>
              </Link>
              <Link href="#features">
                <Button variant="outline" size="xl">See How It Works</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 py-12 sm:px-6 md:grid-cols-4 lg:px-8">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-indigo-600 bg-clip-text text-transparent">{stat.value}</p>
              <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Everything you need to crack PTE</h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-slate-400">Practice smarter with AI-powered feedback on every question</p>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.title} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-teal-100 dark:bg-teal-950/30">
                  <feature.icon className="h-6 w-6 text-teal-600 dark:text-teal-400" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-slate-100">{feature.title}</h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For Centres CTA */}
      <section id="centres" className="bg-gradient-to-r from-teal-600 to-indigo-600 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <Users className="mx-auto h-12 w-12 text-teal-200" />
            <h2 className="mt-6 text-3xl font-bold text-white">For Coaching Centres</h2>
            <p className="mt-4 text-lg text-teal-100">
              White-label the platform with your branding. Track student progress,
              manage batches, and grow your business with AI-powered PTE practice.
            </p>
            <div className="mt-10">
              <Link href="/register?role=centre">
                <Button size="xl" className="bg-white text-indigo-600 hover:bg-teal-50">
                  Register Your Centre
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-12 dark:border-slate-700 dark:bg-slate-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Logo size="sm" />
              <p className="mt-3 text-sm text-gray-500 dark:text-slate-400">
                AI-powered PTE practice platform. Made in India for students who dream of going abroad.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Platform</h4>
              <ul className="mt-3 space-y-2">
                <li><Link href="/register" className="text-sm text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-100">Sign Up Free</Link></li>
                <li><Link href="/login" className="text-sm text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-100">Log In</Link></li>
                <li><Link href="/download" className="text-sm text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-100">Download App</Link></li>
                <li><Link href="/register?role=centre" className="text-sm text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-100">Register Centre</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Get the App</h4>
              <ul className="mt-3 space-y-2">
                <li><Link href="/download" className="text-sm text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-100">Web App (PWA)</Link></li>
                <li><span className="text-sm text-gray-400 dark:text-slate-500">Android — Coming Soon</span></li>
                <li><span className="text-sm text-gray-400 dark:text-slate-500">iOS — Coming Soon</span></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Legal</h4>
              <ul className="mt-3 space-y-2">
                <li><Link href="/terms" className="text-sm text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-100">Terms of Service</Link></li>
                <li><Link href="/privacy" className="text-sm text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-100">Privacy Policy</Link></li>
                <li><Link href="/refund-policy" className="text-sm text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-100">Refund &amp; Cancellation</Link></li>
                <li><Link href="/contact" className="text-sm text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-100">Contact Us</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t border-gray-100 pt-8 text-center text-xs text-gray-400 dark:border-slate-800 dark:text-slate-500">
            &copy; {new Date().getFullYear()} Prepfly. All rights reserved. Free during beta.
          </div>
        </div>
      </footer>
    </div>
    </>
  );
}
