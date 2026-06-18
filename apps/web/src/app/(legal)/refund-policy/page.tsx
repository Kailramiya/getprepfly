import type { Metadata } from "next";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = { title: `Refund & Cancellation Policy — ${APP_NAME}` };

// NOTE FOR OWNER: Razorpay requires a clearly published refund/cancellation
// policy. Adjust the windows/terms below to match your actual business rules,
// then have it reviewed. Placeholder values are marked.
export default function RefundPolicyPage() {
  return (
    <>
      <h1>Refund &amp; Cancellation Policy</h1>
      <p><em>Last updated: 18 June 2026</em></p>

      <p>
        This policy applies to purchases made on {APP_NAME}, operated by
        [LEGAL ENTITY NAME]. By completing a purchase you agree to the terms below.
      </p>

      <h2>1. Digital nature of the Service</h2>
      <p>
        {APP_NAME} sells access to digital practice content and AI scoring that is
        available immediately upon purchase. Because access is granted instantly,
        purchases are generally non-refundable once the plan has been used.
      </p>

      <h2>2. Refund eligibility</h2>
      <p>You may request a refund within [7] days of purchase if:</p>
      <ul>
        <li>you were charged in error or charged more than once for the same plan; or</li>
        <li>you were unable to access the purchased content due to a technical fault on our side that we could not resolve within a reasonable time; and</li>
        <li>you have not substantially used the plan (e.g., consumed a significant number of AI scorings or completed mock tests).</li>
      </ul>
      <p>
        Coaching-centre (B2B) plans and seats already allocated to students are
        non-refundable once allocated.
      </p>

      <h2>3. How to request a refund</h2>
      <p>
        Email us via the <a href="/contact">Contact</a> page with your registered
        email, order/payment ID, and the reason for the request. We aim to respond
        within [3] business days.
      </p>

      <h2>4. Processing</h2>
      <p>
        Approved refunds are issued to the original payment method via Razorpay and
        typically settle within [5–7] business days, depending on your bank.
      </p>

      <h2>5. Cancellations</h2>
      <p>
        Plans do not auto-renew, so there is nothing to cancel for future billing.
        You may stop using the Service at any time; access remains available until
        the end of the paid period.
      </p>

      <h2>6. Contact</h2>
      <p>
        For any billing question, reach us through our <a href="/contact">Contact</a> page.
      </p>
    </>
  );
}
