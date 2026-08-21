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

async function migrate() {
  console.log('Starting migration from STG-08 to STG-10...');
  
  try {
    const entriesRef = db.collection('productionEntries');
    const snapshot = await entriesRef.where('stageId', '==', 'STG-08').get();
    
    if (snapshot.empty) {
      console.log('No entries found with stageId STG-08.');
      process.exit(0);
    }
    
    console.log(`Found ${snapshot.size} entries. Updating...`);
    
    let batch = db.batch();
    let count = 0;
    
    for (const doc of snapshot.docs) {
      batch.update(doc.ref, { stageId: 'STG-10' });
      count++;
      
      // Firestore batches have a limit of 500 operations
      if (count % 500 === 0) {
        await batch.commit();
        console.log(`Committed ${count} updates...`);
        batch = db.batch();
      }
    }
    
    if (count % 500 !== 0) {
      await batch.commit();
    }
    
    console.log(`Successfully migrated ${count} entries from STG-08 to STG-10.`);
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

migrate();
