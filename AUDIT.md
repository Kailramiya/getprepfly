# Prepfly — Product Audit & Implementation Tracker

End users: **PTE students** (mostly India, mobile-heavy, want 79+) and **coaching centres** (desktop, run a business on this).

Legend: `[ ]` todo · `[x]` done · `[~]` partial/in-progress · Priority **P0** blocker / **P1** high / **P2** medium / **P3** polish.
Keep this file updated as items ship. Add newly-found bugs under "Discovered during implementation".

---

## Track A — Quick wins (high impact, small change)
- [x] **P1** Add product analytics (Vercel Analytics in root layout). *(layout.tsx)*
- [x] **P1** Mock-test scoring: unanswered/unscored questions now count as 0 (fair); FULL averages all 4 skills; reuses startedAt (one fewer query). *(api/mock-tests/[testId]/route.ts)*
- [x] **P1** Mock-test report: dropped arbitrary `≥45=correct`; now shows honest Answered + pending count. *(report route + report page)*
- [x] **P1** Score breakdown already shown; added PTE band descriptor + "AI-estimated" trust caption. ("better than X%" percentile deferred → needs aggregation endpoint, Track C.) *(score-display.tsx)*
- [x] **P1** Mobile touch DnD — ALREADY supported (reorder has up/down buttons; drag-fill has tap-to-place). Polished reorder arrows w/ aria-labels + disabled states. *(question-renderer.tsx)*
- [~] **P1** A11y: aria-labels on password toggles (login/register/reset), topbar menu/account buttons, reorder arrows; removed dead notification bell. *(more icon buttons/inputs across admin pages still pending — Track F)*
- [ ] **P1** Dark-mode contrast: bump `text-gray-400`/`gray-500` on dark to readable (WCAG AA). *(Track F)*
- [ ] **P2** Empty states + skeletons on dashboard/progress/practice/mock-test lists.
- [x] **P2** Remove dead dependency `react-beautiful-dnd` (~60KB, unused). *(apps/web/package.json)*
- [ ] **P2** Confirmation + toast on destructive actions (logout, deletes). *(topbar.tsx)*

