import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  BookOpen, Mic, Headphones, PenTool, BarChart3, Users, Zap, Sparkles, Target,
  BookMarked, Languages, ShieldCheck, Smartphone, ClipboardList, Flag, TrendingUp,
  FileText, Building2, Megaphone, GraduationCap, CheckCircle2, Brain, Layers, Crown,
  Download, Globe2, Clock, Award, Check
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
    "Score 79+ in PTE Academic with PrepFly. Practice all 20+ question types — Speaking, Writing, Reading & Listening — with AI-powered instant feedback, full mock tests, predictions, vocabulary and progress analytics.",
  alternates: { canonical: "https://getprepfly.com" },
  openGraph: {
    title: "PrepFly — AI-Powered PTE Academic Practice Platform",
    description:
      "Score 79+ in PTE Academic with PrepFly. All 20+ question types, AI scoring, mock tests, predictions, vocabulary & analytics.",
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
        email: "prepfly.app@gmail.com",
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
        description: "Start with a 3-day free trial — all features unlocked",
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
            text: "PrepFly offers a 3-day free trial that gives you full access to all premium features including AI scoring, mock tests, vocabulary and analytics.",
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
  { icon: Target, title: "Skill Score Estimate", desc: "A 10-90 estimate for each skill using the official PTE weighted scoring model." },
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

const whyPrepflyFeatures = [
  { icon: Languages, title: "Your language", desc: "Interface and instant word meanings in English, Hindi and Punjabi." },
  { icon: TrendingUp, title: "Weekly predictions", desc: "Practise the high-frequency questions most likely to appear, updated every week." },
  { icon: Building2, title: "Built for coaching centres", desc: "Batches, assigned mock tests, teacher accounts and your own branding." },
  { icon: CheckCircle2, title: "Clear pricing", desc: "Full access from ₹599/month. Single sections from ₹249/month. See every price before you sign up." },
];

const buyerChecklist = [
  { q: "Does the feedback explain your mistakes, or just give a score?", a: "Word-level pronunciation and fluency feedback on Speaking. Inline corrections on Writing." },
  { q: "Is your language supported?", a: "English, Hindi and Punjabi interface, with word meanings in all three." },
  { q: "Does it cover every question type?", a: "20+ types across Speaking, Writing, Reading and Listening." },
  { q: "Are mock tests timed like the real exam?", a: "Full and sectional mocks with a 10-90 estimate per skill." },
  { q: "Are predictions included?", a: "Weekly predictions of high-frequency questions." },
  { q: "Can a coaching centre run batches on it?", a: "Batches, assigned tests, teacher accounts and student analytics. Branding options depend on the plan." },
  { q: "Do you see the price before you commit?", a: "Prices are on this page. Full access from ₹599/month." },
  { q: "Can you try it before paying?", a: "Free plan: 3-day full access, then 3 AI-scored attempts a day." },
];

const steps = [
  { n: "1", title: "Create your free account", desc: "Sign up in under a minute — start your 3-day free trial instantly." },
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
    question: "What does the free plan include?",
    answer: "When you sign up, you get a 3-day free trial with full access to all premium features. After that, you remain on the free tier which gives you 3 AI-scored attempts every single day, with no credit card required."
  },
  {
    question: "How accurate is the AI scoring?",
    answer: "Our AI engines are calibrated specifically to Pearson's official scoring criteria. When you practice, the AI analyzes your fluency, word-level pronunciation, grammar, and content matching to give you a highly accurate 10-90 score that mirrors the real exam."
  },
  {
    question: "Can I get a refund?",
    answer: "Yes. We offer a simple refund policy if you are not satisfied with the platform. You can read the full details and conditions in our Refund & Cancellation policy linked at the bottom of the page."
  },
  {
    question: "Which payment methods do you accept?",
    answer: "We securely accept all major payment methods including UPI (Google Pay, PhonePe, Paytm), Credit/Debit cards, and Net Banking."
  },
  {
    question: "How is PrepFly different from APEUni?",
    answer: "PrepFly is designed with a focus on usability and local support. We offer word meanings and interfaces in Hindi and Punjabi, completely transparent pricing with no hidden VIP tiers, and powerful built-in tools specifically for coaching centres."
  },
  {
    question: "Do I need to install an app?",
    answer: "No app store installation is required. PrepFly is a Progressive Web App (PWA). You can use it instantly in your browser on desktop, or tap 'Add to Home Screen' on your mobile browser to use it just like a native app."
  },
  {
    question: "Can my coaching centre use PrepFly?",
    answer: "Absolutely! We offer dedicated plans for coaching centres starting from just ₹1,199/month. You get your own dashboard to create batches, assign mock tests, track student progress, and add your own branding."
  },
  {
    question: "What is the PTE Academic test?",
    answer: "The Pearson Test of English Academic (PTE Academic) is a computer-based English language test accepted by educational institutions and governments around the world. It assesses Reading, Writing, Listening and Speaking in a single 2-hour session."
  },
  {
    question: "PTE vs IELTS: What is the difference?",
    answer: "Unlike IELTS which has a human examiner for speaking, PTE is entirely computer-scored, making it highly objective and unbiased. PTE also delivers results much faster (typically within 48 hours) and is completed in a single 2-hour sitting."
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
        <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-5xl rounded-full border border-white/10 bg-background/60 px-2 py-2 backdrop-blur-2xl shadow-glass dark:shadow-glass-dark transition-all duration-700 ease-fluid">
          <div className="mx-auto flex h-12 items-center justify-between px-4">
            <Link href="/" className="hover:scale-105 transition-transform duration-500 ease-fluid"><Logo size="sm" /></Link>
            <div className="hidden items-center gap-8 md:flex">
              <a href="#why-prepfly" className="text-sm font-medium tracking-wide text-muted-foreground hover:text-foreground transition-colors duration-500 ease-fluid">Why PrepFly</a>
              <a href="#skills" className="text-sm font-medium tracking-wide text-muted-foreground hover:text-foreground transition-colors duration-500 ease-fluid">Question Types</a>
              <a href="#features" className="text-sm font-medium tracking-wide text-muted-foreground hover:text-foreground transition-colors duration-500 ease-fluid">Features</a>
              <a href="#centres" className="text-sm font-medium tracking-wide text-muted-foreground hover:text-foreground transition-colors duration-500 ease-fluid">For Centres</a>
              <Link href="/download" className="text-sm font-medium tracking-wide text-muted-foreground hover:text-foreground transition-colors duration-500 ease-fluid">Download App</Link>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Button variant="ghost" size="sm" className="rounded-full font-semibold" asChild><Link href="/login">Log in</Link></Button>
              <Button size="sm" className="rounded-full shadow-glass dark:shadow-glass-dark hover:shadow-float font-semibold" asChild><Link href="/register">Start Free</Link></Button>
            </div>
          </div>
        </nav>

        {/* Hero */}
        <section className="relative overflow-hidden bg-background">
          {/* Ethereal Glow */}
          <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[800px] w-[1200px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_top,rgba(20,184,166,0.15),transparent_50%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(20,184,166,0.1),transparent_50%)]"></div>
          
          <div className="mx-auto max-w-7xl px-4 py-40 sm:px-6 sm:py-48 lg:px-8">
            <div className="mx-auto max-w-4xl text-center">
              <div className="mb-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/20 bg-teal-500/10 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-teal-700 dark:text-teal-300 backdrop-blur-md">
                  <Zap className="h-3 w-3" />
                  New AI Engine
                </div>
              </div>
              <h1 className="text-5xl font-extrabold tracking-tighter text-foreground sm:text-7xl lg:text-[5.5rem] leading-[1.1]">
                Practice PTE with <span className="bg-gradient-to-r from-teal-500 to-indigo-500 bg-clip-text text-transparent">AI scoring</span> that shows exactly where you lose marks
              </h1>
              <p className="mt-8 text-xl text-muted-foreground sm:text-2xl font-medium max-w-2xl mx-auto leading-relaxed">
                Scored Speaking and Writing, full mock tests and weekly predictions, in English, Hindi and Punjabi. Start free, no card needed.
              </p>
              <div className="mt-14 flex flex-col items-center gap-6 sm:flex-row sm:justify-center">
                <Button size="xl" className="group rounded-full bg-foreground text-background hover:bg-foreground/90 shadow-float hover:scale-105 transition-all duration-700 ease-fluid" asChild>
                  <Link href="/register">
                    <span className="font-bold tracking-wide">Start Free</span>
                  </Link>
                </Button>
                <Button variant="outline" size="xl" className="rounded-full shadow-glass hover:shadow-float transition-all duration-700 ease-fluid font-bold tracking-wide" asChild>
                  <a href="#skills">
                    See a sample score report
                  </a>
                </Button>
              </div>
              <div className="mt-8 flex flex-col items-center gap-2 text-sm font-medium text-muted-foreground">
                <p>Free plan available · Paid plans from ₹249/month</p>
                <p className="text-xs text-muted-foreground/70">Free: 3-day full access, then 3 AI-scored attempts a day.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="relative z-10 -mt-16 mx-4 sm:mx-6 lg:mx-8">
          <div className="mx-auto max-w-5xl rounded-[2rem] border border-white/5 bg-card/60 p-1 backdrop-blur-2xl shadow-glass dark:shadow-glass-dark">
            <div className="grid grid-cols-2 gap-px rounded-[calc(2rem-0.25rem)] overflow-hidden bg-white/5 md:grid-cols-4">
              {stats.map((stat) => (
                <div key={stat.label} className="bg-card px-4 py-8 text-center transition-all duration-700 ease-fluid hover:bg-card/50">
                  <p className="text-4xl font-extrabold text-foreground">{stat.value}</p>
                  <p className="mt-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why PrepFly? */}
        <section id="why-prepfly" className="py-32 sm:py-40 bg-background border-t border-white/5">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-4xl font-extrabold tracking-tighter text-foreground sm:text-5xl">What to look for in a PTE practice platform</h2>
              <p className="mt-6 text-xl text-muted-foreground font-medium max-w-2xl mx-auto">
                Before you pay for any PTE prep tool, ask these questions. Here's how PrepFly answers each one.
              </p>
            </div>

            {/* Highlights Grid */}
            <div className="mt-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
              {whyPrepflyFeatures.map((f) => (
                <div key={f.title} className="group rounded-[2rem] border border-white/5 bg-card/50 p-1 shadow-glass dark:shadow-glass-dark transition-all duration-700 ease-fluid hover:shadow-float">
                  <div className="h-full rounded-[calc(2rem-0.25rem)] bg-card p-6 text-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] transition-colors duration-500 hover:bg-white/5 flex flex-col items-center sm:flex-row sm:text-left sm:gap-6 sm:p-8">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 group-hover:scale-110 transition-transform duration-300 mb-4 sm:mb-0">
                      <f.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-foreground">{f.title}</h3>
                      <p className="mt-2 text-sm text-muted-foreground font-medium leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Checklist Table (Mobile: Cards, Desktop: Table) */}
            <div className="mt-24 mx-auto max-w-4xl">
              {/* Mobile View */}
              <div className="md:hidden space-y-4">
                {buyerChecklist.map((item, idx) => (
                  <div key={idx} className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm">
                    <p className="font-semibold text-foreground">{item.q}</p>
                    <div className="mt-4 flex items-start gap-3 rounded-xl bg-teal-500/5 p-4 ring-1 ring-teal-500/20">
                      <Check className="h-5 w-5 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" aria-label="Yes" />
                      <p className="text-sm font-medium text-teal-900 dark:text-teal-100">{item.a}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop View */}
              <div className="hidden md:block rounded-[2rem] border border-white/5 bg-card/60 p-1 backdrop-blur-2xl shadow-glass dark:shadow-glass-dark">
                <div className="rounded-[calc(2rem-0.25rem)] bg-card overflow-hidden">
                  <table className="w-full text-left border-collapse table-fixed">
                    <thead>
                      <tr>
                        <th className="w-1/2 p-6 text-sm font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50 bg-background/50">Ask this</th>
                        <th className="w-1/2 p-6 text-sm font-bold uppercase tracking-wider text-teal-700 dark:text-teal-300 border-b border-border/50 bg-teal-500/10">PrepFly</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50 text-sm font-medium">
                      {buyerChecklist.map((item, idx) => (
                        <tr key={idx} className="transition-colors hover:bg-white/5">
                          <td className="p-6 text-foreground font-semibold leading-relaxed align-top">{item.q}</td>
                          <td className="p-6 bg-teal-500/5 align-top">
                            <div className="flex items-start gap-3">
                              <Check className="h-5 w-5 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" aria-label="Yes" />
                              <span className="text-teal-950 dark:text-teal-50 leading-relaxed">{item.a}</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-12 flex flex-col items-center gap-6 sm:flex-row sm:justify-center">
                <Button size="xl" className="rounded-full bg-foreground text-background shadow-glass hover:shadow-float font-bold tracking-wide transition-all duration-300 hover:-translate-y-1 hover:bg-foreground/90" asChild>
                  <Link href="/register">
                    Start Free
                  </Link>
                </Button>
                <Button variant="outline" size="xl" className="rounded-full shadow-sm hover:shadow-md transition-all duration-300 font-bold tracking-wide hover:-translate-y-1" asChild>
                  <Link href="/pricing">
                    See Pricing
                  </Link>
                </Button>
              </div>
              <p className="mt-6 text-center text-xs font-medium text-muted-foreground">
                Features and prices as of {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}.
              </p>
            </div>
          </div>
        </section>

        {/* Why Choose PTE? */}
        <section className="py-32 sm:py-40 bg-background border-t border-white/5">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mx-auto mb-6 inline-flex rounded-full bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ring-1 ring-white/10">The Standard</div>
              <h2 className="text-4xl font-extrabold tracking-tighter text-foreground sm:text-5xl">Why choose PTE Academic?</h2>
              <p className="mt-6 text-xl text-muted-foreground font-medium">Accepted by governments and universities around the world.</p>
            </div>
            <div className="mt-20 grid gap-6 sm:grid-cols-3">
              <div className="group rounded-[2rem] border border-white/5 bg-card/50 p-1 shadow-glass dark:shadow-glass-dark transition-all duration-700 ease-fluid hover:shadow-float">
                <div className="h-full rounded-[calc(2rem-0.25rem)] bg-card p-10 text-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] transition-colors duration-500 hover:bg-white/5">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 group-hover:scale-110 transition-transform duration-700 ease-fluid">
                    <Clock className="h-8 w-8" />
                  </div>
                  <h3 className="mt-8 text-2xl font-bold tracking-tight text-foreground">2-Hour Single Test</h3>
                  <p className="mt-4 text-base text-muted-foreground font-medium leading-relaxed">Go worry-free. Assess all 4 skills in a single, short session.</p>
                </div>
              </div>
              <div className="group rounded-[2rem] border border-white/5 bg-card/50 p-1 shadow-glass dark:shadow-glass-dark transition-all duration-700 ease-fluid hover:shadow-float">
                <div className="h-full rounded-[calc(2rem-0.25rem)] bg-card p-10 text-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] transition-colors duration-500 hover:bg-white/5">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform duration-700 ease-fluid">
                    <Zap className="h-8 w-8" />
                  </div>
                  <h3 className="mt-8 text-2xl font-bold tracking-tight text-foreground">Fast Results</h3>
                  <p className="mt-4 text-base text-muted-foreground font-medium leading-relaxed">Celebrate your results typically within just 48 hours.</p>
                </div>
              </div>
              <div className="group rounded-[2rem] border border-white/5 bg-card/50 p-1 shadow-glass dark:shadow-glass-dark transition-all duration-700 ease-fluid hover:shadow-float">
                <div className="h-full rounded-[calc(2rem-0.25rem)] bg-card p-10 text-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] transition-colors duration-500 hover:bg-white/5">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform duration-700 ease-fluid">
                    <Globe2 className="h-8 w-8" />
                  </div>
                  <h3 className="mt-8 text-2xl font-bold tracking-tight text-foreground">Globally Accepted</h3>
                  <p className="mt-4 text-base text-muted-foreground font-medium leading-relaxed">Approved for all UK, Australian & New Zealand visa applications.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Skills / question types */}
        <section id="skills" className="py-32 sm:py-40">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <div className="mx-auto mb-6 inline-flex rounded-full bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ring-1 ring-white/10">The Curriculum</div>
              <h2 className="text-4xl font-extrabold tracking-tighter text-foreground sm:text-5xl">Every PTE question type, covered</h2>
              <p className="mt-6 text-xl text-muted-foreground font-medium">All four skills, all 20+ task types — with the right scoring for each.</p>
            </div>
            <div className="mt-24 grid gap-6 md:grid-cols-2">
              {skills.map((s) => (
                <div key={s.title} className="group rounded-[2rem] border border-white/5 bg-card/50 p-1 shadow-glass dark:shadow-glass-dark transition-all duration-700 ease-fluid hover:shadow-float">
                  <div className="h-full rounded-[calc(2rem-0.25rem)] bg-card p-8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] transition-colors duration-500 hover:bg-white/5">
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-foreground text-background group-hover:scale-110 transition-transform duration-700 ease-fluid shadow-float">
                        <s.icon className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold tracking-tight text-foreground">{s.title}</h3>
                        <p className="text-sm font-medium text-muted-foreground mt-1">{s.note}</p>
                      </div>
                    </div>
                    <div className="mt-8 flex flex-wrap gap-2">
                      {s.types.map((t) => (
                        <span key={t} className="inline-flex items-center rounded-full bg-white/5 ring-1 ring-white/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-foreground shadow-glass">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Core features */}
        <section id="features" className="bg-card/30 py-32 sm:py-40">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <div className="mx-auto mb-6 inline-flex rounded-full bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ring-1 ring-white/10">The Ecosystem</div>
              <h2 className="text-4xl font-extrabold tracking-tighter text-foreground sm:text-5xl">Everything you need to crack PTE</h2>
              <p className="mt-6 text-xl text-muted-foreground font-medium">Powerful tools that turn practice into a higher score.</p>
            </div>
            <div className="mt-24 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {features.map((feature) => (
                <div key={feature.title} className="group flex flex-col rounded-[2rem] bg-card p-6 ring-1 ring-white/10 shadow-glass dark:shadow-glass-dark transition-all duration-700 ease-fluid hover:bg-white/5 hover:-translate-y-1">
                  <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500/10 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 group-hover:scale-110 transition-transform duration-700 ease-fluid shadow-inner">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-xl font-bold tracking-tight text-foreground">{feature.title}</h3>
                  <p className="mt-3 text-sm font-medium leading-relaxed text-muted-foreground">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Featured Study Tools */}
        <section className="py-32 sm:py-40 bg-background border-t border-white/5">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <div className="mx-auto mb-6 inline-flex rounded-full bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ring-1 ring-white/10">Study Assets</div>
              <h2 className="text-4xl font-extrabold tracking-tighter text-foreground sm:text-5xl">PTE Study Tools</h2>
              <p className="mt-6 text-xl text-muted-foreground font-medium">Tools designed to accelerate your score improvement.</p>
            </div>
            <div className="mt-24 grid gap-6 lg:grid-cols-3">
              <div className="group relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-indigo-500 to-purple-600 p-12 shadow-[0_20px_40px_-15px_rgba(79,70,229,0.3)] transition-all duration-700 ease-fluid hover:-translate-y-2">
                <div className="relative z-10">
                  <BookMarked className="h-12 w-12 text-white/90 group-hover:scale-110 transition-transform duration-700 ease-fluid drop-shadow-md" />
                  <h3 className="mt-8 text-3xl font-extrabold tracking-tight text-white">Vocab Book</h3>
                  <p className="mt-4 text-lg font-medium leading-relaxed text-indigo-100">Contains 90% of exam vocabs. Build your foundation with spaced repetition in English, Hindi, and Punjabi.</p>
                </div>
                <div className="absolute -bottom-10 -right-10 h-64 w-64 rounded-full bg-white/20 blur-3xl transition-transform duration-700 ease-fluid group-hover:scale-150"></div>
              </div>
              <div className="group relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-teal-400 to-emerald-600 p-12 shadow-[0_20px_40px_-15px_rgba(20,184,166,0.3)] transition-all duration-700 ease-fluid hover:-translate-y-2">
                <div className="relative z-10">
                  <Mic className="h-12 w-12 text-white/90 group-hover:scale-110 transition-transform duration-700 ease-fluid drop-shadow-md" />
                  <h3 className="mt-8 text-3xl font-extrabold tracking-tight text-white">Shadowing</h3>
                  <p className="mt-4 text-lg font-medium leading-relaxed text-teal-100">Improve Read Aloud fluency in 14 days by repeating after native speakers word-by-word.</p>
                </div>
                <div className="absolute -bottom-10 -right-10 h-64 w-64 rounded-full bg-white/20 blur-3xl transition-transform duration-700 ease-fluid group-hover:scale-150"></div>
              </div>
              <div className="group relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-amber-400 to-orange-500 p-12 shadow-[0_20px_40px_-15px_rgba(245,158,11,0.3)] transition-all duration-700 ease-fluid hover:-translate-y-2">
                <div className="relative z-10">
                  <Award className="h-12 w-12 text-white/90 group-hover:scale-110 transition-transform duration-700 ease-fluid drop-shadow-md" />
                  <h3 className="mt-8 text-3xl font-extrabold tracking-tight text-white">AI Analysis</h3>
                  <p className="mt-4 text-lg font-medium leading-relaxed text-amber-100">Accurate score report analysis. Find exactly where you are losing points and how to fix it.</p>
                </div>
                <div className="absolute -bottom-10 -right-10 h-64 w-64 rounded-full bg-white/20 blur-3xl transition-transform duration-700 ease-fluid group-hover:scale-150"></div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-32 sm:py-40 bg-background">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <div className="mx-auto mb-6 inline-flex rounded-full bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ring-1 ring-white/10">The Process</div>
              <h2 className="text-4xl font-extrabold tracking-tighter text-foreground sm:text-5xl">Get started in three steps</h2>
            </div>
            <div className="mt-24 grid gap-12 md:grid-cols-3">
              {steps.map((step) => (
                <div key={step.n} className="group relative text-center">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-card ring-1 ring-white/10 shadow-glass dark:shadow-glass-dark text-2xl font-bold text-foreground group-hover:-translate-y-2 transition-all duration-700 ease-fluid hover:shadow-float">
                    <span className="bg-gradient-to-br from-teal-500 to-indigo-500 bg-clip-text text-transparent">{step.n}</span>
                  </div>
                  <h3 className="mt-8 text-xl font-bold tracking-tight text-foreground">{step.title}</h3>
                  <p className="mt-3 text-base font-medium leading-relaxed text-muted-foreground">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="py-32 sm:py-40 bg-background">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <div className="mx-auto mb-6 inline-flex rounded-full bg-teal-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400 ring-1 ring-teal-500/20">Plans</div>
              <h2 className="text-4xl font-extrabold tracking-tighter text-foreground sm:text-5xl">Simple, transparent pricing</h2>
              <p className="mt-6 text-xl text-muted-foreground font-medium max-w-2xl mx-auto">
                Start for free, upgrade when you need unlimited access.
              </p>
            </div>

            <div className="mt-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {/* Free */}
              <div className="flex flex-col rounded-[2rem] border border-border/50 bg-card p-8 shadow-sm transition-all duration-300 hover:shadow-md">
                <h3 className="text-2xl font-bold text-foreground">Free</h3>
                <div className="mt-4 flex items-baseline text-5xl font-extrabold text-foreground">
                  ₹0
                </div>
                <p className="mt-6 text-sm font-medium text-muted-foreground">Limited AI-scored attempts</p>
                <div className="mt-auto pt-8">
                  <Button variant="outline" size="lg" className="w-full rounded-full font-bold" asChild>
                    <Link href="/register">Get Started</Link>
                  </Button>
                </div>
              </div>

              {/* 1 Month */}
              <div className="flex flex-col rounded-[2rem] border border-border/50 bg-card p-8 shadow-sm transition-all duration-300 hover:shadow-md">
                <h3 className="text-2xl font-bold text-foreground">1 month</h3>
                <div className="mt-4 flex items-baseline text-5xl font-extrabold text-foreground">
                  ₹599
                </div>
                <p className="mt-6 text-sm font-medium text-muted-foreground">Full access to all features</p>
                <div className="mt-auto pt-8">
                  <Button variant="outline" size="lg" className="w-full rounded-full font-bold" asChild>
                    <Link href="/register">Start 1 Month</Link>
                  </Button>
                </div>
              </div>

              {/* 3 Months */}
              <div className="relative flex flex-col rounded-[2rem] border-2 border-teal-500 bg-teal-500/5 p-8 shadow-md transform md:-translate-y-4">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-teal-500 px-4 py-1 text-xs font-bold text-white uppercase tracking-wider shadow-sm">
                  Most popular
                </div>
                <h3 className="text-2xl font-bold text-teal-900 dark:text-teal-50">3 months</h3>
                <div className="mt-4 flex items-baseline text-5xl font-extrabold text-teal-950 dark:text-teal-100">
                  ₹1,499
                </div>
                <p className="mt-6 text-sm font-medium text-teal-800/80 dark:text-teal-200/80">Full access to all features</p>
                <div className="mt-auto pt-8">
                  <Button size="lg" className="w-full rounded-full font-bold bg-teal-600 text-white hover:bg-teal-700 shadow-sm" asChild>
                    <Link href="/register">Start 3 Months</Link>
                  </Button>
                </div>
              </div>

              {/* 1 Year */}
              <div className="flex flex-col rounded-[2rem] border border-border/50 bg-card p-8 shadow-sm transition-all duration-300 hover:shadow-md">
                <h3 className="text-2xl font-bold text-foreground">1 year</h3>
                <div className="mt-4 flex items-baseline text-5xl font-extrabold text-foreground">
                  ₹4,499
                </div>
                <p className="mt-6 text-sm font-medium text-muted-foreground">Full access to all features</p>
                <div className="mt-auto pt-8">
                  <Button variant="outline" size="lg" className="w-full rounded-full font-bold" asChild>
                    <Link href="/register">Start 1 Year</Link>
                  </Button>
                </div>
              </div>
            </div>

            <div className="mt-16 text-center flex flex-col items-center gap-6">
              <Link href="/pricing" className="text-sm font-bold text-teal-600 dark:text-teal-400 hover:underline">
                Single-module pricing from ₹249 &rarr;
              </Link>
              
              <div className="flex flex-col gap-2 items-center text-xs font-medium text-muted-foreground">
                <p>Prices include GST. Accepted payment methods: UPI, Credit/Debit cards, Net Banking.</p>
                <Link href="/refunds" className="underline hover:text-foreground transition-colors">Read our refund policy</Link>
              </div>

              <Link href="#centres" className="mt-4 text-sm font-semibold text-muted-foreground hover:text-foreground transition-all duration-300 border border-border/50 rounded-full px-6 py-2.5 hover:bg-white/5 hover:border-white/20">
                For coaching centres, from ₹1,199/month
              </Link>
            </div>
          </div>
        </section>

        {/* For Centres */}
        <section id="centres" className="relative overflow-hidden py-32 sm:py-40 bg-slate-50 dark:bg-slate-900/20 border-y border-border/50">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(20,184,166,0.1),transparent_70%)]"></div>
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 z-10">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-100 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400 shadow-sm ring-1 ring-teal-500/20">
                <Building2 className="h-8 w-8" />
              </div>
              <h2 className="text-4xl font-extrabold tracking-tighter text-foreground sm:text-5xl">Built for coaching centres too</h2>
              <p className="mt-6 text-xl font-medium text-muted-foreground">
                Run your PTE coaching on Prepfly — your brand, your students, your batches. Try it free with one batch for 2 weeks.
              </p>
            </div>

            <div className="mx-auto mt-16 mb-20 max-w-5xl rounded-[2rem] border border-white/5 bg-card/60 p-2 shadow-2xl dark:shadow-glass-dark backdrop-blur-md">
              <div className="relative overflow-hidden rounded-[calc(2rem-0.5rem)] bg-card aspect-[16/9] ring-1 ring-white/10 flex items-center justify-center shadow-inner">
                <img src="/images/centre-dashboard.png" alt="PrepFly Coaching Centre Dashboard showing batches, student progress and branding" className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity duration-500 bg-muted" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none mix-blend-overlay opacity-30">
                  <BarChart3 className="h-32 w-32" />
                </div>
              </div>
            </div>

            <div className="mx-auto grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {centreFeatures.map((f) => (
                <div key={f.title} className="group rounded-[1.5rem] bg-background p-6 ring-1 ring-border shadow-sm hover:shadow-md hover:ring-teal-500/30 transition-all duration-300">
                  <f.icon className="h-6 w-6 text-teal-600 dark:text-teal-400 mb-4 group-hover:scale-110 transition-transform duration-300" />
                  <h3 className="text-base font-bold tracking-tight text-foreground">{f.title}</h3>
                  <p className="mt-2 text-sm font-medium text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>

            <div className="mt-16 text-center">
              <Link href="https://wa.me/919466460761?text=I%27m%20interested%20in%20PrepFly%20for%20Coaching%20Centres" target="_blank" rel="noopener noreferrer">
                <Button size="xl" className="rounded-full bg-[#25D366] text-white shadow-md hover:shadow-lg font-bold tracking-wide transition-all duration-300 hover:-translate-y-1 hover:bg-[#20bd5a]">
                  <svg className="mr-2 h-5 w-5 fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                  Book a free demo
                </Button>
              </Link>
              <p className="mt-4 text-sm font-semibold text-teal-800 dark:text-teal-400">
                From ₹1,199/month for 5 students
              </p>
              <Link href="/register?role=centre" className="mt-6 inline-flex items-center text-sm font-bold text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4">
                or register your centre yourself
              </Link>
            </div>
          </div>
        </section>

        {/* Download App Banner */}
        <section className="bg-background py-24 sm:py-32 border-t border-white/5">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center justify-between gap-12 rounded-[3rem] bg-card p-10 ring-1 ring-white/10 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] sm:flex-row sm:p-16">
              <div className="max-w-2xl text-center sm:text-left">
                <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">Practice anywhere, anytime.</h2>
                <p className="mt-4 text-lg font-medium text-muted-foreground">Install PrepFly in 10 seconds. Just tap 'Share' then 'Add to Home Screen' on iOS, or 'Install App' from your browser menu on Android.</p>
              </div>
              <div className="flex flex-shrink-0 flex-col items-center gap-4">
                <div className="relative overflow-hidden rounded-2xl w-48 h-auto border border-border shadow-sm">
                  <img src="/images/install-pwa.gif" alt="How to install Prepfly PWA" className="w-full h-auto" />
                </div>
                <Button variant="outline" className="rounded-full font-bold tracking-wide transition-all duration-300" asChild>
                  <Link href="/download">
                    See full instructions
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="bg-background py-32 sm:py-40">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="mb-16 text-center">
              <div className="mx-auto mb-6 inline-flex rounded-full bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ring-1 ring-white/10">Knowledge</div>
              <h2 className="text-4xl font-extrabold tracking-tighter text-foreground sm:text-5xl">PTE Knowledge & FAQs</h2>
              <p className="mt-6 text-xl font-medium text-muted-foreground">Everything you need to know about the PTE Academic exam.</p>
            </div>
            <FaqAccordion items={faqItems} />
          </div>
        </section>

        {/* Final CTA */}
        <section className="relative overflow-hidden py-40 border-t border-white/5">
          <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[600px] w-[1000px] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.15),transparent_60%)] dark:bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.1),transparent_60%)]"></div>
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="text-5xl font-extrabold tracking-tighter text-foreground sm:text-6xl">Ready to score 79+?</h2>
            <p className="mt-6 text-xl font-medium text-muted-foreground">Join PrepFly with a free plan and start improving today.</p>
            <div className="mt-12">
              <Button size="xl" className="group rounded-full bg-foreground text-background shadow-float hover:scale-105 transition-all duration-700 ease-fluid font-bold tracking-wide" asChild>
                <Link href="/register">Create Free Account</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/5 bg-background py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-5">
              <div className="lg:col-span-2">
                <Logo size="sm" />
                <p className="mt-4 text-sm font-medium leading-relaxed text-muted-foreground">
                  AI-powered PTE practice platform. Made in India for students who dream of going abroad.
                </p>
                <div className="mt-6 flex items-center gap-4 p-4 rounded-2xl bg-card border border-border shadow-sm max-w-sm">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                    <img src="/images/aman.jpg" alt="Aman, Founder of PrepFly" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Aman</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Founder, PrepFly. Built to help you ace your PTE with honest, accurate AI scoring.</p>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-bold tracking-wide text-foreground">Platform</h4>
                <ul className="mt-6 space-y-4">
                  <li><Link href="/register" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Sign Up Free</Link></li>
                  <li><Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Log In</Link></li>
                  <li><Link href="/register?role=centre" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Register Centre</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-bold tracking-wide text-foreground">Support</h4>
                <ul className="mt-6 space-y-4">
                  <li><a href="https://wa.me/919466460761" target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">WhatsApp us</a></li>
                  <li><a href="mailto:prepfly.app@gmail.com" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">prepfly.app@gmail.com</a></li>
                  <li><Link href="/contact" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Contact Us</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-bold tracking-wide text-foreground">Legal</h4>
                <ul className="mt-6 space-y-4">
                  <li><Link href="/privacy" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</Link></li>
                  <li><Link href="/terms" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Terms of Service</Link></li>
                  <li><Link href="/refund-policy" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Refund & Cancellation</Link></li>
                </ul>
              </div>
            </div>
            <div className="mt-16 border-t border-white/5 pt-8 text-center text-sm font-medium text-muted-foreground">
              &copy; {new Date().getFullYear()} PrepFly. All rights reserved. PrepFly is an independent practice platform and is not affiliated with Pearson PTE.
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
