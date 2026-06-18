import type { Metadata } from "next";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = { title: `Terms of Service — ${APP_NAME}` };

// NOTE FOR OWNER: replace every [PLACEHOLDER] with your registered legal details
// and have this reviewed by a lawyer before going live. This is a starting draft,
// not legal advice.
export default function TermsPage() {
  return (
    <>
      <h1>Terms of Service</h1>
      <p><em>Last updated: 18 June 2026</em></p>

      <p>
        These Terms of Service (&quot;Terms&quot;) govern your access to and use of {APP_NAME}
        (the &quot;Service&quot;), operated by [LEGAL ENTITY NAME], [REGISTERED ADDRESS, CITY,
        STATE, INDIA] (&quot;we&quot;, &quot;us&quot;). By creating an account or using the Service,
        you agree to these Terms.
      </p>

      <h2>1. Eligibility &amp; accounts</h2>
      <p>
        You must provide accurate registration information and keep your password
        secure. You are responsible for all activity under your account. Only one
        active session per account is permitted; signing in on a new device signs
        you out elsewhere. Sharing accounts is prohibited.
      </p>

      <h2>2. The Service</h2>
      <p>
        {APP_NAME} provides PTE Academic practice content, AI-assisted scoring, mock
        tests, and related study tools. AI-generated scores and feedback are
        estimates for practice purposes only and are not affiliated with, endorsed
        by, or predictive of official Pearson PTE results.
      </p>

      <h2>3. Subscriptions &amp; payments</h2>
      <p>
        Paid plans (individual modules, bundles, and coaching-centre plans) are
        billed in Indian Rupees via our payment processor, Razorpay. Prices and
        plan durations are shown at checkout. Access is granted for the stated
        duration and does not auto-renew unless explicitly stated. Refunds are
        governed by our <a href="/refund-policy">Refund &amp; Cancellation Policy</a>.
      </p>

      <h2>4. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>copy, scrape, redistribute, or resell question content or other materials;</li>
        <li>attempt to bypass access controls, rate limits, or content protection;</li>
        <li>reverse engineer, disrupt, or overload the Service;</li>
        <li>upload unlawful, infringing, or harmful content.</li>
      </ul>

      <h2>5. Intellectual property</h2>
      <p>
        All content, including the question bank, templates, and software, is owned
        by us or our licensors and is protected by law. &quot;PTE Academic&quot; and
        &quot;Pearson&quot; are trademarks of their respective owners; we are an independent
        practice provider and are not affiliated with Pearson.
      </p>

      <h2>6. Disclaimers &amp; limitation of liability</h2>
      <p>
        The Service is provided &quot;as is&quot; without warranties of any kind. To the
        maximum extent permitted by law, our aggregate liability for any claim is
        limited to the amount you paid us in the 3 months preceding the claim.
      </p>

      <h2>7. Termination</h2>
      <p>
        We may suspend or terminate accounts that violate these Terms. You may stop
        using the Service at any time.
      </p>

      <h2>8. Governing law</h2>
      <p>
        These Terms are governed by the laws of India. Disputes are subject to the
        exclusive jurisdiction of the courts of [CITY], [STATE].
      </p>

      <h2>9. Contact</h2>
      <p>
        Questions about these Terms? See our <a href="/contact">Contact</a> page.
      </p>
    </>
  );
}
