import type { Metadata } from "next";
import { APP_NAME, SUPPORT_EMAIL, SUPPORT_PHONE } from "@/lib/constants";

export const metadata: Metadata = { title: `Contact Us — ${APP_NAME}` };

// NOTE FOR OWNER: Razorpay requires a reachable contact with a real address.
// Set NEXT_PUBLIC_SUPPORT_EMAIL / NEXT_PUBLIC_SUPPORT_PHONE in env, and fill the
// registered address placeholder below.
export default function ContactPage() {
  return (
    <>
      <h1>Contact Us</h1>
      <p><em>Last updated: 18 June 2026</em></p>

      <p>
        We&apos;d love to hear from you. For support, billing, privacy, or any other
        question about {APP_NAME}, reach us using the details below.
      </p>

      <h2>Support</h2>
      <ul>
        <li>
          <strong>Email:</strong>{" "}
          {SUPPORT_EMAIL ? (
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
          ) : (
            "[SET NEXT_PUBLIC_SUPPORT_EMAIL]"
          )}
        </li>
        <li>
          <strong>Phone:</strong>{" "}
          {SUPPORT_PHONE ? (
            <a href={`tel:${SUPPORT_PHONE}`}>{SUPPORT_PHONE}</a>
          ) : (
            "[SET NEXT_PUBLIC_SUPPORT_PHONE]"
          )}
        </li>
      </ul>

      <h2>Registered office</h2>
      <p>
        [LEGAL ENTITY NAME]<br />
        [REGISTERED ADDRESS]<br />
        [CITY], [STATE], India [PIN]
      </p>

      <p>
        Logged-in users can also submit feedback directly from the in-app{" "}
        <a href="/feedback">Feedback</a> page.
      </p>
    </>
  );
}