## Track B — Scoring trust (the core differentiator)
- [ ] **P0** Move objective scoring server-side (MCQ/reorder/fill-blanks/dictation) + stop sending answer keys to client (anti-cheat). *(question-renderer.tsx → new /api/attempts/score)*
- [x] **P1** AI scoring calibration: writing already has band anchors+example; added PTE band anchors to speaking. *(score-speaking, score-writing)*
- [x] **P1** Lower scoring variance: temperature 0.3→0.2 + fixed `seed` on both AI scorers; safe JSON parse (no 500 on malformed). 
- [ ] **P1** PTE band descriptor mapping + "better than X% of users" stat. *(score-display.tsx)*
- [~] **P1** Guarded unknown-question-type fallback (weight 100→10 so one unmapped Q can't dominate a skill). Full mark-weighting of attempts still pending. *(lib/pte-scoring.ts)*
- [x] **P2** Fill-blank matching tolerance: `normAns()` (case/trim/whitespace/surrounding-punctuation) applied to all 3 blank types' scoring + display. *(question-renderer.tsx)*
- [ ] **P2** Re-score button (consume a credit) + "score improved" indicator.
- [ ] **P3** Gold-standard calibration set + drift logging; "How we score" methodology page.

## Track C — Student engagement & retention
- [x] **P1** Daily practice goal + today's progress bar on dashboard (User.dailyGoal, settings to change). *(dashboard + settings + profile API)*
- [x] **P1** Exam-day countdown (User.examDate set in settings → countdown widget on dashboard). *(settings + dashboard + profile API)*
- [x] **P1** Centre leaderboard (avg score, min 5 attempts, top 20 + your rank, privacy-safe names). *(api/leaderboard + /leaderboard page + sidebar)*
- [x] **P1** Attempt review: compare your last answers vs model on a question; history surfaced. *(api/attempts/[id] + /progress/attempts/[id] page + clickable recent attempts)*
- [ ] **P2** Re-engagement email ("you haven't practiced in 7 days", "you improved this week"). *(needs cron/Resend)*
- [~] **P2** "Focus areas" study-plan card on dashboard from weakest question types (deep-links to practice). Prediction/high-frequency surfacing still pending. *(dashboard + dashboard API)*
- [x] **P2** Model-answer audio (TTS) for shadowing on speaking/read-aloud. *(api/ai/tts/preview + SpeakingQuestion post-submit)*
- [ ] **P3** Achievements/badges; weekly challenge from predictions.

## Track D — Coaching-centre (B2B) features
- [ ] **P1** Bulk student import (CSV: name, email, phone, optional batch). *(admin/students + api)*
- [ ] **P1** Bulk renew + "expiring in 7/30 days" filter/column. *(admin/students)*
- [ ] **P1** Seat-usage gauge (e.g. 45/50) + cost clarity + expiry reminders + grace period. *(admin/settings, access.ts)*
- [ ] **P1** Batch mock-test tracking: who started/completed, results comparison, deadlines, batch leaderboard. *(admin/batches)*
- [ ] **P1** Export students (CSV) + per-student/batch progress report (PDF/printable). 
- [ ] **P2** Teacher → batch assignment + teacher dashboard + scoped permissions. *(admin/teachers, batches)*
- [ ] **P2** Deeper per-student progress (improvement trend, peer comparison, weak-area drill). *(admin/students/[studentId])*
- [ ] **P2** Targeted messaging to a student segment (e.g. expiring soon). *(announcements)*
- [ ] **P3** Configurable seat duration (30/90/180/365) + auto-renew toggle.

## Track E — Performance (scale + UX)
- [ ] **P1** Consolidate dashboard queries; stop loading 500 attempts in memory. *(api/dashboard/route.ts)*
- [ ] **P1** Add composite indexes `Question(section,type,isActive)`, `(centreId,isActive)`. *(schema.prisma)*
- [ ] **P1** Mock-test creation: replace 13-query loop with one `findMany`. *(api/mock-tests/route.ts)*
- [ ] **P2** Reduce client `useEffect`+fetch waterfalls (SSR/skeletons); shared cache for `/api/access/me`.
- [ ] **P2** Code-split `question-renderer.tsx` per type; lazy-load recharts; `optimizePackageImports` += recharts.
- [ ] **P2** Upload: enforce Vercel Blob, drop base64-in-DB fallback (fail loudly). *(api/upload-file)*
- [ ] **P3** Tune cache headers on `/api/questions` for non-admins.

## Track F — UI/UX, mobile, accessibility, PWA
- [ ] **P1** Mobile: sidebar auto-close on nav; responsive admin tables → card stacks on mobile.
- [ ] **P1** `aria-live` region to announce scores/feedback to screen readers. *(question-renderer.tsx)*
- [ ] **P2** Audio recorder mobile polish (show max duration upfront, custom player, haptic/sound at limit).
- [ ] **P2** PWA: complete manifest icon set (96/144/180/384) + maskable; offline fallback page; cache read APIs.
- [ ] **P2** Fix notification bell (real dropdown or hide). *(topbar.tsx)*
- [ ] **P2** Replace `!important` dark overrides in globals.css with consistent `dark:` classes.
- [ ] **P3** Touch target ≥44px; instruction placement above question; difficulty percentile labels.

## Track G — Growth / SEO
- [ ] **P2** Content pages (`/resources/...` PTE tips) for organic traffic.
- [ ] **P2** Allow indexing of `/pricing` (+ public practice teasers); add FAQ schema. *(robots.ts, page metadata)*

---

## Discovered during implementation
_(log new bugs/features found while building so nothing is missed)_
- …
