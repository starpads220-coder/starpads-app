import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { renderToStream } from "@react-pdf/renderer";
import React from "react";
import { ProductionPDF } from "@/components/reports/ProductionPDF";
import { StoragePDF } from "@/components/reports/StoragePDF";
import { SalesPDF } from "@/components/reports/SalesPDF";
import { ExpensesPDF } from "@/components/reports/ExpensesPDF";
import { AnalyticsPDF } from "@/components/reports/AnalyticsPDF";
import { PaymentsPDF } from "@/components/reports/PaymentsPDF";
import { WorkerPDF } from "@/components/reports/WorkerPDF";
import { NssfPDF } from "@/components/reports/NssfPDF";
import { PayeePDF } from "@/components/reports/PayeePDF";
import type { ProductionEntry, SaleTransaction, Expense, StockIn, StockOut, Batch, Employee, Payment } from "@/types";
import type { StageId } from "@/types";
import { computeNssfEmployee, computeNssfBusiness, computePayeeTax, getPayeeBracket } from "@/lib/deductions";

const VALID_SCREENS = ["production", "storage", "sales", "expenses", "analytics", "payments", "worker", "nssf", "payee"] as const;
type Screen = (typeof VALID_SCREENS)[number];

interface EmployeeMap {
  [id: string]: string;
}

