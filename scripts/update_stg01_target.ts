/** One-time live-data correction for the approved STG-01 target. */
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const fs = require("fs");
const path = require("path");

const keyPath = path.join(__dirname, "../starpads-automation-firebase-adminsdk-fbsvc-e002811af9.json");
if (!fs.existsSync(keyPath)) {
  console.error("No service account found");
  process.exit(1);
}

const app = initializeApp({ credential: cert(require(keyPath)) });
const db = getFirestore(app);

async function main() {
  const ref = db.collection("productionStages").doc("STG-01");
  const beforeSnapshot = await ref.get();
  const before = beforeSnapshot.exists ? beforeSnapshot.data() : null;

  await ref.set({
    stageId: "STG-01",
    name: "Cutting & Measuring",
    defaultTarget: 1000,
    defaultWageRate: 10000,
    unit: "pieces",
    materialTargets: {
      ...(before?.materialTargets ?? {}),
      FLEECE: 1000,
    },
    materialMeterTargets: {
      ...(before?.materialMeterTargets ?? {}),
      FLEECE: 50,
    },
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  const after = (await ref.get()).data();
  console.log(JSON.stringify({
    before: {
      defaultTarget: before?.defaultTarget,
      defaultWageRate: before?.defaultWageRate,
      fleecePieces: before?.materialTargets?.FLEECE,
      fleeceMeters: before?.materialMeterTargets?.FLEECE,
    },
    after: {
      defaultTarget: after?.defaultTarget,
      defaultWageRate: after?.defaultWageRate,
      fleecePieces: after?.materialTargets?.FLEECE,
      fleeceMeters: after?.materialMeterTargets?.FLEECE,
    },
  }, null, 2));
}

main().then(() => process.exit(0)).catch((error) => {
  console.error("STG-01 update failed:", error);
  process.exit(1);
});
