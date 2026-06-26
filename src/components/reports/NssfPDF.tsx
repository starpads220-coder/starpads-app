import React from "react";
import { Page, Text, View, Document } from "@react-pdf/renderer";
import { pdfStyles, colWidth } from "./PDFStyles";

interface NssfEmployeeRow {
  employeeName: string;
  grossAmount: number;
  employeeDeduction: number;
  businessContribution: number;
}

interface NssfPDFProps {
  title: string;
  period: string;
  rows: NssfEmployeeRow[];
  totalEmployeeDeductions: number;
  totalBusinessContributions: number;
  totalCombined: number;
}

export function NssfPDF({
  title, period, rows, totalEmployeeDeductions, totalBusinessContributions, totalCombined,
}: NssfPDFProps) {
  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.header}>
          <Text style={pdfStyles.title}>Star Durable Pads</Text>
          <Text style={pdfStyles.subtitle}>{title} &mdash; {period}</Text>
        </View>

        <View style={pdfStyles.summaryBox}>
          <Text style={pdfStyles.summaryTitle}>NSSF Summary</Text>
          <View style={pdfStyles.summaryRow}>
            <Text style={pdfStyles.summaryLabel}>Total Employee Deductions (5%)</Text>
            <Text style={{ fontSize: 11, fontWeight: "bold", color: "#dc2626" }}>UGX {totalEmployeeDeductions.toLocaleString()}</Text>
          </View>
          <View style={pdfStyles.summaryRow}>
            <Text style={pdfStyles.summaryLabel}>Total Business Contributions (10%)</Text>
            <Text style={{ fontSize: 11, fontWeight: "bold", color: "#2563eb" }}>UGX {totalBusinessContributions.toLocaleString()}</Text>
          </View>
          <View style={pdfStyles.summaryRow}>
            <Text style={pdfStyles.summaryLabel}>Total Combined NSSF</Text>
            <Text style={{ fontSize: 11, fontWeight: "bold" }}>UGX {totalCombined.toLocaleString()}</Text>
          </View>
          <View style={pdfStyles.summaryRow}>
            <Text style={pdfStyles.summaryLabel}>Workers</Text>
            <Text style={pdfStyles.summaryValue}>{rows.length}</Text>
          </View>
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Employee NSSF Breakdown</Text>
          <View style={pdfStyles.table}>
            <View style={pdfStyles.tableRow}>
              <View style={{ ...pdfStyles.tableColHeader, width: colWidth(22) }}><Text style={pdfStyles.tableCellHeader}>Employee</Text></View>
              <View style={{ ...pdfStyles.tableColHeader, width: colWidth(18) }}><Text style={pdfStyles.tableCellHeader}>Gross (UGX)</Text></View>
              <View style={{ ...pdfStyles.tableColHeader, width: colWidth(20) }}><Text style={pdfStyles.tableCellHeader}>Employee (5%)</Text></View>
              <View style={{ ...pdfStyles.tableColHeader, width: colWidth(20) }}><Text style={pdfStyles.tableCellHeader}>Business (10%)</Text></View>
              <View style={{ ...pdfStyles.tableColHeader, width: colWidth(20) }}><Text style={pdfStyles.tableCellHeader}>Combined</Text></View>
            </View>
            {rows.length === 0 ? (
              <View style={pdfStyles.tableRow}>
                <View style={{ ...pdfStyles.tableCol, width: "100%" }}><Text style={pdfStyles.tableCell}>No NSSF data found.</Text></View>
              </View>
            ) : (
              rows.map((r, i) => (
                <View style={pdfStyles.tableRow} key={i}>
                  <View style={{ ...pdfStyles.tableCol, width: colWidth(22) }}><Text style={pdfStyles.tableCell}>{r.employeeName}</Text></View>
                  <View style={{ ...pdfStyles.tableCol, width: colWidth(18) }}><Text style={pdfStyles.tableCell}>UGX {r.grossAmount.toLocaleString()}</Text></View>
                  <View style={{ ...pdfStyles.tableCol, width: colWidth(20) }}><Text style={pdfStyles.tableCell}>UGX {r.employeeDeduction.toLocaleString()}</Text></View>
                  <View style={{ ...pdfStyles.tableCol, width: colWidth(20) }}><Text style={pdfStyles.tableCell}>UGX {r.businessContribution.toLocaleString()}</Text></View>
                  <View style={{ ...pdfStyles.tableCol, width: colWidth(20) }}><Text style={pdfStyles.tableCell}>UGX {(r.employeeDeduction + r.businessContribution).toLocaleString()}</Text></View>
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
