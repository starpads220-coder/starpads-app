import React from "react";
import { Page, Text, View, Document } from "@react-pdf/renderer";
import { pdfStyles, colWidth } from "./PDFStyles";
import { STAGE_LABELS } from "@/types";
import type { StageId } from "@/types";

interface WorkerStageData {
  label: string;
  value: number;
}

interface WorkerPaymentRec {
  date: string;
  stageId: string;
  actualPieces: number;
  earningsUgx: number;
  status: string;
}

interface WorkerPDFProps {
  title: string;
  period: string;
  employeeName: string;
  employeeRole: string;
  totalActual: number;
  totalTarget: number;
  performancePct: number;
  totalEarnings: number;
  daysWorked: number;
  entriesCount: number;
  stageDistribution: WorkerStageData[];
  paymentHistory: WorkerPaymentRec[];
}

export function WorkerPDF({
  title, period, employeeName, employeeRole, totalActual, totalTarget,
  performancePct, totalEarnings, daysWorked, entriesCount,
  stageDistribution, paymentHistory,
}: WorkerPDFProps) {
  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.header}>
          <Text style={pdfStyles.title}>Star Durable Pads</Text>
          <Text style={pdfStyles.subtitle}>{title} &mdash; {period}</Text>
        </View>

        <View style={pdfStyles.summaryBox}>
          <Text style={pdfStyles.summaryTitle}>Employee Summary</Text>
          <View style={pdfStyles.summaryRow}>
            <Text style={pdfStyles.summaryLabel}>Employee</Text>
            <Text style={pdfStyles.summaryValue}>{employeeName}</Text>
          </View>
          <View style={pdfStyles.summaryRow}>
            <Text style={pdfStyles.summaryLabel}>Role</Text>
            <Text style={pdfStyles.summaryValue}>{employeeRole}</Text>
          </View>
          <View style={pdfStyles.summaryRow}>
            <Text style={pdfStyles.summaryLabel}>Total Pieces</Text>
            <Text style={pdfStyles.summaryValue}>{totalActual.toLocaleString()}</Text>
          </View>
          <View style={pdfStyles.summaryRow}>
            <Text style={pdfStyles.summaryLabel}>Total Target</Text>
            <Text style={pdfStyles.summaryValue}>{totalTarget.toLocaleString()}</Text>
          </View>
          <View style={pdfStyles.summaryRow}>
            <Text style={pdfStyles.summaryLabel}>Performance</Text>
            <Text style={{ fontSize: 14, fontWeight: "bold", color: performancePct >= 100 ? "#059669" : performancePct >= 70 ? "#d97706" : "#dc2626" }}>
              {performancePct}%
            </Text>
          </View>
          <View style={pdfStyles.summaryRow}>
            <Text style={pdfStyles.summaryLabel}>Total Earnings</Text>
            <Text style={pdfStyles.summaryValue}>UGX {totalEarnings.toLocaleString()}</Text>
          </View>
          <View style={pdfStyles.summaryRow}>
            <Text style={pdfStyles.summaryLabel}>Days Worked</Text>
            <Text style={pdfStyles.summaryValue}>{daysWorked}</Text>
          </View>
          <View style={pdfStyles.summaryRow}>
            <Text style={pdfStyles.summaryLabel}>Total Entries</Text>
            <Text style={pdfStyles.summaryValue}>{entriesCount}</Text>
          </View>
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Stage Distribution</Text>
          <View style={pdfStyles.table}>
            <View style={pdfStyles.tableRow}>
              <View style={{ ...pdfStyles.tableColHeader, width: "60%" }}><Text style={pdfStyles.tableCellHeader}>Stage</Text></View>
              <View style={{ ...pdfStyles.tableColHeader, width: "40%" }}><Text style={pdfStyles.tableCellHeader}>Pieces</Text></View>
            </View>
            {stageDistribution.length === 0 ? (
              <View style={pdfStyles.tableRow}>
                <View style={{ ...pdfStyles.tableCol, width: "100%" }}><Text style={pdfStyles.tableCell}>No stage data.</Text></View>
              </View>
            ) : (
              stageDistribution.map((s, i) => (
                <View style={pdfStyles.tableRow} key={i}>
                  <View style={{ ...pdfStyles.tableCol, width: "60%" }}><Text style={pdfStyles.tableCell}>{s.label}</Text></View>
                  <View style={{ ...pdfStyles.tableCol, width: "40%" }}><Text style={pdfStyles.tableCell}>{s.value.toLocaleString()}</Text></View>
                </View>
              ))
            )}
          </View>
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Payment History</Text>
          <View style={pdfStyles.table}>
            <View style={pdfStyles.tableRow}>
              <View style={{ ...pdfStyles.tableColHeader, width: colWidth(18) }}><Text style={pdfStyles.tableCellHeader}>Date</Text></View>
              <View style={{ ...pdfStyles.tableColHeader, width: colWidth(28) }}><Text style={pdfStyles.tableCellHeader}>Stage</Text></View>
              <View style={{ ...pdfStyles.tableColHeader, width: colWidth(16) }}><Text style={pdfStyles.tableCellHeader}>Pieces</Text></View>
              <View style={{ ...pdfStyles.tableColHeader, width: colWidth(22) }}><Text style={pdfStyles.tableCellHeader}>Earnings</Text></View>
              <View style={{ ...pdfStyles.tableColHeader, width: colWidth(16) }}><Text style={pdfStyles.tableCellHeader}>Status</Text></View>
            </View>
            {paymentHistory.length === 0 ? (
              <View style={pdfStyles.tableRow}>
                <View style={{ ...pdfStyles.tableCol, width: "100%" }}><Text style={pdfStyles.tableCell}>No payment history found.</Text></View>
              </View>
            ) : (
              paymentHistory.map((p, i) => (
                <View style={pdfStyles.tableRow} key={i}>
                  <View style={{ ...pdfStyles.tableCol, width: colWidth(18) }}><Text style={pdfStyles.tableCell}>{p.date}</Text></View>
                  <View style={{ ...pdfStyles.tableCol, width: colWidth(28) }}><Text style={pdfStyles.tableCell}>{STAGE_LABELS[p.stageId as StageId] || p.stageId}</Text></View>
                  <View style={{ ...pdfStyles.tableCol, width: colWidth(16) }}><Text style={pdfStyles.tableCell}>{p.actualPieces.toLocaleString()}</Text></View>
                  <View style={{ ...pdfStyles.tableCol, width: colWidth(22) }}><Text style={pdfStyles.tableCell}>UGX {p.earningsUgx.toLocaleString()}</Text></View>
                  <View style={{ ...pdfStyles.tableCol, width: colWidth(16) }}><Text style={pdfStyles.tableCell}>{p.status}</Text></View>
                </View>
              ))
            )}
          </View>
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
