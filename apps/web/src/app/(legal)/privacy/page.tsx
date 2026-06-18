import type { Metadata } from "next";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = { title: `Privacy Policy — ${APP_NAME}` };

// NOTE FOR OWNER: replace [PLACEHOLDER] values and have reviewed by a lawyer.
// India's DPDP Act 2023 applies — confirm your obligations before launch.
export default function PrivacyPage() {
  return (
    <>
      <h1>Privacy Policy</h1>
      <p><em>Last updated: 18 June 2026</em></p>

      <p>
        This Privacy Policy explains how {APP_NAME}, operated by [LEGAL ENTITY NAME]
        (&quot;we&quot;), collects, uses, and protects your personal data when you use our
        Service. We process data in accordance with applicable Indian law,
        including the Digital Personal Data Protection Act, 2023.
      </p>

      <h2>1. Data we collect</h2>
      <ul>
        <li><strong>Account data:</strong> name, email, phone, password (hashed), role, and centre association.</li>
        <li><strong>Practice data:</strong> your attempts, responses (including audio recordings you submit for scoring), scores, and progress.</li>
        <li><strong>Payment data:</strong> handled by Razorpay; we store transaction status and identifiers, not your full card details.</li>
        <li><strong>Technical data:</strong> IP address, device/browser information, and usage logs for security and reliability.</li>
      </ul>

      <h2>2. How we use your data</h2>
      <ul>
        <li>to provide practice content, AI scoring, and progress tracking;</li>
        <li>to process payments and manage subscriptions/seats;</li>
        <li>to secure the Service (rate limiting, single-session enforcement, fraud prevention);</li>
        <li>to send transactional emails (verification, password reset, invitations) and, where permitted, important notices.</li>
      </ul>

      <h2>3. Third-party processors</h2>
      <p>We share data with service providers only as needed to run the Service:</p>
      <ul>
        <li><strong>OpenAI</strong> — audio/text you submit for AI scoring is sent for processing.</li>
        <li><strong>Razorpay</strong> — payment processing.</li>
        <li><strong>Hosting &amp; storage</strong> — [HOSTING PROVIDER, e.g. Vercel], blob/object storage for media.</li>
        <li><strong>Email</strong> — our transactional email provider.</li>
      </ul>

      <h2>4. Data retention</h2>
      <p>
        We retain account and practice data for as long as your account is active
        and as required for legal/accounting purposes. You may request deletion
        (see below).
      </p>

      <h2>5. Your rights</h2>
      <p>
        You may access, correct, or request deletion of your personal data, and
        withdraw consent, by contacting us. We will respond within the timeframes
        required by law.
      </p>

      <h2>6. Security</h2>
      <p>
        We use industry-standard measures including password hashing, encrypted
        transport (HTTPS), access controls, and rate limiting. No method is 100%
        secure, but we work to protect your data.
      </p>

      <h2>7. Children</h2>
      <p>
        The Service is intended for users aged 16 and above. If you believe a child
        has provided us personal data without consent, contact us for removal.
      </p>

      <h2>8. Changes &amp; contact</h2>
      <p>
        We may update this policy; material changes will be notified in-app or by
        email. For privacy requests, see our <a href="/contact">Contact</a> page.
      </p>
    </>
  );
}
