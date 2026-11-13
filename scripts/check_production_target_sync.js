/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const productionPage = read("src/app/production/page.tsx");
const targetsPage = read("src/app/admin/targets/page.tsx");
const resolver = read("src/lib/production-targets.ts");
const stages = read("src/lib/production-stages.ts");

assert.match(productionPage, /resolveProductionTarget\(selectedStage/,
  "Production Entry must resolve targets through the shared live-target resolver");
assert.match(productionPage, /PRODUCTION_ENTRY_STAGE_OPTIONS\.map/,
  "Production Entry must use the shared Targets-aligned stage options");
assert.doesNotMatch(productionPage, /productionTargetVersions/,
  "Production Entry must not use target history as a second source of truth");
assert.doesNotMatch(productionPage, /selectedStage\?\.(defaultTarget|materialTargets|materialMeterTargets|activityTargets)/,
  "Production Entry must not calculate targets inline");
assert.match(targetsPage, /DEFAULT_PRODUCTION_TARGETS as REVISED_TARGETS/,
  "Targets screen must use the shared target definitions");
assert.match(resolver, /stage\?\.materialMeterTargets\?\.\[material\]/,
  "STG-01 meter targets must come from the live stage document");
assert.match(resolver, /calculationQuantity: quantity \* ratio/,
  "STG-01 meter targets must use the shared meter-to-piece calculation");
assert.match(resolver, /value: "STG-09:PINNING"[\s\S]*?label: "STG-09 — Pinning"/,
  "Pinning must be a separate Production Entry stage option");
assert.match(resolver, /value: "STG-09:FOLDING"[\s\S]*?label: "STG-09 — Folding"/,
  "Folding must be a separate Production Entry stage option");
assert.match(resolver, /"STG-01": \{ defaultTarget: 1000, defaultWageRate: 10000/,
  "STG-01 must remain at target 1,000 and UGX 10,000");
assert.match(resolver, /DEFAULT_CUTTING_PIECE_TARGETS[\s\S]*?FLEECE: 1000/,
  "STG-01 Fleece piece target must match the 1,000-piece stage target");
assert.match(resolver, /DEFAULT_CUTTING_METER_TARGETS[\s\S]*?FLEECE: 50/,
  "STG-01 Fleece meter target must be 50 meters");

const stageIds = [...stages.matchAll(/id: "(STG-\d+)"/g)].map((match) => match[1]);
const configuredIds = [...resolver.matchAll(/"(STG-\d+)": \{ defaultTarget:/g)].map((match) => match[1]);
assert.deepEqual(configuredIds, stageIds,
  "Every canonical production stage must have exactly one shared default target");

for (const material of ["FLEECE", "FLANNEL", "PUL"]) {
  assert.match(resolver, new RegExp(`${material}: \\d+`), `Missing STG-01 ${material} target`);
}
for (const activity of ["PINNING", "FOLDING"]) {
  assert.match(resolver, new RegExp(`${activity}: \\d+`), `Missing STG-09 ${activity} target`);
}

console.log(`Production target sync check passed: ${stageIds.length} stages, 3 STG-01 materials in pieces/meters, and 2 STG-09 activities.`);
