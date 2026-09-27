// Run: node_modules/.bin/tsx apps/web/src/lib/plan-tables.check.ts
import assert from "node:assert/strict";
import { DEFAULT_PRICES } from "./pricing-defaults";
import { MODULE_PRICING, CENTRE_PLANS, isCentrePlanKey } from "./access";

for (const [key, def] of Object.entries(DEFAULT_PRICES)) {
  const plan = isCentrePlanKey(key) ? CENTRE_PLANS[key] : MODULE_PRICING[key];
  assert.ok(plan, `${key} is shown on the pricing page but the server cannot sell it`);
  assert.equal(plan.amount, def.amount, `${key}: server charges ${plan.amount}, page shows ${def.amount}`);
}
assert.equal(MODULE_PRICING.MODULE_SPEAKING.amount, 24900);
assert.equal(MODULE_PRICING.MODULE_SPEAKING_3M.days, 90);
assert.equal(MODULE_PRICING.ALL_MODULES_1Y.section, null);
assert.equal(CENTRE_PLANS.ANNUAL_SCALE.days, 365);
assert.equal(CENTRE_PLANS.CENTRE_MINI.days, 30);
assert.equal(CENTRE_PLANS.CENTRE_STARTER.days, 180);
assert.equal(MODULE_PRICING.ANNUAL_SCALE, undefined);
console.log("plan tables: all", Object.keys(DEFAULT_PRICES).length, "plans consistent");
