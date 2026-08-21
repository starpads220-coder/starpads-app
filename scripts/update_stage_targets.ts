/* Update productionStages with the approved daily targets & wages:
 *   STG-08 (Holling)              — target 360, wage 8,000, pieces
 *   STG-09 (Pinning and Folding)  — target 360, wage 8,000, pieces
 *   STG-10 (Packaging)            — target 120, wage 12,000, packs
 *
 * Uses set-with-merge so all other fields on the stage docs are preserved.
 *
 * Run:  npx tsx scripts/update_stage_targets.ts
 */
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const fs = require("fs");
const path = require("path");

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

const UPDATES = [
  { stageId: "STG-08", name: "Holling", defaultTarget: 360, defaultWageRate: 8000, unit: "pieces" },
  { stageId: "STG-09", name: "Pinning and Folding", defaultTarget: 360, defaultWageRate: 8000, unit: "pieces" },
  { stageId: "STG-10", name: "Packaging", defaultTarget: 120, defaultWageRate: 12000, unit: "packs" },
];

async function main() {
  for (const u of UPDATES) {
    const ref = db.collection("productionStages").doc(u.stageId);
    const snap = await ref.get();
    const before = snap.exists ? snap.data() : null;
    console.log(`\n${u.stageId} (${u.name})`);
    console.log(`  before: ${before ? `target ${before.defaultTarget}, wage ${before.defaultWageRate}, unit "${before.unit}"` : "NOT CONFIGURED"}`);
    await ref.set(
      {
        ...u,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    console.log(`  after:  target ${u.defaultTarget.toLocaleString()}, wage ${u.defaultWageRate.toLocaleString()}, unit "${u.unit}"`);
  }
  console.log("\nStage targets updated successfully.");
  process.exit(0);
}

main().catch((e) => {
  console.error("Update failed:", e);
  process.exit(1);
});
