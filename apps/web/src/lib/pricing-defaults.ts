// Default plan prices (in paise = INR × 100)
// These are used as fallbacks when no custom price is set in the DB.
export const DEFAULT_PRICES: Record<string, { amount: number; label: string; maxStudents?: number }> = {
  // Student plans — 1 month
  MODULE_SPEAKING:    { amount: 19900,   label: "Speaking Module (1 Month)" },
  MODULE_WRITING:     { amount: 19900,   label: "Writing Module (1 Month)" },
  MODULE_READING:     { amount: 19900,   label: "Reading Module (1 Month)" },
  MODULE_LISTENING:   { amount: 19900,   label: "Listening Module (1 Month)" },
  ALL_MODULES:        { amount: 59900,   label: "All 4 Modules Bundle (1 Month)" },
  // Student plans — 6 months
  MODULE_SPEAKING_6M: { amount: 99900,   label: "Speaking Module (6 Months)" },
  MODULE_WRITING_6M:  { amount: 99900,   label: "Writing Module (6 Months)" },
  MODULE_READING_6M:  { amount: 99900,   label: "Reading Module (6 Months)" },
  MODULE_LISTENING_6M:{ amount: 99900,   label: "Listening Module (6 Months)" },
  ALL_MODULES_6M:     { amount: 299900,  label: "All 4 Modules Bundle (6 Months)" },
  // Student plans — 1 year
  MODULE_SPEAKING_1Y: { amount: 179900,  label: "Speaking Module (1 Year)" },
  MODULE_WRITING_1Y:  { amount: 179900,  label: "Writing Module (1 Year)" },
  MODULE_READING_1Y:  { amount: 179900,  label: "Reading Module (1 Year)" },
  MODULE_LISTENING_1Y:{ amount: 179900,  label: "Listening Module (1 Year)" },
  ALL_MODULES_1Y:     { amount: 499900,  label: "All 4 Modules Bundle (1 Year)" },
  // Centre plans — monthly (30 days)
  CENTRE_MINI:        { amount: 119900,  label: "Centre Mini Plan (5 students, 1 month)",       maxStudents: 5 },
  CENTRE_SMALL:       { amount: 299900,  label: "Centre Small Plan (20 students, 1 month)",      maxStudents: 20 },
  // Centre plans — 6 months
  CENTRE_STARTER:     { amount: 299900,  label: "Centre Starter Plan (50 students, 6 months)",   maxStudents: 50 },
  CENTRE_GROWTH:      { amount: 699900,  label: "Centre Growth Plan (150 students, 6 months)",   maxStudents: 150 },
  CENTRE_PRO:         { amount: 1499900, label: "Centre Pro Plan (500 students, 6 months)",      maxStudents: 500 },
  // Annual institute plans
  ANNUAL_STARTER:     { amount: 1199900, label: "Annual Starter Plan (50+15 students/year)",     maxStudents: 65 },
  ANNUAL_GROWTH:      { amount: 2999900, label: "Annual Growth Plan (150+30 students/year)",     maxStudents: 180 },
  ANNUAL_UNLIMITED:   { amount: 7999900, label: "Annual Unlimited Plan (Unlimited students/year)", maxStudents: -1 },
};
