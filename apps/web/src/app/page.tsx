import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  BookOpen, Mic, Headphones, PenTool, BarChart3, Users, Zap, Sparkles, Target,
  BookMarked, Languages, ShieldCheck, Smartphone, ClipboardList, Flag, TrendingUp,
  FileText, Building2, Megaphone, GraduationCap, CheckCircle2, Brain, Layers, Crown,
  Download, Globe2, Clock, Award
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { getCurrentUser } from "@/lib/auth-utils";
import type { Metadata } from "next";
import { FaqAccordion, FAQItem } from "@/components/faq-accordion";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata: Metadata = {
  title: "PrepFly — AI-Powered PTE Academic Practice Platform",
  description:
    "Score 79+ in PTE Academic with PrepFly. Practice all 20+ question types — Speaking, Writing, Reading & Listening — with AI-powered instant feedback, full mock tests, predictions, vocabulary and progress analytics. Free during beta.",
  alternates: { canonical: "https://getprepfly.com" },
  openGraph: {
    title: "PrepFly — AI-Powered PTE Academic Practice Platform",
    description:
      "Score 79+ in PTE Academic with PrepFly. All 20+ question types, AI scoring, mock tests, predictions, vocabulary & analytics. Free during beta.",
    url: "https://getprepfly.com",
    type: "website",
    images: [
      {
        url: "https://getprepfly.com/icons/logo.png",
        width: 1024,
        height: 559,
        alt: "PrepFly — AI-Powered PTE Practice Platform",
      },
    ],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://getprepfly.com/#organization",
      name: "PrepFly",
      alternateName: ["Prepfly", "getprepfly", "PrepFly PTE"],
      url: "https://getprepfly.com",
      logo: {
        "@type": "ImageObject",
        url: "https://getprepfly.com/icons/logo.png",
        width: 1024,
        height: 559,
      },
      image: "https://getprepfly.com/icons/logo.png",
      description: "AI-powered PTE Academic practice platform for students preparing for the Pearson Test of English. Based in India.",
      foundingDate: "2024",
      foundingLocation: {
        "@type": "Country",
        name: "India",
      },
      areaServed: ["IN", "AU", "GB", "CA", "NZ"],
      sameAs: [
        "https://instagram.com/getprepfly",
        "https://www.linkedin.com/company/prepfly",
        "https://twitter.com/getprepfly",
        "https://facebook.com/getprepfly",
        "https://youtube.com/@getprepfly",
      ],
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: "support@getprepfly.com",
        availableLanguage: ["English", "Hindi"],
      },
    },
    {
      "@type": "WebSite",
      "@id": "https://getprepfly.com/#website",
      url: "https://getprepfly.com",
      name: "PrepFly",
      alternateName: "getprepfly.com",
      publisher: { "@id": "https://getprepfly.com/#organization" },
      inLanguage: "en-IN",
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: "https://getprepfly.com/register?ref={search_term_string}",
        },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://getprepfly.com/#app",
      name: "PrepFly",
      alternateName: "PrepFly PTE Practice",
      url: "https://getprepfly.com",
      applicationCategory: "EducationApplication",
      operatingSystem: "Web, Android, iOS",
      inLanguage: "en-IN",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "INR",
        description: "Free during beta — all features unlocked",
        availability: "https://schema.org/InStock",
      },
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: "4.8",
        ratingCount: "120",
        bestRating: "5",
      },
      publisher: { "@id": "https://getprepfly.com/#organization" },
      description:
        "Practice PTE Academic with AI-powered scoring across Speaking, Writing, Reading and Listening. Full mock tests, predictions, vocabulary and analytics included.",
      featureList: [
        "AI-powered speaking scoring with word-level pronunciation feedback",
        "Writing feedback with grammar, spelling and structure analysis",
        "All 20+ PTE question types",
        "Full and sectional timed mock tests with band scores",
        "Weekly prediction questions",
        "Vocabulary builder in English, Hindi and Punjabi",
        "Progress analytics and skill-wise score estimates",
        "Coaching centre management and white-labelling",
      ],
    },
    {
      "@type": "FAQPage",
      "@id": "https://getprepfly.com/#faq",
      mainEntity: [
        {
          "@type": "Question",
          name: "What is PrepFly?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "PrepFly (getprepfly.com) is an AI-powered PTE Academic practice platform. It covers all 22 question types across Speaking, Writing, Reading and Listening with instant AI feedback, full mock tests, and progress analytics.",
          },
        },
        {
          "@type": "Question",
          name: "Is PrepFly free?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes, PrepFly is completely free during the beta phase. All features including AI scoring, mock tests, vocabulary and analytics are fully unlocked.",
          },
        },
        {
          "@type": "Question",
          name: "How does PrepFly help achieve PTE 79+?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "PrepFly uses AI scoring calibrated to PTE Academic band descriptors, giving you real-time feedback on pronunciation, fluency, grammar and content — the exact criteria Pearson uses — so you can improve faster than with traditional practice.",
          },
        },
      ],
    },
  ],
};

