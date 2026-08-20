import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  collection,
  doc,
  getDocs,
  updateDoc,
} from "firebase/firestore";

const PACK_SIZE_PADS: Record<string, number> = {
  HALF_DOZEN: 6,
  DOZEN: 12,
  CARTON: 120,
  ONE_PACK: 3,
};

const PADS_PER_PACK = 3;
const BATCH_MAX_PACKS = 10000;

function getPadValue(packSize: string, quantity: number): number {
  return (quantity || 0) * (PACK_SIZE_PADS[packSize] ?? 1);
}

export async function POST() {
  const db = getAdminDb();
  if (!db) {
    return NextResponse.json(
      { error: "Firebase Admin SDK is not configured" },
      { status: 500 }
    );
  }

  try {
    const log: Array<{ batchId: string; action: string; details: string }> = [];

    // ── Step 1: Ensure P0002 exists ────────────────────────────────────────
    const p0002Ref = db.collection("batches").doc("P0002");
    const p0002Snap = await p0002Ref.get();

    if (!p0002Snap.exists) {
      await p0002Ref.set({
        batchNumber: "P0002",
        startDate: "2024-01-01",
        completionDate: null,
        status: "ACTIVE",
        maxPacks: BATCH_MAX_PACKS,
        packsProduced: 0,
        createdAt: new Date().toISOString().split("T")[0],
      });
      log.push({
        batchId: "P0002",
        action: "created",
        details: "P0002 did not exist; created with ACTIVE status.",
      });
    }

    // ── Step 1.5: Deactivate any ACTIVE batches with earlier startDate than P0002 ────────
    const p0002StartDate = p0002Snap.exists ? p0002Snap.data()?.startDate ?? "2024-01-01" : "2024-01-01";
const existingBatches = await db.collection("batches").get();

    const deactivationPromises = [];

    for (const batchDoc of existingBatches.docs) {
      const batchData = batchDoc.data();
      if (batchData.status === "ACTIVE" && batchDoc.id !== "P0002") {
        const batchStartDate = batchData.startDate ?? "";
        if (batchStartDate < p0002StartDate) {
          deactivationPromises.push(
            updateDoc(doc(db as any, "batches", batchDoc.id), {
              status: "INACTIVE",
            })
          );
          log.push({
            batchId: batchDoc.id,
            action: "deactivated",
            details: `Deactivated ${batchDoc.data().batchNumber} (startDate: ${batchStartDate}) in favor of P0002.`,
          });
        }
      }
    }

    await Promise.all(deactivationPromises);
    // ─────────────────────────────────────────────────────────────────────
    const p0002StockInsSnap = await db
      .collection("stockIns")
      .where("batchRef", "==", "P0002")
      .get();

    let totalPadsP0002 = 0;
    p0002StockInsSnap.forEach((d) => {
      const data = d.data();
      totalPadsP0002 += getPadValue(data.packSize, data.quantity);
    });
    let packsInP0002 = Math.floor(totalPadsP0002 / PADS_PER_PACK);

    const p0002BatchDoc = await db.collection("batches").doc("P0002").get();
    if (p0002BatchDoc.exists) {
      packsInP0002 += (p0002BatchDoc.data()?.packsProduced ?? 0);
    }

    log.push({
      batchId: "P0002",
      action: "current-count",
      details: `P0002 currently has ${packsInP0002} / ${BATCH_MAX_PACKS} packs.`,
    });

    // ── Step 3: If P0002 is under capacity, migrate P0004 stock-ins ────────
    if (packsInP0002 < BATCH_MAX_PACKS) {
      const p0004StockInsSnap = await db
        .collection("stockIns")
        .where("batchRef", "==", "P0004")
        .get();

      // migrate oldest entries first by sorting in memory to avoid missing index error
      const p0004Docs = p0004StockInsSnap.docs.sort((a, b) => {
        const dateA = a.data().date || "";
        const dateB = b.data().date || "";
        return dateA.localeCompare(dateB);
      });
      log.push({
        batchId: "P0004",
        action: "migration-start",
        details: `Found ${p0004Docs.length} stock-in entries in P0004 to evaluate.`,
      });

      const migrationBatch = db.batch();
      let migratedCount = 0;
      let migratedPacks = 0;

      for (const stockInDoc of p0004Docs) {
        if (packsInP0002 >= BATCH_MAX_PACKS) break;

        const data = stockInDoc.data();
        const entryPads = getPadValue(data.packSize, data.quantity);
        const entryPacks = Math.floor(entryPads / PADS_PER_PACK);
        const remainingCapacity = BATCH_MAX_PACKS - packsInP0002;

        if (entryPacks <= remainingCapacity) {
          // Whole entry fits into P0002 — reassign it
          migrationBatch.update(stockInDoc.ref, { batchRef: "P0002" });
          packsInP0002 += entryPacks;
          migratedPacks += entryPacks;
          migratedCount++;
        } else {
          // Entry would overflow — split: keep the overflow portion in P0004
          // Migrate only what fits (as a new stockIn doc for P0002)
          const packsToMigrate = remainingCapacity;
          const padsToMigrate = packsToMigrate * PADS_PER_PACK;
          const overflowPads = entryPads - padsToMigrate;

          // Derive quantity in the same pack size units for the migrated portion
          const padSizeVal = PACK_SIZE_PADS[data.packSize] ?? 1;
          const migrateQty = Math.floor(padsToMigrate / padSizeVal);
          const overflowQty = data.quantity - migrateQty;

          if (migrateQty > 0) {
            const newP0002Doc = db.collection("stockIns").doc();
            migrationBatch.set(newP0002Doc, {
              ...data,
              batchRef: "P0002",
              quantity: migrateQty,
              notes: `[Migrated from P0004 on reconciliation] ${data.notes ?? ""}`.trim(),
            });
          }

          if (overflowQty > 0) {
            // Update original P0004 doc to reflect reduced quantity
            migrationBatch.update(stockInDoc.ref, { quantity: overflowQty });
          } else {
            // Nothing left in P0004 for this doc
            migrationBatch.update(stockInDoc.ref, { quantity: 0 });
          }

          packsInP0002 += packsToMigrate;
          migratedPacks += packsToMigrate;
          migratedCount++;

          log.push({
            batchId: "P0004",
            action: "entry-split",
            details: `Entry ${stockInDoc.id} split: ${migrateQty} units → P0002, ${overflowQty} units remain in P0004.`,
          });
          break; // P0002 is now at capacity
        }
      }

      await migrationBatch.commit();

      log.push({
        batchId: "migration",
        action: "migration-complete",
        details: `Migrated ${migratedCount} entries (${migratedPacks.toLocaleString()} packs) from P0004 → P0002. P0002 now at ${packsInP0002} / ${BATCH_MAX_PACKS} packs.`,
      });
    } else {
      log.push({
        batchId: "P0002",
        action: "migration-skipped",
        details: `P0002 already at or above capacity (${packsInP0002} packs). No migration needed.`,
      });
    }

    // ── Step 4: Recalculate and update ALL batch statuses ──────────────────
    const batchesSnap = await db.collection("batches").get();
    const updatePromises: Promise<FirebaseFirestore.WriteResult>[] = [];

    for (const batchDoc of batchesSnap.docs) {
      const batchId = batchDoc.id;
      const batchData = batchDoc.data();
      const batchMaxPacks = batchData.maxPacks ?? BATCH_MAX_PACKS;

      // SUM STOCK-INS QUANTITY COLUMN INSTEAD OF PRODUCTION ENTRIES
      const stockInSnap = await db
        .collection("stockIns")
        .where("batchRef", "==", batchId)
        .get();

      let packsStored = 0;
      stockInSnap.forEach((d) => {
        packsStored += (d.data().quantity as number) || 0;
      });

      const updates: Record<string, unknown> = {};

      if (packsStored !== batchData.packsProduced) {
        updates.packsProduced = packsStored;
      }

      if (packsStored >= batchMaxPacks && batchData.status !== "COMPLETE") {
        updates.status = "COMPLETE";
        updates.completionDate = new Date().toISOString().split("T")[0];
        log.push({
          batchId,
          action: "status-completed",
          details: `${batchId} has ${packsStored}/${batchMaxPacks} packs — marked COMPLETE.`,
        });
      } else if (packsStored < batchMaxPacks && batchData.status === "COMPLETE") {
        // Was wrongly marked COMPLETE — reactivate
        updates.status = "ACTIVE";
        updates.completionDate = null;
        log.push({
          batchId,
          action: "status-reactivated",
          details: `${batchId} was COMPLETE but only has ${packsStored}/${batchMaxPacks} packs — reactivated to ACTIVE.`,
        });
      }

      if (Object.keys(updates).length > 0) {
        updatePromises.push(batchDoc.ref.update(updates));
        log.push({
          batchId,
          action: "batch-updated",
          details: `Updated: ${JSON.stringify(updates)}`,
        });
      }
    }

    await Promise.all(updatePromises);

    // ── Step 5: Final P0002 read for response ──────────────────────────────
    const p0002Final = await p0002Ref.get();
    const p0002FinalData = p0002Final.data() ?? {};

    log.push({
      batchId: "system",
      action: "reconciliation-run",
      details: `Completed at ${new Date().toISOString()}. P0002: ${p0002FinalData.packsProduced ?? packsInP0002}/${BATCH_MAX_PACKS} packs. Total log entries: ${log.length}.`,
    });

    return NextResponse.json({
      success: true,
      message: "Batch reconciliation completed successfully",
      data: {
        p0002: {
          packsProduced: p0002FinalData.packsProduced ?? packsInP0002,
          status: p0002FinalData.status ?? "ACTIVE",
          packsRemaining: BATCH_MAX_PACKS - (p0002FinalData.packsProduced ?? packsInP0002),
        },
        log,
      },
    });
  } catch (err) {
    console.error("Batch reconciliation failed:", err);
    return NextResponse.json(
      { error: "Reconciliation failed: " + (err as Error).message },
      { status: 500 }
    );
  }
}