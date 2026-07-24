# Project Phases
**Project Name:** PrepFly (PTE Practice Platform)

This document tracks the overarching phases of development for the platform.

---

## Phase 1: Foundation (Completed)
- **Objective:** Establish the core visual language and system architecture.
- **Key Deliverables:**
  - Setup Next.js App Router, Tailwind CSS, and shadcn/ui.
  - Establish `globals.css` with HSL variables for dark/light mode.
  - Implement base components (buttons, cards, inputs) adhering strictly to the "High-End Visual Design" system (glassmorphism, fluid transitions).
  - Setup Prisma schema for Users, Centres, and Mock Tests.

---

## Phase 2: Public Pages & Authentication (Completed)
- **Objective:** Build the onboarding flow and marketing front.
- **Key Deliverables:**
  - Redesign Landing Page (`/page.tsx`) with premium animations and gradient text.
  - Implement NextAuth.js JWT authentication.
  - Redesign Login (`/login`) and Registration flows.
  - Secure protected routes with Middleware.

---

## Phase 3: Student Experience (Completed)
- **Objective:** Overhaul the core value proposition for end-users (students).
- **Key Deliverables:**
  - **Student Dashboard (`/dashboard`):** Added progress tracking, recent activity, and a massive fluid CTA for mock tests.
  - **Practice Module (`/practice/[section]/[type]`):** Built an immersive interface for answering PTE questions, featuring an interactive QuestionRenderer, self-evaluation audio playback, and detailed AI score breakdown modals.
  - **Mock Tests (`/mock-test`):** Created a sleek filtering system and premium cards to differentiate between "Assigned by Centre" and "Available Templates".
  - **Active Mock Test Session (`/mock-test/[testId]`):** Designed a timed, locked-down environment with clear progress indicators, and an extensive post-test review interface featuring an overarching "Overall Score" out of 90.

---

## Phase 4: Admin & Super Admin Panels (Upcoming)
- **Objective:** Provide management interfaces for institutional clients and platform owners.
- **Key Deliverables:**
  - **Centre Dashboard:** Analytics on student pass rates, activity, and subscription limits.
  - **User Management:** UI for Centre Admins to invite, manage, and remove students or Sub Agents.
  - **Test Assignment:** Interface to assign specific mock tests to cohorts.
  - **Super Admin Global Dashboard:** Manage global templates, fine-tune AI prompts, and oversee platform billing.

---

## Phase 5: Billing & Infrastructure Scaling (Future)
- **Objective:** Monetize the platform and handle increased load.
- **Key Deliverables:**
  - Stripe/Razorpay integration for B2B billing (Centres) and B2C upsells (Students).
  - Audio processing optimization (client-side compression before cloud upload).
  - Advanced Prisma connection pooling scaling to handle high concurrency during global mock test events.
