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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-50">Get in touch</h1>
        <p className="mt-4 text-lg text-gray-600 dark:text-slate-400">
          We&apos;d love to hear from you. For support, billing, privacy, or any other
          question about {APP_NAME}, reach out using the details below.
        </p>
      </div>

      <div className="grid gap-8 sm:grid-cols-2">
        {/* Contact Cards */}
        <div className="space-y-6">
          <div className="flex items-start gap-4 rounded-xl border border-gray-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400">
              <Mail className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Email us</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Our friendly team is here to help.</p>
              <div className="mt-3">
                {SUPPORT_EMAIL ? (
                  <a href={`mailto:${SUPPORT_EMAIL}`} className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
                    {SUPPORT_EMAIL}
                  </a>
                ) : (
                  <span className="text-sm font-medium text-red-500">[SET NEXT_PUBLIC_SUPPORT_EMAIL]</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-4 rounded-xl border border-gray-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-600 dark:bg-teal-900/40 dark:text-teal-400">
              <Phone className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Call us</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Mon-Fri from 9am to 6pm.</p>
              <div className="mt-3">
                {SUPPORT_PHONE ? (
                  <a href={`tel:${SUPPORT_PHONE}`} className="text-sm font-medium text-teal-600 hover:text-teal-500 dark:text-teal-400">
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
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-8 dark:border-slate-800 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <MapPin className="h-6 w-6 text-gray-400 dark:text-slate-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Registered Office</h3>
          </div>
          <div className="mt-6 space-y-2 text-sm text-gray-600 dark:text-slate-400">
            <p className="font-medium text-gray-900 dark:text-slate-200">[LEGAL ENTITY NAME]</p>
            <p>[REGISTERED ADDRESS]</p>
            <p>[CITY], [STATE], India [PIN]</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 p-8 text-white shadow-lg sm:p-10">
        <div className="flex flex-col items-center text-center sm:flex-row sm:text-left sm:justify-between">
          <div>
            <h3 className="text-xl font-bold flex items-center gap-2 justify-center sm:justify-start">
              <MessageSquare className="h-5 w-5" />
              In-app Feedback
            </h3>
            <p className="mt-2 max-w-md text-indigo-100">
              Logged-in users can submit feedback, bug reports, or feature requests directly from the dashboard.
            </p>
          </div>
          <a
            href="/feedback"
            className="mt-6 sm:mt-0 inline-flex items-center justify-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-indigo-600 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-indigo-600"
          >
            <Send className="h-4 w-4" />
            Send Feedback
          </a>
        </div>
      </div>
    </div>
  );
}
