import type { MaterialType, ProductionEntry, StageId } from "@/types";

export const WIP_VERSION = 3 as const;
export const GLOBAL_WIP_BALANCE_ID = "GLOBAL" as const;

export const WIP_KEYS = [
  "fleeceCut", "flannelCut", "pulCut", "innerStitched", "fullyStitched",
  "overlocked", "checked", "holed", "pinned", "folded", "pouchCut",
  "pouchMade", "finishedPacks",
] as const;

export type WipKey = typeof WIP_KEYS[number];
export type WipQuantities = Record<WipKey, number>;
export interface WipBalance extends WipQuantities { batchRef: string; wipVersion: 3 }

export const WIP_LABELS: Record<WipKey, string> = {
  fleeceCut: "Cut Fleece / Microfiber",
  flannelCut: "Cut Flannel",
  pulCut: "Cut PUL",
  innerStitched: "Stitched Inner Pieces",
  fullyStitched: "Fully Stitched Pads",
  overlocked: "Overlocked Pads",
  checked: "Checked Pads",
  holed: "Holed Pads",
  pinned: "Pinned Pads",
  folded: "Folded Pads Ready for Packing",
  pouchCut: "Cut Pouches",
  pouchMade: "Completed Pouches",
  finishedPacks: "Finished Packs",
};

export const emptyWipQuantities = (): WipQuantities => Object.fromEntries(WIP_KEYS.map(key => [key, 0])) as WipQuantities;
export const emptyWipBalance = (batchRef: string): WipBalance => ({ batchRef, wipVersion: WIP_VERSION, ...emptyWipQuantities() });

export interface WipEntry {
  stageId: StageId;
  actualPieces: number;
  productionActivity?: ProductionEntry["productionActivity"] | null;
  materialType?: MaterialType | null;
  materialTypes?: MaterialType[] | null;
  combinedStageComponent?: "CUTTING" | "MAKING" | null;
}

export function wipDelta(entry: WipEntry): WipQuantities {
  const delta = emptyWipQuantities();
  const quantity = Number(entry.actualPieces) || 0;
  if (!(quantity > 0)) throw new Error("Production quantity must be greater than zero.");
  const move = (key: WipKey, amount: number) => { delta[key] += amount; };
  switch (entry.stageId as StageId) {
    case "STG-01": {
      const material = (entry.materialType ?? entry.materialTypes?.[0]) as MaterialType | undefined;
      if (material === "FLEECE" || material === "MICROFIBER") move("fleeceCut", quantity);
      else if (material === "FLANNEL") move("flannelCut", quantity);
      else if (material === "PUL") move("pulCut", quantity);
      else throw new Error("STG-01 requires Fleece/Microfiber, Flannel or PUL.");
      break;
    }
    case "STG-02": move("fleeceCut", -quantity); move("flannelCut", -quantity); move("innerStitched", quantity); break;
    case "STG-03": move("innerStitched", -quantity); move("pulCut", -quantity); move("fullyStitched", quantity); break;
    case "STG-04": move("fullyStitched", -quantity); move("overlocked", quantity); break;
    case "STG-05":
      // Migrated historical STG-05/STG-06 records retain their two-step WIP
      // meaning. New canonical STG-05 entries complete the combined task.
      if (entry.combinedStageComponent === "CUTTING") move("pouchCut", quantity);
      else if (entry.combinedStageComponent === "MAKING") { move("pouchCut", -quantity); move("pouchMade", quantity); }
      else move("pouchMade", quantity);
      break;
    case "STG-07": move("overlocked", -quantity); move("checked", quantity); break;
    case "STG-08": move("checked", -quantity); move("holed", quantity); break;
    case "STG-09":
      if (entry.productionActivity === "PINNING") { move("holed", -quantity); move("pinned", quantity); }
      else if (entry.productionActivity === "FOLDING") { move("pinned", -quantity); move("folded", quantity); }
      else throw new Error("STG-09 requires Pinning or Folding.");
      break;
    case "STG-10": move("folded", -(quantity * 3)); move("pouchMade", -quantity); move("finishedPacks", quantity); break;
  }
  return delta;
}

export function applyWipEntry(current: WipBalance, entry: WipEntry, direction: 1 | -1 = 1, validate = true): WipBalance {
  const delta = wipDelta(entry);
  const next = { ...current };
  for (const key of WIP_KEYS) {
    next[key] = (Number(current[key]) || 0) + delta[key] * direction;
    if (validate && next[key] < 0) throw new Error(`Insufficient ${WIP_LABELS[key]}. Available: ${(Number(current[key]) || 0).toLocaleString()}.`);
    if (Math.abs(next[key]) < 0.000001) next[key] = 0;
  }
  return next;
}

export function calculateWip(entries: ProductionEntry[], batchRef?: string, asAtDate?: string): WipQuantities {
  const totals = emptyWipQuantities();
  for (const entry of entries) {
    if (entry.wipVersion !== WIP_VERSION || (batchRef && entry.stageId === "STG-10" && entry.batchRef !== batchRef) || (asAtDate && entry.date > asAtDate)) continue;
    const delta = wipDelta(entry);
    for (const key of WIP_KEYS) totals[key] += delta[key];
  }
  return totals;
}
