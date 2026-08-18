const fs = require('fs');

let prodPage = fs.readFileSync('src/app/production/page.tsx', 'utf8');

// 1. Update stageUnit
prodPage = prodPage.replace(
`  "STG-07": "pieces",
  "STG-08": "packs",
};`,
`  "STG-07": "pieces",
  "STG-08": "packs",
  "STG-09": "pieces",
  "STG-10": "sets",
};`
);

// 2. Update stagesWithMaterial
prodPage = prodPage.replace(
`const stagesWithMaterial: StageId[] = ["STG-01", "STG-02", "STG-03"];`,
`const stagesWithMaterial: StageId[] = ["STG-01", "STG-02", "STG-03", "STG-09"];`
);

// 3. Replace form.stageId === "STG-01" with (form.stageId === "STG-01" || form.stageId === "STG-09")
prodPage = prodPage.replace(/form\.stageId === "STG-01"/g, '(form.stageId === "STG-01" || form.stageId === "STG-09")');
prodPage = prodPage.replace(/e\.stageId === "STG-01"/g, '(e.stageId === "STG-01" || e.stageId === "STG-09")');

// 4. Batch Logic in handleSubmit
const batchValidationLogic = `
    if (form.stageId === "STG-08" && form.batchRef) {
      const activeBatches = batches.filter(b => b.status === "ACTIVE").sort((a, b) => a.startDate.localeCompare(b.startDate));
      const oldestUnfilled = activeBatches.find(b => b.packsProduced < b.maxPacks);
      if (oldestUnfilled && form.batchRef !== oldestUnfilled.id) {
        alert(\`Please fill the active batch (\${oldestUnfilled.batchNumber}) before starting a newer batch.\`);
        setSaving(false);
        return;
      }
    }
`;

prodPage = prodPage.replace(
`    setSaving(true);
    try {
      const isMeasureCutting =`,
`    setSaving(true);
    ${batchValidationLogic}
    try {
      const isMeasureCutting =`
);

// 5. Update packSize when moving to stock to use ONE_PACK since production pieces for STG-08 are packs
prodPage = prodPage.replace(
`packSize: "HALF_DOZEN",`,
`packSize: "ONE_PACK",`
);

// 6. Update batch dropdown text
prodPage = prodPage.replace(
`{b.batchNumber} — {b.packsProduced.toLocaleString()} / {b.maxPacks.toLocaleString()} packs`,
`{b.batchNumber} — Remaining: {Math.max(0, b.maxPacks - b.packsProduced).toLocaleString()} packs`
);

fs.writeFileSync('src/app/production/page.tsx', prodPage);

let storagePage = fs.readFileSync('src/app/storage/page.tsx', 'utf8');
// 1. Batch Logic in handleStockInSubmit
const storageBatchValidationLogic = `
      const activeBatches = batches.filter(b => b.status === "ACTIVE").sort((a, b) => a.startDate.localeCompare(b.startDate));
      const oldestUnfilled = activeBatches.find(b => b.packsProduced < b.maxPacks);
      if (oldestUnfilled && stockInForm.batchRef !== oldestUnfilled.id) {
        alert(\`Please fill the active batch (\${oldestUnfilled.batchNumber}) before using a newer batch.\`);
        setSaving(false);
        return;
      }
`;

storagePage = storagePage.replace(
`    setSaving(true);
    try {
      const batchDocRef`,
`    setSaving(true);
    try {
${storageBatchValidationLogic}
      const batchDocRef`
);

// 2. Update batch dropdown text in Storage
storagePage = storagePage.replace(
`{b.batchNumber} — {b.packsProduced.toLocaleString()} / {b.maxPacks.toLocaleString()} packs`,
`{b.batchNumber} — Remaining: {Math.max(0, b.maxPacks - b.packsProduced).toLocaleString()} packs`
);

// Update WIP array
storagePage = storagePage.replace(
`"STG-01": 0, "STG-02": 0, "STG-03": 0, "STG-04": 0, "STG-05": 0, "STG-06": 0, "STG-07": 0, "STG-08": 0,`,
`"STG-01": 0, "STG-02": 0, "STG-03": 0, "STG-04": 0, "STG-05": 0, "STG-06": 0, "STG-07": 0, "STG-08": 0, "STG-09": 0, "STG-10": 0,`
);

storagePage = storagePage.replace(
`const wipCut = Math.max(0, stageCounts["STG-01"] - stageCounts["STG-02"]);`,
`const wipCut = Math.max(0, (stageCounts["STG-01"] + stageCounts["STG-09"]) - stageCounts["STG-02"]);`
);
storagePage = storagePage.replace(
`const wipPinned = Math.max(0, stageCounts["STG-06"] - stageCounts["STG-07"]);`,
`const wipPinned = Math.max(0, (stageCounts["STG-06"] + stageCounts["STG-10"]) - stageCounts["STG-07"]);`
);

fs.writeFileSync('src/app/storage/page.tsx', storagePage);

console.log("Updated UI logic!");
