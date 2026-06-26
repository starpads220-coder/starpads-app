import React from "react";
import { Page, Text, View, Document, StyleSheet } from "@react-pdf/renderer";
import { StageId, STAGE_LABELS } from "@/types";

const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#ffffff",
    padding: 30,
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: "#111",
    paddingBottom: 10,
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
    textAlign: "center",
  },
  receiptBadge: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#059669",
    textAlign: "center",
    marginTop: 8,
    padding: 6,
    borderWidth: 1,
    borderColor: "#059669",
    borderRadius: 4,
  },
  infoSection: {
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
    fontSize: 11,
  },
  infoLabel: {
    color: "#666",
    width: "30%",
  },
  infoValue: {
    fontWeight: "bold",
    width: "65%",
  },
  table: {
    display: "flex",
    width: "auto",
    borderStyle: "solid",
    borderWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    marginBottom: 20,
  },
  tableRow: {
    margin: "auto",
    flexDirection: "row",
  },
  tableColHeader: {
    width: "20%",
    borderStyle: "solid",
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    backgroundColor: "#374151",
  },
  tableCol: {
    width: "20%",
    borderStyle: "solid",
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  tableColTotal: {
    width: "20%",
    borderStyle: "solid",
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    backgroundColor: "#f3f4f6",
  },
  tableCellHeader: {
    margin: 5,
    fontSize: 10,
    fontWeight: "bold",
    color: "#ffffff",
  },
  tableCell: {
    margin: 5,
    fontSize: 9,
  },
  tableCellBold: {
    margin: 5,
    fontSize: 9,
    fontWeight: "bold",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 30,
    paddingTop: 10,
    borderTopWidth: 2,
    borderTopColor: "#111",
  },
  totalText: {
    fontSize: 14,
    fontWeight: "bold",
  },
  amountPaid: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#059669",
    textAlign: "center",
    marginBottom: 30,
  },
  signature: {
    marginTop: 40,
  },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: "#333",
    width: 200,
    paddingTop: 4,
    fontSize: 10,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: "center",
    fontSize: 10,
    color: "#999",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 10,
  },
});

interface ReceiptEntry {
  date: string;
  stageId: string;
  actualPieces: number;
  earningsUgx: number;
}

interface PaymentReceiptPDFProps {
  receiptNumber: string;
  employeeName: string;
  employeeRole: string;
  periodStart: string;
  periodEnd: string;
  paidDate: string;
  entries: ReceiptEntry[];
  grossAmount: number;
  nssfEmployeeDeduction: number;
  nssfBusinessContribution: number;
  payeeTax: number;
  netPayAmount: number;
  totalAmount: number;
}

export const PaymentReceiptPDF = ({
  receiptNumber,
  employeeName,
  employeeRole,
  periodStart,
  periodEnd,
  paidDate,
  entries,
  grossAmount,
  nssfEmployeeDeduction,
  nssfBusinessContribution,
  payeeTax,
  netPayAmount,
  totalAmount,
}: PaymentReceiptPDFProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>Star Durable Pads</Text>
        <Text style={styles.subtitle}>Payment Acknowledgement Receipt</Text>
        <Text style={styles.receiptBadge}>{receiptNumber}</Text>
      </View>

      <View style={styles.infoSection}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Employee:</Text>
          <Text style={styles.infoValue}>{employeeName}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Role:</Text>
          <Text style={styles.infoValue}>{employeeRole}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Period:</Text>
          <Text style={styles.infoValue}>{periodStart} to {periodEnd}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Date Paid:</Text>
          <Text style={styles.infoValue}>{paidDate}</Text>
        </View>
      </View>

      <View style={styles.table}>
        <View style={styles.tableRow}>
          <View style={styles.tableColHeader}><Text style={styles.tableCellHeader}>Date</Text></View>
          <View style={styles.tableColHeader}><Text style={styles.tableCellHeader}>Stage</Text></View>
          <View style={styles.tableColHeader}><Text style={styles.tableCellHeader}>Pieces</Text></View>
          <View style={styles.tableColHeader}><Text style={styles.tableCellHeader}>Earnings (UGX)</Text></View>
        </View>

        {entries.map((entry, i) => {
          const stageLabel = STAGE_LABELS[entry.stageId as StageId] ?? entry.stageId;
          return (
            <View style={styles.tableRow} key={i}>
              <View style={styles.tableCol}><Text style={styles.tableCell}>{entry.date}</Text></View>
              <View style={styles.tableCol}><Text style={styles.tableCell}>{stageLabel}</Text></View>
              <View style={styles.tableCol}><Text style={styles.tableCell}>{entry.actualPieces}</Text></View>
              <View style={styles.tableCol}><Text style={styles.tableCell}>{entry.earningsUgx.toLocaleString()}</Text></View>
            </View>
          );
        })}
      </View>

      <View style={{ ...styles.totalRow, flexDirection: "column", alignItems: "stretch", marginBottom: 20 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
          <Text style={{ fontSize: 11, color: "#666" }}>Gross Earnings</Text>
          <Text style={{ fontSize: 11, fontWeight: "bold" }}>UGX {grossAmount.toLocaleString()}</Text>
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
          <Text style={{ fontSize: 11, color: "#666" }}>NSSF Employee Deduction (5%)</Text>
          <Text style={{ fontSize: 11, fontWeight: "bold", color: "#dc2626" }}>- UGX {nssfEmployeeDeduction.toLocaleString()}</Text>
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
          <Text style={{ fontSize: 11, color: "#666" }}>PAYEE Tax</Text>
          <Text style={{ fontSize: 11, fontWeight: "bold", color: "#dc2626" }}>- UGX {payeeTax.toLocaleString()}</Text>
        </View>
        <View style={{ borderTopWidth: 1, borderTopColor: "#111", paddingTop: 4, marginTop: 2, flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ fontSize: 13, fontWeight: "bold" }}>Net Pay</Text>
          <Text style={{ fontSize: 13, fontWeight: "bold", color: "#059669" }}>UGX {netPayAmount.toLocaleString()}</Text>
        </View>
        <View style={{ borderTopWidth: 1, borderTopColor: "#e5e7eb", borderStyle: "dashed", paddingTop: 4, marginTop: 4, flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ fontSize: 10, color: "#999", fontStyle: "italic" }}>NSSF Business Contribution (10% — paid by employer)</Text>
          <Text style={{ fontSize: 10, fontWeight: "bold", color: "#2563eb" }}>UGX {nssfBusinessContribution.toLocaleString()}</Text>
        </View>
      </View>

      <Text style={styles.amountPaid}>
        Total Paid: UGX {totalAmount.toLocaleString()}
      </Text>

      <View style={styles.signature}>
        <Text style={styles.signatureLine}>Authorised Signature</Text>
      </View>

      <Text style={styles.footer} fixed>
        Generated on {new Date().toLocaleDateString()} — {receiptNumber}
      </Text>
    </Page>
  </Document>
);
