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

// 4. Update WIP calculations - adjust for new stage order
prodPage = prodPage.replace(
`const wipCut = Math.max(0, stageCounts["STG-01"] - stageCounts["STG-02"]);`,
`const wipCut = Math.max(0, (stageCounts["STG-01"] + stageCounts["STG-09"]) - stageCounts["STG-02"]);`
);
prodPage = prodPage.replace(
`const wipPinned = Math.max(0, stageCounts["STG-06"] - stageCounts["STG-07"]);`,
`const wipPinned = Math.max(0, (stageCounts["STG-06"] + stageCounts["STG-10"]) - stageCounts["STG-07"]);`
);

fs.writeFileSync('src/app/production/page.tsx', prodPage);

let storagePage = fs.readFileSync('src/app/storage/page.tsx', 'utf8');
// 1. Update WIP array
storagePage = storagePage.replace(
`"STG-01": 0, "STG-02": 0, "STG-03": 0, "STG-04": 0, "STG-05": 0, "STG-06": 0, "STG-07": 0, "STG-08": 0,`,
`"STG-01": 0, "STG-02": 0, "STG-03": 0, "STG-04": 0, "STG-05": 0, "STG-06": 0, "STG-07": 0, "STG-08": 0, "STG-09": 0, "STG-10": 0,`
);

// Update WIP Cut calculation for new stage order
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
