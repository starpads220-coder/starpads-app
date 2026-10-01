"use client";

import { useState, FormEvent } from "react";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  setDoc,
  Timestamp,
  orderBy,
} from "firebase/firestore";
import { useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/firebase";
import { RouteGuard } from "@/components/auth/RouteGuard";
import { STAGE_LABELS, STAGE_ORDER, StageId, MaterialType } from "@/types";
import { useCollectionQuery } from "@/hooks/use-firestore-query";

interface StageTarget {
  id?: string;
  stageId: StageId;
  defaultTarget: number;
  defaultWageRate: number;
  unit: string;
  materialTargets?: Partial<Record<MaterialType, number>>;
  materialMeterTargets?: Partial<Record<MaterialType, number>>;
  activityTargets?: Partial<Record<ProductionActivity, number>>;
}

type ProductionActivity = "PINNING" | "FOLDING";
type TargetVariant = "stage" | "materialPieces" | "materialMeters" | "activity";

interface StageRow {
  stageId: StageId;
  defaultTarget: number;
  defaultWageRate: number;
  unit: string;
  materialTargets?: Partial<Record<MaterialType, number>>;
  materialMeterTargets?: Partial<Record<MaterialType, number>>;
  activityTargets?: Partial<Record<ProductionActivity, number>>;
  material: MaterialType | null;
  activity: ProductionActivity | null;
  variant: TargetVariant;
  label: string;
  sourceRate?: number;
  exists: boolean;
}

const CUTTING_MATERIALS: MaterialType[] = ["FLEECE", "FLANNEL", "PUL"];

const MATERIAL_LABELS: Record<MaterialType, string> = {
  FLEECE: "Fleece (Microfiber)",
  FLANNEL: "Flannel",
  PUL: "PUL",
  COMBINED: "Combined",
  MICROFIBER: "Microfiber",
};

const REVISED_TARGETS: Record<StageId, { defaultTarget: number; defaultWageRate: number; unit: string }> = {
  "STG-01": { defaultTarget: 800, defaultWageRate: 10000, unit: "pieces" },
  "STG-02": { defaultTarget: 500, defaultWageRate: 10000, unit: "pieces" },
  "STG-03": { defaultTarget: 450, defaultWageRate: 10000, unit: "pieces" },
  "STG-04": { defaultTarget: 500, defaultWageRate: 10000, unit: "pieces" },
  "STG-05": { defaultTarget: 500, defaultWageRate: 10000, unit: "pieces" },
  "STG-06": { defaultTarget: 500, defaultWageRate: 10000, unit: "pieces" },
  "STG-07": { defaultTarget: 500, defaultWageRate: 8000, unit: "pieces" },
  "STG-08": { defaultTarget: 500, defaultWageRate: 8000, unit: "pieces" },
  "STG-09": { defaultTarget: 500, defaultWageRate: 8000, unit: "pieces" },
  "STG-10": { defaultTarget: 120, defaultWageRate: 10000, unit: "packs" },
};

const REVISED_MATERIAL_TARGETS: Record<"FLEECE" | "FLANNEL" | "PUL", number> = { FLEECE: 800, FLANNEL: 1000, PUL: 1000 };
const REVISED_METER_TARGETS: Record<"FLEECE" | "FLANNEL" | "PUL", number> = { FLEECE: 26, FLANNEL: 50, PUL: 50 };
const REVISED_METER_RATES: Record<"FLEECE" | "FLANNEL" | "PUL", number> = { FLEECE: 381, FLANNEL: 200, PUL: 200 };
const REVISED_ACTIVITY_TARGETS: Record<ProductionActivity, number> = { PINNING: 500, FOLDING: 700 };
const ACTIVITY_LABELS: Record<ProductionActivity, string> = { PINNING: "Pinning", FOLDING: "Folding" };

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
  const [editingActivity, setEditingActivity] = useState<ProductionActivity | null>(null);
  const [editingVariant, setEditingVariant] = useState<TargetVariant | null>(null);
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

  const stageRows: StageRow[] = [];
  for (const stageId of STAGE_ORDER) {
    const stage = stages.find((s) => s.stageId === stageId);
    if (!stage) {
      stageRows.push({ stageId, ...REVISED_TARGETS[stageId], material: null, activity: null, variant: "stage", label: STAGE_LABELS[stageId], exists: false });
    } else if (stage.stageId === "STG-01") {
      for (const mat of CUTTING_MATERIALS) {
        const material = mat as "FLEECE" | "FLANNEL" | "PUL";
        stageRows.push({ ...stage, material, activity: null, variant: "materialPieces", unit: "pieces", label: `Cutting & Measuring — ${MATERIAL_LABELS[material]}`, exists: true });
        stageRows.push({ ...stage, material, activity: null, variant: "materialMeters", unit: "meters", label: `Cutting in Meters — ${MATERIAL_LABELS[material]}`, sourceRate: REVISED_METER_RATES[material], exists: true });
      }
    } else if (stage.stageId === "STG-09") {
      for (const activity of ["PINNING", "FOLDING"] as ProductionActivity[]) stageRows.push({ ...stage, material: null, activity, variant: "activity", label: ACTIVITY_LABELS[activity], exists: true });
    } else {
      stageRows.push({ ...stage, material: null, activity: null, variant: "stage", label: STAGE_LABELS[stage.stageId], exists: true });
    }
  }

  const handleCreateStage = async (stageId: string) => {
    setSaving(true);
    try {
      const typedStageId = stageId as StageId;
      const config = REVISED_TARGETS[typedStageId];
      await setDoc(doc(db, "productionStages", stageId), {
        stageId,
        name: STAGE_LABELS[typedStageId],
        ...config,
        materialTargets: stageId === "STG-01" ? REVISED_MATERIAL_TARGETS : null,
        materialMeterTargets: stageId === "STG-01" ? REVISED_METER_TARGETS : null,
        activityTargets: stageId === "STG-09" ? REVISED_ACTIVITY_TARGETS : null,
        updatedAt: Timestamp.now(),
      });
      queryClient.invalidateQueries({ queryKey: ["productionStages"] });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateAllMissing = async () => {
    setSaving(true);
    try {
      for (const stageId of STAGE_ORDER) {
        const exists = stages.some((s) => s.stageId === stageId);
        if (exists) continue;
        const config = REVISED_TARGETS[stageId];
        await setDoc(doc(db, "productionStages", stageId), {
          stageId,
          name: STAGE_LABELS[stageId as StageId],
          ...config,
          materialTargets: stageId === "STG-01" ? REVISED_MATERIAL_TARGETS : null,
          materialMeterTargets: stageId === "STG-01" ? REVISED_METER_TARGETS : null,
          activityTargets: stageId === "STG-09" ? REVISED_ACTIVITY_TARGETS : null,
          updatedAt: Timestamp.now(),
        });
      }
      queryClient.invalidateQueries({ queryKey: ["productionStages"] });
    } finally {
      setSaving(false);
    }
  };

  const handleApplyRevisedTargets = async () => {
    setSaving(true);
    try {
      for (const stageId of STAGE_ORDER) {
        await setDoc(doc(db, "productionStages", stageId), {
          stageId,
          name: STAGE_LABELS[stageId],
          ...REVISED_TARGETS[stageId],
          ...(stageId === "STG-01" ? { materialTargets: REVISED_MATERIAL_TARGETS, materialMeterTargets: REVISED_METER_TARGETS } : {}),
          ...(stageId === "STG-09" ? { activityTargets: REVISED_ACTIVITY_TARGETS } : {}),
          updatedAt: Timestamp.now(),
        }, { merge: true });
      }
      queryClient.invalidateQueries({ queryKey: ["productionStages"] });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (row: typeof stageRows[number]) => {
    setEditingStage(row.stageId);
    setEditingVariant(row.variant);
    setEditingActivity(row.activity);
    if (row.variant === "materialPieces" && row.material) {
      setEditingMaterial(row.material);
      setEditValue(row.materialTargets?.[row.material] ?? 0);
    } else if (row.variant === "materialMeters" && row.material) {
      setEditingMaterial(row.material);
      setEditValue(row.materialMeterTargets?.[row.material] ?? 0);
    } else if (row.variant === "activity" && row.activity) {
      setEditingMaterial(null);
      setEditValue(row.activityTargets?.[row.activity] ?? 0);
    } else {
      setEditingMaterial(null);
      setEditValue(row.defaultTarget);
    }
    setEditWageRate(row.defaultWageRate || 0);
  };

  const handleSave = async (row: StageRow) => {
    setSaving(true);
    try {
      const existing = stages.find((s) => s.stageId === row.stageId);
      if (row.variant === "materialPieces" && row.material) {
        await updateDoc(doc(db, "productionStages", row.stageId), {
          materialTargets: {
            ...existing?.materialTargets,
            [row.material]: editValue,
          },
          defaultWageRate: editWageRate,
          updatedAt: Timestamp.now(),
        });
      } else if (row.variant === "materialMeters" && row.material) {
        await updateDoc(doc(db, "productionStages", row.stageId), {
          materialMeterTargets: { ...existing?.materialMeterTargets, [row.material]: editValue },
          defaultWageRate: editWageRate,
          updatedAt: Timestamp.now(),
        });
      } else if (row.variant === "activity" && row.activity) {
        await updateDoc(doc(db, "productionStages", row.stageId), {
          activityTargets: { ...existing?.activityTargets, [row.activity]: editValue },
          defaultTarget: row.activity === "PINNING" ? editValue : existing?.defaultTarget,
          defaultWageRate: editWageRate,
          updatedAt: Timestamp.now(),
        });
      } else {
        await updateDoc(doc(db, "productionStages", row.stageId), {
          defaultTarget: editValue,
          defaultWageRate: editWageRate,
          updatedAt: Timestamp.now(),
        });
      }
      queryClient.invalidateQueries({ queryKey: ["productionStages"] });
      setEditingStage(null);
      setEditingMaterial(null);
      setEditingActivity(null);
      setEditingVariant(null);
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
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="text-lg font-semibold text-gray-900">Revised Production Targets</h2><p className="mt-1 text-sm text-gray-500">Piece and meter targets from the approved production target schedule. Amount is the wage earned when the full target is completed.</p></div>
          <button type="button" onClick={handleApplyRevisedTargets} disabled={saving} className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50">{saving ? "Saving…" : "Apply revised targets"}</button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stage</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Default Target</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Default Daily Wage (UGX)</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price per unit</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {stageRows.map((row, i) => {
                const editKey = `${row.stageId}-${row.variant}-${row.material ?? row.activity ?? "default"}`;
                const isEditing = editingStage === row.stageId && editingVariant === row.variant && editingMaterial === row.material && editingActivity === row.activity;
                const targetValue = row.variant === "materialPieces" && row.material ? row.materialTargets?.[row.material]
                  : row.variant === "materialMeters" && row.material ? row.materialMeterTargets?.[row.material]
                    : row.variant === "activity" && row.activity ? row.activityTargets?.[row.activity]
                      : row.defaultTarget;
                const usesWorkbookRate = row.variant === "materialMeters" && row.material && targetValue === REVISED_METER_TARGETS[row.material as "FLEECE" | "FLANNEL" | "PUL"] && row.defaultWageRate === 10000;
                const pricePerUnit = usesWorkbookRate && row.sourceRate ? row.sourceRate : targetValue ? row.defaultWageRate / targetValue : 0;
                return (
                  <tr key={editKey} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {row.stageId} — {row.label}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {!row.exists ? (
                        <span className="text-gray-400 italic">Not configured</span>
                      ) : isEditing ? (
                        <input
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(parseInt(e.target.value) || 0)}
                          min={0}
                          className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                          autoFocus
                        />
                      ) : targetValue?.toLocaleString() ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {!row.exists ? (
                        <span className="text-gray-400 italic">—</span>
                      ) : isEditing ? (
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
                    <td className="px-4 py-3 text-sm text-gray-700">{row.exists && pricePerUnit ? `UGX ${pricePerUnit.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{row.exists ? row.unit : <span className="text-gray-400 italic">—</span>}</td>
                    <td className="px-4 py-3 text-right">
                      {!row.exists ? (
                        <button
                          onClick={() => handleCreateStage(row.stageId)}
                          disabled={saving}
                          className="text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:underline"
                        >
                          Create
                        </button>
                      ) : isEditing ? (
                        <span className="flex justify-end gap-2">
                          <button
                            onClick={() => handleSave(row)}
                            disabled={saving}
                            className="text-sm text-stock-blue hover:underline"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => { setEditingStage(null); setEditingMaterial(null); setEditingActivity(null); setEditingVariant(null); }}
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
        {stageRows.some((r) => !r.exists) && (
          <div className="mt-4 flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            <p className="text-sm text-amber-800">
              Some stages are missing from the database. Click <strong>Create</strong> to add them, or{" "}
              <button
                onClick={handleCreateAllMissing}
                disabled={saving}
                className="font-medium text-amber-900 underline hover:no-underline"
              >
                create all missing
              </button>
              .
            </p>
          </div>
        )}
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
