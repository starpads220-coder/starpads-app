"use client";

import { Fragment, useState, useMemo, FormEvent } from "react";
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
import type { ProductionEntry, ProductionTargetVersion } from "@/types";
import { useCollectionQuery } from "@/hooks/use-firestore-query";
import { isEmployeeActive } from "@/lib/employees";
import { useAuth } from "@/lib/auth-context";

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
type TargetVariant = "stage" | "combinedStage" | "materialPieces" | "materialMeters" | "activity";

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
  secondaryStageId?: StageId;
  exists: boolean;
}

const CUTTING_MATERIALS: MaterialType[] = ["FLEECE", "FLANNEL", "PUL"];

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
  "STG-10": { defaultTarget: 120, defaultWageRate: 10000, unit: "pieces" },
};

const REVISED_MATERIAL_TARGETS: Record<"FLEECE" | "FLANNEL" | "PUL", number> = { FLEECE: 800, FLANNEL: 1000, PUL: 1000 };
const REVISED_METER_TARGETS: Record<"FLEECE" | "FLANNEL" | "PUL", number> = { FLEECE: 26, FLANNEL: 50, PUL: 50 };
const REVISED_ACTIVITY_TARGETS: Record<ProductionActivity, number> = { PINNING: 500, FOLDING: 700 };
const ACTIVITY_LABELS: Record<ProductionActivity, string> = { PINNING: "Pinning", FOLDING: "Folding" };
const TARGET_LABELS: Partial<Record<StageId, string>> = {
  "STG-02": "Sewing inner (middle)",
  "STG-03": "Sewing outer (top layer)",
  "STG-04": "Overlocking",
  "STG-05": "Pouch making & cutting",
  "STG-07": "Checking",
  "STG-08": "Holling",
  "STG-10": "Packaging",
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
  const { userRole } = useAuth();
  const queryClient = useQueryClient();
  const [editingStage, setEditingStage] = useState<string | null>(null);
  const [editingMaterial, setEditingMaterial] = useState<MaterialType | null>(null);
  const [editingActivity, setEditingActivity] = useState<ProductionActivity | null>(null);
  const [editingVariant, setEditingVariant] = useState<TargetVariant | null>(null);
  const [editValue, setEditValue] = useState(0);
  const [editWageRate, setEditWageRate] = useState(0);
  const [editEffectiveDate, setEditEffectiveDate] = useState(new Date().toISOString().split("T")[0]);
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

  const { data: workers = [] } = useCollectionQuery<{ id: string; name: string }>("workers", [
    orderBy("name"),
  ], { staleTime: 10 * 60 * 1000 });
  const { data: employeeDirectory = [] } = useCollectionQuery<{ id: string; name: string; isActive?: boolean; active?: boolean }>("employees", [
    orderBy("name"),
  ], { staleTime: 10 * 60 * 1000 });
  const employees = useMemo(() => workers.filter(worker => {
    const normalized = worker.name.trim().toLowerCase();
    const employee = employeeDirectory.find(item => item.id === worker.id || item.name.trim().toLowerCase() === normalized);
    return !employee || isEmployeeActive(employee);
  }), [workers, employeeDirectory]);

  const { data: workerTargets = [], isLoading } = useCollectionQuery<WorkerTarget>("targetConfigs", [
    orderBy("effectiveDate", "desc"),
  ], { staleTime: 5 * 60 * 1000 });
  const { data: targetVersions = [] } = useCollectionQuery<ProductionTargetVersion>("productionTargetVersions", [
    orderBy("effectiveDate", "desc"),
  ], { staleTime: 0 });
  const { data: productionEntries = [] } = useCollectionQuery<ProductionEntry>("productionEntries", [
    orderBy("date", "desc"),
  ], { staleTime: 5 * 60 * 1000 });
  const legacyEntries = useMemo(
    () => productionEntries.filter((entry) => !entry.targetSnapshot),
    [productionEntries]
  );

  const stageRows: StageRow[] = [];
  for (const stageId of STAGE_ORDER) {
    const stage = stages.find((s) => s.stageId === stageId);
    const workbookTarget: StageTarget = {
      stageId,
      ...REVISED_TARGETS[stageId],
      materialTargets: stageId === "STG-01" ? REVISED_MATERIAL_TARGETS : undefined,
      materialMeterTargets: stageId === "STG-01" ? REVISED_METER_TARGETS : undefined,
      activityTargets: stageId === "STG-09" ? REVISED_ACTIVITY_TARGETS : undefined,
    };
    const resolved: StageTarget = stage ? {
      ...workbookTarget,
      ...stage,
      defaultTarget: stage.defaultTarget ?? workbookTarget.defaultTarget,
      defaultWageRate: stage.defaultWageRate ?? workbookTarget.defaultWageRate,
      unit: stage.unit || workbookTarget.unit,
      materialTargets: stageId === "STG-01"
        ? { ...REVISED_MATERIAL_TARGETS, ...stage.materialTargets }
        : stage.materialTargets,
      materialMeterTargets: stageId === "STG-01"
        ? { ...REVISED_METER_TARGETS, ...stage.materialMeterTargets }
        : stage.materialMeterTargets,
      activityTargets: stageId === "STG-09"
        ? { ...REVISED_ACTIVITY_TARGETS, ...stage.activityTargets }
        : stage.activityTargets,
    } : workbookTarget;
    if (stageId === "STG-01") {
      for (const mat of CUTTING_MATERIALS) {
        const material = mat as "FLEECE" | "FLANNEL" | "PUL";
        const pieceLabel = material === "FLEECE" ? "Cutting & measuring fleece (micro fibre)" : `Cutting & measuring (${material === "PUL" ? "PUL" : "flannel"})`;
        const meterLabel = material === "FLEECE" ? "Cutting in meters (micro fibre)" : `Cutting in meters (${material === "PUL" ? "PUL" : "flannel"})`;
        stageRows.push({ ...resolved, material, activity: null, variant: "materialPieces", unit: "pieces", label: pieceLabel, exists: !!stage });
        stageRows.push({ ...resolved, material, activity: null, variant: "materialMeters", unit: "meters", label: meterLabel, exists: !!stage });
      }
    } else if (stageId === "STG-05") {
      const pairedStage = stages.find(item => item.stageId === "STG-06");
      stageRows.push({ ...resolved, material: null, activity: null, variant: "combinedStage", label: TARGET_LABELS[stageId]!, secondaryStageId: "STG-06", exists: !!stage && !!pairedStage });
    } else if (stageId === "STG-06") {
      continue;
    } else if (stageId === "STG-09") {
      for (const activity of ["PINNING", "FOLDING"] as ProductionActivity[]) stageRows.push({ ...resolved, material: null, activity, variant: "activity", label: ACTIVITY_LABELS[activity], exists: !!stage });
    } else {
      stageRows.push({ ...resolved, material: null, activity: null, variant: "stage", label: TARGET_LABELS[stageId] ?? STAGE_LABELS[stageId], exists: !!stage });
    }
  }
  const pieceTargetRows = stageRows.filter(row => row.variant !== "materialMeters");
  const meterTargetRows = stageRows.filter(row => row.variant === "materialMeters");
  const orderedStageRows = [...pieceTargetRows, ...meterTargetRows];
  const extraOrDuplicateStages = stages.filter((stage, index) => !STAGE_ORDER.includes(stage.stageId) || stages.findIndex(item => item.stageId === stage.stageId) !== index);

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
      if (stageId === "STG-05") await setDoc(doc(db, "productionStages", "STG-06"), { stageId: "STG-06", name: STAGE_LABELS["STG-06"], ...REVISED_TARGETS["STG-06"], updatedAt: Timestamp.now() });
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
      const effectiveDate = new Date().toISOString().split("T")[0];
      for (const row of orderedStageRows) {
        const quantity = row.variant === "materialPieces" && row.material
          ? REVISED_MATERIAL_TARGETS[row.material as keyof typeof REVISED_MATERIAL_TARGETS]
          : row.variant === "materialMeters" && row.material
            ? REVISED_METER_TARGETS[row.material as keyof typeof REVISED_METER_TARGETS]
            : row.variant === "activity" && row.activity
              ? REVISED_ACTIVITY_TARGETS[row.activity]
              : REVISED_TARGETS[row.stageId].defaultTarget;
        await saveTargetVersion(row, row.stageId, rowQuantity(row), quantity, REVISED_TARGETS[row.stageId].defaultWageRate, effectiveDate);
        if (row.variant === "combinedStage" && row.secondaryStageId) {
          await saveTargetVersion(row, row.secondaryStageId, rowQuantity(row), quantity, REVISED_TARGETS[row.secondaryStageId].defaultWageRate, effectiveDate);
        }
      }
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
      queryClient.invalidateQueries({ queryKey: ["productionTargetVersions"] });
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
    setEditEffectiveDate(new Date().toISOString().split("T")[0]);
  };

  const rowKey = (row: StageRow, stageId = row.stageId) =>
    `${stageId}:${row.variant}:${row.material ?? row.activity ?? "default"}`;

  const rowQuantity = (row: StageRow) => row.variant === "materialPieces" && row.material
    ? row.materialTargets?.[row.material] ?? 0
    : row.variant === "materialMeters" && row.material
      ? row.materialMeterTargets?.[row.material] ?? 0
      : row.variant === "activity" && row.activity
        ? row.activityTargets?.[row.activity] ?? 0
        : row.defaultTarget;

  const saveTargetVersion = async (
    row: StageRow,
    stageId: StageId,
    oldQuantity: number,
    nextQuantity = editValue,
    nextAmount = editWageRate,
    effectiveDate = editEffectiveDate,
  ) => {
    const targetKey = rowKey(row, stageId);
    const common = {
      targetKey,
      stageId,
      targetName: row.label,
      variant: row.variant,
      material: row.material,
      activity: row.activity,
      unit: row.unit,
    };
    if (!targetVersions.some((version) => version.targetKey === targetKey)) {
      await addDoc(collection(db, "productionTargetVersions"), {
        ...common,
        quantity: oldQuantity,
        amount: row.defaultWageRate,
        rate: oldQuantity > 0 ? row.defaultWageRate / oldQuantity : 0,
        effectiveDate: "0001-01-01",
        effectiveAt: Timestamp.fromMillis(0),
        changedBy: "System baseline",
        isBaseline: true,
      });
    }
    await addDoc(collection(db, "productionTargetVersions"), {
      ...common,
      quantity: nextQuantity,
      amount: nextAmount,
      rate: nextQuantity > 0 ? nextAmount / nextQuantity : 0,
      effectiveDate,
      effectiveAt: Timestamp.now(),
      changedBy: userRole?.name || userRole?.email || userRole?.uid || "Authorized user",
      previousQuantity: oldQuantity,
      previousAmount: row.defaultWageRate,
    });
  };

  const handleSave = async (row: StageRow) => {
    setSaving(true);
    try {
      const existing = stages.find((s) => s.stageId === row.stageId);
      const oldQuantity = rowQuantity(row);
      await saveTargetVersion(row, row.stageId, oldQuantity);
      if (row.variant === "combinedStage" && row.secondaryStageId) {
        await saveTargetVersion(row, row.secondaryStageId, oldQuantity);
      }
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
      } else if (row.variant === "combinedStage" && row.secondaryStageId) {
        const update = { defaultTarget: editValue, defaultWageRate: editWageRate, updatedAt: Timestamp.now() };
        await updateDoc(doc(db, "productionStages", row.stageId), update);
        await updateDoc(doc(db, "productionStages", row.secondaryStageId), update);
      } else {
        await updateDoc(doc(db, "productionStages", row.stageId), {
          defaultTarget: editValue,
          defaultWageRate: editWageRate,
          updatedAt: Timestamp.now(),
        });
      }
      queryClient.invalidateQueries({ queryKey: ["productionStages"] });
      queryClient.invalidateQueries({ queryKey: ["productionTargetVersions"] });
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
          <div><h2 className="text-lg font-semibold text-gray-900">Star Durable Pads Production Targets</h2><p className="mt-1 text-sm text-gray-500">15 canonical targets: 12 counted in pieces and 3 counted in meters. Amount is the wage earned when the full target is completed.</p></div>
          <button type="button" onClick={handleApplyRevisedTargets} disabled={saving} className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50">{saving ? "Saving…" : "Apply revised targets"}</button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stage</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Target Quantity</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount (UGX)</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Rate per Unit (UGX)</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Effective From</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {orderedStageRows.map((row, i) => {
                const editKey = `${row.stageId}-${row.variant}-${row.material ?? row.activity ?? "default"}`;
                const isEditing = editingStage === row.stageId && editingVariant === row.variant && editingMaterial === row.material && editingActivity === row.activity;
                const storedTargetValue = row.variant === "materialPieces" && row.material ? row.materialTargets?.[row.material]
                  : row.variant === "materialMeters" && row.material ? row.materialMeterTargets?.[row.material]
                    : row.variant === "activity" && row.activity ? row.activityTargets?.[row.activity]
                      : row.defaultTarget;
                const workbookTargetValue = row.variant === "materialPieces" && row.material
                  ? REVISED_MATERIAL_TARGETS[row.material as keyof typeof REVISED_MATERIAL_TARGETS]
                  : row.variant === "materialMeters" && row.material
                    ? REVISED_METER_TARGETS[row.material as keyof typeof REVISED_METER_TARGETS]
                    : row.variant === "activity" && row.activity
                      ? REVISED_ACTIVITY_TARGETS[row.activity]
                      : REVISED_TARGETS[row.stageId].defaultTarget;
                const targetValue = storedTargetValue ?? workbookTargetValue;
                const pricePerUnit = targetValue ? row.defaultWageRate / targetValue : 0;
                const groupHeading = i === 0 ? "Piece-count targets · Number of Pieces · Price per Piece" : i === pieceTargetRows.length ? "Meter-count targets · Number of Meters · Per Meter" : null;
                return (
                  <Fragment key={editKey}>
                  {groupHeading && <tr className="bg-blue-50"><th colSpan={7} className="px-4 py-3 text-left text-sm font-semibold text-blue-900">{groupHeading}</th></tr>}
                  <tr key={editKey} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {row.stageId} — {row.label}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-700">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(parseInt(e.target.value) || 0)}
                          min={0}
                          className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                          autoFocus
                        />
                      ) : targetValue.toLocaleString()}
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
                        row.defaultWageRate ? row.defaultWageRate.toLocaleString() : "—"
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-700">{pricePerUnit ? pricePerUnit.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{row.unit}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                      {isEditing ? (
                        <input type="date" value={editEffectiveDate} onChange={(event) => setEditEffectiveDate(event.target.value)} required className="rounded border border-gray-300 px-2 py-1 text-sm" />
                      ) : (targetVersions.find((version) => version.targetKey === rowKey(row) && !version.isBaseline)?.effectiveDate ?? "Current")}
                    </td>
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
                  {isEditing && <tr className="bg-amber-50"><td colSpan={7} className="px-4 py-2 text-sm text-amber-900">Changes apply to new entries from <strong>{editEffectiveDate}</strong>. Existing entries are not changed.</td></tr>}
                  </Fragment>
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
        {extraOrDuplicateStages.length > 0 && <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"><p className="font-semibold">Additional or duplicate stored stage definitions need review</p><p className="mt-1">Left unchanged: {extraOrDuplicateStages.map(stage => `${stage.stageId}${stage.id ? ` (${stage.id})` : ""}`).join(", ")}.</p></div>}
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Target Change History</h2>
        <p className="mt-1 text-sm text-gray-500">Each save creates a permanent version. Earlier production entries keep their saved target snapshot.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50"><tr><th className="px-4 py-3 text-left">Target</th><th className="px-4 py-3 text-left">Effective from</th><th className="px-4 py-3 text-right">Previous</th><th className="px-4 py-3 text-right">New quantity</th><th className="px-4 py-3 text-right">New amount</th><th className="px-4 py-3 text-left">Changed by</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {targetVersions.filter((version) => !version.isBaseline).map((version) => <tr key={version.id}><td className="px-4 py-3 font-medium">{version.targetName}</td><td className="px-4 py-3">{version.effectiveDate}</td><td className="px-4 py-3 text-right">{version.previousQuantity?.toLocaleString() ?? "—"} / UGX {version.previousAmount?.toLocaleString() ?? "—"}</td><td className="px-4 py-3 text-right">{version.quantity.toLocaleString()} {version.unit}</td><td className="px-4 py-3 text-right">UGX {version.amount.toLocaleString()}</td><td className="px-4 py-3">{version.changedBy ?? "—"}</td></tr>)}
              {!targetVersions.some((version) => !version.isBaseline) && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No target changes have been saved yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {legacyEntries.length > 0 && <section className="rounded-lg border border-amber-200 bg-amber-50 p-6">
        <h2 className="text-lg font-semibold text-amber-950">Legacy entries awaiting an approved backfill ({legacyEntries.length})</h2>
        <p className="mt-1 text-sm text-amber-900">These records predate target snapshots. Their stored target quantity, earnings and performance remain unchanged. No target name, amount, rate, unit or version has been guessed or written.</p>
        <div className="mt-4 max-h-72 overflow-auto rounded border border-amber-200 bg-white">
          <table className="min-w-full divide-y divide-amber-100 text-sm">
            <thead className="sticky top-0 bg-amber-100"><tr><th className="px-3 py-2 text-left">Entry</th><th className="px-3 py-2 text-left">Date</th><th className="px-3 py-2 text-left">Stage</th><th className="px-3 py-2 text-right">Stored target</th><th className="px-3 py-2 text-left">Reason flagged</th></tr></thead>
            <tbody className="divide-y divide-amber-100">{legacyEntries.map((entry) => <tr key={entry.id}><td className="px-3 py-2 font-mono text-xs">{entry.id}</td><td className="px-3 py-2">{entry.date}</td><td className="px-3 py-2">{STAGE_LABELS[entry.stageId] ?? entry.stageId}</td><td className="px-3 py-2 text-right">{entry.targetPieces.toLocaleString()}</td><td className="px-3 py-2">Original amount/rate/version cannot be proven from the record alone.</td></tr>)}</tbody>
          </table>
        </div>
      </section>}

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
