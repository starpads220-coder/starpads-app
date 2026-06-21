import React from "react";
import { Page, Text, View, Document } from "@react-pdf/renderer";
import { pdfStyles, colWidth } from "./PDFStyles";
import { STAGE_LABELS } from "@/types";
import type { StageId } from "@/types";

interface ProdEntry {
  date: string;
  employeeName: string;
  stageId: string;
  actualPieces: number;
  targetPieces: number;
  earningsUgx: number;
}

interface ProductionPDFProps {
  title: string;
  period: string;
  entries: ProdEntry[];
  totalPieces: number;
  totalEarnings: number;
  totalEntries: number;
}

export function ProductionPDF({ title, period, entries, totalPieces, totalEarnings, totalEntries }: ProductionPDFProps) {
  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.header}>
          <Text style={pdfStyles.title}>Star Durable Pads</Text>
          <Text style={pdfStyles.subtitle}>{title} &mdash; {period}</Text>
        </View>

        <View style={pdfStyles.summaryBox}>
          <Text style={pdfStyles.summaryTitle}>Production Summary</Text>
          <View style={pdfStyles.summaryRow}>
            <Text style={pdfStyles.summaryLabel}>Total Entries</Text>
            <Text style={pdfStyles.summaryValue}>{totalEntries.toLocaleString()}</Text>
          </View>
          <View style={pdfStyles.summaryRow}>
            <Text style={pdfStyles.summaryLabel}>Total Pieces</Text>
            <Text style={pdfStyles.summaryValue}>{totalPieces.toLocaleString()}</Text>
          </View>
          <View style={pdfStyles.summaryRow}>
            <Text style={pdfStyles.summaryLabel}>Total Earnings</Text>
            <Text style={pdfStyles.summaryValue}>UGX {totalEarnings.toLocaleString()}</Text>
          </View>
        </View>

        <View style={pdfStyles.table}>
          <View style={pdfStyles.tableRow}>
            <View style={{ ...pdfStyles.tableColHeader, width: colWidth(14) }}><Text style={pdfStyles.tableCellHeader}>Date</Text></View>
            <View style={{ ...pdfStyles.tableColHeader, width: colWidth(18) }}><Text style={pdfStyles.tableCellHeader}>Worker</Text></View>
            <View style={{ ...pdfStyles.tableColHeader, width: colWidth(20) }}><Text style={pdfStyles.tableCellHeader}>Stage</Text></View>
            <View style={{ ...pdfStyles.tableColHeader, width: colWidth(12) }}><Text style={pdfStyles.tableCellHeader}>Pieces</Text></View>
            <View style={{ ...pdfStyles.tableColHeader, width: colWidth(12) }}><Text style={pdfStyles.tableCellHeader}>Target</Text></View>
            <View style={{ ...pdfStyles.tableColHeader, width: colWidth(12) }}><Text style={pdfStyles.tableCellHeader}>Perf.</Text></View>
            <View style={{ ...pdfStyles.tableColHeader, width: colWidth(12) }}><Text style={pdfStyles.tableCellHeader}>Earnings</Text></View>
          </View>

          {entries.length === 0 ? (
            <View style={pdfStyles.tableRow}>
              <View style={{ ...pdfStyles.tableCol, width: "100%" }}><Text style={pdfStyles.tableCell}>No production entries found for this period.</Text></View>
            </View>
          ) : (
            entries.map((d, i) => {
              const perf = d.targetPieces > 0 ? Math.round((d.actualPieces / d.targetPieces) * 100) + "%" : "&mdash;";
              return (
                <View style={pdfStyles.tableRow} key={i}>
                  <View style={{ ...pdfStyles.tableCol, width: colWidth(14) }}><Text style={pdfStyles.tableCell}>{d.date}</Text></View>
                  <View style={{ ...pdfStyles.tableCol, width: colWidth(18) }}><Text style={pdfStyles.tableCell}>{d.employeeName}</Text></View>
                  <View style={{ ...pdfStyles.tableCol, width: colWidth(20) }}><Text style={pdfStyles.tableCell}>{STAGE_LABELS[d.stageId as StageId] || d.stageId}</Text></View>
                  <View style={{ ...pdfStyles.tableCol, width: colWidth(12) }}><Text style={pdfStyles.tableCell}>{d.actualPieces.toLocaleString()}</Text></View>
                  <View style={{ ...pdfStyles.tableCol, width: colWidth(12) }}><Text style={pdfStyles.tableCell}>{d.targetPieces.toLocaleString()}</Text></View>
                  <View style={{ ...pdfStyles.tableCol, width: colWidth(12) }}><Text style={pdfStyles.tableCell}>{perf}</Text></View>
                  <View style={{ ...pdfStyles.tableCol, width: colWidth(12) }}><Text style={pdfStyles.tableCell}>UGX {d.earningsUgx.toLocaleString()}</Text></View>
                </View>
              );
            })
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
