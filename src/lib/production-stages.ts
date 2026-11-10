/** Canonical production stages. The Targets screen and every stage consumer use this list. */
export const PRODUCTION_STAGES = [
  { id: "STG-01", number: 1, code: "STG-01", name: "Cutting & Measuring", unit: "pieces" },
  { id: "STG-02", number: 2, code: "STG-02", name: "Sewing inner (middle)", unit: "pieces" },
  { id: "STG-03", number: 3, code: "STG-03", name: "Sewing outer (top layer)", unit: "pieces" },
  { id: "STG-04", number: 4, code: "STG-04", name: "Overlocking", unit: "pieces" },
  { id: "STG-05", number: 5, code: "STG-05", name: "Pouch making and cutting", unit: "pieces" },
  { id: "STG-07", number: 7, code: "STG-07", name: "Checking", unit: "pieces" },
  { id: "STG-08", number: 8, code: "STG-08", name: "Holling", unit: "pieces" },
  { id: "STG-09", number: 9, code: "STG-09", name: "Pinning and Folding", unit: "pieces" },
  { id: "STG-10", number: 10, code: "STG-10", name: "Packaging", unit: "packs" },
] as const;

export type StageId = (typeof PRODUCTION_STAGES)[number]["id"];
export const STAGE_ORDER = PRODUCTION_STAGES.map(stage => stage.id) as StageId[];
export const STAGE_LABELS = Object.fromEntries(PRODUCTION_STAGES.map(stage => [stage.id, stage.name])) as Record<StageId, string>;
export const STAGE_UNITS = Object.fromEntries(PRODUCTION_STAGES.map(stage => [stage.id, stage.unit])) as Record<StageId, "pieces" | "packs">;
export const FINISHED_PADS_STAGE_ID: StageId = "STG-10";
export const COMBINED_POUCH_STAGE_ID: StageId = "STG-05";
export const LEGACY_POUCH_MAKING_STAGE_ID = "STG-06" as const;

export function isStageId(value: unknown): value is StageId {
  return STAGE_ORDER.includes(value as StageId);
}

/** Maps historical display values without silently accepting them for new entries. */
export function canonicalStageId(value: unknown): StageId | null {
  if (value === LEGACY_POUCH_MAKING_STAGE_ID) return COMBINED_POUCH_STAGE_ID;
  return isStageId(value) ? value : null;
}

export function stageLabel(value: unknown): string {
  const id = canonicalStageId(value);
  return id ? STAGE_LABELS[id] : String(value ?? "Unknown stage");
}