// ── All 20+ question types, grouped by skill ───────────────────────────────
const skills = [
  {
    icon: Mic,
    title: "Speaking",
    note: "AI pronunciation, fluency & content scoring on every recording",
    types: ["Read Aloud", "Repeat Sentence", "Describe Image", "Re-tell Lecture", "Answer Short Question", "Respond to a Situation", "Summarize Group Discussion"],
  },
  {
    icon: PenTool,
    title: "Writing",
    note: "Grammar, spelling, structure & vocabulary analysis with inline corrections",
    types: ["Summarize Written Text", "Write Essay"],
  },
  {
    icon: BookOpen,
    title: "Reading",
    note: "Instant auto-scoring with answer explanations",
    types: ["Multiple Choice — Single", "Multiple Choice — Multiple", "Re-order Paragraphs", "Fill in the Blanks (Drag & Drop)", "Fill in the Blanks (Dropdown)"],
  },
  {
    icon: Headphones,
    title: "Listening",
    note: "Audio with speed control and exam-mode play-once",
    types: ["Summarize Spoken Text", "Multiple Choice", "Fill in the Blanks", "Highlight Correct Summary", "Highlight Incorrect Words", "Select Missing Word", "Write from Dictation"],
  },
];

// ── Core platform features ──────────────────────────────────────────────────
const features = [
  { icon: Brain, title: "AI Speaking Scoring", desc: "Whisper-powered transcription with word-level pronunciation, fluency and content feedback on every recording." },
  { icon: Sparkles, title: "AI Writing Feedback", desc: "Detailed grammar, spelling, structure and content scoring with inline corrections and improvement tips." },
  { icon: ClipboardList, title: "Full & Sectional Mock Tests", desc: "Timed, real-exam simulation with section-wise and overall band score estimates." },
  { icon: Target, title: "Skill Score Estimate", desc: "A 0–90 estimate for each skill using the official PTE weighted scoring model." },
  { icon: TrendingUp, title: "Progress Analytics", desc: "Track your practice streak, spot weak vs strong areas, and watch your score trend over time." },
  { icon: Zap, title: "Weekly Predictions", desc: "Practice the high-frequency questions most likely to appear in the real exam." },
  { icon: FileText, title: "Templates & Study Guides", desc: "Proven essay and speaking templates, plus strategy guides for every question type." },
  { icon: BookMarked, title: "Vocabulary Builder", desc: "Word of the day, flashcards, and tap-any-word meanings in English, Hindi and Punjabi." },
  { icon: Flag, title: "Flag & Review", desc: "Mark questions as weak, strong or review and revisit them anytime from My Flags." },
  { icon: Languages, title: "Multilingual", desc: "Use the platform in English, Hindi or Punjabi." },
  { icon: Smartphone, title: "Practice Anywhere", desc: "Installable web app (PWA) that works smoothly on mobile and desktop." },
  { icon: ShieldCheck, title: "Secure & Fair", desc: "Single-device login and content protection keep accounts and questions safe." },
];

