import React from "react";
import { Page, Text, View, Document } from "@react-pdf/renderer";
import { pdfStyles, colWidth } from "./PDFStyles";

interface PayeeEmployeeRow {
  employeeName: string;
  grossAmount: number;
  bracketLabel: string;
  bracketRate: number;
  payeeTax: number;
}

interface PayeePDFProps {
  title: string;
  period: string;
  rows: PayeeEmployeeRow[];
  totalPayee: number;
  taxableCount: number;
  taxFreeCount: number;
}

export function PayeePDF({
  title, period, rows, totalPayee, taxableCount, taxFreeCount,
}: PayeePDFProps) {
  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.header}>
          <Text style={pdfStyles.title}>Star Durable Pads</Text>
          <Text style={pdfStyles.subtitle}>{title} &mdash; {period}</Text>
        </View>

        <View style={pdfStyles.summaryBox}>
          <Text style={pdfStyles.summaryTitle}>PAYEE Summary</Text>
          <View style={pdfStyles.summaryRow}>
            <Text style={pdfStyles.summaryLabel}>Total PAYEE Collected</Text>
            <Text style={{ fontSize: 11, fontWeight: "bold", color: "#dc2626" }}>UGX {totalPayee.toLocaleString()}</Text>
          </View>
          <View style={pdfStyles.summaryRow}>
            <Text style={pdfStyles.summaryLabel}>Taxable Employees</Text>
            <Text style={pdfStyles.summaryValue}>{taxableCount}</Text>
          </View>
          <View style={pdfStyles.summaryRow}>
            <Text style={pdfStyles.summaryLabel}>Tax-Free Employees</Text>
            <Text style={pdfStyles.summaryValue}>{taxFreeCount}</Text>
          </View>
          <View style={pdfStyles.summaryRow}>
            <Text style={pdfStyles.summaryLabel}>Total Employees</Text>
            <Text style={pdfStyles.summaryValue}>{rows.length}</Text>
          </View>
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Employee PAYEE Breakdown</Text>
          <View style={pdfStyles.table}>
            <View style={pdfStyles.tableRow}>
              <View style={{ ...pdfStyles.tableColHeader, width: colWidth(20) }}><Text style={pdfStyles.tableCellHeader}>Employee</Text></View>
              <View style={{ ...pdfStyles.tableColHeader, width: colWidth(18) }}><Text style={pdfStyles.tableCellHeader}>Gross (UGX)</Text></View>
              <View style={{ ...pdfStyles.tableColHeader, width: colWidth(24) }}><Text style={pdfStyles.tableCellHeader}>Tax Bracket</Text></View>
              <View style={{ ...pdfStyles.tableColHeader, width: colWidth(14) }}><Text style={pdfStyles.tableCellHeader}>Rate</Text></View>
              <View style={{ ...pdfStyles.tableColHeader, width: colWidth(24) }}><Text style={pdfStyles.tableCellHeader}>PAYEE (UGX)</Text></View>
            </View>
            {rows.length === 0 ? (
              <View style={pdfStyles.tableRow}>
                <View style={{ ...pdfStyles.tableCol, width: "100%" }}><Text style={pdfStyles.tableCell}>No PAYEE data found.</Text></View>
              </View>
            ) : (
              rows.map((r, i) => (
                <View style={pdfStyles.tableRow} key={i}>
                  <View style={{ ...pdfStyles.tableCol, width: colWidth(20) }}><Text style={pdfStyles.tableCell}>{r.employeeName}</Text></View>
                  <View style={{ ...pdfStyles.tableCol, width: colWidth(18) }}><Text style={pdfStyles.tableCell}>UGX {r.grossAmount.toLocaleString()}</Text></View>
                  <View style={{ ...pdfStyles.tableCol, width: colWidth(24) }}><Text style={pdfStyles.tableCell}>{r.bracketLabel}</Text></View>
                  <View style={{ ...pdfStyles.tableCol, width: colWidth(14) }}><Text style={pdfStyles.tableCell}>{r.bracketRate === 0 ? "Tax Free" : `${r.bracketRate}%`}</Text></View>
                  <View style={{ ...pdfStyles.tableCol, width: colWidth(24) }}><Text style={pdfStyles.tableCell}>{r.payeeTax === 0 ? "0 (Tax Free)" : `UGX ${r.payeeTax.toLocaleString()}`}</Text></View>
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
