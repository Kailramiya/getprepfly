import type { Metadata } from "next";
import { APP_NAME, SUPPORT_EMAIL, SUPPORT_PHONE } from "@/lib/constants";
import { Mail, Phone, MapPin, MessageSquare, Send } from "lucide-react";

export const metadata: Metadata = { title: `Contact Us — ${APP_NAME}` };

// NOTE FOR OWNER: Razorpay requires a reachable contact with a real address.
// Set NEXT_PUBLIC_SUPPORT_EMAIL / NEXT_PUBLIC_SUPPORT_PHONE in env, and fill the
// registered address placeholder below.
export default function ContactPage() {
  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground">Get in touch</h1>
        <p className="mt-4 text-lg font-medium text-muted-foreground leading-relaxed">
          We&apos;d love to hear from you. For support, billing, privacy, or any other
          question about {APP_NAME}, reach out using the details below.
        </p>
      </div>

      <div className="grid gap-8 sm:grid-cols-2">
        {/* Contact Cards */}
        <div className="space-y-6">
          <div className="flex items-start gap-4 rounded-[1.5rem] border border-white/5 bg-background/50 p-6 shadow-glass backdrop-blur-xl ring-1 ring-white/10 group hover:shadow-float hover:-translate-y-1 transition-all duration-700 ease-fluid">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-inner group-hover:scale-110 transition-transform duration-700 ease-fluid">
              <Mail className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">Email us</h3>
              <p className="mt-1 text-sm font-medium text-muted-foreground">Our friendly team is here to help.</p>
              <div className="mt-3">
                {SUPPORT_EMAIL ? (
                  <a href={`mailto:${SUPPORT_EMAIL}`} className="text-sm font-bold text-primary hover:text-primary/80 transition-colors duration-500 ease-fluid">
                    {SUPPORT_EMAIL}
                  </a>
                ) : (
                  <span className="text-sm font-medium text-red-500">[SET NEXT_PUBLIC_SUPPORT_EMAIL]</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-4 rounded-[1.5rem] border border-white/5 bg-background/50 p-6 shadow-glass backdrop-blur-xl ring-1 ring-white/10 group hover:shadow-float hover:-translate-y-1 transition-all duration-700 ease-fluid">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-500/10 text-teal-500 shadow-inner group-hover:scale-110 transition-transform duration-700 ease-fluid">
              <Phone className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">Call us</h3>
              <p className="mt-1 text-sm font-medium text-muted-foreground">Mon-Fri from 9am to 6pm.</p>
              <div className="mt-3">
                {SUPPORT_PHONE ? (
                  <a href={`tel:${SUPPORT_PHONE}`} className="text-sm font-bold text-teal-500 hover:text-teal-400 transition-colors duration-500 ease-fluid">
                    {SUPPORT_PHONE}
                  </a>
                ) : (
                  <span className="text-sm font-medium text-red-500">[SET NEXT_PUBLIC_SUPPORT_PHONE]</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Registered Office */}
        <div className="rounded-[1.5rem] border border-white/5 bg-card/50 p-8 shadow-glass backdrop-blur-xl ring-1 ring-white/10 group">
          <div className="flex items-center gap-3">
            <MapPin className="h-6 w-6 text-muted-foreground/50 group-hover:text-primary transition-colors duration-700 ease-fluid" />
            <h3 className="text-xl font-bold text-foreground">Registered Office</h3>
          </div>
          <div className="mt-6 space-y-2 text-sm font-medium text-muted-foreground leading-relaxed">
            <p className="font-bold text-foreground">[LEGAL ENTITY NAME]</p>
            <p>[REGISTERED ADDRESS]</p>
            <p>[CITY], [STATE], India [PIN]</p>
          </div>
        </div>
      </div>

      <div className="rounded-[2rem] bg-gradient-to-br from-indigo-500 to-purple-600 p-8 text-white shadow-glass sm:p-10 relative overflow-hidden group">
        <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-full w-full -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.1),transparent_60%)]" />
        <div className="flex flex-col items-center text-center sm:flex-row sm:text-left sm:justify-between relative z-10">
          <div>
            <h3 className="text-2xl font-extrabold flex items-center gap-3 justify-center sm:justify-start">
              <MessageSquare className="h-5 w-5" />
              In-app Feedback
            </h3>
            <p className="mt-2 max-w-md text-indigo-100 font-medium">
              Logged-in users can submit feedback, bug reports, or feature requests directly from the dashboard.
            </p>
          </div>
          <a
            href="/feedback"
            className="mt-6 sm:mt-0 inline-flex items-center justify-center gap-2 rounded-full bg-white/10 px-8 py-4 text-sm font-bold tracking-wide text-white border border-white/20 transition-all duration-700 ease-fluid hover:bg-white/20 hover:shadow-float active:scale-[0.98] shadow-inner backdrop-blur-md"
          >
            <Send className="h-4 w-4" />
            Send Feedback
          </a>
        </div>
      </div>
    </div>
  );
}
