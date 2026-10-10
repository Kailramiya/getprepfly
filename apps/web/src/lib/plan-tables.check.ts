// Run: node_modules/.bin/tsx apps/web/src/lib/plan-tables.check.ts
import assert from "node:assert/strict";
import { DEFAULT_PRICES } from "./pricing-defaults";
import { MODULE_PRICING, CENTRE_PLANS, isCentrePlanKey } from "./access";
import { PLAN_GROUPS } from "./plan-groups";

for (const [key, def] of Object.entries(DEFAULT_PRICES)) {
  const plan = isCentrePlanKey(key) ? CENTRE_PLANS[key] : MODULE_PRICING[key];
  assert.ok(plan, `${key} is shown on the pricing page but the server cannot sell it`);
  assert.equal(plan.amount, def.amount, `${key}: server charges ${plan.amount}, page shows ${def.amount}`);
  // The exact bug that shipped: the super-admin pricing page's PLAN_GROUPS
  // (then an inline, hand-maintained table) was missing the whole 3-month
  // tier and had ANNUAL_SCALE under a key that doesn't exist, so 6 real,
  // sellable plans were silently impossible to manage from the admin UI —
  // no error, they just never rendered.
  assert.ok(PLAN_GROUPS[key], `${key} can be sold but has no group in the super-admin pricing UI — it will silently not appear there`);
}
// No orphans either — a group entry for a plan that no longer exists is a
// sign the key was renamed without updating this table (exactly how
// ANNUAL_UNLIMITED/ANNUAL_SCALE drifted).
for (const key of Object.keys(PLAN_GROUPS)) {
  assert.ok(DEFAULT_PRICES[key], `${key} has a super-admin pricing UI group but isn't a real plan — stale/renamed key?`);
}
assert.equal(MODULE_PRICING.MODULE_SPEAKING.amount, 24900);
assert.equal(MODULE_PRICING.MODULE_SPEAKING_3M.days, 90);
assert.equal(MODULE_PRICING.ALL_MODULES_1Y.section, null);
assert.equal(CENTRE_PLANS.ANNUAL_SCALE.days, 365);
assert.equal(CENTRE_PLANS.CENTRE_MINI.days, 30);
assert.equal(CENTRE_PLANS.CENTRE_STARTER.days, 180);
assert.equal(MODULE_PRICING.ANNUAL_SCALE, undefined);
console.log("plan tables: all", Object.keys(DEFAULT_PRICES).length, "plans consistent");
