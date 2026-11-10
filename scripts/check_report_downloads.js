const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const route = fs.readFileSync(path.join(root, "src/app/api/reports/route.ts"), "utf8");
const downloader = fs.readFileSync(path.join(root, "src/lib/file-download.ts"), "utf8");
const screens = ["production", "storage", "sales", "expenses", "analytics", "payments", "worker", "nssf", "payee"];
const failures = [];

for (const screen of screens) {
  if (!route.includes(`case "${screen}"`)) failures.push(`Missing API report implementation for ${screen}.`);
}
for (const component of ["ProductionPDF", "StoragePDF", "SalesPDF", "ExpensesPDF", "AnalyticsPDF", "PaymentsPDF", "WorkerPDF", "NssfPDF", "PayeePDF"]) {
  if (!route.includes(component)) failures.push(`Missing PDF component ${component}.`);
}
if (!downloader.includes("response.ok")) failures.push("Shared downloader does not reject failed HTTP responses.");
if (!downloader.includes("blob.size === 0")) failures.push("Shared downloader does not reject empty files.");
if (!downloader.includes("60_000")) failures.push("Shared downloader may revoke mobile/PWA object URLs too early.");
if (!route.includes('"Cache-Control": "private, no-store, max-age=0"')) failures.push("Report API can return stale cached files.");

if (failures.length) {
  console.error(`Report download check failed:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log(`Report download coverage passed for: ${screens.join(", ")}.`);
