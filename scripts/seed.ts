// Run this script once to seed initial data:
// npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/seed.ts

const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const fs = require("fs");
const path = require("path");

let serviceAccount;
const keyPath = path.join(__dirname, "../starpads-automation-firebase-adminsdk-fbsvc-e002811af9.json");
if (fs.existsSync(keyPath)) {
  serviceAccount = require(keyPath);
} else if (process.env.FIREBASE_SERVICE_ACCOUNT_B64) {
  serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_B64, 'base64').toString('ascii'));
} else {
  console.error("Please provide a service account JSON file or FIREBASE_SERVICE_ACCOUNT_B64 env var.");
  process.exit(1);
}

const app = initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore(app);

const STAGES = [
  { stageId: "STG-01", name: "Cutting", defaultTarget: 700, unit: "pieces", defaultWageRate: 10000, materialTargets: { FLEECE: 700, FLANNEL: 350, PUL: 350 } },
  { stageId: "STG-02", name: "Sewing Inner [Middle]", defaultTarget: 350, unit: "pieces", defaultWageRate: 10000 },
  { stageId: "STG-03", name: "Sewing Outer [TopLayer]", defaultTarget: 350, unit: "pieces", defaultWageRate: 10000 },
  { stageId: "STG-04", name: "Overlocking", defaultTarget: 350, unit: "pieces", defaultWageRate: 10000 },
  { stageId: "STG-05", name: "Pouch Making", defaultTarget: 200, unit: "pieces", defaultWageRate: 10000 },
  { stageId: "STG-06", name: "Checking & Pinning", defaultTarget: 400, unit: "pieces", defaultWageRate: 8000 },
  { stageId: "STG-07", name: "Pinning and Folding", defaultTarget: 360, unit: "pieces", defaultWageRate: 10000 },
  { stageId: "STG-08", name: "Packing", defaultTarget: 360, unit: "packs", defaultWageRate: 10000 },
];

async function seed() {
  console.log("Seeding production stages...");
  for (const stage of STAGES) {
    await db.collection("productionStages").doc(stage.stageId).set(stage);
    console.log(`  ✓ ${stage.stageId} — ${stage.name}`);
  }

  // Create batch counter
  await db.collection("counters").doc("batchCounter").set({ currentSeq: 0 });
  console.log("  ✓ Batch counter initialized");

  console.log("\nSeed complete! You can now:");
  console.log("  1. Add employees via /admin/employees");
  console.log("  2. Configure targets via /admin/targets");
  console.log("  3. Create a batch via /production/batches");
  console.log("  4. Start logging production entries");
}

seed().catch(console.error);
