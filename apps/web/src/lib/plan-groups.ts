// Which UI group each DEFAULT_PRICES plan belongs to on the super-admin
// pricing page. Kept in its own plain module — not inside that "use client"
// page — specifically so plan-tables.check.ts can verify every real plan
// has a group to render in. This is exactly the check that would have
// caught the 3-month tier and ANNUAL_SCALE being silently missing from the
// admin pricing UI (both plans existed in DEFAULT_PRICES but had no entry
// here, so the page never rendered them at all, with no error or warning).
export const PLAN_GROUPS: Record<string, string> = {
  // Student — 1 month
  MODULE_SPEAKING: "Student Plans (1 Month)",
  MODULE_WRITING: "Student Plans (1 Month)",
  MODULE_READING: "Student Plans (1 Month)",
  MODULE_LISTENING: "Student Plans (1 Month)",
  ALL_MODULES: "Student Plans (1 Month)",
  // Student — 3 months
  MODULE_SPEAKING_3M: "Student Plans (3 Months)",
  MODULE_WRITING_3M: "Student Plans (3 Months)",
  MODULE_READING_3M: "Student Plans (3 Months)",
  MODULE_LISTENING_3M: "Student Plans (3 Months)",
  ALL_MODULES_3M: "Student Plans (3 Months)",
  // Student — 6 months
  MODULE_SPEAKING_6M: "Student Plans (6 Months)",
  MODULE_WRITING_6M: "Student Plans (6 Months)",
  MODULE_READING_6M: "Student Plans (6 Months)",
  MODULE_LISTENING_6M: "Student Plans (6 Months)",
  ALL_MODULES_6M: "Student Plans (6 Months)",
  // Student — 1 year
  MODULE_SPEAKING_1Y: "Student Plans (1 Year)",
  MODULE_WRITING_1Y: "Student Plans (1 Year)",
  MODULE_READING_1Y: "Student Plans (1 Year)",
  MODULE_LISTENING_1Y: "Student Plans (1 Year)",
  ALL_MODULES_1Y: "Student Plans (1 Year)",
  // Centre — monthly
  CENTRE_MINI: "Centre Plans (Monthly)",
  CENTRE_SMALL: "Centre Plans (Monthly)",
  // Centre — 6 months
  CENTRE_STARTER: "Centre Plans (6 Months)",
  CENTRE_GROWTH: "Centre Plans (6 Months)",
  CENTRE_PRO: "Centre Plans (6 Months)",
  // Annual institute plans
  ANNUAL_STARTER: "Annual Institute Plans",
  ANNUAL_GROWTH: "Annual Institute Plans",
  ANNUAL_SCALE: "Annual Institute Plans",
};
