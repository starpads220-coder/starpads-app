const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
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

const PACK_SIZES = {
  HALF_DOZEN: 6,
  DOZEN: 12,
  CARTON: 120,
  ONE_PACK: 1,
};

async function check() {
  const batches = ["P0002", "P0004"];
  for (const batchId of batches) {
    const batchSnap = await db.collection("batches").where("batchNumber", "==", batchId).get();
    if (batchSnap.empty) {
      console.log(`Batch ${batchId} not found`);
      continue;
    }
    const batchDoc = batchSnap.docs[0];
    const batchRefId = batchDoc.id;
    const batchData = batchDoc.data();
    
    let totalPads = 0;
    const stockIns = await db.collection("stockIns").where("batchRef", "==", batchRefId).get();
    stockIns.forEach(doc => {
      const d = doc.data();
      totalPads += (d.quantity || 0) * (PACK_SIZES[d.packSize] || 0);
    });
    
    console.log(`Batch ${batchId}:`);
    console.log(`- Stored db packsProduced: ${batchData.packsProduced}`);
    console.log(`- Stored db status: ${batchData.status}`);
    console.log(`- Calculated totalPads: ${totalPads}`);
    console.log(`- Calculated packsStored (pads/3): ${Math.floor(totalPads / 3)}`);
  }
}

check().catch(console.error);
