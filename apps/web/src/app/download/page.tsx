import Link from "next/link";
import { Smartphone, Monitor, Download, CheckCircle2, ArrowRight } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = {
  title: "Download Prepfly App",
  description: "Get Prepfly on Android, iOS, or install the web app. Practice PTE anywhere.",
};

const platforms = [
  {
    name: "Web App (PWA)",
    icon: Monitor,
    description: "Works on any device with a browser. Install it like a native app — no store needed.",
    action: "Open Web App",
    href: "/dashboard",
    available: true,
    badge: "Recommended",
    color: "from-indigo-500 to-indigo-600",
    steps: [
      "Open the website in Chrome or Edge",
      "Click the install icon in the address bar (or menu > Install App)",
      "The app icon will appear on your home screen",
    ],
  },
  {
    name: "Android App",
    icon: Smartphone,
    description: "Native Android app on Google Play Store. Best for speaking practice with microphone.",
    action: "Get on Google Play",
    // href: PLAY_STORE_URL, // Uncomment when live
    href: "#",
    available: false, // Set to true when published
    badge: "Coming Soon",
    color: "from-green-500 to-green-600",
    steps: [
      "Search 'Prepfly' on Google Play Store",
      "Tap Install",
      "Open and sign in with your account",
    ],
  },
  {
    name: "iOS App",
    icon: Smartphone,
    description: "iPhone and iPad app on Apple App Store. Optimized for iOS with native performance.",
    action: "Get on App Store",
    // href: APP_STORE_URL, // Uncomment when live
    href: "#",
    available: false, // Set to true when published
    badge: "Coming Soon",
    color: "from-gray-700 to-gray-900",
    steps: [
      "Search 'Prepfly' on App Store",
      "Tap Get / Install",
      "Open and sign in with your account",
    ],
  },
];

export default function DownloadPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Navbar */}
      <nav className="border-b border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/">
            <Logo size="sm" />
          </Link>
          <Link href="/login">
            <Button variant="outline" size="sm">Log in</Button>
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-indigo-600">
            <Download className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl dark:text-slate-100">Get Prepfly</h1>
          <p className="mt-3 text-lg text-gray-600 dark:text-slate-400">
            Available on Web, Android, and iOS. One account works everywhere.
          </p>
        </div>

        {/* Platform Cards */}
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {platforms.map((platform) => (
            <Card
              key={platform.name}
              className={`overflow-hidden transition hover:shadow-lg ${!platform.available ? "opacity-75" : ""}`}
            >
              <div className={`bg-gradient-to-r ${platform.color} p-6 text-center`}>
                <platform.icon className="mx-auto h-12 w-12 text-white" />
                <h2 className="mt-3 text-xl font-bold text-white">{platform.name}</h2>
                <span className="mt-2 inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white">
                  {platform.badge}
                </span>
              </div>
              <CardContent className="p-5">
                <p className="text-sm text-gray-600 dark:text-slate-400">{platform.description}</p>

                {/* Steps */}
                <div className="mt-4 space-y-2">
                  {platform.steps.map((step, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-500 dark:bg-slate-700 dark:text-slate-400">
                        {i + 1}
                      </span>
                      <p className="text-xs text-gray-500 dark:text-slate-400">{step}</p>
                    </div>
                  ))}
                </div>

                {/* Action */}
                <div className="mt-5">
                  {platform.available ? (
                    <Link href={platform.href}>
                      <Button className="w-full gap-2">
                        {platform.action}
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  ) : (
                    <Button disabled className="w-full gap-2" variant="outline">
                      Coming Soon
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* One Account Everywhere */}
        <Card className="mt-12 border-teal-200 bg-teal-50 dark:border-teal-900 dark:bg-teal-950/30">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center sm:flex-row sm:text-left">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-teal-100 dark:bg-teal-950/50">
              <CheckCircle2 className="h-7 w-7 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-teal-900 dark:text-teal-200">One Account, All Platforms</h3>
              <p className="mt-1 text-sm text-teal-700 dark:text-teal-300">
                Your progress, scores, and mock test history sync across web, Android, and iOS.
                Sign up once and practice anywhere.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
