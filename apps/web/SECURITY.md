# Security notes

## HTTP security headers

Baseline headers are set for every response in `next.config.mjs` → `headers()`:

- `Strict-Transport-Security` (HSTS, 2y, preload)
- `X-Frame-Options: SAMEORIGIN` (clickjacking)
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` — only `microphone=(self)` (needed for speaking practice)

## Content-Security-Policy (not yet enabled)

A CSP is deliberately **not** shipped yet because an untested policy will break
the live app. Before enabling, a candidate policy must be validated against:

- **Razorpay checkout** — `https://checkout.razorpay.com`, `https://*.razorpay.com`
  (script-src + frame-src), and its API/image hosts.
- **Google** — OAuth (`accounts.google.com`) and any Google Fonts.
- **Next.js runtime** — inline bootstrap scripts (use a nonce or `'strict-dynamic'`),
  inline styles (`'unsafe-inline'` for style-src or nonces).
- **Media** — `*.public.blob.vercel-storage.com`, `*.s3.amazonaws.com`,
  `*.cloudinary.com` for img-src / media-src; the `/api/media-proxy` route.
- **OpenAI / fetch targets** used directly from the browser, if any.

Rollout plan:
1. Add the policy as `Content-Security-Policy-Report-Only` first and watch for
   violations (Sentry / report-uri) across login, practice (audio), and the
   pricing/checkout flow.
2. Once clean, promote to the enforcing `Content-Security-Policy` header.

## Rate limiting

See `src/lib/rate-limit.ts`. Backed by Upstash Redis; configure
`UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` in production or limits
are disabled (a warning is logged on prod boot).

## Single active session

Logins rotate `User.activeSessionId`; the NextAuth `jwt` callback invalidates
stale tokens so only one device stays signed in. See `src/lib/auth.ts`.
