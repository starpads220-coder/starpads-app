import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

if (!admin.apps.length) {
  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
    console.error("Missing Firebase Admin credentials in environment variables.");
    process.exit(1);
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

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
