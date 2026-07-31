import Link from "next/link";
import { Mail, Phone, Instagram, Youtube, MessageCircle } from "lucide-react";
import { Logo } from "@/components/logo";
import {
  APP_NAME,
  APP_TAGLINE,
  SUPPORT_EMAIL,
  SUPPORT_PHONE,
  INSTAGRAM_URL,
  YOUTUBE_URL,
  WHATSAPP_URL,
} from "@/lib/constants";

const practiceLinks = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Mock Tests", href: "/mock-test" },
  { label: "Study Guides", href: "/study-guides" },
  { label: "Vocabulary", href: "/vocabulary" },
  { label: "Pricing", href: "/pricing" },
];

const supportLinks = [
  { label: "Contact Us", href: "/contact" },
  { label: "Send Feedback", href: "/feedback" },
  { label: "Download App", href: "/download" },
];

const legalLinks = [
  { label: "Terms of Service", href: "/terms" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Refund & Cancellation", href: "/refund-policy" },
];

export function Footer() {
  const social = [
    SUPPORT_EMAIL && { icon: Mail, href: `mailto:${SUPPORT_EMAIL}`, label: SUPPORT_EMAIL },
    SUPPORT_PHONE && { icon: Phone, href: `tel:${SUPPORT_PHONE}`, label: SUPPORT_PHONE },
    WHATSAPP_URL && { icon: MessageCircle, href: WHATSAPP_URL, label: "WhatsApp" },
    INSTAGRAM_URL && { icon: Instagram, href: INSTAGRAM_URL, label: "Instagram" },
    YOUTUBE_URL && { icon: Youtube, href: YOUTUBE_URL, label: "YouTube" },
  ].filter(Boolean) as { icon: any; href: string; label: string }[];

  return (
    <footer className="mt-12 border-t border-border bg-background/50 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Logo size="sm" />
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              {APP_TAGLINE}. Made in India for students aiming to study and work abroad.
            </p>
            {social.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-3">
                {social.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target={s.href.startsWith("http") ? "_blank" : undefined}
                    rel="noopener noreferrer"
                    title={s.label}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:border-primary/50 hover:text-primary"
                  >
                    <s.icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Practice */}
          <div>
            <h4 className="text-sm font-semibold text-foreground">Practice</h4>
            <ul className="mt-3 space-y-2">
              {practiceLinks.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-sm font-semibold text-foreground">Support</h4>
            <ul className="mt-3 space-y-2">
              {supportLinks.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-sm font-semibold text-foreground">Legal</h4>
            <ul className="mt-3 space-y-2">
              {legalLinks.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border/50 pt-6 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} {APP_NAME}. All rights reserved.</p>
          <p>{APP_NAME} is an independent practice platform and is not affiliated with Pearson PTE.</p>
        </div>
      </div>
    </footer>
  );
}
