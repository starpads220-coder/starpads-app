/* Reconcile duplicate employee records ("Makaye Zulfa").
 *
 * Every work/payment reference (productionEntries, payments, targets,
 * stockIns.receivedBy, userRoles, saleTransactions.salespersonId) is
 * repointed from each duplicate to the single primary record. Only after
 * verification that zero references remain are the duplicate employee
 * documents removed — so no work or payment history is ever touched or lost.
 *
 * Dry-run (no writes):   npx tsx scripts/reconcile_makaye_zulfa.ts
 * Apply changes:         npx tsx scripts/reconcile_makaye_zulfa.ts --apply
 */
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const fs = require("fs");
const path = require("path");

const APPLY = process.argv.includes("--apply");
const TARGET_NAME = "makaye zulfa";

// Collections/fields that hold an employee id reference.
const REFS = [
  ["productionEntries", "employeeId"],
  ["payments", "employeeId"],
  ["targets", "employeeId"],
  ["stockIns", "receivedBy"],
  ["userRoles", "employeeId"],
  ["saleTransactions", "salespersonId"],
];

let serviceAccount;
const keyPath = path.join(__dirname, "../starpads-automation-firebase-adminsdk-fbsvc-e002811af9.json");
if (fs.existsSync(keyPath)) {
  serviceAccount = require(keyPath);
} else {
  console.error("No service account found");
  process.exit(1);
}

const app = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app);

const norm = (s) => (s || "").trim().toLowerCase().replace(/\s+/g, " ");

async function countRefs(col, field, id) {
  const snap = await db.collection(col).where(field, "==", id).get();
  return snap.size;
}

async function repoint(col, field, fromId, toId) {
  const snap = await db.collection(col).where(field, "==", fromId).get();
  if (snap.empty) return 0;
  let batch = db.batch();
  let count = 0;
  for (const d of snap.docs) {
    batch.update(d.ref, { [field]: toId });
    count++;
    if (count % 500 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }
  if (count % 500 !== 0) await batch.commit();
  return count;
}

async function main() {
  console.log('Scanning employees collection for "Makaye Zulfa"...');
  const empSnap = await db.collection("employees").get();
  const matches = empSnap.docs.filter((d) => norm(d.data().name) === TARGET_NAME);
  console.log(`Found ${matches.length} matching employee record(s).`);

  if (matches.length < 2) {
    console.log("No duplicates to reconcile.");
    process.exit(0);
  }

  const stats = new Map();
  for (const doc of matches) {
    let total = 0;
    const detail = {};
    for (const [col, field] of REFS) {
      const n = await countRefs(col, field, doc.id);
      detail[`${col}.${field}`] = n;
      total += n;
    }
    stats.set(doc.id, { total, detail });
    console.log(`\nRecord ${doc.id}: "${doc.data().name}"`);
    console.log(`  createdAt: ${doc.data().createdAt?.toDate?.().toISOString() ?? "unknown"}`);
    console.log(`  references (${total}):`, detail);
  }

  // Primary = most referenced; tie-break = earliest created.
  const sorted = [...matches].sort((a, b) => {
    const sa = stats.get(a.id).total;
    const sb = stats.get(b.id).total;
    if (sb !== sa) return sb - sa;
    const ca = a.data().createdAt?.toMillis?.() ?? Number.MAX_SAFE_INTEGER;
    const cb = b.data().createdAt?.toMillis?.() ?? Number.MAX_SAFE_INTEGER;
    return ca - cb;
  });
  const primary = sorted[0];
  const dups = sorted.slice(1);
  console.log(`\nPrimary record: ${primary.id} ("${primary.data().name}") — keeps all history.`);
  console.log(`Duplicates to retire: ${dups.map((d) => d.id).join(", ")}`);

  if (!APPLY) {
    console.log("\nDRY RUN — nothing written. Re-run with --apply to execute.");
    process.exit(0);
  }

  for (const dup of dups) {
    console.log(`\nRepointing references ${dup.id} -> ${primary.id} ...`);
    for (const [col, field] of REFS) {
      const moved = await repoint(col, field, dup.id, primary.id);
      if (moved > 0) console.log(`  ${col}.${field}: ${moved} document(s) updated`);
    }

    let remaining = 0;
    for (const [col, field] of REFS) remaining += await countRefs(col, field, dup.id);
    if (remaining > 0) {
      console.error(`  ✗ ${dup.id} still has ${remaining} reference(s) — NOT deleting. Investigate manually.`);
      continue;
    }
    await dup.ref.delete();
    console.log(`  ✓ Duplicate ${dup.id} removed. All its history now lives under ${primary.id}.`);
  }

  console.log("\nReconciliation complete.");
  process.exit(0);
}

main().catch((e) => {
  console.error("Reconciliation failed:", e);
  process.exit(1);
});
