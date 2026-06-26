import React from "react";
import { Page, Text, View, Document } from "@react-pdf/renderer";
import { pdfStyles, colWidth } from "./PDFStyles";

interface WorkerPayment {
  employeeName: string;
  totalDue: number;
  totalPaid: number;
  entriesCount: number;
  nssfEmployee: number;
  nssfBusiness: number;
  payeeTax: number;
  netPay: number;
}

interface PaymentEntry {
  date: string;
  employeeName: string;
  stageId: string;
  actualPieces: number;
  earningsUgx: number;
  status: string;
  nssfEmployee: number;
  payeeTax: number;
  netPay: number;
}

interface PaymentsPDFProps {
  title: string;
  period: string;
  totalDue: number;
  totalPaid: number;
  totalPieces: number;
  workerCount: number;
  paidRatio: number;
  totalNssfEmployee: number;
  totalNssfBusiness: number;
  totalPayee: number;
  workerBreakdown: WorkerPayment[];
  entries: PaymentEntry[];
}

export function PaymentsPDF({
  title, period, totalDue, totalPaid, totalPieces, workerCount, paidRatio,
  totalNssfEmployee, totalNssfBusiness, totalPayee, workerBreakdown, entries,
}: PaymentsPDFProps) {
  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.header}>
          <Text style={pdfStyles.title}>Star Durable Pads</Text>
          <Text style={pdfStyles.subtitle}>{title} &mdash; {period}</Text>
        </View>

        <View style={pdfStyles.summaryBox}>
          <Text style={pdfStyles.summaryTitle}>Payments Summary</Text>
          <View style={pdfStyles.summaryRow}>
            <Text style={pdfStyles.summaryLabel}>Total Due</Text>
            <Text style={pdfStyles.summaryValue}>UGX {totalDue.toLocaleString()}</Text>
          </View>
          <View style={pdfStyles.summaryRow}>
            <Text style={pdfStyles.summaryLabel}>Total Paid</Text>
            <Text style={pdfStyles.summaryValue}>UGX {totalPaid.toLocaleString()}</Text>
          </View>
          <View style={pdfStyles.summaryRow}>
            <Text style={pdfStyles.summaryLabel}>Total Pieces</Text>
            <Text style={pdfStyles.summaryValue}>{totalPieces.toLocaleString()}</Text>
          </View>
          <View style={pdfStyles.summaryRow}>
            <Text style={pdfStyles.summaryLabel}>Worker Count</Text>
            <Text style={pdfStyles.summaryValue}>{workerCount}</Text>
          </View>
          <View style={pdfStyles.summaryRow}>
            <Text style={pdfStyles.summaryLabel}>Payment Ratio</Text>
            <Text style={pdfStyles.summaryValue}>{paidRatio}%</Text>
          </View>
          <View style={{ borderTopWidth: 1, borderTopColor: "#d1d5db", marginVertical: 6, paddingTop: 4 }}>
            <Text style={{ fontSize: 10, fontWeight: "bold", color: "#374151", marginBottom: 3 }}>Deductions Summary</Text>
            <View style={pdfStyles.summaryRow}>
              <Text style={pdfStyles.summaryLabel}>Total NSSF Employee (5%)</Text>
              <Text style={{ fontSize: 11, fontWeight: "bold", color: "#dc2626" }}>UGX {totalNssfEmployee.toLocaleString()}</Text>
            </View>
            <View style={pdfStyles.summaryRow}>
              <Text style={pdfStyles.summaryLabel}>Total NSSF Business (10%)</Text>
              <Text style={{ fontSize: 11, fontWeight: "bold", color: "#2563eb" }}>UGX {totalNssfBusiness.toLocaleString()}</Text>
            </View>
            <View style={pdfStyles.summaryRow}>
              <Text style={pdfStyles.summaryLabel}>Total PAYEE Tax</Text>
              <Text style={{ fontSize: 11, fontWeight: "bold", color: "#dc2626" }}>UGX {totalPayee.toLocaleString()}</Text>
            </View>
          </View>
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Worker Breakdown</Text>
          <View style={pdfStyles.table}>
            <View style={pdfStyles.tableRow}>
              <View style={{ ...pdfStyles.tableColHeader, width: colWidth(18) }}><Text style={pdfStyles.tableCellHeader}>Worker</Text></View>
              <View style={{ ...pdfStyles.tableColHeader, width: colWidth(11) }}><Text style={pdfStyles.tableCellHeader}>Entries</Text></View>
              <View style={{ ...pdfStyles.tableColHeader, width: colWidth(13) }}><Text style={pdfStyles.tableCellHeader}>Gross (UGX)</Text></View>
              <View style={{ ...pdfStyles.tableColHeader, width: colWidth(12) }}><Text style={pdfStyles.tableCellHeader}>NSSF Emp</Text></View>
              <View style={{ ...pdfStyles.tableColHeader, width: colWidth(12) }}><Text style={pdfStyles.tableCellHeader}>NSSF Bus</Text></View>
              <View style={{ ...pdfStyles.tableColHeader, width: colWidth(12) }}><Text style={pdfStyles.tableCellHeader}>PAYEE</Text></View>
              <View style={{ ...pdfStyles.tableColHeader, width: colWidth(12) }}><Text style={pdfStyles.tableCellHeader}>Net Pay</Text></View>
              <View style={{ ...pdfStyles.tableColHeader, width: colWidth(10) }}><Text style={pdfStyles.tableCellHeader}>Status</Text></View>
            </View>
            {workerBreakdown.length === 0 ? (
              <View style={pdfStyles.tableRow}>
                <View style={{ ...pdfStyles.tableCol, width: "100%" }}><Text style={pdfStyles.tableCell}>No payment data found.</Text></View>
              </View>
            ) : (
              workerBreakdown.map((w, i) => (
                <View style={pdfStyles.tableRow} key={i}>
                  <View style={{ ...pdfStyles.tableCol, width: colWidth(18) }}><Text style={pdfStyles.tableCell}>{w.employeeName}</Text></View>
                  <View style={{ ...pdfStyles.tableCol, width: colWidth(11) }}><Text style={pdfStyles.tableCell}>{w.entriesCount}</Text></View>
                  <View style={{ ...pdfStyles.tableCol, width: colWidth(13) }}><Text style={pdfStyles.tableCell}>{(w.totalDue + w.totalPaid).toLocaleString()}</Text></View>
                  <View style={{ ...pdfStyles.tableCol, width: colWidth(12) }}><Text style={pdfStyles.tableCell}>{w.nssfEmployee.toLocaleString()}</Text></View>
                  <View style={{ ...pdfStyles.tableCol, width: colWidth(12) }}><Text style={pdfStyles.tableCell}>{w.nssfBusiness.toLocaleString()}</Text></View>
                  <View style={{ ...pdfStyles.tableCol, width: colWidth(12) }}><Text style={pdfStyles.tableCell}>{w.payeeTax.toLocaleString()}</Text></View>
                  <View style={{ ...pdfStyles.tableCol, width: colWidth(12) }}><Text style={pdfStyles.tableCell}>{w.netPay.toLocaleString()}</Text></View>
                  <View style={{ ...pdfStyles.tableCol, width: colWidth(10) }}><Text style={pdfStyles.tableCell}>{w.totalDue === 0 ? "Paid" : "Partial"}</Text></View>
                </View>
              ))
            )}
          </View>
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Payment Entries</Text>
          <View style={pdfStyles.table}>
            <View style={pdfStyles.tableRow}>
              <View style={{ ...pdfStyles.tableColHeader, width: colWidth(11) }}><Text style={pdfStyles.tableCellHeader}>Date</Text></View>
              <View style={{ ...pdfStyles.tableColHeader, width: colWidth(16) }}><Text style={pdfStyles.tableCellHeader}>Worker</Text></View>
              <View style={{ ...pdfStyles.tableColHeader, width: colWidth(16) }}><Text style={pdfStyles.tableCellHeader}>Stage</Text></View>
              <View style={{ ...pdfStyles.tableColHeader, width: colWidth(10) }}><Text style={pdfStyles.tableCellHeader}>Pieces</Text></View>
              <View style={{ ...pdfStyles.tableColHeader, width: colWidth(13) }}><Text style={pdfStyles.tableCellHeader}>Earnings</Text></View>
              <View style={{ ...pdfStyles.tableColHeader, width: colWidth(10) }}><Text style={pdfStyles.tableCellHeader}>NSSF Emp</Text></View>
              <View style={{ ...pdfStyles.tableColHeader, width: colWidth(10) }}><Text style={pdfStyles.tableCellHeader}>PAYEE</Text></View>
              <View style={{ ...pdfStyles.tableColHeader, width: colWidth(10) }}><Text style={pdfStyles.tableCellHeader}>Net Pay</Text></View>
              <View style={{ ...pdfStyles.tableColHeader, width: colWidth(10) }}><Text style={pdfStyles.tableCellHeader}>Status</Text></View>
            </View>
            {entries.length === 0 ? (
              <View style={pdfStyles.tableRow}>
                <View style={{ ...pdfStyles.tableCol, width: "100%" }}><Text style={pdfStyles.tableCell}>No entries found.</Text></View>
              </View>
            ) : (
              entries.slice(0, 100).map((e, i) => (
                <View style={pdfStyles.tableRow} key={i}>
                  <View style={{ ...pdfStyles.tableCol, width: colWidth(11) }}><Text style={pdfStyles.tableCell}>{e.date}</Text></View>
                  <View style={{ ...pdfStyles.tableCol, width: colWidth(16) }}><Text style={pdfStyles.tableCell}>{e.employeeName}</Text></View>
                  <View style={{ ...pdfStyles.tableCol, width: colWidth(16) }}><Text style={pdfStyles.tableCell}>{e.stageId}</Text></View>
                  <View style={{ ...pdfStyles.tableCol, width: colWidth(10) }}><Text style={pdfStyles.tableCell}>{e.actualPieces}</Text></View>
                  <View style={{ ...pdfStyles.tableCol, width: colWidth(13) }}><Text style={pdfStyles.tableCell}>UGX {e.earningsUgx.toLocaleString()}</Text></View>
                  <View style={{ ...pdfStyles.tableCol, width: colWidth(10) }}><Text style={pdfStyles.tableCell}>{e.nssfEmployee.toLocaleString()}</Text></View>
                  <View style={{ ...pdfStyles.tableCol, width: colWidth(10) }}><Text style={pdfStyles.tableCell}>{e.payeeTax.toLocaleString()}</Text></View>
                  <View style={{ ...pdfStyles.tableCol, width: colWidth(10) }}><Text style={pdfStyles.tableCell}>UGX {e.netPay.toLocaleString()}</Text></View>
                  <View style={{ ...pdfStyles.tableCol, width: colWidth(10) }}><Text style={pdfStyles.tableCell}>{e.status}</Text></View>
                </View>
              ))
            )}
          </View>
          {entries.length > 100 && (
            <Text style={{ fontSize: 9, color: "#999", marginTop: 4 }}>
              Showing 100 of {entries.length} entries.
            </Text>
          )}
        </View>

        <View style={pdfStyles.signature}>
          <Text style={pdfStyles.signatureLine}>Authorised Signature</Text>
        </View>

        <Text style={pdfStyles.footer} fixed>
          Generated on {new Date().toLocaleString()} &mdash; Page 1
        </Text>
      </Page>
    </Document>
  );
}
