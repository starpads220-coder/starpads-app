"use client";

import { useState } from "react";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  runTransaction,
  Timestamp,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Batch } from "@/types";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useCollectionQuery } from "@/hooks/use-firestore-query";
import { showToast } from "@/components/ui/Toast";

export default function BatchesPage() {
  const [creating, setCreating] = useState(false);
  const [closeTarget, setCloseTarget] = useState<string | null>(null);

  const { data: batches = [], isLoading } = useCollectionQuery<Batch>("batches", [
    orderBy("startDate", "desc"),
  ], { staleTime: 2 * 60 * 1000 });

  const generateBatchNumber = async (): Promise<string> => {
    const counterRef = doc(db, "counters", "batchCounter");

    // One-time init: scan existing batches to seed the counter
    const counterSnap = await getDoc(counterRef);
    if (!counterSnap.exists()) {
      const batchSnap = await getDocs(collection(db, "batches"));
      let maxSeq = 0;
      batchSnap.docs.forEach((d) => {
        const num = d.data().batchNumber as string | undefined;
        if (num) {
          const parsed = parseInt(num.replace("P", ""), 10);
          if (!isNaN(parsed) && parsed > maxSeq) maxSeq = parsed;
        }
      });
      await setDoc(counterRef, { currentSeq: maxSeq });
    }

    // Atomically increment the counter (no race conditions)
    const nextSeq = await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(counterRef);
      const current: number = snap.data()?.currentSeq ?? 0;
      const next = current + 1;
      transaction.update(counterRef, { currentSeq: next });
      return next;
    });

    return `P${String(nextSeq).padStart(4, "0")}`;
  };

  const handleCreateBatch = async () => {
    setCreating(true);
    try {
      const batchNumber = await generateBatchNumber();
      const todayStr = new Date().toISOString().split("T")[0];
      const batchData = {
        batchNumber,
        startDate: todayStr,
        completionDate: null,
        status: "ACTIVE",
        maxPacks: 10000,
        packsProduced: 0,
        createdAt: Timestamp.now(),
      };
      await addDoc(collection(db, "batches"), batchData);
      showToast(`Batch ${batchNumber} created successfully`, "success");
    } catch (err) {
      console.error("Failed to create batch:", err);
      showToast("Failed to create batch. Please try again.", "error");
    } finally {
      setCreating(false);
    }
  };

  const handleCloseBatch = async () => {
    if (!closeTarget) return;
    try {
      await updateDoc(doc(db, "batches", closeTarget), {
        status: "COMPLETE",
        completionDate: new Date().toISOString().split("T")[0],
      });
    } finally {
      setCloseTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Batch Management</h1>
        <button
          onClick={handleCreateBatch}
          disabled={creating}
          className="py-2 px-4 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 disabled:opacity-50"
        >
          {creating ? "Creating..." : "New Batch"}
        </button>
      </div>

      {isLoading ? (
        <div className="text-center text-gray-400 py-8">Loading...</div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Batch Number
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Start Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Completion Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Progress
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {batches.map((batch, i) => (
                <tr
                  key={batch.id}
                  className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}
                >
                  <td className="px-4 py-3 text-sm font-mono font-medium text-gray-900">
                    {batch.batchNumber}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {new Date(batch.startDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {batch.completionDate
                      ? new Date(batch.completionDate).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 w-24">
                        <div
                          className="bg-stock-blue h-2 rounded-full"
                          style={{
                            width: `${Math.min(100, Math.round((batch.packsProduced / batch.maxPacks) * 100))}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {batch.packsProduced.toLocaleString()} / {batch.maxPacks.toLocaleString()}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        batch.status === "ACTIVE"
                          ? "bg-stock-blue/10 text-stock-blue"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {batch.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {batch.status === "ACTIVE" && (
                      <button
                        onClick={() => setCloseTarget(batch.id)}
                        className="text-sm text-performance-red hover:underline"
                      >
                        Close Batch
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={closeTarget !== null}
        title="Close Batch"
        message="Mark this batch as complete? This action confirms all 10,000 packs have been produced and stored."
        confirmLabel="Close Batch"
        onConfirm={handleCloseBatch}
        onCancel={() => setCloseTarget(null)}
        variant="warning"
      />
    </div>
  );
}
