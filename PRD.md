# Product Requirements Document (PRD)
**Project Name:** PrepFly (PTE Practice Platform)
**Version:** 1.0
**Last Updated:** July 2026
**Status:** In Development (Beta)

---

## 1. Executive Summary
**PrepFly** is an AI-powered B2B2C Pearson Test of English (PTE) preparation platform. It provides institutions (Centres) with a white-labeled or co-branded solution to manage students, assign mock tests, and track progress. For students, it offers a premium, highly engaging practice environment featuring AI-driven scoring for Speaking, Writing, Reading, and Listening modules.

## 2. Target Audience & User Personas
The platform serves four distinct user roles, each with tailored experiences and permissions:

### 2.1. Student
- **Goal:** Practice PTE questions, take full/sectional mock tests, and receive immediate, actionable AI feedback to improve their scores.
- **Needs:** Intuitive interface, clear progress tracking, realistic exam simulations, and detailed feedback on pronunciation, fluency, grammar, and vocabulary.

### 2.2. Centre Admin
- **Goal:** Manage a cohort of students belonging to their institution.
- **Needs:** Ability to invite/manage students, assign specific mock tests or practice sets, view detailed analytics of student performance, and customize basic branding (e.g., logo, centre name).

### 2.3. Sub Agent
- **Goal:** Assist the Centre Admin in managing students and operations.
- **Needs:** Subset of Centre Admin permissions (e.g., viewing progress, adding students) without access to billing or overarching centre settings.

### 2.4. Super Admin
- **Goal:** Manage the entire PrepFly platform.
- **Needs:** Global dashboard to manage all Centres, global mock test templates, user subscriptions, AI prompt tuning, and system-wide analytics.

---

## 3. Core Features & Capabilities

### 3.1. AI Evaluation Engine
- **Speaking:** Audio recording capture, transcription, and AI evaluation based on PTE rubrics (Oral Fluency, Pronunciation, Content).
- **Writing:** Text analysis for Grammar, Vocabulary, Spelling, Written Discourse, and Content alignment.
- **Reading & Listening:** Automated scoring for objective formats (MCQs, Fill in the Blanks, Highlight Incorrect Words).

### 3.2. Practice Modules
- Granular practice sections categorized by question type (e.g., Read Aloud, Write Essay, Reorder Paragraphs).
- Instant, granular feedback upon submission.
- Persistent history of previous attempts allowing users to review and replay their past audio recordings.

### 3.3. Mock Tests
- **Templates:** Super Admins can create global mock test templates (Full 4-module tests or sectional tests).
- **Assignment:** Centre Admins can assign specific tests to their students.
- **Execution:** A timed, locked-down interface simulating the real PTE exam environment.
- **Reporting:** Comprehensive post-test report card displaying an overall score (out of 90) and individual module scores, complete with question-by-question review.

### 3.4. Analytics & Progress Tracking
- **Student Dashboard:** Visual charts (Radar charts, line graphs) showing score progression over time, strengths, and weaknesses.
- **Centre Dashboard:** Aggregate statistics of centre performance, top-performing students, and pending test assignments.

---

## 4. Non-Functional Requirements (NFRs)

### 4.1. High-End Visual Design & UX
- **Aesthetic:** The platform must exude a "Premium, Apple-esque" feel.
- **Key Elements:**
  - **Glassmorphism:** Extensive use of translucent backgrounds (`backdrop-blur-xl`), subtle borders (`ring-white/10`), and soft drop shadows (`shadow-glass`).
  - **Fluid Animations:** Smooth micro-interactions, hovering effects, and page transitions (`duration-700 ease-fluid`).
  - **Color Palette:** Deep, rich gradients and HSL-based tokens supporting both pristine Light Mode and sleek Dark Mode.
- **Responsiveness:** Flawless execution across desktop (primary testing environment) and mobile devices.

### 4.2. Performance & Reliability
- **Audio Processing:** Audio recording must be robust, supporting various microphone inputs, and compressed efficiently before uploading to avoid latency.
- **Load Times:** Next.js SSR and optimized caching must ensure near-instant page loads.
- **Database:** Prisma + Neon PostgreSQL must be connection-pooled effectively to prevent `P1017` connection drops during high concurrency.

### 4.3. Security & Data Privacy
- **Authentication:** Secure, token-based authentication via NextAuth.js.
- **Authorization:** Strict role-based access control (RBAC) ensuring Centre Admins cannot access data from other centres.
- **Data Retention:** Secure storage of student audio recordings and personal data, compliant with standard data protection guidelines.

---

## 5. Technology Stack
- **Frontend Framework:** Next.js 14 (App Router)
- **UI Library:** React, Tailwind CSS, shadcn/ui (heavily customized)
- **Icons & Visualization:** Lucide React, Recharts
- **Backend Architecture:** Next.js API Routes (Serverless)
- **Database:** PostgreSQL (Neon Tech)
- **ORM:** Prisma
- **Authentication:** NextAuth.js
- **Deployment:** Vercel (Recommended)

---

## 6. Future Roadmap (Phase 4 & Beyond)
- **Phase 4:** Development of comprehensive Admin and Super Admin panels.
- **Phase 5:** Implementation of Stripe/Razorpay billing for Centre subscriptions and premium student features.
- **Phase 6:** Advanced AI fine-tuning for edge-case accents in the Speaking module.
- **Phase 7:** Real-time collaborative features between teachers (Centre Admins) and students (e.g., live feedback sessions).
