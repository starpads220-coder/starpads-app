import { getAdminDb } from "@/lib/firebase-admin";
import { NextResponse } from "next/server";

export async function POST() {
  const db = getAdminDb();
  if (!db) return NextResponse.json({ error: "No DB" }, { status: 500 });

  const log: string[] = [];

  try {
    // ── Step 1: Find orphaned stockIn entries pointing to the deleted duplicate P0002 doc ──
    // The reconcile route created entries with batchRef: "P0002" (the now-deleted duplicate)
    // The real P0002 has Firestore ID: FEurhvUWFKmnd56QaHZJ
    const orphanedSnap = await db.collection("stockIns")
      .where("batchRef", "==", "P0002")
      .get();

    if (!orphanedSnap.empty) {
      const delBatch = db.batch();
      orphanedSnap.forEach(d => delBatch.delete(d.ref));
      await delBatch.commit();
      log.push(`🗑️  Deleted ${orphanedSnap.size} orphaned stockIn entries pointing to deleted duplicate P0002.`);
    } else {
      log.push("ℹ️  No orphaned stockIn entries found.");
    }

    // ── Step 2: For every real batch, set packsProduced = sum of stockIn.quantity ──
    const batchesSnap = await db.collection("batches").get();

    for (const batchDoc of batchesSnap.docs) {
      const batchData = batchDoc.data();
      const batchId = batchDoc.id;
      const maxPacks = batchData.maxPacks ?? 10000;

      // Sum raw quantity column from all stock-in entries for this batch
      const stockInsSnap = await db.collection("stockIns")
        .where("batchRef", "==", batchId)
        .get();

      let totalQty = 0;
      stockInsSnap.forEach(d => {
        totalQty += (d.data().quantity as number) || 0;
      });

      const updates: Record<string, unknown> = { packsProduced: totalQty };

      if (totalQty >= maxPacks && batchData.status !== "COMPLETE") {
        updates.status = "COMPLETE";
        updates.completionDate = new Date().toISOString().split("T")[0];
        log.push(`✅ ${batchData.batchNumber}: ${totalQty}/${maxPacks} → marked COMPLETE`);
      } else if (totalQty < maxPacks && batchData.status === "COMPLETE") {
        updates.status = "ACTIVE";
        updates.completionDate = null;
        log.push(`↩️  ${batchData.batchNumber}: ${totalQty}/${maxPacks} → reactivated to ACTIVE`);
      }

      await batchDoc.ref.update(updates);
      log.push(`✅ ${batchData.batchNumber} (${batchId}): packsProduced set to ${totalQty}`);
    }

    return NextResponse.json({ success: true, log });
  } catch (err: any) {
    console.error("Cleanup failed:", err);
    return NextResponse.json({ error: err.message, log }, { status: 500 });
  }
}
