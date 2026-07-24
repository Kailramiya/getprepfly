# Project Rules & Guidelines
**Project Name:** PrepFly (PTE Practice Platform)

This document outlines the coding standards, contribution guidelines, and development rules for the PrepFly platform. Adhering to these rules ensures a maintainable, scalable, and visually consistent codebase.

---

## 1. General Development Principles

1. **Lazy & Efficient Development:** The best code is the code never written. Before building a new component or utility, check if one already exists in the standard library, `lib/utils.ts`, or the existing `components/ui/` directory. 
2. **Root Cause Over Symptoms:** When fixing a bug, do not just patch the specific route or line where it manifested. Find the shared utility or root logic causing the issue and fix it there to prevent sibling bugs.
3. **Deletion Over Addition:** Prefer removing dead code or unnecessary boilerplate over adding complex new abstractions.

---

## 2. Git & Version Control

1. **Branching Strategy:**
   - `main`: Production-ready code. Always deployable.
   - `feat/<feature-name>`: New features (e.g., `feat/admin-dashboard`).
   - `fix/<bug-name>`: Bug fixes (e.g., `fix/prisma-connection-drop`).
2. **Conventional Commits:** All commit messages must follow the Conventional Commits format to generate clean changelogs.
   - `feat:` for new features.
   - `fix:` for bug fixes.
   - `chore:` for updating dependencies or build tasks.
   - `ui:` for design/CSS specific updates.
   - Example: `feat: add share button to topbar`

---

## 3. Frontend Standards (Next.js & React)

### 3.1. App Router Conventions
- **Server Components by Default:** Assume all components in `app/` are React Server Components (RSC) unless interactivity (hooks, state, event listeners) is required.
- **Client Components:** Add `"use client";` at the very top of the file *only* when necessary. Try to push `"use client"` down the component tree as far as possible (e.g., wrap only the interactive button, not the whole layout).
- **Data Fetching:** Prefer fetching data directly in Server Components using native `fetch` or Prisma over client-side fetching whenever possible for better SEO and load times.

### 3.2. Styling & High-End Visual Design
- **Tailwind CSS:** Use Tailwind exclusively for styling. Do not write custom CSS in `globals.css` unless defining core design tokens (HSL variables) or `@layer utilities`.
- **Aesthetic Rules (CRITICAL):**
  - **Glassmorphism:** Use `bg-background/50 backdrop-blur-xl ring-1 ring-white/10 shadow-glass`. Do not use flat, boring colors.
  - **Animations:** All interactive elements (buttons, cards, inputs) must have fluid transitions. Use `transition-all duration-700 ease-fluid active:scale-[0.98]`.
  - **Typography:** Use tight tracking (`tracking-tight`) for headings and bold fonts (`font-extrabold`) to create a premium feel.
- **Component Reusability:** Use and customize the provided `shadcn/ui` components located in `src/components/ui`. Do not build custom dialogs, buttons, or inputs from scratch if a robust primitive already exists.

---

## 4. Backend Standards (API Routes & Prisma)

### 4.1. API Handlers
- **Standardized Responses:** All API routes should return JSON in a consistent format:
  - Success: `{ "success": true, "data": { ... } }`
  - Error: `{ "success": false, "error": "Descriptive message" }`
- **Error Handling:** Wrap all database calls and external API requests in `try/catch` blocks. Do not let raw database errors leak to the client.

### 4.2. Database (Prisma + Neon)
- **Connection Management:** Due to serverless environments, Prisma connections can sometimes drop (`Error P1017`). Ensure the Prisma client is instantiated globally in development to prevent exhausting connection limits (see `lib/db.ts`).
- **Migrations:** Never modify the database schema directly. Always update `prisma/schema.prisma` and run `npx prisma migrate dev --name <description>`. For production deployments, ensure `prisma migrate deploy` is run.

---

## 5. Code Review & PR Process

1. **Self-Review:** Before opening a PR, review your own diff. Ensure no `console.log` statements (except intentional errors/warnings) or commented-out dead code is left behind.
2. **Visual Verification:** If you touch the UI, you MUST verify the changes in both **Light Mode** and **Dark Mode** to ensure contrast and readability are maintained.
3. **Approval:** PRs require at least one approval before merging into `main`. Squash and merge to keep the history clean.
