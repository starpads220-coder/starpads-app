import {
  collection,
  doc,
  getDocs,
  query,
  runTransaction,
  Timestamp,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Batch } from "@/types";

export const BATCH_CAPACITY_PACKS = 10_000;

const today = () => new Date().toISOString().split("T")[0];

/** STG-10 is the sole source of truth for finished packs assigned to a batch. */
export async function synchronizeBatchFromStg10(batchId: string): Promise<void> {
  const [entriesSnap, batchesSnap] = await Promise.all([
    getDocs(query(collection(db, "productionEntries"), where("batchRef", "==", batchId), where("stageId", "==", "STG-10"))),
    getDocs(collection(db, "batches")),
  ]);
  const packsProduced = entriesSnap.docs.reduce(
    (sum, entry) => sum + (Number(entry.data().actualPieces) || 0),
    0,
  );
  const batches = batchesSnap.docs.map((snapshot) => ({ id: snapshot.id, ...snapshot.data() }) as Batch);
  const target = batches.find((batch) => batch.id === batchId);
  if (!target) throw new Error("The selected production batch no longer exists.");

  await runTransaction(db, async (transaction) => {
    const targetRef = doc(db, "batches", batchId);
    const counterRef = doc(db, "counters", "batchCounter");
    const [freshTargetSnap, counterSnap] = await Promise.all([
      transaction.get(targetRef),
      transaction.get(counterRef),
    ]);
    const freshTarget = freshTargetSnap.data() as Batch | undefined;
    if (!freshTarget) throw new Error("The selected production batch no longer exists.");
    if (packsProduced < (freshTarget.maxPacks || BATCH_CAPACITY_PACKS) || freshTarget.status === "COMPLETE") {
      transaction.update(targetRef, { packsProduced });
      return;
    }

    transaction.update(targetRef, {
      packsProduced,
      status: "COMPLETE",
      completionDate: today(),
    });

    // Repair any legacy multiple-active state while rolling over.
    batches
      .filter((batch) => batch.id !== batchId && batch.status === "ACTIVE")
      .forEach((batch) => transaction.update(doc(db, "batches", batch.id), { status: "INACTIVE" }));

    const highestExisting = batches.reduce((highest, batch) => {
      const sequence = Number.parseInt(batch.batchNumber.replace(/^P/, ""), 10);
      return Number.isFinite(sequence) ? Math.max(highest, sequence) : highest;
    }, 0);
    const nextSequence = Math.max(counterSnap.data()?.currentSeq ?? 0, highestExisting) + 1;
    transaction.set(counterRef, { currentSeq: nextSequence }, { merge: true });
    transaction.set(doc(collection(db, "batches")), {
      batchNumber: `P${String(nextSequence).padStart(4, "0")}`,
      startDate: today(),
      completionDate: null,
      status: "ACTIVE",
      maxPacks: BATCH_CAPACITY_PACKS,
      packsProduced: 0,
      createdAt: Timestamp.now(),
      openedAutomaticallyFrom: batchId,
    });
  });
}
