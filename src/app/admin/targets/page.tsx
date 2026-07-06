"use client";

import { useState, FormEvent } from "react";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  Timestamp,
  orderBy,
} from "firebase/firestore";
import { useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/firebase";
import { RouteGuard } from "@/components/auth/RouteGuard";
import { STAGE_LABELS, StageId, MaterialType } from "@/types";
import { useCollectionQuery } from "@/hooks/use-firestore-query";

interface StageTarget {
  id: string;
  stageId: StageId;
  defaultTarget: number;
  defaultWageRate: number;
  unit: string;
  materialTargets?: Partial<Record<MaterialType, number>>;
}

const CUTTING_MATERIALS: MaterialType[] = ["FLEECE", "FLANNEL", "PUL"];

const MATERIAL_LABELS: Record<MaterialType, string> = {
  FLEECE: "Fleece (Microfiber)",
  FLANNEL: "Flannel",
  PUL: "PUL",
  COMBINED: "Combined",
  MICROFIBER: "Microfiber",
};

interface WorkerTarget {
  id: string;
  employeeId: string;
  employeeName: string;
  stageId: StageId;
  dailyTarget: number;
  effectiveDate: string;
}

export default function AdminTargetsPage() {
  const queryClient = useQueryClient();
  const [editingStage, setEditingStage] = useState<string | null>(null);
  const [editingMaterial, setEditingMaterial] = useState<MaterialType | null>(null);
  const [editValue, setEditValue] = useState(0);
  const [editWageRate, setEditWageRate] = useState(0);
  const [saving, setSaving] = useState(false);

  const [showWorkerForm, setShowWorkerForm] = useState(false);
  const [workerForm, setWorkerForm] = useState({
    employeeId: "",
    stageId: "STG-01" as StageId,
    dailyTarget: 0,
    effectiveDate: new Date().toISOString().split("T")[0],
  });

  const { data: stages = [] } = useCollectionQuery<StageTarget>("productionStages", [
    orderBy("stageId"),
  ], { staleTime: 10 * 60 * 1000 });

  const { data: employees = [] } = useCollectionQuery<{ id: string; name: string }>("workers", [
    orderBy("name"),
  ], { staleTime: 10 * 60 * 1000 });

  const { data: workerTargets = [], isLoading } = useCollectionQuery<WorkerTarget>("targetConfigs", [
    orderBy("effectiveDate", "desc"),
  ], { staleTime: 5 * 60 * 1000 });

  const cuttingStage = stages.find((s) => s.stageId === "STG-01");

  const stageRows = stages.flatMap((stage) => {
    if (stage.stageId !== "STG-01") return [{ ...stage, material: null as MaterialType | null }];
    return CUTTING_MATERIALS.map((mat) => ({
      ...stage,
      material: mat,
    }));
  });

  const handleEdit = (row: typeof stageRows[number]) => {
    setEditingStage(row.stageId);
    if (row.material) {
      setEditingMaterial(row.material);
      setEditValue(row.materialTargets?.[row.material] ?? 0);
    } else {
      setEditingMaterial(null);
      setEditValue(row.defaultTarget);
    }
    setEditWageRate(row.defaultWageRate || 0);
  };

  const handleSave = async (stageId: string, material: MaterialType | null) => {
    setSaving(true);
    try {
      if (material) {
        const existing = stages.find((s) => s.stageId === stageId);
        await updateDoc(doc(db, "productionStages", stageId), {
          materialTargets: {
            ...existing?.materialTargets,
            [material]: editValue,
          },
          defaultWageRate: editWageRate,
          updatedAt: Timestamp.now(),
        });
      } else {
        await updateDoc(doc(db, "productionStages", stageId), {
          defaultTarget: editValue,
          defaultWageRate: editWageRate,
          updatedAt: Timestamp.now(),
        });
      }
      queryClient.invalidateQueries({ queryKey: ["productionStages"] });
      setEditingStage(null);
      setEditingMaterial(null);
    } finally {
      setSaving(false);
    }
  };

  const handleWorkerTargetSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addDoc(collection(db, "targetConfigs"), {
        ...workerForm,
        createdAt: Timestamp.now(),
      });
      setWorkerForm({
        employeeId: "",
        stageId: "STG-01",
        dailyTarget: 0,
        effectiveDate: new Date().toISOString().split("T")[0],
      });
      setShowWorkerForm(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <RouteGuard>
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Target Configuration</h1>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Stage Default Targets
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stage</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Default Target</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Default Daily Wage (UGX)</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {stageRows.map((row, i) => {
                const editKey = row.material ? `${row.stageId}-${row.material}` : row.stageId;
                const isEditing = editingStage === row.stageId && editingMaterial === row.material;
                return (
                  <tr key={editKey} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {row.stageId} — {STAGE_LABELS[row.stageId]}
                      {row.material ? ` (${MATERIAL_LABELS[row.material]})` : ""}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(parseInt(e.target.value) || 0)}
                          min={0}
                          className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                          autoFocus
                        />
                      ) : row.material ? (
                        row.materialTargets?.[row.material]?.toLocaleString() ?? "—"
                      ) : (
                        row.defaultTarget.toLocaleString()
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editWageRate}
                          onChange={(e) => setEditWageRate(parseInt(e.target.value) || 0)}
                          min={0}
                          className="w-28 px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      ) : (
                        row.defaultWageRate ? `UGX ${row.defaultWageRate.toLocaleString()}` : "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{row.unit}</td>
                    <td className="px-4 py-3 text-right">
                      {isEditing ? (
                        <span className="flex justify-end gap-2">
                          <button
                            onClick={() => handleSave(row.stageId, row.material)}
                            disabled={saving}
                            className="text-sm text-stock-blue hover:underline"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => { setEditingStage(null); setEditingMaterial(null); }}
                            className="text-sm text-gray-500 hover:underline"
                          >
                            Cancel
                          </button>
                        </span>
                      ) : (
                        <button
                          onClick={() => handleEdit(row)}
                          className="text-sm text-stock-blue hover:underline"
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Per-Worker Target Overrides
          </h2>
          <button
            onClick={() => setShowWorkerForm(!showWorkerForm)}
            className="py-2 px-4 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800"
          >
            {showWorkerForm ? "Cancel" : "Add Override"}
          </button>
        </div>

        {showWorkerForm && (
          <form
            onSubmit={handleWorkerTargetSubmit}
            className="bg-gray-50 rounded-lg p-4 mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Worker</label>
              <select
                value={workerForm.employeeId}
                onChange={(e) =>
                  setWorkerForm({ ...workerForm, employeeId: e.target.value })
                }
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">Select worker...</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stage</label>
              <select
                value={workerForm.stageId}
                onChange={(e) =>
                  setWorkerForm({ ...workerForm, stageId: e.target.value as StageId })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                {(Object.entries(STAGE_LABELS) as [StageId, string][]).map(
                  ([id, label]) => (
                    <option key={id} value={id}>
                      {id} — {label}
                    </option>
                  )
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Daily Target
              </label>
              <input
                type="number"
                value={workerForm.dailyTarget}
                onChange={(e) =>
                  setWorkerForm({ ...workerForm, dailyTarget: parseInt(e.target.value) || 0 })
                }
                required
                min={0}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Effective Date
              </label>
              <input
                type="date"
                value={workerForm.effectiveDate}
                onChange={(e) =>
                  setWorkerForm({ ...workerForm, effectiveDate: e.target.value })
                }
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="py-2 px-4 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Add Override"}
              </button>
            </div>
          </form>
        )}

        {isLoading ? (
          <div className="text-center text-gray-400 py-4">Loading...</div>
        ) : workerTargets.length === 0 ? (
          <p className="text-sm text-gray-400">No worker target overrides configured.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Worker</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stage</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Daily Target</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Effective</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {workerTargets.map((wt, i) => (
                  <tr key={wt.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {wt.employeeName || wt.employeeId}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {wt.stageId} — {STAGE_LABELS[wt.stageId]}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {wt.dailyTarget.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {wt.effectiveDate}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
    </RouteGuard>
  );
}
