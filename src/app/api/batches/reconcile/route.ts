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
    const log: Array<{ batchId: string; action: string; details: string }> = [];

    // Step 1: Find/ensure batch P0002 exists
    const p0002Ref = db.collection("batches").doc("P0002");
    const p0002Snap = await p0002Ref.get();

    if (!p0002Snap.exists) {
      await p0002Ref.set({
        batchNumber: "P0002",
        startDate: new Date().toISOString().split("T")[0],
        completionDate: null,
        status: "ACTIVE",
        maxPacks: 10000,
        packsProduced: 0,
        createdAt: new Date().toISOString().split("T")[0],
      });
      log.push({
        batchId: "P0002",
        action: "created",
        details: "P0002 batch did not exist, created with ACTIVE status",
      });
    }

    // Step 2: Recalculate P0002's packsProduced from its stock-ins
    let totalPadsP0002 = 0;
    const p0002StockIns = db.collection("stockIns").where("batchRef", "==", "P0002");
    const p0002StockInsSnap = await p0002StockIns.get();

p0002StockInsSnap.forEach((d) => {
      const data = d.data();
      const packSizeStr = data.packSize || "";
      const packSizeVal = (packSizeStr === "HALF_DOZEN" ? 6 : packSizeStr === "DOZEN" ? 12 : packSizeStr === "CARTON" ? 120 : packSizeStr === "ONE_PACK" ? 3 : 1);
      totalPadsP0002 += (data.quantity || 0) * packSizeVal;
    });

    const packsProducedP0002 = Math.floor(totalPadsP0002 / 3);

    // Step 3: Update P0002 if packsProduced changed or status is wrong
    const updates: Record<string, unknown> = {};

    const currentPacks = p0002Snap.exists ? p0002Snap.data().packsProduced ?? 0 : 0;
    const currentStatus = p0002Snap.exists ? p0002Snap.data().status ?? "ACTIVE" : "ACTIVE";

    if (packsProducedP0002 !== currentPacks) {
      updates.packsProduced = packsProducedP0002;
      log.push({
        batchId: "P0002",
        action: "packsProduced-updated",
        details: "Updated from " + currentPacks + " to " + packsProducedP0002 + " packs",
      });
    }

    // If P0002 is marked COMPLETE but doesn't have 10000 packs, change to ACTIVE
    if (currentStatus === "COMPLETE" && packsProducedP0002 < 10000) {
      updates.status = "ACTIVE";
      updates.completionDate = null;
      log.push({
        batchId: "P0002",
        action: "status-reactivated",
        details: "Batch was COMPLETE but has only " + packsProducedP0002 + "/10000 packs, reactivated to ACTIVE",
      });
    } else if (currentStatus === "ACTIVE" && packsProducedP0002 >= 10000) {
      // If somehow ACTIVE but has 10000+, mark COMPLETE
      updates.status = "COMPLETE";
      updates.completionDate = new Date().toISOString().split("T")[0];
      log.push({
        batchId: "P0002",
        action: "status-completed",
        details: "Batch has " + packsProducedP0002 + "/10000 packs, marked COMPLETE",
      });
    }

    if (Object.keys(updates).length > 0) {
      await p0002Ref.update(updates);
      log.push({
        batchId: "P0002",
        action: "batch-updated",
        details: "P0002 updated: packsProduced=" + packsProducedP0002 + ", status=" + (updates.status || currentStatus),
      });
    }

    // Step 4: Recalculate all other batches based on their stock-ins
    const batchesRef = db.collection("batches");
    const batchesSnap = await batchesRef.get();

    const batchUpdatePromises: Promise<any>[] = [];

batchesSnap.forEach((batchDoc) => {
      const batchId = batchDoc.id;
      if (batchId === "P0002") return;

      const batchData = batchDoc.data();
      const batchMaxPacks = batchData.maxPacks ?? 10000;

      // Count pads in stockIns for this batch
      let totalPads = 0;
      const batchStockIns = db.collection("stockIns").where("batchRef", "==", batchId);
      const batchStockInsSnap = await batchStockIns.get();

      batchStockInsSnap.forEach((d) => {
        const data = d.data();
        const packSizeVal = (data.packSize === "HALF_DOZEN" ? 6 : data.packSize === "DOZEN" ? 12 : data.packSize === "CARTON" ? 120 : data.packSize === "ONE_PACK" ? 3 : 1);
        totalPads += (data.quantity || 0) * packSizeVal;
      });

      const packsStored = Math.floor(totalPads / 3);

      const batchUpdates: Record<string, unknown> = {};

      if (packsStored >= 10000) {
        batchUpdates.status = "COMPLETE";
        batchUpdates.completionDate = new Date().toISOString().split("T")[0];
      } else if (batchData.status !== "ACTIVE") {
        batchUpdates.status = "ACTIVE";
      }

      if (packsStored !== batchData.packsProduced) {
        batchUpdates.packsProduced = packsStored;
      }

      if (Object.keys(batchUpdates).length > 0) {
        var p = batchDoc.ref.update(batchUpdates);
        batchUpdatePromises.push(p);
        var actionName = packsStored >= 10000 ? "marked-complete" : "status-reactivated";
        var detailStr = packsStored + "/10000 packs, " + actionName;
        log.push({
          batchId: batchId,
          action: actionName,
          details: detailStr,
        });
      }
    });

      const packsStored = Math.floor(totalPads / 3);

      const batchUpdates: Record<string, unknown> = {};

      if (packsStored >= 10000) {
        batchUpdates.status = "COMPLETE";
        batchUpdates.completionDate = new Date().toISOString().split("T")[0];
      } else if (batchData.status !== "ACTIVE") {
        batchUpdates.status = "ACTIVE";
      }

      if (packsStored !== batchData.packsProduced) {
        batchUpdates.packsProduced = packsStored;
      }

      if (Object.keys(batchUpdates).length > 0) {
        batchUpdatePromises.push(batchDoc.ref.update(batchUpdates));
        var actionName = packsStored >= 10000 ? "marked-complete" : "status-reactivated";
        var detailStr = packsStored + "/10000 packs, " + actionName;
        log.push({
          batchId: batchId,
          action: actionName,
          details: detailStr,
        });
      }
    });

    await Promise.all(batchUpdatePromises);

    // Step 5: Log reconciliation run
    var runDetails = "Reconciliation completed at " + new Date().toISOString() + ". P0002: " + (packsProducedP0002 ?? 0) + "/10000 packs. Total batch updates: " + log.length;
    log.push({
      batchId: "system",
      action: "reconciliation-run",
      details: runDetails,
    });

    return NextResponse.json({
      success: true,
      message: "Batch reconciliation completed successfully",
      data: {
        p0002: {
          packsProduced: packsProducedP0002 ?? 0,
          status: p0002Snap.exists ? p0002Snap.data().status ?? "ACTIVE" : "ACTIVE",
          packsRemaining: 10000 - (packsProducedP0002 ?? 0),
        },
        log: log,
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