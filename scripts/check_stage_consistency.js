/* Fails CI when a stage consumer introduces a divergent stage list or legacy STG-06. */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const canonicalPath = path.join(root, "src/lib/production-stages.ts");
const canonicalText = fs.readFileSync(canonicalPath, "utf8");
const canonicalIds = [...canonicalText.matchAll(/id: "(STG-\d{2})"/g)].map(match => match[1]);
const expected = ["STG-01", "STG-02", "STG-03", "STG-04", "STG-05", "STG-07", "STG-08", "STG-09", "STG-10"];
const failures = [];

if (JSON.stringify(canonicalIds) !== JSON.stringify(expected)) failures.push(`Canonical order is ${canonicalIds.join(", ")}; expected ${expected.join(", ")}.`);
if (!canonicalText.includes('name: "Pouch making and cutting"')) failures.push("Canonical STG-05 name is incorrect.");

const requiredConsumers = [
  "src/types/index.ts",
  "src/app/admin/targets/page.tsx",
  "src/app/production/page.tsx",
  "src/components/reports/ProductionPDF.tsx",
  "src/components/reports/ProductionReportPDF.tsx",
];
for (const relative of requiredConsumers) {
  const text = fs.readFileSync(path.join(root, relative), "utf8");
  if (!text.includes("production-stages") && relative !== "src/app/admin/targets/page.tsx" && relative !== "src/app/production/page.tsx") failures.push(`${relative} does not consume the canonical stage module.`);
  if ([...text.matchAll(/(?:const|let|var)\s+STAGE_LABELS\s*[:=]/g)].length) failures.push(`${relative} declares a duplicate STAGE_LABELS list.`);
}

const scanRoots = ["src", "scripts"];
const allowedLegacyFiles = new Set([
  "src/lib/production-stages.ts",
  "src/lib/wip.ts",
  "src/types/index.ts",
  "scripts/migrate_stage_harmonization.js",
  "scripts/check_stage_consistency.js",
]);
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(?:ts|tsx|js)$/.test(entry.name)) {
      const relative = path.relative(root, full).replaceAll("\\", "/");
      if (!allowedLegacyFiles.has(relative) && fs.readFileSync(full, "utf8").includes("STG-06")) failures.push(`${relative} still references removed STG-06.`);
    }
  }
}
scanRoots.forEach(relative => walk(path.join(root, relative)));

if (failures.length) {
  console.error(`Stage consistency check failed:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log(`Stage consistency check passed: ${expected.join(" → ")}.`);
