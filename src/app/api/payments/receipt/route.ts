import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { renderToStream } from "@react-pdf/renderer";
import type { DocumentProps } from "@react-pdf/renderer";
import { PaymentReceiptPDF } from "@/components/payments/PaymentReceiptPDF";
import React from "react";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get("paymentId");
    if (!paymentId) {
      return new NextResponse("Missing paymentId", { status: 400 });
    }

    const db = getAdminDb();
    if (!db) {
      return new NextResponse("Firebase Admin SDK not configured", { status: 500 });
    }

    const paymentSnap = await db.collection("payments").doc(paymentId).get();
    if (!paymentSnap.exists) {
      return new NextResponse("Payment not found", { status: 404 });
    }
    const payment = paymentSnap.data()!;

    const employeeSnap = await db.collection("employees").doc(payment.employeeId).get();
    const employee = employeeSnap.exists ? employeeSnap.data()! : { name: payment.employeeId, role: "" };

    const entriesSnap = await db
      .collection("productionEntries")
      .where("employeeId", "==", payment.employeeId)
      .where("paymentId", "==", paymentId)
      .orderBy("date", "asc")
      .get();

    const entries = entriesSnap.docs.map((d) => ({
      date: d.data().date,
      stageId: d.data().stageId,
      actualPieces: d.data().actualPieces || 0,
      earningsUgx: d.data().earningsUgx || 0,
    }));

    const gross = payment.grossAmount || payment.totalAmount || 0;
    const nssfEmp = payment.nssfEmployeeDeduction || 0;
    const nssfBus = payment.nssfBusinessContribution || 0;
    const payee = payment.payeeTax || 0;
    const netPay = payment.netPayAmount || (gross - nssfEmp - payee);

    const props: React.ComponentProps<typeof PaymentReceiptPDF> = {
      receiptNumber: payment.receiptNumber || paymentId,
      employeeName: employee.name || payment.employeeId,
      employeeRole: employee.role ? employee.role.replace(/_/g, " ") : "",
      periodStart: payment.periodStart,
      periodEnd: payment.periodEnd,
      paidDate: payment.paidDate || "",
      entries,
      grossAmount: gross,
      nssfEmployeeDeduction: nssfEmp,
      nssfBusinessContribution: nssfBus,
      payeeTax: payee,
      netPayAmount: netPay,
      totalAmount: gross,
    };
    const el = React.createElement(PaymentReceiptPDF, props);
    const stream = await renderToStream(el as React.ReactElement<DocumentProps>);

    return new NextResponse(stream as unknown as ReadableStream, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="receipt-${paymentId}.pdf"`,
      },
    });
  } catch (error) {
    return new NextResponse(
      `<html><body><h1>Error</h1><p>${(error as Error).message}</p></body></html>`,
      { status: 500, headers: { "Content-Type": "text/html" } }
    );
  }
}
