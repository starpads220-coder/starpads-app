import type { MaterialType, ProductionStage, StageId } from "@/types";
import { CUTTING_RATIOS } from "@/types";
import { STAGE_LABELS, STAGE_UNITS } from "@/lib/production-stages";

export type ProductionActivity = "PINNING" | "FOLDING";
export type TargetVariant = "stage" | "materialPieces" | "materialMeters" | "activity";

export const DEFAULT_PRODUCTION_TARGETS: Record<StageId, { defaultTarget: number; defaultWageRate: number; unit: string }> = {
  "STG-01": { defaultTarget: 1000, defaultWageRate: 10000, unit: "pieces" },
  "STG-02": { defaultTarget: 500, defaultWageRate: 10000, unit: "pieces" },
  "STG-03": { defaultTarget: 450, defaultWageRate: 10000, unit: "pieces" },
  "STG-04": { defaultTarget: 500, defaultWageRate: 10000, unit: "pieces" },
  "STG-05": { defaultTarget: 500, defaultWageRate: 10000, unit: "pieces" },
  "STG-07": { defaultTarget: 500, defaultWageRate: 8000, unit: "pieces" },
  "STG-08": { defaultTarget: 500, defaultWageRate: 8000, unit: "pieces" },
  "STG-09": { defaultTarget: 500, defaultWageRate: 8000, unit: "pieces" },
  "STG-10": { defaultTarget: 120, defaultWageRate: 10000, unit: "packs" },
};

export const DEFAULT_CUTTING_PIECE_TARGETS: Record<"FLEECE" | "FLANNEL" | "PUL", number> = {
  FLEECE: 1000,
  FLANNEL: 1000,
  PUL: 1000,
};
export const DEFAULT_CUTTING_METER_TARGETS: Record<"FLEECE" | "FLANNEL" | "PUL", number> = {
  FLEECE: 50,
  FLANNEL: 50,
  PUL: 50,
};
export const DEFAULT_ACTIVITY_TARGETS: Record<ProductionActivity, number> = { PINNING: 500, FOLDING: 700 };

export interface TargetSelection {
  stageId: StageId;
  inputMode?: "manual" | "measure";
  material?: MaterialType;
  activity?: ProductionActivity | "";
}

export interface ResolvedProductionTarget {
  key: string;
  name: string;
  variant: TargetVariant;
  quantity: number;
  calculationQuantity: number;
  amount: number;
  unit: string;
}

export function targetVariantFor(selection: TargetSelection): TargetVariant {
  if (selection.stageId === "STG-01" && selection.inputMode === "measure") return "materialMeters";
  if (selection.stageId === "STG-01" && selection.material) return "materialPieces";
  if (selection.stageId === "STG-09" && selection.activity) return "activity";
  return "stage";
}

/** Resolve the live target edited on the Targets screen. Historical versions never override this value. */
export function resolveProductionTarget(stage: ProductionStage | undefined, selection: TargetSelection): ResolvedProductionTarget {
  const defaults = DEFAULT_PRODUCTION_TARGETS[selection.stageId];
  const variant = targetVariantFor(selection);
  const material = selection.material;
  const activity = selection.activity || undefined;
  const amount = stage?.defaultWageRate ?? defaults.defaultWageRate;
  let quantity = stage?.defaultTarget ?? defaults.defaultTarget;
  let unit = defaults.unit || STAGE_UNITS[selection.stageId];

  if (variant === "materialMeters" && material) {
    quantity = stage?.materialMeterTargets?.[material]
      ?? DEFAULT_CUTTING_METER_TARGETS[material as keyof typeof DEFAULT_CUTTING_METER_TARGETS]
      ?? 0;
    unit = "meters";
  } else if (variant === "materialPieces" && material) {
    quantity = stage?.materialTargets?.[material]
      ?? DEFAULT_CUTTING_PIECE_TARGETS[material as keyof typeof DEFAULT_CUTTING_PIECE_TARGETS]
      ?? 0;
    unit = "pieces";
  } else if (variant === "activity" && activity) {
    quantity = stage?.activityTargets?.[activity] ?? DEFAULT_ACTIVITY_TARGETS[activity];
    unit = "pieces";
  }

  const ratio = variant === "materialMeters" && material ? CUTTING_RATIOS[material] || 0 : 1;
  const suffix = activity
    ? activity === "PINNING" ? "Pinning" : "Folding"
    : material ? material === "FLEECE" ? "Fleece (Microfiber)" : material : "";

  return {
    key: `${selection.stageId}:${variant}:${material ?? activity ?? "default"}`,
    name: suffix ? `${STAGE_LABELS[selection.stageId]} - ${suffix}` : STAGE_LABELS[selection.stageId],
    variant,
    quantity,
    calculationQuantity: quantity * ratio,
    amount,
    unit,
  };
}
