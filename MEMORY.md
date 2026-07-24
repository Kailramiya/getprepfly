# Project Context Memory
**Project Name:** PrepFly (PTE Practice Platform)

This document serves as a persistent context brain for AI assistants and developers jumping into the project, summarizing the current state, ongoing problems, and architectural philosophy.

---

## 1. Current State (As of July 2026)
- **Completed:** Phase 3 (Student Experience) is fully completed. The mock test interfaces, practice sections, and student dashboards have been thoroughly redesigned to meet the "High-End Visual Design" specifications.
- **In Progress:** Phase 4 (Admin & Super Admin Panels). We are about to start building the management interfaces for institutional clients.
- **Environment:** Development is running locally on Windows. The project utilizes `npm run dev`.

## 2. Known Issues & Quirks
- **Prisma + Neon Disconnects (`Error P1017`):** During aggressive build processes (`next build`) or hot-reloading spikes, the Prisma client occasionally drops the connection to the Neon serverless database. 
  - *Mitigation:* This is largely an environmental issue with Vercel/Neon limits. Do not spend excessive time debugging syntax; simply retry the build or restart the dev server.
- **Playwright Testing:** Local execution of playwright browsers failed due to missing OS dependencies/sandbox constraints. Visual validation is currently done manually.

## 3. Design Philosophy Enforcement
- The user is extremely strict regarding UI aesthetics. 
- **Rule of Thumb:** If it looks like standard Bootstrap or a basic shadcn template, it is wrong. It MUST use translucent backgrounds, rounded corners (large radiuses like `rounded-3xl` or `rounded-full`), and fluid animations (`duration-700 ease-fluid`).
- Never use solid gray backgrounds for cards; always use `bg-background/50 backdrop-blur-xl ring-1 ring-white/10`.

## 4. Next Actions
- Shift focus to the `/admin` and `/super-admin` route groups.
- Ensure the admin interfaces follow the exact same high-end aesthetic applied to the student dashboard.
- Plan the database schemas for analytics reporting and subscription billing limits.
