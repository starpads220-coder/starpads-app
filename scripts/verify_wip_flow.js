const fs = require("fs");
const path = require("path");
const vm = require("vm");
const ts = require("typescript");

const source = fs.readFileSync(path.resolve(__dirname, "../src/lib/wip.ts"), "utf8");
const javascript = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const moduleBox = { exports: {} };
vm.runInNewContext(javascript, { module: moduleBox, exports: moduleBox.exports, require, console });
const { WIP_KEYS, emptyWipBalance, applyWipEntry } = moduleBox.exports;

let balance = emptyWipBalance("GLOBAL");
const apply = entry => { balance = applyWipEntry(balance, entry); };
apply({ stageId: "STG-01", materialType: "FLEECE", actualPieces: 3 });
apply({ stageId: "STG-01", materialType: "FLANNEL", actualPieces: 3 });
apply({ stageId: "STG-01", materialType: "PUL", actualPieces: 3 });
apply({ stageId: "STG-02", actualPieces: 3 });
apply({ stageId: "STG-03", actualPieces: 3 });
apply({ stageId: "STG-04", actualPieces: 3 });
apply({ stageId: "STG-05", actualPieces: 1 });
apply({ stageId: "STG-07", actualPieces: 3 });
apply({ stageId: "STG-08", actualPieces: 3 });
apply({ stageId: "STG-09", productionActivity: "PINNING", actualPieces: 3 });
apply({ stageId: "STG-09", productionActivity: "FOLDING", actualPieces: 3 });
apply({ stageId: "STG-10", actualPieces: 1 });

for (const key of WIP_KEYS) {
  const expected = key === "finishedPacks" ? 1 : 0;
  if (balance[key] !== expected) throw new Error(`${key}: expected ${expected}, received ${balance[key]}`);
}

let legacy = emptyWipBalance("GLOBAL");
legacy = applyWipEntry(legacy, { stageId: "STG-05", combinedStageComponent: "CUTTING", actualPieces: 2 });
legacy = applyWipEntry(legacy, { stageId: "STG-05", combinedStageComponent: "MAKING", actualPieces: 2 });
if (legacy.pouchCut !== 0 || legacy.pouchMade !== 2) throw new Error("Historical Stage 5/6 mapping changed its WIP meaning.");

console.log("WIP flow check passed through every canonical stage, including the historical Stage 5/6 mapping.");