function capitalize(s: string): string {
  return s.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

async function fetchEmployees(db: FirebaseFirestore.Firestore): Promise<EmployeeMap> {
  const snap = await db.collection("employees").get();
  const map: EmployeeMap = {};
  snap.docs.forEach((d) => {
    const data = d.data();
    map[d.id] = data.name || d.id;
  });
  return map;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const screen = searchParams.get("screen") as Screen | null;
    const periodType = searchParams.get("periodType") || "daily";
    const startDate = searchParams.get("startDate") || new Date().toISOString().split("T")[0];
    const endDate = searchParams.get("endDate") || startDate;
    const periodLabel = searchParams.get("periodLabel") || startDate;
    const employeeId = searchParams.get("employeeId") || "";

    if (!screen || !VALID_SCREENS.includes(screen)) {
      return new NextResponse(
        `<html><body><h1>Error</h1><p>Invalid or missing screen parameter. Valid: ${VALID_SCREENS.join(", ")}</p></body></html>`,
        { status: 400, headers: { "Content-Type": "text/html" } }
      );
    }

    const db = getAdminDb();
    if (!db) {
      return new NextResponse(
        `<html><body><h1>Error</h1><p>Firebase Admin SDK not configured.</p></body></html>`,
        { status: 500, headers: { "Content-Type": "text/html" } }
      );
    }

    const title = `${capitalize(screen)} Report`;
    const employees = await fetchEmployees(db);

    let pdfElement: React.ReactElement;

    switch (screen) {
      case "production": {
        const entriesSnap = await db
          .collection("productionEntries")
          .where("date", ">=", startDate)
          .where("date", "<=", endDate)
          .orderBy("date", "asc")
          .limit(2000)
          .get();

        let totalPieces = 0;
        let totalEarnings = 0;
        const entries: {
          date: string;
          employeeName: string;
          stageId: string;
          actualPieces: number;
          targetPieces: number;
          earningsUgx: number;
        }[] = [];

        for (const doc of entriesSnap.docs) {
          const d = doc.data() as ProductionEntry;
          totalPieces += d.actualPieces || 0;
          totalEarnings += d.earningsUgx || 0;
          entries.push({
            date: d.date,
            employeeName: employees[d.employeeId] || d.employeeId,
            stageId: d.stageId,
            actualPieces: d.actualPieces || 0,
            targetPieces: d.targetPieces || 0,
            earningsUgx: d.earningsUgx || 0,
          });
        }

        pdfElement = React.createElement(ProductionPDF, {
          title,
          period: periodLabel,
          entries,
          totalPieces,
          totalEarnings,
          totalEntries: entries.length,
        });
        break;
      }

      case "storage": {
        const [stockInsSnap, stockOutsSnap, batchesSnap, prodSnap] = await Promise.all([
          db.collection("stockIns").orderBy("date", "desc").limit(2000).get(),
          db.collection("stockOuts").orderBy("date", "desc").limit(2000).get(),
          db.collection("batches").orderBy("startDate", "desc").limit(100).get(),
          db.collection("productionEntries").orderBy("date", "desc").limit(2000).get(),
        ]);

        const stockIns = stockInsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as StockIn));
        const stockOuts = stockOutsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as StockOut));
        const batches = batchesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Batch));
        const allEntries = prodSnap.docs.map((d) => ({ id: d.id, ...d.data() } as ProductionEntry));

        const PACK_SIZES: Record<string, number> = { HALF_DOZEN: 6, DOZEN: 12, CARTON: 120 };
        const stock: Record<string, number> = { HALF_DOZEN: 0, DOZEN: 0, CARTON: 0 };
        stockIns.forEach((si) => { stock[si.packSize] += si.quantity; });
        stockOuts.forEach((so) => { stock[so.packSize] -= so.quantity; });

        const stockBySize = Object.entries(stock).map(([packSize, quantity]) => ({
          packSize: packSize === "HALF_DOZEN" ? "Half Dozen" : packSize === "DOZEN" ? "Dozen" : "Carton",
          quantity: Math.max(0, quantity),
          pads: Math.max(0, quantity) * (PACK_SIZES[packSize] || 0),
        }));

        const totalPads = stockBySize.reduce((s, item) => s + item.pads, 0);

        const periodStockIns = stockIns.filter((si) => si.date >= startDate && si.date <= endDate);
        const periodStockOuts = stockOuts.filter((so) => so.date >= startDate && so.date <= endDate);
        const stockInTotal = periodStockIns.reduce((s, si) => s + si.quantity * (PACK_SIZES[si.packSize] || 0), 0);
        const stockOutTotal = periodStockOuts.reduce((s, so) => s + so.quantity * (PACK_SIZES[so.packSize] || 0), 0);

        const activeBatch = batches.find((b) => b.status === "ACTIVE");
        const batchPct = activeBatch
          ? Math.min(100, Math.round(((stockIns.filter((si) => si.batchRef === activeBatch.id).reduce((sum, si) => sum + si.quantity * (PACK_SIZES[si.packSize] || 0), 0) / 3) / activeBatch.maxPacks) * 100))
          : 0;

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];
        const recentSalesPads = allEntries.filter((e) => e.date >= sevenDaysAgoStr && e.stageId === "STG-07").reduce((s, e) => s + e.actualPieces, 0);
        const avgDailySales = recentSalesPads / 7;
        const daysOfStock = avgDailySales > 0 ? Math.round(totalPads / avgDailySales) : 999;

        const activities: { date: string; type: "in" | "out"; label: string; value: number }[] = [];
        periodStockIns.slice(0, 10).forEach((si) => {
          activities.push({ date: si.date, type: "in", label: "Stock In", value: si.quantity * (PACK_SIZES[si.packSize] || 0) });
        });
        periodStockOuts.slice(0, 10).forEach((so) => {
          activities.push({ date: so.date, type: "out", label: "Stock Out", value: so.quantity * (PACK_SIZES[so.packSize] || 0) });
        });
        activities.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);

        pdfElement = React.createElement(StoragePDF, {
          title,
          period: periodLabel,
          stockBySize,
          totalPads,
          stockInTotal,
          stockOutTotal,
          activeBatch: activeBatch?.batchNumber || "None",
          batchCompletionPct: batchPct,
          daysOfStock: daysOfStock === 999 ? "\u221E" : daysOfStock,
          recentActivity: activities,
        });
        break;
      }

      case "sales": {
        const salesSnap = await db
          .collection("saleTransactions")
          .where("date", ">=", startDate)
          .where("date", "<=", endDate)
          .orderBy("date", "asc")
          .limit(2000)
          .get();

        const transactions = salesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as SaleTransaction));
        const totalRevenue = transactions.reduce((s, t) => s + (t.totalAmount || 0), 0);
        const totalQuantity = transactions.reduce((s, t) => s + (t.quantitySold || 0), 0);

        const byCustomerType: Record<string, number> = {};
        const byPaymentMethod: Record<string, number> = {};
        transactions.forEach((t) => {
          byCustomerType[t.customerType] = (byCustomerType[t.customerType] || 0) + (t.totalAmount || 0);
          byPaymentMethod[t.paymentMethod] = (byPaymentMethod[t.paymentMethod] || 0) + (t.totalAmount || 0);
        });

        const entries = transactions.map((t) => ({
          date: t.date,
          customerName: t.customerName,
          customerType: t.customerType,
          packSize: t.packSize,
          quantitySold: t.quantitySold || 0,
          unitPrice: t.unitPrice || 0,
          totalAmount: t.totalAmount || 0,
          paymentMethod: t.paymentMethod,
        }));

        pdfElement = React.createElement(SalesPDF, {
          title,
          period: periodLabel,
          entries,
          totalRevenue,
          totalTransactions: transactions.length,
          totalQuantity,
          byCustomerType: Object.entries(byCustomerType).map(([label, value]) => ({ label, value })),
          byPaymentMethod: Object.entries(byPaymentMethod).map(([label, value]) => ({ label, value })),
        });
        break;
      }

      case "expenses": {
        const expensesSnap = await db
          .collection("expenses")
          .where("date", ">=", startDate)
          .where("date", "<=", endDate)
          .orderBy("date", "asc")
          .limit(2000)
          .get();

        const expenses = expensesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Expense));
        const totalExpenses = expenses.reduce((s, e) => s + (e.amountUgx || 0), 0);

        const byCategory: Record<string, number> = {};
        expenses.forEach((e) => {
          byCategory[e.category] = (byCategory[e.category] || 0) + (e.amountUgx || 0);
        });

        const entries = expenses.map((e) => ({
          date: e.date,
          category: e.category,
          description: e.description,
          amountUgx: e.amountUgx || 0,
          paidBy: employees[e.paidBy] || e.paidBy,
        }));

        const topExpenses = [...entries].sort((a, b) => b.amountUgx - a.amountUgx).slice(0, 20);

        pdfElement = React.createElement(ExpensesPDF, {
          title,
          period: periodLabel,
          entries,
          totalExpenses,
          byCategory: Object.entries(byCategory).map(([label, value]) => ({ label, value })),
          topExpenses,
        });
        break;
      }

      case "analytics": {
        const [prodSnap, salesSnap, expSnap, stockInsSnap] = await Promise.all([
          db.collection("productionEntries").where("date", ">=", startDate).where("date", "<=", endDate).orderBy("date", "asc").limit(2000).get(),
          db.collection("saleTransactions").where("date", ">=", startDate).where("date", "<=", endDate).orderBy("date", "asc").limit(2000).get(),
          db.collection("expenses").where("date", ">=", startDate).where("date", "<=", endDate).orderBy("date", "asc").limit(2000).get(),
          db.collection("stockIns").limit(2000).get(),
        ]);

        const prodEntries = prodSnap.docs.map((d) => ({ ...d.data() } as ProductionEntry));
        const salesTransactions = salesSnap.docs.map((d) => ({ ...d.data() } as SaleTransaction));
        const expenses = expSnap.docs.map((d) => ({ ...d.data() } as Expense));
        const allStockIns = stockInsSnap.docs.map((d) => ({ ...d.data() } as StockIn));

        const totalPieces = prodEntries.reduce((s, e) => s + (e.actualPieces || 0), 0);
        const totalRevenue = salesTransactions.reduce((s, t) => s + (t.totalAmount || 0), 0);
        const totalExpenses = expenses.reduce((s, e) => s + (e.amountUgx || 0), 0);
        const netProfit = totalRevenue - totalExpenses;

        const withPerf = prodEntries.filter((e) => e.performancePct > 0);
        const avgPerformance = withPerf.length > 0 ? Math.round(withPerf.reduce((s, e) => s + e.performancePct, 0) / withPerf.length) : 0;

        const uniqueWorkers = new Set(prodEntries.map((e) => e.employeeId)).size;

        const PACK_SIZES: Record<string, number> = { HALF_DOZEN: 6, DOZEN: 12, CARTON: 60 };
        const stockPadsTotal = allStockIns.reduce((s, si) => s + (si.quantity || 0) * (PACK_SIZES[si.packSize] || 0), 0);

        pdfElement = React.createElement(AnalyticsPDF, {
          title,
          period: periodLabel,
          totalPieces,
          totalRevenue,
          totalExpenses,
          netProfit,
          avgPerformance,
          totalWorkers: uniqueWorkers,
          totalEntries: prodEntries.length,
          stockPadsTotal,
        });
        break;
      }

      case "payments": {
        const entriesSnap = await db
          .collection("productionEntries")
          .where("date", ">=", startDate)
          .where("date", "<=", endDate)
          .orderBy("date", "asc")
          .limit(2000)
          .get();

        const prodEntries = entriesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as ProductionEntry));

        let totalDue = 0;
        let totalPaid = 0;
        let totalPieces = 0;
        let totalNssfEmployee = 0;
        let totalNssfBusiness = 0;
        let totalPayee = 0;
        const workerMap: Record<string, { due: number; paid: number; count: number; name: string }> = {};

        prodEntries.forEach((e) => {
          totalPieces += e.actualPieces || 0;
          if (!workerMap[e.employeeId]) {
            workerMap[e.employeeId] = { due: 0, paid: 0, count: 0, name: employees[e.employeeId] || e.employeeId };
          }
          workerMap[e.employeeId].count += 1;
          if (e.paymentStatus === "paid") {
            totalPaid += e.earningsUgx || 0;
            workerMap[e.employeeId].paid += e.earningsUgx || 0;
          } else {
            totalDue += e.earningsUgx || 0;
            workerMap[e.employeeId].due += e.earningsUgx || 0;
          }
        });

        const workerBreakdown = Object.entries(workerMap).map(([, w]) => {
          const gross = w.due + w.paid;
          const nssfEmp = computeNssfEmployee(gross);
          const nssfBus = computeNssfBusiness(gross);
          const payee = computePayeeTax(gross);
          totalNssfEmployee += nssfEmp;
          totalNssfBusiness += nssfBus;
          totalPayee += payee;
          return {
            employeeName: w.name,
            totalDue: w.due,
            totalPaid: w.paid,
            entriesCount: w.count,
            nssfEmployee: nssfEmp,
            nssfBusiness: nssfBus,
            payeeTax: payee,
            netPay: gross - nssfEmp - payee,
          };
        });

        const entries = prodEntries.map((e) => {
          const gross = e.earningsUgx || 0;
          const nssfEmp = computeNssfEmployee(gross);
          const payee = computePayeeTax(gross);
          return {
            date: e.date,
            employeeName: employees[e.employeeId] || e.employeeId,
            stageId: e.stageId,
            actualPieces: e.actualPieces || 0,
            earningsUgx: gross,
            status: e.paymentStatus === "paid" ? "Paid" : "Due",
            nssfEmployee: nssfEmp,
            payeeTax: payee,
            netPay: gross - nssfEmp - payee,
          };
        });

        const totalAmount = totalDue + totalPaid;
        const paidRatio = totalAmount > 0 ? Math.round((totalPaid / totalAmount) * 100) : 0;

        pdfElement = React.createElement(PaymentsPDF, {
          title,
          period: periodLabel,
          totalDue,
          totalPaid,
          totalPieces,
          workerCount: Object.keys(workerMap).length,
          paidRatio,
          totalNssfEmployee,
          totalNssfBusiness,
          totalPayee,
          workerBreakdown,
          entries,
        });
        break;
      }

      case "worker": {
        if (!employeeId) {
          return new NextResponse(
            `<html><body><h1>Error</h1><p>employeeId parameter is required for worker screen.</p></body></html>`,
            { status: 400, headers: { "Content-Type": "text/html" } }
          );
        }

        const [employeeSnap, entriesSnap, paymentsSnap] = await Promise.all([
          db.collection("employees").doc(employeeId).get(),
          db
            .collection("productionEntries")
            .where("employeeId", "==", employeeId)
            .where("date", ">=", startDate)
            .where("date", "<=", endDate)
            .orderBy("date", "desc")
            .limit(2000)
            .get(),
          db
            .collection("payments")
            .where("employeeId", "==", employeeId)
            .orderBy("paidDate", "desc")
            .limit(100)
            .get(),
        ]);

        const empData = employeeSnap.exists ? ({ id: employeeSnap.id, ...employeeSnap.data() } as Employee) : null;
        const prodEntries = entriesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as ProductionEntry));
        const paymentsList = paymentsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Payment));

        let totalActual = 0;
        let totalTarget = 0;
        let totalEarnings = 0;
        let totalNssfEmployee = 0;
        let totalNssfBusiness = 0;
        let totalPayee = 0;
        const stageMap: Record<string, number> = {};
        const daysSet = new Set<string>();

        prodEntries.forEach((e) => {
          totalActual += e.actualPieces || 0;
          totalTarget += e.targetPieces || 0;
          totalEarnings += e.earningsUgx || 0;
          daysSet.add(e.date);
          const sid = e.stageId as StageId;
          const label = sid;
          stageMap[label] = (stageMap[label] || 0) + (e.actualPieces || 0);
        });

        const performancePct = totalTarget > 0 ? Math.round((totalActual / totalTarget) * 100) : 0;

        const stageDistribution = Object.entries(stageMap)
          .map(([sid, value]) => ({ label: sid, value }))
          .sort((a, b) => b.value - a.value);

        const paymentHistory = prodEntries.map((e) => {
          const gross = e.earningsUgx || 0;
          const nssfEmp = computeNssfEmployee(gross);
          const nssfBus = computeNssfBusiness(gross);
          const payee = computePayeeTax(gross);
          totalNssfEmployee += nssfEmp;
          totalNssfBusiness += nssfBus;
          totalPayee += payee;
          return {
            date: e.date,
            stageId: e.stageId,
            actualPieces: e.actualPieces || 0,
            earningsUgx: gross,
            status: e.paymentStatus === "paid" ? "Paid" : "Due",
            nssfEmployee: nssfEmp,
            nssfBusiness: nssfBus,
            payeeTax: payee,
            netPay: gross - nssfEmp - payee,
          };
        });

        const totalNetPay = totalEarnings - totalNssfEmployee - totalPayee;

        pdfElement = React.createElement(WorkerPDF, {
          title,
          period: periodLabel,
          employeeName: empData?.name || employeeId,
          employeeRole: empData?.role?.replace(/_/g, " ") || "",
          totalActual,
          totalTarget,
          performancePct,
          totalEarnings,
          totalNssfEmployee,
          totalNssfBusiness,
          totalPayee,
          totalNetPay,
          daysWorked: daysSet.size,
          entriesCount: prodEntries.length,
          stageDistribution,
          paymentHistory,
        });
        break;
      }

      case "nssf": {
        let queryNssf: FirebaseFirestore.Query = db
          .collection("productionEntries")
          .where("date", ">=", startDate)
          .where("date", "<=", endDate);
        if (employeeId) {
          queryNssf = queryNssf.where("employeeId", "==", employeeId);
        }
        const entriesSnapNssf = await queryNssf.orderBy("date", "asc").limit(2000).get();

        const prodEntriesNssf = entriesSnapNssf.docs.map((d) => ({ id: d.id, ...d.data() } as ProductionEntry));

        const nssfWorkerMap: Record<string, { gross: number; name: string }> = {};
        prodEntriesNssf.forEach((e) => {
          if (!nssfWorkerMap[e.employeeId]) {
            nssfWorkerMap[e.employeeId] = { gross: 0, name: employees[e.employeeId] || e.employeeId };
          }
          nssfWorkerMap[e.employeeId].gross += e.earningsUgx || 0;
        });

        const nssfRows = Object.entries(nssfWorkerMap).map(([, w]) => {
          const empDed = computeNssfEmployee(w.gross);
          const busCont = computeNssfBusiness(w.gross);
          return {
            employeeName: w.name,
            grossAmount: w.gross,
            employeeDeduction: empDed,
            businessContribution: busCont,
          };
        });

        const totalEmpDed = nssfRows.reduce((s, r) => s + r.employeeDeduction, 0);
        const totalBusCont = nssfRows.reduce((s, r) => s + r.businessContribution, 0);

        pdfElement = React.createElement(NssfPDF, {
          title,
          period: periodLabel,
          rows: nssfRows,
          totalEmployeeDeductions: totalEmpDed,
          totalBusinessContributions: totalBusCont,
          totalCombined: totalEmpDed + totalBusCont,
        });
        break;
      }

      case "payee": {
        let queryPayee: FirebaseFirestore.Query = db
          .collection("productionEntries")
          .where("date", ">=", startDate)
          .where("date", "<=", endDate);
        if (employeeId) {
          queryPayee = queryPayee.where("employeeId", "==", employeeId);
        }
        const entriesSnapPayee = await queryPayee.orderBy("date", "asc").limit(2000).get();

        const prodEntriesPayee = entriesSnapPayee.docs.map((d) => ({ id: d.id, ...d.data() } as ProductionEntry));

        const payeeWorkerMap: Record<string, { gross: number; name: string }> = {};
        prodEntriesPayee.forEach((e) => {
          if (!payeeWorkerMap[e.employeeId]) {
            payeeWorkerMap[e.employeeId] = { gross: 0, name: employees[e.employeeId] || e.employeeId };
          }
          payeeWorkerMap[e.employeeId].gross += e.earningsUgx || 0;
        });

        const payeeRows = Object.entries(payeeWorkerMap).map(([, w]) => {
          const bracket = getPayeeBracket(w.gross);
          const tax = computePayeeTax(w.gross);
          return {
            employeeName: w.name,
            grossAmount: w.gross,
            bracketLabel: bracket.label,
            bracketRate: bracket.rate,
            payeeTax: tax,
          };
        });

        const totalPayeeCollected = payeeRows.reduce((s, r) => s + r.payeeTax, 0);
        const taxableCount = payeeRows.filter((r) => r.payeeTax > 0).length;
        const taxFreeCount = payeeRows.length - taxableCount;

        pdfElement = React.createElement(PayeePDF, {
          title,
          period: periodLabel,
          rows: payeeRows,
          totalPayee: totalPayeeCollected,
          taxableCount,
          taxFreeCount,
        });
        break;
      }

      default:
        return new NextResponse(
          `<html><body><h1>Error</h1><p>Unknown screen: ${screen}</p></body></html>`,
          { status: 400, headers: { "Content-Type": "text/html" } }
        );
    }

    const stream = await renderToStream(pdfElement as React.ReactElement<any>);

    return new NextResponse(stream as unknown as ReadableStream, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${screen}-report-${startDate}.pdf"`,
      },
    });
  } catch (error) {
    return new NextResponse(
      `<html><body><h1>Error</h1><p>${(error as Error).message}</p></body></html>`,
      { status: 500, headers: { "Content-Type": "text/html" } }
    );
  }
}
