const path = require("path");
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const paymentIds = [
  "DTKpq4T2lsxzGJ4shUwh",
  "R9Y0cItxQ26dvzz0FqE0",
  "v7UCevyclbMbn8us4uax",
  "NvClwlNaQw0FyuWjDWeF",
  "NORwaojZM3Crrirva9Zr",
];
const apply = process.argv.includes("--apply");
const key = require(path.resolve(__dirname, "../starpads-automation-firebase-adminsdk-fbsvc-e002811af9.json"));
const db = getFirestore(initializeApp({ credential: cert(key) }));

async function main() {
  const snapshots = await Promise.all(paymentIds.map(id => db.collection("payments").doc(id).get()));
  const rows = snapshots.map(snapshot => {
    if (!snapshot.exists) throw new Error(`Payment ${snapshot.id} no longer exists.`);
    const data = snapshot.data();
    if (data.paidDate !== "2026-11-08" || String(data.periodEnd ?? "") > "2026-06-30" || data.paymentSourceCode !== "1000") {
      throw new Error(`Payment ${snapshot.id} no longer matches the audited historical set.`);
    }
    return { id: snapshot.id, data };
  });
  const totals = rows.reduce((sum, row) => {
    sum.gross += Number(row.data.grossAmount) || 0;
    sum.bank += Number(row.data.netPayAmount) || 0;
    sum.paye += Number(row.data.payeeTax) || 0;
    sum.nssf += (Number(row.data.nssfEmployeeDeduction) || 0) + (Number(row.data.nssfBusinessContribution) || 0);
    return sum;
  }, { gross: 0, bank: 0, paye: 0, nssf: 0 });

  console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", paymentIds, totals }, null, 2));
  if (!apply) return;
  const batch = db.batch();
  rows.forEach(row => batch.update(db.collection("payments").doc(row.id), {
    accountingTreatment: "historical_already_settled",
    accountingTreatmentReason: "June 2026 payroll was settled before the current payroll accounting workflow; confirmation retained only to close imported due production entries.",
    accountingTreatmentSetAt: FieldValue.serverTimestamp(),
    accountingTreatmentSetBy: "controlled-migration-2026-11-08",
  }));
  await batch.commit();
  console.log(`Classified ${rows.length} historical payments without changing their paid status or linked production entries.`);
}

main().then(() => process.exit(0)).catch(error => { console.error(error.message); process.exit(1); });
