// Default plan prices (in paise = INR × 100)
// These are used as fallbacks when no custom price is set in the DB.
export const DEFAULT_PRICES: Record<string, { amount: number; label: string; maxStudents?: number }> = {
  // Student plans — 1 month
  MODULE_SPEAKING:    { amount: 24900,   label: "Speaking Module (1 Month)" },
  MODULE_WRITING:     { amount: 24900,   label: "Writing Module (1 Month)" },
  MODULE_READING:     { amount: 24900,   label: "Reading Module (1 Month)" },
  MODULE_LISTENING:   { amount: 24900,   label: "Listening Module (1 Month)" },
  ALL_MODULES:        { amount: 59900,   label: "All 4 Modules Bundle (1 Month)" },
  // Student plans — 3 months
  MODULE_SPEAKING_3M: { amount: 64900,   label: "Speaking Module (3 Months)" },
  MODULE_WRITING_3M:  { amount: 64900,   label: "Writing Module (3 Months)" },
  MODULE_READING_3M:  { amount: 64900,   label: "Reading Module (3 Months)" },
  MODULE_LISTENING_3M:{ amount: 64900,   label: "Listening Module (3 Months)" },
  ALL_MODULES_3M:     { amount: 149900,  label: "All 4 Modules Bundle (3 Months)" },
  // Student plans — 6 months
  MODULE_SPEAKING_6M: { amount: 109900,  label: "Speaking Module (6 Months)" },
  MODULE_WRITING_6M:  { amount: 109900,  label: "Writing Module (6 Months)" },
  MODULE_READING_6M:  { amount: 109900,  label: "Reading Module (6 Months)" },
  MODULE_LISTENING_6M:{ amount: 109900,  label: "Listening Module (6 Months)" },
  ALL_MODULES_6M:     { amount: 269900,  label: "All 4 Modules Bundle (6 Months)" },
  // Student plans — 1 year
  MODULE_SPEAKING_1Y: { amount: 179900,  label: "Speaking Module (1 Year)" },
  MODULE_WRITING_1Y:  { amount: 179900,  label: "Writing Module (1 Year)" },
  MODULE_READING_1Y:  { amount: 179900,  label: "Reading Module (1 Year)" },
  MODULE_LISTENING_1Y:{ amount: 179900,  label: "Listening Module (1 Year)" },
  ALL_MODULES_1Y:     { amount: 449900,  label: "All 4 Modules Bundle (1 Year)" },
  // Centre plans — monthly (30 days)
  CENTRE_MINI:        { amount: 119900,  label: "Centre Mini Plan (5 students, 1 month)",       maxStudents: 5 },
  CENTRE_SMALL:       { amount: 299900,  label: "Centre Small Plan (20 students, 1 month)",      maxStudents: 20 },
  // Centre plans — 6 months
  CENTRE_STARTER:     { amount: 2499900, label: "Centre Starter Plan (50 students, 6 months)",   maxStudents: 50 },
  CENTRE_GROWTH:      { amount: 5999900, label: "Centre Growth Plan (150 students, 6 months)",   maxStudents: 150 },
  CENTRE_PRO:         { amount: 12999900,label: "Centre Pro Plan (500 students, 6 months)",      maxStudents: 500 },
  // Annual institute plans
  ANNUAL_STARTER:     { amount: 3999900, label: "Annual Starter Plan (50+15 students/year)",     maxStudents: 65 },
  ANNUAL_GROWTH:      { amount: 8999900, label: "Annual Growth Plan (150+30 students/year)",     maxStudents: 180 },
  ANNUAL_SCALE:       { amount: 19999900,label: "Annual Scale Plan (Up to 500 students/year)",   maxStudents: 500 },
};
