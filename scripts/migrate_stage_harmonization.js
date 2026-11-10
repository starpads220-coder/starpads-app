/*
 * Harmonizes stored stages and rebuilds the v3 global WIP balance.
 * Dry run:  node scripts/migrate_stage_harmonization.js
 * Apply:    node scripts/migrate_stage_harmonization.js --apply
 * Rollback: node scripts/migrate_stage_harmonization.js --rollback <runId>
 */
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const root = path.resolve(__dirname, "..");
const keyPath = path.join(root, "starpads-automation-firebase-adminsdk-fbsvc-e002811af9.json");
const serviceAccount = fs.existsSync(keyPath)
  ? require(keyPath)
  : process.env.FIREBASE_SERVICE_ACCOUNT_B64
    ? JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_B64, "base64").toString("utf8"))
    : null;
if (!serviceAccount) throw new Error("Provide the service-account file or FIREBASE_SERVICE_ACCOUNT_B64.");
const db = getFirestore(initializeApp({ credential: cert(serviceAccount) }));

const canonical = [
  ["STG-01", "Cutting & Measuring"], ["STG-02", "Sewing inner (middle)"],
  ["STG-03", "Sewing outer (top layer)"], ["STG-04", "Overlocking"],
  ["STG-05", "Pouch making and cutting"], ["STG-07", "Checking"],
  ["STG-08", "Holling"], ["STG-09", "Pinning and Folding"], ["STG-10", "Packaging"],
];
const canonicalIds = new Set(canonical.map(([id]) => id));
const apply = process.argv.includes("--apply");
const rollbackIndex = process.argv.indexOf("--rollback");

async function rollback(runId) {
  if (!runId) throw new Error("Pass the backup runId after --rollback.");
  const records = await db.collection("stageHarmonizationBackups").doc(runId).collection("records").get();
  for (let start = 0; start < records.docs.length; start += 400) {
    const batch = db.batch();
    for (const record of records.docs.slice(start, start + 400)) {
      const data = record.data();
      const ref = db.collection(data.collection).doc(data.documentId);
      if (data.existed) batch.set(ref, data.original);
      else batch.delete(ref);
    }
    await batch.commit();
  }
  await db.collection("stageHarmonizationBackups").doc(runId).set({ rolledBackAt: FieldValue.serverTimestamp() }, { merge: true });
  console.log(`Rolled back ${records.size} records from ${runId}.`);
}

const blankWip = () => ({
  batchRef: "GLOBAL", wipVersion: 3, fleeceCut: 0, flannelCut: 0, pulCut: 0,
  innerStitched: 0, fullyStitched: 0, overlocked: 0, checked: 0, holed: 0,
  pinned: 0, folded: 0, pouchCut: 0, pouchMade: 0, finishedPacks: 0,
});
function move(wip, key, amount) { wip[key] += amount; }
function applyEntry(wip, entry) {
  const q = Number(entry.actualPieces) || 0;
  if (!(q > 0)) return;
  switch (entry.stageId) {
    case "STG-01": {
      const material = entry.materialType || entry.materialTypes?.[0];
      if (["FLEECE", "MICROFIBER"].includes(material)) move(wip, "fleeceCut", q);
      else if (material === "FLANNEL") move(wip, "flannelCut", q);
      else if (material === "PUL") move(wip, "pulCut", q);
      break;
    }
    case "STG-02": move(wip, "fleeceCut", -q); move(wip, "flannelCut", -q); move(wip, "innerStitched", q); break;
    case "STG-03": move(wip, "innerStitched", -q); move(wip, "pulCut", -q); move(wip, "fullyStitched", q); break;
    case "STG-04": move(wip, "fullyStitched", -q); move(wip, "overlocked", q); break;
    case "STG-05":
      if (entry.combinedStageComponent === "CUTTING") move(wip, "pouchCut", q);
      else if (entry.combinedStageComponent === "MAKING") { move(wip, "pouchCut", -q); move(wip, "pouchMade", q); }
      else move(wip, "pouchMade", q);
      break;
    case "STG-07": move(wip, "overlocked", -q); move(wip, "checked", q); break;
    case "STG-08": move(wip, "checked", -q); move(wip, "holed", q); break;
    case "STG-09":
      if (entry.productionActivity === "PINNING") { move(wip, "holed", -q); move(wip, "pinned", q); }
      else if (entry.productionActivity === "FOLDING") { move(wip, "pinned", -q); move(wip, "folded", q); }
      break;
    case "STG-10": move(wip, "folded", -(q * 3)); move(wip, "pouchMade", -q); move(wip, "finishedPacks", q); break;
  }
}

