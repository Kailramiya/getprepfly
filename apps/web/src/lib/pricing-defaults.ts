// Default plan prices (in paise = INR × 100)
// These are used as fallbacks when no custom price is set in the DB.
export const DEFAULT_PRICES: Record<string, { amount: number; label: string }> = {
  MODULE_SPEAKING:  { amount: 19900,   label: "Speaking Module (per student)" },
  MODULE_WRITING:   { amount: 19900,   label: "Writing Module (per student)" },
  MODULE_READING:   { amount: 19900,   label: "Reading Module (per student)" },
  MODULE_LISTENING: { amount: 19900,   label: "Listening Module (per student)" },
  ALL_MODULES:      { amount: 59900,   label: "All 4 Modules Bundle (per student)" },
  // Monthly centre plans
  CENTRE_STARTER:   { amount: 299900,  label: "Centre Starter Plan (50 students)" },
  CENTRE_GROWTH:    { amount: 699900,  label: "Centre Growth Plan (150 students)" },
  CENTRE_PRO:       { amount: 1499900, label: "Centre Pro Plan (500 students)" },
  // Annual institute plans
  ANNUAL_STARTER:   { amount: 1199900, label: "Annual Starter Plan (50+15 students/year)" },
  ANNUAL_GROWTH:    { amount: 2999900, label: "Annual Growth Plan (150+30 students/year)" },
  ANNUAL_UNLIMITED: { amount: 7999900, label: "Annual Unlimited Plan (Unlimited students/year)" },
};
