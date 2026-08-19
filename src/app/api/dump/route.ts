import { getAdminDb } from "@/lib/firebase-admin";
import { NextResponse } from "next/server";

export async function GET() {
  const db = getAdminDb();
  if (!db) return NextResponse.json({ error: "No DB" }, { status: 500 });

  try {
    const batchesSnap = await db.collection("batches").get();
    const batches = batchesSnap.docs.map(d => ({ id: d.id, ...d.data() as Record<string, unknown> }));

    // Raw stock-in quantity sums per batch (what the user enters on the stock-in screen)
    const stockInsSnap = await db.collection("stockIns").get();
    const stockInRawQtyByBatch: Record<string, number> = {};
    const stockInDetailsByBatch: Record<string, {quantity: number, packSize: string, date: string}[]> = {};
    stockInsSnap.forEach(d => {
      const data = d.data();
      const ref = (data.batchRef as string) || 'unknown';
      const qty = (data.quantity as number) || 0;
      stockInRawQtyByBatch[ref] = (stockInRawQtyByBatch[ref] || 0) + qty;
      if (!stockInDetailsByBatch[ref]) stockInDetailsByBatch[ref] = [];
      stockInDetailsByBatch[ref].push({ quantity: qty, packSize: data.packSize as string, date: data.date as string });
    });

    // STG-10 production packs per batch
    const stg10Snap = await db.collection("productionEntries").where("stageId", "==", "STG-10").get();
    const stg10ByBatch: Record<string, number> = {};
    stg10Snap.forEach(d => {
      const data = d.data();
      const ref = (data.batchRef as string) || 'unknown';
      stg10ByBatch[ref] = (stg10ByBatch[ref] || 0) + ((data.actualPieces as number) || 0);
    });

    // Side-by-side comparison
    const comparison = batches.map(b => ({
      batchNumber: b.batchNumber,
      firestoreId: b.id,
      status: b.status,
      currentPacksProduced: b.packsProduced,
      stockInRawQuantityTotal: stockInRawQtyByBatch[b.id as string] ?? 0,
      stg10ProductionTotal: stg10ByBatch[b.id as string] ?? 0,
      stockInEntries: stockInDetailsByBatch[b.id as string] ?? [],
    }));

    return NextResponse.json({ comparison });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
