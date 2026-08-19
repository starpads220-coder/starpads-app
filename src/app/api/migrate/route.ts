import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export async function POST() {
  const db = getAdminDb();
  if (!db) {
    return NextResponse.json(
      { error: "Firebase Admin SDK is not configured" },
      { status: 500 }
    );
  }

  try {
    const entriesRef = db.collection('productionEntries');
    const snapshot = await entriesRef.where('stageId', '==', 'STG-08').get();
    
    if (snapshot.empty) {
      return NextResponse.json({ message: 'No entries found with stageId STG-08.' });
    }
    
    let batch = db.batch();
    let count = 0;
    
    for (const doc of snapshot.docs) {
      batch.update(doc.ref, { stageId: 'STG-10' });
      count++;
      
      if (count % 500 === 0) {
        await batch.commit();
        batch = db.batch();
      }
    }
    
    if (count % 500 !== 0) {
      await batch.commit();
    }
    
    return NextResponse.json({ message: `Successfully migrated ${count} entries from STG-08 to STG-10.` });
  } catch (error: any) {
    console.error('Migration failed:', error);
    return NextResponse.json({ error: 'Migration failed: ' + error.message }, { status: 500 });
  }
}
