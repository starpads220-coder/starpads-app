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
  remittances?: Array<{ paymentDate: string; returnPeriod: string; uraReference: string; paymentSource: string; amount: number }>;
  totalRemitted?: number;
}

export function PayeePDF({
  title, period, rows, totalPayee, taxableCount, taxFreeCount, remittances = [], totalRemitted = 0,
}: PayeePDFProps) {
  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.header}>
          <Text style={pdfStyles.title}>Star Durable Pads</Text>
          <Text style={pdfStyles.subtitle}>{title} &mdash; {period}</Text>
        </View>

        <View style={pdfStyles.summaryBox}>
          <Text style={pdfStyles.summaryTitle}>PAYE Summary</Text>
          <View style={pdfStyles.summaryRow}>
            <Text style={pdfStyles.summaryLabel}>Total PAYE Withheld</Text>
            <Text style={{ fontSize: 11, fontWeight: "bold", color: "#dc2626" }}>UGX {totalPayee.toLocaleString()}</Text>
          </View>
          <View style={pdfStyles.summaryRow}>
            <Text style={pdfStyles.summaryLabel}>PAYE Remitted to URA</Text>
            <Text style={pdfStyles.summaryValue}>UGX {totalRemitted.toLocaleString()}</Text>
          </View>
          <View style={pdfStyles.summaryRow}>
            <Text style={pdfStyles.summaryLabel}>Period Movement Outstanding</Text>
            <Text style={pdfStyles.summaryValue}>UGX {(totalPayee - totalRemitted).toLocaleString()}</Text>
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
          <Text style={pdfStyles.sectionTitle}>PAYE Remittances to URA</Text>
          <View style={pdfStyles.table}>
            <View style={pdfStyles.tableRow}>
              <View style={{ ...pdfStyles.tableColHeader, width: colWidth(17) }}><Text style={pdfStyles.tableCellHeader}>Date</Text></View>
              <View style={{ ...pdfStyles.tableColHeader, width: colWidth(18) }}><Text style={pdfStyles.tableCellHeader}>Return Period</Text></View>
              <View style={{ ...pdfStyles.tableColHeader, width: colWidth(29) }}><Text style={pdfStyles.tableCellHeader}>URA Reference / PRN</Text></View>
              <View style={{ ...pdfStyles.tableColHeader, width: colWidth(14) }}><Text style={pdfStyles.tableCellHeader}>Source</Text></View>
              <View style={{ ...pdfStyles.tableColHeader, width: colWidth(22) }}><Text style={pdfStyles.tableCellHeader}>Amount</Text></View>
            </View>
            {remittances.length === 0 ? <View style={pdfStyles.tableRow}><View style={{ ...pdfStyles.tableCol, width: "100%" }}><Text style={pdfStyles.tableCell}>No PAYE remittances found.</Text></View></View> : remittances.map((entry, index) => (
              <View style={pdfStyles.tableRow} key={index}>
                <View style={{ ...pdfStyles.tableCol, width: colWidth(17) }}><Text style={pdfStyles.tableCell}>{entry.paymentDate}</Text></View>
                <View style={{ ...pdfStyles.tableCol, width: colWidth(18) }}><Text style={pdfStyles.tableCell}>{entry.returnPeriod}</Text></View>
                <View style={{ ...pdfStyles.tableCol, width: colWidth(29) }}><Text style={pdfStyles.tableCell}>{entry.uraReference}</Text></View>
                <View style={{ ...pdfStyles.tableCol, width: colWidth(14) }}><Text style={pdfStyles.tableCell}>{entry.paymentSource}</Text></View>
                <View style={{ ...pdfStyles.tableCol, width: colWidth(22) }}><Text style={pdfStyles.tableCell}>UGX {entry.amount.toLocaleString()}</Text></View>
              </View>
            ))}
          </View>
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Employee PAYE Breakdown</Text>
          <View style={pdfStyles.table}>
            <View style={pdfStyles.tableRow}>
              <View style={{ ...pdfStyles.tableColHeader, width: colWidth(20) }}><Text style={pdfStyles.tableCellHeader}>Employee</Text></View>
              <View style={{ ...pdfStyles.tableColHeader, width: colWidth(18) }}><Text style={pdfStyles.tableCellHeader}>Gross (UGX)</Text></View>
              <View style={{ ...pdfStyles.tableColHeader, width: colWidth(24) }}><Text style={pdfStyles.tableCellHeader}>Tax Bracket</Text></View>
              <View style={{ ...pdfStyles.tableColHeader, width: colWidth(14) }}><Text style={pdfStyles.tableCellHeader}>Rate</Text></View>
              <View style={{ ...pdfStyles.tableColHeader, width: colWidth(24) }}><Text style={pdfStyles.tableCellHeader}>PAYE (UGX)</Text></View>
            </View>
            {rows.length === 0 ? (
              <View style={pdfStyles.tableRow}>
                <View style={{ ...pdfStyles.tableCol, width: "100%" }}><Text style={pdfStyles.tableCell}>No PAYE data found.</Text></View>
              </View>
            ) : (
              rows.map((r, i) => (
                <View style={pdfStyles.tableRow} key={i}>
                  <View style={{ ...pdfStyles.tableCol, width: colWidth(20) }}><Text style={pdfStyles.tableCell}>{r.employeeName}</Text></View>
                  <View style={{ ...pdfStyles.tableCol, width: colWidth(18) }}><Text style={pdfStyles.tableCell}>UGX {r.grossAmount.toLocaleString()}</Text></View>
                  <View style={{ ...pdfStyles.tableCol, width: colWidth(24) }}><Text style={pdfStyles.tableCell}>{r.bracketLabel}</Text></View>
                  <View style={{ ...pdfStyles.tableCol, width: colWidth(14) }}><Text style={pdfStyles.tableCell}>{r.payeeTax === 0 ? "No PAYE" : r.bracketRate === 0 ? "Saved" : `${r.bracketRate}%`}</Text></View>
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