async function main() {
  if (rollbackIndex >= 0) return rollback(process.argv[rollbackIndex + 1]);
  const runId = `${new Date().toISOString().replace(/[:.]/g, "-")}-${crypto.randomBytes(3).toString("hex")}`;
  const collections = ["productionStages", "productionEntries", "targetConfigs", "productionTargetVersions", "wipBalances"];
  const snapshots = Object.fromEntries(await Promise.all(collections.map(async name => [name, await db.collection(name).get()])));
  const updates = [];
  const backupKeys = new Set();
  const queue = (collection, documentId, original, next) => {
    updates.push({ collection, documentId, original, next });
    backupKeys.add(`${collection}/${documentId}`);
  };

  const storedStages = new Map(snapshots.productionStages.docs.map(doc => [doc.id, doc.data()]));
  for (const [stageId, name] of canonical) queue("productionStages", stageId, storedStages.get(stageId), { ...(storedStages.get(stageId) || {}), stageId, name, updatedAt: FieldValue.serverTimestamp() });
  for (const doc of snapshots.productionStages.docs) if (!canonicalIds.has(doc.id)) queue("productionStages", doc.id, doc.data(), null);

  const migratedEntries = [];
  for (const doc of snapshots.productionEntries.docs) {
    const original = doc.data();
    let next = { ...original };
    if (original.stageId === "STG-06") next = { ...next, stageId: "STG-05", legacyStageId: "STG-06", combinedStageComponent: "MAKING" };
    else if (original.stageId === "STG-05" && original.wipVersion !== 3) next = { ...next, legacyStageId: "STG-05", combinedStageComponent: "CUTTING" };
    if (next.stageId !== "STG-10") next.batchRef = "";
    next.wipVersion = 3;
    if (JSON.stringify(next) !== JSON.stringify(original)) queue("productionEntries", doc.id, original, next);
    migratedEntries.push(next);
  }

  for (const collection of ["targetConfigs", "productionTargetVersions"]) {
    for (const doc of snapshots[collection].docs) {
      const original = doc.data();
      if (original.stageId === "STG-06") queue(collection, doc.id, original, { ...original, stageId: "STG-05", targetName: "Pouch making and cutting" });
      else if (original.stageId === "STG-05" && original.targetName !== "Pouch making and cutting") queue(collection, doc.id, original, { ...original, targetName: "Pouch making and cutting" });
    }
  }

  const globalWip = blankWip();
  migratedEntries.sort((a, b) => String(a.date).localeCompare(String(b.date))).forEach(entry => applyEntry(globalWip, entry));
  for (const doc of snapshots.wipBalances.docs) queue("wipBalances", doc.id, doc.data(), null);
  if (!backupKeys.has("wipBalances/GLOBAL")) queue("wipBalances", "GLOBAL", undefined, { ...globalWip, updatedAt: FieldValue.serverTimestamp() });
  else updates.find(item => item.collection === "wipBalances" && item.documentId === "GLOBAL").next = { ...globalWip, updatedAt: FieldValue.serverTimestamp() };

  const summary = { runId, dryRun: !apply, changes: updates.length, productionEntries: migratedEntries.length, globalWip };
  console.log(JSON.stringify(summary, null, 2));
  if (!apply) return console.log("Dry run only. Re-run with --apply after reviewing this output.");

  await db.collection("stageHarmonizationBackups").doc(runId).set({ createdAt: FieldValue.serverTimestamp(), status: "applying", summary });
  for (let start = 0; start < updates.length; start += 180) {
    const batch = db.batch();
    for (const item of updates.slice(start, start + 180)) {
      const backupRef = db.collection("stageHarmonizationBackups").doc(runId).collection("records").doc(`${item.collection}__${item.documentId}`);
      batch.set(backupRef, { collection: item.collection, documentId: item.documentId, existed: item.original !== undefined, original: item.original || null });
      const ref = db.collection(item.collection).doc(item.documentId);
      if (item.next === null) batch.delete(ref); else batch.set(ref, item.next);
    }
    await batch.commit();
  }
  await db.collection("stageHarmonizationBackups").doc(runId).set({ status: "complete", completedAt: FieldValue.serverTimestamp() }, { merge: true });
  console.log(`Applied migration ${runId}. Roll back with --rollback ${runId}`);
}

main().catch(error => { console.error(error); process.exit(1); });