// ── Coaching-centre features ────────────────────────────────────────────────
const centreFeatures = [
  { icon: Crown, title: "White-label branding", desc: "Your logo and brand colours across the student experience." },
  { icon: Users, title: "Student management", desc: "Add students by email or a single-use invite link." },
  { icon: Layers, title: "Batches & assigned tests", desc: "Group students into batches and assign mock tests." },
  { icon: GraduationCap, title: "Teacher accounts", desc: "Give teachers their own access to manage students." },
  { icon: BarChart3, title: "Centre analytics", desc: "Monitor every student's progress and performance." },
  { icon: Megaphone, title: "Announcements", desc: "Broadcast messages and updates to your students." },
  { icon: CheckCircle2, title: "Seat management", desc: "Grant and renew monthly access per student." },
  { icon: BookOpen, title: "Question bank", desc: "Add your own questions plus the shared global bank." },
];

const steps = [
  { n: "1", title: "Create your free account", desc: "Sign up in under a minute — no credit card needed during beta." },
  { n: "2", title: "Practice with instant AI feedback", desc: "Attempt any of 20+ question types and get scored immediately." },
  { n: "3", title: "Mock test & track your band", desc: "Take full mock tests and watch your skill scores climb." },
];

const stats = [
  { value: "20+", label: "Question Types" },
  { value: "4", label: "Skills Scored" },
  { value: "AI", label: "Instant Feedback" },
  { value: "3", label: "Languages" },
];

const faqItems: FAQItem[] = [
  {
    question: "What is the PTE Academic test?",
    answer: "The Pearson Test of English Academic (PTE Academic) is a computer-based English language test accepted by educational institutions and governments around the world. It assesses Reading, Writing, Listening and Speaking in a single 2-hour session."
  },
  {
    question: "Is PrepFly completely free?",
    answer: "Yes! PrepFly is currently in its beta phase, which means all of our premium features — including AI speaking scoring, detailed writing feedback, and full mock tests — are completely free to use."
  },
  {
    question: "PTE vs IELTS: What is the difference?",
    answer: "Unlike IELTS which has a human examiner for speaking, PTE is entirely computer-scored, making it highly objective and unbiased. PTE also delivers results much faster (typically within 48 hours) and is completed in a single 2-hour sitting."
  },
  {
    question: "How does the AI scoring work?",
    answer: "Our AI engines are calibrated specifically to Pearson's scoring criteria. When you record a Read Aloud or Describe Image, the AI analyzes your fluency, pronunciation at the word level, and content matching to give you an accurate 10-90 score."
  },
  {
    question: "Can I use PrepFly on my phone?",
    answer: "Absolutely. PrepFly is a Progressive Web App (PWA). You can 'Install' it directly from your browser menu to your mobile home screen and use it just like a native app."
  }
];

