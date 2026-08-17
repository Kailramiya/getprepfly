# Security Audit Report

**Date**: August 17, 2026
**Target**: `pte-platform`
**Auditor**: Antigravity (AppSec Agent)

---

## Executive Summary
A comprehensive security review was conducted on the `pte-platform` project following the designated `security-review` protocol. The overall security posture of the application is strong, particularly regarding Authentication and Authorization guards. However, **Critical** dependency vulnerabilities were discovered in the `npm` tree, and a **High Risk** secret leakage was identified in the local environment files. Immediate remediation of these issues is required.

---

## Vulnerability Matrix

| Severity | Vulnerability Type | File/Location | Description |
| :--- | :--- | :--- | :--- |
| **Critical** | Dependency Vulnerability | `npm audit` (`tar`) | Multiple path traversal and DoS vulnerabilities in `tar` |
| **High** | Secret Leakage | `apps/web/.env` | Hardcoded Neon Database credentials found in `.env` |
| **Medium** | Dependency Vulnerability | `npm audit` (`undici`, `uuid`) | Response desynchronization and buffer bounds checks |
| **Low** | Potential XSS Vector | `apps/web/src/app/page.tsx:L259` | Use of `dangerouslySetInnerHTML` |
| **Info** | Missing Environment Guard | `api/cron/re-engagement/route.ts` | Cron secret defaults to `true` if undefined |

---

## Detailed Breakdowns

### 1. Critical Dependency Vulnerabilities (`tar`)

**Exploitation Vector:**
The project's dependency tree contains older versions of the `tar` package which suffer from Symlink Path Traversal, Uncaught Exception DoS, and Decompression DoS vulnerabilities. If the application processes untrusted `.tar` archives, an attacker could achieve arbitrary file overwrite or crash the server.

**Remediation Code Snippet:**
Run the following command to automatically fix these vulnerable dependency paths:
```bash
npm audit fix
```
If `npm audit fix` cannot resolve it due to sub-dependencies (like `expo` or `cacache`), add an override to your `package.json`:
```json
"overrides": {
  "tar": "^6.2.1"
}
```

### 2. High Risk: Hardcoded Database Credentials

**Vulnerable Snippet:**
File: `apps/web/.env`
```env
# Database (local dev — update with your PostgreSQL credentials)
DATABASE_URL="postgresql://neondb_owner:npg_THY1J3toWPAv@ep-floral-pine-amiqofes-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
DIRECT_URL="postgresql://neondb_owner:npg_THY1J3toWPAv@ep-floral-pine-amiqofes.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
```

**Exploitation Vector:**
Storing production or staging secrets in a `.env` file creates a high risk of accidental credential leakage if the file is ever committed to source control (Git). An attacker gaining access to the repository would have full direct access to the Neon PostgreSQL database.

**Remediation Code Snippet:**
1. Rename `.env` to `.env.example` and remove all sensitive values (leave them blank).
2. Move the real credentials to a `.env.local` file.
3. Ensure `.env.local` is listed in your `.gitignore` file so it is never checked in.
4. **Rotate** the Neon Database password immediately since it has been exposed in plaintext on disk.

### 3. Low Risk: `dangerouslySetInnerHTML` Usage

**Vulnerable Snippet:**
File: `apps/web/src/app/page.tsx`
```tsx
<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
```

**Exploitation Vector:**
While currently safe because `JSON.stringify()` neutralizes typical HTML injection vectors, using `dangerouslySetInnerHTML` is inherently risky. If the schema object `jsonLd` ever includes raw, unescaped user input that bypasses JSON stringification (e.g. if modified in the future), it could lead to Cross-Site Scripting (XSS).

**Remediation Code Snippet:**
While no immediate action is strictly required for JSON-LD, if you want to strictly adhere to React safety rules, consider using a safe JSON-LD library or ensuring strict typing on the `jsonLd` object so it cannot receive unescaped raw HTML strings.

---

## Authentication & Authorization Status
**Status: PASSED**

A full scan of the API directory (`/app/api/`) revealed excellent adherence to security best practices. 
- No raw SQL queries (`$queryRaw` / `$executeRaw`) were found, mitigating SQL injection risks.
- All sensitive API routes correctly implement the `requireAuth()` and `requireRole()` guard patterns at the entry boundary.
- The routes lacking guards are exclusively intended for public access (Authentication callbacks, Registration, Webhooks, and Pricing).

*Note: The cron job endpoint (`/api/cron/re-engagement/route.ts`) skips authentication if `process.env.CRON_SECRET` is unset. Ensure this environment variable is strictly populated in your production Vercel environment to prevent unauthorized trigger spam.*