export default async function HomePage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen">
        {/* Navbar */}
        <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/80">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <Link href="/"><Logo size="sm" /></Link>
            <div className="hidden items-center gap-8 md:flex">
              <Link href="#skills" className="text-sm text-gray-600 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-100">Question Types</Link>
              <Link href="#features" className="text-sm text-gray-600 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-100">Features</Link>
              <Link href="#centres" className="text-sm text-gray-600 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-100">For Centres</Link>
              <Link href="/download" className="text-sm text-gray-600 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-100">Download App</Link>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Link href="/login"><Button variant="ghost" size="sm">Log in</Button></Link>
              <Link href="/register"><Button size="sm">Start Free</Button></Link>
            </div>
          </div>
        </nav>

        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-br from-teal-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <div className="inline-flex items-center gap-2 rounded-full bg-teal-100 px-4 py-1.5 text-sm font-medium text-teal-700 dark:bg-teal-950/40 dark:text-teal-300">
                  <Zap className="h-4 w-4" />
                  New AI Engine
                </div>
                <div className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-slate-400">
                  <div className="flex -space-x-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Image
                        key={i}
                        className="inline-block h-8 w-8 rounded-full border-2 border-white dark:border-slate-900"
                        src={`https://i.pravatar.cc/100?img=${i + 10}`}
                        alt=""
                        width={32}
                        height={32}
                        unoptimized
                      />
                    ))}
                  </div>
                  <span>Join 10,000+ test takers</span>
                </div>
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-slate-50 sm:text-5xl lg:text-6xl">
                Score <span className="bg-gradient-to-r from-teal-600 to-indigo-600 bg-clip-text text-transparent">79+</span> in PTE Academic
              </h1>
              <p className="mt-6 text-lg text-gray-600 dark:text-slate-300 sm:text-xl">
                Everything you need in one place — all 20+ question types, instant AI scoring,
                full mock tests, predictions, vocabulary and progress analytics.
                Free during beta.
              </p>
              <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Link href="/register">
                  <Button size="xl" className="bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-600 hover:to-indigo-700">Start Practicing Free</Button>
                </Link>
                <Link href="#skills"><Button variant="outline" size="xl">Explore Features</Button></Link>
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

        {/* Why Choose PTE? */}
        <section className="py-20 bg-gray-50 dark:bg-slate-950/40">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Why choose PTE Academic?</h2>
              <p className="mt-4 text-lg text-gray-600 dark:text-slate-400">Accepted by governments and universities around the world.</p>
            </div>
            <div className="mt-16 grid gap-8 sm:grid-cols-3">
              <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-teal-100 text-teal-600 dark:bg-teal-950/30 dark:text-teal-400">
                  <Clock className="h-8 w-8" />
                </div>
                <h3 className="mt-6 text-xl font-semibold text-gray-900 dark:text-slate-100">2-Hour Single Test</h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">Go worry-free. Assess all 4 skills in a single, short session.</p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400">
                  <Zap className="h-8 w-8" />
                </div>
                <h3 className="mt-6 text-xl font-semibold text-gray-900 dark:text-slate-100">Fast Results</h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">Celebrate your results typically within just 48 hours.</p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400">
                  <Globe2 className="h-8 w-8" />
                </div>
                <h3 className="mt-6 text-xl font-semibold text-gray-900 dark:text-slate-100">Globally Accepted</h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">Approved for all UK, Australian &amp; New Zealand visa applications.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Skills / question types */}
        <section id="skills" className="py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Every PTE question type, covered</h2>
              <p className="mt-4 text-lg text-gray-600 dark:text-slate-400">All four skills, all 20+ task types — with the right scoring for each.</p>
            </div>
            <div className="mt-16 grid gap-6 md:grid-cols-2">
              {skills.map((s) => (
                <div key={s.title} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-indigo-600 text-white">
                      <s.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{s.title}</h3>
                      <p className="text-xs text-gray-500 dark:text-slate-400">{s.note}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {s.types.map((t) => (
                      <span key={t} className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 dark:bg-slate-700 dark:text-slate-300">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Core features */}
        <section id="features" className="bg-gray-50 py-20 dark:bg-slate-950/40">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Everything you need to crack PTE</h2>
              <p className="mt-4 text-lg text-gray-600 dark:text-slate-400">Powerful tools that turn practice into a higher score.</p>
            </div>
            <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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

        {/* Featured Study Tools */}
        <section className="py-20 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-slate-100">PTE Study Tools</h2>
              <p className="mt-4 text-lg text-gray-600 dark:text-slate-400">Tools designed to accelerate your score improvement.</p>
            </div>
            <div className="mt-16 grid gap-6 lg:grid-cols-3">
              <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-8 shadow-lg transition-transform hover:-translate-y-1">
                <div className="relative z-10">
                  <BookMarked className="h-10 w-10 text-white opacity-90" />
                  <h3 className="mt-6 text-2xl font-bold text-white">Vocab Book</h3>
                  <p className="mt-2 text-indigo-100">Contains 90% of exam vocabs. Build your foundation with spaced repetition in English, Hindi, and Punjabi.</p>
                </div>
                <div className="absolute -bottom-6 -right-6 h-32 w-32 rounded-full bg-white opacity-10 blur-2xl"></div>
              </div>
              <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-600 p-8 shadow-lg transition-transform hover:-translate-y-1">
                <div className="relative z-10">
                  <Mic className="h-10 w-10 text-white opacity-90" />
                  <h3 className="mt-6 text-2xl font-bold text-white">Shadowing</h3>
                  <p className="mt-2 text-teal-100">Improve Read Aloud fluency in 14 days by repeating after native speakers word-by-word.</p>
                </div>
                <div className="absolute -bottom-6 -right-6 h-32 w-32 rounded-full bg-white opacity-10 blur-2xl"></div>
              </div>
              <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 p-8 shadow-lg transition-transform hover:-translate-y-1">
                <div className="relative z-10">
                  <Award className="h-10 w-10 text-white opacity-90" />
                  <h3 className="mt-6 text-2xl font-bold text-white">AI Analysis</h3>
                  <p className="mt-2 text-amber-100">Accurate score report analysis. Find exactly where you are losing points and how to fix it.</p>
                </div>
                <div className="absolute -bottom-6 -right-6 h-32 w-32 rounded-full bg-white opacity-10 blur-2xl"></div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Get started in three steps</h2>
            </div>
            <div className="mt-16 grid gap-8 md:grid-cols-3">
              {steps.map((step) => (
                <div key={step.n} className="text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-indigo-600 text-xl font-bold text-white">
                    {step.n}
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-gray-900 dark:text-slate-100">{step.title}</h3>
                  <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* For Centres */}
        <section id="centres" className="bg-gradient-to-r from-teal-600 to-indigo-600 py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <Building2 className="mx-auto h-12 w-12 text-teal-200" />
              <h2 className="mt-6 text-3xl font-bold text-white">Built for coaching centres too</h2>
              <p className="mt-4 text-lg text-teal-100">
                Run your PTE coaching on Prepfly — your brand, your students, your batches.
              </p>
            </div>
            <div className="mx-auto mt-12 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {centreFeatures.map((f) => (
                <div key={f.title} className="rounded-xl bg-white/10 p-5 backdrop-blur-sm">
                  <f.icon className="h-6 w-6 text-teal-100" />
                  <h3 className="mt-3 text-sm font-semibold text-white">{f.title}</h3>
                  <p className="mt-1 text-xs text-teal-100/90">{f.desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-12 text-center">
              <Link href="/register?role=centre">
                <Button size="xl" className="bg-white text-indigo-600 hover:bg-teal-50">Register Your Centre</Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Download App Banner */}
        <section className="border-t border-gray-200 bg-gray-50 py-16 dark:border-slate-700 dark:bg-slate-800/50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center justify-between gap-8 rounded-3xl bg-gradient-to-r from-gray-900 to-slate-800 p-8 shadow-xl sm:flex-row sm:p-12">
              <div className="max-w-xl text-center sm:text-left">
                <h2 className="text-2xl font-bold text-white sm:text-3xl">Practice anywhere, anytime.</h2>
                <p className="mt-4 text-gray-300 text-lg">Download the PrepFly app to practice on the go. Available for iOS, Android, and Desktop via PWA.</p>
              </div>
              <div className="flex flex-shrink-0 gap-4">
                <Link href="/download">
                  <Button size="lg" className="bg-white text-gray-900 hover:bg-gray-100 border-none font-semibold px-8 h-14 rounded-full">
                    <Download className="mr-2 h-5 w-5" />
                    Download App
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="border-t border-gray-200 bg-white py-20 dark:border-slate-700 dark:bg-slate-900">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-slate-100">PTE Knowledge &amp; FAQs</h2>
              <p className="mt-4 text-lg text-gray-600 dark:text-slate-400">Everything you need to know about the PTE Academic exam.</p>
            </div>
            <FaqAccordion items={faqItems} />
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Ready to score 79+?</h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-slate-400">Join Prepfly free during beta and start improving today.</p>
            <div className="mt-8">
              <Link href="/register">
                <Button size="xl" className="bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-600 hover:to-indigo-700">Create Free Account</Button>
              </Link>
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
              &copy; {new Date().getFullYear()} Prepfly. All rights reserved. Prepfly is an independent practice platform and is not affiliated with Pearson PTE.
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
